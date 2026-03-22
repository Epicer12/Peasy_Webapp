import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { generateBuilds, generateBuildSummary, saveProject, analyzeBottleneck } from "../services/componentService";
import { auth } from "../firebase";
import BottleneckAnalysisModal from "../components/modals/BottleneckAnalysisModal";
import PerformanceDashboardModal from "../components/modals/PerformanceDashboardModal";

/* ── Build type definitions ──────────────────────────────────────────────── */
const BUILD_TYPES = [
    {
        key: "performance",
        label: "Performance Focused",
        fullLabel: "Performance Focused Build",
        icon: "⚡",
        nameKeyword: "performance",
        color: "#ff6b35",
        bgColor: "rgba(255, 107, 53, 0.10)",
        borderColor: "#ff6b35",
        glowColor: "rgba(255, 107, 53, 0.25)",
        desc: "Maximum power for your budget",
    },
    {
        key: "budget",
        label: "Budget Efficient",
        fullLabel: "Budget Efficient Build",
        icon: "💰",
        nameKeyword: "budget",
        color: "#00d4ff",
        bgColor: "rgba(0, 212, 255, 0.08)",
        borderColor: "#00d4ff",
        glowColor: "rgba(0, 212, 255, 0.20)",
        desc: "Best value for every rupee",
    },
    {
        key: "alternative",
        label: "Alternative Brand",
        fullLabel: "Alternative Brand Build",
        icon: "🔄",
        nameKeyword: "alternative",
        color: "#bf7fff",
        bgColor: "rgba(191, 127, 255, 0.08)",
        borderColor: "#bf7fff",
        glowColor: "rgba(191, 127, 255, 0.20)",
        desc: "Switch brand ecosystem",
    },
];

const COMP_CATEGORIES = [
    "CPU", "CPU Cooler", "Motherboard", "RAM",
    "Storage", "HDD", "GPU", "Power Supply", "Case", "Case Fans",
];

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function formatPrice(price, model = "") {
    if (price === 0) {
        const m = (model || "").toLowerCase();
        if (m.includes("owned")) return "ALREADY OWNED";
        if (m.includes("not included") || m.includes("none") || m.includes("n/a")) return "NOT INCLUDED";
    }
    return price !== null && price !== undefined
        ? `LKR ${Number(price).toLocaleString()}`
        : "N/A";
}

