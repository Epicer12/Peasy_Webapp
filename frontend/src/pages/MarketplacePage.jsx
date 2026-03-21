import React, { useState, useEffect } from 'react';
import ProductCard from '../components/marketplace/ProductCard';
import ProductModal from '../components/marketplace/ProductModal';
import DualPriceSlider from '../components/marketplace/DualPriceSlider';

const MarketplacePage = () => {
    const [activeTab, setActiveTab] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [minPrice, setMinPrice] = useState('0');
    const [maxPrice, setMaxPrice] = useState('1000000');
    
    // New states for dynamic data
    const [productsData, setProductsData] = useState({});
    const [offersData, setOffersData] = useState([]);
    const [shopsData, setShopsData] = useState([]);
    const [activeShop, setActiveShop] = useState('all');
    const [loading, setLoading] = useState(true);
    const [selectedProduct, setSelectedProduct] = useState(null);

    const categories = [
        { id: 'all', label: 'All Components' },
        { id: 'gpu', label: 'Graphics Cards' },
        { id: 'cpu', label: 'Processors' },
        { id: 'mobo', label: 'Motherboards' },
        { id: 'ram', label: 'Memory' },
        { id: 'ssd', label: 'Storage' },
        { id: 'hdd', label: 'Hard Drives' },
        { id: 'psu', label: 'Power Supplies' },
        { id: 'case', label: 'PC Cases' },
        { id: 'cooler', label: 'Coolers' }
    ];

    // Initial mount fetches
    useEffect(() => {
        // Fetch known shops
        fetch('/api/marketplace/shops')
            .then(res => res.json())
            .then(data => setShopsData(data))
            .catch(err => console.error("Error fetching shops:", err));

        // Fetch curated offers
        fetch('/api/marketplace/offers')
            .then(res => res.json())
            .then(data => setOffersData(data))
            .catch(err => console.error("Error fetching offers:", err));
    }, []);

    const fetchMarketplaceData = async () => {
        setLoading(true);
        try {
            let url = `/api/marketplace/search?category=${activeTab}&shop=${activeShop}`;
            if (searchQuery) url += `&q=${encodeURIComponent(searchQuery)}`;
            if (minPrice) url += `&min_price=${minPrice}`;
            if (maxPrice) url += `&max_price=${maxPrice}`;
            
            const res = await fetch(url);
            const data = await res.json();
            setProductsData(data);
        } catch (err) {
            console.error("Error fetching marketplace:", err);
            setProductsData({});
        } finally {
            setLoading(false);
        }
    };

    // Debounce fetching on filter changes
    useEffect(() => {
        const delayBounceFn = setTimeout(() => {
            fetchMarketplaceData();
        }, 300);
        return () => clearTimeout(delayBounceFn);
    }, [activeTab, activeShop, searchQuery, minPrice, maxPrice]);

    const handleSearch = (e) => {
        setSearchQuery(e.target.value);
    };

    return (
        <div className="min-h-screen bg-[#030303] text-white pt-28 pb-20 selection:bg-[var(--color-neon-blue)] selection:text-black">
            
            <ProductModal 
                product={selectedProduct} 
                isOpen={!!selectedProduct} 
                onClose={() => setSelectedProduct(null)} 
            />

            <div className="max-w-[1400px] px-6 md:px-12 relative z-10">

                {/* Clean Header & Search/Filters */}
                <div className="flex flex-col mb-12 gap-6">
                    <div>
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter mb-2 uppercase flex items-center">
                            <span className="w-3 h-3 bg-[var(--color-neon-blue)] animate-pulse mr-4 rounded-sm shadow-[0_0_10px_var(--color-neon-blue)]"></span>
                            GLOBAL MARKET
                        </h1>
                        <p className="text-[var(--color-neon-blue)] font-mono text-sm max-w-md uppercase tracking-[0.2em]">
                            Curated hardware registry // Premium components
                        </p>
                    </div>

                    {/* Unified Filter & Search Bar - Single Row */}
                    <div className="w-full flex flex-col lg:flex-row items-center justify-start gap-4 mt-2 flex-wrap">
                        
                        {/* Category Selector Dropdown */}
                        <div className="flex items-center w-full lg:w-80 bg-[#0a0a0a] border border-[#333] rounded-sm focus-within:border-[var(--color-neon-blue)] focus-within:shadow-[0_0_15px_rgba(0,243,255,0.15)] transition-all overflow-hidden group min-h-[46px]">
                            <div className="pl-4 pr-2 flex items-center justify-center">
                                <span className="text-[#666] font-mono text-[10px] uppercase tracking-widest group-focus-within:text-[var(--color-neon-blue)] transition-colors">
                                    Category
                                </span>
                            </div>
                            <div className="w-px h-6 bg-[#222] mx-1"></div>
                            <select 
                                value={activeTab} 
                                onChange={(e) => setActiveTab(e.target.value)}
                                className="flex-1 bg-transparent py-3 px-2 focus:outline-none text-white font-mono text-sm appearance-none cursor-pointer uppercase"
                            >
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id} className="bg-[#111] uppercase">{cat.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Shop Selector Dropdown */}
                        <div className="flex items-center w-full lg:w-80 bg-[#0a0a0a] border border-[#333] rounded-sm focus-within:border-[var(--color-neon-blue)] focus-within:shadow-[0_0_15px_rgba(0,243,255,0.15)] transition-all overflow-hidden group min-h-[46px]">
                            <div className="pl-4 pr-2 flex items-center justify-center">
                                <span className="text-[#666] font-mono text-[10px] uppercase tracking-widest group-focus-within:text-[var(--color-neon-blue)] transition-colors">
                                    Store Vendor
                                </span>
                            </div>
                            <div className="w-px h-6 bg-[#222] mx-1"></div>
                            <select 
                                value={activeShop} 
                                onChange={(e) => setActiveShop(e.target.value)}
                                className="flex-1 bg-transparent py-3 px-2 focus:outline-none text-white font-mono text-sm appearance-none cursor-pointer"
                            >
                                <option value="all" className="bg-[#111]">ALL SHOPS</option>
                                {shopsData && shopsData.map(shop => (
                                    <option key={shop.id} value={shop.id} className="bg-[#111] uppercase">{shop.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Search Input - Boxed and Standardized Size */}
                        <div className="flex items-center w-full lg:w-80 bg-[#0a0a0a] border border-[#333] rounded-sm focus-within:border-[var(--color-neon-blue)] focus-within:shadow-[0_0_15px_rgba(0,243,255,0.15)] transition-all overflow-hidden group min-h-[46px]">
                            <div className="pl-4 pr-1 flex items-center justify-center">
                                <span className="text-[#666] font-mono text-[10px] uppercase tracking-widest group-focus-within:text-[var(--color-neon-blue)] transition-colors">
                                    Search
                                </span>
                            </div>
                            <div className="w-px h-6 bg-[#222] mx-1"></div>
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={handleSearch}
                                    placeholder="DB..."
                                    className="w-full bg-transparent py-3 px-2 focus:outline-none placeholder:text-[#444] font-mono text-xs uppercase text-white"
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#444] group-focus-within:text-[var(--color-neon-blue)] transition-colors pointer-events-none">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
                                        <circle cx="11" cy="11" r="8"></circle>
                                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Price Slider Section - Standardized Size */}
                        <div className="w-full lg:w-80 flex items-center bg-[#0a0a0a] border border-[#333] rounded-sm focus-within:border-[var(--color-neon-blue)] focus-within:shadow-[0_0_15px_rgba(0,243,255,0.15)] transition-all overflow-hidden group min-h-[46px]">
                            <DualPriceSlider 
                                min={0} 
                                max={1000000} 
                                step={1000}
                                defaultMinValue={minPrice ? parseFloat(minPrice) : 0}
                                defaultMaxValue={maxPrice ? parseFloat(maxPrice) : 1000000}
                                onChange={({ min, max }) => {
                                    setMinPrice(min.toString());
                                    setMaxPrice(max.toString());
                                }}
                            />
                        </div>
                    </div>
                </div>

                <div className="w-full h-px bg-[#222] mb-12"></div>

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
                            {activeTab === 'all' && !searchQuery && offersData && offersData.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-[#fff] mb-8 flex items-center">
                                        <span className="text-[var(--color-neon-orange)] mr-3">▶</span>
                                        Featured_Acquisitions
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
                                        {offersData.map((offer) => (
                                            <ProductCard key={`offer-${offer.id || offer.name}`} product={offer} onClick={() => setSelectedProduct(offer)} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Main Catalog Grid */}
                            {(!productsData || Object.keys(productsData).length === 0 || Object.values(productsData).every(arr => arr.length === 0)) && (
                                <div className="text-center py-20 text-[#666] font-mono uppercase tracking-widest text-sm">
                                    No components found matching your criteria.
                                </div>
                            )}
                            
                            {productsData && Object.entries(productsData).map(([category, items]) => {
                                if (!items || items.length === 0) return null;

                                const categoryTitles = {
                                    'gpu': 'Graphics Cards',
                                    'cpu': 'Processors',
                                    'motherboard': 'Motherboards',
                                    'mobo': 'Motherboards',
                                    'ram': 'Memory',
                                    'ssd': 'Solid State Drives',
                                    'hdd': 'Hard Disk Drives',
                                    'psu': 'Power Supplies',
                                    'case': 'PC Cases',
                                    'cooler': 'Cooling Systems'
                                };

                                return (
                                    <div key={category}>
                                        <div className="flex items-center justify-between mb-8 border-b border-[#111] pb-4">
                                            <h3 className="text-xl md:text-2xl font-black tracking-widest uppercase">
                                                {categoryTitles[category] || category}
                                            </h3>
                                            <span className="text-[var(--color-neon-blue)] font-mono text-xs border border-[var(--color-neon-blue)] px-2 py-1 rounded-sm bg-[#00f3ff]/10">
                                                {items.length} ITEMS
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-16">
                                            {items.map((product) => (
                                                <ProductCard key={`prod-${product.id || product.name}`} product={product} onClick={() => setSelectedProduct(product)} />
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
