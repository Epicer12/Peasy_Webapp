import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeftIcon, CloudArrowUpIcon, CheckCircleIcon, UserIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { getProjects } from '../services/componentService';
import { publishProject } from '../services/communityService';
import { auth } from '../firebase';

const UploadBuildPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [userProjects, setUserProjects] = useState([]);
    const [loading, setLoading] = useState(true);

    const [formData, setFormData] = useState({
        userName: auth.currentUser?.displayName || '',
        displayName: '',
        buildName: '',
        story: '',
        selectedBuildId: location.state?.prefillBuildId || '',
        imageUrl: null
    });

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, imageUrl: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    useEffect(() => {
        const fetchUserProjects = async () => {
            const user = auth.currentUser;
            if (!user) {
                setLoading(false);
                return;
            }
            try {
                const projects = await getProjects(user.email);
                // Filter for projects that aren't public yet, or just show all
                setUserProjects(projects);
            } catch (error) {
                console.error("Error fetching projects:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchUserProjects();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.selectedBuildId) {
            alert("Please select a build to share.");
            return;
        }

        const user = auth.currentUser;
        if (!user) return;

        setIsSubmitting(true);
        try {
            const token = await user.getIdToken();
            await publishProject(
                formData.selectedBuildId,
                formData.story,
                formData.imageUrl,
                formData.userName,
                formData.displayName || formData.buildName,
                token
            );
            setIsSuccess(true);
            setTimeout(() => {
                navigate('/community');
            }, 2000);
        } catch (error) {
            console.error(error);
            alert("Failed to publish build.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center">
                <CheckCircleIcon className="w-24 h-24 text-[#ccff00] animate-bounce" />
                <div className="space-y-2">
                    <h2 className="text-3xl font-black text-white uppercase italic">Build Published!</h2>
                    <p className="text-gray-400 font-mono">Redirecting you back to the hub...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto p-6 lg:p-10 space-y-8">
            <button
                onClick={() => navigate('/community')}
                className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors font-mono text-sm uppercase tracking-widest"
            >
                <ArrowLeftIcon className="w-4 h-4" />
                Back to Hub
            </button>

            <div className="space-y-2">
                <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter italic">
                    Share <span className="text-[#ccff00]">Your Build</span>
                </h1>
                <p className="text-gray-400 font-mono text-sm uppercase tracking-widest">
                    // BROADCAST_SYSTEM // SELECT_DATA
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Visual Build Selector */}
                <div className="space-y-4">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Which build would you like to share?</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {loading ? (
                            <div className="col-span-2 py-10 text-center text-gray-500 font-mono italic animate-pulse border border-dashed border-white/10 rounded-2xl">
                                SYNCING_YOUR_BUILDS...
                            </div>
                        ) : userProjects.length > 0 ? (
                            userProjects.map((b) => (
                                <div
                                    key={b.id}
                                    onClick={() => setFormData({ ...formData, selectedBuildId: b.id, buildName: b.name, imageUrl: b.image_url })}
                                    className={`group cursor-pointer p-5 rounded-2xl border-2 transition-all duration-300 relative overflow-hidden ${formData.selectedBuildId === b.id ? 'border-[#ccff00] bg-[#ccff00]/5 shadow-lg shadow-[#ccff00]/10' : 'border-white/5 bg-white/5 hover:border-white/20'}`}
                                >
                                    <div className="flex items-center gap-4 relative z-10">
                                        <div className="w-14 h-14 bg-white/5 group-hover:bg-white/10 rounded-xl flex items-center justify-center text-2xl transition-colors">
                                            🖥️
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <p className="font-black text-lg text-white group-hover:text-[#ccff00] transition-colors truncate">{b.name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] text-gray-400 font-mono uppercase px-2 py-0.5 bg-white/5 rounded-md truncate">
                                                    {b.components?.find(c => c.category === 'gpu')?.name?.split(' ').slice(-2).join(' ') || 'Integrated Graphics'}
                                                </span>
                                                <span className="text-[10px] text-gray-500 font-mono uppercase">{new Date(b.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        {formData.selectedBuildId === b.id && (
                                            <CheckCircleIcon className="w-6 h-6 text-[#ccff00]" />
                                        )}
                                    </div>
                                    <div className={`absolute inset-0 bg-gradient-to-br from-[#ccff00] to-transparent opacity-0 transition-opacity duration-500 ${formData.selectedBuildId === b.id ? 'opacity-[0.03]' : ''}`} />
                                </div>
                            ))
                        ) : (
                            <div className="col-span-2 py-10 text-center bg-white/5 border border-dashed border-white/10 rounded-3xl">
                                <p className="text-gray-500 font-mono italic">No builds found in your local storage. Create a build in the "Plan" feature first!</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Builder Reference</label>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-[#ccff00]/10 border-2 border-[#ccff00]/30 flex items-center justify-center shrink-0 overflow-hidden group hover:border-[#ccff00] transition-colors cursor-pointer">
                                <UserIcon className="w-6 h-6 text-[#ccff00]" />
                            </div>
                            <input
                                required
                                type="text"
                                placeholder="Alias or Gamertag"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#ccff00] transition-colors font-bold uppercase text-sm tracking-widest"
                                value={formData.userName}
                                onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Custom Display Name (Optional)</label>
                        <input
                            type="text"
                            placeholder="Unique Title (Leave empty for system name)"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#ccff00] transition-colors font-bold uppercase text-sm tracking-widest mt-[4px]"
                            value={formData.displayName}
                            onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Build Name</label>
                        <input
                            required
                            type="text"
                            placeholder="e.g. My Gamer PC"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#ccff00] transition-colors font-bold"
                            value={formData.buildName}
                            onChange={(e) => setFormData({ ...formData, buildName: e.target.value })}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Build Story</label>
                    <textarea
                        required
                        rows={5}
                        placeholder="Tell the community about your build, why you made it, and what you love about it..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#ccff00] transition-colors resize-none font-medium text-sm leading-relaxed"
                        value={formData.story}
                        onChange={(e) => setFormData({ ...formData, story: e.target.value })}
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Upload Real Build Image</label>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col md:flex-row items-center gap-6">
                        {formData.imageUrl ? (
                            <img src={formData.imageUrl} alt="preview" className="w-24 h-24 rounded-lg object-cover border-2 border-[#ccff00]" />
                        ) : (
                            <div className="w-24 h-24 rounded-lg bg-black/50 border border-white/10 flex items-center justify-center text-gray-500">
                                <PhotoIcon className="w-8 h-8" />
                            </div>
                        )}
                        <div className="flex-1 space-y-2 text-center md:text-left">
                            <p className="text-sm font-bold text-white uppercase tracking-wider">Showcase your masterpiece</p>
                            <p className="text-xs text-gray-400 font-mono">Upload a high-quality photo of your assembled rig.</p>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="mt-2 w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-black file:uppercase file:tracking-widest file:bg-[#ccff00] file:text-black hover:file:bg-white transition-colors cursor-pointer"
                            />
                        </div>
                    </div>
                </div>

                <button
                    disabled={isSubmitting}
                    type="submit"
                    className="w-full group relative overflow-hidden bg-white text-black py-4 font-black text-lg uppercase flex items-center justify-center gap-3 transition-all hover:bg-[#ccff00] active:scale-95 disabled:opacity-50"
                >
                    {isSubmitting ? (
                        <>
                            <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                            Sharing...
                        </>
                    ) : (
                        <>
                            <CloudArrowUpIcon className="w-6 h-6" />
                            Share your build with others
                        </>
                    )}
                </button>
            </form>
        </div>
    );
};

export default UploadBuildPage;
