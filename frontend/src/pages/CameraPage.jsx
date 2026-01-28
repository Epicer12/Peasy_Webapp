import React from "react";
import Camera from "../components/Camera";
import Navbar from "../components/layout/Navbar";

export default function CameraPage() {
  return (
    <div>
      <Navbar />
      <div style={{ padding: "20px" }}>
        <h1>Scan Component</h1>
        <p>Use your camera to scan a component.</p>
        <Camera />
      </div>
    </div>
  );
}
