import React from 'react';

const SidebarFilter = ({ filters, setFilters, onApply }) => {
    const categories = [
        { id: 'all', label: 'All Categories' },
        { id: 'cpu', label: 'Processors' },
        { id: 'gpu', label: 'Graphics Cards' },
        { id: 'mobo', label: 'Motherboards' },
        { id: 'ram', label: 'Memory' },
        { id: 'ssd', label: 'Storage' },
        { id: 'psu', label: 'Power Supplies' },
        { id: 'case', label: 'Cases' }
    ];

    const handleCategoryChange = (catId) => {
        setFilters(prev => ({ ...prev, category: catId }));
        // Apply immediately for category changes
        setTimeout(onApply, 50);
    };

    return (
        <div className="w-full md:w-64 flex-shrink-0 space-y-8">
            {/* Category Filter */}
            <div className="space-y-4">
                <h3 className="text-[var(--color-neon-blue)] border-b border-[var(--color-neon-blue)] pb-2 uppercase tracking-widest text-sm font-bold flex justify-between items-center">
                    <span>// CATEGORY</span>
                    <span className="text-xs text-[#555] opacity-50">SYS.FLTR</span>
                </h3>
                <div className="space-y-2">
                    {categories.map((cat) => (
                        <label 
                            key={cat.id} 
                            className={`flex items-center space-x-3 cursor-pointer group p-2 hover:bg-[#111] transition-colors border-l-2 ${filters.category === cat.id ? 'border-[var(--color-neon-blue)] bg-[#0a0a0a]' : 'border-transparent'}`}
                        >
                            <div className={`w-3 h-3 border ${filters.category === cat.id ? 'border-[var(--color-neon-blue)] bg-[var(--color-neon-blue)]' : 'border-[#444] group-hover:border-[#888]'} transition-colors`}></div>
                            <input 
                                type="radio" 
                                name="category" 
                                className="hidden"
                                checked={filters.category === cat.id}
                                onChange={() => handleCategoryChange(cat.id)}
                            />
                            <span className={`text-sm tracking-wide uppercase ${filters.category === cat.id ? 'text-[var(--color-off-white)] font-bold' : 'text-[#888] group-hover:text-[#aaa]'}`}>
                                {cat.label}
                            </span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Price Filter */}
            <div className="space-y-4">
                <h3 className="text-[var(--color-neon-orange)] border-b border-[var(--color-neon-orange)] pb-2 uppercase tracking-widest text-sm font-bold flex justify-between items-center">
                    <span>// PRICE_RANGE</span>
                    <span className="text-xs text-[#555] opacity-50">LKR</span>
                </h3>
                <div className="flex items-center space-x-2">
                    <div className="relative flex-1">
                        <span className="absolute left-2 top-2 text-xs text-[#555]">MIN</span>
                        <input 
                            type="number"
                            value={filters.minPrice}
                            onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value }))}
                            className="w-full bg-[#0a0a0a] border border-[#222] text-[#eee] p-2 pl-9 text-right font-mono text-sm focus:border-[var(--color-neon-orange)] focus:outline-none"
                            placeholder="0"
                        />
                    </div>
                    <span className="text-[#444]">-</span>
                    <div className="relative flex-1">
                        <span className="absolute left-2 top-2 text-xs text-[#555]">MAX</span>
                        <input 
                            type="number"
                            value={filters.maxPrice}
                            onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
                            className="w-full bg-[#0a0a0a] border border-[#222] text-[#eee] p-2 pl-9 text-right font-mono text-sm focus:border-[var(--color-neon-orange)] focus:outline-none"
                            placeholder="MAX"
                        />
                    </div>
                </div>
                <button 
                    onClick={onApply}
                    className="w-full py-2 bg-transparent border border-[var(--color-neon-orange)] text-[var(--color-neon-orange)] hover:bg-[var(--color-neon-orange)] hover:text-black transition-colors uppercase tracking-widest font-bold text-xs"
                >
                    Apply Filter
                </button>
            </div>
        </div>
    );
};

export default SidebarFilter;
