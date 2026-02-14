import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { useEffect, useState } from 'react';
import Navbar from '../components/layout/Navbar';

export default function HomePage() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">
                        Welcome to Peasy
                    </h1>
                    <p className="text-xl text-gray-600">
                        {user?.email ? `Hello, ${user.email}!` : 'Component Detection & 3D Visualization'}
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {/* Scan Component Card */}
                    <div
                        onClick={() => navigate('/camera')}
                        className="bg-white rounded-xl shadow-lg p-8 cursor-pointer hover:shadow-xl transition-shadow border-2 border-transparent hover:border-blue-500"
                    >
                        <div className="text-center">
                            <div className="text-6xl mb-4">📷</div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-3">
                                Scan Component
                            </h2>
                            <p className="text-gray-600 mb-4">
                                Capture or upload an image to detect electronic components
                            </p>
                            <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold">
                                Start Scanning
                            </button>
                        </div>
                    </div>
                {/* Build Your Own PC Card */}
                <div
                    onClick={() => navigate('/build')}
                    className="bg-white rounded-xl shadow-lg p-8 cursor-pointer hover:shadow-xl transition-shadow border-2 border-transparent hover:border-purple-500"
                >
                    <div className="text-center">
                        <div className="text-6xl mb-4">🛠</div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-3">
                            Build Your Own PC
                        </h2>
                        <p className="text-gray-600 mb-4">
                            Answer guided questions and generate your custom PC build plan
                        </p>
                        <button className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors font-semibold">
                            Start Building
                        </button>
                    </div>
                </div>

                    {/* View 3D Models Card */}
                    <div
                        onClick={() => navigate('/model/test')}
                        className="bg-white rounded-xl shadow-lg p-8 cursor-pointer hover:shadow-xl transition-shadow border-2 border-transparent hover:border-green-500"
                    >
                        <div className="text-center">
                            <div className="text-6xl mb-4">🎨</div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-3">
                                View 3D Models
                            </h2>
                            <p className="text-gray-600 mb-4">
                                Explore interactive 3D models of detected components
                            </p>
                            <button className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold">
                                View Models
                            </button>
                        </div>
                    </div>
                </div>

                {/* Info Section */}
                <div className="mt-16 text-center">
                    <div className="bg-blue-50 rounded-lg p-6 max-w-2xl mx-auto">
                        <h3 className="text-lg font-semibold text-blue-900 mb-2">
                            How it works
                        </h3>
                        <p className="text-blue-800">
                            Use your camera or upload an image to detect electronic components.
                            Our AI will identify the component and show you a detailed 3D model
                            for better understanding.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}