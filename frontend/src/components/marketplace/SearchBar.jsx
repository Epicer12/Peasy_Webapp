import React from 'react';

const SearchBar = ({ searchQuery, setSearchQuery, onSearch }) => {
    return (
        <div className="w-full max-w-3xl mx-auto mb-8">
            <div className="relative group">
                {/* Glow effect */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-[var(--color-neon-blue)] to-[var(--color-neon-orange)] opacity-30 group-hover:opacity-60 blur transition duration-500"></div>
                
                <form 
                    onSubmit={(e) => { e.preventDefault(); onSearch(); }} 
                    className="relative flex items-center bg-[var(--color-deep-black)] border border-[#333] group-hover:border-[var(--color-neon-blue)] transition-colors"
                >
                    <div className="p-4 text-[#888] group-hover:text-[var(--color-neon-blue)] transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="square" strokeLinejoin="miter" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                        </svg>
                    </div>
                    
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="SEARCH_CATALOG // E.G. RTX 4090, RYZEN 7..."
                        className="w-full bg-transparent border-none text-[var(--color-off-white)] p-4 pl-0 focus:outline-none focus:ring-0 font-mono text-sm tracking-wider uppercase placeholder-[#444]"
                    />
                    
                    <button 
                        type="submit"
                        className="h-full px-6 py-4 bg-[#111] hover:bg-[var(--color-neon-blue)] hover:text-black text-[var(--color-neon-blue)] font-bold uppercase tracking-widest border-l border-[#333] transition-all"
                    >
                        Scan
                    </button>
                </form>
            </div>
        </div>
    );
};

export default SearchBar;
