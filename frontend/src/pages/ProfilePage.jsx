import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CheckBadgeIcon,
    ArrowRightIcon,
    CalendarIcon,
    ClockIcon,
    ExclamationTriangleIcon,
    UserIcon,
    CameraIcon,
    ArrowPathIcon,
    PlusIcon
} from '@heroicons/react/24/outline';
import { auth } from '../firebase';

const ProfilePage = () => {
    const [warranties, setWarranties] = useState([]);
    const [profile, setProfile] = useState({ photo_url: null });
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedAsset, setSelectedAsset] = useState(null);
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    // Shared calculation logic
    const calculateWarranty = (data) => {
        if (!data || !data.warranty_info) return { percentage: 0, daysLeft: 0, status: 'calculating', color: 'text-gray-500' };

        const info = data.warranty_info;
        const purchaseDateStr = info.purchase_date;
        const periodStr = info.warranty_period;

        if (!purchaseDateStr || !periodStr) return { percentage: 0, daysLeft: 0, status: 'calculating', color: 'text-gray-500' };

        try {
            const purchaseDate = new Date(purchaseDateStr);
            const years = parseInt(periodStr.match(/\d+/) || 0);
            if (isNaN(purchaseDate.getTime()) || years === 0) return { percentage: 0, daysLeft: 0, status: 'unknown', color: 'text-gray-500' };

            const expiryDate = new Date(purchaseDate);
            expiryDate.setFullYear(purchaseDate.getFullYear() + years);

            const now = new Date();
            const totalMs = expiryDate.getTime() - purchaseDate.getTime();
            const remainingMs = expiryDate.getTime() - now.getTime();

            const daysLeft = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
            const percentage = Math.max(0, Math.min(100, (remainingMs / totalMs) * 100));

            let color = 'text-[#00ff88]'; // Traffic Light Green
            if (daysLeft <= 0) color = 'text-[#ff4444] font-bold animate-pulse'; // Traffic Light Red
            else if (percentage < 20) color = 'text-[#ff4444]'; // Traffic Light Red
            else if (percentage < 50) color = 'text-[#ffbb00]'; // Traffic Light Amber/Yellow

            return {
                percentage,
                daysLeft,
                status: daysLeft <= 0 ? 'Expired' : 'Active',
                color,
                isExpired: daysLeft <= 0
            };
        } catch (e) {
            return { percentage: 0, daysLeft: 0, status: 'error', color: 'text-gray-500' };
        }
    };

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            let token = localStorage.getItem('token');
            const currentUser = auth.currentUser;
            if (currentUser) {
                token = await currentUser.getIdToken();
            }

            if (!token) throw new Error("Authentication required");

            const [warrResponse, profResponse] = await Promise.all([
                fetch('/api/warranty/list', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/warranty/profile', { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (!warrResponse.ok) {
                const errorData = await warrResponse.json().catch(() => ({ detail: "List fetch failed" }));
                throw new Error(errorData.detail || "Database connection error (Warranties)");
            }
            if (!profResponse.ok) {
                const errorData = await profResponse.json().catch(() => ({ detail: "Profile fetch failed" }));
                throw new Error(errorData.detail || "Database connection error (Profile)");
            }

            const warrData = await warrResponse.json();
            const profData = await profResponse.json();

            setWarranties(warrData || []);
            setProfile(profData || { photo_url: null });
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
        try {
            let token = localStorage.getItem('token');
            const currentUser = auth.currentUser;
            if (currentUser) token = await currentUser.getIdToken();

            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/warranty/profile-photo', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (!response.ok) throw new Error("Photo upload failed");

            const data = await response.json();
            setProfile(prev => ({ ...prev, photo_url: data.photo_url }));
        } catch (err) {
            setError(err.message);
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Perform irreversible asset deletion sequence?")) return;

        try {
            let token = localStorage.getItem('token');
            const currentUser = auth.currentUser;
            if (currentUser) token = await currentUser.getIdToken();

            const response = await fetch(`/api/warranty/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error("Deletion protocols failed");

            setWarranties(prev => prev.filter(item => item.id !== id));
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-12 pb-20">
            {/* Header Section */}
            <div className="border-b-4 border-[#eeeeee] pb-10 flex flex-col md:flex-row justify-between items-center md:items-end gap-8">
                <div className="flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
                    {/* User Avatar Section */}
                    <div className="relative group">
                        <div className="w-32 h-32 bg-[#111] border-4 border-[#eeeeee] flex items-center justify-center overflow-hidden shadow-[8px_8px_0px_0px_#1a1a1a]">
                            {profile.photo_url ? (
                                <img
                                    src={profile.photo_url}
                                    alt="Profile"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <UserIcon className="w-16 h-16 text-[#333]" />
                            )}
                            {uploading && (
                                <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                                    <ArrowPathIcon className="w-8 h-8 text-[#00f3ff] animate-spin" />
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute -bottom-2 -right-2 bg-[#00f3ff] text-black p-2 rounded-none border-2 border-black hover:bg-[#ccff00] transition-all shadow-[4px_4px_0px_0px_#1a1a1a]"
                            disabled={uploading}
                        >
                            <CameraIcon className="w-5 h-5" />
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handlePhotoUpload}
                            className="hidden"
                            accept="image/*"
                        />
                    </div>
                    <div>
                        <span className="text-[10px] font-black uppercase text-[#666] tracking-[0.5em] mb-2 block">System Profile</span>
                        <h1 className="text-5xl font-black uppercase tracking-tighter italic leading-none">
                            USER <span className="text-[#00f3ff]">HUB</span>
                        </h1>
                        <p className="text-[10px] font-mono text-[#444] mt-2">ID: {auth.currentUser?.uid?.substring(0, 12)}... // AUTH_OK</p>
                    </div>
                </div>
                <div className="text-right hidden md:block">
                    <p className="text-[10px] font-black uppercase text-[#444] mb-1 italic">Active Storage</p>
                    <p className="text-xs font-bold text-[#666]">SUPABASE_AUTH_ENABLED</p>
                </div>
            </div>

            {/* Prominent Scan Button */}
            <div className="flex justify-center md:justify-start">
                <button
                    onClick={() => navigate('/warranty')}
                    className="w-full md:w-auto bg-[#00f3ff] text-black px-12 py-6 font-black uppercase tracking-[0.2em] text-lg hover:bg-[#ccff00] transition-all flex items-center justify-center gap-4 shadow-[12px_12px_0px_0px_#1a1a1a] active:translate-x-1 active:translate-y-1 active:shadow-none border-4 border-black group"
                >
                    <PlusIcon className="w-8 h-8 group-hover:rotate-90 transition-transform" />
                    Scan New Warranty
                </button>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-950/20 border-2 border-red-500 p-4 flex items-center gap-4 text-red-500">
                    <ExclamationTriangleIcon className="w-6 h-6" />
                    <p className="font-black uppercase text-xs tracking-widest">{error}</p>
                    <button onClick={() => setError(null)} className="ml-auto underline text-[10px]">DISMISS</button>
                </div>
            )}

            {/* Warranty List Section */}
            <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-[#222] pb-4">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#eeeeee]">
                        <ClockIcon className="w-4 h-4 text-[#00f3ff]" />
                        My Saved Warranties
                    </div>
                    <span className="text-[10px] font-mono text-[#333] tracking-widest leading-none">TOTAL_RECORDS: {warranties.length}</span>
                </div>

                {loading ? (
                    <div className="py-24 text-center border-2 border-dashed border-[#222] bg-[#050505]">
                        <div className="inline-block w-12 h-12 border-[6px] border-[#222] border-t-[#00f3ff] animate-spin mb-6"></div>
                        <p className="font-black uppercase tracking-[0.3em] text-[#444]">Querying Datastream...</p>
                    </div>
                ) : warranties.length === 0 ? (
                    <div className="py-24 text-center border-2 border-dashed border-[#222] bg-[#0a0a0a]">
                        <ExclamationTriangleIcon className="w-16 h-16 text-[#1a1a1a] mx-auto mb-6" />
                        <p className="font-black uppercase tracking-[0.2em] text-[#444] mb-6 italic">No localized warranty data detected</p>
                        <button
                            onClick={() => navigate('/warranty')}
                            className="text-[#00f3ff] text-sm font-black uppercase tracking-widest hover:underline border-2 border-[#00f3ff] px-6 py-3 hover:bg-[#00f3ff] hover:text-black transition-all"
                        >
                            + Initialize Scan
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6">
                        {warranties.map((item) => {
                            const stats = calculateWarranty(item.extraction_data);
                            return (
                                <div
                                    key={item.id}
                                    onClick={() => setSelectedAsset(item)}
                                    className="group bg-[#0a0a0a] border-2 border-[#1a1a1a] hover:border-[#00f3ff] transition-all relative overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
                                >
                                    <div className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                                        <div className="flex gap-8 items-center flex-1">
                                            {/* Asset Thumbnail / Small Indicator */}
                                            <div className="relative w-20 h-20 shrink-0">
                                                <div className="w-20 h-20 bg-black border-2 border-[#1a1a1a] flex items-center justify-center shrink-0 group-hover:border-[#00f3ff] transition-colors relative overflow-hidden">
                                                    {item.image_url ? (
                                                        <img src={item.image_url} alt="Asset" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                                                    ) : (
                                                        <CheckBadgeIcon className="w-10 h-10 text-[#222] group-hover:text-[#00f3ff] transition-colors" />
                                                    )}
                                                </div>
                                                {/* Circular Indicator Overlay */}
                                                <div className="absolute -top-3 -right-3 w-10 h-10 bg-[#111] border-2 border-black rounded-full flex items-center justify-center shadow-lg transition-transform group-hover:scale-110">
                                                    <svg className="w-8 h-8 transform -rotate-90">
                                                        <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2" fill="transparent" className="text-[#1a1a1a]" />
                                                        <circle
                                                            cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2" fill="transparent"
                                                            strokeDasharray={88}
                                                            strokeDashoffset={88 - (88 * stats.percentage) / 100}
                                                            className={stats.isExpired ? 'text-[#ff4444]' : stats.percentage < 20 ? 'text-[#ff4444]' : stats.percentage < 50 ? 'text-[#ffbb00]' : 'text-[#00ff88]'}
                                                        />
                                                    </svg>
                                                    <span className={`absolute text-[7px] font-black ${stats.isExpired ? 'text-[#ff4444]' : 'text-white'}`}>
                                                        {stats.isExpired ? '!' : `${Math.round(stats.percentage)}%`}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex-1">
                                                <h3 className="text-2xl font-black uppercase text-[#eeeeee] group-hover:text-[#00f3ff] transition-colors leading-none mb-3 tracking-tight">
                                                    {item.extraction_data?.warranty_info?.product_name || 'Unidentified Unit'}
                                                </h3>
                                                <div className="flex flex-wrap gap-6 text-[10px] font-bold uppercase tracking-widest text-[#444]">
                                                    <span className="flex items-center gap-2 group-hover:text-[#666]">
                                                        <CalendarIcon className="w-4 h-4 text-[#00ff88]" />
                                                        {item.extraction_data?.warranty_info?.purchase_date || 'Unknown'}
                                                    </span>
                                                    <span className={`flex items-center gap-2 ${stats.color}`}>
                                                        <ClockIcon className="w-4 h-4" />
                                                        {stats.isExpired ? 'WARRANTY EXPIRED' : `${stats.daysLeft} DAYS LEFT`}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-8 w-full md:w-auto border-t md:border-t-0 border-[#1a1a1a] pt-6 md:pt-0">
                                            <div className="text-right hidden sm:block">
                                                <p className="text-[10px] font-black uppercase text-[#222] mb-1">Asset Serial</p>
                                                <p className="text-xs font-mono text-[#333] tracking-tighter">{item.id.substring(0, 8)}...</p>
                                            </div>
                                            <div className="flex flex-col items-end gap-3">
                                                <button
                                                    className="h-10 w-10 bg-[#111] border-2 border-[#222] flex items-center justify-center hover:bg-red-600 hover:text-white hover:border-red-600 transition-all text-[#333]"
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                                                    title="Purge Record"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                                    </svg>
                                                </button>
                                                <button
                                                    className="h-12 w-12 bg-[#111] border-2 border-[#222] flex items-center justify-center hover:bg-[#00f3ff] hover:text-black hover:border-[#00f3ff] transition-all group-hover:bg-[#1a1a1a]"
                                                    onClick={(e) => { e.stopPropagation(); navigate('/warranty', { state: { existingRecord: item } }); }}
                                                    title="Re-calibrate Data"
                                                >
                                                    <ArrowPathIcon className="w-6 h-6" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Bar */}
                                    <div className="px-6 pb-6 border-t border-[#111] pt-4 flex flex-col md:flex-row gap-8 bg-[#050505]/50 group-hover:bg-[#080808] transition-colors">
                                        <div className="grid grid-cols-2 md:grid-cols-2 gap-4 flex-1">
                                            {[
                                                { label: 'Status', val: stats.status },
                                                { label: 'Expiry Delta', val: stats.isExpired ? 'EXPIRED' : `${stats.daysLeft} days` }
                                            ].map((info, idx) => (
                                                <div key={idx}>
                                                    <p className="text-[8px] font-black text-[#333] uppercase tracking-widest mb-1">{info.label}</p>
                                                    <p className={`text-[10px] font-bold uppercase truncate ${info.label === 'Status' ? stats.color : 'text-[#666]'}`}>{info.val || '---'}</p>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="pt-1">
                                            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#00f3ff] flex items-center gap-2 group-hover:underline">
                                                View Details <ArrowRightIcon className="w-3 h-3" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal for Asset Inspection */}
            {selectedAsset && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/95 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-[#0a0a0a] border-4 border-black w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row shadow-[24px_24px_0px_0px_#111] relative">
                        {/* Close Button */}
                        <button
                            onClick={() => setSelectedAsset(null)}
                            className="absolute top-4 right-4 z-10 bg-red-600 text-white w-10 h-10 flex items-center justify-center font-black hover:bg-black transition-colors border-2 border-black"
                        >
                            ×
                        </button>

                        {/* Image Pane */}
                        <div className="flex-1 bg-black flex items-center justify-center min-h-[300px] border-r-2 border-[#1a1a1a]">
                            <img
                                src={selectedAsset.image_url}
                                alt="Full Document"
                                className="max-w-full max-h-full object-contain p-4"
                            />
                        </div>

                        {/* Details Pane */}
                        <div className="w-full md:w-[380px] p-8 flex flex-col bg-[#050505]">
                            <span className="text-[10px] font-black uppercase text-[#00f3ff] tracking-[0.5em] mb-4">Item Details</span>
                            <h2 className="text-3xl font-black uppercase text-white leading-tight mb-8">
                                {selectedAsset.extraction_data?.warranty_info?.product_name || 'Saved Warranty'}
                            </h2>

                            <div className="space-y-6 flex-1 overflow-y-auto scrollbar-hide">
                                {[
                                    { label: 'Brand', value: selectedAsset.extraction_data?.warranty_info?.brand },
                                    { label: 'Model', value: selectedAsset.extraction_data?.warranty_info?.model },
                                    { label: 'Serial Number', value: selectedAsset.extraction_data?.warranty_info?.serial_number },
                                    { label: 'Purchase Date', value: selectedAsset.extraction_data?.warranty_info?.purchase_date },
                                    { label: 'Period', value: selectedAsset.extraction_data?.warranty_info?.warranty_period },
                                    { label: 'Status', value: calculateWarranty(selectedAsset.extraction_data).status },
                                ].map((item, idx) => {
                                    const stats = calculateWarranty(selectedAsset.extraction_data);
                                    const isHighlight = item.label === 'Status' && stats.isExpired;
                                    return (
                                        <div key={idx} className={`border-l-2 pl-4 ${isHighlight ? 'border-red-500' : 'border-[#111]'}`}>
                                            <p className="text-[9px] font-black uppercase text-[#444] mb-1">{item.label}</p>
                                            <p className={`text-sm font-bold ${isHighlight ? 'text-red-500' : 'text-[#888]'}`}>{item.value || 'UNAVAILABLE'}</p>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="pt-8 mt-8 border-t border-[#111]">
                                <button
                                    onClick={() => navigate('/warranty', { state: { existingRecord: selectedAsset } })}
                                    className="w-full bg-[#eeeeee] text-black py-4 font-black uppercase tracking-widest hover:bg-[#ccff00] transition-colors flex items-center justify-center gap-2"
                                >
                                    <ArrowPathIcon className="w-5 h-5" />
                                    Recalibrate Data
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Legend */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-black uppercase tracking-[0.4em] text-[#222] pt-10 border-t border-[#111]">
                <span>System Encryption: active</span>
                <span>Security Protocol: AES-256</span>
                <span>Last Synced: {new Date().toLocaleTimeString()}</span>
            </div>
        </div>
    );
};

export default ProfilePage;
