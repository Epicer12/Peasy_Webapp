import React from 'react';
import { useParams, Link } from 'react-router-dom';
import SecureModelViewer from '../components/SecureModelViewer';
import Navbar from '../components/layout/Navbar';

export default function ModelViewerPage() {
  const { modelId } = useParams();

  if (!modelId) {
    return (
      <div>
        <Navbar />
        <div style={{ padding: '20px' }}>
          <p>No model specified.</p>
          <Link to="/home">Back to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <div style={{ padding: '20px' }}>
        <h1>3D Model Viewer</h1>
        <p>Model ID: {modelId}</p>
        <p>
          <Link to="/home">Back to Home</Link>
        </p>
        <div style={{ height: '400px', border: '1px solid #ddd', marginTop: '20px', borderRadius: '10px' }}>
          <SecureModelViewer modelId={modelId} />
        </div>
      </div>
    </div>
  );
}
