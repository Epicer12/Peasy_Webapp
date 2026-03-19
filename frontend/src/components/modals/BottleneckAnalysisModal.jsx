import React from 'react';
import {
    XMarkIcon,
    BarsArrowUpIcon,
    ShieldCheckIcon
} from '@heroicons/react/24/outline';

const BottleneckAnalysisModal = ({ isOpen, onClose, report }) => {
    if (!isOpen || !report) return null;

    return (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
            <div className="bg-[#0a0a0a] border-2 border-[#ccff00]/30 w-full max-w-2xl overflow-hidden shadow-[0_0_100px_rgba(204,255,0,0.1)] relative">
                {/* Static Pattern Background */}
                <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#ccff00_1px,transparent_1px)] [background-size:20px_20px]"></div>

                <div className="bg-[#111] p-6 border-b border-[#ccff00]/20 flex justify-between items-center relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#ccff00] text-black rounded-lg">
                            <BarsArrowUpIcon className="w-5 h-5" />
                        </div>
                        <div className="text-[#ccff00] text-xs font-black font-mono-tech uppercase tracking-[0.2em]">SYSTEM_BALANCE_DIAGNOSTIC</div>
                    </div>
                    <button onClick={onClose} className="text-[#444] hover:text-[#ccff00] transition-colors">
                        <XMarkIcon className="w-7 h-7" />
                    </button>
                </div>

                <div className="p-10 space-y-10 relative z-10">
                    {/* Main Diagnostic Display */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
                        <div className="relative aspect-square flex items-center justify-center">
                            {/* Circular Gauge Placeholder */}
                            <div className="absolute inset-0 border-[16px] border-[#1a1a1a] rounded-full"></div>
                            <div className={`absolute inset-0 border-[16px] border-t-[#ccff00] border-r-[#ccff00] ${report.bottleneck_percentage > 20 ? 'border-l-[#ff4400]' : 'border-l-[#ccff00]'} rounded-full transform rotate-45`}></div>
                            <div className="text-center">
                                <div className="text-5xl font-black text-white font-mono-tech">{report.ratio}</div>
                                <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">G/C RATIO</div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <div className="text-[10px] font-black text-[#666] uppercase tracking-widest">DIAGNOSTIC_VERDICT:</div>
                                <div className={`text-xl font-black uppercase italic leading-tight ${report.bottleneck_type === 'NONE' ? 'text-[#ccff00]' : 'text-white'}`}>
                                    {report.verdict}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-white/5 border border-white/5 rounded-xl">
                                    <div className="text-[9px] font-black text-[#444] uppercase mb-1">CPU_MARK</div>
                                    <div className="text-lg font-black text-white font-mono-tech">{report.score_cpu.toLocaleString()}</div>
                                </div>
                                <div className="p-4 bg-white/5 border border-white/5 rounded-xl">
                                    <div className="text-[9px] font-black text-[#444] uppercase mb-1">GPU_MARK</div>
                                    <div className="text-lg font-black text-white font-mono-tech">{report.score_gpu.toLocaleString()}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Recommendations / Warnings */}
                    <div className="space-y-4">
                        {report.warnings && report.warnings.length > 0 && (
                            <div className="space-y-2">
                                {report.warnings.map((w, idx) => (
                                    <div key={idx} className="flex gap-3 items-center p-4 bg-[#ff4400]/10 border border-[#ff4400]/30 rounded-xl text-[#ff4400] text-xs font-bold uppercase tracking-wide">
                                        <ShieldCheckIcon className="w-5 h-5 shrink-0" />
                                        {w}
                                    </div>
                                ))}
                            </div>
                        )}

                        {report.recommendations && report.recommendations.length > 0 && (
                            <div className="p-6 bg-[#ccff00]/5 border border-[#ccff00]/10 rounded-2xl relative overflow-hidden group">
                                <div className="absolute right-0 top-0 p-4 opacity-10">
                                    <BarsArrowUpIcon className="w-16 h-16 text-[#ccff00]" />
                                </div>
                                <h4 className="text-[10px] font-black text-[#ccff00] uppercase tracking-[0.2em] mb-4">OPTIMIZATION_STRATEGY:</h4>
                                <ul className="space-y-3">
                                    {report.recommendations.map((rec, idx) => (
                                        <li key={idx} className="flex gap-3 text-sm text-gray-300 font-medium italic">
                                            <span className="text-[#ccff00]">→</span>
                                            {rec}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full py-4 bg-white text-black text-xs font-black uppercase tracking-[0.3em] hover:bg-[#ccff00] transition-all font-mono-tech"
                    >
                        CLOSE_DIAGNOSTICS
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BottleneckAnalysisModal;
