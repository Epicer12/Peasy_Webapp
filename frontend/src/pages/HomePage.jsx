import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { auth } from '../firebase';
import { getProjects } from '../services/componentService';
import { getWarranties } from '../services/warrantyService';
import { getMarketplaceOffers } from '../services/marketplaceService';

const HomePage = () => {
    const navigate = useNavigate();
    // Kept actual state management from feature branch to display real user projects
    const [savedBuilds, setSavedBuilds] = useState([]);
    const [warrantyItems, setWarrantyItems] = useState([]);
    const [marketplaceOffers, setMarketplaceOffers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [warrantyLoading, setWarrantyLoading] = useState(true);
    const [offersLoading, setOffersLoading] = useState(true);

    useEffect(() => {
        // Use onAuthStateChanged to ensure auth is initialized before fetching
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                const projects = await getProjects(user.email);
                setSavedBuilds(projects || []);
                
                const warranties = await getWarranties();
                setWarrantyItems(warranties || []);
            } else {
                setSavedBuilds([]);
                setWarrantyItems([]);
            }
            setLoading(false);
            setWarrantyLoading(false);
        });

        // Fetch marketplace offers independently
        const fetchOffers = async () => {
             setOffersLoading(true);
             const offers = await getMarketplaceOffers();
             setMarketplaceOffers(offers || []);
             setOffersLoading(false);
        };
        fetchOffers();

        return () => unsubscribe();
    }, []);




    return (
        <div className="max-w-7xl mx-auto space-y-12 pb-20 p-5">
            {/* Main Dashboard Grid: Projects (2/3) + Warranty (1/3) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                
                {/* Section 1: Current Projects - THEME: CYAN */}
                <section className="lg:col-span-2 space-y-8">
                    <div className="flex items-center gap-4">
                        <div className="w-3 h-3 bg-cyan-400"></div>
                        <h2 className="text-xl font-black uppercase tracking-tighter text-[#eeeeee]">
                            ACTIVE_SYSTEMS
                        </h2>
                        <div className="flex-1 h-[1px] bg-gradient-to-r from-[#333] to-transparent"></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {loading ? (
                            <div className="col-span-full py-20 text-center text-[#666] font-mono animate-pulse uppercase tracking-[0.5em] text-xs">
                                SYNCING_PROJECT_DATABASE...
                            </div>
                        ) : savedBuilds.length === 0 ? (
                            <div className="col-span-full py-16 border border-dashed border-[#222] text-center text-[#444] font-mono uppercase text-[10px] tracking-widest">
                                NO_ACTIVE_CONFIGURATIONS_DETECTED
                            </div>
                        ) : (
                            savedBuilds.map(build => (
                                <div
                                    key={build.id}
                                    onClick={() => navigate('/build-details/' + build.id)}
                                    className="bg-[#080808] p-5 border border-[#1a1a1a] hover:border-cyan-400 transition-all group relative flex flex-col cursor-pointer overflow-hidden"
                                >
                                    {/* Corner Brackets */}
                                    <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#222] group-hover:border-cyan-400"></div>
                                    <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#222] group-hover:border-cyan-400"></div>

                                    <div className="w-full h-36 bg-[#0c0c0c] mb-5 flex items-center justify-center border border-[#1a1a1a] group-hover:border-cyan-900/50 transition-colors relative overflow-hidden">
                                        <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                                        {build.image_url ? (
                                            <img 
                                                src={build.image_url} 
                                                alt={build.name} 
                                                className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-500"
                                            />
                                        ) : (
                                            <span className="font-mono text-[10px] text-[#333] uppercase tracking-[0.3em] z-10">UNIT_VISUAL_0{build.id % 9}</span>
                                        )}
                                        {/* Scanline effect */}
                                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/5 to-transparent h-1/2 w-full animate-scanline pointer-events-none"></div>
                                    </div>

                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="font-black text-sm text-[#eeeeee] group-hover:text-cyan-400 transition-colors uppercase tracking-wider">{build.name}</h3>
                                        <span className={`px-2 py-0.5 text-[8px] font-black font-mono border ${build.progress === 100 ? 'border-cyan-400 text-cyan-400' : 'border-[#222] text-[#444]'}`}>
                                            {build.status}
                                        </span>
                                    </div>

                                    {/* Segmented Progress Bar */}
                                    <div className="w-full flex gap-[2px] mb-4">
                                        {[...Array(10)].map((_, i) => (
                                            <div
                                                key={i}
                                                className={`h-1.5 flex-1 transition-all duration-500 ${i < (build.progress / 10) ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]' : 'bg-[#111]'}`}
                                            ></div>
                                        ))}
                                    </div>

                                    <div className="flex justify-between text-[10px] font-mono text-[#444] mt-auto uppercase tracking-tighter">
                                        <span>SYSTEM_SYNC: {build.progress}%</span>
                                        <span>VAL: {build.price}</span>
                                    </div>
                                </div>
                            ))
                        )}

                        <div
                            onClick={() => navigate('/plan')}
                            className="bg-[#080808] p-5 border border-[#1a1a1a] hover:border-[#ccff00] transition-all group relative flex flex-col justify-center items-center cursor-pointer min-h-[220px] overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#222] group-hover:border-[#ccff00]"></div>
                            <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#222] group-hover:border-[#ccff00]"></div>
                            
                            <div className="text-3xl mb-4 group-hover:scale-125 transition-transform duration-500">⚙️</div>
                            <h3 className="font-black text-sm text-[#eeeeee] uppercase tracking-[0.2em] mb-2 group-hover:text-[#ccff00]">
                                NEW_BUILD
                            </h3>
                            <p className="text-[10px] font-mono text-[#444] text-center uppercase tracking-widest px-4">
                                INITIALIZE_SYSTEM_DESIGN_PROTOCOLS
                            </p>
                        </div>
                    </div>
                </section>

                {/* Section: Warranty Sidebar - THEME: LIME */}
                <aside className="space-y-8">
                    <div className="flex items-center gap-4">
                        <div className="w-3 h-3 bg-[#ccff00]"></div>
                        <h2 className="text-xl font-black uppercase tracking-tighter text-[#eeeeee]">
                            LIFESPAN_MONITOR
                        </h2>
                    </div>

                    <div className="bg-[#080808] p-6 border border-[#1a1a1a] space-y-6 relative overflow-hidden min-h-[400px]">
                        <div className="absolute top-0 right-0 p-3 flex gap-1">
                            <div className="w-1 h-1 bg-[#ccff00] animate-pulse"></div>
                            <div className="w-1 h-1 bg-[#ccff00] animate-pulse delay-75"></div>
                            <div className="w-1 h-1 bg-[#ccff00] animate-pulse delay-150"></div>
                        </div>

                        {warrantyLoading ? (
                            <div className="py-20 text-center text-[#666] font-mono animate-pulse uppercase tracking-widest text-[10px]">
                                SCANNING_WARRANTIES...
                            </div>
                        ) : warrantyItems.length === 0 ? (
                            <div className="py-20 text-center space-y-6">
                                <p className="text-[#444] font-mono uppercase text-[10px] tracking-widest">NO_LOGS_FOUND</p>
                                <Link 
                                    to="/warranty"
                                    className="inline-block px-5 py-2.5 text-[9px] font-black font-mono border border-[#1a1a1a] text-[#666] hover:border-[#ccff00] hover:text-[#ccff00] transition-all uppercase tracking-[0.2em]"
                                >
                                    ADD_WARRANTY
                                </Link>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-5">
                                    {warrantyItems.map(item => (
                                        <div key={item.id} className="space-y-2 group">
                                            <div className="flex justify-between text-[10px] font-mono text-[#555] uppercase group-hover:text-[#ccff00] transition-colors">
                                                <span className="truncate max-w-[140px] font-black leading-none">{item.name}</span>
                                                <span className="leading-none">{item.daysLeft}D_REMAINING</span>
                                            </div>
                                            <div className="w-full h-[3px] bg-[#111] overflow-hidden">
                                                <div
                                                    className="h-full transition-all duration-1000 shadow-[0_0_5px_rgba(204,255,0,0.3)]"
                                                    style={{
                                                        width: `${item.percentage}%`,
                                                        backgroundColor: item.status
                                                    }}
                                                ></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="pt-6 mt-6 border-t border-[#111]">
                                    <Link 
                                        to="/warranty"
                                        className="block w-full py-4 text-center text-[10px] font-black font-mono text-black bg-[#ccff00] hover:bg-[#aacc00] transition-all uppercase tracking-[0.2em] shadow-[0_0_15px_rgba(204,255,0,0.1)] hover:shadow-[0_0_20px_rgba(204,255,0,0.2)]"
                                    >
                                        WARRANTY_HUB
                                    </Link>
                                </div>
                            </>
                        )}
                        
                        {/* Decorative scanline or grid could go here */}
                        <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#ccff00]/20 to-transparent"></div>
                    </div>
                </aside>
            </div>

            {/* Section 2: Featured Marketplace Products - THEME: ORANGE */}
            <section className="space-y-8 pt-8 border-t border-[#111]">
                <div className="flex items-center gap-4">
                    <div className="w-3 h-3 bg-[#ff4400]"></div>
                    <h2 className="text-xl font-black uppercase tracking-tighter text-[#eeeeee]">
                        MARKET_INTELLIGENCE
                    </h2>
                    <div className="flex-1 h-[1px] bg-gradient-to-r from-[#333] to-transparent"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {offersLoading ? (
                        <div className="col-span-full py-16 text-center text-[#666] font-mono animate-pulse uppercase tracking-[0.4em] text-xs">
                            FETCHING_MARKET_DATA...
                        </div>
                    ) : marketplaceOffers.length === 0 ? (
                        <div className="col-span-full py-16 border border-dashed border-[#222] text-center text-[#444] font-mono uppercase text-[10px] tracking-widest">
                            OUT_OF_STOCK
                        </div>
                    ) : (
                        marketplaceOffers.map(offer => (
                            <div key={offer.id} className="bg-[#080808] border border-[#1a1a1a] relative group hover:border-[#ff4400] transition-all cursor-pointer overflow-hidden flex flex-col">
                                {offer.discount_percentage && (
                                    <div className="absolute top-0 right-0 bg-[#ff4400] text-black text-[9px] font-black px-2 py-1 font-mono z-20">
                                        -{offer.discount_percentage}%
                                    </div>
                                )}
                                <div className="h-44 bg-[#0c0c0c] border-b border-[#111] flex items-center justify-center relative overflow-hidden p-4">
                                    {offer.image_url ? (
                                        <img 
                                            src={offer.image_url} 
                                            alt={offer.name}
                                            className="w-full h-full object-contain opacity-70 group-hover:opacity-100 transition-all duration-700 group-hover:scale-110"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 opacity-5">
                                            {[...Array(16)].map((_, i) => <div key={i} className="border border-[#333]"></div>)}
                                        </div>
                                    )}
                                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#080808] to-transparent"></div>
                                </div>
                                <div className="p-4 relative flex-1 flex flex-col">
                                    <span className="text-[8px] font-black text-[#ff4400] uppercase tracking-[0.2em] mb-1">{offer.brand}</span>
                                    <h4 className="font-bold text-xs text-[#ddd] mb-4 uppercase tracking-wide group-hover:text-white transition-colors line-clamp-2 min-h-[32px]">
                                        {offer.name}
                                    </h4>
                                    <div className="mt-auto pt-4 border-t border-[#111] flex justify-between items-center">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-[#ff4400] tracking-tighter">
                                                Rs. {(offer.offer_price || offer.actual_price).toLocaleString()}
                                            </span>
                                            {offer.offer_price && (
                                                <span className="text-[#333] text-[9px] line-through leading-none">
                                                    Rs. {offer.actual_price.toLocaleString()}
                                                </span>
                                            )}
                                        </div>
                                        <div className="w-6 h-6 border border-[#222] group-hover:border-[#ff4400] flex items-center justify-center transition-colors">
                                            <ArrowRightIcon className="w-3 h-3 text-[#333] group-hover:text-[#ff4400] transition-colors" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                <div className="flex justify-end pt-4">
                    <Link 
                        to="/marketplace"
                        className="text-[10px] font-black text-[#ff4400] uppercase tracking-[0.3em] hover:text-white transition-colors flex items-center gap-3 group"
                    >
                        EXTENDED_MARKETPLACE_CATALOG 
                        <div className="p-2 border border-[#333] group-hover:border-[#ff4400] transition-colors">
                            <ArrowRightIcon className="w-4 h-4" />
                        </div>
                    </Link>
                </div>
            </section>
        </div>
    );
};

export default HomePage;
