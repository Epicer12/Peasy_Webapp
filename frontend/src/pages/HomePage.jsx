import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { getProjects } from '../services/componentService';

const HomePage = () => {
    const navigate = useNavigate();
    // Kept actual state management from feature branch to display real user projects
    const [savedBuilds, setSavedBuilds] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Use onAuthStateChanged to ensure auth is initialized before fetching
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            const projects = await getProjects(user?.email);
            setSavedBuilds(projects || []);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Reconciled static data structures (present in both)
    const warrantyItems = [
        { id: 1, name: "RTX 3080", daysLeft: 450, totalDays: 1095, color: "cyan-400" },
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
            {/* Section 1: Current Projects - THEME: CYAN */}
            <section className="space-y-6">
                <div className="flex items-center gap-4">
                    <div className="w-3 h-3 bg-cyan-400"></div>
                    <h2 className="text-xl font-bold uppercase tracking-tighter text-[#eeeeee]">
                        CURRENT_PROJECTS
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loading ? (
                        <div className="col-span-full py-10 text-center text-[#666] font-mono animate-pulse uppercase tracking-widest">
                            SYNCHRONIZING_PROJECTS...
                        </div>
                    ) : savedBuilds.length === 0 ? (
                        <div className="col-span-full py-10 border border-dashed border-[#333] text-center text-[#444] font-mono uppercase text-xs">
                            NO_PROJECTS_FOUND
                        </div>
                    ) : (
                        savedBuilds.map(build => (
                            <div
                                key={build.id}
                                onClick={() => navigate('/build-details/' + build.id)}
                                className="bg-[#050505] p-5 border border-[#333] hover:border-cyan-400 transition-colors group relative flex flex-col cursor-pointer"
                            >
                                {/* Corner Brackets - Kept premium UI accents */}
                                <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#333] group-hover:border-cyan-400"></div>
                                <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-[#333] group-hover:border-cyan-400"></div>
                                <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-[#333] group-hover:border-cyan-400"></div>
                                <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#333] group-hover:border-cyan-400"></div>

                                <div className="w-full h-32 bg-[#1a1a1a] mb-4 flex items-center justify-center border border-[#333] group-hover:border-cyan-400 transition-colors">
                                    <span className="font-mono text-xs text-[#666] uppercase">[BUILD_IMG]</span>
                                </div>

                                <div className="flex justify-between items-start mb-3">
                                    <h3 className="font-mono text-base text-[#eeeeee] group-hover:text-cyan-400 transition-colors">{build.name}</h3>
                                    <span className={`px-2 py-0.5 text-xs font-bold font-mono border ${build.progress === 100 ? 'border-cyan-400 text-cyan-400' : 'border-[#333] text-[#666]'}`}>
                                        {build.status}
                                    </span>
                                </div>

                                {/* Segmented Progress Bar */}
                                <div className="w-full flex gap-1 mb-3">
                                    {[...Array(10)].map((_, i) => (
                                        <div
                                            key={i}
                                            className={i < (build.progress / 10) ? 'h-2 flex-1 bg-cyan-400' : 'h-2 flex-1 bg-[#1a1a1a]'}
                                        ></div>
                                    ))}
                                </div>

                                <div className="flex justify-between text-xs font-mono text-[#666] mt-auto">
                                    <span>PRG: {build.progress}%</span>
                                    <span>EST: {build.price}</span>
                                </div>
                            </div>
                        ))
                    )}

                    {/* Integrated Initiate Build Card from both branches */}
                    <div
                        onClick={() => navigate('/plan')}
                        className="bg-[#050505] p-5 border border-[#333] hover:border-[#ccff00] transition-all group relative flex flex-col justify-center items-center cursor-pointer min-h-[200px]"
                    >
                        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#333] group-hover:border-[#ccff00]"></div>
                        <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-[#333] group-hover:border-[#ccff00]"></div>
                        <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-[#333] group-hover:border-[#ccff00]"></div>
                        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#333] group-hover:border-[#ccff00]"></div>

                        <div className="text-4xl mb-3 text-[#ccff00] group-hover:scale-110 transition-transform">🛠</div>
                        <h3 className="font-mono text-base text-[#eeeeee] uppercase tracking-widest mb-2 group-hover:text-[#ccff00]">
                            INITIATE_BUILD
                        </h3>
                        <p className="text-xs font-mono text-[#666] text-center uppercase tracking-tighter">
                            GENERATE_CUSTOM_SPECIFICATIONS
                        </p>
                    </div>
                </div>
            </section>

            {/* Section 2: Market Deals - THEME: ORANGE */}
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
                            <div className="absolute top-0 right-0 bg-[#ff4400] text-black text-xs font-bold px-2 py-0.5 font-mono">
                                {deal.discount}
                            </div>
                            <div className="h-32 bg-[#111] border-b border-[#333] flex items-center justify-center text-[#333] overflow-hidden relative">
                                <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 opacity-10">
                                    {[...Array(16)].map((_, i) => <div key={i} className="border border-[#333]"></div>)}
                                </div>
                                <span className="font-mono text-xs z-10">[IMG_PLACEHOLDER]</span>
                            </div>
                            <div className="p-4">
                                <h4 className="font-bold text-[#eeeeee] text-sm mb-2 uppercase tracking-wide group-hover:text-[#ff4400] transition-colors">{deal.name}</h4>
                                <div className="flex justify-between items-baseline font-mono">
                                    <span className="text-[#ff4400] text-base font-bold">{deal.price}</span>
                                    <span className="text-[#666] text-xs line-through">{deal.oldPrice}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Section 3: Warranty Log - THEME: LIME */}
            <section className="space-y-6">
                <div className="flex items-center gap-4">
                    <div className="w-3 h-3 bg-[#ccff00]"></div>
                    <h2 className="text-xl font-bold uppercase tracking-tighter text-[#eeeeee]">
                        WARRANTY_LOG
                    </h2>
                </div>

                <div className="bg-[#050505] p-5 border border-[#333] space-y-4 max-w-xl hover:border-[#ccff00] transition-colors">
                    {warrantyItems.map(item => (
                        <div key={item.id} className="space-y-1">
                            <div className="flex justify-between text-xs font-mono text-[#666] uppercase">
                                <span>{item.name}</span>
                                <span>{item.daysLeft} DAYS LEFT</span>
                            </div>
                            <div className="w-full h-1.5 bg-[#1a1a1a]">
                                <div
                                    className="h-full"
                                    style={{
                                        width: `${(item.daysLeft / item.totalDays) * 100}%`,
                                        backgroundColor: 'lime'
                                    }}
                                ></div>
                            </div>
                        </div>
                    ))}
                    <button className="w-full py-3 mt-6 text-xs font-bold font-mono text-black bg-[#eeeeee] hover:bg-[#ccff00] transition-colors uppercase tracking-widest">
                        VIEW_FULL_LOG
                    </button>
                </div>
            </section>
        </div>
    );
};

export default HomePage;
