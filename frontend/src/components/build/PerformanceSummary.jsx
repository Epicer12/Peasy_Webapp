import React, { useState } from 'react';
import { 
    CpuChipIcon, 
    BoltIcon, 
    SignalIcon, 
    ChartBarIcon,
    RocketLaunchIcon
} from '@heroicons/react/24/outline';

const PerformanceSummary = ({ report }) => {
    const [resolution, setResolution] = useState('1080p');
    
    if (!report || !report.performance) return null;
    
    const { fps, power, speeds } = report.performance;
    const currentFps = fps[resolution] || [];

    const getFpsColor = (val) => {
        if (val >= 144) return 'text-[#ccff00]';
        if (val >= 60) return 'text-[#00f3ff]';
        return 'text-[#ffae00]';
    };

    const getProgressColor = (val) => {
        if (val >= 144) return 'bg-[#ccff00]';
        if (val >= 60) return 'bg-[#00f3ff]';
        return 'bg-[#ffae00]';
    };

    return (
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-[#1a1a1a] flex flex-col md:flex-row justify-between items-center gap-4 bg-[#0d0d0d]">
                <div className="flex items-center gap-3">
                    <RocketLaunchIcon className="w-6 h-6 text-[#00f3ff]" />
                    <div>
                        <h3 className="text-xl font-black uppercase tracking-widest text-[#eeeeee]">PERFORMANCE_PROJECTION</h3>
                        <p className="text-[10px] font-mono-tech text-[#555] uppercase tracking-widest">Simulated @ High/Ultra Settings</p>
                    </div>
                </div>
                
                {/* Resolution Switcher */}
                <div className="flex bg-[#050505] p-1 border border-[#333]">
                    {['1080p', '1440p', '4K'].map((res) => (
                        <button
                            key={res}
                            onClick={() => setResolution(res)}
                            className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                                resolution === res 
                                ? 'bg-[#00f3ff] text-black shadow-[0_0_15px_rgba(0,243,255,0.4)]' 
                                : 'text-[#444] hover:text-[#eeeeee]'
                            }`}
                        >
                            {res}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-[#1a1a1a]">
                
                {/* FPS Dashboard */}
                <div className="lg:col-span-2 p-8 space-y-6">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-[11px] font-black font-mono-tech text-[#00f3ff] uppercase tracking-[0.2em]">ESTIMATED_FPS_REAL_TIME</span>
                        <div className="flex gap-4 text-[9px] font-mono-tech text-[#444]">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-[#ffae00]"></span> POOR</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-[#00f3ff]"></span> GOOD</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-[#ccff00]"></span> ELITE</span>
                        </div>
                    </div>

                    <div className="space-y-5">
                        {currentFps.length > 0 ? currentFps.map((game, idx) => (
                            <div key={idx} className="group">
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-sm font-black uppercase text-[#888] group-hover:text-[#eeeeee] transition-colors">{game.game.replace(/([A-Z])/g, ' $1').trim()}</span>
                                    <span className={`text-xl font-black font-mono-tech ${getFpsColor(game.fps)}`}>{game.fps} FPS</span>
                                </div>
                                <div className="h-1.5 w-full bg-[#111] overflow-hidden">
                                    <div 
                                        className={`h-full transition-all duration-1000 ${getProgressColor(game.fps)} shadow-[0_0_10px_currentColor]`}
                                        style={{ width: `${Math.min((game.fps / 240) * 100, 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        )) : (
                            <div className="py-10 text-center border-2 border-dashed border-[#1a1a1a] text-[#333] font-mono-tech uppercase text-xs">
                                INSUFFICIENT_DATA_FOR_PROJECTION
                            </div>
                        )}
                    </div>
                </div>

                {/* Specs & Power */}
                <div className="p-8 space-y-8 bg-[#080808]">
                    {/* Power Stats */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-[#ccff00] text-[11px] font-black font-mono-tech uppercase tracking-widest">
                            <BoltIcon className="w-4 h-4" /> POWER_DYNAMICS
                        </div>
                        <div className="bg-[#111] p-5 border border-[#1a1a1a] rounded-sm">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] text-[#555] font-black uppercase">EST_LOAD_WATTAGE</span>
                                <span className="text-lg font-black text-[#eeeeee] font-mono-tech">{power.estimated_wattage}W</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] text-[#555] font-black uppercase">REC_PSU_CAPACITY</span>
                                <span className="text-lg font-black text-[#ccff00] font-mono-tech">{power.recommended_psu}W</span>
                            </div>
                        </div>
                    </div>

                    {/* Clock Speeds */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-[#00f3ff] text-[11px] font-black font-mono-tech uppercase tracking-widest">
                            <SignalIcon className="w-4 h-4" /> ENGINE_FREQUENCIES
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            <div className="bg-[#111] p-4 border border-[#1a1a1a] flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <CpuChipIcon className="w-5 h-5 text-[#444]" />
                                    <span className="text-[10px] text-[#888] font-black uppercase">CPU_BOOST</span>
                                </div>
                                <span className="text-base font-black text-[#eeeeee] font-mono-tech">{speeds.cpu}</span>
                            </div>
                            <div className="bg-[#111] p-4 border border-[#1a1a1a] flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <ChartBarIcon className="w-5 h-5 text-[#444]" />
                                    <span className="text-[10px] text-[#888] font-black uppercase">GPU_CLOCK</span>
                                </div>
                                <span className="text-base font-black text-[#eeeeee] font-mono-tech">{speeds.gpu}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Footer */}
            <div className="p-4 bg-[#050505] border-t border-[#1a1a1a] text-center">
                <span className="text-[9px] font-mono-tech text-[#333] uppercase tracking-[0.3em]">
                    DATA_SOURCE: PEASY_PERFORMANCE_ENGINE_V1.0 // BOTTLENECK_PERCENTAGE: {report.bottleneck_percentage}%
                </span>
            </div>
        </div>
    );
};

export default PerformanceSummary;
