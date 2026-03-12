import { useNavigate } from 'react-router-dom';

const PlanningPage = () => {
    const navigate = useNavigate();
    return (
        <div className="flex flex-col h-full space-y-6 max-w-7xl mx-auto">
            <div className="border-b-2 border-[#333] pb-4">
                <h1 className="text-4xl md:text-6xl font-black text-[#eeeeee] tracking-tighter uppercase leading-none">
                    BUILD_<span className="text-[#00f3ff]">INIT</span>
                </h1>
                <p className="text-sm font-mono text-[#666] mt-3 uppercase tracking-widest">
                    // SELECT_PROTOCOL // INITIALIZE_SEQUENCE
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-[40vh]">
                {/* Manual Protocol */}
                <div className="group relative bg-[#050505] border border-[#333] hover:border-[#ff4400] transition-all cursor-pointer flex flex-col justify-between p-6 overflow-hidden">
                    <div className="absolute inset-0 bg-[#ff4400] transform translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-in-out z-0 opacity-10"></div>

                    {/* Corner Markers */}
                    <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#ff4400] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-[#ff4400] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-[#ff4400] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#ff4400] opacity-0 group-hover:opacity-100 transition-opacity"></div>

                    <div className="relative z-10">
                        <span className="font-mono text-[#ff4400] text-[10px] tracking-widest block mb-3">// OPTION_01</span>
                        <h3 className="text-3xl md:text-4xl font-black text-[#eeeeee] uppercase leading-none mb-4">
                            MANUAL<br />OVERRIDE
                        </h3>
                        <p className="font-mono text-[#888] text-[10px] max-w-sm group-hover:text-[#eeeeee] transition-colors leading-relaxed">
                            FULL_CONTROL_REQUIRED. SELECT_INDIVIDUAL_COMPONENTS. EXPERT_LEVEL_ONLY.
                        </p>
                    </div>

                    <div className="relative z-10 mt-8">
                        <button
                            onClick={() => navigate('/manual-build')}
                            className="w-full py-3 border border-[#ff4400] text-[#ff4400] font-black font-mono uppercase tracking-widest hover:bg-[#ff4400] hover:text-black transition-all text-xs"
                        >
                            EXECUTE_MANUAL_PLAN
                        </button>
                    </div>
                </div>

                {/* AI Protocol */}
                <div className="group relative bg-[#050505] border border-[#333] hover:border-[#00f3ff] transition-all cursor-pointer flex flex-col justify-between p-6 overflow-hidden">
                    <div className="absolute inset-0 bg-[#00f3ff] transform translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-in-out z-0 opacity-10"></div>

                    {/* Corner Markers */}
                    <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#00f3ff] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-[#00f3ff] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-[#00f3ff] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#00f3ff] opacity-0 group-hover:opacity-100 transition-opacity"></div>

                    <div className="relative z-10">
                        <span className="font-mono text-[#00f3ff] text-[10px] tracking-widest block mb-3">// OPTION_02</span>
                        <h3 className="text-3xl md:text-4xl font-black text-[#eeeeee] uppercase leading-none mb-4">
                            AI_ARCHITECT<br />SYSTEM
                        </h3>
                        <p className="font-mono text-[#888] text-[10px] max-w-sm group-hover:text-[#eeeeee] transition-colors leading-relaxed">
                            ALGORITHMIC_OPTIMIZATION. BUDGET_ANALYSIS. PERFORMANCE_MAXIMIZATION.
                        </p>
                    </div>

                    <div className="relative z-10 mt-8">
                        <button
                            onClick={() => navigate('/build')}
                            className="w-full py-3 border border-[#00f3ff] text-[#00f3ff] font-black font-mono uppercase tracking-widest hover:bg-[#00f3ff] hover:text-black transition-all text-xs"
                        >
                            INITIALIZE_AI_AGENT
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlanningPage;
