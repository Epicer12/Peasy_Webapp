import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockBuilds } from '../utils/mockCommunityData';
import { UserIcon, HeartIcon, ShareIcon, ArrowUpTrayIcon, PencilSquareIcon, Squares2X2Icon, MagnifyingGlassIcon, AdjustmentsHorizontalIcon, ChatBubbleLeftIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';

const CommunityPage = () => {
    const navigate = useNavigate();
    const [builds, setBuilds] = useState(mockBuilds);
    const [likedBuilds, setLikedBuilds] = useState(new Set());
    const [commentText, setCommentText] = useState({});

    const toggleLike = (id) => {
        const newLiked = new Set(likedBuilds);
        if (newLiked.has(id)) {
            newLiked.delete(id);
            setBuilds(builds.map(b => b.id === id ? { ...b, likes: b.likes - 1 } : b));
        } else {
            newLiked.add(id);
            setBuilds(builds.map(b => b.id === id ? { ...b, likes: b.likes + 1 } : b));
        }
        setLikedBuilds(newLiked);
    };

    const handleShare = (build) => {
        alert(`Sharing "${build.buildName}" by ${build.userName} to social media!`);
    };

    const handleComment = (id) => {
        if (!commentText[id]) return;
        alert(`Comment added to ${id}: ${commentText[id]}`);
        setCommentText({ ...commentText, [id]: '' });
    };

    return (
        <div className="flex flex-col h-full space-y-6 max-w-7xl mx-auto pb-20">
            {/* Title Section */}
            <div className="border-b-2 border-[#333] pb-3">
                <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase leading-none italic">
                    <span className="text-white">COMMUNITY_</span>
                    <span className="text-[#ccff00]">HUB</span>
                </h1>
                <p className="text-[8px] font-mono text-[#666] mt-2 uppercase tracking-[0.3em] block">
                    // DATA_FEED // HIVE_MIND // NETWORK_SYNC
                </p>
            </div>

            {/* Controls Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2 flex-1 max-w-lg">
                    <div className="relative flex-1">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search builds..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#ccff00] transition-colors"
                        />
                    </div>
                    <button
                        title="Filter Options"
                        className="p-1.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors group"
                    >
                        <AdjustmentsHorizontalIcon className="w-5 h-5 text-gray-400 group-hover:text-[#ccff00]" />
                    </button>
                </div>

                {/* Compact Action Panel */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-1 flex gap-1 self-start md:self-auto">
                    <button
                        onClick={() => navigate('/community/upload')}
                        className="group flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[#ccff00] transition-all duration-300 min-w-[40px] overflow-hidden"
                    >
                        <ArrowUpTrayIcon className="w-4 h-4 text-[#ccff00] group-hover:text-black transition-colors shrink-0" />
                        <span className="max-w-0 group-hover:max-w-[100px] text-[9px] font-black uppercase tracking-widest text-black transition-all duration-300 whitespace-nowrap opacity-0 group-hover:opacity-100">
                            Upload
                        </span>
                    </button>

                    <button
                        onClick={() => navigate('/community/my-builds')}
                        className="group flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-all duration-300 min-w-[40px] overflow-hidden"
                    >
                        <Squares2X2Icon className="w-4 h-4 text-[#ccff00] shrink-0" />
                        <span className="max-w-0 group-hover:max-w-[100px] text-[9px] font-black uppercase tracking-widest text-white transition-all duration-300 whitespace-nowrap opacity-0 group-hover:opacity-100">
                            My Builds
                        </span>
                    </button>

                    <button
                        onClick={() => navigate('/community/my-builds')}
                        className="group flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-all duration-300 min-w-[40px] overflow-hidden"
                    >
                        <PencilSquareIcon className="w-4 h-4 text-[#ccff00] shrink-0" />
                        <span className="max-w-0 group-hover:max-w-[100px] text-[9px] font-black uppercase tracking-widest text-white transition-all duration-300 whitespace-nowrap opacity-0 group-hover:opacity-100">
                            Edit
                        </span>
                    </button>
                </div>
            </div>

            {/* Discovery Feed */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                {builds.map((build) => (
                    <div
                        key={build.id}
                        className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden hover:border-[#ccff00]/40 hover:bg-white/[0.01] transition-all duration-500 group flex flex-col"
                    >
                        {/* Image Frame */}
                        <div className="aspect-[1.8/1] relative overflow-hidden bg-[#0a0a0a]">
                            <img
                                src={build.image}
                                alt={build.buildName}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                            />
                            <div className="absolute top-4 left-4">
                                <span className="bg-black/60 backdrop-blur-xl text-[#ccff00] text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-white/10">
                                    {build.components?.gpu?.split(' ')[0] || 'GPU'}
                                </span>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="p-5 space-y-4 flex-1 flex flex-col">
                            {/* Title & Like */}
                            <div className="flex items-center justify-between">
                                <h3
                                    className="text-white font-black text-lg uppercase italic tracking-tight cursor-pointer hover:text-[#ccff00] transition-colors line-clamp-1"
                                    onClick={() => navigate(`/community/build/${build.id}`)}
                                >
                                    {build.buildName}
                                </h3>
                                <button
                                    onClick={() => toggleLike(build.id)}
                                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full transition-all ${likedBuilds.has(build.id) ? 'bg-red-500/10 text-red-500' : 'bg-white/5 text-gray-500 hover:text-red-500'}`}
                                >
                                    {likedBuilds.has(build.id) ? (
                                        <HeartIconSolid className="w-4 h-4" />
                                    ) : (
                                        <HeartIcon className="w-4 h-4" />
                                    )}
                                    <span className="text-xs font-black">{build.likes}</span>
                                </button>
                            </div>

                            {/* User Profile */}
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#ccff00] to-[#00f3ff] p-[1px]">
                                    <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
                                        <UserIcon className="w-3.5 h-3.5 text-white/50" />
                                    </div>
                                </div>
                                <span className="text-xs text-white/70 font-bold tracking-wide">{build.userName}</span>
                            </div>

                            {/* Constant Box Panel (Hardware Specs) */}
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 grid grid-cols-2 gap-3 h-[88px]">
                                <div className="space-y-1">
                                    <p className="text-[8px] text-gray-500 font-black uppercase tracking-widest">CPU_CORE</p>
                                    <p className="text-[10px] text-white font-bold truncate">{build.components?.cpu?.split(' ').slice(-2).join(' ') || 'CORE_X'}</p>
                                </div>
                                <div className="space-y-1 text-right">
                                    <p className="text-[8px] text-gray-500 font-black uppercase tracking-widest">MEMORY</p>
                                    <p className="text-[10px] text-white font-bold">{build.components?.ram?.split(' ')[0] || '16GB'}</p>
                                </div>
                                <div className="col-span-2 pt-1 border-t border-white/5 mt-1">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[8px] text-[#ccff00] font-black uppercase tracking-[0.2em]">STABLE_TEMP</span>
                                        <span className="text-[10px] text-white font-mono">32°C // OPTIMAL</span>
                                    </div>
                                </div>
                            </div>

                            {/* Action Bar */}
                            <div className="flex items-center justify-between">
                                <button
                                    onClick={() => handleShare(build)}
                                    className="flex items-center gap-2 text-[10px] font-black text-gray-500 hover:text-white transition-colors uppercase tracking-widest"
                                >
                                    <ShareIcon className="w-4 h-4" />
                                    Share
                                </button>
                                <button
                                    onClick={() => navigate(`/community/build/${build.id}`)}
                                    className="px-5 py-2 bg-[#ccff00]/10 text-[#ccff00] text-[10px] font-black uppercase rounded-full hover:bg-[#ccff00] hover:text-black transition-all"
                                >
                                    View Build
                                </button>
                            </div>

                            {/* Build Story (Relocated) */}
                            <div className="pt-2">
                                <p className="text-gray-400 text-xs leading-relaxed font-medium italic opacity-70 p-3 bg-white/[0.03] rounded-xl border border-white/5">
                                    "{build.story}"
                                </p>
                            </div>

                            {/* Comment Section (Bottom) */}
                            <div className="space-y-3 pt-3">
                                <div className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                    <ChatBubbleLeftIcon className="w-3.5 h-3.5" />
                                    Community Chatter
                                </div>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Add a comment..."
                                        value={commentText[build.id] || ''}
                                        onChange={(e) => setCommentText({ ...commentText, [build.id]: e.target.value })}
                                        onKeyPress={(e) => e.key === 'Enter' && handleComment(build.id)}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-[10px] text-white placeholder:text-gray-600 focus:outline-none focus:border-[#ccff00]/50 transition-all font-medium"
                                    />
                                    <button
                                        onClick={() => handleComment(build.id)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-[#ccff00] transition-colors"
                                    >
                                        <PaperAirplaneIcon className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CommunityPage;
