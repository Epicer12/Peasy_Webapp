import React from 'react';
import { Link } from 'react-router-dom';

const HomePage = () => {
    // Mock Data
    const savedBuilds = [
        { id: 1, name: "GAMING_BEAST_24", status: "IN_PROGRESS", progress: 60, price: "$2,400" },
        { id: 2, name: "OFFICE_WRKSTN", status: "COMPLETED", progress: 100, price: "$800" },
    ];

    const warrantyItems = [
        { id: 1, name: "RTX 3080", daysLeft: 450, totalDays: 1095, color: "#00f3ff" },
        { id: 2, name: "AMD RYZEN 9", daysLeft: 200, totalDays: 1095, color: "#ff4400" },
        { id: 3, name: "SAMSUNG 980", daysLeft: 800, totalDays: 1825, color: "#ccff00" },
    ];

    const specialDeals = [
        { id: 1, name: "RTX 4070", discount: "-15%", price: "$599", oldPrice: "$699" },
        { id: 2, name: "CORSAIR RAM", discount: "-20%", price: "$120", oldPrice: "$150" },
        { id: 3, name: "LG 4K MON", discount: "-10%", price: "$350", oldPrice: "$390" },
    ];

    return (
        <div className="max-w-7xl mx-auto space-y-12 pb-20 p-5">
            {/* Section 1: Current Projects (Left Aligned) - THEME: CYAN */}
            <section className="space-y-6">
                <div className="flex items-center gap-4">
                    <div className="w-3 h-3 bg-[#00f3ff]"></div>
                    <h2 className="text-xl font-bold uppercase tracking-tighter text-[#eeeeee]">
                        CURRENT_PROJECTS
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {savedBuilds.map(build => (
                        <div key={build.id} className="bg-[#050505] p-5 border border-[#333] hover:border-[#00f3ff] transition-colors group relative flex flex-col">
                            {/* Corner Brackets */}
                            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#333] group-hover:border-[#00f3ff]"></div>
                            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-[#333] group-hover:border-[#00f3ff]"></div>
                            <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-[#333] group-hover:border-[#00f3ff]"></div>
                            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#333] group-hover:border-[#00f3ff]"></div>

                            {/* Image Placeholder */}
                            <div className="w-full h-32 bg-[#1a1a1a] mb-4 flex items-center justify-center border border-[#333] group-hover:border-[#00f3ff] transition-colors">
                                <span className="font-mono text-[10px] text-[#666] uppercase">[BUILD_IMG]</span>
                            </div>

                            <div className="flex justify-between items-start mb-3">
                                <h3 className="font-mono text-base text-[#eeeeee] group-hover:text-[#00f3ff] transition-colors">{build.name}</h3>
                                <span className={`px-2 py-0.5 text-[10px] font-bold font-mono border ${build.progress === 100 ? 'border-[#00f3ff] text-[#00f3ff]' : 'border-[#333] text-[#666]'}`}>
                                    {build.status}
                                </span>
                            </div>

                            {/* Segmented Progress Bar */}
                            <div className="w-full flex gap-1 mb-3">
                                {[...Array(10)].map((_, i) => (
                                    <div
                                        key={i}
                                        className={`h-2 flex-1 ${i < (build.progress / 10) ? 'bg-[#00f3ff]' : 'bg-[#1a1a1a]'}`}
                                    ></div>
                                ))}
                            </div>

                            <div className="flex justify-between text-[10px] font-mono text-[#666] mt-auto">
                                <span>PRG: {build.progress}%</span>
                                <span>EST: {build.price}</span>
                            </div>
                        </div>
<<<<<<< HEAD
                    ))}
=======
                    </div>
                {/* Build Your Own PC Card */}
                <div
                    onClick={() => navigate('/build')}
                    className="bg-white rounded-xl shadow-lg p-8 cursor-pointer hover:shadow-xl transition-shadow border-2 border-transparent hover:border-purple-500"
                >
                    <div className="text-center">
                        <div className="text-6xl mb-4">🛠</div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-3">
                            Build Your Own PC
                        </h2>
                        <p className="text-gray-600 mb-4">
                            Answer guided questions and generate your custom PC build plan
                        </p>
                        <button className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors font-semibold">
                            Start Building
                        </button>
                    </div>
                </div>
>>>>>>> main

                    {/* Add New Project Card */}
                    <Link to="/plan" className="bg-[#111] p-5 border border-[#333] border-dashed flex flex-col items-center justify-center text-[#666] hover:text-[#eeeeee] hover:border-[#eeeeee] transition-all cursor-pointer min-h-[200px] hover:bg-[#1a1a1a]">
                        <div className="text-4xl font-thin mb-3">+</div>
                        <span className="font-mono text-[10px] tracking-widest uppercase">INIT_NEW_BUILD</span>
                    </Link>
                </div>
            </section>

            {/* Section 2: Market Deals (Right/Alt Aligned) - THEME: ORANGE */}
            <section className="space-y-6">
                <div className="flex items-center justify-end gap-4">
                    <h2 className="text-xl font-bold uppercase tracking-tighter text-[#eeeeee] text-right">
                        MARKET_DEALS
                    </h2>
                    <div className="w-3 h-3 bg-[#ff4400]"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {specialDeals.map(deal => (
                        <div key={deal.id} className="bg-[#050505] border border-[#333] relative group hover:border-[#ff4400] transition-colors">
                            <div className="absolute top-0 right-0 bg-[#ff4400] text-black text-[10px] font-bold px-2 py-0.5 font-mono">
                                {deal.discount}
                            </div>
                            <div className="h-32 bg-[#111] border-b border-[#333] flex items-center justify-center text-[#333] overflow-hidden relative">
                                <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 opacity-10">
                                    {[...Array(16)].map((_, i) => <div key={i} className="border border-[#333]"></div>)}
                                </div>
                                <span className="font-mono text-[10px] z-10">[IMG_PLACEHOLDER]</span>
                            </div>
                            <div className="p-4">
                                <h4 className="font-bold text-[#eeeeee] text-sm mb-2 uppercase tracking-wide group-hover:text-[#ff4400] transition-colors">{deal.name}</h4>
                                <div className="flex justify-between items-baseline font-mono">
                                    <span className="text-[#ff4400] text-base font-bold">{deal.price}</span>
                                    <span className="text-[#666] text-[10px] line-through">{deal.oldPrice}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Section 3: Warranty Log (Left Aligned) - THEME: LIME */}
            <section className="space-y-6">
                <div className="flex items-center gap-4">
                    <div className="w-3 h-3 bg-[#ccff00]"></div>
                    <h2 className="text-xl font-bold uppercase tracking-tighter text-[#eeeeee]">
                        WARRANTY_LOG
                    </h2>
                </div>

                <div className="bg-[#050505] p-5 border border-[#333] space-y-4 max-w-xl hover:border-[#ccff00] transition-colors">
                    {warrantyItems.map(item => {
                        return (
                            <div key={item.id} className="space-y-1">
                                <div className="flex justify-between text-[10px] font-mono text-[#666] uppercase">
                                    <span>{item.name}</span>
                                    <span>{item.daysLeft} DAYS LEFT</span>
                                </div>
                                <div className="w-full h-1.5 bg-[#1a1a1a]">
                                    <div
                                        className="h-full"
                                        style={{
                                            width: `${(item.daysLeft / item.totalDays) * 100}%`,
                                            backgroundColor: item.color === '#00f3ff' ? '#ccff00' : (item.color === '#ff4400' ? '#ccff00' : item.color) // Force Lime theme for this section if generic colors were used
                                        }}
                                    ></div>
                                </div>
                            </div>
                        );
                    })}
                    <button className="w-full py-3 mt-6 text-xs font-bold font-mono text-black bg-[#eeeeee] hover:bg-[#ccff00] transition-colors uppercase tracking-widest">
                        VIEW_FULL_LOG
                    </button>
                </div>
            </section>
            {/* Injected Styles (if needed for other things, marquee removed) */}
            <style>{`
                /* ... specific page styles ... */
            `}</style>
        </div>
    );
<<<<<<< HEAD
};

export default HomePage;
=======
}
>>>>>>> main
