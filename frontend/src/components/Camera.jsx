import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const TARGET_COMPONENTS = [
  "CPU", "CPU_COOLER", "CASE_FAN", "GPU", "HDD", "SSD",
  "PC_CASE", "RAM", "PSU", "MOTHERBOARD"
];

const MULTI_INSTANCE_ALLOWED = ["GPU", "RAM", "SSD", "HDD", "CASE_FAN"];

function Camera() {
  const videoRef = useRef(null);
  const captureCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const ws = useRef(null);
  const navigate = useNavigate();

  const [cameraOn, setCameraOn] = useState(false);
  const [lockedItems, setLockedItems] = useState(new Set());
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [allFound, setAllFound] = useState(false);
  const [detailedResults, setDetailedResults] = useState({});
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isAnalysing, setIsAnalysing] = useState(false);

  // Multi-mode state
  const [mode, setMode] = useState("standard"); // "standard" | "advanced"
  const [quantities, setQuantities] = useState({
    GPU: 1, RAM: 1, SSD: 1, HDD: 1, CASE_FAN: 1
  });
  const [instanceCounts, setInstanceCounts] = useState({}); // Advanced mode: {GPU: 2, RAM: 3, ...}

  // Start/Stop Camera & WebSocket
  useEffect(() => {
    if (cameraOn) {
      startCamera();

      // Connect WebSocket - Use generic host handling
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = "localhost:8000"; // Hardcoded for local dev as per verify instructions
      const wsUrl = `${protocol}//${host}/api/ws/identify?mode=${mode}`;

      console.log("Connecting to WS:", wsUrl);
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log("WS Connected");
        setConnectionStatus("connected");
        // Kick off the loop
        sendFrame();
      };
      socket.onclose = () => {
        console.log("WS Disconnected");
        setConnectionStatus("disconnected");
      };
      socket.onerror = (err) => {
        console.error("WS Error:", err);
        setConnectionStatus("error");
      };

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleDetectionResult(data);
      };

      ws.current = socket;

    } else {
      stopCamera();
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
      setConnectionStatus("disconnected");

      // Clear overlay
      if (overlayCanvasRef.current) {
        const ctx = overlayCanvasRef.current.getContext("2d");
        ctx.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
      }
    }

    return () => {
      stopCamera();
      if (ws.current) ws.current.close();
    };
  }, [cameraOn]);

  const isProcessing = useRef(false); // Flow control flag

  // Start Camera - Reverted to 640x480 for performance/latency balance
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          if (overlayCanvasRef.current && videoRef.current) {
            overlayCanvasRef.current.width = videoRef.current.videoWidth;
            overlayCanvasRef.current.height = videoRef.current.videoHeight;
          }
        };
      }
    } catch (err) {
      console.error("Camera error:", err);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (e) {
        alert("Camera access denied");
        setCameraOn(false);
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  // Get detailed identification using Parallel Requests
  const getComponentDetails = async () => {
    setLoadingDetails(true);
    setIsAnalysing(true);
    setCameraOn(false); // Turn off camera immediately
    const results = {};

    try {
      if (mode === "standard") {
        // Parallelized Standard Mode
        const pool = Array.from(lockedItems).map(async (component) => {
          const quantity = MULTI_INSTANCE_ALLOWED.includes(component) ? quantities[component] : 1;
          const response = await fetch(
            `http://localhost:8000/api/identify-details?component_type=${component}&quantity=${quantity}`,
            { method: 'POST' }
          );
          const data = await response.json();
          results[component] = { ...data, quantity };
        });
        await Promise.all(pool);
      } else {
        // Parallelized Advanced Mode
        const pool = [];
        for (const component of Array.from(lockedItems)) {
          const count = instanceCounts[component] || 1;
          results[component] = [];

          for (let i = 0; i < count; i++) {
            pool.push((async () => {
              const response = await fetch(
                `http://localhost:8000/api/identify-details?component_type=${component}&instance=${i}`,
                { method: 'POST' }
              );
              const data = await response.json();
              results[component][i] = data; // Assign to correct index
            })());
          }
        }
        await Promise.all(pool);
      }

      setDetailedResults(results);
    } catch (error) {
      console.error('Error getting details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const unlockComponent = async (component, instance = null) => {
    try {
      const url = `http://localhost:8000/api/unlock-component?component_type=${component}${instance !== null ? `&instance=${instance}` : ''}`;
      const response = await fetch(url, { method: 'POST' });
      const data = await response.json();

      if (data.status === "unlocked") {
        // Update local state immediately
        const newList = new Set(lockedItems);
        newList.delete(component);
        setLockedItems(newList);

        // Remove from detailed results if they exist
        const updatedResults = { ...detailedResults };
        delete updatedResults[component];
        setDetailedResults(updatedResults);

        if (mode === "advanced") {
          setInstanceCounts(prev => ({ ...prev, [component]: Math.max(0, (prev[component] || 1) - 1) }));
        }
      }
    } catch (error) {
      console.error("Error unlocking:", error);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoadingDetails(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:8000/api/identify-upload', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();

      if (data.status === "locked_manually") {
        const newList = new Set(lockedItems);
        newList.add(data.yolo_class);
        setLockedItems(newList);
        setCameraOn(false);
        // Force refresh instance counts if needed
        if (mode === "advanced") {
          setInstanceCounts(prev => ({ ...prev, [data.yolo_class]: (prev[data.yolo_class] || 0) + 1 }));
        }
      } else if (data.error) {
        alert(data.error);
      }
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Add instance for Advanced mode
  const addInstance = async (component) => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/add-instance?component_type=${component}`,
        { method: 'POST' }
      );
      const data = await response.json();

      if (data.status === "ready_to_scan") {
        // Increment instance count
        setInstanceCounts(prev => ({
          ...prev,
          [component]: (prev[component] || 1) + 1
        }));
      }
    } catch (error) {
      console.error('Error adding instance:', error);
    }
  };

  const sendFrame = () => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) return;
    if (!videoRef.current || !captureCanvasRef.current) {
      // Retry shortly if video not ready (e.g. initial load)
      requestAnimationFrame(sendFrame);
      return;
    }
    if (allFound) return;

    const video = videoRef.current;

    // Safety check: video must have dimensions
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      requestAnimationFrame(sendFrame);
      return;
    }

    const canvas = captureCanvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (blob && ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(blob);
      } else {
        // If send failed, maybe retry or just stop? 
        // In ping-pong, if we fail to send, the loop dies. 
        // So better to retry or log.
        console.warn("Frame send skipped/failed");
      }
    }, "image/jpeg", 0.7);
  };

  const handleDetectionResult = (data) => {
    // data: { objects: [...], locked_count: n, locked_items: [...] }

    // Update Locked Items State
    if (data.locked_items) {
      const newLocked = new Set(data.locked_items);
      setLockedItems(newLocked);

      // Check if all targets found
      const foundCount = TARGET_COMPONENTS.filter(t => newLocked.has(t)).length;
      if (foundCount >= TARGET_COMPONENTS.length) {
        setAllFound(true);
        return; // Stop loop
      }
    }

    // Draw Overlay
    drawOverlay(data.objects || []);

    // PING-PONG: Trigger next frame
    // Use requestAnimationFrame to yield to UI thread if needed, or just call directly.
    // requestAnimationFrame ensures smoother UI interaction.
    requestAnimationFrame(() => sendFrame());
  };

  const drawOverlay = (objects) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    objects.forEach(obj => {
      const [x1, y1, x2, y2] = obj.box;
      const isLocked = obj.status === "LOCKED";
      const color = isLocked ? "#00ff00" : "#ffaa00";

      // Draw Box
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

      // Draw Label Background
      const labelText = `${obj.class} ${(obj.prob * 100).toFixed(0)}%`;
      ctx.font = "bold 16px Arial";
      const textWidth = ctx.measureText(labelText).width;

      ctx.fillStyle = color;
      ctx.fillRect(x1, y1 - 25, textWidth + 10, 25);

      // Draw Label Text
      ctx.fillStyle = "#000000";
      ctx.fillText(labelText, x1 + 5, y1 - 7);

      // Draw Confidence Bar (Visual Indicator)
      const barWidth = (x2 - x1) * obj.prob;
      ctx.fillStyle = color;
      ctx.fillRect(x1, y2 + 5, barWidth, 6);

      // Draw Bar Background (Gray)
      ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      ctx.fillRect(x1 + barWidth, y2 + 5, (x2 - x1) - barWidth, 6);
    });
  };

  return (
    <div style={{
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      fontFamily: "'Segoe UI', Roboto, sans-serif",
      backgroundColor: "#f0f2f5",
      overflow: "hidden"
    }}>
      {/* Header */}
      <header style={{
        padding: "15px 30px",
        backgroundColor: "white",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        zIndex: 10
      }}>
        <h2 style={{ margin: 0, color: "#1a73e8" }}>Peasy Identification Dashboard</h2>

        <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
          <label style={{ cursor: "pointer", backgroundColor: "#fff", border: "1px solid #ddd", padding: "6px 12px", borderRadius: "20px", fontSize: "14px" }}>
            📁 Upload
            <input type="file" hidden onChange={handleUpload} accept="image/*" />
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", cursor: "pointer", fontWeight: "600" }}>
            <span>Standard</span>
            <input
              type="checkbox"
              checked={mode === "advanced"}
              onChange={(e) => setMode(e.target.checked ? "advanced" : "standard")}
              style={{ width: "16px", height: "16px" }}
            />
            <span>Advanced</span>
          </label>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* Left Side: Scanning/Track List */}
        <div style={{ flex: "1", display: "flex", flexDirection: "column", borderRight: "1px solid #ddd", overflow: "hidden" }}>
          <div style={{ padding: "20px", flex: 1, overflowY: "auto" }}>

            {cameraOn ? (
              <div style={{ position: "relative", marginBottom: "20px", borderRadius: "12px", overflow: "hidden", backgroundColor: "#000", aspectRatio: "4/3" }}>
                <video ref={videoRef} autoPlay muted playsInline style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                <canvas ref={overlayCanvasRef} style={{ position: "absolute", top: "0", left: "0", pointerEvents: "none", width: "100%", height: "100%" }} />

                {allFound && cameraOn && (
                  <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", backgroundColor: "rgba(0, 255, 0, 0.9)", padding: "20px", borderRadius: "12px", textAlign: "center", zIndex: 20 }}>
                    <h1 style={{ margin: 0, color: "white", fontSize: "24px" }}>ALL FOUND! 🎉</h1>
                  </div>
                )}

                <button
                  onClick={() => setCameraOn(false)}
                  style={{ position: "absolute", bottom: "10px", right: "10px", padding: "8px 15px", backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" }}
                >
                  Close Scanner
                </button>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "40px 20px", border: "2px dashed #ccc", borderRadius: "12px", backgroundColor: "white", marginBottom: "20px" }}>
                <p style={{ color: "#666", marginBottom: "15px" }}>Scanner is inactive</p>
                <button
                  onClick={() => {
                    setCameraOn(true);
                    setAllFound(false);
                    setDetailedResults({});
                  }}
                  style={{ padding: "12px 30px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "8px", fontSize: "16px", fontWeight: "bold", cursor: "pointer" }}
                >
                  Launch Live Scanner
                </button>
              </div>
            )}

            <h3 style={{ marginBottom: "15px", display: "flex", justifyContent: "space-between" }}>
              Scanning Targets
              <span style={{ fontSize: "14px", fontWeight: "normal", color: "#666" }}>{lockedItems.size} / {TARGET_COMPONENTS.length}</span>
            </h3>

            <div style={{ display: "grid", gap: "10px" }}>
              {TARGET_COMPONENTS.map(target => {
                const isFound = lockedItems.has(target);
                return (
                  <div key={target} style={{
                    padding: "12px",
                    backgroundColor: "white",
                    borderRadius: "10px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    border: isFound ? "2px solid #28a745" : "1px solid #ddd"
                  }}>
                    <span style={{ fontSize: "20px" }}>{isFound ? "✅" : "⏳"}</span>

                    {isFound && (
                      <img
                        src={`http://localhost:8000/api/snapshot/${target}${mode === 'advanced' ? `?instance=${(instanceCounts[target] || 1) - 1}` : ''}`}
                        alt={target}
                        style={{
                          width: "50px",
                          height: "35px",
                          objectFit: "cover",
                          borderRadius: "4px",
                          border: "1px solid #28a745",
                          backgroundColor: "#eee"
                        }}
                        key={`${target}-${instanceCounts[target] || 0}`}
                      />
                    )}

                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: "600", color: isFound ? "#28a745" : "#333" }}>{target.replace("_", " ")}</div>
                      {isFound && <div style={{ fontSize: "12px", color: "#666" }}>Component Locked</div>}
                    </div>

                    {isFound && (
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <button
                          onClick={() => unlockComponent(target)}
                          style={{ padding: "4px 10px", fontSize: "12px", backgroundColor: "#f8f9fa", border: "1px solid #ddd", borderRadius: "4px", cursor: "pointer" }}
                        >
                          Edit
                        </button>
                        {mode === "standard" && MULTI_INSTANCE_ALLOWED.includes(target) && (
                          <select
                            value={quantities[target]}
                            onChange={(e) => setQuantities({ ...quantities, [target]: parseInt(e.target.value) })}
                            style={{ padding: "4px", fontSize: "12px", borderRadius: "4px" }}
                          >
                            {[1, 2, 3, 4].map(n => <option key={n} value={n}>Qty: {n}</option>)}
                          </select>
                        )}
                        {mode === "advanced" && MULTI_INSTANCE_ALLOWED.includes(target) && (
                          <button onClick={() => addInstance(target)} style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "#1a73e8", color: "white", border: "none", cursor: "pointer" }}>+</button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {lockedItems.size > 0 && (
            <div style={{ padding: "20px", backgroundColor: "white", borderTop: "1px solid #ddd" }}>
              <button
                onClick={getComponentDetails}
                disabled={loadingDetails}
                style={{
                  width: "100%",
                  padding: "15px",
                  backgroundColor: "#1a73e8",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "18px",
                  fontWeight: "bold",
                  opacity: loadingDetails ? 0.7 : 1
                }}
              >
                {loadingDetails ? "Analyzing Components..." : "Analyse & Finalize"}
              </button>
            </div>
          )}
        </div>

        {/* Right Side: Results Panel */}
        <div style={{ flex: "1.2", backgroundColor: "white", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "20px", flex: 1, overflowY: "auto" }}>
            {!loadingDetails && Object.keys(detailedResults).length === 0 && (
              <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#666" }}>
                <div style={{ fontSize: "40px", marginBottom: "20px" }}>📊</div>
                <p>System analysis will appear here</p>
              </div>
            )}

            {loadingDetails && (
              <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <div className="spinner" style={{ width: "40px", height: "40px", border: "4px solid #f3f3f3", borderTop: "4px solid #1a73e8", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
                <p style={{ marginTop: "15px", color: "#1a73e8", fontWeight: "600" }}>Running AI Identification...</p>
              </div>
            )}

            {/* Results Header */}
            {Object.keys(detailedResults).length > 0 && (
              <h3 style={{ borderBottom: "1px solid #eee", paddingBottom: "10px", marginBottom: "20px" }}>Analysis Results</h3>
            )}

            {/* Scanning Results */}
            {Object.entries(detailedResults).map(([component, details]) => {
              const instances = Array.isArray(details) ? details : [details];
              return (
                <div key={component} style={{ marginBottom: "30px", backgroundColor: "#fff", border: "1px solid #ddd", borderRadius: "12px", overflow: "hidden" }}>
                  <div style={{ padding: "10px 15px", backgroundColor: "#f8f9fa", borderBottom: "1px solid #ddd", display: "flex", justifyContent: "space-between" }}>
                    <h4 style={{ margin: 0 }}>{component.replace("_", " ")}</h4>
                  </div>

                  <div style={{ padding: "15px" }}>
                    {instances.map((inst, i) => (
                      <div key={i} style={{ display: "flex", gap: "20px", marginBottom: i < instances.length - 1 ? "20px" : 0, borderBottom: i < instances.length - 1 ? "1px dashed #ddd" : "none", paddingBottom: i < instances.length - 1 ? "20px" : 0 }}>
                        <div style={{ width: "120px" }}>
                          <img
                            src={`http://localhost:8000/api/snapshot/${component}${Array.isArray(details) ? `?instance=${i}` : ''}`}
                            style={{ width: "100%", borderRadius: "6px", objectFit: "cover", backgroundColor: "#eee" }}
                            alt="Reference"
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "16px", fontWeight: "bold", color: "#1a73e8" }}>{inst.model || "Unknown Model"}</div>
                          <div style={{ fontSize: "14px", color: "#333", margin: "4px 0" }}>{inst.brand} {inst.sub_brand}</div>

                          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "8px" }}>
                            <div style={{ fontSize: "12px", padding: "2px 8px", backgroundColor: "#eef", borderRadius: "4px" }}>
                              Confidence: {(inst.confidence * 100).toFixed(0)}%
                            </div>
                            {inst.is_ocr_confirmed && <div style={{ fontSize: "11px", color: "#28a745" }}>Verified by Text Scan</div>}
                          </div>

                          {inst.notes && <p style={{ fontSize: "12px", color: "#666", marginTop: "10px", fontStyle: "italic" }}>"{inst.notes}"</p>}

                          {inst.possible_models?.length > 0 && (
                            <div style={{ marginTop: "10px" }}>
                              <div style={{ fontSize: "11px", color: "#999", textTransform: "uppercase" }}>Other Possibilities:</div>
                              <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", marginTop: "4px" }}>
                                {inst.possible_models.map(m => (
                                  <span key={m} style={{ fontSize: "10px", padding: "2px 6px", backgroundColor: "#f0f0f0", borderRadius: "3px" }}>{m}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Hidden Capture Canvas */}
      <canvas ref={captureCanvasRef} style={{ display: "none" }} />
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

export default Camera;
