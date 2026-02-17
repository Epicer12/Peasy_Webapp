import React from 'react';

const MarketplacePage = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8">
            <div className="text-9xl opacity-20 select-none">🛒</div>
            <div className="space-y-4">
                <h1 className="text-5xl md:text-7xl font-black text-[#eeeeee] uppercase tracking-tighter leading-none">
                    GLOBAL<br /><span className="text-[#00f3ff]">MARKET</span>
                </h1>
                <div className="inline-block border-2 border-[#00f3ff] px-4 py-1">
                    <p className="font-mono text-[#00f3ff] text-sm uppercase tracking-widest">
                        // CONNECTION_PENDING // ESTABLISHING_UPLINK
                    </p>
                </div>
                <p className="text-[#888] font-mono text-sm max-w-md mx-auto">
                    SECURE_TRADING_PLATFORM_INITIALIZATION_IN_PROGRESS. STANDBY.
                </p>
            </div>
            <div className="w-full max-w-md h-2 bg-[#1a1a1a] overflow-hidden">
                <div className="h-full bg-[#00f3ff] w-1/3 animate-pulse"></div>
            </div>
        </div>
    );
};

export default MarketplacePage;
