import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const TARGET_COMPONENTS = [
  "CPU", "CPU_COOLER", "CASE_FAN", "GPU", "HDD", "SSD",
  "PC_CASE", "RAM", "PSU", "MOTHERBOARD"
];

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

  // Start/Stop Camera & WebSocket
  useEffect(() => {
    if (cameraOn) {
      startCamera();

      // Connect WebSocket - Use generic host handling
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = "localhost:8000"; // Hardcoded for local dev as per verify instructions
      const wsUrl = `${protocol}//${host}/api/ws/identify`;

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
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "20px", fontFamily: "sans-serif" }}>
      <h2 style={{ textAlign: "center", marginBottom: "20px" }}>Component Identification</h2>

      <div style={{ display: "flex", gap: "20px", flexDirection: "row", flexWrap: "wrap", justifyContent: "center" }}>

        {/* Camera View */}
        <div style={{ position: "relative", width: "640px", height: "480px", backgroundColor: "black", borderRadius: "12px", overflow: "hidden" }}>
          {!cameraOn && (
            <div style={{ position: "absolute", top: "0", left: "0", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "white", zIndex: 10 }}>
              <button
                onClick={() => setCameraOn(true)}
                style={{ padding: "15px 40px", fontSize: "18px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" }}
              >
                Start Camera
              </button>
            </div>
          )}

          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />

          <canvas
            ref={overlayCanvasRef}
            style={{ position: "absolute", top: "0", left: "0", pointerEvents: "none", width: "100%", height: "100%" }}
          />

          {allFound && (
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", backgroundColor: "rgba(0, 255, 0, 0.8)", padding: "20px", borderRadius: "10px", textAlign: "center" }}>
              <h1 style={{ margin: 0, color: "white", fontSize: "32px" }}>ALL COMPONENTS FOUND! 🎉</h1>
            </div>
          )}
        </div>

        {/* Info / Controls Panel */}
        <div style={{ flex: "1", minWidth: "300px", maxWidth: "400px", backgroundColor: "#f8f9fa", padding: "20px", borderRadius: "12px", border: "1px solid #ddd" }}>

          <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{
              padding: "5px 10px", borderRadius: "4px", fontSize: "12px", fontWeight: "bold",
              backgroundColor: connectionStatus === "connected" ? "#d4edda" : "#f8d7da",
              color: connectionStatus === "connected" ? "#155724" : "#721c24"
            }}>
              Status: {connectionStatus}
            </span>

            {cameraOn && (
              <button
                onClick={() => setCameraOn(false)}
                style={{ padding: "8px 16px", backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}
              >
                Camera Off
              </button>
            )}
          </div>

          <h3 style={{ borderBottom: "2px solid #ddd", paddingBottom: "10px" }}>Target Components</h3>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {TARGET_COMPONENTS.map(target => {
              const isFound = lockedItems.has(target); // Note: Simple string match. Ensure Backend sends exact same strings.
              return (
                <li key={target} style={{
                  padding: "10px",
                  marginBottom: "8px",
                  backgroundColor: isFound ? "#e6fffa" : "white",
                  border: `1px solid ${isFound ? "#319795" : "#ddd"}`,
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  fontWeight: isFound ? "bold" : "normal",
                  color: isFound ? "#2c7a7b" : "#666"
                }}>
                  <span style={{ marginRight: "10px", fontSize: "18px" }}>
                    {isFound ? "✅" : "⬜"}
                  </span>
                  {target}
                </li>
              );
            })}
          </ul>

          <div style={{ marginTop: "20px", fontSize: "14px", color: "#666" }}>
            <p><strong>Instructions:</strong> Point camera at PC components. Hold steady to lock identification.</p>
            <p>Progress: {lockedItems.size} / {TARGET_COMPONENTS.length}</p>
          </div>
        </div>
      </div>

      {/* Hidden Capture Canvas */}
      <canvas ref={captureCanvasRef} style={{ display: "none" }} />
    </div>
  );
}

export default Camera;
