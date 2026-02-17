import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import SecureModelViewer from "../components/SecureModelViewer";


function ResultsPage() {
  const { state } = useLocation();
  const navigate = useNavigate();

  const [manualComponent, setManualComponent] = useState("");
  const [saved, setSaved] = useState(false);

  if (!state) {
    return (
      <div style={{ padding: "30px", textAlign: "center" }}>
        <h2>No Results Available</h2>
        <p>Please scan a component first.</p>
        <button onClick={() => navigate("/camera")}>
          Go to Camera
        </button>
      </div>
    );
  }

  const confidencePercent = Math.round(state.confidence * 100);

  const saveManualEntry = () => {
    if (!manualComponent.trim()) {
      alert("Please enter a component name");
      return;
    }

    console.log("MANUAL ENTRY:", manualComponent);
    setSaved(true);
  };

  return (
    <div style={{ padding: "30px", maxWidth: "650px", margin: "0 auto", color: "white" }}>
      <h1>Scan Results</h1>

      {/* Image preview */}
      {state.image && (
        <div style={{ marginTop: "15px" }}>
          <h3>Scanned Image</h3>
          <img
            src={state.image}
            alt="Scanned component"
            style={{
              width: "100%",
              maxWidth: "350px",
              border: "1px solid #ccc",
              borderRadius: "8px",
            }}
          />
        </div>
      )}

      {/* Detection result */}
      <div
        style={{
          marginTop: "20px",
          padding: "20px",
          border: "1px solid #ddd",
          borderRadius: "10px",
          background: "#f9f9f9",
        }}
      >
        <h2>Detected Component</h2>
        <p style={{ fontSize: "18px", fontWeight: "bold" }}>
          {state.detected.join(", ")}
        </p>

        <p>
          <strong>Confidence:</strong> {confidencePercent}%
        </p>

        <div
          style={{
            height: "10px",
            width: "100%",
            background: "#e0e0e0",
            borderRadius: "5px",
            marginTop: "6px",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${confidencePercent}%`,
              background: confidencePercent > 70 ? "#4caf50" : "#ff9800",
              borderRadius: "5px",
            }}
          />
        </div>
      </div>

      {/* 3D Model viewer */}
      {state.model_id && (
        <div style={{ marginTop: "25px" }}>
          <h2>3D Model</h2>
          <div style={{ height: "350px", border: "1px solid #ddd", borderRadius: "10px" }}>
            <SecureModelViewer modelId={state.model_id} />
          </div>
        </div>
      )}

      {/* Manual entry */}
      <div
        style={{
          marginTop: "25px",
          padding: "20px",
          border: "1px solid #ddd",
          borderRadius: "10px",
        }}
      >
        <h2>Manual Entry</h2>
        <p>
          If the detected component is non-existing in the database, you may enter it manually.
        </p>

        <input
          type="text"
          placeholder="Enter component name (e.g. Resistor, GPU)"
          value={manualComponent}
          onChange={(e) => setManualComponent(e.target.value)}
          style={{
            width: "100%",
            padding: "8px",
            marginTop: "8px",
          }}
        />

        <button
          onClick={saveManualEntry}
          style={{ marginTop: "10px" }}
        >
          Save Manual Entry
        </button>

        {saved && (
          <p style={{ color: "green", marginTop: "10px" }}>
            Manual entry saved ✔
          </p>
        )}
      </div>

      {/* Actions */}
      <div style={{ marginTop: "25px" }}>
        <button onClick={() => navigate("/camera")}>
          Scan Another Component
        </button>
      </div>
    </div>

  );
}

export default ResultsPage;