/* ══════════════════════════════════════════════════════════════════════════ */
export default function BuildSuggestions() {
    const navigate = useNavigate();
    const location = useLocation();

    const [loading, setLoading] = useState(true);
    const [builds, setBuilds] = useState([]);
    const [warning, setWarning] = useState("");
    const [shownExtras, setShownExtras] = useState(new Set());
    const [panelOpen, setPanelOpen] = useState(false);
    const [comparing, setComparing] = useState(false);
    const [summaries, setSummaries] = useState([]);
    const [summarizing, setSummarizing] = useState(false);

    // Save Logic
    const [savingBuild, setSavingBuild] = useState(null);
    const [saveForm, setSaveForm] = useState({ name: "", status: "Planned", description: "" });
    const [isSaving, setIsSaving] = useState(false);

    // Bottleneck Analysis
    const [isBottleneckModalOpen, setIsBottleneckModalOpen] = useState(false);
    const [bottleneckReport, setBottleneckReport] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Performance Estimator
    const [isPerfModalOpen, setIsPerfModalOpen] = useState(false);
    const [isPerfAnalyzing, setIsPerfAnalyzing] = useState(false);

    const openSaveModal = (build) => {
        setSavingBuild(build);
        setSaveForm({
            name: build.name,
            status: "Planned",
            description: build.description || ""
        });
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const user = auth.currentUser;
            const payload = {
                user_id: user?.uid || "00000000-0000-0000-0000-000000000000",
                user_email: user?.email || null,
                name: saveForm.name,
                description: saveForm.description,
                total_price: savingBuild.total_price,
                components: savingBuild.components,
                status: saveForm.status,
                progress: saveForm.status === "Completed" ? 100 : (saveForm.status === "In Progress" ? 50 : 0)
            };
            await saveProject(payload);
            alert("Build saved successfully!");
            setSavingBuild(null);
        } catch (e) {
            alert("Failed to save build: " + e.message);
        } finally {
            setIsSaving(false);
        }
    };

    const hasFetchedBuilds = useRef(false);
    useEffect(() => {
        if (hasFetchedBuilds.current) return;
        hasFetchedBuilds.current = true;
        const fetchBuilds = async () => {
            const summaryData = location.state?.summary;
            const res = await generateBuilds(summaryData || { basicPreferences: {} });
            setBuilds(res.builds || []);
            setWarning(res.warning || "");
            setLoading(false);
        };
        fetchBuilds();
    }, [location.state]);

    const getBuild = useCallback((keyword) =>
        builds.find((b) => b.name.toLowerCase().includes(keyword)), [builds]);

    const balancedBuild = useMemo(() => getBuild("balance"), [getBuild]);
    const unlockedExtras = useMemo(() => 
        BUILD_TYPES.filter((bt) => shownExtras.has(bt.key)),
        [shownExtras]
    );

    const handleDetectBottlenecks = useCallback(async () => {
        const build = balancedBuild;
        if (!build?.components?.length) return;
        const components = build.components.map((c) => ({
            name: c.model,
            type: c.type,
        }));
        setIsAnalyzing(true);
        try {
            const report = await analyzeBottleneck(components);
            setBottleneckReport(report);
            setIsBottleneckModalOpen(true);
        } catch (error) {
            console.error('Error analyzing bottleneck:', error);
        } finally {
            setIsAnalyzing(false);
        }
    }, [balancedBuild]);

    // Final comparable list
    const comparableBuilds = useMemo(() => [
        balancedBuild,
        ...unlockedExtras.map((bt) => getBuild(bt.nameKeyword)),
    ].filter(Boolean), [balancedBuild, unlockedExtras, getBuild]);

    const totalVisible = comparableBuilds.length;
    const allUnlocked = shownExtras.size === BUILD_TYPES.length;
    const availableTypes = BUILD_TYPES.filter((bt) => !shownExtras.has(bt.key));

    // Call summary API whenever we start comparing
    useEffect(() => {
        const fetchSummary = async () => {
            if (comparing && comparableBuilds.length > 0) {
                setSummaries([]); // Reset to prevent flickering old data
                setSummarizing(true);
                try {
                    const res = await generateBuildSummary(comparableBuilds);
                    setSummaries(res.summaries || []);
                } catch (e) {
                    console.error("Summary error:", e);
                } finally {
                    setSummarizing(false);
                }
            }
        };
        fetchSummary();
    }, [comparing, comparableBuilds]);

    function handleSelectType(key) {
        setShownExtras((prev) => new Set([...prev, key]));
        setPanelOpen(false);
    }

    /* ── Build card ────────────────────────────────────────────────────── */
    const renderBuildCard = (build, accent = "#a3ff00", isBalanced = false) => (
        <div key={build.id} style={{
            backgroundColor: "#0a0a0a",
            border: `1px solid ${accent}`,
            boxShadow: `0 0 24px ${accent}18`,
            padding: "30px",
            position: "relative",
            animation: "fadeSlideIn 0.4s ease forwards",
        }}>
            {/* Corner accents */}
            {[
                { top: 0, left: 0, style: { borderTop: `2px solid ${accent}`, borderLeft: `2px solid ${accent}` } },
                { top: 0, right: 0, style: { borderTop: `2px solid ${accent}`, borderRight: `2px solid ${accent}` } },
                { bottom: 0, left: 0, style: { borderBottom: `2px solid ${accent}`, borderLeft: `2px solid ${accent}` } },
                { bottom: 0, right: 0, style: { borderBottom: `2px solid ${accent}`, borderRight: `2px solid ${accent}` } },
            ].map((c, i) => (
                <div key={i} style={{ position: "absolute", width: "10px", height: "10px", ...c.style, top: c.top, bottom: c.bottom, left: c.left, right: c.right }} />
            ))}

            {isBalanced && (
                <div style={{ position: "absolute", top: "-13px", right: "22px", background: "#a3ff00", color: "#000", padding: "4px 14px", fontSize: "10px", fontWeight: "900", textTransform: "uppercase", letterSpacing: "0.15em" }}>
                    ★ BEST BUILD
                </div>
            )}

            <h2 style={{ fontSize: "22px", color: accent, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: "900", marginBottom: "6px" }}>
                {build.name}
            </h2>
            <p style={{ color: "#555", fontSize: "11px", marginBottom: "22px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {build.description}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {build.components.map((comp, i) => {
                    const priceLabel = formatPrice(comp.price, comp.model);
                    const isOwned = priceLabel === "ALREADY OWNED";
                    const isExcl = priceLabel === "NOT INCLUDED";
                    const priceColor = isOwned ? "#a3ff00" : isExcl ? "#444" : "#00f3ff";
                    return (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #1a1a1a", paddingBottom: "10px" }}>
                            <div style={{ display: "flex", flexDirection: "column" }}>
                                <span style={{ color: "#444", fontSize: "10px", textTransform: "uppercase", fontWeight: "bold", letterSpacing: "0.08em" }}>{comp.type}</span>
                                <span style={{ color: isExcl ? "#444" : "#ddd", fontSize: "12px", fontFamily: "'Space Mono', monospace", marginTop: "2px" }}>{comp.model}</span>
                            </div>
                            <div style={{ color: priceColor, fontSize: "12px", fontWeight: "bold", display: "flex", alignItems: "center", textAlign: "right", maxWidth: "150px", marginLeft: "16px", flexShrink: 0 }}>
                                {priceLabel}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div style={{ marginTop: "20px", borderTop: "2px dashed #1e1e1e", paddingTop: "18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#444", fontSize: "11px", textTransform: "uppercase", fontWeight: "bold", letterSpacing: "0.12em" }}>TOTAL ESTIMATE</span>
                <span style={{ color: accent, fontSize: "22px", fontWeight: "900", letterSpacing: "0.04em" }}>
                    {formatPrice(build.total_price)}
                </span>
            </div>

            <button
                onClick={() => openSaveModal(build)}
                style={{
                    width: "100%",
                    marginTop: "20px",
                    padding: "12px",
                    backgroundColor: "transparent",
                    border: `1px solid ${accent}`,
                    color: accent,
                    fontSize: "12px",
                    fontWeight: "900",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    letterSpacing: "0.1em",
                    transition: "all 0.2s"
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = accent; e.currentTarget.style.color = "#000"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = accent; }}
            >
                💾 Save to Projects
            </button>
        </div>
    );

    /* ── Compare overlay ───────────────────────────────────────────────── */
    const renderCompare = () => {
        if (!comparing) return null;

        return (
            <div style={{
                position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: "rgba(0,0,0,0.98)", zIndex: 10000,
                display: "flex", flexDirection: "column", padding: "40px", overflowY: "auto"
            }}>
                <button
                    onClick={() => setComparing(false)}
                    style={{
                        alignSelf: "flex-end", backgroundColor: "#ff4444", color: "white",
                        border: "none", padding: "12px 24px", fontSize: "14px", fontWeight: "900",
                        borderRadius: "4px", cursor: "pointer", marginBottom: "20px"
                    }}
                >✕ CLOSE COMPARISON</button>

                <div style={{ maxWidth: "1400px", margin: "0 auto", width: "100%" }}>
                    <h2 style={{ color: "white", fontSize: "32px", fontWeight: "900", textAlign: "center", marginBottom: "40px", letterSpacing: "2px" }}>
                        BUILD COMPARISON ANALYSIS
                    </h2>

                    <div style={{ border: "1px solid #333", borderRadius: "12px", overflow: "hidden", boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}>
                        <div style={{ display: "grid", gridTemplateColumns: `200px repeat(${comparableBuilds.length}, 1fr)`, gap: "1px", backgroundColor: "#333", marginBottom: "1px" }}>
                            <div style={{ backgroundColor: "#0a0a0a", padding: "18px", color: "#ffffff", fontSize: "14px", fontWeight: "900", textTransform: "uppercase", letterSpacing: "0.15em" }}>COMPONENT</div>
                            {comparableBuilds.map((b, i) => {
                                const typeInfo = BUILD_TYPES.find(bt => b.name.toLowerCase().includes(bt.nameKeyword));
                                const accent = i === 0 ? "#a3ff00" : (typeInfo?.color || "#00f3ff");
                                return (
                                    <div key={i} style={{ backgroundColor: "#0a0a0a", padding: "18px", color: accent, fontSize: "15px", fontWeight: "900", textTransform: "uppercase", borderBottom: `3px solid ${accent}`, textAlign: "center", position: "relative" }}>
                                        {b.name}
                                        <button
                                            onClick={() => openSaveModal(b)}
                                            style={{
                                                marginTop: "12px",
                                                display: "block",
                                                width: "100%",
                                                background: "rgba(0, 243, 255, 0.05)",
                                                border: `1px solid ${accent}`,
                                                color: accent,
                                                cursor: "pointer",
                                                fontSize: "10px",
                                                fontWeight: "900",
                                                padding: "6px 0",
                                                textTransform: "uppercase",
                                                letterSpacing: "0.1em",
                                                transition: "all 0.2s"
                                            }}
                                            onMouseEnter={(e) => { e.currentTarget.style.background = accent; e.currentTarget.style.color = "#000"; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(0, 243, 255, 0.05)"; e.currentTarget.style.color = accent; }}
                                        >
                                            💾 STORE_PROJECT
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                        {COMP_CATEGORIES.map((cat) => (
                            <div key={cat} style={{ display: "grid", gridTemplateColumns: `200px repeat(${comparableBuilds.length}, 1fr)`, gap: "1px", backgroundColor: "#222", marginBottom: "1px" }}>
                                <div style={{ backgroundColor: "#0d0d0d", padding: "16px 18px", color: "#ffffff", fontSize: "13px", fontWeight: "900", textTransform: "uppercase", display: "flex", alignItems: "center", borderRight: "1px solid #333" }}>{cat}</div>
                                {comparableBuilds.map((b, i) => {
                                    const comp = b.components.find(c => c.type === cat);
                                    return (
                                        <div key={i} style={{ backgroundColor: "#080808", padding: "16px 18px", borderRight: i < comparableBuilds.length - 1 ? "1px solid #222" : "none" }}>
                                            <div style={{ color: "#ffffff", fontSize: "13px", fontFamily: "'Space Mono', monospace", fontWeight: "600", lineHeight: "1.4" }}>{comp ? comp.model : "—"}</div>
                                            {comp && comp.price > 0 && <div style={{ color: "#00f3ff", fontSize: "11px", marginTop: "6px", fontWeight: "bold" }}>LKR {Number(comp.price).toLocaleString()}</div>}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                        <div style={{ display: "grid", gridTemplateColumns: `200px repeat(${comparableBuilds.length}, 1fr)`, gap: "1px", backgroundColor: "#333", marginTop: "2px" }}>
                            <div style={{ backgroundColor: "#0a0a0a", padding: "20px 18px", color: "#ffffff", fontSize: "14px", fontWeight: "900", textTransform: "uppercase", letterSpacing: "0.15em" }}>TOTAL ESTIMATE</div>
                            {comparableBuilds.map((b, i) => {
                                const typeInfo = BUILD_TYPES.find(bt => b.name.toLowerCase().includes(bt.nameKeyword));
                                const accent = i === 0 ? "#a3ff00" : (typeInfo?.color || "#00f3ff");
                                return (
                                    <div key={i} style={{ backgroundColor: "#0a0a0a", padding: "20px 18px", color: accent, fontSize: "22px", fontWeight: "900", textAlign: "center" }}>{formatPrice(b.total_price)}</div>
                                );
                            })}
                        </div>
                    </div>

                    <div style={{ marginTop: "60px", paddingBottom: "40px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "30px" }}>
                            <div style={{ height: "2px", flex: 1, background: "linear-gradient(to right, transparent, #333)" }}></div>
                            <h3 style={{ color: "#00f3ff", fontSize: "20px", fontWeight: "900", textTransform: "uppercase", letterSpacing: "3px" }}>Expert AI Analysis</h3>
                            <div style={{ height: "2px", flex: 1, background: "linear-gradient(to left, transparent, #333)" }}></div>
                        </div>

                        {summarizing ? (
                            <div style={{ textAlign: "center", color: "#666", padding: "40px", fontSize: "16px", fontStyle: "italic" }}>Analysing hardware specs and generating pros/cons...</div>
                        ) : summaries.length > 0 ? (
                            <div style={{ display: "grid", gridTemplateColumns: `repeat(${comparableBuilds.length}, 1fr)`, gap: "30px" }}>
                                {comparableBuilds.map((b, idx) => {
                                    // Use index-based fallback if names don't match exactly
                                    const sum = summaries.find(s => s.name === b.name) || 
                                               summaries.find(s => s.name?.toLowerCase().includes(b.name?.toLowerCase().split(' ')[0])) ||
                                               summaries[idx];
                                    const typeInfo = BUILD_TYPES.find(bt => b.name.toLowerCase().includes(bt.nameKeyword));
                                    const accent = typeInfo?.color || "#a3ff00";
                                    return (
                                        <div key={b.name} style={{ backgroundColor: "rgba(255,255,255,0.03)", borderRadius: "12px", padding: "24px", border: `1px solid ${accent}44` }}>
                                            <h4 style={{ color: accent, fontSize: "16px", fontWeight: "900", marginBottom: "20px", borderBottom: `1px solid ${accent}22`, paddingBottom: "10px" }}>{b.name}</h4>
                                            <div style={{ marginBottom: "24px" }}>
                                                <div style={{ color: "#a3ff00", fontSize: "12px", fontWeight: "900", marginBottom: "10px", textTransform: "uppercase" }}>🚀 PROS</div>
                                                {(sum?.pros || []).map((p, idx) => <div key={idx} style={{ color: "#eee", fontSize: "13px", marginBottom: "8px", display: "flex", gap: "8px" }}><span style={{ color: "#a3ff00" }}>✓</span> {p}</div>)}
                                            </div>
                                            <div>
                                                <div style={{ color: "#ff6b35", fontSize: "12px", fontWeight: "900", marginBottom: "10px", textTransform: "uppercase" }}>⚖️ TRADE-OFFS</div>
                                                {(sum?.cons || []).map((c, idx) => <div key={idx} style={{ color: "#bbb", fontSize: "13px", marginBottom: "8px", display: "flex", gap: "8px" }}><span style={{ color: "#ff6b35" }}>•</span> {c}</div>)}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div style={{ textAlign: "center", color: "#444", padding: "20px" }}>No analysis available.</div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#050505] text-[#00f3ff] flex items-center justify-center font-mono">
                <div className="flex flex-col items-center gap-4">
                    <svg className="animate-spin h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>ASSEMBLING BUILD SUGGESTIONS...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050505] text-[#eeeeee]">
            {comparing && renderCompare()}

            {/* Save Modal */}
            {savingBuild && (
                <div style={{
                    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: "rgba(0,0,0,0.85)", zIndex: 20000,
                    display: "flex", alignItems: "center", justifyContent: "center", padding: "20px"
                }}>
                    <div style={{
                        backgroundColor: "#0a0a0a", border: "1px solid #333",
                        width: "100%", maxWidth: "500px", padding: "40px",
                        position: "relative", boxShadow: "0 0 50px rgba(0,0,0,1)"
                    }}>
                        <h3 style={{ color: "#00f3ff", fontSize: "18px", fontWeight: "900", marginBottom: "30px", textTransform: "uppercase", letterSpacing: "2px" }}>
                            PROJECT_SAVE_INITIALIZATION
                        </h3>

                        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                            <div>
                                <label style={{ display: "block", color: "#666", fontSize: "10px", fontWeight: "bold", marginBottom: "8px", textTransform: "uppercase" }}>PROJECT_NAME</label>
                                <input
                                    value={saveForm.name}
                                    onChange={(e) => setSaveForm({ ...saveForm, name: e.target.value })}
                                    style={{ width: "100%", padding: "12px", background: "#111", border: "1px solid #333", color: "#fff", outline: "none" }}
                                />
                            </div>

                            <div>
                                <label style={{ display: "block", color: "#666", fontSize: "10px", fontWeight: "bold", marginBottom: "8px", textTransform: "uppercase" }}>CURRENT_STATUS</label>
                                <select
                                    value={saveForm.status}
                                    onChange={(e) => setSaveForm({ ...saveForm, status: e.target.value })}
                                    style={{ width: "100%", padding: "12px", background: "#111", border: "1px solid #333", color: "#fff", outline: "none" }}
                                >
                                    <option value="Planned">Planned</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Completed">Completed</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: "block", color: "#666", fontSize: "10px", fontWeight: "bold", marginBottom: "8px", textTransform: "uppercase" }}>DESCRIPTION</label>
                                <textarea
                                    value={saveForm.description}
                                    onChange={(e) => setSaveForm({ ...saveForm, description: e.target.value })}
                                    style={{ width: "100%", padding: "12px", background: "#111", border: "1px solid #333", color: "#fff", outline: "none", minHeight: "80px" }}
                                />
                            </div>

                            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    style={{
                                        flex: 1, padding: "15px", backgroundColor: "#00f3ff", color: "#000",
                                        fontWeight: "900", border: "none", cursor: "pointer", textTransform: "uppercase"
                                    }}
                                >
                                    {isSaving ? "SAVING..." : "CONFIRM_SAVE"}
                                </button>
                                <button
                                    onClick={() => setSavingBuild(null)}
                                    style={{
                                        padding: "15px 25px", backgroundColor: "transparent", border: "1px solid #ff4444",
                                        color: "#ff4444", fontWeight: "900", cursor: "pointer"
                                    }}
                                >
                                    CANCEL
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <style>{`
                @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes panelIn { from { opacity: 0; transform: scale(0.97) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
                .opt-btn { transition: all 0.22s ease !important; }
                .opt-btn:hover { transform: translateY(-3px) !important; }
            `}</style>
            <div style={{ padding: "40px 20px", maxWidth: "1200px", margin: "0 auto" }}>
                <button onClick={() => navigate(-1)} style={{ color: "#00f3ff", border: "1px solid #00f3ff", padding: "7px 16px", background: "transparent", cursor: "pointer", marginBottom: "28px", fontSize: "13px", letterSpacing: "0.12em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "8px" }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#00f3ff22"; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}>← REVISE CONFIG</button>
                <h1 style={{ fontSize: "34px", fontWeight: "900", marginBottom: "28px", textTransform: "uppercase", letterSpacing: "-0.02em", borderBottom: "2px solid #1a1a1a", paddingBottom: "16px", color: "#eeeeee" }}>SYSTEM_ARCHITECTURES</h1>
                {warning && <div style={{ backgroundColor: "rgba(255,68,0,0.08)", border: "1px solid #ff4400", padding: "14px 18px", marginBottom: "28px", color: "#ff4400", fontSize: "12px", letterSpacing: "0.05em", fontWeight: "bold", textTransform: "uppercase" }}>⚠ {warning}</div>}

                {/* Two-column layout: builds left, panel right */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "32px", alignItems: "start" }}>
                    {/* Left: Build Cards */}
                    <div>
                        {balancedBuild && renderBuildCard(balancedBuild, "#a3ff00", true)}

                        {unlockedExtras.map((bt) => {
                            const extraBuild = getBuild(bt.nameKeyword);
                            if (!extraBuild) return null;
                            return (
                                <div key={bt.key} style={{ marginTop: "32px", animation: "fadeSlideIn 0.4s ease forwards" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "18px" }}>
                                        <div style={{ height: "1px", flex: 1, background: `linear-gradient(to right, transparent, ${bt.borderColor})` }} />
                                        <span style={{ color: bt.color, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.18em", fontWeight: "800", whiteSpace: "nowrap" }}>{bt.icon} &nbsp; {bt.fullLabel}</span>
                                        <div style={{ height: "1px", flex: 1, background: `linear-gradient(to left, transparent, ${bt.borderColor})` }} />
                                    </div>
                                    {renderBuildCard(extraBuild, bt.color, false)}
                                </div>
                            );
                        })}

                        {totalVisible >= 2 && (
                            <div style={{ marginTop: "28px" }}>
                                <button onClick={() => setComparing(true)} style={{ width: "100%", padding: "18px", background: "transparent", border: "1px solid #ccff00", color: "#ccff00", cursor: "pointer", fontWeight: "900", fontSize: "15px", textTransform: "uppercase", letterSpacing: "0.18em", transition: "all 0.25s ease", fontFamily: "'Space Mono', monospace" }} onMouseEnter={(e) => { e.currentTarget.style.background = "#ccff00"; e.currentTarget.style.color = "#000"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#ccff00" }}>⇄ &nbsp; Compare {totalVisible} Builds</button>
                            </div>
                        )}

                        <div style={{ marginTop: "24px" }}>
                            {allUnlocked ? (
                                <div style={{ padding: "16px", border: "1px dashed #1e1e1e", color: "#333", fontSize: "12px", textAlign: "center", textTransform: "uppercase", letterSpacing: "0.12em" }}>All build types generated</div>
                            ) : !panelOpen ? (
                                <button onClick={() => setPanelOpen(true)} style={{ width: "100%", padding: "18px", backgroundColor: "transparent", border: "1px solid #00f3ff", color: "#00f3ff", cursor: "pointer", fontWeight: "900", fontSize: "15px", textTransform: "uppercase", letterSpacing: "0.18em", transition: "all 0.25s ease", fontFamily: "'Space Mono', monospace" }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#00f3ff"; e.currentTarget.style.color = "#000"; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#00f3ff" }}>⊕ &nbsp; Generate More Builds</button>
                            ) : (
                                <div style={{ animation: "panelIn 0.28s ease forwards", border: "1px solid #1e1e1e", backgroundColor: "#080808", padding: "28px 24px" }}>
                                    <p style={{ color: "#eeeeee", fontSize: "18px", fontWeight: "900", textTransform: "uppercase", letterSpacing: "0.14em", textAlign: "center", marginBottom: "6px", fontFamily: "'Space Mono', monospace" }}>Select a Build Type</p>
                                    <p style={{ color: "#555", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em", textAlign: "center", marginBottom: "22px" }}>Choose which configuration to explore next</p>
                                    <div style={{ display: "grid", gridTemplateColumns: `repeat(${availableTypes.length}, 1fr)`, gap: "14px", marginBottom: "20px" }}>
                                        {availableTypes.map((bt) => (
                                            <button key={bt.key} className="opt-btn" onClick={() => handleSelectType(bt.key)} style={{ padding: "24px 16px", backgroundColor: bt.bgColor, border: `2px solid ${bt.borderColor}`, color: bt.color, cursor: "pointer", textAlign: "center", boxShadow: `0 0 16px ${bt.glowColor}`, fontFamily: "'Space Mono', monospace" }}>
                                                <div style={{ fontSize: "28px", marginBottom: "10px" }}>{bt.icon}</div>
                                                <div style={{ fontSize: "14px", fontWeight: "900", textTransform: "uppercase", letterSpacing: "0.1em", lineHeight: "1.35" }}>{bt.label}</div>
                                                <div style={{ fontSize: "10px", color: `${bt.color}99`, marginTop: "6px", textTransform: "uppercase", letterSpacing: "0.08em" }}>{bt.desc}</div>
                                            </button>
                                        ))}
                                    </div>
                                    <button onClick={() => setPanelOpen(false)} style={{ width: "100%", padding: "14px", background: "transparent", border: "2px solid #ff4444", color: "#ff4444", cursor: "pointer", fontSize: "13px", fontWeight: "900", textTransform: "uppercase", letterSpacing: "0.18em", transition: "all 0.22s", fontFamily: "'Space Mono', monospace" }} onMouseEnter={(e) => { e.currentTarget.style.background = "#ff4444"; e.currentTarget.style.color = "#000"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#ff4444" }}>✕ &nbsp; Cancel</button>
                                </div>
                            )}
                        </div>
                        <div style={{ height: "80px" }} />
                    </div>

                    {/* Right: CORE_COMMAND_PANEL */}
                    <div style={{ position: "sticky", top: "24px" }}>
                        <div className="bg-[#0a0a0a] border border-[#333] p-6 shadow-2xl">
                            <div className="text-[11px] font-black font-mono text-[#00f3ff] border-b-2 border-[#1a1a1a] pb-4 mb-6 uppercase tracking-[0.3em]">CORE_COMMAND_PANEL</div>
                            <div className="flex flex-col gap-3">
                                <button
                                    className="w-full border-2 border-[#333] text-[#eeeeee] py-4 text-[12px] font-black uppercase tracking-widest hover:border-[#00f3ff] transition-all flex items-center justify-center gap-2"
                                    onClick={handleDetectBottlenecks}
                                    disabled={isAnalyzing || !balancedBuild}
                                    style={{ opacity: (!balancedBuild || isAnalyzing) ? 0.5 : 1, cursor: (!balancedBuild || isAnalyzing) ? 'not-allowed' : 'pointer' }}
                                >
                                    {isAnalyzing
                                        ? <svg className="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                        : <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h5.25m5.25-.75L17.25 9m0 0L21 12.75M17.25 9v12" /></svg>
                                    }
                                    {isAnalyzing ? 'CALCULATING_BALANCE...' : 'DETECT_BOTTLENECKS'}
                                </button>
                                <button
                                    className="w-full border-2 border-[#333] text-[#eeeeee] py-4 text-[12px] font-black uppercase tracking-widest hover:border-[#ccff00] transition-all flex items-center justify-center gap-2"
                                    onClick={async () => {
                                        if (!balancedBuild?.components?.length) return;
                                        const components = balancedBuild.components.map((c) => ({ name: c.model, type: c.type }));
                                        setIsPerfAnalyzing(true);
                                        try {
                                            const report = await analyzeBottleneck(components);
                                            setBottleneckReport(report);
                                            setIsPerfModalOpen(true);
                                        } catch (e) {
                                            console.error('Performance analysis error:', e);
                                        } finally {
                                            setIsPerfAnalyzing(false);
                                        }
                                    }}
                                    disabled={isPerfAnalyzing || !balancedBuild}
                                    style={{ opacity: (!balancedBuild || isPerfAnalyzing) ? 0.5 : 1, cursor: (!balancedBuild || isPerfAnalyzing) ? 'not-allowed' : 'pointer' }}
                                >
                                    {isPerfAnalyzing
                                        ? <svg className="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                        : <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25M3.75 14.25a2.25 2.25 0 0 0 4.5 0m-4.5 0H3m1.5 0h7.5M13.5 3v11.25m0 0a2.25 2.25 0 0 0 4.5 0m-4.5 0H12m1.5 0h7.5" /></svg>
                                    }
                                    {isPerfAnalyzing ? 'ESTIMATING...' : 'PERFORMANCE_ESTIMATOR'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <PerformanceDashboardModal
                isOpen={isPerfModalOpen}
                onClose={() => setIsPerfModalOpen(false)}
                report={bottleneckReport}
            />

        </div>
    );
}