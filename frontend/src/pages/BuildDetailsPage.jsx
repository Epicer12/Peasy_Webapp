import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    PencilSquareIcon,
    TrashIcon,
    ShoppingCartIcon,
    CheckBadgeIcon,
    PlusCircleIcon,
    ArrowPathIcon,
    ShieldCheckIcon,
    BarsArrowUpIcon,
    ArrowsRightLeftIcon,
    XMarkIcon,
    CheckIcon,
    PhotoIcon,
    PresentationChartLineIcon,
    CubeTransparentIcon
} from '@heroicons/react/24/outline';
import { getProjectById, updateProject, getProjects, analyzeBottleneck } from '../services/componentService';
import { auth } from '../firebase';
import BottleneckAnalysisModal from '../components/modals/BottleneckAnalysisModal';
import PerformanceDashboardModal from '../components/modals/PerformanceDashboardModal';
import PerformanceSummary from '../components/build/PerformanceSummary';
import SecureModelViewer from '../components/SecureModelViewer';

const BuildDetailsPage = () => {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const [project, setProject] = useState(null);
    const [allProjects, setAllProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [guideData, setGuideData] = useState(null);
    const [isGuideLoading, setIsGuideLoading] = useState(false);

    // UI States
    const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
    const [is3DModalOpen, setIs3DModalOpen] = useState(false);
    const [editingCompIndex, setEditingCompIndex] = useState(null);
    const [editForm, setEditForm] = useState(null);

    // Bottleneck States
    const [isBottleneckModalOpen, setIsBottleneckModalOpen] = useState(false);
    const [isPerfModalOpen, setIsPerfModalOpen] = useState(false);
    const [bottleneckReport, setBottleneckReport] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const [sessionId] = useState(() => "build_" + Math.floor(Math.random() * 1000000));
    
    useEffect(() => {
        const fetchProject = async () => {
            try {
                const user = auth.currentUser;
                const data = await getProjectById(projectId, user?.email);
                setProject(data);
            } catch (error) {
                console.error("Error fetching project:", error);
            } finally {
                setLoading(false);
            }
        };

        const fetchAllProjects = async () => {
            try {
                const user = auth.currentUser;
                // Use the existing service function that filters by email
                const data = await getProjects(user?.email);
                setAllProjects(data.filter(p => p.id !== projectId));
            } catch (error) {
                console.error("Error fetching projects:", error);
            }
        };

        fetchProject();
        fetchAllProjects();
    }, [projectId]);



    const handleStatusChange = async (newStatus) => {
        setUpdatingStatus(true);
        try {
            await updateProject(projectId, {
                ...project,
                status: newStatus
            });
            setProject({ ...project, status: newStatus });
        } catch (error) {
            console.error("Error updating status:", error);
            alert("Failed to update status");
        } finally {
            setUpdatingStatus(false);
        }
    };

    const toggleBought = async (index) => {
        const updatedComponents = [...project.components];
        updatedComponents[index] = {
            ...updatedComponents[index],
            isBought: !updatedComponents[index].isBought
        };

        const updatedProject = { ...project, components: updatedComponents };
        setProject(updatedProject);

        try {
            await updateProject(projectId, updatedProject);
        } catch (error) {
            console.error("Error updating component status:", error);
            setProject(project);
            alert("Failed to update component status");
        }
    };

    // --- Component Editing Logic ---
    const startEditing = (idx) => {
        setEditingCompIndex(idx);
        setEditForm({ ...project.components[idx] });
    };

    const handleEditChange = (key, value) => {
        setEditForm(prev => ({ ...prev, [key]: value }));
    };

    const saveEdit = async () => {
        const updatedComponents = [...project.components];
        updatedComponents[editingCompIndex] = editForm;

        const updatedProject = { ...project, components: updatedComponents };
        setProject(updatedProject);
        setEditingCompIndex(null);

        try {
            await updateProject(projectId, updatedProject);
        } catch (error) {
            console.error("Error saving component edits:", error);
            setProject(project);
            alert("Failed to save changes");
        }
    };

    const handleDetectBottlenecks = useCallback(async (showModal = true) => {
        setIsAnalyzing(true);
        try {
            const report = await analyzeBottleneck(project.components);
            setBottleneckReport(report);
            if (showModal) setIsBottleneckModalOpen(true);
        } catch (error) {
            console.error("Error analyzing bottleneck:", error);
            alert("Failed to analyze build balance.");
        } finally {
            setIsAnalyzing(false);
        }
    }, [project]);

    // Auto-analyze when project is loaded
    useEffect(() => {
        if (project && project.components && !bottleneckReport && !isAnalyzing) {
            handleDetectBottlenecks(false);
        }
    }, [project, bottleneckReport, isAnalyzing, handleDetectBottlenecks]);

    const active3DModel = 'pc2';

    // --- AI Agent: Assembly Guide Logic ---
    const AGENT_BASE_URL = import.meta.env.VITE_AGENT_BASE_URL;

    const handleGetAssemblyGuide = async () => {
        setIsGuideLoading(true);
        try {
            const response = await fetch(`${AGENT_BASE_URL}/webhook/assembly-guide`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    projectId: projectId,
                    userId: auth.currentUser?.uid,
                    userEmail: auth.currentUser?.email,
                    buildName: project?.name,
                    components: project?.components,
                    sessionId: sessionId
                })
            });

            if (!response.ok) throw new Error('Failed to reach AI Agent');

            let data;
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                data = await response.json();
            } else {
                // If it's text/plain, wrap it in our expected object format
                const text = await response.text();
                data = {
                    step: text,
                    current: 1, // Fallback
                    total: 10   // Fallback
                };
            }

            setGuideData(data);

            // Navigate to GuidePage with the initial data and the current hardware list
            // Navigate to GuidePage with the initial data, project ID, components, and the session ID
            navigate('/guide', { 
                state: { 
                    initialGuide: data, 
                    projectId: projectId, 
                    existingComponents: project.components,
                    sessionId: sessionId
                } 
            });
        } catch (error) {
            console.error("Agent communication error:", error);
            // Check if it's a CORS issue or a JSON parsing issue
            if (error.name === 'SyntaxError') {
                console.warn("Agent returned non-JSON response. Attempting to recover...");
            }
            alert("The AI Agent is currently recalibrating. Please make sure the n8n workflow is ACTIVE and set to 'Respond to Webhook' correctly.");
        } finally {
            setIsGuideLoading(false);
        }
    };

    const handleNextStep = async () => {
        setIsGuideLoading(true);
        try {
            const response = await fetch(`${AGENT_BASE_URL}/webhook/assembly-guide`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chatInput: "NEXT",
                    projectId: projectId
                })
            });

            if (!response.ok) throw new Error('Failed to fetch next step');

            let data;
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                data = await response.json();
            } else {
                const text = await response.text();
                data = {
                    step: text,
                    current: (guideData?.current || 0) + 1,
                    total: guideData?.total || 10
                };
            }
            setGuideData(data);
        } catch (error) {
            console.error("Error fetching next step:", error);
        } finally {
            setIsGuideLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center">
                <div className="text-[#00f3ff] font-mono-tech animate-pulse uppercase tracking-[0.3em]">
                    ACCESSING_PROJECT_DATA...
                </div>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-10">
                <div className="text-[#ff4400] font-mono-tech uppercase mb-4">[ ERROR: PROJECT_NOT_FOUND ]</div>
                <button onClick={() => navigate('/home')} className="border border-[#333] px-6 py-2 text-[#666] hover:text-[#eeeeee] hover:border-[#eeeeee] transition-all font-mono-tech text-xs">
                    RETURN_TO_HOME
                </button>
            </div>
        );
    }

    const possibleStatuses = ["PLANNED", "WAITING FOR PARTS", "ASSEMBLYING", "TROUBLESHOOT", "COMPLETE", "ABANDONED"];
    const getStatusStyle = (status) => {
        const s = status?.toUpperCase();
        switch (s) {
            case "COMPLETE": return { color: "#ccff00", borderColor: "#ccff00" };
            case "ABANDONED": return { color: "#ff4400", borderColor: "#ff4400" };
            case "ASSEMBLYING": return { color: "#00f3ff", borderColor: "#00f3ff" };
            case "TROUBLESHOOT": return { color: "#ffae00", borderColor: "#ffae00" };
            case "WAITING FOR PARTS": return { color: "#00f3ff", borderColor: "#333" };
            default: return { color: "#eeeeee", borderColor: "#333" };
        }
    };

    // Calculate Saved Guide Progress from components column
    const savedGuideObj = project?.components?.find(c => c.type === 'assembly_guide');
    const savedGuideSteps = savedGuideObj ? savedGuideObj.data : [];
    const hasSavedGuide = savedGuideSteps.length > 0;

    let savedGuideProgressPct = 0;
    if (hasSavedGuide) {
        let totalPct = 0;
        savedGuideSteps.forEach(step => {
            if (Array.isArray(step.instructions)) {
                const instCount = step.instructions.length;
                if (instCount === 0) {
                    totalPct += 10;
                } else {
                    let tickedCount = 0;
                    step.instructions.forEach(inst => {
                        if (inst.status === 'ticked') tickedCount++;
                    });
                    totalPct += (tickedCount / instCount) * 10;
                }
            }
        });
        savedGuideProgressPct = Math.floor(totalPct);
        if (savedGuideProgressPct > 100) savedGuideProgressPct = 100;
    }

    return (
        <div className="min-h-screen bg-[#050505] text-[#eeeeee] p-5 md:p-10 selection:bg-[#00f3ff] selection:text-black">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&family=Space+Mono:ital,wght@0,400;0,700;1,400;1,700&display=swap');
                body { font-family: 'Outfit', sans-serif; }
                .font-mono-tech { font-family: 'Space Mono', monospace; }
                /* Custom Scrollbar for dark theme */
                ::-webkit-scrollbar { width: 6px; }
                ::-webkit-scrollbar-track { background: #050505; }
                ::-webkit-scrollbar-thumb { background: #222; border-radius: 10px; }
                ::-webkit-scrollbar-thumb:hover { background: #333; }
            `}</style>

            <div className="max-w-6xl mx-auto space-y-12">
                {/* Header section identical to before */}
                <header className="space-y-4">
                    <button onClick={() => navigate(-1)} className="text-[#00f3ff] border border-[#00f3ff] px-4 py-1.5 text-[10px] font-black tracking-widest hover:bg-[#00f3ff] hover:text-black transition-all font-mono-tech">
                        &lt; BACK_TO_DASHBOARD
                    </button>
                    <div className="pt-4 flex flex-col md:flex-row md:items-end justify-between gap-10 border-b border-[#1a1a1a] pb-10">
                        <div className="flex-grow">
                            <div className="flex items-center gap-2 text-[#00f3ff] text-[10px] font-mono-tech mb-2">
                                <span className="w-2 h-2 bg-[#00f3ff]"></span> PROJECT_MANIFEST // {project.id.split('-')[0].toUpperCase()}
                            </div>
                            <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-tight mb-4">{project.name}</h1>
                            <p className="text-[#888] font-normal text-base max-w-2xl leading-relaxed">{project.description || "NO_DESC_FOUND"}</p>
                        </div>
                        <div className="bg-[#0a0a0a] p-8 border border-[#333] min-w-[340px] shadow-2xl">
                            <div className="w-full text-right border-b border-[#1a1a1a] pb-4 mb-6">
                                <div className="text-[#666] text-[10px] font-mono-tech uppercase mb-1 tracking-widest">AGGREGATE_VALUE</div>
                                <div className="text-4xl md:text-5xl font-black text-[#00f3ff] font-mono-tech">LKR {Number(project.total_price).toLocaleString()}</div>
                            </div>
                            <div className="w-full relative">
                                <span className="block text-[10px] font-black font-mono-tech text-[#ccff00] mb-3 uppercase tracking-[0.2em]">BUILD_STATUS:</span>
                                <div className="relative group">
                                    <select value={project.status?.toUpperCase() || "PLANNED"} onChange={(e) => handleStatusChange(e.target.value)} disabled={updatingStatus} style={getStatusStyle(project.status)} className="w-full appearance-none bg-[#1a1a1a] border-2 px-5 py-4 text-sm font-black font-mono-tech uppercase outline-none cursor-pointer transition-all hover:bg-[#222]">
                                        {possibleStatuses.map(s => <option key={s} value={s} className="bg-[#111] text-white font-bold">{s}</option>)}
                                    </select>
                                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-[#666]">▼</div>
                                    {updatingStatus && <div className="absolute -top-1 -right-1 animate-ping h-4 w-4 rounded-full bg-[#00f3ff] opacity-75"></div>}
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    <div className="lg:col-span-2 space-y-8">
                        <div className="flex items-center justify-between border-l-4 border-[#ccff00] pl-4">
                            <h2 className="text-2xl font-black uppercase tracking-widest text-[#eeeeee]">HARDWARE_STACK</h2>
                            <span className="text-[10px] font-mono-tech text-[#333] uppercase font-bold">COUNT: {project.components?.length || 0}</span>
                        </div>

                        <div className="space-y-6">
                            {project.components && project.components.filter(c => c.type !== 'assembly_guide').map((comp, idx) => (
                                <div key={idx} className={`group bg-[#0a0a0a] border ${comp.isBought ? 'border-[#ccff00]/40' : 'border-[#1a1a1a]'} p-8 hover:border-[#00f3ff44] transition-all relative overflow-hidden`}>
                                    <div className="flex flex-col md:flex-row gap-8 items-start relative z-10">
                                        <div className={`w-28 h-28 bg-[#1a1a1a] border-2 ${comp.isBought ? 'border-[#ccff00]' : 'border-[#222]'} flex-shrink-0 flex items-center justify-center relative overflow-hidden group/img`}>
                                            {(comp.image || comp.image_url) ? (
                                                <img
                                                    src={comp.image || comp.image_url}
                                                    alt={comp.name}
                                                    style={{ transform: comp.image_rotate ? `rotate(${comp.image_rotate}deg)` : 'none' }}
                                                    className="object-contain w-full h-full p-2 filter grayscale group-hover/img:grayscale-0 transition-all duration-700 ease-out"
                                                />
                                            ) : (
                                                <div className="text-[#333] text-[10px] font-mono-tech uppercase transform -rotate-12 group-hover/img:text-[#00f3ff] transition-colors font-black">HW_NODE</div>
                                            )}
                                        </div>

                                        <div className="flex-grow min-w-0 h-full flex flex-col">
                                            <div className="flex justify-between items-start gap-6 mb-4">
                                                <div className="min-w-0 flex-grow">
                                                    <div className="text-[#00f3ff] text-[10px] font-black font-mono-tech uppercase tracking-widest border-b border-[#1a1a1a] inline-block pb-1">{comp.type || ""}</div>
                                                    <h3 className="text-2xl font-black uppercase tracking-tight text-white group-hover:text-[#00f3ff] transition-colors leading-tight">{comp.name}</h3>
                                                </div>
                                                <div className="flex gap-3 flex-shrink-0">
                                                    <button onClick={() => startEditing(idx)} className="p-3 bg-[#111] border-2 border-[#1a1a1a] text-[#444] hover:text-[#00f3ff] hover:border-[#00f3ff] transition-all"><PencilSquareIcon className="w-5 h-5" /></button>
                                                    <button className="p-3 bg-[#111] border-2 border-[#1a1a1a] text-[#444] hover:text-[#ff4400] hover:border-[#ff4400] transition-all"><TrashIcon className="w-5 h-5" /></button>
                                                </div>
                                            </div>

                                            {/* Attribute mapping */}
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-8 border-t border-[#1a1a1a] pt-4 mb-8">
                                                {Object.entries(comp).map(([key, value]) => {
                                                    if (['name', 'type', 'id', 'image', 'image_url', 'image_rotate', 'price', 'specs', 'isBought'].includes(key)) return null;
                                                    if (!value) return null;
                                                    return (
                                                        <div key={key} className="flex flex-col">
                                                            <span className="text-[10px] font-black font-mono-tech text-[#444] uppercase tracking-wider mb-0.5">{key.replace(/_/g, ' ')}</span>
                                                            <span className="text-xs font-bold text-[#888] uppercase break-words leading-tight">{String(value)}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            <div className="mt-auto flex justify-between items-end pt-4 border-t border-[#1a1a1a]">
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-black font-mono-tech text-[#00f3ff] uppercase tracking-wider mb-1">UNIT_VALUATION:</span>
                                                    <span className="text-2xl font-black text-white font-mono-tech">LKR {Number(comp.price || 0).toLocaleString()}</span>
                                                </div>
                                                <div className="flex gap-3">
                                                    {!comp.isBought ? (
                                                        <>
                                                            <button className="flex items-center gap-2 px-5 py-2.5 bg-[#111] border-2 border-[#222] hover:border-[#00f3ff] transition-all text-[11px] font-black font-mono-tech uppercase tracking-widest" onClick={() => navigate('/market')}><ShoppingCartIcon className="w-4 h-4" />VIEW_ON_MARKET</button>
                                                            <button className="flex items-center gap-2 px-5 py-2.5 bg-[#111] border-2 border-[#222] hover:border-[#ccff00] transition-all text-[11px] font-black font-mono-tech uppercase tracking-widest" onClick={() => toggleBought(idx)}><PlusCircleIcon className="w-4 h-4" />ENTER_BOUGHT</button>
                                                        </>
                                                    ) : (
                                                        <button className="flex items-center gap-2 px-5 py-2.5 bg-[#ccff00] border-2 border-[#ccff00] text-black hover:bg-black hover:text-[#ccff00] transition-all text-[11px] font-black font-mono-tech uppercase tracking-widest group/bought" onClick={() => toggleBought(idx)}>
                                                            <CheckBadgeIcon className="w-4 h-4" /><span className="group-hover/bought:hidden">ALREADY_OWNED</span>
                                                            <span className="hidden group-hover/bought:inline flex items-center gap-1"><ArrowPathIcon className="w-4 h-4 animate-spin" />REVERT_TO_PLANNED</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Action Panel */}
                    <div className="space-y-8">
                        <div className="bg-[#0a0a0a] border border-[#333] p-8 space-y-8 sticky top-[-15px] shadow-2xl">
                            <div className="text-[11px] font-black font-mono-tech text-[#00f3ff] border-b-2 border-[#1a1a1a] pb-6 uppercase tracking-[0.3em]">CORE_COMMAND_PANEL</div>
                            <div className="flex flex-col gap-4">
                                <button className="w-full bg-[#ccff00] text-black py-4 text-[12px] font-black uppercase tracking-widest hover:bg-white transition-all flex items-center justify-center gap-2 group">
                                    <ShieldCheckIcon className="w-5 h-5" />
                                    CHECK_COMPATIBILITY
                                </button>
                                <button
                                    className="w-full border-2 border-[#333] text-[#eeeeee] py-4 text-[12px] font-black uppercase tracking-widest hover:border-[#00f3ff] transition-all flex items-center justify-center gap-2"
                                    onClick={handleDetectBottlenecks}
                                    disabled={isAnalyzing}
                                >
                                    {isAnalyzing ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <BarsArrowUpIcon className="w-5 h-5" />}
                                    {isAnalyzing ? "CALCULATING_BALANCE..." : "DETECT_BOTTLENECKS"}
                                </button>
                                <button
                                    className="w-full border-2 border-[#333] text-[#eeeeee] py-4 text-[12px] font-black uppercase tracking-widest hover:border-[#00f3ff] transition-all flex items-center justify-center gap-2 group"
                                    onClick={() => setIsPerfModalOpen(true)}
                                    disabled={!bottleneckReport}
                                >
                                    <PresentationChartLineIcon className="w-5 h-5 group-hover:text-[#00f3ff] transition-colors" />
                                    PERFORMANCE_DASHBOARD
                                </button>
                                <button
                                    className="w-full border-2 border-[#333] text-[#eeeeee] py-4 text-[13px] font-black uppercase tracking-widest hover:border-[#00f3ff] hover:text-[#00f3ff] transition-all flex items-center justify-center gap-2"
                                    onClick={() => setIsCompareModalOpen(true)}
                                >
                                    <ArrowsRightLeftIcon className="w-5 h-5" />
                                    COMPARE_BUILDS
                                </button>

                                {hasSavedGuide ? (
                                    <button
                                        className="w-full border-2 border-[#00ff88] text-[#00ff88] py-4 text-[13px] font-black uppercase tracking-widest hover:bg-[#00ff88] hover:text-black transition-all font-mono-tech flex justify-center items-center gap-2 shadow-[0_0_15px_rgba(0,255,136,0.1)]"
                                        onClick={() => navigate('/guide', { state: { initialGuide: savedGuideSteps, projectId: project.id, isViewingOnly: true, existingComponents: project.components } })}
                                    >
                                        VIEW SAVED GUIDE ({savedGuideProgressPct}%)
                                    </button>
                                ) : (
                                    <button
                                        className={`w-full border-2 border-[#333] text-[#eeeeee] py-4 text-[13px] font-black uppercase tracking-widest hover:border-[#00f3ff] transition-all font-mono-tech ${isGuideLoading ? 'animate-pulse opacity-50' : ''}`}
                                        onClick={handleGetAssemblyGuide}
                                        disabled={isGuideLoading}
                                    >
                                        {isGuideLoading ? 'AGENT_COMPUTING...' : 'GET_ASSEMBLY_GUIDE'}
                                    </button>
                                )}

                                <button
                                    className="w-full border-2 border-[#333] text-[#eeeeee] py-4 text-[13px] font-black uppercase tracking-widest hover:border-[#00f3ff] hover:text-[#00f3ff] transition-all flex items-center justify-center gap-2 group"
                                    onClick={() => setIs3DModalOpen(true)}
                                >
                                    <CubeTransparentIcon className="w-5 h-5 group-hover:text-[#00f3ff] transition-colors" />
                                    3D_HARDWARE_PREVIEW
                                </button>
                                <button
                                    className="w-full border-2 border-[#333] text-[#eeeeee] py-4 text-[13px] font-black uppercase tracking-widest hover:border-[#00f3ff] transition-all font-mono-tech"
                                    onClick={() => navigate('/community/upload', { state: { prefillBuildId: project.id } })}
                                >
                                    SHARE_WITH_COMMUNITY
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Editing Modal */}
            {editingCompIndex !== null && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex items-center justify-center p-6 overflow-y-auto">
                    <div className="bg-[#0a0a0a] border-2 border-[#333] w-full max-w-2xl overflow-hidden relative shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                        <div className="bg-[#111] p-6 border-b border-[#333] flex justify-between items-center">
                            <div className="text-[#00f3ff] text-xs font-black font-mono-tech uppercase tracking-widest">EDIT_HARDWARE_PARAMETER // {project.components[editingCompIndex].type}</div>
                            <button onClick={() => setEditingCompIndex(null)} className="text-[#444] hover:text-white transition-colors"><XMarkIcon className="w-6 h-6" /></button>
                        </div>
                        <div className="p-8 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4 col-span-2">
                                    <label className="text-[10px] font-black font-mono-tech text-[#555] uppercase tracking-widest">UNIT_NAME / MODEL</label>
                                    <input
                                        type="text" value={editForm.name}
                                        onChange={(e) => handleEditChange('name', e.target.value)}
                                        className="w-full bg-[#050505] border-2 border-[#222] px-4 py-3 text-white font-bold outline-none focus:border-[#00f3ff] transition-all uppercase text-sm"
                                    />
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black font-mono-tech text-[#555] uppercase tracking-widest">VALUATION (LKR)</label>
                                    <input
                                        type="number" value={editForm.price}
                                        onChange={(e) => handleEditChange('price', e.target.value)}
                                        className="w-full bg-[#050505] border-2 border-[#222] px-4 py-3 text-white font-bold outline-none focus:border-[#00f3ff] transition-all uppercase text-sm"
                                    />
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black font-mono-tech text-[#555] uppercase tracking-widest">IMAGE_PATH / URL</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text" value={editForm.image || ''}
                                            placeholder="https://example.com/img.jpg"
                                            onChange={(e) => handleEditChange('image', e.target.value)}
                                            className="w-full bg-[#050505] border-2 border-[#222] px-4 py-3 text-white font-bold outline-none focus:border-[#00f3ff] transition-all uppercase text-sm"
                                        />
                                        <button className="p-3 bg-[#111] border-2 border-[#222] text-[#444]"><PhotoIcon className="w-5 h-5" /></button>
                                    </div>
                                </div>

                                {/* Dynamic Attributes Editing */}
                                {Object.entries(editForm).map(([key, value]) => {
                                    if (['name', 'type', 'id', 'image', 'image_url', 'image_rotate', 'price', 'specs', 'isBought'].includes(key)) return null;
                                    return (
                                        <div key={key} className="space-y-4">
                                            <label className="text-[10px] font-black font-mono-tech text-[#555] uppercase tracking-widest">{key.replace(/_/g, ' ')}</label>
                                            <input
                                                type="text" value={value || ''}
                                                onChange={(e) => handleEditChange(key, e.target.value)}
                                                className="w-full bg-[#050505] border-2 border-[#222] px-4 py-3 text-white font-bold outline-none focus:border-[#00f3ff] transition-all uppercase text-sm"
                                            />
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="pt-8 border-t border-[#1a1a1a] flex justify-end gap-4">
                                <button onClick={() => setEditingCompIndex(null)} className="px-8 py-3 text-xs font-black font-mono-tech text-[#444] uppercase tracking-widest hover:text-white transition-all">CANCEL</button>
                                <button onClick={saveEdit} className="px-10 py-3 bg-[#00f3ff] text-black text-xs font-black font-mono-tech uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(0,243,255,0.2)] flex items-center gap-2 hover:bg-white transition-all">
                                    <CheckIcon className="w-4 h-4" />
                                    SYNC_CHANGES
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Comparison Modal */}
            {isCompareModalOpen && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
                    <div className="bg-[#0a0a0a] border-2 border-[#333] w-full max-w-xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                        <div className="bg-[#111] p-6 border-b border-[#333] flex justify-between items-center">
                            <div className="text-[#ccff00] text-xs font-black font-mono-tech uppercase tracking-widest">SELECT_TARGET_BUILD_FOR_COMPARISON</div>
                            <button onClick={() => setIsCompareModalOpen(false)} className="text-[#444] hover:text-white transition-colors"><XMarkIcon className="w-6 h-6" /></button>
                        </div>
                        <div className="p-6 max-h-[400px] overflow-y-auto space-y-3">
                            {allProjects.length > 0 ? allProjects.map(p => (
                                <button key={p.id} className="w-full flex items-center justify-between p-4 bg-[#111] border border-[#222] hover:border-[#00f3ff] transition-all group">
                                    <div className="text-left">
                                        <div className="text-[10px] font-bold text-[#444] font-mono-tech uppercase">{p.id.split('-')[0]}</div>
                                        <div className="text-sm font-black text-[#eeeeee] uppercase group-hover:text-[#00f3ff]">{p.name}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] font-bold text-[#444] font-mono-tech uppercase">LKR</div>
                                        <div className="text-base font-black text-[#666] group-hover:text-white">{Number(p.total_price).toLocaleString()}</div>
                                    </div>
                                </button>
                            )) : (
                                <div className="text-center py-10">
                                    <div className="text-[#333] font-mono-tech uppercase text-xs">NO_SAVED_PROJECTS_FOUND_IN_DATA_STREAM</div>
                                </div>
                            )}
                        </div>
                        <div className="p-6 bg-[#050505] border-t border-[#111] text-[9px] font-mono-tech text-[#444] uppercase tracking-widest text-center">
                            SELECT_A_SAVED_CONSTRUCT_TO_INITIATE_DIFFERENTIAL_ANALYSIS
                        </div>
                    </div>
                </div>
            )}
            {/* Bottleneck Analysis Modal */}
            <BottleneckAnalysisModal
                isOpen={isBottleneckModalOpen}
                onClose={() => setIsBottleneckModalOpen(false)}
                report={bottleneckReport}
            />
            <PerformanceDashboardModal
                isOpen={isPerfModalOpen}
                onClose={() => setIsPerfModalOpen(false)}
                report={bottleneckReport}
            />

            {/* 3D Hardware Preview Modal */}
            {is3DModalOpen && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[100] flex items-center justify-center p-6">
                    <div className="bg-[#0a0a0a] border-2 border-[#00f3ff] w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden shadow-[0_0_50px_rgba(0,243,255,0.15)] relative">
                        <div className="bg-[#111] p-6 border-b border-[#333] flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="text-[#00f3ff] text-xs font-black font-mono-tech uppercase tracking-widest flex items-center gap-2">
                                    <CubeTransparentIcon className="w-5 h-5" />
                                    3D_HARDWARE_PREVIEW // {active3DModel.toUpperCase()}
                                </div>
                                <div className="text-[10px] text-[#666] font-mono-tech border border-[#333] px-2 py-0.5 rounded-sm">
                                    REPRESENTATIVE_MODEL
                                </div>
                            </div>
                            <button onClick={() => setIs3DModalOpen(false)} className="text-[#444] hover:text-white transition-colors"><XMarkIcon className="w-6 h-6" /></button>
                        </div>
                        <div className="flex-1 bg-black relative">
                            <SecureModelViewer modelId={active3DModel} />

                            {/* Overlay UI elements for aesthetics */}
                            <div className="absolute bottom-6 right-6 pointer-events-none text-right">
                                <div className="text-[10px] text-[#00f3ff] font-mono-tech font-bold uppercase tracking-widest">INTERACTIVE_PREVIEW</div>
                                <div className="text-[8px] text-[#444] font-mono-tech">DRAG TO ROTATE // SCROLL TO ZOOM</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BuildDetailsPage;
