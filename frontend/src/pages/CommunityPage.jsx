import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserIcon, HeartIcon, ShareIcon, ArrowUpTrayIcon, PencilSquareIcon, Squares2X2Icon, MagnifyingGlassIcon, AdjustmentsHorizontalIcon, ChatBubbleLeftIcon, PaperAirplaneIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import { getCommunityBuilds, toggleLike as toggleLikeApi, addComment as addCommentApi } from '../services/communityService';
import { auth } from '../firebase';

const CommunityPage = () => {
    const navigate = useNavigate();
    const [builds, setBuilds] = useState([]);
    const [likedBuilds, setLikedBuilds] = useState(new Set());
    const [commentText, setCommentText] = useState({});
    const [isAnonymous, setIsAnonymous] = useState({});
    const [moderationError, setModerationError] = useState({});
    const [loading, setLoading] = useState(true);
    const [expandedStories, setExpandedStories] = useState(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOption, setSortOption] = useState('newest'); // 'newest' | 'likes'
    const [showShareModal, setShowShareModal] = useState(false);
    const [shareUrl, setShareUrl] = useState('');
    const [showGuidelines, setShowGuidelines] = useState(false);

    const toggleStory = (id) => {
        const newExpanded = new Set(expandedStories);
        if (newExpanded.has(id)) newExpanded.delete(id);
        else newExpanded.add(id);
        setExpandedStories(newExpanded);
    };

    useEffect(() => {
        const fetchBuilds = async () => {
            try {
                const data = await getCommunityBuilds();
                // Map the dynamic data to the format expected by the template
                const formattedBuilds = data.map(b => ({
                    id: b.id,
                    buildName: b.name,
                    userName: b.author_name || b.user_email?.split('@')[0] || 'Anonymous',
                    likes: b.likes || 0,
                    story: b.build_story || 'No story provided.',
                    image: b.image_url || 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&q=80&w=800',
                    components: {
                        cpu: b.components?.find(c => c.category === 'cpu')?.name || '',
                        gpu: b.components?.find(c => c.category === 'gpu')?.name || '',
                        ram: b.components?.find(c => c.category === 'ram')?.name || '16GB'
                    }
                }));
                setBuilds(formattedBuilds);
            } catch (error) {
                console.error("Error fetching builds:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchBuilds();
    }, []);

    const toggleLike = async (id) => {
        const user = auth.currentUser;
        if (!user) {
            alert("Please log in to like builds.");
            return;
        }

        try {
            const token = await user.getIdToken();
            const res = await toggleLikeApi(id, token);
            
            const newLiked = new Set(likedBuilds);
            if (res.status === 'liked') {
                newLiked.add(id);
                setBuilds(builds.map(b => b.id === id ? { ...b, likes: b.likes + 1 } : b));
            } else {
                newLiked.delete(id);
                setBuilds(builds.map(b => b.id === id ? { ...b, likes: b.likes - 1 } : b));
            }
            setLikedBuilds(newLiked);
        } catch (error) {
            console.error(error);
        }
    };

    const handleComment = async (id) => {
        if (!commentText[id]) return;
        const user = auth.currentUser;
        if (!user) {
            alert("Please log in to comment.");
            return;
        }

        try {
            const token = await user.getIdToken();
            setModerationError({ ...moderationError, [id]: '' });
            await addCommentApi(id, commentText[id], isAnonymous[id] || false, token);
            alert(`Comment added successfully!`);
            setCommentText({ ...commentText, [id]: '' });
            setIsAnonymous({ ...isAnonymous, [id]: false });
        } catch (error) {
            console.error(error);
            setModerationError({ ...moderationError, [id]: error.message || "Failed to add comment." });
        }
    };

    const handleShare = (build) => {
        const url = `${window.location.origin}/community/build/${build.id}`;
        setShareUrl(url);
        setShowShareModal(true);
    };

    const getFilteredAndSortedBuilds = () => {
        let result = builds;
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(b => 
                b.buildName.toLowerCase().includes(query) || 
                b.userName.toLowerCase().includes(query)
            );
        }
        if (sortOption === 'likes') {
            result = [...result].sort((a, b) => b.likes - a.likes);
        }
        return result;
    };

    const filteredBuilds = getFilteredAndSortedBuilds();

    return (
        <div className="flex flex-col h-full space-y-6 max-w-7xl mx-auto pb-20 relative">
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
            {/* Guidelines Modal */}
            {showGuidelines && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 transition-all">
                    <div className="bg-[#050505] border border-white/10 rounded-[2rem] p-8 w-full max-w-lg space-y-6 relative overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)]">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#ccff00]/10 rounded-full blur-[50px] pointer-events-none" />
                        <div className="flex justify-between items-start relative z-10">
                            <div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tight">Hub Guidelines</h3>
                                <p className="text-[#ccff00] text-xs font-mono-tech mt-1 tracking-widest">RULES OF ENGAGEMENT</p>
                            </div>
                            <button onClick={() => setShowGuidelines(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors">
                                <XMarkIcon className="w-5 h-5 text-gray-400 hover:text-white" />
                            </button>
                        </div>
                        <div className="space-y-4 text-sm text-gray-400 font-medium leading-relaxed max-h-[60vh] overflow-y-auto">
                            <p>Welcome to the Community Hub! Ensure a safe and constructive environment for everyone by following these guidelines:</p>
                            <ul className="list-disc pl-5 space-y-2">
                                <li><strong className="text-white">Respect Creativity:</strong> Constructive feedback is welcome, but hateful, discriminatory, or hostile commentary is strictly prohibited.</li>
                                <li><strong className="text-white">Zero Toxicity:</strong> Harassment and insults directed at builders will be automatically filtered and flagged.</li>
                                <li><strong className="text-white">Anonymity Etiquette:</strong> You may post anonymously, but standard moderation rules still apply. Repeated violations will result in shadow-bans.</li>
                            </ul>
                            <p>By interacting in the Hub, you agree to these baseline protocols. Keep building and keep inspiring!</p>
                        </div>
                        <button onClick={() => setShowGuidelines(false)} className="w-full py-4 bg-[#ccff00] text-black font-black uppercase text-sm rounded-xl tracking-widest hover:bg-[#b3ff00] transition-colors relative z-10">
                            I Understand
                        </button>
                    </div>
                </div>
            )}

            {/* Title Section */}
            <div className="border-b-2 border-[#333] pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase leading-none italic">
                        <span className="text-white">COMMUNITY_</span>
                        <span className="text-[#ccff00]">HUB</span>
                    </h1>
                    <p className="text-[8px] font-mono text-[#666] mt-2 uppercase tracking-[0.3em] block">
                        // DATA_FEED // HIVE_MIND // NETWORK_SYNC
                    </p>
                </div>
                <button onClick={() => setShowGuidelines(true)} className="text-[10px] text-gray-500 font-mono-tech flex-shrink-0 uppercase tracking-widest border-b border-gray-600 hover:text-[#ccff00] hover:border-[#ccff00] transition-colors">
                    READ COMMUNITY GUIDELINES
                </button>
            </div>

            {/* Controls Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2 flex-1 max-w-lg">
                    <div className="relative flex-1">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search builds by name or user..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#ccff00] transition-colors"
                        />
                    </div>
                    <select
                        title="Filter Options"
                        value={sortOption}
                        onChange={(e) => setSortOption(e.target.value)}
                        className="p-1.5 bg-[#111] border border-white/10 rounded-xl text-xs text-white uppercase font-black focus:outline-none focus:border-[#ccff00] cursor-pointer"
                    >
                        <option value="newest">Newest</option>
                        <option value="likes">Most Liked</option>
                    </select>
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
                {filteredBuilds.map((build) => (
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

                        </div>

                        {/* Content Area */}
                        <div className="p-5 space-y-4 flex-1 flex flex-col">
                            {/* Title & Like */}
                            <div className="flex items-start justify-between gap-4">
                                <h3
                                    className="text-white font-black text-lg uppercase italic tracking-tight cursor-pointer hover:text-[#ccff00] transition-colors break-words flex-1 leading-tight"
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
                                <div className="p-3 bg-white/[0.03] rounded-xl border border-white/5">
                                    <p className={`text-gray-400 text-xs leading-relaxed font-medium italic opacity-70 ${expandedStories.has(build.id) ? '' : 'line-clamp-2'}`}>
                                        "{build.story}"
                                    </p>
                                    {build.story && build.story.length > 80 && (
                                        <button
                                            onClick={() => toggleStory(build.id)}
                                            className="text-[#ccff00] text-[10px] font-black uppercase mt-2 tracking-widest hover:underline"
                                        >
                                            {expandedStories.has(build.id) ? 'Show Less' : 'Read More...'}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Comment Section (Bottom) */}
                            <div className="space-y-3 pt-3">
                                {moderationError[build.id] && (
                                    <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-3 flex flex-col items-start gap-2 animate-pulse transition mb-2">
                                        <p className="text-red-500 text-[10px] font-bold uppercase tracking-wide">
                                            [SYSTEM INTERVENTION] That type of comment is not allowed in this community.
                                        </p>
                                        <button onClick={() => setShowGuidelines(true)} className="text-white text-[8px] font-mono-tech border-b border-white hover:text-[#00f3ff] hover:border-[#00f3ff] transition-colors uppercase tracking-widest">
                                            REVIEW HUB GUIDELINES
                                        </button>
                                    </div>
                                )}
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
                                <div className="flex items-center gap-2 px-1 mt-1">
                                    <input 
                                        type="checkbox" 
                                        id={`anon-${build.id}`}
                                        checked={isAnonymous[build.id] || false}
                                        onChange={(e) => setIsAnonymous({ ...isAnonymous, [build.id]: e.target.checked })}
                                        className="accent-[#00f3ff] w-2.5 h-2.5 cursor-pointer" 
                                    />
                                    <label htmlFor={`anon-${build.id}`} className="text-[8px] text-gray-500 font-mono-tech uppercase tracking-widest cursor-pointer hover:text-white transition-colors">Route As Anonymous</label>
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
