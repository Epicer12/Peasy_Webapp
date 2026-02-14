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
    <div ref={activeSearchPart === part ? searchContainerRef : null} style={{ position: "relative", marginTop: "0px", minWidth: "250px" }}>
      <input
        type="text"
        placeholder={`Search ${part}...`}
        value={ownedDetails[part] || ""}
        onChange={(e) => handleOwnedDetailChange(part, e.target.value)}
        onKeyDown={(e) => handleKeyDown(e, part)}
        onFocus={() => handleOwnedDetailChange(part, ownedDetails[part] || "")}
        style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid", borderColor: activeSearchPart === part ? "#4a7cff" : "#ccc", fontSize: "14px", height: "38px", outline: "none", backgroundColor: "white", color: "black" }}
      />
      {activeSearchPart === part && (
        <ul style={{ listStyle: "none", padding: 0, margin: 4, border: "1px solid #eee", borderRadius: "6px", maxHeight: "220px", overflowY: "auto", backgroundColor: "white", position: "absolute", zIndex: 9999, width: "100%", boxShadow: "0 4px 16px rgba(0,0,0,0.12)" }}>
          {loadingState[part] ? (
            <li style={{ padding: "10px 12px", fontStyle: "italic" }}>Loading components...</li>
          ) : searchResults[part]?.length ? (
            searchResults[part].map((res, idx) => (
              <li
                key={res.id || idx}
                onMouseDown={(e) => { e.preventDefault(); selectComponent(part, getComponentDisplayName(res)); }}
                style={{ padding: "10px 12px", cursor: "pointer", borderBottom: "1px solid #f5f5f5", backgroundColor: idx === selectedIndex ? "#f0f7ff" : "white" }}
              >
                {getComponentDisplayName(res)}
              </li>
            ))
          ) : (
            <li style={{ padding: "10px 12px", fontStyle: "italic" }}>No results found</li>
          )}
        </ul>
      )}
    </div>
  );

  const handleTabChange = (tab) => { setActiveTab(tab); window.scrollTo(0, 0); };
  const next = () => setStep(step + 1);
  const back = () => setStep(step - 1);

  const pageWrapper = { padding: "40px 20px", maxWidth: "800px", margin: "0 auto" };
  const titleStyle = { textAlign: "center", fontSize: "36px", fontWeight: 700, marginBottom: "30px" };
  const buttonStyle = { padding: "12px 24px", borderRadius: "8px", border: "none", cursor: "pointer", backgroundColor: "#4a7cff", color: "white", fontWeight: "600", fontSize: "16px", marginTop: "30px", width: "100%" };
  const backStyle = { ...buttonStyle, backgroundColor: "#ccc", color: "#333" };
  const buttonRow = { display: "flex", justifyContent: "space-between", marginTop: "30px" };

  const handleClearAll = () => {
    if (window.confirm("Clear all answers?")) {
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
    const { success, error } = await submitBuildRequest({ payload: summaryData });
    if (success) alert("Build request submitted successfully!");
    else { console.error(error); alert("Failed to submit build request."); }
  };

  if (showSummary) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div style={pageWrapper}>
          <h1 style={{ ...titleStyle, fontSize: "28px", marginBottom: "15px" }}>{activeTab === "advanced" ? "Advanced Build Summary" : "Basic Build Summary"}</h1>

          {/* Basic & Advanced Summary */}
          <div style={{ backgroundColor: "#f9f9f9", borderRadius: "12px", boxShadow: "0 10px 30px rgba(0,0,0,0.1)", padding: "25px" }}>
            {Object.entries(answers).map(([key, value]) => (
              <div key={key} style={{ marginBottom: "8px", display: "flex", justifyContent: "space-between" }}>
                <strong>{key}:</strong>
                <span>{Array.isArray(value) ? value.join(", ") : (typeof value === "object" ? `LKR ${value.min || 0} - LKR ${value.max || "∞"}` : value || "Not selected")}</span>
              </div>
            ))}
            {Object.keys(ownedDetails).length > 0 && (
              <div style={{ marginTop: "15px" }}>
                {Object.entries(ownedDetails).map(([part, detail]) => (
                  <div key={part} style={{ display: "flex", justifyContent: "space-between" }}>
                    <strong>{part}:</strong> <span>{detail}</span>
                  </div>
                ))}
              </div>
            )}
            {activeTab === "advanced" && Object.entries(advAnswers).map(([key, value]) => (
              <div key={key} style={{ marginBottom: "8px", display: "flex", justifyContent: "space-between" }}>
                <strong>{key}:</strong> <span>{Array.isArray(value) ? value.join(", ") : value || "Not selected"}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: "30px", textAlign: "center" }}>
            <button style={{ ...buttonStyle, width: "auto" }} onClick={handleSubmitBuild}>Submit Build Request</button>
            <button style={{ ...buttonStyle, backgroundColor: "#f0f0f0", color: "#333", border: "1px solid #ccc", marginTop: "10px", width: "auto" }} onClick={() => { setShowSummary(false); handleTabChange("basic"); }}>Edit Answers</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div style={pageWrapper}>
        <h1 style={titleStyle}>Build Your Own PC</h1>

        <div style={{ display: "flex", justifyContent: "center", gap: "20px", marginBottom: "30px", borderBottom: "1px solid #ddd" }}>
          <div style={{ padding: "10px 20px", cursor: "pointer", borderBottom: activeTab === "basic" ? "3px solid #4a7cff" : "3px solid transparent", color: activeTab === "basic" ? "#4a7cff" : "#666" }} onClick={() => handleTabChange("basic")}>Basic</div>
          <div style={{ padding: "10px 20px", cursor: "pointer", borderBottom: activeTab === "advanced" ? "3px solid #4a7cff" : "3px solid transparent", color: activeTab === "advanced" ? "#4a7cff" : "#666" }} onClick={() => handleTabChange("advanced")}>Advanced</div>
        </div>

        {/* Here you can render all Questions as in HEAD version with renderComponentSearch, advanced questions, etc. */}
      </div>
    </div>
  );
}