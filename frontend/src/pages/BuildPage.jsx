import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Question from "../components/build/Question";
import { searchComponents, submitBuildRequest } from "../services/componentService";

export default function BuildPage() {
  // Tabs & Step
  const [activeTab, setActiveTab] = useState("basic");
  const [step, setStep] = useState(1);
  const [showSummary, setShowSummary] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const navigate = useNavigate();

  // Basic Answers
  const [answers, setAnswers] = useState({
    purpose: [],
    resolution: "",
    performance: "",
    budget: { min: "", max: "" },
    ownedParts: [],
    existingFit: "",
    upgrade: "",
    caseSize: "",
    aesthetics: "",
    overclock: "",
    wifi: "",
    cpuBrand: "",
    gpuBrand: "",
    expansion: [],
  });

  // Advanced Answers
  const [advAnswers, setAdvAnswers] = useState({
    refreshRate: "",
    priority: "",
    budgetOpt: "",
    workloadFocus: "",
    storageSetup: "",
    storageSize: "",
    caseStyle: "",
    coolingImp: "",
    coolingType: "",
    noise: "",
    powerEff: "",
    connectivity: [],
    rayTracing: "",
    rgbSoftware: "",
  });

  // Owned Component Details & search
  const [ownedDetails, setOwnedDetails] = useState({});
  const [searchResults, setSearchResults] = useState({});
  const [activeSearchPart, setActiveSearchPart] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [loadingState, setLoadingState] = useState({});
  const searchContainerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setActiveSearchPart(null);
        setSelectedIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const updateAnswer = (field, value) => setAnswers({ ...answers, [field]: value });
  const updateAdvAnswer = (field, value) => setAdvAnswers({ ...advAnswers, [field]: value });

  const handleOwnedPartsSelect = (newSelection) => {
    const prevSelection = answers.ownedParts;
    // Enforce "None" exclusivity logic
    if (!prevSelection.includes("None") && newSelection.includes("None")) {
      setAnswers({ ...answers, ownedParts: ["None"] });
      setOwnedDetails({});
      return;
    }
    if (prevSelection.includes("None") && newSelection.length > 1) {
      setAnswers({ ...answers, ownedParts: newSelection.filter(i => i !== "None") });
      return;
    }
    setAnswers({ ...answers, ownedParts: newSelection });
    const removed = prevSelection.filter(p => !newSelection.includes(p));
    if (removed.length) {
      const newDetails = { ...ownedDetails };
      removed.forEach(r => delete newDetails[r]);
      setOwnedDetails(newDetails);
    }
  };

  const handleOwnedDetailChange = async (part, value) => {
    setOwnedDetails({ ...ownedDetails, [part]: value });
    if (selectedIndex !== -1) setSelectedIndex(-1);
    setLoadingState(prev => ({ ...prev, [part]: true }));
    setActiveSearchPart(part);

    try {
      const results = await searchComponents(value, part);
      setSearchResults(prev => ({ ...prev, [part]: results }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingState(prev => ({ ...prev, [part]: false }));
    }
  };

  const selectComponent = (part, componentName) => {
    setOwnedDetails({ ...ownedDetails, [part]: componentName });
    setSelectedIndex(-1);
    setActiveSearchPart(null);
  };

  const isPartOwned = (part) => answers.ownedParts.includes(part);

  const getComponentDisplayName = (res) => {
    let displayName = res.name || res.model || res.title || res.product_name || res.item_name;
    if (!displayName) {
      if (res.line) displayName = res.line;
      else if (res.family) displayName = `${res.family} ${res.microarchitecture || ""}`.trim();
      else if (res.chipset) displayName = `${res.brand || ""} ${res.chipset}`.trim();
    }
    if (!displayName || displayName.trim() === "") {
      const cleanValues = Object.values(res)
        .filter(v => typeof v === 'string' && v.length > 1 && v.length < 50 && !v.includes('http') && !v.includes('{'))
        .slice(0, 3);
      if (cleanValues.length) displayName = cleanValues.join(" ");
      else displayName = "Component #" + (res.id || Math.floor(Math.random() * 1000));
    }
    return displayName;
  };

  const handleKeyDown = (e, part) => {
    if (!activeSearchPart || activeSearchPart !== part) return;
    const results = searchResults[part] || [];
    if (!results.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      selectComponent(part, getComponentDisplayName(results[selectedIndex]));
    } else if (e.key === "Escape") {
      setActiveSearchPart(null);
    }
  };


  const handleTabChange = (tab) => { setActiveTab(tab); window.scrollTo(0, 0); };

  const handleClearAll = () => {
    if (window.confirm("Format data sector? (Clear all answers)")) {
      setAnswers({ purpose: [], resolution: "", performance: "", budget: { min: "", max: "" }, ownedParts: [], existingFit: "", upgrade: "", caseSize: "", aesthetics: "", overclock: "", wifi: "", cpuBrand: "", gpuBrand: "", expansion: [] });
      setAdvAnswers({ refreshRate: "", priority: "", budgetOpt: "", workloadFocus: "", storageSetup: "", storageSize: "", caseStyle: "", coolingImp: "", coolingType: "", noise: "", powerEff: "", connectivity: [], rayTracing: "", rgbSoftware: "" });
      setOwnedDetails({});
      setSearchResults({});
      setActiveTab("basic");
      setShowSummary(false);
      setStep(1);
    }
  };

  const handleSubmitBuild = async () => {
    const summaryData = {
      timestamp: new Date().toISOString(),
      type: activeTab === "advanced" ? "Advanced Build" : "Basic Build",
      basicPreferences: answers,
      ownedComponents: ownedDetails,
      ...(activeTab === "advanced" && { advancedPreferences: advAnswers }),
    };

    const { success, error } = await submitBuildRequest({ payload: summaryData });

    if (success) {
      const budgetVal = Number(answers.budget.max) || 200000;
      const budgetCategory = budgetVal >= 450000 ? "high" : budgetVal >= 200000 ? "mid" : "low";

      const primaryUse = (answers.purpose && answers.purpose.length > 0)
        ? answers.purpose[0].toLowerCase().replace(/\s+/g, '')
        : "gaming";

      const aestheticsPref = answers.aesthetics?.includes("RGB") ? "RGB" : "Minimal";

      setIsNavigating(true);
      navigate('/build-suggestions', {
        state: {
          budget: budgetCategory,
          use: primaryUse.includes("gaming") ? "gaming" :
               (primaryUse.includes("edit") || primaryUse.includes("design") || primaryUse.includes("render")) ? "editing" :
               (primaryUse.includes("program") || primaryUse.includes("machine")) ? "programming" : "general",
          aesthetics: aestheticsPref,
          summary: summaryData
        }
      });
    } else {
      console.error(error);
      alert("Failed to submit build request. Please try again.");
    }
  };

  // Styles reconciled from feature branch's rich aesthetics
  const pageWrapper = { padding: "40px 20px", maxWidth: "850px", margin: "0 auto", minHeight: "100vh" };
  const titleStyle = { textAlign: "left", fontSize: "42px", fontWeight: "900", marginBottom: "30px", color: "#eeeeee", textTransform: "uppercase", letterSpacing: "-0.02em", borderBottom: "2px solid #333", paddingBottom: "15px" };
  const tabContainerStyle = { display: "flex", justifyContent: "flex-start", gap: "0px", marginBottom: "30px", borderBottom: "1px solid #1a1a1a" };

  const getTabStyle = (tabName) => ({
    padding: "12px 24px",
    cursor: "pointer",
    border: "none",
    borderBottom: activeTab === tabName ? "2px solid #00f3ff" : "2px solid transparent",
    color: activeTab === tabName ? "#00f3ff" : "#666",
    fontWeight: "700",
    fontSize: "14px",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    marginBottom: "-1px",
    transition: "all 0.2s ease",
    backgroundColor: activeTab === tabName ? "rgba(0,243,255,0.05)" : "transparent",
  });

  const buttonStyle = { padding: "16px 32px", borderRadius: "0px", border: "1px solid #00f3ff", cursor: "pointer", backgroundColor: "transparent", color: "#00f3ff", fontWeight: "900", fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.15em", marginTop: "40px", display: "block", width: "100%", transition: "all 0.3s ease" };
  const secondaryButtonStyle = { ...buttonStyle, border: "1px solid #333", color: "#666", marginTop: "15px" };
  const toggleContainerStyle = { marginTop: "60px", padding: "30px", border: "1px dashed #333", backgroundColor: "#0a0a0a", textAlign: "center" };

  const renderComponentSearch = (part) => (
    <div className="search-container" ref={activeSearchPart === part ? searchContainerRef : null} style={{ position: "relative", marginTop: "10px", minWidth: "250px" }}>
      <input
        type="text"
        placeholder={`Search ${part}...`}
        value={ownedDetails[part] || ""}
        onChange={(e) => handleOwnedDetailChange(part, e.target.value)}
        onKeyDown={(e) => handleKeyDown(e, part)}
        style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid", borderColor: activeSearchPart === part ? "#00f3ff" : "#333", fontSize: "12px", height: "40px", outline: "none", transition: "all 0.2s ease", color: "#eeeeee", backgroundColor: "#0a0a0a", fontFamily: "'Space Mono', monospace" }}
        onFocus={() => { setActiveSearchPart(part); handleOwnedDetailChange(part, ownedDetails[part] || ""); }}
        onClick={(e) => { e.stopPropagation(); if (activeSearchPart !== part) { setActiveSearchPart(part); handleOwnedDetailChange(part, ownedDetails[part] || ""); } }}
      />
      {activeSearchPart === part && (loadingState[part] || (searchResults[part] && searchResults[part].length > 0) || (ownedDetails[part] && ownedDetails[part].length > 1)) && (
        <ul style={{ listStyle: "none", padding: "0", margin: "4px 0 0", border: "1px solid #333", borderRadius: "0px", maxHeight: "220px", overflowY: "auto", backgroundColor: "#111", position: "absolute", zIndex: 9999, width: "100%", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
          {loadingState[part] ? (
            <li style={{ padding: "10px 12px", color: "#666", fontStyle: "italic", fontSize: "13px" }}>Loading components...</li>
          ) : (
            searchResults[part] && searchResults[part].length > 0 ? (
              searchResults[part].map((res, index) => {
                const displayName = getComponentDisplayName(res);
                const isSelected = index === selectedIndex;
                return (
                  <li key={res.id || index} onMouseDown={(e) => { e.preventDefault(); selectComponent(part, displayName); }} style={{ padding: "12px 16px", cursor: "pointer", borderBottom: "1px solid #1a1a1a", fontSize: "11px", color: isSelected ? "#00f3ff" : "#888", lineHeight: "1.4", backgroundColor: isSelected ? "#1a1a1a" : "transparent", fontFamily: "'Space Mono', monospace", textTransform: "uppercase" }}>
                    {displayName}
                  </li>
                );
              })
            ) : (
              <li style={{ padding: "10px 12px", color: "#666", fontStyle: "italic", fontSize: "13px" }}>No results found</li>
            )
          )}
        </ul>
      )}
    </div>
  );

  if (showSummary) {
    return (
      <div className="min-h-screen bg-[#050505] text-[#eeeeee] font-mono">
        <Navbar />
        <div style={pageWrapper}>
          <button onClick={() => setShowSummary(false)} style={{ color: '#00f3ff', border: '1px solid #00f3ff', padding: '6px 12px', background: 'transparent', cursor: 'pointer', marginBottom: '20px', fontSize: '14px', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>←</span> BACK
          </button>
          <h1 style={{ ...titleStyle, textAlign: "center", fontSize: "40px", marginBottom: "30px", borderBottom: "none" }}>
            {activeTab === "advanced" ? "SUMMARY_ADVANCED" : "SUMMARY_BASIC"}
          </h1>
          <div style={{ backgroundColor: "#0a0a0a", border: "1px solid #333", padding: "40px", position: "relative" }}>
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#00f3ff]"></div>
            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-[#00f3ff]"></div>
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-[#00f3ff]"></div>
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#00f3ff]"></div>
          </div>

          <div style={{ backgroundColor: "#111", border: "2px solid #333", padding: "40px" }}>
            <h3 style={{ color: "#00f3ff", marginBottom: "20px", borderBottom: "1px solid #333", paddingBottom: "10px" }}>CORE_PREFERENCES</h3>
            {Object.entries(answers).map(([key, value]) => (
              <div key={key} style={{ marginBottom: "12px", display: "flex", justifyContent: "space-between", borderBottom: "1px solid #222", paddingBottom: "4px" }}>
                <strong style={{ color: "#666", fontSize: "10px" }}>{key.toUpperCase()}:</strong>
                <span style={{ fontSize: "12px" }}>{Array.isArray(value) ? value.join(", ") : (typeof value === "object" ? `LKR ${value.min || 0} - ${value.max || "INF"}` : value || "NULL")}</span>
              </div>
            ))}

            {Object.keys(ownedDetails).length > 0 && (
              <div style={{ marginTop: "30px" }}>
                <h3 style={{ color: "#ccff00", marginBottom: "20px", borderBottom: "1px solid #333", paddingBottom: "10px" }}>OWNED_HARDWARE</h3>
                {Object.entries(ownedDetails).map(([part, detail]) => (
                  <div key={part} style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", borderBottom: "1px solid #222", paddingBottom: "4px" }}>
                    <strong style={{ color: "#666", fontSize: "10px" }}>{part.toUpperCase()}:</strong> <span style={{ fontSize: "12px" }}>{detail}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: "50px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <button style={{ ...buttonStyle, backgroundColor: "#00f3ff", color: "#000", marginTop: "0" }} onClick={handleSubmitBuild} disabled={isNavigating}>
                Submit Build Request & Calculate
              </button>
              <button style={secondaryButtonStyle} onClick={() => setShowSummary(false)}>
                Return to Configurator
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] selection:bg-[#00f3ff] selection:text-black">
      <div style={pageWrapper}>
        <h1 style={titleStyle}>SYSTEM_BUILDER</h1>

        <div style={tabContainerStyle}>
          <button style={getTabStyle("basic")} onClick={() => handleTabChange("basic")}>01_BASIC</button>
          <button style={getTabStyle("advanced")} onClick={() => handleTabChange("advanced")}>02_ADVANCED</button>
        </div>

        <div style={{ backgroundColor: "#111", border: "2px solid #333", padding: "40px", marginBottom: "100px" }}>
          {activeTab === "basic" ? (
            <div className="space-y-8">
              <Question title="PRIMARY_OBJECTIVE" options={["Gaming", "Video Editing", "Graphic Design", "3D Rendering", "Programming", "AI / Machine Learning", "Streaming", "Office / General Use", "Heavy Multitasking", "Mixed Use"]} selected={answers.purpose} onSelect={(val) => updateAnswer("purpose", val)} multi={true} layout="grid" />
              <Question title="VISUAL_RESOLUTION" options={["1080p", "1440p", "4K", "Not sure"]} selected={answers.resolution} onSelect={(val) => updateAnswer("resolution", val)} layout="row" />
              <Question title="PERFORMANCE_TIER" options={["Entry Level", "Mid-Range", "High-End", "Enthusiast"]} selected={answers.performance} onSelect={(val) => updateAnswer("performance", val)} />
              <Question title="BUDGET_THRESHOLD" type="range" selected={answers.budget} onSelect={(val) => updateAnswer("budget", val)} min={100000} />
              <Question title="EXISTING_HARDWARE" options={["CPU", "GPU", "RAM", "Storage", "PSU", "Case", "None"]} selected={answers.ownedParts} onSelect={(val) => handleOwnedPartsSelect(val)} multi={true} renderOptionExtra={(option) => option !== "None" && renderComponentSearch(option)} />
              <Question title="PROCESSOR_PREFERENCE" subtitle={isPartOwned("CPU") ? "SECTOR_OWNED: CPU" : null} options={["Intel", "AMD", "No preference", isPartOwned("CPU") ? "ALREADY_OWNED" : null].filter(Boolean)} selected={answers.cpuBrand} onSelect={(val) => updateAnswer("cpuBrand", val)} layout="row" />
              <Question title="GRAPHICS_PREFERENCE" subtitle={isPartOwned("GPU") ? "SECTOR_OWNED: GPU" : null} options={["NVIDIA", "AMD", "No preference", isPartOwned("GPU") ? "ALREADY_OWNED" : null].filter(Boolean)} selected={answers.gpuBrand} onSelect={(val) => updateAnswer("gpuBrand", val)} layout="row" />
              <Question title="FUTURE_EXPANSION" options={["More RAM slots", "Extra storage slots", "Space for GPU upgrades", "No preference"]} selected={answers.expansion} onSelect={(val) => updateAnswer("expansion", val)} multi={true} exclusiveOption="No preference" />
              <Question title="FORM_FACTOR" subtitle={isPartOwned("Case") ? "SECTOR_OWNED: CASE" : null} options={["Mini ITX", "Micro ATX", "ATX", "No preference", isPartOwned("Case") ? "ALREADY_OWNED" : null].filter(Boolean)} selected={answers.caseSize} onSelect={(val) => updateAnswer("caseSize", val)} />
              <Question title="AESTHETIC_PROFILE" options={["Performance only", "Minimal build", "RGB build", "White themed build", "No preference"]} selected={answers.aesthetics} onSelect={(val) => updateAnswer("aesthetics", val)} />
              <Question title="UPGRADE_PRIORITY" options={["Not important", "Somewhat important", "Very important"]} selected={answers.upgrade} onSelect={(val) => updateAnswer("upgrade", val)} />

              <div style={toggleContainerStyle}>
                <p style={{ marginBottom: "15px", fontWeight: "900", color: "#666", fontSize: "10px", letterSpacing: "0.1em" }}>// OPTIMIZATION_AVAILABLE</p>
                <button onClick={() => handleTabChange("advanced")} style={{ padding: "12px 24px", borderRadius: "0px", border: "1px solid #00f3ff", background: "transparent", color: "#00f3ff", cursor: "pointer", fontWeight: "900", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.2em" }}>
                  Switch to Advanced Mode
                </button>
              </div>

              <button style={buttonStyle} onClick={() => { setShowSummary(true); window.scrollTo(0, 0); }}>
                Generate Summary View
              </button>
              <div style={{ marginTop: "20px", textAlign: "center" }}>
                <span onClick={handleClearAll} style={{ color: "#ff4400", cursor: "pointer", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: "bold" }}>
                  [ reset_terminal ]
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              <div style={{ marginBottom: "30px", padding: "15px", backgroundColor: "rgba(255,180,0,0.1)", border: "1px solid #ff4400", color: "#ff4400", fontSize: "10px" }}>
                <strong>SYSTEM_NOTE:</strong> ENSURE BASIC_TELEMETRY (TAB_01) IS COMPLETE BEFORE ANALYZING ADVANCED_METRICS.
              </div>
              <Question title="REFRESH_RATE" options={["60Hz", "75Hz", "120Hz", "144Hz", "165Hz+", "Not sure"]} selected={advAnswers.refreshRate} onSelect={(val) => updateAdvAnswer("refreshRate", val)} layout="row" />
              <Question title="PRIMARY_FOCUS" options={["Maximum gaming FPS", "Rendering performance", "Smooth multitasking", "Balanced performance"]} selected={advAnswers.priority} onSelect={(val) => updateAdvAnswer("priority", val)} />
              <Question title="BUDGET_OPTIMIZATION" options={["Lowest cost possible", "Best performance for money", "Long-term value"]} selected={advAnswers.budgetOpt} onSelect={(val) => updateAdvAnswer("budgetOpt", val)} />
              <Question title="WORKLOAD_RATIO" options={["GPU is more important", "CPU is more important", "Both equally important", "Not sure"]} selected={advAnswers.workloadFocus} onSelect={(val) => updateAdvAnswer("workloadFocus", val)} />
              <Question title="STORAGE_CONFIG" options={["NVMe SSD (Fastish)", "SSD + HDD combo", "Large HDD storage", "Not sure"]} selected={advAnswers.storageSetup} onSelect={(val) => updateAdvAnswer("storageSetup", val)} />
              <Question title="STORAGE_CAPACITY" options={["500GB", "1TB", "2TB", "4TB+", "Not sure"]} selected={advAnswers.storageSize} onSelect={(val) => updateAdvAnswer("storageSize", val)} layout="row" />
              <Question title="COOLING_PROFILE" options={["Air cooling", "Liquid cooling (AIO)", "Custom water cooling", "No preference"]} selected={advAnswers.coolingType} onSelect={(val) => updateAdvAnswer("coolingType", val)} />
              <Question title="ACOUSTIC_PROFILE" options={["Silent build", "Balanced", "Performance over noise"]} selected={advAnswers.noise} onSelect={(val) => updateAdvAnswer("noise", val)} layout="row" />
              <Question title="POWER_EFFICIENCY" options={["Yes", "Somewhat", "Not important"]} selected={advAnswers.powerEff} onSelect={(val) => updateAdvAnswer("powerEff", val)} layout="row" />
              <Question title="INTELLIGENT_TECH" options={["Must have Ray Tracing", "DLSS/FSR focus", "Native Rasterization", "Don't care"]} selected={advAnswers.rayTracing} onSelect={(val) => updateAdvAnswer("rayTracing", val)} />

              <button style={buttonStyle} onClick={() => { setShowSummary(true); window.scrollTo(0, 0); }}>
                Compile Final Summary
              </button>
              <div style={{ marginTop: "20px", textAlign: "center" }}>
                <span onClick={handleClearAll} style={{ color: "#ff4400", cursor: "pointer", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: "bold" }}>
                  [ wipe_configuration ]
                </span>
              </div>
            </div>
          )}
          <div style={{ marginTop: "20px", textAlign: "center" }}>
            <span onClick={handleClearAll} style={{ color: "#666", cursor: "pointer", fontSize: "10px", textDecoration: "underline", textTransform: "uppercase" }}>PURGE_ALL_BUFFERS</span>
          </div>
        </div>
      </div>
    </div>
  );
}

