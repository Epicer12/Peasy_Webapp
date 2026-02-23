import React from 'react';
import { useParams, Link } from 'react-router-dom';
import SecureModelViewer from '../components/SecureModelViewer';

export default function ModelViewerPage() {
  const { modelId } = useParams();

  if (!modelId) {
    return (
      <div style={{ padding: '20px', color: 'white' }}>
        <p>No model specified.</p>
        <Link to="/home" className="text-[#00f3ff] hover:underline">Back to Home</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', color: 'white' }}>
      <h1>3D Model Viewer</h1>
      <p>Model ID: {modelId}</p>
      <p>
        <Link to="/home" className="text-[#00f3ff] hover:underline">Back to Home</Link>
      </p>
      <div style={{ height: '400px', border: '1px solid #333', marginTop: '20px', borderRadius: '10px', overflow: 'hidden' }}>
        <SecureModelViewer modelId={modelId} />
      </div>
    </div>
  );
}
