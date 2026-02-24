import { useState, useEffect, useRef } from "react";
import Navbar from "../components/layout/Navbar";
import Question from "../components/build/Question";
import { searchComponents, submitBuildRequest } from "../services/componentService";

export default function BuildPage() {
  // Tabs & Step
  const [activeTab, setActiveTab] = useState("basic");
  const [step, setStep] = useState(1);
  const [showSummary, setShowSummary] = useState(false);

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
    // Enforce "None" exclusivity
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

  const renderComponentSearch = (part) => (
    <div ref={activeSearchPart === part ? searchContainerRef : null} style={{ position: "relative", marginTop: "10px", minWidth: "250px" }}>
      <input
        type="text"
        placeholder={`Search ${part}...`}
        value={ownedDetails[part] || ""}
        onChange={(e) => handleOwnedDetailChange(part, e.target.value)}
        onKeyDown={(e) => handleKeyDown(e, part)}
        onFocus={() => handleOwnedDetailChange(part, ownedDetails[part] || "")}
        style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1.5px solid", borderColor: activeSearchPart === part ? "#4a7cff" : "#e0e0e0", fontSize: "14px", outline: "none", backgroundColor: "#fff", color: "#333", transition: "all 0.2s" }}
      />
      {activeSearchPart === part && (
        <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0 0", border: "1px solid #eee", borderRadius: "10px", maxHeight: "250px", overflowY: "auto", backgroundColor: "white", position: "absolute", zIndex: 9999, width: "100%", boxShadow: "0 10px 25px rgba(0,0,0,0.1)", borderTop: "none" }}>
          {loadingState[part] ? (
            <li style={{ padding: "12px 16px", fontStyle: "italic", color: "#666", fontSize: "13px" }}>Searching Database...</li>
          ) : searchResults[part]?.length ? (
            searchResults[part].map((res, idx) => (
              <li
                key={res.id || idx}
                onMouseDown={(e) => { e.preventDefault(); selectComponent(part, getComponentDisplayName(res)); }}
                style={{ padding: "12px 16px", cursor: "pointer", borderBottom: "1px solid #f8f8f8", backgroundColor: idx === selectedIndex ? "#f0f7ff" : "white", fontSize: "13px", color: idx === selectedIndex ? "#1d4ed8" : "#333", fontWeight: idx === selectedIndex ? "600" : "400" }}
              >
                {getComponentDisplayName(res)}
              </li>
            ))
          ) : (
            <li style={{ padding: "12px 16px", fontStyle: "italic", color: "#999", fontSize: "13px" }}>No matches found</li>
          )}
        </ul>
      )}
    </div>
  );

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
    const summaryData = { timestamp: new Date().toISOString(), type: activeTab === "advanced" ? "Advanced Build" : "Basic Build", basicPreferences: answers, ownedComponents: ownedDetails, ...(activeTab === "advanced" && { advancedPreferences: advAnswers }) };
    try {
      const { success, error } = await submitBuildRequest({ payload: summaryData });
      if (success) alert("SYSTEM MESSAGE: BUILD_SPECIFICATIONS_UPLOADED_SUCCESSFULLY");
      else { console.error(error); alert("COMM_ERROR: UPLOAD_FAILED"); }
    } catch (err) {
      alert("CRITICAL_ERROR: SECTOR_NOT_REACHABLE");
    }
  };

  // Styles
  const pageWrapper = { padding: "40px 20px", maxWidth: "900px", margin: "0 auto", minHeight: "100vh" };
  const titleStyle = { textAlign: "center", fontSize: "3rem", fontWeight: 900, marginBottom: "40px", letterSpacing: "-0.05em", textTransform: "uppercase" };
  const tabContainerStyle = { display: "flex", justifyContent: "center", gap: "10px", marginBottom: "40px", borderBottom: "2px solid #333" };
  const getTabStyle = (tabName) => ({ padding: "12px 30px", cursor: "pointer", border: "none", borderBottom: activeTab === tabName ? "4px solid #00f3ff" : "4px solid transparent", color: activeTab === tabName ? "#00f3ff" : "#666", fontWeight: "900", fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.1em", transition: "all 0.2s" });
  const buttonStyle = { padding: "16px 32px", border: "2px solid #333", cursor: "pointer", backgroundColor: "#00f3ff", color: "black", fontWeight: "900", fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.1em", width: "100%", marginTop: "40px", transition: "all 0.2s shadow-lg" };

  if (showSummary) {
    return (
      <div className="min-h-screen bg-[#050505] text-[#eeeeee] font-mono">
        <Navbar />
        <div style={pageWrapper}>
          <h1 style={{ ...titleStyle, fontSize: "2rem", marginBottom: "20px" }}>{activeTab === "advanced" ? "ADVANCED_SUMMARY" : "BASIC_SUMMARY"}</h1>

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

            {activeTab === "advanced" && (
              <div style={{ marginTop: "30px" }}>
                <h3 style={{ color: "#ff4400", marginBottom: "20px", borderBottom: "1px solid #333", paddingBottom: "10px" }}>ADVANCED_METRICS</h3>
                {Object.entries(advAnswers).map(([key, value]) => (
                  <div key={key} style={{ marginBottom: "12px", display: "flex", justifyContent: "space-between", borderBottom: "1px solid #222", paddingBottom: "4px" }}>
                    <strong style={{ color: "#666", fontSize: "10px" }}>{key.toUpperCase()}:</strong> <span style={{ fontSize: "12px" }}>{Array.isArray(value) ? value.join(", ") : value || "NULL"}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: "40px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <button style={buttonStyle} onClick={handleSubmitBuild}>COMPLETE_INITIALIZATION</button>
              <button style={{ ...buttonStyle, backgroundColor: "#222", color: "#eee", border: "2px solid #333" }} onClick={() => setShowSummary(false)}>ADJUST_SIGNALS</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-[#eeeeee] font-mono">
      <Navbar />
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

              <button style={buttonStyle} onClick={() => { setShowSummary(true); window.scrollTo(0, 0); }}>GENERATE_REPORT</button>
            </div>
          ) : (
            <div className="space-y-8">
              <div style={{ marginBottom: "30px", padding: "15px", backgroundColor: "rgba(255,180,0,0.1)", border: "1px solid #ff4400", color: "#ff4400", fontSize: "10px" }}>
                <strong>SYSTEM_NOTE:</strong> ENSURE BASIC_TELEMETRY (TAB_01) IS COMPLETE BEFORE ANALYZING ADVANCED_METRICS.
              </div>
              <Question title="REFRESH_RATE" options={["60Hz", "75Hz", "120Hz", "144Hz", "165Hz+", "Not sure"]} selected={advAnswers.refreshRate} onSelect={(val) => updateAdvAnswer("refreshRate", val)} layout="row" />
              <Question title="PRIMARY_FOCUS" options={["Maximum gaming FPS", "Rendering performance", "Smooth multitasking", "Balanced performance"]} selected={advAnswers.priority} onSelect={(val) => updateAdvAnswer("priority", val)} />
              <Question title="STORAGE_CONFIG" options={["NVMe SSD (Fastest)", "SSD + HDD combo", "Large HDD storage", "Not sure", isPartOwned("Storage") ? "ALREADY_OWNED" : null].filter(Boolean)} selected={advAnswers.storageSetup} onSelect={(val) => updateAdvAnswer("storageSetup", val)} />
              <Question title="STORAGE_CAPACITY" options={["500GB", "1TB", "2TB", "4TB+", "Not sure", isPartOwned("Storage") ? "ALREADY_OWNED" : null].filter(Boolean)} selected={advAnswers.storageSize} onSelect={(val) => updateAdvAnswer("storageSize", val)} layout="row" />
              <Question title="COOLING_PROFILE" options={["Air cooling", "Liquid cooling (AIO)", "Custom water cooling", "No preference"]} selected={advAnswers.coolingType} onSelect={(val) => updateAdvAnswer("coolingType", val)} />
              <Question title="ACOUSTIC_PROFILE" options={["Silent build", "Balanced", "Performance over noise"]} selected={advAnswers.noise} onSelect={(val) => updateAdvAnswer("noise", val)} layout="row" />
              <Question title="POWER_EFFICIENCY" options={["Yes", "Somewhat", "Not important"]} selected={advAnswers.powerEff} onSelect={(val) => updateAdvAnswer("powerEff", val)} layout="row" />
              <Question title="INTELLIGENT_TECH" options={["Must have Ray Tracing", "DLSS/FSR focus", "Native Rasterization", "Don't care"]} selected={advAnswers.rayTracing} onSelect={(val) => updateAdvAnswer("rayTracing", val)} />

              <button style={buttonStyle} onClick={() => { setShowSummary(true); window.scrollTo(0, 0); }}>GENERATE_FULL_REPORT</button>
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
