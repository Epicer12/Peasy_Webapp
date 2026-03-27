import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getProjects } from '../services/componentService';
import { auth } from '../firebase';
import { XMarkIcon } from '@heroicons/react/24/outline';

const AssemblePage = () => {
    const navigate = useNavigate();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(false);

    const openModal = async () => {
        setIsModalOpen(true);
        setLoading(true);
        try {
            const user = auth.currentUser;
            const data = await getProjects(user?.email);
            // Filter by specific statuses as requested
            const filtered = data.filter(p => {
                const s = p.status?.toUpperCase();
                return s === "PLANNED" || s === "WAITING FOR PARTS" || s === "ASSEMBLYING";
            });
            setProjects(filtered);
        } catch (error) {
            console.error("Error fetching projects:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleProjectSelect = (projectId) => {
        navigate(`/build-details/${projectId}`);
    };

    return (
        <div className="flex flex-col h-full space-y-6 max-w-7xl mx-auto relative">
            <div className="border-b-2 border-[#333] pb-4">
                <h1 className="text-4xl md:text-6xl font-black text-[#eeeeee] tracking-tighter uppercase leading-none">
                    ASSEMBLY_<span className="text-[#00ff88]">HUB</span>
                </h1>
                <p className="text-sm font-mono text-[#666] mt-3 uppercase tracking-widest">
                    // CONSTRUCTION_PHASE // SELECT_TOOL
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-[40vh]">
                {/* Guided Assembly */}
                <div onClick={openModal} className="group relative bg-[#050505] border border-[#333] hover:border-[#00ff88] transition-all cursor-pointer flex flex-col justify-between p-6 overflow-hidden block">
                    <div className="absolute inset-0 bg-[#00ff88] transform translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-in-out z-0 opacity-10"></div>

                    {/* Corner Markers */}
                    <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#00ff88] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-[#00ff88] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-[#00ff88] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#00ff88] opacity-0 group-hover:opacity-100 transition-opacity"></div>

                    <div className="relative z-10">
                        <span className="font-mono text-[#00ff88] text-[10px] tracking-widest block mb-3">// MODE_01</span>
                        <h3 className="text-3xl md:text-4xl font-black text-[#eeeeee] uppercase leading-none mb-4">
                            GUIDED<br />ASSEMBLY
                        </h3>
                        <p className="font-mono text-[#888] text-[10px] max-w-sm group-hover:text-[#eeeeee] transition-colors">
                            STEP_BY_STEP_INSTRUCTIONS. BLUEPRINT_VISUALIZATION.
                        </p>
                    </div>

                    <div className="relative z-10 mt-8 w-full">
                        <div className="py-3 border border-[#00ff88] text-[#00ff88] font-black font-mono uppercase tracking-widest text-center text-xs group-hover:bg-[#00ff88] group-hover:text-black transition-all">
                            GET_GUIDANCE
                        </div>
                    </div>
                </div>

                {/* Scan & Assemble */}
                <Link to="/camera" className="group relative bg-[#050505] border border-[#333] hover:border-[#00f3ff] transition-all cursor-pointer flex flex-col justify-between p-6 overflow-hidden block">
                    <div className="absolute inset-0 bg-[#00f3ff] transform translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-in-out z-0 opacity-10"></div>

                    {/* Corner Markers */}
                    <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#00f3ff] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-[#00f3ff] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-[#00f3ff] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#00f3ff] opacity-0 group-hover:opacity-100 transition-opacity"></div>

                    <div className="relative z-10">
                        <span className="font-mono text-[#00f3ff] text-[10px] tracking-widest block mb-3">// MODE_02</span>
                        <h3 className="text-3xl md:text-4xl font-black text-[#eeeeee] uppercase leading-none mb-4">
                            SCANNER<br />MODULE
                        </h3>
                        <p className="font-mono text-[#888] text-[10px] max-w-sm group-hover:text-[#eeeeee] transition-colors">
                            OPTICAL_RECOGNITION. COMPONENT_IDENTIFICATION. LIVE_DIAGNOSTICS.
                        </p>
                    </div>

                    <div className="relative z-10 mt-8 w-full">
                        <div className="py-3 border border-[#00f3ff] text-[#00f3ff] font-black font-mono uppercase tracking-widest text-center text-xs group-hover:bg-[#00f3ff] group-hover:text-black transition-all">
                            ACTIVATE_LENS
                        </div>
                    </div>
                </Link>
            </div>

            {/* Modal for Project Selection */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
                    <div className="bg-[#0a0a0a] border-2 border-[#333] w-full max-w-xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                        <div className="bg-[#111] p-6 border-b border-[#333] flex justify-between items-center">
                            <div className="text-[#00ff88] text-xs font-black font-mono uppercase tracking-widest">INITIATE_GUIDED_ASSEMBLY</div>
                            <button onClick={() => setIsModalOpen(false)} className="text-[#444] hover:text-white transition-colors"><XMarkIcon className="w-6 h-6" /></button>
                        </div>

                        <div className="p-8 space-y-6">
                            <h4 className="text-[#eeeeee] font-black uppercase text-lg">SELECT_GUIDE_SOURCE</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <button onClick={() => navigate('/camera')} className="bg-[#111] border border-[#333] hover:border-[#00f3ff] p-4 text-left group transition-all">
                                    <div className="text-[#00f3ff] text-[10px] font-mono mb-2 uppercase tracking-widest">// NEW_HARDWARE</div>
                                    <div className="text-sm font-black text-white uppercase group-hover:text-[#00f3ff]">SCAN_COMPONENTS</div>
                                </button>
                                <div className="border border-[#333] p-4 bg-[#111]/50 flex flex-col justify-center opacity-70">
                                     <div className="text-xs font-mono text-[#666] uppercase text-center tracking-widest">// OR_SELECT_BELOW</div>
                                </div>
                            </div>
                            
                            <div className="pt-6 border-t border-[#1a1a1a]">
                                <h4 className="text-[#888] font-mono text-[10px] uppercase tracking-[0.2em] mb-4">CURRENT_ACTIVE_PROJECTS</h4>
                                <div className="max-h-[300px] overflow-y-auto space-y-3 pr-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#333 #0a0a0a' }}>
                                    {loading ? (
                                        <div className="text-xs text-[#00ff88] font-mono animate-pulse uppercase border border-[#1a1a1a] p-4 text-center">FETCHING_PROJECT_DATA...</div>
                                    ) : projects.length > 0 ? (
                                        projects.map(p => (
                                            <button 
                                                key={p.id} 
                                                onClick={() => handleProjectSelect(p.id)}
                                                className="w-full text-left bg-[#111] border border-[#222] p-4 hover:border-[#00ff88] group transition-all flex justify-between items-center"
                                            >
                                                <div>
                                                    <div className="text-[10px] font-mono text-[#444] group-hover:text-[#00ff88] uppercase tracking-widest">{p.id.split('-')[0]}</div>
                                                    <div className="text-sm font-black text-[#eeeeee] uppercase">{p.name || "UNNAMED_PROJECT"}</div>
                                                </div>
                                                <div className="text-[10px] font-mono px-2 py-1 bg-[#1a1a1a] text-[#888] rounded-sm uppercase border border-[#222]">
                                                    {p.status || "PLANNED"}
                                                </div>
                                            </button>
                                        ))
                                    ) : (
                                        <div className="text-xs font-mono text-[#444] uppercase p-4 border border-[#1a1a1a] text-center bg-[#111]">NO_ACTIVE_PROJECTS_FOUND</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssemblePage;
