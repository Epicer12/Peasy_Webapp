import React, { useRef, useState, useEffect, useCallback } from "react";
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

  const sendFrame = useCallback(() => {
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
  }, [allFound]);

  const handleDetectionResult = useCallback((data) => {
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
  }, [sendFrame]);

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
      ctx.font = "bold 16px 'Space Mono', monospace";
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
            `/api/identify-details?component_type=${component}&quantity=${quantity}`,
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
                `/api/identify-details?component_type=${component}&instance=${i}`,
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
      const url = `/api/unlock-component?component_type=${component}${instance !== null ? `&instance=${instance}` : ''}`;
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
      const response = await fetch('/api/identify-upload', {
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
        `/api/add-instance?component_type=${component}`,
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
  }, [cameraOn, handleDetectionResult, mode, sendFrame]);

  return (
    <div className="flex flex-col h-full bg-[#050505] text-[#eeeeee] font-mono overflow-hidden">
      {/* Toolbar / Header */}
      <div className="p-4 bg-[#050505] border-b-2 border-[#333] flex justify-between items-center z-10">
        <h2 className="text-xl font-bold uppercase tracking-widest text-[#00f3ff]">Scanner // Control</h2>

        <div className="flex gap-4 items-center">
          <label className="cursor-pointer bg-[#1a1a1a] border border-[#333] hover:border-[#eeeeee] px-4 py-1 flex items-center gap-2 text-sm uppercase tracking-wide transition-colors">
            <span>Upload_IMG</span>
            <input type="file" hidden onChange={handleUpload} accept="image/*" />
          </label>

          <label className="flex items-center gap-2 text-sm font-bold uppercase cursor-pointer text-[#666]">
            <span>STND</span>
            <div className={`w-10 h-5 bg-[#333] relative transition-colors ${mode === "advanced" ? "bg-[#00f3ff]" : ""}`}>
              <input
                type="checkbox"
                checked={mode === "advanced"}
                onChange={(e) => setMode(e.target.checked ? "advanced" : "standard")}
                className="opacity-0 w-full h-full absolute inset-0 cursor-pointer"
              />
              <div className={`absolute top-0 bottom-0 w-5 bg-[#eeeeee] transition-transform ${mode === "advanced" ? "translate-x-full" : ""}`}></div>
            </div>
            <span className={mode === "advanced" ? "text-[#00f3ff]" : "text-[#666]"}>ADV</span>
          </label>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Side: Scanning/Track List */}
        <div className="flex-1 flex flex-col border-r-2 border-[#333] overflow-hidden">
          <div className="p-6 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[#333]">
            {cameraOn ? (
              <div className="relative mb-6 bg-black border-2 border-[#333] aspect-[4/3]">
                <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-contain" />
                <canvas ref={overlayCanvasRef} className="absolute top-0 left-0 w-full h-full pointer-events-none" />

                {allFound && cameraOn && (
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-[#00ff88] text-black px-6 py-4 text-center border-2 border-white z-20">
                    <h1 className="text-2xl font-black uppercase">ALL TARGETS ACQUIRED</h1>
                  </div>
                )}

                <button
                  onClick={() => setCameraOn(false)}
                  className="absolute bottom-4 right-4 px-4 py-2 bg-[#ff4400] text-black font-bold uppercase tracking-widest border-2 border-[#ff4400] hover:bg-black hover:text-[#ff4400] transition-colors"
                >
                  TERMINATE_FEED
                </button>
              </div>
            ) : (
              <div className="text-center py-12 border-2 border-dashed border-[#333] bg-[#111] mb-6">
                <p className="text-[#666] mb-4 uppercase tracking-widest">// FEED_OFFLINE</p>
                <button
                  onClick={() => {
                    setCameraOn(true);
                    setAllFound(false);
                    setDetailedResults({});
                  }}
                  className="px-8 py-3 bg-[#00f3ff] text-black font-bold uppercase tracking-widest border-2 border-[#00f3ff] hover:bg-black hover:text-[#00f3ff] transition-colors"
                >
                  INITIALIZE_LENS
                </button>
              </div>
            )}

            <h3 className="mb-4 flex justify-between text-[#eeeeee] uppercase tracking-widest border-b border-[#333] pb-2">
              TARGET_LIST
              <span className="text-[#666]">{lockedItems.size} / {TARGET_COMPONENTS.length}</span>
            </h3>

            <div className="grid gap-2">
              {TARGET_COMPONENTS.map(target => {
                const isFound = lockedItems.has(target);
                return (
                  <div key={target} className={`p-3 bg-[#050505] flex items-center gap-4 border-2 ${isFound ? "border-[#00f3ff]" : "border-[#333]"}`}>
                    <span className="text-xl">{isFound ? "▣" : "□"}</span>

                    {isFound && (
                      <img
                        src={`/api/snapshot/${target}${mode === 'advanced' ? `?instance=${(instanceCounts[target] || 1) - 1}` : ''}`}
                        alt={target}
                        className="w-12 h-8 object-cover border border-[#333] grayscale hover:grayscale-0 transition-all"
                        key={`${target}-${instanceCounts[target] || 0}`}
                      />
                    )}

                    <div className="flex-1">
                      <div className={`font-bold uppercase tracking-wide ${isFound ? "text-[#00f3ff]" : "text-[#666]"}`}>{target.replace("_", " ")}</div>
                    </div>

                    {isFound && (
                      <div className="flex gap-2 items-center">
                        <button
                          onClick={() => unlockComponent(target)}
                          className="px-2 py-1 text-xs border border-[#444] text-[#888] hover:text-[#eeeeee] hover:border-[#eeeeee] uppercase transition-colors"
                        >
                          RESET
                        </button>
                        {mode === "standard" && MULTI_INSTANCE_ALLOWED.includes(target) && (
                          <select
                            value={quantities[target]}
                            onChange={(e) => setQuantities({ ...quantities, [target]: parseInt(e.target.value) })}
                            className="bg-[#111] border border-[#333] text-[#eeeeee] text-xs px-1 py-1 uppercase rounded-none"
                          >
                            {[1, 2, 3, 4].map(n => <option key={n} value={n}>QTY: {n}</option>)}
                          </select>
                        )}
                        {mode === "advanced" && MULTI_INSTANCE_ALLOWED.includes(target) && (
                          <button onClick={() => addInstance(target)} className="w-6 h-6 bg-[#00f3ff] text-black font-bold flex items-center justify-center hover:bg-white transition-colors">+</button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {lockedItems.size > 0 && (
            <div className="p-6 bg-[#050505] border-t-2 border-[#333]">
              <button
                onClick={getComponentDetails}
                disabled={loadingDetails}
                className={`w-full py-4 bg-[#ccff00] text-black text-lg font-black uppercase tracking-widest border-2 border-[#ccff00] hover:bg-black hover:text-[#ccff00] transition-colors ${loadingDetails ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {loadingDetails ? "PROCESSING_DATA..." : "ANALYSE_SYSTEM"}
              </button>
            </div>
          )}
        </div>

        {/* Right Side: Results Panel */}
        <div className="flex-[1.2] bg-[#050505] flex flex-col overflow-hidden">
          <div className="p-6 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[#333]">
            {!loadingDetails && Object.keys(detailedResults).length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-[#333]">
                <div className="text-6xl mb-4 opacity-20">📊</div>
                <p className="uppercase tracking-widest text-sm">// WAITING_FOR_DATA</p>
              </div>
            )}

            {loadingDetails && (
              <div className="h-full flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-[#333] border-t-[#00f3ff] rounded-none animate-spin mb-4"></div>
                <p className="text-[#00f3ff] font-bold uppercase tracking-widest">RUNNING_NEURAL_NET...</p>
              </div>
            )}

            {Object.keys(detailedResults).length > 0 && (
              <h3 className="border-b-2 border-[#333] pb-2 mb-6 text-[#eeeeee] uppercase tracking-widest">DIAGNOSTIC_RESULTS</h3>
            )}

            {Object.entries(detailedResults).map(([component, details]) => {
              const instances = Array.isArray(details) ? details : [details];
              return (
                <div key={component} className="mb-6 bg-[#050505] border-2 border-[#333]">
                  <div className="p-2 bg-[#1a1a1a] border-b-2 border-[#333] flex justify-between">
                    <h4 className="font-bold text-[#eeeeee] uppercase tracking-wider">{component.replace("_", " ")}</h4>
                  </div>

                  <div className="p-4">
                    {instances.map((inst, i) => (
                      <div key={i} className={`flex gap-4 ${i < instances.length - 1 ? "mb-6 border-b border-dashed border-[#333] pb-6" : ""}`}>
                        <div className="w-24">
                          <img
                            src={`/api/snapshot/${component}${Array.isArray(details) ? `?instance=${i}` : ''}`}
                            className="w-full border border-[#333] bg-[#111]"
                            alt="Reference"
                          />
                        </div>
                        <div className="flex-1">
                          <div className="text-lg font-bold text-[#00f3ff] uppercase leading-none mb-1">{inst.model || "UNKNOWN_MODEL"}</div>
                          <div className="text-sm text-[#888] font-mono mb-2">{inst.brand} {inst.sub_brand}</div>

                          <div className="flex items-center gap-2 mb-2">
                            <div className="text-xs px-2 py-0.5 bg-[#111] border border-[#00f3ff] text-[#00f3ff]">
                              CONF: {(inst.confidence * 100).toFixed(0)}%
                            </div>
                            {inst.is_ocr_confirmed && <div className="text-xs text-[#00ff88] uppercase">[OCR_VERIFIED]</div>}
                          </div>

                          {inst.notes && <p className="text-xs text-[#666] italic border-l-2 border-[#333] pl-2">"{inst.notes}"</p>}

                          {inst.possible_models?.length > 0 && (
                            <div className="mt-2">
                              <div className="text-[10px] text-[#444] uppercase mb-1">ALTERNATIVES:</div>
                              <div className="flex gap-2 flex-wrap">
                                {inst.possible_models.map(m => (
                                  <span key={m} className="text-[10px] px-1 bg-[#111] text-[#666] border border-[#333]">{m}</span>
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

        {/* Hidden Capture Canvas */}
        <canvas ref={captureCanvasRef} className="hidden" />
      </main>
    </div>
  );
}


export default Camera;
