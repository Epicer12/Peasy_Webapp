import React from "react";
import Camera from "./Camera";

function CameraPage() {
  return (
    <div style={{ padding: "20px" }}>
      <h1>Scan Component</h1>
      <p>Use your camera to scan a component.</p>
      <Camera />
    </div>
  );
}

export default CameraPage;
