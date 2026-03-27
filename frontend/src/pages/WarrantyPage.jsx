import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
import { TrashIcon, PencilIcon } from '@heroicons/react/24/solid';
import { getWarranties } from '../services/warrantyService';
import { API_BASE_URL } from '../utils/apiClient';

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
    const location = useLocation();
    const [savedWarranties, setSavedWarranties] = useState([]);
    const [fetchingSaved, setFetchingSaved] = useState(false);

    // Initial Load & State Check
    useEffect(() => {
        fetchSavedWarranties();

        // Check if we came from another page with a record to edit
        if (location.state?.existingRecord) {
            const record = location.state.existingRecord;
            setResult({ id: record.id, image_url: record.image_url });
            setEditableData(record.extraction_data);
            window.scrollTo(0, 0);
        }
    }, [location.state]);

    const fetchSavedWarranties = async () => {
        setFetchingSaved(true);
        try {
            const data = await getWarranties();
            // We need the raw data for editing, but getWarranties returns transformed data.
            // Let's call the API directly to get the full records.
            let token = localStorage.getItem('token');
            const currentUser = auth.currentUser;
            if (currentUser) token = await currentUser.getIdToken();

            const response = await fetch(`${API_BASE_URL}/api/warranty/list`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const fullData = await response.json();
                setSavedWarranties(fullData || []);
            }
        } catch (err) {
            console.error("Failed to fetch saved warranties", err);
        } finally {
            setFetchingSaved(false);
        }
    };

    const handleDeleteRecord = async (e, id) => {
        e.stopPropagation();
        if (!window.confirm("Delete this warranty record?")) return;

        try {
            let token = localStorage.getItem('token');
            const currentUser = auth.currentUser;
            if (currentUser) token = await currentUser.getIdToken();

            const response = await fetch(`${API_BASE_URL}/api/warranty/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                setSavedWarranties(prev => prev.filter(w => w.id !== id));
                if (result?.id === id) {
                    setResult(null);
                    setEditableData(null);
                }
            }
        } catch (err) {
            alert("Deletion failed");
        }
    };

    const handleSelectForEdit = (record) => {
        setResult({ id: record.id, image_url: record.image_url });
        setEditableData(record.extraction_data);
        setFinalized(false);
        window.scrollTo(0, 0);
    };

    const calculateWarranty = useCallback(() => {
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
    }, [editableData]);

    // Calculate warranty statistics as the user types
    useEffect(() => {
        if (editableData) {
            calculateWarranty();
        }
    }, [editableData, calculateWarranty]);

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

            const response = await fetch(`${API_BASE_URL}/api/warranty/upload`, {
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

            const response = await fetch(`${API_BASE_URL}/api/warranty/finalize`, {
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
            fetchSavedWarranties(); // Refresh the list
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
        const radius = 55;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (percentage / 100) * circumference;
        const color = status === 'calculating' ? '#1a1a1a' : status;

        return (
            <div className="relative flex items-center justify-center w-full h-full">
                <svg className="w-full h-full -rotate-90 drop-shadow-[0_0_20px_rgba(0,0,0,0.6)] overflow-visible">
                    {/* Background Orbit */}
                    <circle
                        cx="50%" cy="50%" r={radius}
                        fill="transparent"
                        stroke="#0a0a0a"
                        strokeWidth="12"
                    />
                    {/* Outer Thin Ring (Completeness) */}
                    <circle
                        cx="50%" cy="50%" r={radius + 11}
                        fill="transparent"
                        stroke="#111"
                        strokeWidth="1.5"
                    />
                    <circle
                        cx="50%" cy="50%" r={radius + 11}
                        fill="transparent"
                        stroke={completeness === 100 ? "var(--color-neon-blue)" : "#222"}
                        strokeWidth="1.5"
                        strokeDasharray={2 * Math.PI * (radius + 11)}
                        strokeDashoffset={(2 * Math.PI * (radius + 11)) - (completeness / 100) * (2 * Math.PI * (radius + 11))}
                        className="transition-all duration-700 ease-out"
                        strokeLinecap="round"
                    />
                    {/* Main Progress Ring (Warranty Level) */}
                    <circle
                        cx="50%" cy="50%" r={radius}
                        fill="transparent"
                        stroke={color}
                        strokeWidth="12"
                        strokeDasharray={circumference}
                        strokeDashoffset={status === 'calculating' ? circumference : offset}
                        className="transition-all duration-1000 ease-in-out"
                        strokeLinecap="round"
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    {status === 'calculating' ? (
                        <>
                            <span className="text-3xl font-black text-[#222] leading-none">{Math.round(completeness)}%</span>
                            <span className="text-[7px] font-black uppercase text-[#444] tracking-widest mt-1">META_READY</span>
                        </>
                    ) : (
                        <>
                            <span className="text-4xl font-black text-white leading-none tracking-tighter">{daysLeft}</span>
                            <span className={`text-[8px] font-black uppercase tracking-[0.2em] mt-1 ${status === '#ff4444' ? 'text-red-500' : 'text-[#666]'}`}>
                                {daysLeft <= 0 ? 'STATUS_EXPIRED' : 'DAYS_SYNCED'}
                            </span>
                        </>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-7xl mx-auto px-6 md:px-12 pb-20 relative z-10">
            {/* Title Section */}
            <div className="border-b-2 border-[#333] pb-6 mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div className="flex-grow">
                    <h1 className="text-4xl md:text-6xl font-black text-[#eeeeee] tracking-tighter uppercase leading-none">
                        WARRANTY_<span className="text-[var(--color-neon-blue)]">VAULT</span>
                    </h1>
                    <p className="text-sm font-mono text-[#666] mt-3 uppercase tracking-widest leading-none">
                        // DOCUMENT_EXTRACTION // LIFECYCLE_TRACKING // SYNCED_STORAGE
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                {/* Left Column: Command Center (Scanner & Form) */}
                <div className="lg:col-span-7 space-y-8">
                    <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-8 relative overflow-hidden group/scanner">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-neon-blue)]/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover/scanner:bg-[var(--color-neon-blue)]/10 transition-colors"></div>
                        
                        <div className="flex items-center gap-2 text-[var(--color-neon-blue)] text-[10px] font-mono-tech mb-6 tracking-[0.2em] uppercase">
                            <span className="w-2 h-2 bg-[var(--color-neon-blue)] animate-pulse"></span> SCANNER_ACTIVE
                        </div>

                        {!result ? (
                            <div className="space-y-6">
                                <div className={`
                                    border-2 border-dashed border-[#222] p-16 text-center transition-all duration-300 group
                                    ${preview ? 'border-[var(--color-neon-blue)] bg-[var(--color-neon-blue)]/5' : 'hover:border-[#eeeeee]/30'}
                                `}>
                                    {preview ? (
                                        <div className="relative inline-block">
                                            <img src={preview} alt="Preview" className="max-h-72 border-2 border-[#333] shadow-[0_0_30px_rgba(0,243,255,0.1)]" />
                                            <button
                                                onClick={() => { setFile(null); setPreview(null); }}
                                                className="absolute -top-3 -right-3 bg-red-600 text-white w-8 h-8 flex items-center justify-center font-black hover:scale-110 transition-transform shadow-lg"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="cursor-pointer block">
                                            <div className="bg-[#1a1a1a] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-[var(--color-neon-blue)] transition-colors">
                                                <CloudArrowUpIcon className="w-8 h-8 text-[#555] group-hover:text-black" />
                                            </div>
                                            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#eeeeee]">Drop Proof Image</p>
                                            <p className="text-[10px] text-[#666] mt-2 uppercase underline underline-offset-4 decoration-[#333]">PNG, JPG up to 10MB</p>
                                            <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
                                        </label>
                                    )}
                                </div>

                                {file && !loading && (
                                    <button
                                        onClick={handleUpload}
                                        className="w-full bg-[#111] border-2 border-[#222] text-[#eeeeee] py-5 font-black uppercase tracking-[0.3em] hover:border-[var(--color-neon-blue)] hover:text-[var(--color-neon-blue)] transition-all flex items-center justify-center gap-3 group"
                                    >
                                        <ArrowPathIcon className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                                        RECALIBRATOR
                                    </button>
                                )}

                                {loading && (
                                    <div className="text-center py-12 bg-black/40 border border-[#222]">
                                        <div className="inline-block w-12 h-12 border-4 border-t-transparent border-[var(--color-neon-blue)] animate-spin mb-6"></div>
                                        <p className="font-black tracking-[0.4em] text-[var(--color-neon-blue)] animate-pulse">AI_DECRYPTING_SYSTEM...</p>
                                    </div>
                                )}
                            </div>
                        ) : finalized ? (
                            <div className="py-20 text-center animate-in zoom-in-95 duration-500">
                                <div className="w-24 h-24 bg-[var(--color-neon-blue)] text-black flex items-center justify-center mx-auto mb-8 shadow-[0_0_30px_rgba(0,243,255,0.3)]">
                                    <CheckBadgeIcon className="w-16 h-16" />
                                </div>
                                <h2 className="text-4xl font-black uppercase tracking-tighter mb-4 leading-none">VAULT_<span className="text-[var(--color-neon-blue)]">LOCKED</span></h2>
                                <p className="text-xs font-bold text-[#666] uppercase tracking-[0.3em] mb-12">DEK_KEY_SYNC_SUCCESSFUL</p>

                                <button
                                    onClick={() => navigate('/profile')}
                                    className="w-full bg-[var(--color-neon-blue)] text-black py-4 font-black uppercase tracking-[0.4em] text-sm hover:bg-white transition-all shadow-[0_0_20px_rgba(0,243,255,0.15)]"
                                >
                                    ACCESS_PROFILE_VAULT
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                {/* Hero Indicator */}
                                <div className="flex items-center gap-8 py-2">
                                    <div className="w-36 h-36 shrink-0">
                                        <CircularIndicator {...warrantyStats} />
                                    </div>
                                    <div className="flex-grow">
                                        <h2 className="text-xl font-black uppercase text-white truncate max-w-[300px]">
                                            {editableData.warranty_info?.product_name || 'Generic Product'}
                                        </h2>
                                        <p className="text-[10px] text-[#666] font-bold uppercase tracking-widest mt-1">
                                            Status: <span className={warrantyStats.status === 'calculating' ? 'text-[#444]' : 'text-[var(--color-neon-blue)]'}>
                                                {warrantyStats.status === 'calculating' ? 'WAITING_FOR_DATA' : 'DATA_EXTRACTED'}
                                            </span>
                                        </p>
                                    </div>
                                </div>

                                {/* Editable Form */}
                                <div className="space-y-6">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#444] border-b border-[#1a1a1a] pb-2 flex items-center gap-2">
                                        <PencilSquareIcon className="w-4 h-4" />
                                        MANUAL_OVERRIDE
                                    </h3>

                                    <div className="grid grid-cols-1 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase text-[#666] tracking-[0.1em]">UNIT_DESIGNATION</label>
                                            <input
                                                type="text"
                                                value={editableData.warranty_info?.product_name || ''}
                                                onChange={(e) => updateField('warranty_info', 'product_name', e.target.value)}
                                                className="w-full bg-[#050505] border border-[#222] p-4 text-sm font-bold text-white focus:border-[var(--color-neon-blue)] outline-none transition-all uppercase"
                                                placeholder="Enter product name"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className={`text-[9px] font-black uppercase tracking-[0.1em] ${(!editableData.warranty_info?.purchase_date || editableData.warranty_info.purchase_date === "Not Detected") ? 'text-red-500' : 'text-[#666]'}`}>
                                                    INITIAL_PURCHASE {(!editableData.warranty_info?.purchase_date || editableData.warranty_info.purchase_date === "Not Detected") && '(REQ)'}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={editableData.warranty_info?.purchase_date === "Not Detected" ? "" : (editableData.warranty_info?.purchase_date || '')}
                                                    onChange={(e) => updateField('warranty_info', 'purchase_date', e.target.value)}
                                                    className="w-full bg-[#050505] border border-[#222] p-4 text-sm font-bold text-white focus:border-[var(--color-neon-blue)] outline-none transition-all"
                                                    placeholder="YYYY-MM-DD"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className={`text-[9px] font-black uppercase tracking-[0.1em] ${(!editableData.warranty_info?.warranty_period || editableData.warranty_info.warranty_period === "Not Detected") ? 'text-red-500' : 'text-[#666]'}`}>
                                                    DURATION_CYCLE {(!editableData.warranty_info?.warranty_period || editableData.warranty_info.warranty_period === "Not Detected") && '(REQ)'}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={editableData.warranty_info?.warranty_period === "Not Detected" ? "" : (editableData.warranty_info?.warranty_period || '')}
                                                    onChange={(e) => updateField('warranty_info', 'warranty_period', e.target.value)}
                                                    className="w-full bg-[#050505] border border-[#222] p-4 text-sm font-bold text-white focus:border-[var(--color-neon-blue)] outline-none transition-all"
                                                    placeholder="e.g. 1 year"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Advanced Metadata Section */}
                                <div className="bg-black/20 border border-[#1a1a1a] rounded-sm">
                                    <button
                                        onClick={() => setShowDetails(!showDetails)}
                                        className="w-full p-4 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-[#555] hover:text-[#eeeeee] transition-all"
                                    >
                                        <span className="flex items-center gap-2">
                                            <CalendarIcon className="w-4 h-4" />
                                            CORE_METADATA_STREAM
                                        </span>
                                        {showDetails ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                                    </button>

                                    {showDetails && (
                                        <div className="p-6 pt-0 space-y-6 animate-in fade-in duration-300">
                                            <div className="grid grid-cols-2 gap-8">
                                                <div className="space-y-2">
                                                    <p className="text-[#444] text-[9px] uppercase font-black tracking-widest">ENTITY_NAME</p>
                                                    <input
                                                        type="text"
                                                        value={editableData.user_name || ''}
                                                        onChange={(e) => updateField(null, 'user_name', e.target.value)}
                                                        className="w-full bg-transparent border-b border-[#222] py-2 text-xs font-bold text-white outline-none focus:border-[var(--color-neon-blue)] transition-colors"
                                                        placeholder="Not Detected"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <p className="text-[#444] text-[9px] uppercase font-black tracking-widest">UNIQUE_ID</p>
                                                    <input
                                                        type="text"
                                                        value={editableData.user_id || ''}
                                                        onChange={(e) => updateField(null, 'user_id', e.target.value)}
                                                        className="w-full bg-transparent border-b border-[#222] py-2 text-xs font-bold text-white outline-none focus:border-[var(--color-neon-blue)] transition-colors"
                                                        placeholder="Not Detected"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <p className="text-[#444] text-[9px] uppercase font-black tracking-widest">OBSERVATIONS</p>
                                                <textarea
                                                    value={editableData.warranty_info?.additional_details || ''}
                                                    onChange={(e) => updateField('warranty_info', 'additional_details', e.target.value)}
                                                    className="w-full bg-black/40 border border-[#222] p-4 text-[10px] text-[#888] font-bold outline-none h-24 focus:border-[var(--color-neon-blue)] resize-none transition-all"
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
                                        className="flex-1 bg-transparent border border-[#222] text-[#444] py-4 text-[11px] font-black uppercase tracking-[0.2em] hover:text-white hover:border-[#444] transition-all"
                                    >
                                        DISCARD_CHANGES
                                    </button>
                                    <button
                                        onClick={handleFinalize}
                                        disabled={finalizing}
                                        className="flex-[2] bg-[var(--color-neon-blue)] text-black py-4 text-[11px] font-black uppercase tracking-[0.3em] hover:bg-white active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,243,255,0.1)]"
                                    >
                                        {finalizing ? (
                                            <>
                                                <ArrowPathIcon className="w-5 h-5 animate-spin" />
                                                SYNCING...
                                            </>
                                        ) : (
                                            <>
                                                <CheckBadgeIcon className="w-5 h-5" />
                                                LOCKING_IN_DATA
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="mt-8 bg-red-900/10 border border-red-500/50 p-4 flex items-start gap-4 text-red-500 font-bold uppercase text-[10px] tracking-tight">
                                <ExclamationTriangleIcon className="w-5 h-5 shrink-0" />
                                <div className="flex flex-col gap-1">
                                    <span className="text-xs font-black">CRITICAL_ERROR</span>
                                    <span className="opacity-80">{error}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Notification Card */}
                    <div className="bg-[#ccff00] p-6 flex items-center gap-6 border border-black/10">
                        <div className="bg-black text-[#ccff00] w-12 h-12 shrink-0 flex items-center justify-center font-black text-xl">!</div>
                        <div className="text-black">
                            <p className="font-black uppercase text-xs tracking-widest leading-none">Protocol Hint</p>
                            <p className="text-[10px] font-bold opacity-80 mt-1 leading-relaxed">System requires YYYY-MM-DD format for valid lifecycle calculations.</p>
                        </div>
                    </div>
                </div>

                {/* Right Column: Database / Vault Section */}
                <div className="lg:col-span-5 space-y-8">
                    <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-8">
                        <div className="flex items-center justify-between border-b border-[#1a1a1a] pb-6 mb-8">
                            <div className="space-y-1">
                                <h2 className="text-xl font-black text-white uppercase tracking-tighter">VAULT_<span className="text-[var(--color-neon-blue)]">RECORDS</span></h2>
                                <p className="text-[9px] font-mono text-[#444] tracking-[0.3em] uppercase">SYSTEM_INDEX: {savedWarranties.length}</p>
                            </div>
                        </div>

                        {fetchingSaved ? (
                            <div className="py-20 text-center bg-black/20 border-2 border-[#1a1a1a] border-dashed">
                                <div className="inline-block w-10 h-10 border-2 border-t-transparent border-[#444] animate-spin mb-4"></div>
                                <p className="text-[10px] font-black text-[#333] tracking-[0.4em] uppercase">LOCATING_RECORDS...</p>
                            </div>
                        ) : savedWarranties.length === 0 ? (
                            <div className="py-20 text-center bg-black/20 border-2 border-[#1a1a1a] border-dashed">
                                <p className="text-[10px] font-black text-[#222] tracking-widest uppercase italic">VAULT_EMPTY // NO_RECORDS_LOGGED</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
                                {savedWarranties.map((w) => {
                                    const info = w.extraction_data?.warranty_info || {};
                                    const isSelected = result?.id === w.id;
                                    
                                    return (
                                        <div
                                            key={w.id}
                                            onClick={() => handleSelectForEdit(w)}
                                            className={`
                                                group bg-[#0a0a0a] border p-4 flex items-center gap-6 cursor-pointer transition-all duration-300
                                                ${isSelected ? 'border-[var(--color-neon-blue)] shadow-[0_0_15px_rgba(0,243,255,0.05)]' : 'border-[#1a1a1a] hover:border-[#333]'}
                                            `}
                                        >
                                            <div className="w-14 h-14 bg-black flex items-center justify-center shrink-0 border border-[#1a1a1a] relative overflow-hidden">
                                                {w.image_url ? (
                                                    <img src={w.image_url} alt="Item" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500" />
                                                ) : (
                                                    <CheckBadgeIcon className="w-8 h-8 text-[#1a1a1a] " />
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-xs font-black uppercase text-[#888] group-hover:text-white truncate transition-colors">
                                                    {info.product_name || 'Generic Product'}
                                                </h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[8px] font-mono text-[#444] uppercase tracking-widest">ID: {w.id.substring(0, 8)}</span>
                                                    <span className="w-1 h-1 bg-[#222] rounded-full"></span>
                                                    <span className="text-[8px] font-mono text-[#00f3ff] uppercase tracking-widest">ACTIVE</span>
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-2 items-end">
                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleSelectForEdit(w); }}
                                                        className="p-2 bg-[#111] text-[#444] hover:text-[var(--color-neon-blue)] transition-colors"
                                                        title="Load Record"
                                                    >
                                                        <PencilIcon className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleDeleteRecord(e, w.id)}
                                                        className="p-2 bg-[#111] text-[#444] hover:text-red-500 transition-colors"
                                                        title="Archive Record"
                                                    >
                                                        <TrashIcon className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Stats Panel */}
                    <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-8 space-y-6">
                        <div className="text-[10px] font-black text-[var(--color-neon-blue)] uppercase tracking-[0.3em] border-b border-[#1a1a1a] pb-4">VAULT_METRICS</div>
                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-1">
                                <p className="text-[9px] text-[#444] uppercase font-black">ACTIVE_PROTECTION</p>
                                <p className="text-2xl font-black text-white">{savedWarranties.length}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[9px] text-[#444] uppercase font-black">SYNC_STATUS</p>
                                <p className="text-2xl font-black text-[#ccff00]">OPTIMAL</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WarrantyPage;
