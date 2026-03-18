import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, CloudArrowUpIcon, CheckCircleIcon, UserIcon } from '@heroicons/react/24/outline';

const UploadBuildPage = () => {
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const [formData, setFormData] = useState({
        userName: '',
        buildName: '',
        story: '',
        selectedBuildId: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Mock submission delay
        setTimeout(() => {
            setIsSubmitting(false);
            setIsSuccess(true);
            setTimeout(() => {
                navigate('/community');
            }, 2000);
        }, 1500);
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
                        {[
                            { id: 'b1', name: 'Gaming Rig', date: '2024-03-05', icon: '🎮', gpu: 'RTX 4090' },
                            { id: 'b2', name: 'Workstation Pro', date: '2024-02-28', icon: '💼', gpu: 'RTX 5000' }
                        ].map((b) => (
                            <div
                                key={b.id}
                                onClick={() => setFormData({ ...formData, selectedBuildId: b.id })}
                                className={`group cursor-pointer p-5 rounded-2xl border-2 transition-all duration-300 relative overflow-hidden ${formData.selectedBuildId === b.id ? 'border-[#ccff00] bg-[#ccff00]/5 shadow-lg shadow-[#ccff00]/10' : 'border-white/5 bg-white/5 hover:border-white/20'}`}
                            >
                                <div className="flex items-center gap-4 relative z-10">
                                    <div className="w-14 h-14 bg-white/5 group-hover:bg-white/10 rounded-xl flex items-center justify-center text-2xl transition-colors">
                                        {b.icon}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-black text-lg text-white group-hover:text-[#ccff00] transition-colors">{b.name}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] text-gray-400 font-mono uppercase px-2 py-0.5 bg-white/5 rounded-md">{b.gpu}</span>
                                            <span className="text-[10px] text-gray-500 font-mono uppercase">{b.date}</span>
                                        </div>
                                    </div>
                                    {formData.selectedBuildId === b.id && (
                                        <CheckCircleIcon className="w-6 h-6 text-[#ccff00]" />
                                    )}
                                </div>
                                <div className={`absolute inset-0 bg-gradient-to-br from-[#ccff00] to-transparent opacity-0 transition-opacity duration-500 ${formData.selectedBuildId === b.id ? 'opacity-[0.03]' : ''}`} />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Your Name</label>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-[#ccff00]/10 border-2 border-[#ccff00]/30 flex items-center justify-center shrink-0 overflow-hidden group hover:border-[#ccff00] transition-colors cursor-pointer">
                                <UserIcon className="w-6 h-6 text-[#ccff00]" />
                            </div>
                            <input
                                required
                                type="text"
                                placeholder="e.g. Sam"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#ccff00] transition-colors font-bold"
                                value={formData.userName}
                                onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                            />
                        </div>
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
