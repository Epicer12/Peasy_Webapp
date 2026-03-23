import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, PencilSquareIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline';
import { getUserCommunityBuilds } from '../services/communityService';
import { deleteProject } from '../services/componentService';
import { auth } from '../firebase';

const MyBuildsPage = () => {
    const navigate = useNavigate();
    const [builds, setBuilds] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMyBuilds = async () => {
            const user = auth.currentUser;
            if (!user) {
                setLoading(false);
                return;
            }
            try {
                const token = await user.getIdToken();
                const data = await getUserCommunityBuilds(token);
                setBuilds(data.map(b => ({
                    id: b.id,
                    buildName: b.name,
                    createdAt: b.created_at,
                    imageUrl: b.image_url,
                    likes: 0 // Fetching likes for individual items could be added if needed
                })));
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchMyBuilds();
    }, []);

    const handleDelete = async (id) => {
        if (confirm('Are you sure you want to remove this build from the community hub?')) {
            const user = auth.currentUser;
            if (!user) return;
            try {
                await deleteProject(id, user.email);
                setBuilds(builds.filter(b => b.id !== id));
                alert('Build removed successfully');
            } catch (error) {
                console.error(error);
                alert('Failed to remove build');
            }
        }
    };

    return (
        <div className="max-w-5xl mx-auto p-6 lg:p-10 space-y-8">
            <button
                onClick={() => navigate('/community')}
                className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors font-mono text-sm uppercase tracking-widest"
            >
                <ArrowLeftIcon className="w-4 h-4" />
                Back to Hub
            </button>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter italic">
                        My <span className="text-[#ccff00]">Builds</span>
                    </h1>
                    <p className="text-gray-400 font-mono text-sm uppercase tracking-widest">
                        // Your community contributions.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {loading ? (
                    <div className="py-20 text-center text-gray-500 font-mono italic animate-pulse">
                        RETRIEVING_COMMUNITY_DATA...
                    </div>
                ) : builds.map((build) => (
                    <div
                        key={build.id}
                        className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 hover:border-[#ccff00]/30 transition-all group"
                    >
                        <div className="flex items-center gap-6">
                            {build.imageUrl ? (
                                <img src={build.imageUrl} alt={build.buildName} className="w-16 h-16 rounded-xl object-cover border border-[#ccff00]" />
                            ) : (
                                <div className="w-16 h-16 bg-[#ccff00]/10 rounded-xl flex items-center justify-center text-2xl border border-white/10">
                                    🖥️
                                </div>
                            )}
                            <div>
                                <h3 className="text-xl font-bold text-white group-hover:text-[#ccff00] transition-colors">
                                    {build.buildName}
                                </h3>
                                <p className="text-gray-500 text-xs font-mono uppercase">
                                    Published on {new Date(build.createdAt).toLocaleDateString()}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm font-bold">
                            <div className="px-4 py-2 bg-white/5 rounded-xl text-gray-400">
                                {build.likes} Likes
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => navigate(`/community/build/${build.id}`)}
                                    className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-white"
                                    title="View"
                                >
                                    <EyeIcon className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => navigate(`/community/edit/${build.id}`)}
                                    className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-[#ccff00]"
                                    title="Edit"
                                >
                                    <PencilSquareIcon className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => handleDelete(build.id)}
                                    className="p-3 bg-red-500/10 hover:bg-red-500/20 rounded-xl transition-colors text-red-500"
                                    title="Delete"
                                >
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {!loading && builds.length === 0 && (
                    <div className="text-center py-20 bg-white/5 border border-dashed border-white/10 rounded-3xl">
                        <p className="text-gray-500 font-mono italic">No builds published yet. Be the first to share!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyBuildsPage;
