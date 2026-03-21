import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import { HeartIcon as HeartIconSolid, XMarkIcon } from '@heroicons/react/24/solid';
import { getCommunityBuildById, toggleLike as toggleLikeApi, addComment as addCommentApi } from '../services/communityService';
import { auth } from '../firebase';

const BuildDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [commentText, setCommentText] = useState('');
    const [build, setBuild] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isLiked, setIsLiked] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [moderationError, setModerationError] = useState('');
    const [showGuidelinesModal, setShowGuidelinesModal] = useState(false);
    const [shareUrl, setShareUrl] = useState('');
    const commentInputRef = useRef(null);

    useEffect(() => {
        const fetchBuildDetails = async () => {
            try {
                const data = await getCommunityBuildById(id);
                setBuild({
                    id: data.id,
                    buildName: data.name || 'Untitled Build',
                    userName: data.author_name || data.user_name || 'Anonymous',
                    likes: data.likes || 0,
                    shares: 0, // Mock metric
                    story: data.build_story || 'No story provided.',
                    image: data.image_url || 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&q=80&w=800',
                    components: {
                        cpu: data.components?.find(c => c.category === 'cpu')?.name || 'N/A',
                        gpu: data.components?.find(c => c.category === 'gpu')?.name || 'N/A',
                        ram: data.components?.find(c => c.category === 'ram')?.name || '16GB',
                        motherboard: data.components?.find(c => c.category === 'motherboard')?.name || 'N/A',
                        case: data.components?.find(c => c.category === 'case')?.name || 'N/A'
                    },
                    comments: data.comments || []
                });
                
                // Check if current user liked it
                const user = auth.currentUser;
                if (user && data.likes_data && data.likes_data.some(l => l.user_id === user.uid)) {
                   // This assumes backend sends likes_data, but we will handle local optimistic UI primarily.
                   // For now, assume false initially unless backend is updated, or just rely on backend count.
                }
            } catch (error) {
                console.error("Error fetching build details:", error);
                alert("Failed to load build details.");
                navigate('/community');
            } finally {
                setLoading(false);
            }
        };
        fetchBuildDetails();
    }, [id, navigate]);

    const handleComment = async () => {
        if (!commentText.trim()) return;
        const user = auth.currentUser;
        if (!user) {
            alert("Please log in to comment.");
            return;
        }

        try {
            const token = await user.getIdToken();
            setModerationError('');
            const res = await addCommentApi(id, commentText, isAnonymous, token);
            setBuild(prev => ({
                ...prev,
                comments: [res.comment, ...prev.comments]
            }));
            setCommentText('');
            setIsAnonymous(false);
        } catch (error) {
            console.error(error);
            setModerationError(error.message || "Failed to add comment.");
        }
    };

    const toggleLike = async () => {
        const user = auth.currentUser;
        if (!user) {
            alert("Please log in to like builds.");
            return;
        }
        try {
            const token = await user.getIdToken();
            const res = await toggleLikeApi(id, token);
            if (res.status === 'liked') {
                setIsLiked(true);
                setBuild(prev => ({ ...prev, likes: prev.likes + 1 }));
            } else {
                setIsLiked(false);
                setBuild(prev => ({ ...prev, likes: prev.likes - 1 }));
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleShare = () => {
        const url = window.location.href;
        setShareUrl(url);
        setShowShareModal(true);
    };

    const handleReply = (userName) => {
        setCommentText((prev) => prev ? `${prev} @${userName} ` : `@${userName} `);
        if (commentInputRef.current) {
            commentInputRef.current.focus();
        }
    };

    if (loading || !build) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-[#ccff00] font-mono text-xl animate-pulse">
                    LOADING_DATA...
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-4 lg:p-8 space-y-8 pb-32 relative">
            {/* Share Modal */}
            {showShareModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 transition-all">
                    <div className="bg-[#050505] border border-white/10 rounded-[2rem] p-8 w-full max-w-sm space-y-8 relative overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)]">
                        {/* Background glowing effects */}
                        <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#ccff00]/20 rounded-full blur-[60px]" />
                        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-[#00f3ff]/20 rounded-full blur-[60px]" />
                        
                        <div className="flex justify-between items-center relative z-10">
                            <div className="space-y-1">
                                <h3 className="text-white font-black uppercase tracking-wider text-xl leading-none">Broadcast Build</h3>
                                <p className="text-xs text-gray-400 font-mono tracking-widest uppercase">Select Frequency</p>
                            </div>
                            <button onClick={() => setShowShareModal(false)} className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-colors"><XMarkIcon className="w-5 h-5"/></button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 relative z-10">
                            <button onClick={() => { navigator.clipboard.writeText(shareUrl); alert('Link copied!'); setShowShareModal(false); }} className="flex flex-col items-center justify-center p-6 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5 hover:border-white/20 group">
                                <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform text-white text-xl">🔗</div>
                                <span className="text-white font-black text-[10px] uppercase tracking-wider">Copy Link</span>
                            </button>
                            <a href={`https://api.whatsapp.com/send?text=Check out this PC Build: ${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center p-6 bg-[#25D366]/5 hover:bg-[#25D366]/10 rounded-2xl transition-all border border-[#25D366]/10 hover:border-[#25D366]/30 group">
                                <div className="w-12 h-12 bg-[#25D366] rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(37,211,102,0.4)] text-black text-xl">💬</div>
                                <span className="text-[#25D366] font-black text-[10px] uppercase tracking-wider">WhatsApp</span>
                            </a>
                            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center p-6 bg-[#1877F2]/5 hover:bg-[#1877F2]/10 rounded-2xl transition-all border border-[#1877F2]/10 hover:border-[#1877F2]/30 group">
                                <div className="w-12 h-12 bg-[#1877F2] rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(24,119,242,0.4)] text-white text-xl">📘</div>
                                <span className="text-[#1877F2] font-black text-[10px] uppercase tracking-wider">Facebook</span>
                            </a>
                            <button onClick={() => { navigator.clipboard.writeText(shareUrl); alert('Instagram link copied! Paste it in your story or bio.'); setShowShareModal(false); }} className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-[#f09433]/10 via-[#e6683c]/10 to-[#bc1888]/10 hover:from-[#f09433]/20 hover:to-[#bc1888]/20 rounded-2xl transition-all border border-pink-500/20 hover:border-pink-500/40 group">
                                <div className="w-12 h-12 bg-gradient-to-r from-[#f09433] via-[#e6683c] to-[#bc1888] rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(230,104,60,0.4)] text-white text-xl">📸</div>
                                <span className="text-white font-black text-[10px] uppercase tracking-wider">Instagram</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
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
                            <button 
                                onClick={toggleLike}
                                className={`p-3 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg ${isLiked ? 'bg-[#ccff00] text-black shadow-[#ccff00]/20' : 'bg-white/10 text-white border border-white/10 hover:bg-[#ccff00] hover:text-black hover:border-transparent'}`}
                            >
                                {isLiked ? <HeartIconSolid className="w-6 h-6" /> : <HeartIcon className="w-6 h-6" />}
                            </button>
                            <button onClick={handleShare} className="p-3 bg-white/10 text-white rounded-2xl hover:scale-105 active:scale-95 transition-all border border-white/10 hover:bg-white/20">
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

                        <div className="space-y-0 w-full">
                            <h1 className="text-6xl md:text-8xl font-black text-white italic leading-[0.8] tracking-tighter uppercase transform -skew-x-12">
                                THE
                            </h1>
                            <h1 className="text-5xl md:text-7xl font-black text-[#ccff00] italic leading-[0.9] tracking-tighter uppercase break-words whitespace-normal transform -skew-x-12 mt-2">
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
                    <span className="text-[10px] font-mono text-gray-600 uppercase">{build.comments.length} Transmissions Logged</span>
                </div>

                <div className="flex gap-4 items-start">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
                        <UserIcon className="w-5 h-5 text-gray-600" />
                    </div>
                    <div className="flex-1 space-y-4">
                        {moderationError && (
                            <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 flex flex-col items-start gap-2 animate-pulse transition">
                                <p className="text-red-500 text-xs font-bold uppercase tracking-wide">
                                    [SYSTEM INTERVENTION] That type of comment is not allowed in this community.
                                </p>
                                <button onClick={() => setShowGuidelinesModal(true)} className="text-white text-[10px] font-mono-tech border-b border-white hover:text-[#00f3ff] hover:border-[#00f3ff] transition-colors uppercase tracking-widest">
                                    REVIEW HUB GUIDELINES
                                </button>
                            </div>
                        )}
                        <div className="relative">
                            <textarea
                                ref={commentInputRef}
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
                        <div className="flex items-center gap-2 px-2">
                             <input 
                                 type="checkbox" 
                                 id="anonymousConfig" 
                                 checked={isAnonymous} 
                                 onChange={(e) => setIsAnonymous(e.target.checked)}
                                 className="accent-[#00f3ff] w-3 h-3 cursor-pointer" 
                             />
                             <label htmlFor="anonymousConfig" className="text-[10px] text-gray-500 font-mono-tech uppercase tracking-widest cursor-pointer hover:text-white transition-colors">Route As Anonymous</label>
                        </div>
                    </div>
                </div>

                <div className="space-y-8 mt-10">
                    {build.comments.length === 0 ? (
                        <div className="text-center py-10 opacity-50">
                            <ChatBubbleLeftIcon className="w-12 h-12 mx-auto text-gray-500 mb-4" />
                            <p className="text-sm font-mono uppercase text-gray-400">No transmissions recorded yet.</p>
                        </div>
                    ) : (
                        build.comments.map((comment) => (
                            <div key={comment.id} className="flex gap-5">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ccff00]/20 to-[#00f3ff]/20 flex items-center justify-center shrink-0 border border-white/5">
                                    <UserIcon className="w-5 h-5 text-gray-400" />
                                </div>
                                <div className="space-y-3 flex-1">
                                    <div className="flex items-center gap-3">
                                        <p className="text-[11px] font-black text-[#ccff00] uppercase tracking-wider line-clamp-1">{comment.user_name || 'Anonymous'}</p>
                                        <span className="text-[10px] text-gray-600 font-mono tracking-tighter uppercase">Signal Stabilized // {new Date(comment.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-sm text-gray-300 leading-relaxed font-medium break-words whitespace-pre-wrap">{comment.comment_text}</p>
                                    
                                    <div className="flex items-center gap-6 pt-1">
                                        <button 
                                            onClick={() => handleReply(comment.user_name || 'Anonymous')}
                                            className="flex items-center gap-2 text-[10px] font-black text-gray-500 hover:text-[#00f3ff] transition-colors uppercase tracking-widest"
                                        >
                                            <ArrowUturnLeftIcon className="w-3.5 h-3.5" />
                                            Reply
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default BuildDetailPage;
