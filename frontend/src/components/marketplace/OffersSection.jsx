import React from 'react';
import ProductCard from './ProductCard';

const OffersSection = ({ offers }) => {
    if (!offers || offers.length === 0) return null;

    return (
        <div className="mb-16 relative">
            <div className="absolute -inset-10 bg-gradient-to-r from-[var(--color-neon-blue)] via-transparent to-[var(--color-neon-orange)] opacity-5 blur-3xl rounded-full"></div>
            
            <div className="flex items-end justify-between mb-8 relative z-10">
                <div>
                    <h2 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-white/50 uppercase tracking-tighter">
                        FEATURED_<span className="text-[var(--color-neon-orange)]">ACQUISITIONS</span>
                    </h2>
                    <p className="text-[var(--color-neon-orange)] mt-2 font-mono text-xs md:text-sm tracking-[0.2em] flex items-center">
                        <span className="w-2 h-2 rounded-full bg-[var(--color-neon-orange)] animate-ping mr-3"></span>
                        LIVE_MARKET_OPPORTUNITIES
                    </p>
                </div>
            </div>

            <div className="flex overflow-x-auto gap-6 pb-8 snap-x hide-scrollbar relative z-10 w-[100vw] ml-[calc(-50vw+50%)] px-[calc(50vw-50%)] pr-[50vw] md:pr-0 md:w-auto md:ml-0 md:px-0">
                {offers.map((offer) => (
                    <div key={`${offer.type}-${offer.id}`} className="flex-none w-72 md:w-80 snap-start">
                        <ProductCard product={offer} />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default OffersSection;
