import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

function Camera() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const navigate = useNavigate();

  const [cameraOn, setCameraOn] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [stream, setStream] = useState(null); // 🔑 store stream

  // Start camera (permission only on click)
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = mediaStream;
      setStream(mediaStream);
      setCameraOn(true);
    } catch (err) {
      alert("Camera access denied or unavailable");
    }
  };

  // Stop camera and turn off light
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraOn(false);
  };

  // Capture image from camera
  const captureImage = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    const imageData = canvas.toDataURL("image/png");
    setCapturedImage(imageData);
    setSelectedFile(null);
  };

  // Handle gallery upload
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    stopCamera(); // 🔑 ensure camera is off
    setSelectedFile(file);
    setCapturedImage(URL.createObjectURL(file));
  };

  // Scan / View Results (frontend-only mock)
  const scanImage = () => {
    if (!capturedImage) {
      alert("Capture or upload an image first");
      return;
    }

    stopCamera(); // 🔑 turn off camera on scan

    const mockResult = {
      detected: ["GPU"],
      confidence: 0.85,
      image: capturedImage,
      model_id: "test",
      note: "Frontend mock detection result",
    };

    navigate("/result", { state: mockResult });
  };

  // Scan again → reset and allow camera restart
  const resetScan = () => {
    setCapturedImage(null);
    setSelectedFile(null);
  };

  return (
    <div>
      <h2>Scan Component</h2>

      {!cameraOn && !capturedImage && (
        <button onClick={startCamera}>Open Camera</button>
      )}

      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{
          width: "300px",
          display: cameraOn && !capturedImage ? "block" : "none",
          marginTop: "10px",
          border: "2px solid black",
        }}
      />

      {cameraOn && !capturedImage && (
        <button onClick={captureImage} style={{ marginTop: "10px" }}>
          Capture Image
        </button>
      )}

      {/* Gallery upload */}
      <div style={{ marginTop: "15px" }}>
        <label>
          Upload from gallery:
          <input type="file" accept="image/*" onChange={handleFileChange} />
        </label>
      </div>

      {/* Hidden canvas */}
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* Preview + actions */}
      {capturedImage && (
        <div style={{ marginTop: "10px" }}>
          <h3>Preview</h3>

          <img
            src={capturedImage}
            alt="Preview"
            style={{ width: "300px", border: "2px solid green" }}
          />

          <div style={{ marginTop: "10px" }}>
            <button onClick={scanImage}>
              Scan
            </button>

            <button onClick={resetScan} style={{ marginLeft: "10px" }}>
              Scan Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Camera;
