import React from 'react';
import {
    XMarkIcon,
    PresentationChartLineIcon,
    CpuChipIcon
} from '@heroicons/react/24/outline';
import PerformanceSummary from '../build/PerformanceSummary';

const PerformanceDashboardModal = ({ isOpen, onClose, report }) => {
    if (!isOpen || !report) return null;

    return (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
            <div className="bg-[#0a0a0a] border-2 border-[#00f3ff]/30 w-full max-w-4xl overflow-hidden shadow-[0_0_100px_rgba(0,243,255,0.1)] relative">
                {/* Static Pattern Background */}
                <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#00f3ff_1px,transparent_1px)] [background-size:20px_20px]"></div>

                <div className="bg-[#111] p-6 border-b border-[#00f3ff]/20 flex justify-between items-center relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#00f3ff] text-black rounded-lg">
                            <PresentationChartLineIcon className="w-5 h-5" />
                        </div>
                        <div className="text-[#00f3ff] text-xs font-black font-mono-tech uppercase tracking-[0.2em]">PERFORMANCE_CAPABILITY_INDEX</div>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-black border border-[#222] rounded-full">
                            <CpuChipIcon className="w-4 h-4 text-[#666]" />
                            <span className="text-[10px] font-black font-mono-tech text-gray-400 uppercase tracking-widest">REALTIME_ESTIMATION_ENGINE_V2</span>
                        </div>
                        <button onClick={onClose} className="text-[#444] hover:text-[#00f3ff] transition-colors">
                            <XMarkIcon className="w-7 h-7" />
                        </button>
                    </div>
                </div>

                <div className="p-10 relative z-10 max-h-[80vh] overflow-y-auto custom-scrollbar">
                    <PerformanceSummary report={report} />
                    
                    <div className="mt-10 pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="text-[10px] font-black text-[#444] uppercase tracking-widest text-center md:text-left">
                            DATA_SOURCE: CPU_MARK / G3DMARK // FPS_COEFFICIENTS_V1.2
                        </div>
                        <button
                            onClick={onClose}
                            className="px-10 py-4 bg-white text-black text-xs font-black uppercase tracking-[0.3em] hover:bg-[#00f3ff] transition-all font-mono-tech"
                        >
                            RETURN_TO_BUILD
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PerformanceDashboardModal;
