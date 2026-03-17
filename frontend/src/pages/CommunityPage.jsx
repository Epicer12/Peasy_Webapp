import React from 'react';

const CommunityPage = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8">
            <div className="text-9xl opacity-20 select-none">🌐</div>
            <div className="space-y-4">
                <h1 className="text-5xl md:text-7xl font-black text-[#eeeeee] uppercase tracking-tighter leading-none">
                    HIVE<br /><span className="text-[#ccff00]">MIND</span>
                </h1>
                <div className="inline-block border-2 border-[#ccff00] px-4 py-1">
                    <p className="font-mono text-[#ccff00] text-black text-sm uppercase tracking-widest font-bold">
                        // SIGNAL_LOST // RECONNECTING
                    </p>
                </div>
                <p className="text-[#888] font-mono text-sm max-w-md mx-auto">
                    COMMUNITY_FORUM_NODES_ARE_OFFLINE. MAINTENANCE_SCHEDULED.
                </p>
            </div>
            <div className="w-full max-w-md h-2 bg-[#1a1a1a] overflow-hidden">
                <div className="h-full bg-[#ccff00] w-1/2 animate-pulse"></div>
            </div>
        </div>
    );
};

export default CommunityPage;
