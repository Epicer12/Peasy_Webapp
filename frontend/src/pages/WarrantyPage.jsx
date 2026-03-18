import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CloudArrowUpIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    CheckBadgeIcon,
    ExclamationTriangleIcon,
    CalendarIcon,
    PencilSquareIcon,
    ArrowPathIcon
} from '@heroicons/react/24/outline';
import { auth } from '../firebase';

const WarrantyPage = () => {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [finalizing, setFinalizing] = useState(false);
    const [result, setResult] = useState(null);
    const [editableData, setEditableData] = useState(null);
    const [error, setError] = useState(null);
    const [finalized, setFinalized] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [warrantyStats, setWarrantyStats] = useState({ percentage: 0, daysLeft: 0, status: 'calculating', completeness: 0 });
    const navigate = useNavigate();

    // Calculate warranty statistics as the user types
    // Calculate warranty statistics as the user types
    useEffect(() => {
        const calculateWarranty = () => {
            const info = editableData.warranty_info || {};

            // 1. Calculate Completeness
            const fields = [
                info.product_name,
                info.brand,
                info.model,
                info.purchase_date,
                info.warranty_period
            ];
            const filledFields = fields.filter(f => f && f !== "Not Detected" && f.trim() !== "").length;
            const completeness = (filledFields / fields.length) * 100;

            const purchaseDateStr = info.purchase_date;
            const periodStr = info.warranty_period;

            // Reset if data is missing or invalid for date calculation
            if (!purchaseDateStr || !periodStr || purchaseDateStr === "Not Detected" || periodStr === "Not Detected" || purchaseDateStr.trim() === "") {
                setWarrantyStats({ percentage: 0, daysLeft: 0, status: 'calculating', completeness });
                return;
            }

            try {
                const cleanDateStr = purchaseDateStr.replace(/[^\d\-\/]/g, ' ').trim().split(' ')[0];
                const purchaseDate = new Date(cleanDateStr);

                if (isNaN(purchaseDate.getTime())) {
                    setWarrantyStats({ percentage: 0, daysLeft: '?', status: 'calculating', completeness });
                    return;
                }

                let totalMonths = 0;
                const periodLower = periodStr.toLowerCase().replace(/[\s\-_]/g, '');
                const numMatch = periodLower.match(/\d+/);

                if (numMatch) {
                    const num = parseInt(numMatch[0]);
                    if (periodLower.includes('year') || periodLower.includes('yr')) {
                        totalMonths = num * 12;
                    } else if (periodLower.includes('month') || periodLower.includes('mo')) {
                        totalMonths = num;
                    } else if (num > 0) {
                        totalMonths = num;
                    }
                }

                if (totalMonths <= 0) {
                    setWarrantyStats({ percentage: 0, daysLeft: '?', status: 'calculating', completeness });
                    return;
                }

                const expiryDate = new Date(purchaseDate);
                expiryDate.setMonth(expiryDate.getMonth() + totalMonths);

                const today = new Date();
                const totalDurationTime = expiryDate.getTime() - purchaseDate.getTime();
                const remainingDurationTime = expiryDate.getTime() - today.getTime();

                const percentage = Math.max(0, Math.min(100, (remainingDurationTime / totalDurationTime) * 100));
                const daysLeft = Math.max(0, Math.floor(remainingDurationTime / (1000 * 60 * 60 * 24)));

                let status = '#00ff88'; // Green
                if (daysLeft <= 0) status = '#ff4444'; // Red
                else if (percentage < 20) status = '#ff4444'; // Red
                else if (percentage < 50) status = '#ffbb00'; // Amber/Yellow

                setWarrantyStats({
                    percentage: isNaN(percentage) ? 0 : percentage,
                    daysLeft: isNaN(daysLeft) ? 0 : daysLeft,
                    status,
                    completeness
                });
            } catch (e) {
                setWarrantyStats({ percentage: 0, daysLeft: '!', status: 'calculating', completeness });
            }
        };

        if (editableData) {
            calculateWarranty();
        }
    }, [editableData]);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile && selectedFile.type.startsWith('image/')) {
            setFile(selectedFile);
            setPreview(URL.createObjectURL(selectedFile));
            setError(null);
            setResult(null);
            setEditableData(null);
        } else {
            setError("Please select a valid image file.");
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setLoading(true);
        setError(null);
        setResult(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            let token = localStorage.getItem('token');
            const currentUser = auth.currentUser;
            if (currentUser) token = await currentUser.getIdToken();

            if (!token) throw new Error("User not authenticated. Please log in again.");

            const response = await fetch('/api/warranty/upload', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = 'Upload failed';
                try {
                    const errData = JSON.parse(errorText);
                    errorMessage = errData.detail || errorMessage;
                } catch (e) {
                    errorMessage = errorText || `Server error: ${response.status}`;
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();
            setResult(data);
            setEditableData(data.extraction);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleFinalize = async () => {
        if (!result || !editableData) return;

        setFinalizing(true);
        setError(null);

        try {
            let token = localStorage.getItem('token');
            const currentUser = auth.currentUser;
            if (currentUser) token = await currentUser.getIdToken();

            const response = await fetch('/api/warranty/finalize', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id: result.id,
                    extraction_data: editableData
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || "Finalization failed");
            }

            setFinalized(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setFinalizing(false);
        }
    };

    const updateField = (section, field, value) => {
        if (section) {
            setEditableData({
                ...editableData,
                [section]: {
                    ...editableData[section],
                    [field]: value
                }
            });
        } else {
            setEditableData({
                ...editableData,
                [field]: value
            });
        }
    };

    // Circular Progress Bar Component
    const CircularIndicator = ({ percentage, daysLeft, status, completeness }) => {
        const radius = 70;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (percentage / 100) * circumference;

        const colors = {
            calculating: '#1a1a1a'
        };

        const color = status === 'calculating' ? '#1a1a1a' : status;

        return (
            <div className="relative flex items-center justify-center w-56 h-56 mx-auto mt-8">
                <svg className="w-full h-full -rotate-90">
                    <circle
                        cx="112" cy="112" r={radius}
                        fill="transparent"
                        stroke="#0a0a0a"
                        strokeWidth="16"
                    />
                    <circle
                        cx="112" cy="112" r={radius + 8}
                        fill="transparent"
                        stroke="#111"
                        strokeWidth="4"
                    />
                    <circle
                        cx="112" cy="112" r={radius + 8}
                        fill="transparent"
                        stroke={completeness === 100 ? "#00f3ff" : "#333"}
                        strokeWidth="4"
                        strokeDasharray={2 * Math.PI * (radius + 8)}
                        strokeDashoffset={(2 * Math.PI * (radius + 8)) - (completeness / 100) * (2 * Math.PI * (radius + 8))}
                        className="transition-all duration-500 ease-out"
                        strokeLinecap="round"
                    />
                    <circle
                        cx="112" cy="112" r={radius}
                        fill="transparent"
                        stroke={color}
                        strokeWidth="16"
                        strokeDasharray={circumference}
                        strokeDashoffset={status === 'calculating' ? circumference : offset}
                        className={`transition-all duration-1000 ease-out`}
                        strokeLinecap="round"
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    {status === 'calculating' ? (
                        <>
                            <span className="text-4xl font-black text-[#222] leading-none">{Math.round(completeness)}%</span>
                            <span className="text-[9px] font-black uppercase text-[#444] tracking-widest mt-1">Ready to sync</span>
                        </>
                    ) : (
                        <>
                            <span className="text-5xl font-black text-white leading-none tracking-tighter">{daysLeft}</span>
                            <span className={`text-[10px] font-black uppercase tracking-widest mt-1 italic ${status === '#ff4444' ? 'text-red-500' : 'text-[#666]'}`}>
                                {daysLeft <= 0 ? 'Warranty Expired' : 'Days remaining'}
                            </span>
                        </>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8 pb-20">
            <div className="border-4 border-[#eeeeee] p-8 bg-[#0a0a0a] shadow-[12px_12px_0px_0px_#1a1a1a] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#00f3ff]/5 blur-3xl rounded-full -mr-16 -mt-16"></div>

                <h1 className="text-4xl font-black mb-8 uppercase tracking-tighter italic">Warranty <span className="text-[#00f3ff]">Scanner</span></h1>

                {!result ? (
                    <div className="space-y-6">
                        <div className={`
                            border-2 border-dashed border-[#222] p-16 text-center transition-all duration-300 group
                            ${preview ? 'border-[#00f3ff] bg-[#00f3ff]/5' : 'hover:border-[#eeeeee]/30'}
                        `}>
                            {preview ? (
                                <div className="relative inline-block">
                                    <img src={preview} alt="Preview" className="max-h-72 border-2 border-[#eeeeee] shadow-[8px_8px_0px_0px_rgba(0,243,255,0.3)]" />
                                    <button
                                        onClick={() => { setFile(null); setPreview(null); }}
                                        className="absolute -top-3 -right-3 bg-red-600 text-white w-8 h-8 flex items-center justify-center font-black hover:scale-110 transition-transform"
                                    >
                                        ×
                                    </button>
                                </div>
                            ) : (
                                <label className="cursor-pointer block">
                                    <div className="bg-[#1a1a1a] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-[#00f3ff] transition-colors">
                                        <CloudArrowUpIcon className="w-8 h-8 text-[#555] group-hover:text-black" />
                                    </div>
                                    <p className="text-sm font-black uppercase tracking-[0.2em] text-[#eeeeee]">Drop Proof Image</p>
                                    <p className="text-[10px] text-[#666] mt-2 uppercase">PNG, JPG up to 10MB</p>
                                    <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
                                </label>
                            )}
                        </div>

                        {file && !loading && (
                            <button
                                onClick={handleUpload}
                                className="w-full bg-[#eeeeee] text-black py-5 font-black uppercase tracking-[0.3em] hover:bg-[#00f3ff] transform hover:-translate-y-1 hover:shadow-[0_10px_20px_-10px_rgba(0,243,255,0.5)] transition-all flex items-center justify-center gap-3"
                            >
                                <ArrowPathIcon className="w-5 h-5" />
                                Start Extraction
                            </button>
                        )}

                        {loading && (
                            <div className="text-center py-12 bg-[#111] border border-[#222]">
                                <div className="inline-block w-12 h-12 border-4 border-t-transparent border-[#00f3ff] animate-spin mb-6"></div>
                                <p className="font-black tracking-[0.4em] text-[#00f3ff] animate-pulse">AI ANALYZING...</p>
                            </div>
                        )}
                    </div>
                ) : finalized ? (
                    <div className="py-20 text-center animate-in zoom-in-95 duration-500">
                        <div className="w-24 h-24 bg-[#00f3ff] text-black flex items-center justify-center mx-auto mb-8 shadow-[12px_12px_0px_0px_#111]">
                            <CheckBadgeIcon className="w-16 h-16" />
                        </div>
                        <h2 className="text-5xl font-black uppercase tracking-tighter mb-4 italic leading-tight">Warranty <span className="text-[#00f3ff]">Successfully Saved!</span></h2>
                        <p className="text-xs font-bold text-[#666] uppercase tracking-[0.3em] mb-12">Your warranty details are now in your User Hub.</p>

                        <button
                            onClick={() => navigate('/profile')}
                            className="w-full bg-[#00f3ff] text-black py-6 font-black uppercase tracking-[0.4em] text-lg hover:bg-[#ccff00] transition-all shadow-[12px_12px_0px_0px_#111] border-4 border-black active:translate-x-1 active:translate-y-1 active:shadow-none"
                        >
                            Go to User Hub
                        </button>
                    </div>
                ) : (
                    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {/* Hero Indicator */}
                        <div className="text-center space-y-4">
                            <CircularIndicator {...warrantyStats} />
                            <div className="pt-2">
                                <h2 className="text-2xl font-black uppercase text-white truncate px-4">
                                    {editableData.warranty_info?.product_name || 'Generic Product'}
                                </h2>
                                <p className="text-[10px] text-[#666] font-bold uppercase tracking-widest mt-1">Status: {warrantyStats.status === 'calculating' ? 'Pending Input' : 'Active Warranty'}</p>
                            </div>
                        </div>

                        {/* Editable Form */}
                        <div className="border-t border-[#1a1a1a] pt-8 space-y-6">
                            <h3 className="text-xs font-black uppercase tracking-widest text-[#444] flex items-center gap-2">
                                <PencilSquareIcon className="w-4 h-4" />
                                Review Extracted Details
                            </h3>

                            <div className="grid grid-cols-1 gap-4">
                                {/* Product Name */}
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase text-[#666]">Product Name</label>
                                    <input
                                        type="text"
                                        value={editableData.warranty_info?.product_name || ''}
                                        onChange={(e) => updateField('warranty_info', 'product_name', e.target.value)}
                                        className="w-full bg-[#111] border border-[#222] p-3 text-sm font-bold text-white focus:border-[#00f3ff] outline-none transition-colors"
                                        placeholder="Enter product name"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {/* Purchase Date */}
                                    <div className="space-y-1">
                                        <label className={`text-[9px] font-black uppercase ${(!editableData.warranty_info?.purchase_date || editableData.warranty_info.purchase_date === "Not Detected") ? 'text-red-500' : 'text-[#666]'}`}>
                                            Purchase Date {(!editableData.warranty_info?.purchase_date || editableData.warranty_info.purchase_date === "Not Detected") && '(!)'}
                                        </label>
                                        <input
                                            type="text"
                                            value={editableData.warranty_info?.purchase_date === "Not Detected" ? "" : (editableData.warranty_info?.purchase_date || '')}
                                            onChange={(e) => updateField('warranty_info', 'purchase_date', e.target.value)}
                                            className="w-full bg-[#111] border border-[#222] p-3 text-sm font-bold text-white focus:border-[#00f3ff] outline-none transition-colors"
                                            placeholder="YYYY-MM-DD"
                                        />
                                    </div>
                                    {/* Period */}
                                    <div className="space-y-1">
                                        <label className={`text-[9px] font-black uppercase ${(!editableData.warranty_info?.warranty_period || editableData.warranty_info.warranty_period === "Not Detected") ? 'text-red-500' : 'text-[#666]'}`}>
                                            Period {(!editableData.warranty_info?.warranty_period || editableData.warranty_info.warranty_period === "Not Detected") && '(!)'}
                                        </label>
                                        <input
                                            type="text"
                                            value={editableData.warranty_info?.warranty_period === "Not Detected" ? "" : (editableData.warranty_info?.warranty_period || '')}
                                            onChange={(e) => updateField('warranty_info', 'warranty_period', e.target.value)}
                                            className="w-full bg-[#111] border border-[#222] p-3 text-sm font-bold text-white focus:border-[#00f3ff] outline-none transition-colors"
                                            placeholder="e.g. 1 year"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Collapsible Details */}
                        <div className="bg-[#111]/50 border border-[#1a1a1a]">
                            <button
                                onClick={() => setShowDetails(!showDetails)}
                                className="w-full p-4 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-[#666] hover:text-[#eeeeee] transition-colors"
                            >
                                <span className="flex items-center gap-2">
                                    <CalendarIcon className="w-4 h-4" />
                                    Advanced Metadata
                                </span>
                                {showDetails ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                            </button>

                            {showDetails && (
                                <div className="p-6 pt-0 space-y-4 animate-in fade-in duration-300">
                                    <div className="grid grid-cols-2 gap-6 text-[11px]">
                                        <div>
                                            <p className="text-[#444] uppercase font-black mb-1">Customer Name</p>
                                            <input
                                                type="text"
                                                value={editableData.user_name || ''}
                                                onChange={(e) => updateField(null, 'user_name', e.target.value)}
                                                className="w-full bg-transparent border-b border-[#222] py-1 text-white font-bold outline-none focus:border-[#00f3ff]"
                                                placeholder="Not Detected"
                                            />
                                        </div>
                                        <div>
                                            <p className="text-[#444] uppercase font-black mb-1">Customer ID</p>
                                            <input
                                                type="text"
                                                value={editableData.user_id || ''}
                                                onChange={(e) => updateField(null, 'user_id', e.target.value)}
                                                className="w-full bg-transparent border-b border-[#222] py-1 text-white font-bold outline-none focus:border-[#00f3ff]"
                                                placeholder="Not Detected"
                                            />
                                        </div>
                                        <div>
                                            <p className="text-[#444] uppercase font-black mb-1">Created At</p>
                                            <p className="py-1 text-[#666] font-mono">{new Date().toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <div className="pt-2">
                                        <p className="text-[#444] text-[10px] uppercase font-black mb-1">Additional Details</p>
                                        <textarea
                                            value={editableData.warranty_info?.additional_details || ''}
                                            onChange={(e) => updateField('warranty_info', 'additional_details', e.target.value)}
                                            className="w-full bg-black/30 border border-[#222] p-2 text-[10px] text-[#888] font-bold outline-none h-16 focus:border-[#00f3ff]"
                                            placeholder="No additional details detected"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-4 pt-4">
                            <button
                                onClick={() => { setFile(null); setPreview(null); setResult(null); }}
                                className="flex-1 bg-transparent border-2 border-[#222] text-[#666] py-4 font-black uppercase tracking-widest hover:text-white hover:border-[#444] transition-all"
                            >
                                Discard
                            </button>
                            <button
                                onClick={handleFinalize}
                                disabled={finalizing}
                                className="flex-[2] bg-[#00f3ff] text-black py-4 font-black uppercase tracking-[0.2em] hover:bg-[#ccff00] transform active:scale-95 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_-5px_rgba(0,243,255,0.4)]"
                            >
                                {finalizing ? (
                                    <>
                                        <ArrowPathIcon className="w-5 h-5 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <CheckBadgeIcon className="w-5 h-5" />
                                        Finalize & Sync
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="mt-8 bg-red-900/10 border border-red-900/50 p-4 flex items-center gap-3 text-red-500 font-bold uppercase text-[10px] tracking-tight">
                        <ExclamationTriangleIcon className="w-4 h-4 shrink-0" />
                        <div className="flex flex-col">
                            <span>ERROR: {error}</span>
                            {error.includes("MIME type") && (
                                <span className="text-[8px] opacity-70 mt-1">TIP: Check your Supabase Storage Bucket settings to allow all MIME types.</span>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Hint Card */}
            <div className="bg-[#00f3ff] p-4 flex items-center gap-4 shadow-[8px_8px_0px_0px_rgba(0,243,255,0.1)]">
                <div className="bg-black text-[#00f3ff] w-10 h-10 flex items-center justify-center font-black">?</div>
                <div className="text-black leading-none">
                    <p className="font-black uppercase text-xs tracking-tight">Need Help?</p>
                    <p className="text-[10px] font-bold opacity-80 mt-1">Make sure the purchase date is in YYYY-MM-DD format for live calculation.</p>
                </div>
            </div>
        </div>
    );
};

export default WarrantyPage;
