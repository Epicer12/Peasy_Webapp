import React, { useState } from 'react';

const makeSVG = (label) => {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'><rect width='400' height='300' fill='#0d0d0d'/><rect x='60' y='60' width='280' height='180' rx='12' fill='#00f3ff11' stroke='#00f3ff' stroke-width='1.5'/><text x='200' y='158' text-anchor='middle' font-family='monospace' font-size='20' font-weight='bold' fill='#00f3ff'>${label}</text><text x='200' y='183' text-anchor='middle' font-family='monospace' font-size='10' fill='#00f3ff66'>NO IMAGE</text></svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

const FALLBACK_BY_TYPE = {
    gpu: makeSVG('GPU'),
    cpu: makeSVG('CPU'),
    motherboard: makeSVG('MOTHERBOARD'),
    ram: makeSVG('RAM'),
    ssd: makeSVG('SSD'),
    psu: makeSVG('PSU'),
    case: makeSVG('CASE'),
    case_fans: makeSVG('CASE FAN'),
    cooler: makeSVG('CPU COOLER'),
};

const ProductCard = ({ product, onClick }) => {
    const hasOffer = product.offer_price;
    const fallback = FALLBACK_BY_TYPE[product.type] || FALLBACK_BY_TYPE.gpu;
    const [imgSrc, setImgSrc] = useState(product.image_url || fallback);
    const isMultiShop = product.available_shops && product.available_shops.length > 1;

    return (
        <div className="group relative flex flex-col h-full cursor-pointer" onClick={onClick}>
            {/* Offer Badge / Multi-Shop Badge */}
            <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
                {hasOffer && (
                    <div className="bg-[var(--color-neon-orange)] text-black text-[10px] font-black px-2 py-1 uppercase tracking-widest shadow-[0_0_10px_var(--color-neon-orange)]">
                        {product.discount_percentage}% OFF
                    </div>
                )}
                {isMultiShop && (
                    <div className="bg-[#111] border border-[var(--color-neon-blue)] text-[var(--color-neon-blue)] text-[9px] font-mono px-2 py-1 uppercase tracking-widest bg-opacity-80">
                        {product.available_shops.length} SHOPS
                    </div>
                )}
            </div>

            {/* Image Container */}
            <div className="relative w-full aspect-[4/3] bg-[#0c0c0c] mb-4 flex items-center justify-center overflow-hidden transition-all duration-500 rounded-sm border border-[#1a1a1a] group-hover:border-[var(--color-neon-blue)] group-hover:bg-[#111]">
                <img
                    src={imgSrc}
                    alt={product.name}
                    className="object-contain w-full h-full p-4 transform group-hover:scale-105 group-hover:-translate-y-2 transition-all duration-700 ease-out"
                    onError={() => setImgSrc(fallback)}
                />
            </div>

            {/* Content Container */}
            <div className="flex flex-col flex-grow">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] text-[var(--color-neon-blue)] uppercase tracking-widest font-mono">
                        {product.brand || 'SYS.COMP'}
                    </span>
                </div>

                <h4 className="text-[#eee] font-medium text-sm leading-snug mb-3 group-hover:text-white transition-colors line-clamp-2">
                    {product.name}
                </h4>

                <div className="mt-auto flex items-end">
                    {hasOffer ? (
                        <div className="flex items-baseline space-x-3">
                            <span className="text-lg text-[var(--color-neon-orange)] font-black tracking-tight drop-shadow-[0_0_8px_rgba(255,87,34,0.4)]">LKR {product.offer_price?.toLocaleString()}</span>
                            <span className="text-xs text-[#555] line-through font-mono">LKR {product.actual_price?.toLocaleString()}</span>
                        </div>
                    ) : (
                        <span className="text-lg text-white font-bold tracking-tight group-hover:text-[var(--color-neon-blue)] transition-colors">
                            LKR {product.actual_price?.toLocaleString()}
                        </span>
                    )}
                </div>
            </div>

            {/* Quick action line that expands on hover */}
            <div className="h-[3px] w-0 bg-[var(--color-neon-blue)] mt-4 group-hover:w-full transition-all duration-500 ease-out shadow-[0_0_10px_var(--color-neon-blue)]"></div>
        </div>
    );
};

export default ProductCard;
