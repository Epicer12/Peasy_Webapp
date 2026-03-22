import React, { useState, useEffect, useRef, useCallback } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const WS_BASE_URL = API_BASE_URL.replace(/^http/, "ws");

const asusCodes = [
    { code: "Fast Flash", prob: "No Memory or Memory Error" },
    { code: "Slow Flash", prob: "No VGA/Graphics Error" },
    { code: "Super Slow Flash", prob: "No Boot Device" },
    { code: "CPU LED", prob: "No CPU or CPU Faulty" },
    { code: "DRAM LED", prob: "No Memory or Memory Faulty" },
    { code: "VGA LED", prob: "No Graphics Card detected" },
    { code: "BOOT LED", prob: "No Bootable Drive found" }
];

const TroubleshootPage = () => {
    // viewMode: 'config' | 'dashboard'
    const [viewMode, setViewMode] = useState('config');
    const [brands, setBrands] = useState([]);
    const [selectedBrand, setSelectedBrand] = useState('');
    const [method, setMethod] = useState('');
    const [manualCode, setManualCode] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [aiAnalysis, setAiAnalysis] = useState({ deepDive: '', fixGuide: '' });
    const [aiLoading, setAiLoading] = useState({ deepDive: false, fixGuide: false });
    const [errorPopup, setErrorPopup] = useState({ show: false, message: '' });

    // Camera/WebSocket State
    const [cameraOn, setCameraOn] = useState(false);
    const [streamStatus, setStreamStatus] = useState('offline');
    const [calibrationProgress, setCalibrationProgress] = useState(0);
    const [blinkCount, setBlinkCount] = useState(0);
    const [partialPattern, setPartialPattern] = useState([]);
    const [lastBrightness, setLastBrightness] = useState(0);
    const [streamState, setStreamState] = useState('OFF');

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const wsRef = useRef(null);
    const panelRef = useRef(null);

    useEffect(() => {
        fetch(`${API_BASE_URL}/api/troubleshoot/brands`)
            .then(res => res.json())
            .then(data => setBrands(data))
            .catch(err => console.error("Error fetching brands:", err));
    }, []);

    const handleManualAnalyze = async () => {
        if (!selectedBrand || !manualCode) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/troubleshoot/diagnose/manual`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ brand: selectedBrand, code: manualCode })
            });
            const data = await res.json();
            if (res.ok) {
                setResult(data);
                setViewMode('dashboard');
                window.scrollTo(0, 0);
            } else {
                setErrorPopup({ show: true, message: data.detail || "Diagnostic pattern mismatch detected." });
            }
        } catch (err) {
            console.error("Manual analysis error:", err);
            setErrorPopup({ show: true, message: "System downlink failure. Authentication required." });
        } finally {
            setLoading(false);
        }
    };

    const handleAIAction = async (type) => {
        if (!result) return;
        const key = type === 'deep-dive' ? 'deepDive' : 'fixGuide';
        if (aiAnalysis[key]) return; // Already loaded data

        setAiLoading(prev => ({ ...prev, [key]: true }));
        try {
            const res = await fetch(`${API_BASE_URL}/api/troubleshoot/analyze/${type}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    brand: selectedBrand,
                    problem: result.info.prob,
                    fix: result.info.fix
                })
            });
            const data = await res.json();
            setAiAnalysis(prev => ({ ...prev, [key]: data.content }));
        } catch (err) {
            console.error(`AI ${type} error:`, err);
        } finally {
            setAiLoading(prev => ({ ...prev, [key]: false }));
        }
    };

    const resetDiagnosis = () => {
        setResult(null);
        setManualCode('');
        setAiAnalysis({ deepDive: '', fixGuide: '' });
        setViewMode('config');
        setCameraOn(false);
    };

    const autoAnalyze = useCallback(async (code) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/troubleshoot/diagnose/manual`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ brand: selectedBrand, code: code })
            });
            const data = await res.json();
            if (res.ok) {
                setResult(data);
                setViewMode('dashboard');
                window.scrollTo(0, 0);
            }
        } catch (err) {
            console.error("Auto analysis error:", err);
            setErrorPopup({ show: true, message: "Optical sync failure. Pattern decoding interrupted." });
        } finally {
            setLoading(false);
        }
    }, [selectedBrand]);

    const sendFrame = useCallback((ws) => {
        if (!cameraOn || !videoRef.current || ws.readyState !== WebSocket.OPEN) return;
        const canvas = canvasRef.current;
        const video = videoRef.current;
        if (!video || video.videoWidth === 0) {
            requestAnimationFrame(() => sendFrame(ws));
            return;
        }
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        canvas.toBlob((blob) => {
            if (blob && ws.readyState === WebSocket.OPEN) ws.send(blob);
        }, 'image/jpeg', 0.6);
    }, [cameraOn]);

    const handleWSMessage = useCallback((data, ws) => {
        if (data.status === 'calibrating') {
            setStreamStatus('calibrating');
            setCalibrationProgress(data.progress * 100);
        } else if (data.status === 'calibrated') {
            setStreamStatus('detecting');
        } else if (data.status === 'detecting') {
            setLastBrightness(data.brightness);
            setStreamState(data.state);
            setBlinkCount(data.blink_count);
            setPartialPattern(data.partial_pattern);

            if (data.detected_code) {
                setManualCode(data.detected_code);
                setCameraOn(false); // AUTO STOP
                autoAnalyze(data.detected_code);
            }
        }
        if (cameraOn) requestAnimationFrame(() => sendFrame(ws));
    }, [autoAnalyze, cameraOn, sendFrame]);

    const connectWebSocket = useCallback(() => {
        const wsUrl = `${WS_BASE_URL}/api/troubleshoot/ws/troubleshoot`;
        console.log("Connecting to Troubleshoot WS:", wsUrl);

        const socket = new WebSocket(wsUrl);
        socket.onopen = () => {
            console.log("Troubleshoot WS Connected");
            setStreamStatus('connected');
            sendFrame(socket);
        };
        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            handleWSMessage(data, socket);
        };
        socket.onclose = () => {
            console.log("Troubleshoot WS Disconnected");
            setStreamStatus('offline');
        };
        socket.onerror = (err) => {
            console.error("Troubleshoot WS Error:", err);
            setStreamStatus('error');
        };
        wsRef.current = socket;
    }, [handleWSMessage, sendFrame]);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
            if (videoRef.current) videoRef.current.srcObject = stream;
        } catch (err) {
            console.error("Camera access error:", err);
            setCameraOn(false);
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(t => t.stop());
            videoRef.current.srcObject = null;
        }
    };

    // Camera Logic
    useEffect(() => {
        if (cameraOn) {
            startCamera();
            connectWebSocket();
        } else {
            stopCamera();
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
            setStreamStatus('offline');
        }
        return () => {
            stopCamera();
            if (wsRef.current) wsRef.current.close();
        };
    }, [cameraOn, connectWebSocket]);

    // Markdown-lite renderer for AI content
    const FormattedAIContent = ({ content, colorClass }) => {
        if (!content) return null;

        const lines = content.split('\n');
        const formatted = [];
        let currentList = [];

        lines.forEach((line, index) => {
            const trimmed = line.trim();

            // Headers
            if (trimmed.startsWith('###')) {
                formatted.push(
                    <div key={`h-${index}`} className={`ai-content-header ${colorClass} mt-6`}>
                        {trimmed.replace(/^###\s*/, '')}
                    </div>
                );
            }
            // Important blocks
            else if (trimmed.startsWith('> [!IMPORTANT]')) {
                formatted.push(
                    <div key={`imp-${index}`} className="ai-content-important">
                        {trimmed.replace(/^>\s*\[!IMPORTANT\]\s*/, '')}
                    </div>
                );
            }
            // Numbered lists
            else if (/^\d+\./.test(trimmed)) {
                const num = trimmed.match(/^\d+/)[0];
                const text = trimmed.replace(/^\d+\.\s*/, '');
                formatted.push(
                    <div key={`li-${index}`} className="ai-content-list-item">
                        <span className="ai-content-list-num">{num}.</span>
                        <span>{parseBold(text)}</span>
                    </div>
                );
            }
            // Paragraphs
            else if (trimmed) {
                formatted.push(
                    <p key={`p-${index}`} className="ai-content-p">
                        {parseBold(trimmed)}
                    </p>
                );
            }
        });

        function parseBold(text) {
            const parts = text.split(/(\*\*.*?\*\*)/);
            return parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <span key={i} className="ai-content-bold">{part.slice(2, -2)}</span>;
                }
                return part;
            });
        }

        return <div className="space-y-2">{formatted}</div>;
    };

    // Diagnostic Dashboard Component
    const DiagnosticDashboard = () => (
        <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-500">
            {/* Control Header */}
            <div className="flex justify-between items-center">
                <div className="flex bg-[#ff4400] text-black px-6 py-2 font-black uppercase text-xs tracking-[0.2em] italic">
                    Analysis_Session_Active
                </div>
                <button
                    onClick={resetDiagnosis}
                    className="flex bg-black border-2 border-[#ff4400] text-[#ff4400] px-8 py-3 font-black uppercase text-sm tracking-widest hover:bg-[#ff4400] hover:text-black transition-all shadow-[0_0_15px_rgba(255,68,0,0.2)]"
                >
                    Diagnose Again
                </button>
            </div>

            {/* Stable Summary Section */}
            <div className="bg-[#111] border-2 border-[#ff4400] shadow-[0_0_30px_rgba(255,68,0,0.1)] overflow-hidden">
                <div className="bg-gradient-to-r from-[#1a1a1a] to-black p-4 border-b-2 border-[#ff4400] flex justify-between items-center">
                    <h4 className="font-black uppercase tracking-widest text-[#eeeeee] flex items-center gap-3">
                        <span className="w-2.5 h-5 bg-[#ff4400] animate-pulse"></span>
                        Diagnostic_Report // {result.code}
                    </h4>
                    <span className="font-mono text-[9px] text-[#444] uppercase tracking-widest">Hash_ID: {Math.random().toString(16).slice(2, 10)}</span>
                </div>
                <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-10 bg-black">
                    <div className="space-y-4">
                        <div className="text-[12px] text-[#ff4400] font-mono uppercase tracking-[0.3em] font-black">Fault_Identifier //</div>
                        <div className="p-6 bg-[#0a0a0a] border border-[#222] border-l-[6px] border-l-[#ff4400] text-[#eeeeee] font-black text-xl leading-snug">
                            {result.info.prob}
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="text-[12px] text-cyan-400 font-mono uppercase tracking-[0.3em] font-black">Mitigation_Protocol //</div>
                        <div className="p-6 bg-[#0a0a0a] border border-[#222] border-l-[6px] border-l-cyan-400 text-[#eeeeee] font-black text-xl leading-snug">
                            {result.info.fix}
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Action Rows */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button
                    onClick={() => handleAIAction('deep-dive')}
                    disabled={aiLoading.deepDive}
                    className="group relative py-5 bg-black border-2 border-cyan-400 overflow-hidden transition-all hover:bg-cyan-400 hover:text-black disabled:opacity-50"
                >
                    <span className="relative z-10 font-black uppercase text-sm tracking-widest transition-colors duration-300">
                        {aiLoading.deepDive ? 'Syncing_Neural_Cores...' : 'Request Technical Deep Dive'}
                    </span>
                </button>
                <button
                    onClick={() => handleAIAction('fix-guide')}
                    disabled={aiLoading.fixGuide}
                    className="group relative py-5 bg-black border-2 border-[#ff4400] overflow-hidden transition-all hover:bg-[#ff4400] hover:text-black disabled:opacity-50"
                >
                    <span className="relative z-10 font-black uppercase text-sm tracking-widest transition-colors duration-300">
                        {aiLoading.fixGuide ? 'Sequencing_Fix_Matrix...' : 'Request Step-by-Step Repair Guide'}
                    </span>
                </button>
            </div>

            {/* Expandable AI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 min-h-[450px]">
                {/* Technical Deep Dive Panel */}
                <div className={`bg-[#050505] border-2 transition-all duration-700 flex flex-col ${aiAnalysis.deepDive || aiLoading.deepDive ? 'border-cyan-400/50' : 'border-[#111] opacity-30 grayscale'}`}>
                    <div className="bg-cyan-400/5 p-4 border-b border-cyan-400/20 flex justify-between items-center">
                        <span className="text-cyan-400 font-black text-sm uppercase tracking-widest flex items-center gap-2">
                            {aiLoading.deepDive && <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>}
                            NEURAL_LINK [DEEP_ANALYSIS]
                        </span>
                        <span className="text-cyan-950 font-mono text-[9px]">L4_PRIORITY</span>
                    </div>
                    <div className="flex-1 p-8 font-mono text-sm leading-relaxed text-cyan-50/80 overflow-y-auto max-h-[600px] diagnostic-scrollbar-cyan">
                        {aiLoading.deepDive ? (
                            <div className="h-full flex flex-col items-center justify-center space-y-6 py-20">
                                <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                                <div className="space-y-2 text-center">
                                    <p className="animate-pulse tracking-[0.2em] text-cyan-400 uppercase font-black">Initializing_Quantum_Lookup</p>
                                    <p className="text-[10px] text-cyan-900 uppercase">Awaiting_Stream_Response...</p>
                                </div>
                            </div>
                        ) : aiAnalysis.deepDive ? (
                            <div className="animate-in fade-in duration-1000 slide-in-from-top-2">
                                <FormattedAIContent content={aiAnalysis.deepDive} colorClass="text-cyan-400" />
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center text-[#111] select-none py-24 uppercase font-black text-center text-2xl tracking-tighter opacity-10">
                                Modules_Inactive
                            </div>
                        )}
                    </div>
                </div>

                {/* Repair Protocol Panel */}
                <div className={`bg-[#050505] border-2 transition-all duration-700 flex flex-col ${aiAnalysis.fixGuide || aiLoading.fixGuide ? 'border-[#ff4400]/50' : 'border-[#111] opacity-30 grayscale'}`}>
                    <div className="bg-[#ff4400]/5 p-4 border-b border-[#ff4400]/20 flex justify-between items-center">
                        <span className="text-[#ff4400] font-black text-sm uppercase tracking-widest flex items-center gap-2">
                            {aiLoading.fixGuide && <span className="w-2 h-2 rounded-full bg-[#ff4400] animate-pulse"></span>}
                            REPAIR_PROTOCOLS [SOP_01]
                        </span>
                        <span className="text-[#ff4400]/20 font-mono text-[9px]">SECURE_FEED</span>
                    </div>
                    <div className="flex-1 p-8 font-mono text-sm leading-relaxed text-orange-50/80 overflow-y-auto max-h-[600px] diagnostic-scrollbar-orange">
                        {aiLoading.fixGuide ? (
                            <div className="h-full flex flex-col items-center justify-center space-y-6 py-20">
                                <div className="w-10 h-10 border-2 border-[#ff4400] border-t-transparent rounded-full animate-spin"></div>
                                <div className="space-y-2 text-center">
                                    <p className="animate-pulse tracking-[0.2em] text-[#ff4400] uppercase font-black">Compiling_Repair_Sequence</p>
                                    <p className="text-[#441111] text-[10px] uppercase">Cross_Referencing_SOP_ID...</p>
                                </div>
                            </div>
                        ) : aiAnalysis.fixGuide ? (
                            <div className="animate-in fade-in duration-1000 slide-in-from-top-2">
                                <FormattedAIContent content={aiAnalysis.fixGuide} colorClass="text-[#ff4400]" />
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center text-[#111] select-none py-24 uppercase font-black text-center text-2xl tracking-tighter opacity-10">
                                Modules_Inactive
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex justify-between items-center text-[10px] text-[#222] font-mono border-t border-[#1a1a1a] pt-6 uppercase tracking-[0.4em]">
                <span>Peasy_Engine // Core_Diagnostic_Link_V2.5</span>
                <span>Active_Security: AES_X</span>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-full space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
            {/* Header Section */}

            <div className="border-b-2 border-[#333] pb-4">

                <h1 className="text-4xl md:text-6xl font-black text-[#eeeeee] tracking-tighter uppercase leading-none">
                    DIAGNOSTIC_<span className="text-[#ff4400]">CONSOLE</span>
                </h1>
                <p className="text-sm font-mono text-[#666] mt-3 uppercase tracking-widest">
                    // PC_HARDWARE_INTEGRITY_STATION
                </p>
            </div>
            {viewMode === 'dashboard' && (
                <button
                    onClick={resetDiagnosis}
                    className="mt-4 sm:mt-0 font-mono text-[10px] text-[#ff4400] uppercase border-b-2 border-[#ff4400]/20 hover:border-[#ff4400] transition-all"
                >
                        // Purge_Current_Session
                </button>
            )}


            {viewMode === 'config' ? (
                <div className="space-y-10">
                    {/* Horizontal Selectors Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                        {/* Input Protocol Selection */}
                        <section className="bg-black border-2 border-[#1a1a1a] p-8 space-y-6">
                            <h3 className="text-3xl font-black text-cyan-400 uppercase tracking-tighter flex items-center gap-4">
                                <span className="w-2 h-8 bg-cyan-400"></span>
                                1. Input Protocol
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <button
                                    onClick={() => {
                                        setMethod('manual');
                                        setCameraOn(false);
                                        setResult(null);
                                    }}
                                    className={`w-full py-5 font-mono text-base uppercase tracking-[0.2em] border-2 transition-all ${method === 'manual' ? 'bg-cyan-400/10 border-cyan-400 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]' : 'bg-[#050505] border-[#111] text-[#888] hover:border-[#333] hover:text-[#eee]'}`}
                                >
                                    [ MANUAL_ENTRY ]
                                </button>
                                <button
                                    onClick={() => {
                                        if (selectedBrand.includes('ASUS LED') || selectedBrand.includes('Lenovo (Amber LED + Beeps)')) {
                                            setSelectedBrand('');
                                        }
                                        setMethod('camera');
                                        setResult(null);
                                    }}
                                    className={`w-full py-5 font-mono text-base uppercase tracking-[0.2em] border-2 transition-all ${method === 'camera' ? 'bg-cyan-400/10 border-cyan-400 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]' : 'bg-[#050505] border-[#111] text-[#888] hover:border-[#333] hover:text-[#eee]'}`}
                                >
                                    [ CAMERA_AI ]
                                </button>
                            </div>
                        </section>

                        {/* Target Brand Selection */}
                        <section className={`bg-black border-2 transition-all duration-500 p-8 space-y-6 ${method ? 'border-[#1a1a1a] opacity-100' : 'border-[#0a0a0a] opacity-20 pointer-events-none'}`}>
                            <h3 className="text-3xl font-black text-[#ff4400] uppercase tracking-tighter flex items-center gap-4">
                                <span className="w-2 h-8 bg-[#ff4400]"></span>
                                2. Target Brand
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {brands
                                    .filter(brand => method === 'camera' ? (!brand.includes('ASUS LED') && !brand.includes('Lenovo (Amber LED + Beeps)')) : true)
                                    .map((brand) => (
                                        <button
                                            key={brand}
                                            onClick={() => {
                                                setSelectedBrand(brand);
                                                setResult(null);
                                                // Smooth scroll to the interaction panel
                                                setTimeout(() => {
                                                    panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                }, 100);
                                            }}
                                            className={`text-left px-5 py-4 font-mono text-xl border-2 transition-all ${selectedBrand === brand
                                                ? 'border-[#ff4400] bg-[#ff4400]/10 text-white shadow-[0_0_15px_rgba(255,68,0,0.2)]'
                                                : 'border-[#111] bg-[#050505] text-[#888] hover:border-[#333] hover:text-[#eee]'
                                                }`}
                                        >
                                            {brand}
                                        </button>
                                    ))}
                            </div>
                        </section>
                    </div>

                    {/* Full Width Interaction Panel */}
                    <div className="w-full" ref={panelRef}>
                        {selectedBrand && method === 'manual' && (
                            <div className="bg-[#050505] p-12 border-2 border-[#1a1a1a] space-y-8 animate-in zoom-in-95 duration-500">
                                <h3 className="text-3xl font-black text-cyan-400 uppercase tracking-tighter flex items-center gap-4">
                                    <span className="w-2 h-8 bg-cyan-400"></span>
                                    3. Capture Pattern
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <div className="text-[#ff4400] font-mono text-[11px] uppercase tracking-widest flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-[#ff4400] animate-pulse"></span>
                                            Capture_Channel_Alpha_Active
                                        </div>
                                        <span className="text-[#222] font-mono text-[10px]">VER: PC_IO_LATEST</span>
                                    </div>
                                    <input
                                        type="text"
                                        value={manualCode}
                                        onChange={(e) => setManualCode(e.target.value)}
                                        placeholder=">>_WAITING_FOR_INPUT_<<"
                                        className="w-full bg-black border-2 border-[#1a1a1a] p-10 text-6xl font-black text-cyan-400 placeholder-[#111] focus:border-cyan-400/40 outline-none transition-all font-mono text-center tracking-tighter"
                                    />
                                    <div className="flex justify-between text-[11px] text-[#333] font-mono p-4 bg-black/50 border border-[#111] uppercase tracking-widest">
                                        <span>Syntax_Requirement: {selectedBrand.includes('Dell') ? 'INT_X, INT_Y' : 'SPECIFIC_SEQUENCE'}</span>
                                        <span className="text-[#ff4400]/20 underline">View_Brand_Protocols</span>
                                    </div>

                                    {/* ASUS Specific Error Codes Helper */}
                                    {selectedBrand.includes('ASUS') && (
                                        <div className="mt-6 border-2 border-[#1a1a1a] bg-[#050505] p-8 space-y-6">
                                            <h3 className="text-3xl font-black text-cyan-400 uppercase tracking-tighter flex items-center gap-4">
                                                <span className="w-2 h-8 bg-cyan-400"></span>
                                                Known ASUS Protocols
                                            </h3>
                                            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                                                {asusCodes.map((bc) => (
                                                    <button
                                                        key={bc.code}
                                                        onClick={() => setManualCode(bc.code)}
                                                        title={bc.prob}
                                                        className={`text-left px-5 py-4 font-mono border-2 transition-all group ${manualCode === bc.code
                                                            ? 'border-cyan-400 bg-cyan-400/10 text-white shadow-[0_0_15px_rgba(34,211,238,0.2)]'
                                                            : 'border-[#111] bg-[#050505] text-[#444] hover:border-[#333] hover:text-[#888]'}`}
                                                    >
                                                        <div className={`text-lg font-black uppercase truncate ${manualCode === bc.code ? 'text-cyan-400' : 'text-[#eee] group-hover:text-cyan-400'}`}>
                                                            {bc.code}
                                                        </div>
                                                        <div className={`text-xs mt-1 truncate whitespace-nowrap overflow-hidden text-ellipsis ${manualCode === bc.code ? 'text-cyan-100/50' : 'text-[#666]'}`}>
                                                            // {bc.prob}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={handleManualAnalyze}
                                    disabled={loading || !manualCode}
                                    className="w-full py-8 bg-[#ff4400] text-black font-black uppercase text-lg tracking-[0.4em] hover:bg-white hover:shadow-[0_0_50px_rgba(255,68,0,0.3)] transition-all disabled:opacity-5"
                                >
                                    {loading ? 'SEQUENCING_ANALYSIS...' : 'INITIALIZE_DIAGNOSTIC_SCAN'}
                                </button>
                            </div>
                        )}

                        {selectedBrand && method === 'camera' && (
                            <div className="bg-[#050505] p-10 border-2 border-[#1a1a1a] space-y-8 animate-in zoom-in-95 duration-500">
                                <h3 className="text-3xl font-black text-[#ff4400] uppercase tracking-tighter flex items-center gap-4">
                                    <span className="w-2 h-8 bg-[#ff4400]"></span>
                                    3. Synchronize Link
                                </h3>
                                {!cameraOn ? (
                                    <div className="aspect-[21/9] bg-black flex flex-col items-center justify-center border-2 border-[#111] relative group overflow-hidden">
                                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#ff440011_0%,_transparent_75%)] opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
                                        <div className="text-[12px] text-[#111] mb-10 font-mono tracking-[0.5em] uppercase font-black">Optic_Sync: Offline</div>
                                        <button
                                            onClick={() => setCameraOn(true)}
                                            className="relative px-16 py-6 bg-cyan-400 text-black font-black uppercase text-sm tracking-[0.4em] hover:bg-white hover:shadow-[0_0_60px_rgba(34,211,238,0.3)] transition-all"
                                        >
                                            Lock Optical Link
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="relative aspect-video max-h-[600px] w-full mx-auto bg-black border-2 border-[#222] overflow-hidden group">
                                            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-contain grayscale brightness-90 contrast-110" />
                                            <canvas ref={canvasRef} className="hidden" />

                                            {/* Advanced HUD */}
                                            <div className="absolute inset-0 flex flex-col justify-between p-8 pointer-events-none font-mono">
                                                <div className="flex justify-between">
                                                    <div className="bg-black/80 p-4 border border-cyan-400/30 text-cyan-400 space-y-2 backdrop-blur-sm">
                                                        <div className="flex items-center gap-3">
                                                            <span className="w-3 h-3 bg-cyan-400 animate-ping rounded-full"></span>
                                                            <span className="font-black">FEED_LIVE_4K</span>
                                                        </div>
                                                        <div className="text-[10px] uppercase font-black tracking-widest text-cyan-900">Proc: {streamStatus}</div>
                                                    </div>
                                                    <div className="bg-black/80 p-4 border border-[#ff4400]/30 text-[#ff4400] backdrop-blur-sm">
                                                        <div className="text-[10px] mb-1 font-black opacity-40">LUM_INDEX</div>
                                                        <div className="text-2xl font-black">{Math.round(lastBrightness)}</div>
                                                    </div>
                                                </div>

                                                <div className="flex-1 flex flex-col items-center justify-center relative">
                                                    <div className="w-[300px] h-[300px] border border-white/5 rounded-full relative animate-pulse">
                                                        <div className="absolute inset-x-0 top-1/2 h-[1px] bg-cyan-400/10"></div>
                                                        <div className="absolute inset-y-0 left-1/2 w-[1px] bg-cyan-400/10"></div>
                                                        <div className="absolute inset-5 border border-cyan-400/10 rounded-full"></div>
                                                    </div>
                                                    <div className="mt-8 px-4 py-1 bg-cyan-400/10 border border-cyan-400/20 text-[10px] text-cyan-400 uppercase font-black">Target_Frame_Locked</div>
                                                </div>

                                                <div className="space-y-4 max-w-sm">
                                                    {streamStatus === 'calibrating' && (
                                                        <div className="space-y-2">
                                                            <div className="flex justify-between text-[10px] text-cyan-400 font-bold uppercase tracking-widest">
                                                                <span>Auto_Calibrate</span>
                                                                <span>{Math.round(calibrationProgress)}%</span>
                                                            </div>
                                                            <div className="w-full h-[3px] bg-black border border-white/5">
                                                                <div className="h-full bg-cyan-400 shadow-[0_0_10px_cyan] transition-all duration-300" style={{ width: `${calibrationProgress}%` }}></div>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {streamStatus === 'detecting' && (
                                                        <div className="flex items-center gap-6 bg-black/90 p-5 border border-white/10 backdrop-blur-md">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-4 h-4 rounded-sm transition-all duration-100 ${streamState === 'ON' ? 'bg-[#ff4400] shadow-[0_0_20px_#ff4400]' : 'bg-[#111]'}`}></div>
                                                                <span className="text-[10px] text-white font-black">PULSE</span>
                                                            </div>
                                                            <div className="h-6 w-[1px] bg-white/5"></div>
                                                            <div className="text-[11px] text-cyan-400 font-black tracking-[0.2em] flex-1">
                                                                [{partialPattern.join(', ')}]
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setCameraOn(false)}
                                            className="w-full py-4 bg-black text-[#222] font-mono text-[11px] tracking-[0.5em] uppercase hover:text-[#ff4400] transition-colors border border-transparent hover:border-[#ff440044]"
                                        >
                                            Terminate_Optical_Link_0x8
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <DiagnosticDashboard />
            )}

            {/* Error Popup Modal */}
            {errorPopup.show && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="w-full max-w-md bg-[#050505] border-2 border-red-600 shadow-[0_0_50px_rgba(220,38,38,0.2)] overflow-hidden">
                        <div className="bg-red-600 p-3 flex justify-between items-center">
                            <span className="text-black font-black uppercase text-xs tracking-widest flex items-center gap-2">
                                <span className="w-2 h-2 bg-black animate-pulse"></span>
                                System_Interrupt_Alert
                            </span>
                            <button 
                                onClick={() => setErrorPopup({ ...errorPopup, show: false })}
                                className="text-black hover:bg-white px-2 font-bold transition-colors"
                            >
                                [X]
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="font-mono text-sm text-red-100 leading-relaxed uppercase tracking-tight">
                                {errorPopup.message}
                            </div>
                            <button 
                                onClick={() => setErrorPopup({ ...errorPopup, show: false })}
                                className="w-full py-4 bg-red-600 text-black font-black uppercase text-xs tracking-[0.3em] hover:bg-white transition-all shadow-lg"
                            >
                                Acknowledge_&_Reset
                            </button>
                        </div>
                        <div className="bg-black/50 p-2 text-center text-[8px] text-red-900 font-mono tracking-widest border-t border-red-900/20">
                            ERR_CODE_0x882 // AUTH_DENIED
                        </div>
                    </div>
                </div>
            )}

            {/* Background Aesthetic */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(to_right,#888_1px,transparent_1px),linear-gradient(to_bottom,#888_1px,transparent_1px)] bg-[size:60px_60px] z-[-1]"></div>
        </div>
    );
};

export default TroubleshootPage;
