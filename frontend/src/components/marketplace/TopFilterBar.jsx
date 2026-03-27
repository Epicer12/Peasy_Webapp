import React from 'react';

const TopFilterBar = ({ filters, setFilters, searchQuery, setSearchQuery, onSearch }) => {
    const categories = [
        { id: 'all', label: 'All Tech' },
        { id: 'cpu', label: 'Processors' },
        { id: 'gpu', label: 'Graphics' },
        { id: 'mobo', label: 'Motherboards' },
        { id: 'ram', label: 'Memory' },
        { id: 'ssd', label: 'Storage' }
    ];

    const handleCategoryChange = (catId) => {
        setFilters(prev => ({ ...prev, category: catId }));
        setTimeout(onSearch, 50);
    };

    return (
        <div className="sticky top-20 z-40 bg-black/60 backdrop-blur-xl border-y border-white/10 p-4 mb-8 shadow-2xl">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4 items-center justify-between">
                
                {/* Search Input - Futuristic Command Line Style */}
                <div className="w-full md:w-96 relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#00f3ff]">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <form onSubmit={(e) => { e.preventDefault(); onSearch(); }} className="w-full">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-white placeholder-white/30 focus:outline-none focus:border-[var(--color-neon-blue)] focus:bg-white/10 transition-all font-mono text-sm"
                            placeholder="> SEARCH_DB..."
                        />
                    </form>
                </div>

                {/* Category Pills */}
                <div className="flex space-x-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 hide-scrollbar">
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => handleCategoryChange(cat.id)}
                            className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all duration-300 ${
                                filters.category === cat.id 
                                ? 'bg-[var(--color-neon-blue)] text-black shadow-[0_0_15px_rgba(0,243,255,0.4)]' 
                                : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/5'
                            }`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>

                {/* Price Quick Filters */}
                <div className="hidden lg:flex items-center space-x-2 text-xs font-mono">
                    <span className="text-white/50">LIMIT:</span>
                    <input 
                        type="number" 
                        placeholder="MAX LKR" 
                        value={filters.maxPrice}
                        onChange={(e) => setFilters(prev => ({...prev, maxPrice: e.target.value}))}
                        onBlur={onSearch}
                        className="bg-white/5 border border-white/10 rounded px-2 py-1 w-24 text-right text-[var(--color-neon-orange)] focus:outline-none focus:border-[var(--color-neon-orange)]"
                    />
                </div>
            </div>
        </div>
    );
};

export default TopFilterBar;
