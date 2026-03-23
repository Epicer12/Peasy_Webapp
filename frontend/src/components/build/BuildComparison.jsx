import React, { useState } from 'react';
import { 
    XMarkIcon, 
    SignalIcon, 
    BoltIcon, 
    ChartBarIcon,
    RocketLaunchIcon,
    BarsArrowUpIcon
} from '@heroicons/react/24/outline';

const BuildComparison = ({ builds, onClose }) => {
    const [resolution, setResolution] = useState('1440p');

    if (!builds || builds.length === 0) return null;

    const getFpsColor = (val) => {
        if (val >= 144) return 'text-[#ccff00]';
        if (val >= 60) return 'text-[#00f3ff]';
        return 'text-[#ffae00]';
    };

    const getProgressColor = (val) => {
        if (val >= 144) return 'bg-[#ccff00] shadow-[0_0_10px_rgba(204,255,0,0.4)]';
        if (val >= 60) return 'bg-[#00f3ff] shadow-[0_0_10px_rgba(0,243,255,0.4)]';
        return 'bg-[#ffae00] shadow-[0_0_10px_rgba(255,174,0,0.4)]';
    };

    return (
        <div className="fixed inset-0 bg-[#050505]/98 backdrop-blur-2xl z-[10000] flex flex-col p-6 md:p-12 overflow-y-auto custom-scrollbar">
            {/* Header */}
            <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row justify-between items-center gap-8 mb-12 border-b border-[#1a1a1a] pb-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-[#00f3ff] text-black rounded-sm">
                        <SignalIcon className="w-8 h-8" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black uppercase tracking-tighter text-white">SYSTEM_PERFORMANCE_COMPARISON</h2>
                        <p className="text-[10px] font-mono-tech text-[#555] uppercase tracking-[0.3em] mt-1">Simulated Hardware Diagnostics // Ver 2.1</p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    {/* Resolution Switcher */}
                    <div className="flex bg-[#111] p-1 border border-[#333] rounded-sm">
                        {['1080p', '1440p', '4K'].map((res) => (
                            <button
                                key={res}
                                onClick={() => setResolution(res)}
                                className={`px-6 py-2 text-[11px] font-black uppercase tracking-widest transition-all ${
                                    resolution === res 
                                    ? 'bg-[#00f3ff] text-black shadow-[0_0_20px_rgba(0,243,255,0.3)]' 
                                    : 'text-[#444] hover:text-[#eeeeee]'
                                }`}
                            >
                                {res}
                            </button>
                        ))}
                    </div>

                    <button 
                        onClick={onClose}
                        className="p-3 bg-red-600/10 border border-red-600/30 text-red-600 hover:bg-red-600 hover:text-white transition-all rounded-sm"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Comparison Grid */}
            <div className={`max-w-7xl mx-auto w-full grid grid-cols-1 ${builds.length > 1 ? `md:grid-cols-${Math.min(builds.length, 4)}` : ''} gap-6`}>
                {builds.map((build, idx) => {
                    const analysis = build.analysis;
                    if (!analysis) return null;

                    const perf = analysis.performance || {};
                    const fpsData = perf.fps?.[resolution] || [];
                    const power = perf.power || {};
                    const accent = idx === 0 ? "#ccff00" : (idx === 1 ? "#00f3ff" : (idx === 2 ? "#bf7fff" : "#ff6b35"));

                    return (
                        <div key={build.id} className="relative group">
                            {/* Decorative Frame */}
                            <div className="absolute -inset-[1px] bg-gradient-to-b from-white/10 to-transparent group-hover:from-white/20 transition-all"></div>
                            
                            <div className="relative bg-[#0a0a0a] border border-[#1a1a1a] p-8 h-full flex flex-col">
                                {/* Build Title */}
                                <div className="mb-10 text-center">
                                    <div style={{ color: accent }} className="text-[10px] font-black uppercase tracking-[0.4em] mb-2">{build.name.split(' ')[0]}</div>
                                    <h3 className="text-xl font-black text-white uppercase tracking-tight">{build.name}</h3>
                                </div>

                                {/* Bottleneck Score */}
                                <div className="mb-12 flex flex-col items-center">
                                    <div className="relative w-40 h-40 flex items-center justify-center">
                                        <svg className="w-full h-full transform -rotate-90">
                                            <circle cx="80" cy="80" r="70" stroke="#111" strokeWidth="8" fill="transparent" />
                                            <circle 
                                                cx="80" cy="80" r="70" 
                                                stroke={analysis.bottleneck_percentage > 15 ? '#ff4400' : accent} 
                                                strokeWidth="8" 
                                                fill="transparent"
                                                strokeDasharray="440"
                                                strokeDashoffset={440 - (440 * (100 - analysis.bottleneck_percentage)) / 100}
                                                className="transition-all duration-1000 ease-out"
                                            />
                                        </svg>
                                        <div className="absolute text-center">
                                            <div className="text-3xl font-black text-white">{100 - analysis.bottleneck_percentage}%</div>
                                            <div className="text-[8px] font-black text-[#444] uppercase tracking-widest">EFFICIENCY</div>
                                        </div>
                                    </div>
                                    <div className="mt-6 text-center">
                                        <div className="text-[10px] font-black text-[#555] uppercase tracking-widest mb-1">BOTTLENECK_STATUS</div>
                                        <div className={`text-sm font-black uppercase ${analysis.bottleneck_type === 'NONE' ? 'text-[#ccff00]' : 'text-white'}`}>
                                            {analysis.bottleneck_type === 'NONE' ? 'Optimized' : `${analysis.bottleneck_type} Bottleneck`}
                                        </div>
                                    </div>
                                </div>

                                {/* FPS Stats */}
                                <div className="space-y-6 flex-grow">
                                    <div className="text-[10px] font-black text-[#333] uppercase tracking-widest border-b border-[#111] pb-2 mb-4 flex items-center gap-2">
                                        <RocketLaunchIcon className="w-3 h-3" /> GAMING_PROJECTIONS
                                    </div>
                                    {fpsData.map((g, i) => (
                                        <div key={i}>
                                            <div className="flex justify-between text-[11px] font-bold uppercase mb-1.5">
                                                <span className="text-[#666]">{g.game.replace(/([A-Z])/g, ' $1').trim()}</span>
                                                <span className={getFpsColor(g.fps)}>{g.fps} FPS</span>
                                            </div>
                                            <div className="h-[3px] bg-[#111] w-full relative overflow-hidden">
                                                <div 
                                                    className={`absolute h-full transition-all duration-1000 ${getProgressColor(g.fps)}`}
                                                    style={{ width: `${Math.min((g.fps / 200) * 100, 100)}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Specs Summary */}
                                <div className="mt-12 pt-8 border-t border-[#111] grid grid-cols-2 gap-4">
                                    <div className="bg-[#0d0d0d] p-3 border border-[#1a1a1a]">
                                        <div className="text-[8px] text-[#444] font-black uppercase mb-1">G/C RATIO</div>
                                        <div className="text-sm font-black text-white font-mono-tech">{analysis.ratio}</div>
                                    </div>
                                    <div className="bg-[#0d0d0d] p-3 border border-[#1a1a1a]">
                                        <div className="text-[8px] text-[#444] font-black uppercase mb-1">EST_WATTAGE</div>
                                        <div className="text-sm font-black text-[#ccff00] font-mono-tech">{power.estimated_wattage}W</div>
                                    </div>
                                </div>
                                
                                <div className="mt-6 p-4 bg-white/5 text-[10px] text-gray-400 font-medium italic border-l-2 border-[#333]">
                                    "{analysis.verdict}"
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Comparison Footer */}
            <div className="max-w-7xl mx-auto w-full mt-12 pt-8 border-t border-[#1a1a1a] text-center">
                <p className="text-[10px] font-mono-tech text-[#333] uppercase tracking-[0.5em]">
                    PEASY_BUILD_ANALYZER_ENGINE_V2.0 // BENCHMARK_DRIVEN_LOGIC
                </p>
            </div>
        </div>
    );
};

export default BuildComparison;
