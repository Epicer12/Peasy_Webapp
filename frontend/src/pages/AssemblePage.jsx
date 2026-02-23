import React from 'react';
import { Link } from 'react-router-dom';

const AssemblePage = () => {
    return (
        <div className="flex flex-col h-full space-y-6 max-w-7xl mx-auto">
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
                <Link to="/guide" className="group relative bg-[#050505] border border-[#333] hover:border-[#00ff88] transition-all cursor-pointer flex flex-col justify-between p-6 overflow-hidden block">
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
                            GET_GUIDENCE
                        </div>
                    </div>
                </Link>

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
        </div>
    );
};

export default AssemblePage;
