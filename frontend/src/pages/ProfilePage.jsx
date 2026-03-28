import React, { useState, useEffect, useRef } from 'react';
import {
    UserIcon,
    CameraIcon,
    ArrowPathIcon,
    CheckIcon,
    ExclamationTriangleIcon,
    EnvelopeIcon,
    IdentificationIcon,
    ChatBubbleBottomCenterTextIcon,
    ShieldCheckIcon,
    ArrowRightIcon
} from '@heroicons/react/24/outline';
import { auth } from '../firebase';
import { API_BASE_URL } from '../utils/apiClient';

const ProfilePage = () => {
    const [profile, setProfile] = useState({
        username: '',
        bio: '',
        photo_url: null,
        email: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        setLoading(true);
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) throw new Error("Authentication required");
            
            const token = await currentUser.getIdToken();
            const response = await fetch(`${API_BASE_URL}/api/user/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error("Failed to fetch profile");

            const data = await response.json();
            setProfile({
                username: data.username || '',
                bio: data.bio || '',
                photo_url: data.photo_url || null,
                email: data.email || currentUser.email || ''
            });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePhotoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        setError(null);
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) throw new Error("Authentication required");
            const token = await currentUser.getIdToken();

            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${API_BASE_URL}/api/user/profile-photo`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (!response.ok) throw new Error("Photo upload failed");

            const data = await response.json();
            setProfile(prev => ({ ...prev, photo_url: data.photo_url }));
            setSuccess("Avatar synchronized successfully");
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError(err.message);
        } finally {
            setUploading(false);
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const currentUser = auth.currentUser;
            if (!currentUser) throw new Error("Authentication required");
            const token = await currentUser.getIdToken();

            const response = await fetch(`${API_BASE_URL}/api/user/update`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: profile.username,
                    bio: profile.bio
                })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || "Profile update failed");
            }

            setSuccess("Protocols successfully committed to cloud");
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="w-16 h-16 border-4 border-[#1a1a1a] border-t-[#00f3ff] animate-spin mb-4"></div>
                <p className="font-black uppercase tracking-[0.3em] text-[#444] animate-pulse">Syncing Protocols...</p>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-6 py-12 space-y-16">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row items-center md:items-end justify-between gap-8 pb-12 border-b-2 border-[#1a1a1a]">
                <div className="text-center md:text-left space-y-2">
                    <span className="text-[10px] font-black text-[#00f3ff] uppercase tracking-[0.5em]">Identity Management</span>
                    <h1 className="text-6xl font-black uppercase tracking-tighter italic leading-none text-white">
                        USER <span className="text-[#00f3ff]">PROFILE</span>
                    </h1>
                </div>
                <div className="flex items-center gap-4 bg-[#0a0a0a] border border-[#1a1a1a] px-6 py-3">
                    <ShieldCheckIcon className="w-5 h-5 text-[#00ff88]" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#666]">Security Status: <span className="text-[#00ff88]">Verified</span></span>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex flex-col lg:flex-row gap-16">
                
                {/* Profile Card Sidebar */}
                <div className="lg:w-1/3 space-y-8">
                    <div className="relative group">
                        <div className="aspect-square bg-[#0a0a0a] border-4 border-[#eeeeee] overflow-hidden shadow-[12px_12px_0px_0px_#111] transition-all group-hover:shadow-none group-hover:translate-x-2 group-hover:translate-y-2">
                            {profile.photo_url ? (
                                <img
                                    src={profile.photo_url}
                                    alt="Profile"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <UserIcon className="w-1/2 h-1/2 text-[#111]" />
                                </div>
                            )}
                            
                            {uploading && (
                                <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                                    <ArrowPathIcon className="w-12 h-12 text-[#00f3ff] animate-spin" />
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute -bottom-4 -right-4 w-12 h-12 bg-[#00f3ff] border-4 border-black flex items-center justify-center hover:bg-[#ccff00] transition-colors"
                            disabled={uploading}
                        >
                            <CameraIcon className="w-6 h-6 text-black" />
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handlePhotoUpload}
                            className="hidden"
                            accept="image/*"
                        />
                    </div>

                    <div className="space-y-6 pt-4">
                        <div className="p-6 bg-[#0a0a0a] border-2 border-[#1a1a1a] relative group overflow-hidden">
                            <div className="absolute top-0 right-0 w-8 h-8 opacity-5">
                                <IdentificationIcon className="w-full h-full" />
                            </div>
                            <label className="text-[10px] font-black text-[#444] uppercase tracking-widest block mb-2">Primary Alias</label>
                            <p className="text-xl font-black text-white truncate">{profile.username || 'UNIDENTIFIED'}</p>
                        </div>
                        
                        <div className="p-6 bg-[#0a0a0a] border-2 border-[#1a1a1a] relative group overflow-hidden">
                            <label className="text-[10px] font-black text-[#444] uppercase tracking-widest block mb-1">Authenticated Proxy</label>
                            <p className="text-xs font-bold text-[#666] truncate">{profile.email}</p>
                        </div>
                    </div>
                </div>

                {/* Main Settings Area */}
                <div className="lg:w-2/3 space-y-12">
                    {/* Status Feedback */}
                    {(error || success) && (
                        <div className={`p-6 border-l-4 flex items-center gap-4 animate-in slide-in-from-top-4 duration-300 ${error ? 'border-red-600 bg-red-950/10 text-red-500' : 'border-[#00ff88] bg-[#00ff88]/5 text-[#00ff88]'}`}>
                            {error ? <ExclamationTriangleIcon className="w-6 h-6 shrink-0" /> : <CheckIcon className="w-6 h-6 shrink-0" />}
                            <p className="text-xs font-black uppercase tracking-widest leading-relaxed">{error || success}</p>
                        </div>
                    )}

                    <div className="bg-[#0a0a0a] border-2 border-[#111] p-8 md:p-12 space-y-12 relative overflow-hidden">
                        <form onSubmit={handleUpdateProfile} className="space-y-12 relative z-10">
                            
                            <div className="space-y-8">
                                {/* Username Input */}
                                <div className="space-y-4">
                                    <label className="flex items-center gap-3 text-[10px] font-black text-[#eeeeee] uppercase tracking-[0.3em]">
                                        <IdentificationIcon className="w-4 h-4 text-[#00f3ff]" />
                                        System_ID
                                    </label>
                                    <input
                                        type="text"
                                        value={profile.username}
                                        onChange={(e) => setProfile(prev => ({ ...prev, username: e.target.value }))}
                                        className="w-full bg-black border-2 border-[#1a1a1a] p-5 text-xl font-bold text-white focus:border-[#00f3ff] transition-all outline-none"
                                        placeholder="Enter primary alias..."
                                        required
                                    />
                                </div>

                                {/* Bio Input */}
                                <div className="space-y-4">
                                    <label className="flex items-center gap-3 text-[10px] font-black text-[#eeeeee] uppercase tracking-[0.3em]">
                                        <ChatBubbleBottomCenterTextIcon className="w-4 h-4 text-[#00f3ff]" />
                                        Personal_Manifesto
                                    </label>
                                    <textarea
                                        value={profile.bio}
                                        onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                                        className="w-full bg-black border-2 border-[#1a1a1a] p-5 min-h-[150px] text-sm font-bold text-white focus:border-[#00f3ff] transition-all outline-none resize-none"
                                        placeholder="Transmit your digital signature..."
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end pt-8">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-12 py-5 bg-[#eeeeee] text-black text-sm font-black uppercase tracking-[0.3em] flex items-center gap-6 hover:bg-[#00f3ff] transition-all group disabled:opacity-50 active:translate-y-1"
                                >
                                    {saving ? (
                                        <>
                                            <ArrowPathIcon className="w-5 h-5 animate-spin" />
                                            Synchronizing...
                                        </>
                                    ) : (
                                        <>
                                            Commit Changes
                                            <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>

                        {/* Background Decoration */}
                        <div className="absolute -bottom-10 -right-10 text-[200px] font-black text-[#111] opacity-5 select-none pointer-events-none italic">
                            ID
                        </div>
                    </div>

                    {/* Footer Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8">
                        <div className="p-6 border border-[#111] border-dashed opacity-40 hover:opacity-100 transition-opacity">
                            <p className="text-[10px] font-black text-[#444] uppercase tracking-widest mb-2 font-mono">Sync Status</p>
                            <p className="text-[10px] font-bold text-[#666]">All profile data is stored on decentralized cloud clusters for maximum availability.</p>
                        </div>
                        <div className="p-6 border border-[#111] border-dashed opacity-40 hover:opacity-100 transition-opacity">
                            <p className="text-[10px] font-black text-[#444] uppercase tracking-widest mb-2 font-mono">Encryption Lock</p>
                            <p className="text-[10px] font-bold text-[#666]">End-to-end encryption active for all identity transfers. RSA-4096 Level.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
