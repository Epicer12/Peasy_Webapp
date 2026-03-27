import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { updateProject } from '../services/componentService';
import {
    MicrophoneIcon,
    ChatBubbleLeftRightIcon,
    ArrowRightIcon,
    ArrowLeftIcon,
    ExclamationTriangleIcon,
    InformationCircleIcon,
    SparklesIcon,
    CheckCircleIcon,
    XCircleIcon
} from '@heroicons/react/24/outline';

const STEP_METADATA = [
    { id: 'step_01', type: 'caution', title: 'SYSTEM_INIT' },
    { id: 'step_02', type: 'critical', title: 'CORE_ASSEMBLY' },
    { id: 'step_03', type: 'caution', title: 'HARDWARE_STACK' },
    { id: 'step_04', type: 'critical', title: 'THERMAL_MANAGEMENT' },
    { id: 'step_05', type: 'caution', title: 'DATA_LINKS' },
    { id: 'step_06', type: 'critical', title: 'POWER_FLOW' },
    { id: 'step_07', type: 'caution', title: 'CIRCUIT_CLOSURE' },
    { id: 'step_08', type: 'critical', title: 'SYSTEM_TESTING' },
    { id: 'step_09', type: 'caution', title: 'PERIPHERAL_SYNC' },
    { id: 'step_10', type: 'critical', title: 'FINAL_OS_BOOT' }
];

const WarningBox = ({ type, text }) => {
    const isCritical = type === 'critical';
    return (
        <div className={`mb-8 p-6 rounded-lg border-2 flex items-start space-x-4 ${isCritical
            ? 'bg-red-500/10 border-red-500 text-red-100'
            : 'bg-yellow-500/10 border-yellow-500 text-yellow-100'
            }`}>
            <div className={`mt-1 p-1.5 rounded-full ${isCritical ? 'bg-red-500' : 'bg-yellow-500'}`}>
                {isCritical ? <ExclamationTriangleIcon className="w-5 h-5 text-black" /> : <InformationCircleIcon className="w-5 h-5 text-black" />}
            </div>
            <div>
                <p className="font-mono text-[10px] font-black uppercase tracking-[0.3em] mb-1">
                    {isCritical ? 'CRITICAL_WARNING' : 'CAUTION_NOTE'}
                </p>
                <p className="text-sm font-bold leading-relaxed uppercase tracking-tight">{text}</p>
            </div>
        </div>
    );
};

// Helper to parse n8n webhook output
const parseStepData = (data) => {
    const rawLines = data.step.split('\n').filter(s => s.trim().length > 0);
    const instructionSteps = rawLines.filter(line =>
        line.toLowerCase().includes('instruction')
    ).map(line => {
        return line.replace(/^Instruction\s\d+:\s/i, '').trim();
    });

    const noteLine = rawLines.find(line => line.toLowerCase().startsWith('note:'));

    return {
        stepNumber: data.current,
        note: noteLine ? noteLine.replace(/^Note:\s/i, '') : "THE_AI_AGENT_HAS_COMPUTED_THIS_STEP_FOR_OPTIMAL_HARDWARE_INTEGRITY.",
        instructions: instructionSteps.map((text, idx) => ({
            id: `${data.current}-${idx}`,
            text: text,
            status: "pending" // 'pending', 'ticked', 'skipped'
        }))
    };
};

