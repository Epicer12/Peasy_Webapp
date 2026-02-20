import { useState, useEffect, useRef } from "react";
import Navbar from "../components/layout/Navbar";
import Question from "../components/build/Question";
import { searchComponents, submitBuildRequest } from "../services/componentService";

export default function BuildPage() {
  const [activeTab, setActiveTab] = useState("basic");
  const [showSummary, setShowSummary] = useState(false);

  // State for managing active search dropdown
  const [activeSearchPart, setActiveSearchPart] = useState(null);
  const searchContainerRef = useRef(null);

  // State for search active index (keyboard nav)
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Loading state for each part
  const [loadingState, setLoadingState] = useState({}); // { "GPU": true/false }

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setActiveSearchPart(null);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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
    // specificTasks was merged into purpose
    refreshRate: "",
    priority: "",
    budgetOpt: "",
    workloadFocus: "",
    storageSetup: "",
    storageSize: "",
    caseStyle: "",      // Replaced 'constraints'
    coolingImp: "",
    coolingType: "",
    noise: "",
    powerEff: "",
    connectivity: [],
    rayTracing: "",     // Replaced 'streaming'
    rgbSoftware: "",    // Replaced 'lifespan'
  });

  // Owned Component Details: { "GPU": "RTX 3080", "CPU": "Intel i9" }
  const [ownedDetails, setOwnedDetails] = useState({});
  const [searchResults, setSearchResults] = useState({}); // { "GPU": [results] }

  const updateAnswer = (field, value) => {
    setAnswers({ ...answers, [field]: value });
  };

  const updateAdvAnswer = (field, value) => {
    setAdvAnswers({ ...advAnswers, [field]: value });
  };

  // Special handler for Question 6 (Owned Parts) to enforce "None" exclusivity
  const handleOwnedPartsSelect = (newSelection) => {
    const prevSelection = answers.ownedParts;
    const noneAdded = !prevSelection.includes("None") && newSelection.includes("None");

    if (noneAdded) {
      // "None" was just clicked -> Clear everything else
      setAnswers({ ...answers, ownedParts: ["None"] });
      setOwnedDetails({}); // Clear all details
      return;
    }

    if (prevSelection.includes("None") && newSelection.length > 1) {
      // "None" was checked, but user clicked something else -> Remove "None"
      const filtered = newSelection.filter(i => i !== "None");
      setAnswers({ ...answers, ownedParts: filtered });
      return;
    }

    // Normal update
    setAnswers({ ...answers, ownedParts: newSelection });

    // Cleanup details for removed parts
    const removed = prevSelection.filter(p => !newSelection.includes(p));
    if (removed.length > 0) {
      const newDetails = { ...ownedDetails };
      removed.forEach(r => delete newDetails[r]);
      setOwnedDetails(newDetails);
    }
  };

  const handleOwnedDetailChange = async (part, value) => {
    setOwnedDetails({ ...ownedDetails, [part]: value });
    // Reset key nav
    if (selectedIndex !== -1) setSelectedIndex(-1);

    // Always trigger search to allow "show all" on focus
    console.log(`Searching for ${part} with query: "${value}"`);

    // Set loading
    setLoadingState(prev => ({ ...prev, [part]: true }));
    setActiveSearchPart(part); // Ensure active state is set

    try {
      const results = await searchComponents(value, part);
      console.log(`Search results for ${part}:`, results);
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
    setActiveSearchPart(null); // Close dropdown
  };

  const isPartOwned = (part) => answers.ownedParts.includes(part);

  // Helper for consistent display names
  const getComponentDisplayName = (res) => {
    let displayName = res.name || res.model || res.title || res.product_name || res.item_name;
    if (!displayName) {
      if (res.line) displayName = res.line;
      else if (res.family) displayName = `${res.family} ${res.microarchitecture || ''}`.trim();
      else if (res.chipset) displayName = `${res.brand || ''} ${res.chipset}`.trim();
    }
    if (!displayName || displayName.trim() === "") {
      const cleanValues = Object.values(res)
        .filter(v => typeof v === 'string' && v.length > 1 && v.length < 50 && !v.includes('http') && !v.includes('{'))
        .slice(0, 3);
      if (cleanValues.length > 0) displayName = cleanValues.join(" ");
      else displayName = "Component #" + (res.id || Math.floor(Math.random() * 1000));
    }
    return displayName;
  };

  const handleKeyDown = (e, part) => {
    if (!activeSearchPart || activeSearchPart !== part) return;
    const results = searchResults[part] || [];
    if (results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
      // Scroll into view logic would be good here but requires refs to LIs.
      // For now, let's just update the index.
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && results[selectedIndex]) {
        const displayName = getComponentDisplayName(results[selectedIndex]);
        selectComponent(part, displayName);
      }
    } else if (e.key === "Escape") {
      setActiveSearchPart(null);
    }
  };

  const pageWrapper = {
    padding: "40px 20px",
    maxWidth: "800px",
    margin: "0 auto",
  };

  const titleStyle = {
    textAlign: "center",
    fontSize: "36px",
    fontWeight: "700",
    marginBottom: "20px",
  };

  const tabContainerStyle = {
    display: "flex",
    justifyContent: "center",
    gap: "20px",
    marginBottom: "30px",
    borderBottom: "1px solid #ddd",
  };

  const getTabStyle = (tabName) => ({
    padding: "10px 20px",
    cursor: "pointer",
    borderBottom: activeTab === tabName ? "3px solid #4a7cff" : "3px solid transparent",
    color: activeTab === tabName ? "#4a7cff" : "#666",
    fontWeight: activeTab === tabName ? "700" : "500",
    fontSize: "18px",
    marginBottom: "-2px",
  });

  const buttonStyle = {
    padding: "12px 24px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    backgroundColor: "#4a7cff",
    color: "white",
    fontWeight: "600",
    fontSize: "16px",
    marginTop: "30px",
    display: "block",
    width: "100%",
  };

  const toggleContainerStyle = {
    marginTop: "40px",
    padding: "20px",
    border: "1px solid #e0e0e0",
    borderRadius: "8px",
    backgroundColor: "#f0f7ff",
    textAlign: "center",
  };

  const renderComponentSearch = (part) => {
    return (
      <div
        className="search-container"
        ref={activeSearchPart === part ? searchContainerRef : null}
        style={{ position: "relative", marginTop: "0px", minWidth: "250px" }}
      >
        <input
          type="text"
          placeholder={`Search ${part}...`}
          value={ownedDetails[part] || ""}
          onChange={(e) => handleOwnedDetailChange(part, e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, part)}
          style={{
            width: "100%",
            padding: "8px 12px",
            borderRadius: "6px",
            border: "1px solid",
            borderColor: activeSearchPart === part ? "#4a7cff" : "#ccc",
            fontSize: "14px",
            height: "38px",
            outline: "none",
            transition: "border-color 0.2s",
            color: "black", // Enforce black text
            backgroundColor: "white", // Ensure white background
          }}
          onFocus={() => {
            setActiveSearchPart(part);
            if (selectedIndex === -1) setSelectedIndex(-1);
            // Trigger search immediately to show options
            handleOwnedDetailChange(part, ownedDetails[part] || "");
          }}
          onClick={(e) => {
            // Prevent bubbling so document click doesn't close it immediately
            e.stopPropagation();
            if (activeSearchPart !== part) {
              setActiveSearchPart(part);
              handleOwnedDetailChange(part, ownedDetails[part] || "");
            }
          }}
        />

        {/* Dropdown List */}
        {activeSearchPart === part && (
          (loadingState[part] ||
            (searchResults[part] && searchResults[part].length > 0) ||
            (ownedDetails[part] && ownedDetails[part].length > 1 && searchResults[part] && searchResults[part].length === 0))
        ) && (
            <ul style={{
              listStyle: "none",
              padding: "0",
              margin: "4px 0 0",
              border: "1px solid #eee",
              borderRadius: "6px",
              maxHeight: "220px",
              overflowY: "auto",
              backgroundColor: "white",
              position: "absolute",
              zIndex: 9999, // High z-index to ensure visibility above other elements
              width: "100%",
              boxShadow: "0 4px 16px rgba(0,0,0,0.12)"
            }}>
              {loadingState[part] ? (
                <li style={{ padding: "10px 12px", color: "black", fontStyle: "italic", fontSize: "13px" }}>
                  Loading components...
                </li>
              ) : (
                searchResults[part] && searchResults[part].length > 0 ? (
                  searchResults[part].map((res, index) => {
                    const displayName = getComponentDisplayName(res);
                    const isSelected = index === selectedIndex;

                    return (
                      <li
                        key={res.id || Math.random()}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          selectComponent(part, displayName);
                        }}
                        style={{
                          padding: "10px 12px",
                          cursor: "pointer",
                          borderBottom: "1px solid #f5f5f5",
                          fontSize: "13px",
                          color: "black",
                          lineHeight: "1.4",
                          backgroundColor: isSelected ? "#f0f7ff" : "white"
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = "#f0f7ff";
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.target.style.background = "white";
                        }}
                      >
                        {displayName}
                      </li>
                    );
                  })
                ) : (
                  <li style={{ padding: "10px 12px", color: "black", fontStyle: "italic", fontSize: "13px" }}>
                    No results found
                  </li>
                )
              )}
            </ul>
          )}
      </div>
    );
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    window.scrollTo(0, 0);
  };

  const handleClearAll = () => {
    const hasBasic = Object.values(answers).some(val => Array.isArray(val) ? val.length > 0 : val !== "");
    const hasAdv = Object.values(advAnswers).some(val => Array.isArray(val) ? val.length > 0 : val !== "");
    const hasOwned = Object.keys(ownedDetails).length > 0;

    if (!hasBasic && !hasAdv && !hasOwned) {
      alert("Nothing is selected.");
      return;
    }

    if (window.confirm("Are you sure you want to clear all your answers? This cannot be undone.")) {
      setAnswers({
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
      setAdvAnswers({
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
      setOwnedDetails({});
      setSearchResults({});
      setActiveTab("basic");
      setShowSummary(false);
      window.scrollTo(0, 0);
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
      alert("Build request submitted successfully! The developer has received your summary.");
    } else {
      console.error(error);
      alert("Failed to submit build request. Please try again.");
    }
  };

  if (showSummary) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div style={pageWrapper}>
          <h1 style={{ ...titleStyle, fontSize: "28px", marginBottom: "15px" }}>{activeTab === "advanced" ? "Advanced Build Summary" : "Basic Build Summary"}</h1>
          <div style={{ backgroundColor: "#f9f9f9", borderRadius: "12px", boxShadow: "0 10px 30px rgba(0,0,0,0.1)", padding: "25px" }}>

            <div style={{ marginBottom: "20px" }}>
              <h3 style={{ borderBottom: "2px solid #eee", paddingBottom: "8px", marginBottom: "15px", color: "#333", fontSize: "1.1rem" }}>Basic Preferences</h3>
              {Object.entries(answers).map(([key, value]) => (
                <div key={key} style={{ marginBottom: "8px", display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f0f0f0", paddingBottom: "4px" }}>
                  <strong style={{ textTransform: "capitalize", color: "#333", fontSize: "14px" }}>{key.replace(/([A-Z])/g, " $1").trim()}:</strong>
                  <span style={{ fontWeight: "normal", color: "#555", textAlign: "right", maxWidth: "60%", fontSize: "14px" }}>
                    {key === "budget" && typeof value === 'object' ? `LKR ${value?.min || 0} - LKR ${value?.max || "∞"}` :
                      Array.isArray(value) ? (value.length > 0 ? value.join(", ") : "None") : (value || "Not selected")}
                  </span>
                </div>
              ))}

              {Object.keys(ownedDetails).length > 0 && (
                <div style={{ marginTop: "15px", backgroundColor: "#f8f9fa", padding: "12px", borderRadius: "8px" }}>
                  <h4 style={{ marginTop: "0", marginBottom: "8px", color: "#444", fontSize: "1rem" }}>Owned Components Details:</h4>
                  {Object.entries(ownedDetails).map(([part, detail]) => (
                    <div key={part} style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", fontSize: "14px" }}>
                      <strong style={{ color: "#333" }}>{part}:</strong> <span style={{ color: "#555" }}>{detail}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {activeTab === "advanced" && (
              <div style={{ marginTop: "30px" }}>
                <h3 style={{ borderBottom: "2px solid #eee", paddingBottom: "8px", marginBottom: "15px", color: "#333", fontSize: "1.1rem" }}>Advanced Preferences</h3>
                {Object.entries(advAnswers).map(([key, value]) => (
                  <div key={key} style={{ marginBottom: "8px", display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f0f0f0", paddingBottom: "4px" }}>
                    <strong style={{ textTransform: "capitalize", color: "#333", fontSize: "14px" }}>{key.replace(/([A-Z])/g, " $1").trim()}:</strong>
                    <span style={{ fontWeight: "normal", color: "#555", textAlign: "right", maxWidth: "60%", fontSize: "14px" }}>
                      {Array.isArray(value) ? (value.length > 0 ? value.join(", ") : "None") : (value || "Not selected")}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: "30px", textAlign: "center" }}>
              <button
                style={{ ...buttonStyle, backgroundColor: "#4a7cff", color: "white", width: "auto", minWidth: "220px", marginTop: "0", fontSize: "14px", padding: "10px 20px" }}
                onClick={handleSubmitBuild}
              >
                Submit Build Request
              </button>
              <button
                style={{ ...buttonStyle, backgroundColor: "#f0f0f0", color: "#333", border: "1px solid #ccc", width: "auto", minWidth: "220px", marginTop: "10px", fontSize: "14px", padding: "10px 20px" }}
                onClick={() => {
                  setShowSummary(false);
                  handleTabChange("basic");
                }}
              >
                Edit Answers
              </button>
            </div>
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

        <div style={tabContainerStyle}>
          <div style={getTabStyle("basic")} onClick={() => handleTabChange("basic")}>
            Basic
          </div>
          <div style={getTabStyle("advanced")} onClick={() => handleTabChange("advanced")}>
            Advanced
          </div>
        </div>

        <div>
          {activeTab === "basic" ? (
            <div>
              <Question
                title="1. What will you primarily use this PC for?"
                options={["Gaming", "Video Editing", "Graphic Design", "3D Rendering", "Programming", "AI / Machine Learning", "Streaming", "Office / General Use", "Heavy Multitasking", "Mixed Use"]}
                selected={answers.purpose}
                onSelect={(val) => updateAnswer("purpose", val)}
                multi={true}
                layout="grid"
              />
              <Question title="2. What resolution will you be using?" options={["1080p", "1440p", "4K", "Not sure"]} selected={answers.resolution} onSelect={(val) => updateAnswer("resolution", val)} layout="row" />
              <Question title="3. What performance level are you aiming for?" options={["Entry Level", "Mid-Range", "High-End", "Enthusiast"]} selected={answers.performance} onSelect={(val) => updateAnswer("performance", val)} />
              <Question
                title="4. What is your estimated budget range?"
                type="range"
                selected={answers.budget}
                onSelect={(val) => updateAnswer("budget", val)}
                min={100000}
              />
              <Question title="5. Do you already own any components?" options={["CPU", "GPU", "RAM", "Storage", "PSU", "Case", "None"]} selected={answers.ownedParts} onSelect={(val) => handleOwnedPartsSelect(val)} multi={true} renderOptionExtra={(option) => option !== "None" && renderComponentSearch(option)} />

              {/* Questions moved from Advanced to Basic */}
              <Question title="6. Preferred CPU brand?" subtitle={isPartOwned("CPU") ? "You indicated you own a CPU." : null} options={["Intel", "AMD", "No preference", isPartOwned("CPU") ? "I already own a CPU" : null].filter(Boolean)} selected={answers.cpuBrand} onSelect={(val) => updateAnswer("cpuBrand", val)} layout="row" />
              <Question title="7. Preferred GPU brand?" subtitle={isPartOwned("GPU") ? "You indicated you own a GPU." : null} options={["NVIDIA", "AMD", "No preference", isPartOwned("GPU") ? "I already own a GPU" : null].filter(Boolean)} selected={answers.gpuBrand} onSelect={(val) => updateAnswer("gpuBrand", val)} layout="row" />
              <Question title="8. Do you want extra room for future expansion?" options={["More RAM slots", "Extra storage slots", "Space for future GPU upgrades", "No preference"]} selected={answers.expansion} onSelect={(val) => updateAnswer("expansion", val)} multi={true} exclusiveOption="No preference" />

              <Question title="9. Do you need the build to fit an existing case or monitor?" options={["Yes", "No", "Not sure"]} selected={answers.existingFit} onSelect={(val) => updateAnswer("existingFit", val)} layout="row" />
              <Question title="10. How important is future upgradeability?" options={["Not important", "Somewhat important", "Very important"]} selected={answers.upgrade} onSelect={(val) => updateAnswer("upgrade", val)} />
              <Question title="11. What case size do you prefer?" subtitle={isPartOwned("Case") ? "You indicated you own a Case." : null} options={["Mini ITX", "Micro ATX", "ATX", "No preference", isPartOwned("Case") ? "I already own a Case" : null].filter(Boolean)} selected={answers.caseSize} onSelect={(val) => updateAnswer("caseSize", val)} />
              <Question title="12. Do aesthetics matter to you?" options={["Performance only", "Minimal build", "RGB build", "White themed build", "No preference"]} selected={answers.aesthetics} onSelect={(val) => updateAnswer("aesthetics", val)} />
              <Question title="13. Do you plan to overclock?" options={["Yes", "No", "Not sure"]} selected={answers.overclock} onSelect={(val) => updateAnswer("overclock", val)} layout="row" />
              <Question title="14. Do you need WiFi & Bluetooth built-in?" options={["Yes", "No", "Doesn’t matter"]} selected={answers.wifi} onSelect={(val) => updateAnswer("wifi", val)} layout="row" />

              <div style={toggleContainerStyle}>
                <p style={{ marginBottom: "10px", fontWeight: "600" }}>Want more control? Switch to Advanced Mode!</p>
                <button
                  onClick={() => handleTabChange("advanced")}
                  onMouseEnter={(e) => { e.target.style.backgroundColor = "#4a7cff"; e.target.style.color = "white"; }}
                  onMouseLeave={(e) => { e.target.style.backgroundColor = "white"; e.target.style.color = "#4a7cff"; }}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "6px",
                    border: "1px solid #4a7cff",
                    background: "white",
                    color: "#4a7cff",
                    cursor: "pointer",
                    fontWeight: "600",
                    transition: "all 0.2s ease"
                  }}
                >
                  Go to Advanced Settings
                </button>
              </div>

              <button style={buttonStyle} onClick={() => {
                setShowSummary(true);
                window.scrollTo(0, 0);
              }}>
                View Summary
              </button>
              <div style={{ marginTop: "15px", textAlign: "center" }}>
                <span
                  onClick={handleClearAll}
                  style={{ color: "#d32f2f", cursor: "pointer", fontSize: "14px", textDecoration: "underline" }}
                >
                  Clear all selections
                </span>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: "30px", padding: "15px", backgroundColor: "#fff3cd", borderRadius: "8px", border: "1px solid #ffeeba", color: "#856404" }}>
                <strong>Note:</strong> Please ensure you have answered the <span
                  onClick={() => handleTabChange("basic")}
                  style={{ textDecoration: "underline", cursor: "pointer", fontWeight: "bold" }}
                >Basic</span> questions before finalizing your build here.
              </div>

              {/* Advanced Q1 merged into Basic Q1. RENUMBERING START */}
              <Question title="1. What refresh rate is your monitor?" options={["60Hz", "75Hz", "120Hz", "144Hz", "165Hz+", "Not sure"]} selected={advAnswers.refreshRate} onSelect={(val) => updateAdvAnswer("refreshRate", val)} layout="row" />
              <Question title="2. What do you want to prioritize most in this build?" options={["Maximum gaming FPS", "Faster rendering/editing performance", "Smooth multitasking", "Balanced overall performance"]} selected={advAnswers.priority} onSelect={(val) => updateAdvAnswer("priority", val)} />
              <Question title="3. How should the budget be optimized?" options={["Lowest cost possible", "Best performance for money", "Long-term value (future-proof parts)"]} selected={advAnswers.budgetOpt} onSelect={(val) => updateAdvAnswer("budgetOpt", val)} />

              {/* Q5 CPU, Q6 GPU moved to basic */}

              <Question title="4. How important is GPU performance vs CPU performance for your workload?" options={["GPU is more important", "CPU is more important", "Both equally important", "Not sure"]} selected={advAnswers.workloadFocus} onSelect={(val) => updateAdvAnswer("workloadFocus", val)} />
              <Question title="5. What storage setup do you prefer?" subtitle={isPartOwned("Storage") ? "You indicated you own Storage." : null} options={["NVMe SSD only (fastest)", "SSD + HDD combo", "Large HDD storage", "Not sure", isPartOwned("Storage") ? "I already own Storage" : null].filter(Boolean)} selected={advAnswers.storageSetup} onSelect={(val) => updateAdvAnswer("storageSetup", val)} />
              <Question title="6. How much total storage do you think you’ll need?" subtitle={isPartOwned("Storage") ? "You indicated you own Storage." : null} options={["500GB", "1TB", "2TB", "4TB+", "Not sure", isPartOwned("Storage") ? "I already own Storage" : null].filter(Boolean)} selected={advAnswers.storageSize} onSelect={(val) => updateAdvAnswer("storageSize", val)} layout="row" />
              <Question title="7. Do you prefer a specific case airflow/style?" subtitle={isPartOwned("Case") ? "You indicated you own a Case." : null} options={["High Airflow (Mesh)", "Silence Focused", "Dual Chamber (Showcase)", "Open Air / Test Bench", "No preference", isPartOwned("Case") ? "I already own a Case" : null].filter(Boolean)} selected={advAnswers.caseStyle} onSelect={(val) => updateAdvAnswer("caseStyle", val)} />

              {/* Q11 Expansion moved to basic */}

              <Question title="8. How important is cooling performance?" options={["Very important", "Moderately important", "Standard is fine"]} selected={advAnswers.coolingImp} onSelect={(val) => updateAdvAnswer("coolingImp", val)} />
              <Question title="9. Preferred cooling type?" options={["Air cooling", "Liquid cooling (AIO)", "Custom water cooling", "No preference / Not sure"]} selected={advAnswers.coolingType} onSelect={(val) => updateAdvAnswer("coolingType", val)} />
              <Question title="10. Preferred noise level?" options={["Silent build", "Balanced", "Performance over noise"]} selected={advAnswers.noise} onSelect={(val) => updateAdvAnswer("noise", val)} layout="row" />
              <Question title="11. Is power efficiency a priority?" options={["Yes (lower electricity/heat)", "Somewhat", "Not important"]} selected={advAnswers.powerEff} onSelect={(val) => updateAdvAnswer("powerEff", val)} layout="row" />
              <Question title="12. Do you need specific connectivity options?" options={["USB-C ports", "Multiple monitor support", "High-speed Ethernet (2.5G/10G)", "Lots of USB ports", "No special requirements"]} selected={advAnswers.connectivity} onSelect={(val) => updateAdvAnswer("connectivity", val)} multi={true} exclusiveOption="No special requirements" />
              <Question title="13. How important is Ray Tracing and Upscaling technology?" options={["Must have Ray Tracing", "DLSS/FSR is essential", "Native Rasterization", "Don't care"]} selected={advAnswers.rayTracing} onSelect={(val) => updateAdvAnswer("rayTracing", val)} />
              <Question title="14. Do you have a preferred RGB ecosystem?" options={["Motherboard Sync", "Corsair iCUE", "NZXT CAM", "Razer Chroma", "Lian Li L-Connect", "No preference"]} selected={advAnswers.rgbSoftware} onSelect={(val) => updateAdvAnswer("rgbSoftware", val)} />

              <button style={buttonStyle} onClick={() => {
                setShowSummary(true);
                window.scrollTo(0, 0);
              }}>
                View Full Summary
              </button>
              <div style={{ marginTop: "15px", textAlign: "center" }}>
                <span
                  onClick={handleClearAll}
                  style={{ color: "#d32f2f", cursor: "pointer", fontSize: "14px", textDecoration: "underline" }}
                >
                  Clear all selections
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}