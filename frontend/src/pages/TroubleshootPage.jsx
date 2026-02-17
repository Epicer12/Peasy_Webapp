import React from 'react';

const TroubleshootPage = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8">
            <div className="text-9xl opacity-20 select-none">⚠️</div>
            <div className="space-y-4">
                <h1 className="text-5xl md:text-7xl font-black text-[#eeeeee] uppercase tracking-tighter leading-none">
                    SYSTEM<br /><span className="text-[#ff4400]">DIAGNOSTICS</span>
                </h1>
                <div className="inline-block border-2 border-[#ff4400] px-4 py-1">
                    <p className="font-mono text-[#ff4400] text-sm uppercase tracking-widest">
                        // MODULE_OFFLINE // UNDER_DEVELOPMENT
                    </p>
                </div>
                <p className="text-[#888] font-mono text-sm max-w-md mx-auto">
                    ADVANCED_ERROR_DETECTION_PROTOCOLS_ARE_BEING_COMPILED. CHECK_BACK_LATER.
                </p>
            </div>
            <div className="w-full max-w-md h-2 bg-[#1a1a1a] overflow-hidden">
                <div className="h-full bg-[#ff4400] w-2/3 animate-pulse"></div>
            </div>
        </div>
    );
};

export default TroubleshootPage;
