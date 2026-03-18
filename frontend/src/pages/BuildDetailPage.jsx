import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { mockBuilds } from '../utils/mockCommunityData';
import {
    ArrowLeftIcon,
    HeartIcon,
    ShareIcon,
    CpuChipIcon,
    CubeIcon,
    UserIcon,
    ChatBubbleLeftIcon,
    PaperAirplaneIcon,
    ChartBarIcon,
    HandThumbUpIcon,
    ArrowUturnLeftIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';

const BuildDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [commentText, setCommentText] = useState('');

    // Find build or use first mock as fallback for safety
    const build = mockBuilds.find(b => b.id === id) || mockBuilds[0];

    const handleComment = () => {
        if (!commentText) return;
        alert(`Comment added: ${commentText}`);
        setCommentText('');
    };

    return (
        <div className="max-w-6xl mx-auto p-4 lg:p-8 space-y-8 pb-32">
            <button
                onClick={() => navigate('/community')}
                className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors font-mono text-xs uppercase tracking-widest"
            >
                <ArrowLeftIcon className="w-3 h-3" />
                Back to Hub
            </button>

            {/* Section 1: Main Content Container */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-stretch">
                {/* Left Column: Visuals & Story */}
                <div className="flex flex-col space-y-6 h-full">
                    <div className="aspect-[3/4] rounded-3xl overflow-hidden border-2 border-white/5 shadow-2xl bg-black">
                        <img
                            src={build.image}
                            alt={build.buildName}
                            className="w-full h-full object-cover"
                        />
                    </div>

                    {/* Compact Social Bar */}
                    <div className="flex items-center justify-between p-5 bg-white/5 rounded-3xl border border-white/5 backdrop-blur-md">
                        <div className="flex gap-10">
                            <div className="text-center">
                                <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Appreciation</p>
                                <p className="text-2xl font-black text-white italic mt-1">{build.likes}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Broadcasts</p>
                                <p className="text-2xl font-black text-white italic mt-1">{build.shares}</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button className="p-3 bg-[#ccff00] text-black rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-[#ccff00]/20">
                                <HeartIconSolid className="w-6 h-6" />
                            </button>
                            <button className="p-3 bg-white/10 text-white rounded-2xl hover:scale-105 active:scale-95 transition-all border border-white/10">
                                <ShareIcon className="w-6 h-6" />
                            </button>
                        </div>
                    </div>

                    {/* Build Story Panel - Stretched to fill */}
                    <div className="flex-1 p-6 bg-white/5 border border-white/5 rounded-3xl space-y-4">
                        <h3 className="text-[10px] font-black text-[#ccff00] uppercase tracking-[0.3em] flex items-center gap-2">
                            <CubeIcon className="w-3 h-3" /> // BUILD_STORY
                        </h3>
                        <p className="text-gray-400 text-sm leading-relaxed font-medium italic">
                            "{build.story}"
                        </p>
                    </div>
                </div>

                {/* Right Column: Title & Data Panels */}
                <div className="flex flex-col space-y-8 h-full">
                    <div className="space-y-6">
                        <span className="inline-block bg-[#ccff00] text-black text-[10px] font-black px-3 py-1 rounded uppercase tracking-[0.2em]">
                            Build Information
                        </span>

                        <div className="space-y-0">
                            <h1 className="text-6xl md:text-8xl font-black text-white italic leading-[0.8] tracking-tighter uppercase transform -skew-x-12">
                                THE
                            </h1>
                            <h1 className="text-5xl md:text-7xl font-black text-[#ccff00] italic leading-[0.8] tracking-tighter uppercase whitespace-nowrap transform -skew-x-12">
                                {build.buildName.replace('THE ', '').replace('The ', '')}
                            </h1>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ccff00] to-[#00f3ff] p-[2px]">
                                <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
                                    <UserIcon className="w-5 h-5 text-white/40" />
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] text-[#ccff00] font-black uppercase tracking-widest">BY</span>
                                <span className="text-[11px] text-white font-black uppercase tracking-widest">{build.userName}</span>
                            </div>
                        </div>
                    </div>

                    {/* Separate Panels with Zero Gap Cluster */}
                    <div className="flex-1 flex flex-col space-y-4">
                        {/* Hardware Specs Panel */}
                        <div className="p-8 bg-white/5 border border-white/10 rounded-[2rem]">
                            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <CubeIcon className="w-3.5 h-3.5" /> Hardware Specifications
                            </h3>
                            <div className="grid grid-cols-2 gap-6">
                                {Object.entries(build.components).map(([key, val]) => (
                                    <div key={key} className="space-y-1">
                                        <p className="text-[8px] text-gray-500 uppercase font-black tracking-widest opacity-60">{key}</p>
                                        <p className="text-base font-black text-white uppercase truncate tracking-tight">{val}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Performance Estimator Panel - Stretched to fill */}
                        <div className="flex-1 p-8 bg-[#ccff00]/5 border border-white/10 rounded-[2rem] min-h-[320px] flex flex-col">
                            <h3 className="text-[10px] font-black text-[#ccff00] uppercase tracking-[0.3em] flex items-center gap-2 mb-auto">
                                <ChartBarIcon className="w-4 h-4" /> // PERFORMANCE_ESTIMATOR
                            </h3>
                            <div className="flex flex-col items-center justify-center flex-1 py-4 text-center space-y-4 opacity-50">
                                <ChartBarIcon className="w-12 h-12 text-[#ccff00]" />
                                <div className="space-y-2">
                                    <p className="text-xs text-white font-mono uppercase tracking-widest">Synthesizing Benchmarks...</p>
                                    <p className="text-[9px] text-gray-500 font-mono uppercase tracking-[0.3em]">Core v2.0 Initializing</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Section 2: Full Width Comments */}
            <div className="space-y-8 pt-6 border-t border-white/10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-black text-gray-500 uppercase tracking-widest">
                        <ChatBubbleLeftIcon className="w-4 h-4 text-[#ccff00]" />
                        Community Intel
                    </div>
                    <span className="text-[10px] font-mono text-gray-600 uppercase">3 Transmissions Logged</span>
                </div>

                <div className="flex gap-4 items-start">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
                        <UserIcon className="w-5 h-5 text-gray-600" />
                    </div>
                    <div className="flex-1 space-y-4">
                        <div className="relative">
                            <textarea
                                rows={1}
                                placeholder="Broadcast your feedback..."
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-3 text-sm text-white focus:outline-none focus:border-[#ccff00]/50 transition-all resize-none overflow-hidden placeholder:text-gray-600"
                            />
                            <button
                                onClick={handleComment}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-[#ccff00] text-black rounded-xl hover:scale-110 active:scale-95 transition-all shadow-lg shadow-[#ccff00]/10"
                            >
                                <PaperAirplaneIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="space-y-8 mt-10">
                    <div className="flex gap-5">
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/5">
                            <UserIcon className="w-5 h-5 text-gray-400" />
                        </div>
                        <div className="space-y-3 flex-1">
                            <div className="flex items-center gap-3">
                                <p className="text-[11px] font-black text-[#ccff00] uppercase tracking-wider">Neon_Rider</p>
                                <span className="text-[10px] text-gray-600 font-mono tracking-tighter uppercase">Signal Stabilized // 2H AGO</span>
                            </div>
                            <p className="text-sm text-gray-300 leading-relaxed font-medium">This lighting setup is absolutely insane! How did you handle the cable management behind the motherboard tray?</p>

                            <div className="flex items-center gap-6 pt-1">
                                <button className="flex items-center gap-2 text-[10px] font-black text-gray-500 hover:text-[#ccff00] transition-colors uppercase tracking-widest group">
                                    <HandThumbUpIcon className="w-3.5 h-3.5" />
                                    <span>24</span>
                                </button>
                                <button className="flex items-center gap-2 text-[10px] font-black text-gray-500 hover:text-[#00f3ff] transition-colors uppercase tracking-widest">
                                    <ArrowUturnLeftIcon className="w-3.5 h-3.5" />
                                    Reply
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BuildDetailPage;