const GuidePage = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Check if we are passing an existing assembly_guide array (View Mode) or step 1 generation
    const isViewingOnly = location.state?.isViewingOnly || false;
    const initialRawGuide = location.state?.initialGuide || JSON.parse(localStorage.getItem('current_assembly_guide'));
    const projectId = location.state?.projectId || localStorage.getItem('current_project_id');
    const existingComponents = location.state?.existingComponents || JSON.parse(localStorage.getItem('current_components')) || [];
    const generatedSessionId = useMemo(() => "build_" + Math.floor(Math.random() * 1000000), []);
    const sessionId = location.state?.sessionId || generatedSessionId;

    const [allSteps, setAllSteps] = useState([]);
    const [latestStepNumber, setLatestStepNumber] = useState(1);

    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatMessages, setChatMessages] = useState([
        { role: 'ai', text: 'SYNC_COMPLETE. AI_ASSEMBLY_AGENT is ready to support your build sequence.' }
    ]);
    const [chatInput, setChatInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);

    const AGENT_BASE_URL = import.meta.env.VITE_AGENT_BASE_URL;

    useEffect(() => {
        if (!initialRawGuide && !isViewingOnly) {
            navigate('/home');
        } else {
            if (isViewingOnly && Array.isArray(initialRawGuide)) {
                // We passed the saved assembly guide array straight from Supabase
                setAllSteps(initialRawGuide);
                setLatestStepNumber(initialRawGuide.length);
            } else if (allSteps.length === 0 && initialRawGuide?.step) {
                // Initialize first step from raw agent data
                const parsed1 = parseStepData(initialRawGuide);
                setAllSteps([parsed1]);
                setLatestStepNumber(1);
                localStorage.setItem('current_assembly_guide', JSON.stringify(initialRawGuide));
                localStorage.setItem('current_project_id', projectId);
                if (existingComponents.length > 0) {
                    localStorage.setItem('current_components', JSON.stringify(existingComponents));
                }
            }
        }
    }, [allSteps.length, existingComponents, initialRawGuide, isViewingOnly, navigate, projectId]);

    // Progress Calculation: Each major step is worth 10% (10 steps total = 100%).
    // Within each step, the 10% is divided equally among its instructions.
    const progressPercentage = useMemo(() => {
        let totalPct = 0;
        allSteps.forEach(step => {
            const instCount = step.instructions.length;
            if (instCount === 0) {
                totalPct += 10;
                return;
            }
            let tickedCount = 0;
            step.instructions.forEach(inst => {
                if (inst.status === 'ticked') tickedCount++;
            });
            totalPct += (tickedCount / instCount) * 10;
        });
        const pct = Math.floor(totalPct);
        return pct > 100 ? 100 : pct;
    }, [allSteps]);

    const handleInstructionAction = (stepIdx, instIdx, action) => {
        if (isViewingOnly) return;
        const newSteps = [...allSteps];
        newSteps[stepIdx].instructions[instIdx].status = action; // 'ticked' or 'skipped'
        setAllSteps(newSteps);
    };

    const handleNext = async () => {
        if (isLoading || isViewingOnly) return;

        if (latestStepNumber < 10) {
            setIsLoading(true);
            try {
                const response = await fetch(`${AGENT_BASE_URL}/webhook/assembly-guide`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        chatInput: 'NEXT', 
                        projectId: projectId,
                        sessionId: sessionId 
                    })
                });

                let data;
                const contentType = response.headers.get("content-type");
                if (contentType && contentType.includes("application/json")) {
                    data = await response.json();
                } else {
                    const text = await response.text();
                    data = {
                        step: text,
                        current: latestStepNumber + 1,
                        total: 10
                    };
                }

                const parsed = parseStepData(data);
                setAllSteps(prev => [...prev, parsed]);
                setLatestStepNumber(data.current);
                localStorage.setItem('current_assembly_guide', JSON.stringify(data)); // Keep raw latest step for backup logic if needed

                // Scroll to bottom smoothly
                setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 100);
            } catch (error) {
                console.error("Error fetching next step:", error);
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleBack = () => navigate(-1);

    const handleSaveGuide = async () => {
        setIsSaving(true);
        try {
            // Calculate final status
            const finalStatus = progressPercentage === 100 ? 'TROUBLESHOOT' : 'ASSEMBLYING';

            // Filter out any older guide if rewriting and mark ALL old components as owned natively.
            const strippedComponents = existingComponents.filter(c => c.type !== 'assembly_guide').map(c => ({
                ...c,
                isBought: true
            }));

            strippedComponents.push({
                type: 'assembly_guide',
                name: 'AI_ASSEMBLY_MATRIX',
                data: allSteps
            });

            await updateProject(projectId, {
                components: strippedComponents,
                status: finalStatus
            });

            alert(`GUIDE_SAVED_SUCCESSFULLY_TO_DB. Progress: ${progressPercentage}%. Engine Status Code: ${finalStatus}`);
            navigate(`/build-details/${projectId}`);
        } catch (error) {
            console.error("Error saving guide:", error);
            alert("Error saving. Please check connection.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSpeak = () => {
        if ('speechSynthesis' in window && allSteps.length > 0) {
            window.speechSynthesis.cancel();
            const latestText = allSteps[allSteps.length - 1].instructions.map(i => i.text).join(". ");
            const utterance = new SpeechSynthesisUtterance(latestText);
            utterance.rate = 1.0;
            window.speechSynthesis.speak(utterance);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!chatInput.trim() || isChatLoading) return;

        const userQ = chatInput.trim();
        setChatMessages(prev => [...prev, { role: 'user', text: userQ }]);
        setChatInput('');
        setIsChatLoading(true);

        try {
            const response = await fetch(`${AGENT_BASE_URL}/webhook/pc-consultant`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': '1'
                },
                body: JSON.stringify({ 
                    sessionId: sessionId, 
                    chatInput: userQ,
                    input: userQ, // Many n8n templates use 'input' by default
                    components: existingComponents, // Provide context about the current build
                    projectId: projectId
                })
            });

            if (!response.ok) throw new Error('Communication interference');

            const rawText = await response.text();
            let data;
            try { data = JSON.parse(rawText); } catch { data = rawText; }

            let aiText = "NO_RESPONSE_RECEIVED";
            if (Array.isArray(data) && data[0] && data[0].output) {
                aiText = data[0].output;
            } else if (typeof data === 'string') {
                aiText = data;
            } else if (typeof data === 'object' && data !== null) {
                aiText = data.output || data.reply || data.text || data.response || data.content || JSON.stringify(data);
            }

            setChatMessages(prev => [...prev, { role: 'ai', text: aiText }]);
        } catch (error) {
            console.error(error);
            setChatMessages(prev => [...prev, { role: 'ai', text: 'ERROR: NETWORK_DISCONNECT. PLEASE TRY AGAIN.' }]);
        } finally {
            setIsChatLoading(false);
        }
    };

    if (allSteps.length === 0) return null;

    return (
        <div className="flex flex-col min-h-screen bg-[#050505] text-[#eeeeee] relative selection:bg-[#00ff88] selection:text-black">
            <style>{`.bg-grid-pattern { background-image: radial-gradient(#1a1a1a 1px, transparent 1px); background-size: 20px 20px; }`}</style>

            {/* Header */}
            <header className="border-b border-[#333] p-8 pt-6 md:pt-10 sticky top-0 bg-[#050505] z-[60]">
                <div className="max-w-7xl mx-auto">
                    <button onClick={handleBack} className="flex items-center gap-2 text-[#888] hover:text-[#00ff88] transition-all font-mono text-[10px] font-black uppercase tracking-widest mb-6 w-max">
                        <ArrowLeftIcon className="w-3 h-3" /> ABORT_AND_RETURN
                    </button>
                    <div className="flex justify-between items-end">
                        <div>
                            <div className="flex items-center gap-2 text-[#00ff88] text-[10px] font-mono tracking-[0.3em] mb-3">
                                <span className="w-2 h-2 bg-[#00ff88]"></span> {isViewingOnly ? "SAVED_GUIDE_INSPECTION" : "GUIDED_ASSEMBLY_NODE"} // PROT_V2.2
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase leading-none">
                                BUILD_<span className="text-[#00ff88]">GUIDE</span>
                            </h1>
                        </div>
                        <div className="flex flex-col items-end gap-3 hidden md:flex">
                            <div className="text-[10px] font-mono text-[#666] uppercase tracking-[0.2em]">GENERATION_PHASE</div>
                            <div className="flex gap-1.5">
                                {[...Array(10)].map((_, idx) => (
                                    <div key={idx} className={`w-6 h-1.5 transition-all duration-500 ${idx < latestStepNumber ? 'bg-[#444]' : 'bg-[#1a1a1a]'}`}></div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </header>
            <main className="flex-1 max-w-7xl mx-auto w-full pb-48 p-8 pt-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    <div className="lg:col-span-2 space-y-16">

                        {allSteps.map((stepData, stepIdx) => {
                            const meta = STEP_METADATA[(stepData.stepNumber - 1) % 10];
                            return (
                                <div key={stepData.stepNumber} className="relative animate-fade-in-up">
                                    <WarningBox
                                        type={meta.type}
                                        text={stepData.stepNumber === 1 ? 'PREPARE_STATIC_FREE_ENVIRONMENT_BEFORE_UNBOXING' : 'ENSURE_POWER_IS_OFF_BEFORE_HANDLING_COMPONENTS'}
                                    />

                                    <div className={`bg-[#0a0a0a] border border-[#333] p-10 relative overflow-hidden shadow-2xl transition-all ${isViewingOnly ? '' : 'hover:border-[#00ff88]/50'}`}>
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-[#00ff88] opacity-5 -mr-32 -mt-32 rounded-full blur-[100px]"></div>

                                        <h2 className="text-3xl font-black mb-12 border-l-8 border-[#00ff88] pl-6 uppercase tracking-tight flex items-center gap-4">
                                            <span className="text-[#00ff88] opacity-50 font-mono text-sm">STEP_{stepData.stepNumber}</span>
                                            {meta.title}
                                        </h2>

                                        <div className="space-y-6">
                                            {stepData.instructions.map((inst, instIdx) => (
                                                <div key={inst.id} className="flex space-x-4 items-start group/item">

                                                    {/* Instruction Action Buttons (Tick / Skip) */}
                                                    <div className="flex flex-col gap-1 mt-1">
                                                        <button
                                                            disabled={isViewingOnly}
                                                            onClick={() => handleInstructionAction(stepIdx, instIdx, 'ticked')}
                                                            className={`w-8 h-8 flex items-center justify-center border-2 transition-all ${inst.status === 'ticked' ? 'border-[#00ff88] bg-[#00ff88]/20 text-[#00ff88]' : 'border-[#333] text-[#444] hover:border-[#00ff88]'}`}
                                                            title="Mark as Done"
                                                        >
                                                            <CheckCircleIcon className="w-5 h-5 pointer-events-none" />
                                                        </button>
                                                        <button
                                                            disabled={isViewingOnly}
                                                            onClick={() => handleInstructionAction(stepIdx, instIdx, 'skipped')}
                                                            className={`w-8 h-8 flex items-center justify-center border-2 transition-all ${inst.status === 'skipped' ? 'border-yellow-500 bg-yellow-500/20 text-yellow-500' : 'border-[#333] text-[#444] hover:border-yellow-500'}`}
                                                            title="Skip Instruction"
                                                        >
                                                            <XCircleIcon className="w-5 h-5 pointer-events-none" />
                                                        </button>
                                                    </div>

                                                    <div className="flex-1">
                                                        <p className={`text-base md:text-lg transition-colors leading-relaxed uppercase font-medium tracking-tight mt-1 
                                                            ${inst.status === 'ticked' ? 'text-[#00ff88]/70 line-through' :
                                                                inst.status === 'skipped' ? 'text-[#666] italic' : 'text-[#ccc] group-hover/item:text-white'}`}>
                                                            {inst.text}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="mt-16 pt-10 border-t border-[#1a1a1a]">
                                            <div className="flex items-center gap-2 mb-4">
                                                <SparklesIcon className="w-4 h-4 text-[#00ff88]" />
                                                <h4 className="font-mono text-[11px] text-[#555] tracking-[0.4em] uppercase font-black">NOTE_LOG:</h4>
                                            </div>
                                            <p className="text-sm font-bold italic text-[#888] leading-relaxed uppercase border-l-2 border-[#333] pl-4">
                                                {stepData.note}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {/* End of Flow Buttons inline */}
                        {!isViewingOnly && (
                            <div className="flex gap-4 pt-10">
                                {latestStepNumber < 10 ? (
                                    <button
                                        onClick={handleNext}
                                        disabled={isLoading}
                                        className={`w-full flex items-center justify-center gap-4 bg-white text-black py-5 font-mono text-sm font-black uppercase hover:bg-[#00ff88] transition-all transform active:scale-95 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {isLoading ? 'SYNCING_BLOCK...' : 'GENERATE NEXT STEP'}
                                        {!isLoading && <ArrowRightIcon className="w-5 h-5" />}
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleSaveGuide}
                                        disabled={isSaving}
                                        className="w-full bg-[#00ff88] text-black py-6 font-mono text-sm font-black uppercase shadow-[0_0_40px_rgba(0,255,136,0.3)] hover:bg-white transition-all transform active:scale-95 border-2 border-[#00ff88]"
                                    >
                                        {isSaving ? 'ARCHIVING_GUIDE...' : 'FINALIZE & SAVE GUIDE'}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="space-y-8 sticky top-32 self-start">
                        {/* Action Buttons */}
                        <div className="space-y-4">
                            <button onClick={handleSpeak} className="w-full bg-[#00ff88] hover:bg-white text-black p-6 flex items-center justify-center gap-3 group transition-all active:scale-[0.98] shadow-[0_0_30px_rgba(0,255,136,0.1)]">
                                <MicrophoneIcon className="w-6 h-6" />
                                <span className="font-black font-mono text-xs uppercase tracking-[0.2em]">AI VOICE (LATEST STEP)</span>
                            </button>
                            <button onClick={() => setIsChatOpen(true)} className="w-full border-2 border-[#333] hover:border-[#00ff88] text-[#eeeeee] p-6 flex items-center justify-center gap-3 transition-all active:scale-[0.98]">
                                <ChatBubbleLeftRightIcon className="w-6 h-6" />
                                <span className="font-black font-mono text-xs uppercase tracking-[0.2em]">CHAT WITH ASSISTANT</span>
                            </button>
                        </div>

                        {/* Progress Monitoring */}
                        <div className="bg-[#111] border border-[#333] p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                            <div className="flex justify-between items-baseline mb-6">
                                <span className="font-mono text-[10px] text-[#555] uppercase tracking-[0.3em] font-black">ASSEMBLY_PROGRESS</span>
                                <span className="font-mono text-4xl text-[#00ff88] font-black drop-shadow-[0_0_10px_rgba(0,255,136,0.5)]">{progressPercentage}%</span>
                            </div>
                            <div className="w-full h-3 bg-[#050505] border border-[#1a1a1a] rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-[#00ff88] shadow-[0_0_10px_#00ff88] transition-all duration-700 ease-out"
                                    style={{ width: `${progressPercentage}%` }}
                                ></div>
                            </div>
                            <div className="mt-4 text-[10px] font-mono text-[#666] uppercase tracking-widest text-right">
                                REQUIRED: 100% FOR TROUBLESHOOT PHASE
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* AI Assistant Overlay */}
            <div className={`fixed top-0 right-0 h-full w-full md:w-[450px] bg-[#0a0a0a] border-l-2 border-[#333] z-[60] transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${isChatOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col shadow-[0_0_100px_rgba(0,0,0,1)]`}>
                <div className="p-10 border-b border-[#333] bg-[#050505] flex justify-between items-center">
                    <div>
                        <h3 className="text-2xl font-black uppercase tracking-tighter">AI_ASSISTANT</h3>
                        <p className="text-[10px] font-mono text-[#00ff88] uppercase tracking-[0.2em] mt-1">Operational // Neural_Link_Active</p>
                    </div>
                    <button onClick={() => setIsChatOpen(false)} className="text-[#333] hover:text-white text-4xl font-light">×</button>
                </div>

                <div className="flex-1 overflow-y-auto p-10 space-y-6 font-mono text-xs bg-grid-pattern">
                    {chatMessages.map((msg, i) => (
                        <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                            <div className={`max-w-[85%] p-4 border-2 whitespace-pre-wrap ${msg.role === 'user' ? 'bg-[#111] border-[#333] text-white' : 'bg-[#00ff88]/5 border-[#00ff88]/30 text-[#00ff88]'}`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    {isChatLoading && (
                        <div className="flex flex-col items-start animate-fade-in-up">
                            <div className="max-w-[85%] p-4 border-2 bg-[#00ff88]/5 border-[#00ff88]/30 text-[#00ff88] animate-pulse">
                                AGENT_COMPUTING // PROCESSING_QUERY...
                            </div>
                        </div>
                    )}
                </div>

                <form onSubmit={handleSendMessage} className="p-8 border-t border-[#333] bg-[#050505]">
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            placeholder="INPUT_COMMAND..."
                            className="flex-1 bg-transparent border-2 border-[#1a1a1a] p-4 text-xs font-mono focus:border-[#00ff88] outline-none transition-all disabled:opacity-50"
                            disabled={isChatLoading}
                        />
                        <button type="submit" disabled={isChatLoading} className={`bg-[#00ff88] text-black px-8 font-black text-xs uppercase hover:bg-white transition-colors ${isChatLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            ASK
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default GuidePage;
