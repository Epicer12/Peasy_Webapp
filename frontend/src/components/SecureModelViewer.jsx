import { useState, useEffect } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { Stage, OrbitControls } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import axios from 'axios';
import { auth } from '../firebase';

const DRACO_DECODER = 'https://www.gstatic.com/draco/versioned/decoders/1.5.6/';

class GLTFLoaderWithDraco extends GLTFLoader {
  constructor() {
    super();
    const draco = new DRACOLoader();
    draco.setDecoderPath(DRACO_DECODER);
    this.setDRACOLoader(draco);
  }
}

function Model({ url }) {
  const gltf = useLoader(GLTFLoaderWithDraco, url);
  return <primitive object={gltf.scene} />;
}

export default function SecureModelViewer({ modelId }) {
  const [modelUrl, setModelUrl] = useState(null);
  const [userToken, setUserToken] = useState(null);
  const [authResolved, setAuthResolved] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setAuthResolved(true);
      if (user) {
        user.getIdToken().then((token) => setUserToken(token));
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!userToken || !modelId) return;

    async function fetchModel() {
      try {
        const response = await axios.get(`/api/models/${modelId}`, {
          headers: { Authorization: `Bearer ${userToken}` },
        });
        const { url } = response.data;
        if (url) setModelUrl(url);
      } catch (err) {
        console.error('Failed to load model', err);
      }
    }
    fetchModel();
  }, [modelId, userToken]);

  if (!authResolved || !userToken) {
    if (authResolved && !userToken) return <div>Please log in</div>;
    return <div>Loading…</div>;
  }

  if (!modelUrl) return <div>Loading Secure Model…</div>;

  return (
    <div onContextMenu={(e) => e.preventDefault()}>
      <Canvas>
        <Stage environment="city" intensity={0.6}>
          <Model url={modelUrl} />
        </Stage>
        <OrbitControls />
      </Canvas>
    </div>
  );
}
