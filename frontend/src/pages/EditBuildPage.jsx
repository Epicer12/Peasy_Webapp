import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftIcon, PencilSquareIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { mockBuilds } from '../utils/mockCommunityData';

const EditBuildPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const [formData, setFormData] = useState({
        userName: '',
        buildName: '',
        story: '',
    });

    useEffect(() => {
        // Mock fetching data for the build
        const build = mockBuilds.find(b => b.id === id) || mockBuilds[0];
        setFormData({
            userName: build.userName,
            buildName: build.buildName,
            story: build.story
        });
    }, [id]);

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        setTimeout(() => {
            setIsSubmitting(false);
            setIsSuccess(true);
            setTimeout(() => {
                navigate('/community/my-builds');
            }, 2000);
        }, 1500);
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
