import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftIcon, PencilSquareIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { getCommunityBuildById, updateCommunityBuild } from '../services/communityService';
import { auth } from '../firebase';

const EditBuildPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [loading, setLoading] = useState(true);

    const [formData, setFormData] = useState({
        userName: '',
        buildName: '',
        story: '',
    });

    useEffect(() => {
        const fetchBuildDetails = async () => {
            try {
                const build = await getCommunityBuildById(id);
                setFormData({
                    userName: build.author_name || build.user_email?.split('@')[0] || '',
                    buildName: build.name || '',
                    story: build.build_story || '',
                });
            } catch (error) {
                console.error("Error fetching build for edit:", error);
                alert("Failed to load build details.");
                navigate('/community/my-builds');
            } finally {
                setLoading(false);
            }
        };
        fetchBuildDetails();
    }, [id, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) return;
        
        setIsSubmitting(true);
        try {
            const token = await user.getIdToken();
            await updateCommunityBuild(id, formData.buildName, formData.userName, formData.story, token);
            setIsSuccess(true);
            setTimeout(() => {
                navigate('/community/my-builds');
            }, 2000);
        } catch (error) {
            console.error("Error updating build:", error);
            alert("Failed to update build.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center">
                <CheckCircleIcon className="w-24 h-24 text-[#ccff00]" />
                <div className="space-y-2">
                    <h2 className="text-3xl font-black text-white uppercase italic">Changes Saved!</h2>
                    <p className="text-gray-400 font-mono">Syncing with HIVE-MIND...</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-[#ccff00] font-mono text-xl animate-pulse">
                    FETCHING_RECORD...
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto p-6 lg:p-10 space-y-8">
            <button
                onClick={() => navigate('/community/my-builds')}
                className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors font-mono text-sm uppercase tracking-widest"
            >
                <ArrowLeftIcon className="w-4 h-4" />
                Back to My Arsenal
            </button>

            <div className="space-y-2">
                <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter italic">
                    Modify <span className="text-[#ccff00]">Record</span>
                </h1>
                <p className="text-gray-400 font-mono text-sm uppercase tracking-widest">
                    // Update your build's public profile.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Your Name</label>
                        <input
                            required
                            type="text"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#ccff00] transition-colors"
                            value={formData.userName}
                            onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Build Name</label>
                        <input
                            required
                            type="text"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#ccff00] transition-colors"
                            value={formData.buildName}
                            onChange={(e) => setFormData({ ...formData, buildName: e.target.value })}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Build Story</label>
                    <textarea
                        required
                        rows={8}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#ccff00] transition-colors resize-none"
                        value={formData.story}
                        onChange={(e) => setFormData({ ...formData, story: e.target.value })}
                    />
                </div>

                <button
                    disabled={isSubmitting}
                    type="submit"
                    className="w-full group relative overflow-hidden bg-white text-black py-4 font-black text-lg uppercase flex items-center justify-center gap-3 transition-all hover:bg-[#ccff00] active:scale-95 disabled:opacity-50"
                >
                    {isSubmitting ? (
                        <>
                            <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <PencilSquareIcon className="w-6 h-6" />
                            Update Build
                        </>
                    )}
                </button>
            </form>
        </div>
    );
};

export default EditBuildPage;
