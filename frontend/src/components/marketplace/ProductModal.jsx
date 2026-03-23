import React, { useEffect } from 'react';

const ProductModal = ({ product, isOpen, onClose }) => {
    // Prevent background scrolling when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen || !product) return null;

    const hasOffer = product.offer_price;
    const imageUrl = product.image_url || 'https://via.placeholder.com/600x400/050505/00f3ff?text=NO_IMAGE';
    
    // Safety check for specs and status
    const specs = product.specs || product.specifications;
    const status = product.status || "In Stock";

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div 
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
            onClick={handleBackdropClick}
        >
            <div className="relative w-[90%] max-w-4xl bg-[#0a0a0a] border-t-2 border-[var(--color-neon-blue)] rounded-sm shadow-[0_0_40px_rgba(0,243,255,0.15)] flex flex-col md:flex-row overflow-hidden animate-in zoom-in-95 duration-200 ease-out max-h-[90vh]">
                
                {/* Close Button */}
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 text-[#666] hover:text-[var(--color-neon-orange)] transition-colors p-2"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>

                {/* Left: Image Panel */}
                <div className="w-full md:w-1/2 bg-[#050505] p-8 flex items-center justify-center border-b md:border-b-0 md:border-r border-[#1a1a1a] relative group min-h-[300px]">
                    {hasOffer && (
                        <div className="absolute top-4 left-4 bg-[var(--color-neon-orange)] text-black text-[10px] font-black px-3 py-1.5 uppercase tracking-widest shadow-[0_0_10px_var(--color-neon-orange)]">
                            {product.discount_percentage}% OFF
                        </div>
                    )}
                    <img 
                        src={imageUrl} 
                        alt={product.name} 
                        style={{ transform: product.image_rotate ? `rotate(${product.image_rotate}deg)` : 'none' }}
                        className="w-full h-auto max-h-[400px] object-contain drop-shadow-2xl filter group-hover:brightness-110 transition-all duration-500"
                    />
                </div>

                {/* Right: Details Panel */}
                <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col overflow-y-auto">
                    <span className="text-xs text-[var(--color-neon-blue)] uppercase tracking-[0.2em] font-mono mb-2 block">
                        {product.brand || 'SYS.COMP'} // {product.type || 'Hardware'}
                    </span>
                    
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 leading-tight">
                        {product.name}
                    </h2>

                    {/* Price Block */}
                    <div className="mb-8 p-4 bg-[#111] border border-[#222] rounded-sm shrink-0">
                        <div className="text-[10px] text-[#888] uppercase tracking-widest mb-1 font-mono">Market Value</div>
                        {hasOffer ? (
                            <div className="flex items-end gap-3 flex-wrap">
                                <span className="text-3xl text-[var(--color-neon-orange)] font-black tracking-tight break-all">LKR {product.offer_price?.toLocaleString()}</span>
                                <span className="text-sm text-[#555] line-through font-mono mb-1 break-all">LKR {product.actual_price?.toLocaleString()}</span>
                            </div>
                        ) : (
                            <span className="text-3xl text-white font-black tracking-tight break-all">
                                LKR {product.actual_price?.toLocaleString()}
                            </span>
                        )}
                        
                        {/* Status Tag */}
                        <div className="mt-3 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-[#00ff00] animate-pulse shadow-[0_0_8px_#00ff00]"></div>
                            <span className="text-xs text-[#00ff00] font-mono uppercase tracking-wider">{status}</span>
                        </div>
                    </div>

                    {/* Specs Block */}
                    <div className="mb-8 flex-grow">
                        <h4 className="text-sm text-[#888] uppercase tracking-widest mb-3 border-b border-[#222] pb-2">Technical Specifications</h4>
                        {specs ? (
                            typeof specs === 'string' ? (
                                <p className="text-sm text-[#bbb] leading-relaxed">{specs}</p>
                            ) : (
                                <ul className="space-y-2 text-sm text-[#bbb]">
                                    {Object.entries(specs).map(([key, val]) => (
                                        <li key={key} className="flex items-start">
                                            <span className="text-[var(--color-neon-blue)] mr-2">›</span>
                                            <strong className="capitalize min-w-[100px] text-white shrink-0">{key.replace(/_/g, ' ')}:</strong> 
                                            <span className="break-words">{String(val)}</span>
                                        </li>
                                    ))}
                                </ul>
                            )
                        ) : (
                            <p className="text-sm text-[#555] italic font-mono">Standard configuration parameters apply. No extended meta-data mapped for this component node.</p>
                        )}
                    </div>

                    {/* Available Shops if All */}
                    {product.available_shops && product.available_shops.length > 0 && (
                        <div className="mt-auto shrink-0 pt-4">
                            <h4 className="text-[10px] text-[#666] uppercase tracking-widest mb-2 font-mono">Verified Vendors</h4>
                            <div className="flex flex-wrap gap-2">
                                {product.available_shops.map(shop => (
                                    <span key={shop} className="text-xs border border-[#333] bg-[#111] text-[#aaa] px-3 py-1 rounded-sm uppercase tracking-wider">
                                        {shop}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProductModal;
