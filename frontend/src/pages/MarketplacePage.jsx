import React, { useState, useEffect } from 'react';
import ProductCard from '../components/marketplace/ProductCard';

// MOCK DATA
const mockOffers = [
    { id: 101, type: 'gpu', name: 'NVIDIA GeForce RTX 4090 FE', price: 850000, offer_price: 790000, discount_percentage: 7, brand: 'NVIDIA', image_url: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&q=80&w=400' },
    { id: 102, type: 'cpu', name: 'AMD Ryzen 9 7950X3D', price: 250000, offer_price: 210000, discount_percentage: 16, brand: 'AMD', image_url: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&q=80&w=400' }
];

const mockProducts = {
    gpu: [
        { id: 3, type: 'gpu', name: 'ASUS ROG Strix RTX 4080', price: 450000, brand: 'ASUS', image_url: 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?auto=format&fit=crop&q=80&w=400' },
        { id: 4, type: 'gpu', name: 'Gigabyte AORUS RX 7900 XTX', price: 395000, brand: 'Gigabyte', image_url: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&q=80&w=400' },
        { id: 7, type: 'gpu', name: 'MSI Gaming X Trio RTX 4070 Ti', price: 310000, brand: 'MSI', image_url: 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?auto=format&fit=crop&q=80&w=400' },
        { id: 11, type: 'gpu', name: 'ZOTAC Trinity RTX 4070', price: 240000, brand: 'ZOTAC', image_url: 'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?auto=format&fit=crop&q=80&w=400' }
    ],
    cpu: [
        { id: 5, type: 'cpu', name: 'Intel Core i9-14900K', price: 215000, brand: 'Intel', image_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=400' },
        { id: 6, type: 'cpu', name: 'AMD Ryzen 7 7800X3D', price: 165000, brand: 'AMD', image_url: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&q=80&w=400' },
        { id: 8, type: 'cpu', name: 'Intel Core i7-13700K', price: 145000, brand: 'Intel', image_url: 'https://images.unsplash.com/photo-1531297172864-459c7acccdd2?auto=format&fit=crop&q=80&w=400' }
    ]
};

const MarketplacePage = () => {
    const [activeTab, setActiveTab] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [loading, setLoading] = useState(false);

    const categories = [
        { id: 'all', label: 'All Components' },
        { id: 'gpu', label: 'Graphics Cards' },
        { id: 'cpu', label: 'Processors' },
        { id: 'mobo', label: 'Motherboards' },
        { id: 'ram', label: 'Memory' },
        { id: 'ssd', label: 'Storage' }
    ];

    const fetchMarketplaceData = () => {
        setLoading(true);
        setTimeout(() => setLoading(false), 500);
    };

    // Debounce fetching on filter changes
    useEffect(() => {
        const delayBounceFn = setTimeout(() => {
            fetchMarketplaceData();
        }, 300);
        return () => clearTimeout(delayBounceFn);
    }, [activeTab, searchQuery, minPrice, maxPrice]);

    const handleSearch = (e) => {
        setSearchQuery(e.target.value);
    };

    const triggerUpdate = () => {
        // Now handled by useEffect dependency array when state changes
    };

    return (
        <div className="min-h-screen bg-[#030303] text-white pt-28 pb-20 selection:bg-[var(--color-neon-blue)] selection:text-black">

            <div className="max-w-[1400px] mx-auto px-6 md:px-12 relative z-10">

                {/* Clean Header & Search/Filters */}
                <div className="flex flex-col xl:flex-row xl:items-end justify-between mb-12 gap-8">
                    <div>
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter mb-2 uppercase flex items-center">
                            <span className="w-3 h-3 bg-[var(--color-neon-blue)] animate-pulse mr-4 rounded-sm shadow-[0_0_10px_var(--color-neon-blue)]"></span>
                            GLOBAL MARKET
                        </h1>
                        <p className="text-[var(--color-neon-blue)] font-mono text-sm max-w-md uppercase tracking-[0.2em]">
                            Curated hardware registry // Premium components
                        </p>
                    </div>

                    {/* Filter & Search Bar */}
                    <div className="w-full xl:w-auto flex flex-col sm:flex-row gap-3">

                        {/* Price Filters - Grouped Style */}
                        <div className="flex items-center w-full sm:w-auto bg-[#0a0a0a] border border-[#333] rounded-sm focus-within:border-[var(--color-neon-blue)] focus-within:shadow-[0_0_15px_rgba(0,243,255,0.15)] transition-all overflow-hidden group">
                            <div className="pl-4 pr-2 flex items-center justify-center">
                                <span className="text-[#666] font-mono text-[10px] uppercase tracking-widest group-focus-within:text-[var(--color-neon-blue)] transition-colors">
                                    Price LKR
                                </span>
                            </div>
                            <div className="w-px h-6 bg-[#222] mx-1"></div>
                            <input
                                type="number"
                                placeholder="MIN"
                                value={minPrice}
                                onChange={(e) => setMinPrice(e.target.value)}
                                className="w-full sm:w-[72px] bg-transparent py-3 px-2 focus:outline-none text-white font-mono text-sm placeholder:text-[#444] text-center"
                            />
                            <span className="text-[#444] font-mono text-xs">-</span>
                            <input
                                type="number"
                                placeholder="MAX"
                                value={maxPrice}
                                onChange={(e) => setMaxPrice(e.target.value)}
                                className="w-full sm:w-[72px] bg-transparent py-3 px-2 focus:outline-none text-white font-mono text-sm placeholder:text-[#444] text-center pr-4"
                            />
                        </div>

                        {/* Search Input */}
                        <div className="flex-1 sm:w-72 relative group">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={handleSearch}
                                placeholder="SEARCH DB..."
                                className="w-full bg-[#0a0a0a] border border-[#222] py-3 pl-4 pr-10 focus:outline-none focus:border-[var(--color-neon-blue)] transition-colors placeholder:text-[#444] font-mono text-xs uppercase text-white rounded-sm"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#444] group-focus-within:text-[var(--color-neon-blue)] transition-colors">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
                                    <circle cx="11" cy="11" r="8"></circle>
                                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Minimalist Tab Navigation */}
                <div className="flex overflow-x-auto hide-scrollbar border-b border-[#222] mb-12 pb-px relative">
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveTab(cat.id)}
                            className={`whitespace-nowrap px-6 py-4 text-xs font-bold font-mono uppercase tracking-[0.1em] transition-colors relative ${activeTab === cat.id
                                    ? 'text-[var(--color-neon-blue)] drop-shadow-[0_0_8px_rgba(0,243,255,0.3)]'
                                    : 'text-[#666] hover:text-[#aaa]'
                                }`}
                        >
                            {cat.label}
                            {activeTab === cat.id && (
                                <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[var(--color-neon-blue)] shadow-[0_0_10px_var(--color-neon-blue)] block"></div>
                            )}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="min-h-[50vh]">
                    {loading ? (
                        <div className="w-full h-[40vh] flex flex-col items-center justify-center">
                            <div className="w-12 h-12 border-2 border-[#111] border-t-[var(--color-neon-blue)] rounded-full animate-spin mb-4 shadow-[0_0_15px_var(--color-neon-blue)]"></div>
                            <span className="text-xs text-[var(--color-neon-blue)] uppercase tracking-widest font-mono animate-pulse">Syncing nodes...</span>
                        </div>
                    ) : (
                        <div className="space-y-20">

                            {/* Featured / Offers (Only on 'All') */}
                            {activeTab === 'all' && !searchQuery && mockOffers.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-[#fff] mb-8 flex items-center">
                                        <span className="text-[var(--color-neon-orange)] mr-3">▶</span>
                                        Featured_Acquisitions
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
                                        {mockOffers.map((offer) => (
                                            <ProductCard key={`offer-${offer.id || offer.name}`} product={offer} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Main Catalog Grid */}
                            {Object.entries(mockProducts).map(([category, items]) => {
                                if (activeTab !== 'all' && activeTab !== category) return null;
                                // Local front-end filtering mock implementation just for preview so user sees something dynamic
                                const filteredItems = items.filter(val => {
                                    if (searchQuery && !val.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
                                    if (minPrice && val.price < parseFloat(minPrice)) return false;
                                    if (maxPrice && val.price > parseFloat(maxPrice)) return false;
                                    return true;
                                });
                                if (filteredItems.length === 0) return null;

                                return (
                                    <div key={category}>
                                        <div className="flex items-center justify-between mb-8 border-b border-[#111] pb-4">
                                            <h3 className="text-xl md:text-2xl font-black tracking-widest uppercase">
                                                {category === 'gpu' ? 'Graphics Cards' :
                                                    category === 'cpu' ? 'Processors' :
                                                        category === 'mobo' ? 'Motherboards' : category}
                                            </h3>
                                            <span className="text-[var(--color-neon-blue)] font-mono text-xs border border-[var(--color-neon-blue)] px-2 py-1 rounded-sm bg-[#00f3ff]/10">
                                                {filteredItems.length} ITEMS
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-16">
                                            {filteredItems.map((product) => (
                                                <ProductCard key={`prod-${product.id || product.name}`} product={product} />
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default MarketplacePage;

