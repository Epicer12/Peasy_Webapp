import React from 'react';

const ControlPanel = ({ filters, setFilters, searchQuery, setSearchQuery, onSearch }) => {
    const categories = [
        { id: 'all', label: 'ALL_MODULES' },
        { id: 'cpu', label: 'PROC_UNITS' },
        { id: 'gpu', label: 'GRAPHICS_CORE' },
        { id: 'mobo', label: 'SYSTEM_BOARDS' },
        { id: 'ram', label: 'VOLATILE_MEM' },
        { id: 'ssd', label: 'STORAGE_DRIVE' }
    ];

    return (
        <div className="w-full md:w-72 flex-shrink-0 bg-[#0a0a0a] border border-[#222] p-4 font-mono h-[calc(100vh-8rem)] sticky top-24 overflow-y-auto">
            
            <div className="mb-8">
                <h2 className="text-[var(--color-neon-blue)] text-xs font-bold uppercase tracking-[0.2em] mb-4 border-b border-[#222] pb-2">
                    [ TERMINAL_QUERY ]
                </h2>
                <form onSubmit={(e) => { e.preventDefault(); onSearch(); }} className="relative">
                    <span className="absolute left-3 top-2.5 text-[#555]">{'>'}</span>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="SEARCH_DB"
                        className="w-full bg-[#111] border border-[#333] text-white p-2 pl-8 focus:outline-none focus:border-[var(--color-neon-blue)] text-sm"
                    />
                </form>
            </div>

            <div className="mb-8">
                <h2 className="text-[#888] text-xs font-bold uppercase tracking-[0.2em] mb-4 border-b border-[#222] pb-2">
                    [ HARDWARE_CLASS ]
                </h2>
                <div className="space-y-1">
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => {
                                setFilters(prev => ({...prev, category: cat.id}));
                                setTimeout(onSearch, 50);
                            }}
                            className={`w-full text-left px-3 py-2 text-xs font-bold tracking-widest uppercase transition-colors flex items-center justify-between ${
                                filters.category === cat.id 
                                ? 'bg-[#1a1a1a] text-[var(--color-neon-blue)] border-l-2 border-[var(--color-neon-blue)]' 
                                : 'text-[#666] hover:bg-[#111] hover:text-[#aaa] border-l-2 border-transparent'
                            }`}
                        >
                            <span>{cat.label}</span>
                            {filters.category === cat.id && <span className="text-[10px]">ACTIVE</span>}
                        </button>
                    ))}
                </div>
            </div>

            <div className="mb-8">
                <h2 className="text-[#888] text-xs font-bold uppercase tracking-[0.2em] mb-4 border-b border-[#222] pb-2">
                    [ VALUE_PARAMS ]
                </h2>
                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] text-[#555] block mb-1">MIN_LKR</label>
                        <input 
                            type="number"
                            value={filters.minPrice}
                            onChange={(e) => setFilters(prev => ({...prev, minPrice: e.target.value}))}
                            onBlur={onSearch}
                            className="w-full bg-[#111] border border-[#333] text-white p-2 text-right focus:outline-none focus:border-[#555] text-sm"
                            placeholder="0"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] text-[#555] block mb-1">MAX_LKR</label>
                        <input 
                            type="number"
                            value={filters.maxPrice}
                            onChange={(e) => setFilters(prev => ({...prev, maxPrice: e.target.value}))}
                            onBlur={onSearch}
                            className="w-full bg-[#111] border border-[#333] text-white p-2 text-right focus:outline-none focus:border-[#555] text-sm"
                            placeholder="MAX"
                        />
                    </div>
                </div>
            </div>

            <button 
                onClick={onSearch}
                className="w-full bg-[#111] hover:bg-[#222] text-[#888] hover:text-white border border-[#333] py-3 text-xs font-bold tracking-[0.2em] uppercase transition-colors"
            >
                EXECUTE_SCAN
            </button>

            {/* Decorative elements */}
            <div className="mt-8 pt-4 border-t border-[#222] flex justify-between text-[#333] text-[9px]">
                <span>SYS.V.4.2</span>
                <span className="animate-pulse text-[var(--color-neon-orange)]">● REC</span>
            </div>
        </div>
    );
};

export default ControlPanel;
