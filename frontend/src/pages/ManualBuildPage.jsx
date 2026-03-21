import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import logo from '../assets/logo-white.png';
import { searchComponents } from '../services/componentService';
import { checkCompatibility } from '../utils/compatibility';
import { XMarkIcon } from '@heroicons/react/24/outline';

const CATEGORIES = [
    // Core Components
    { id: 'cpu', name: 'CPU', icon: 'cpu', backendKey: 'cpu', section: 'CORE COMPONENTS' },
    { id: 'gpu', name: 'GPU', icon: 'monitor', backendKey: 'gpu', section: 'CORE COMPONENTS' },
    { id: 'motherboard', name: 'Motherboard', icon: 'server', backendKey: 'mobo', section: 'CORE COMPONENTS' },
    { id: 'ram', name: 'Memory', icon: 'grid', backendKey: 'ram', section: 'CORE COMPONENTS' },
    {
        id: 'storage_group',
        name: 'Storage',
        icon: 'database',
        section: 'CORE COMPONENTS',
        subCategories: [
            { id: 'ssd', name: 'Storage (SSD)', icon: 'hard-drive', backendKey: 'ssd' },
            { id: 'hdd', name: 'Storage (HDD)', icon: 'database', backendKey: 'hdd' }
        ]
    },
    { id: 'psu', name: 'Power Supply', icon: 'zap', backendKey: 'psu', section: 'CORE COMPONENTS' },
    { id: 'case', name: 'Case', icon: 'box', backendKey: 'case', section: 'CORE COMPONENTS' },
    { id: 'cooler', name: 'CPU Cooler', icon: 'wind', backendKey: 'cooler', section: 'CORE COMPONENTS' },
    { id: 'software', name: 'Software', icon: 'disc', backendKey: 'software', section: 'CORE COMPONENTS' },

    // Peripherals & Accessories
    { id: 'monitors', name: 'Monitor', icon: 'tv', backendKey: 'monitors', section: 'PERIPHERALS & ACCESSORIES' },
    { id: 'keyboards', name: 'Keyboard', icon: 'keyboard', backendKey: 'keyboards', section: 'PERIPHERALS & ACCESSORIES' },
    { id: 'mice', name: 'Mouse', icon: 'mouse-pointer', backendKey: 'mice', section: 'PERIPHERALS & ACCESSORIES' },
    { id: 'headsets', name: 'Headsets', icon: 'headphones', backendKey: 'headsets', section: 'PERIPHERALS & ACCESSORIES' },
    { id: 'speakers', name: 'Speakers', icon: 'speaker', backendKey: 'speakers', section: 'PERIPHERALS & ACCESSORIES' },
    {
        id: 'cables',
        name: 'Cables',
        icon: 'link',
        section: 'PERIPHERALS & ACCESSORIES',
        subCategories: [
            { id: 'connectors', name: 'Connectors', icon: 'link', backendKey: 'connectors' },
            { id: 'converters', name: 'Converters', icon: 'shuffle', backendKey: 'converters' }
        ]
    },
    { id: 'consoles', name: 'Consoles', icon: 'gamepad', backendKey: 'consoles', section: 'PERIPHERALS & ACCESSORIES' },
];

// Flatten categories for easy lookup of backend keys
const ALL_CATEGORIES = CATEGORIES.reduce((acc, cat) => {
    if (cat.subCategories) {
        return [...acc, ...cat.subCategories];
    }
    return [...acc, cat];
}, []);

const ProductSkeleton = () => (
    <div className="flex items-center p-4 bg-neutral-900 border border-neutral-800 animate-pulse">
        <div className="w-24 h-24 bg-neutral-800 mr-6 shrink-0"></div>
        <div className="flex-1 space-y-3">
            <div className="h-6 bg-neutral-800 w-3/4 rounded-sm"></div>
            <div className="flex gap-2">
                <div className="h-5 bg-neutral-800 w-20 rounded-sm"></div>
                <div className="h-5 bg-neutral-800 w-24 rounded-sm"></div>
                <div className="h-5 bg-neutral-800 w-16 rounded-sm"></div>
            </div>
        </div>
        <div className="w-32 h-8 bg-neutral-800 ml-4 rounded-sm"></div>
    </div>
);

const ManualBuildPage = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const [activeCategory, setActiveCategory] = useState('cpu');
    const [expandedCategories, setExpandedCategories] = useState({ processors: true });
    // Restore build state if returning from summary, otherwise empty
    const [buildState, setBuildState] = useState(location.state?.preservedBuildState || {});
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [totalPrice, setTotalPrice] = useState(0);
    const [searchQuery, setSearchQuery] = useState("");

    // Refs for scrolling
    const categoryRefs = React.useRef({});

    // Advanced Logic State
    const [gpuBrand, setGpuBrand] = useState('NVIDIA');
    const [compatibility, setCompatibility] = useState({ issues: [], warnings: [] });

    const [showRamModal, setShowRamModal] = useState(false);
    const [pendingRamProduct, setPendingRamProduct] = useState(null);
    const [toast, setToast] = useState(null);

    const showToastMessage = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    // Auto-scroll sidebar active category into view
    useEffect(() => {
        if (categoryRefs.current[activeCategory]) {
            categoryRefs.current[activeCategory].scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            });
        }
    }, [activeCategory]);

    // Auto-expand parent if sub-category is active
    useEffect(() => {
        CATEGORIES.forEach(cat => {
            if (cat.subCategories) {
                if (cat.subCategories.some(sub => sub.id === activeCategory)) {
                    setExpandedCategories(prev => ({ ...prev, [cat.id]: true }));
                }
            }
        });
    }, [activeCategory]);

    // Fetch products when category or search changes
    useEffect(() => {
        const fetchProducts = async () => {
            // Don't fetch for parent categories that are just folders
            const isParent = CATEGORIES.find(c => c.id === activeCategory && c.subCategories);
            if (isParent) return;

            setLoading(true);
            try {
                // Map frontend active category ID to backend key using flattened list
                const catObj = ALL_CATEGORIES.find(c => c.id === activeCategory);
                const backendKey = catObj ? catObj.backendKey : activeCategory;

                const data = await searchComponents(searchQuery, backendKey);
                setProducts(data || []);
            } catch (error) {
                console.error("Error fetching products:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, [activeCategory, searchQuery]);

    const toggleCategory = (catId) => {
        setExpandedCategories(prev => ({
            ...prev,
            [catId]: !prev[catId]
        }));
    };

    // Update total price and Check Compatibility
    useEffect(() => {
        // Price
        const total = Object.values(buildState).reduce((acc, item) => {
            const price = item?.price ? parseFloat(item.price) : 0;
            const quantity = item?.quantity || 1;
            return acc + ((isNaN(price) ? 0 : price) * quantity);
        }, 0);
        setTotalPrice(total);

        // Compatibility
        const check = checkCompatibility(buildState);
        setCompatibility(check);

    }, [buildState]);

    const handleSelectProduct = (product, quantity = 1, isRamOverride = false) => {
        // STRICT COMPATIBILITY BLOCK
        if (!isCompatible(product)) {
            showToastMessage('⚠ INCOMPATIBLE PART: Cannot install this component with your current build.');
            return;
        }

        // RAM Modal Trigger
        if (activeCategory === 'ram' && !isRamOverride && product.id !== buildState[activeCategory]?.id) {
            setPendingRamProduct(product);
            setShowRamModal(true);
            return;
        }

        // GPU Brand Enforcement
        if (activeCategory === 'gpu') {
            const prodName = (product.name || '').toUpperCase();
            const prodMfg = (product.manufacturer || product.gpu_chip || '').toUpperCase();
            const isNvidia = prodName.includes('NVIDIA') || prodName.includes('GEFORCE') || prodName.includes('RTX') || prodName.includes('GTX') || prodMfg.includes('NVIDIA');
            const isAmd = prodName.includes('AMD') || prodName.includes('RADEON') || prodName.includes('RX') || prodMfg.includes('AMD');

            if (gpuBrand === 'NVIDIA' && isAmd && !isNvidia) {
                showToastMessage('⚠ INCOMPATIBLE: AMD GPU selected in NVIDIA mode');
                return;
            }
            if (gpuBrand === 'AMD' && isNvidia && !isAmd) {
                showToastMessage('⚠ INCOMPATIBLE: NVIDIA GPU selected in AMD mode');
                return;
            }
        }



        // Toggle logic
        if (buildState[activeCategory]?.id === product.id) {
            const newState = { ...buildState };
            delete newState[activeCategory];
            setBuildState(newState);
            showToastMessage(`${product.name.substring(0, 20)}... REMOVED`);
        } else {
            setBuildState(prev => ({
                ...prev,
                [activeCategory]: { ...product, quantity }
            }));
            showToastMessage(`${product.name.substring(0, 20)}... INSTALLED`);

            // Auto-Advance logic (Only for Core Components)
            const currentIndex = ALL_CATEGORIES.findIndex(c => c.id === activeCategory);
            const currentCat = ALL_CATEGORIES[currentIndex];

            if (currentCat?.section === 'CORE COMPONENTS' && currentIndex !== -1 && currentIndex < ALL_CATEGORIES.length - 1) {
                setActiveCategory(ALL_CATEGORIES[currentIndex + 1].id);
            }
        }
    };

    const handleClearSelection = () => {
        if (buildState[activeCategory]) {
            const newState = { ...buildState };
            delete newState[activeCategory];
            setBuildState(newState);
            showToastMessage("SECTION CLEARED");
        }
    };

    const handleRemoveItem = (e, catId) => {
        e.stopPropagation(); // Prevent activating the category
        const newState = { ...buildState };
        delete newState[catId];
        setBuildState(newState);
        showToastMessage("ITEM REMOVED");
    };

    const getPrice = (item) => {
        if (!item.price) return "N/A";
        return typeof item.price === 'number'
            ? `LKR ${item.price.toLocaleString()}`
            : `LKR ${item.price}`;
    };

    const isCompatible = (item) => {
        // 1. CPU <-> Motherboard
        if (activeCategory === 'motherboard' && buildState.cpu) {
            const cpuSocket = buildState.cpu.specs?.socket;
            const moboSocket = item.specs?.socket;

            if (cpuSocket && moboSocket && cpuSocket !== moboSocket) {
                return false;
            }
        }

        // 2. RAM <-> Motherboard
        if (activeCategory === 'ram' && buildState.motherboard) {
            const moboRam = (buildState.motherboard.specs?.ram_type || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const ramType = (item.specs?.type || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            if (moboRam && ramType && !moboRam.includes(ramType) && !ramType.includes(moboRam)) return false;
        }

        // 3. Case <-> Motherboard
        if (activeCategory === 'case' && buildState.motherboard) {
            const moboFF = (buildState.motherboard.specs?.form_factor || '').toUpperCase();
            const caseFF = (item.specs?.form_factor || item.specs?.mobo_support || '').toUpperCase();

            // Ensure E-ATX boards only go into E-ATX cases.
            if (moboFF.includes('E-ATX') || moboFF.includes('EATX')) {
                if (!caseFF.includes('E-ATX') && !caseFF.includes('EATX')) return false;
            }
            // Ensure standard ATX boards don't go into Micro-ATX or ITX only cases
            else if (moboFF.includes('ATX') && !moboFF.includes('MICRO') && !moboFF.includes('MINI')) {
                // If the case ONLY supports Micro/ITX and NOT ATX
                if ((caseFF.includes('MICRO') || caseFF.includes('ITX')) && !caseFF.includes('ATX')) return false;
            }
        }
        return true;
    };

    const getGpuBrandScore = (item) => {
        const name = (item.name || '').toUpperCase();
        const mfg = (item.manufacturer || item.gpu_chip || '').toUpperCase();
        const isNvidia = name.includes('NVIDIA') || name.includes('GEFORCE') || name.includes('RTX') || name.includes('GTX') || mfg.includes('NVIDIA');
        const isAmd = name.includes('AMD') || name.includes('RADEON') || name.includes('RX') || mfg.includes('AMD');
        if (gpuBrand === 'NVIDIA') {
            if (isNvidia) return 0;   // chosen brand — top
            if (isAmd) return 2;      // other brand — bottom
            return 1;                 // unknown — middle
        } else {
            if (isAmd) return 0;      // chosen brand — top
            if (isNvidia) return 2;   // other brand — bottom
            return 1;                 // unknown — middle
        }
    };

    const getSortedList = () => {
        let list = [...products];
        list.sort((a, b) => {
            // On GPU category: sort by brand preference first
            if (activeCategory === 'gpu') {
                const aBrand = getGpuBrandScore(a);
                const bBrand = getGpuBrandScore(b);
                if (aBrand !== bBrand) return aBrand - bBrand;
            }
            // Then by compatibility
            const aComp = isCompatible(a);
            const bComp = isCompatible(b);
            if (aComp && !bComp) return -1;
            if (!aComp && bComp) return 1;
            return 0;
        });
        return list;
    };

    return (
        <div className="flex h-screen bg-[#050505] text-[#eeeeee] font-mono overflow-hidden selection:bg-[#ccff00] selection:text-black">

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Composite Header */}
                <div className="flex h-20 shrink-0 bg-[#050505] z-50">
                    {/* Logo Area */}
                    <div className="w-[300px] flex justify-start items-center pl-4 border-r-2 border-b-2 border-[#333333] shrink-0">
                        <img src={logo} alt="PEASY" className="h-full max-h-12 object-contain" />
                    </div>

                    {/* Main Header Area */}
                    <header className="flex-1 flex flex-col justify-between px-6 md:px-8 pb-3 pt-3 border-b-2 border-[#333333] bg-[#050505] min-w-0">
                        <div className="flex justify-between items-start mb-1">
                            <span className="text-[10px] font-mono text-[#666666] ml-auto">SYS.VER.2.0.5 // ONLINE</span>
                        </div>
                        <div className="flex items-end justify-between">
                            <h2 className="text-2xl md:text-4xl font-black tracking-[-0.05em] uppercase leading-none text-[#eeeeee]">
                                MANUAL OVERRIDE
                            </h2>
                        </div>
                    </header>
                </div>

                {/* RAM Quantity Modal */}
                {showRamModal && pendingRamProduct && (
                    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50">
                        <div className="bg-neutral-950 border border-[#00f3ff] p-8 rounded-none shadow-[0_0_50px_rgba(0,243,255,0.2)] text-center max-w-md w-full relative">
                            <h2 className="text-2xl font-black text-[#00f3ff] mb-2 tracking-tighter uppercase">Memory Configuration</h2>
                            <p className="text-gray-400 mb-6 font-mono text-xs">SELECT TOTAL MODULE COUNT FOR: <br /><span className="text-white font-bold">{pendingRamProduct.name}</span></p>

                            <div className="grid grid-cols-3 gap-4">
                                {[1, 2, 4].map(qty => (
                                    <button
                                        key={qty}
                                        onClick={() => {
                                            handleSelectProduct(pendingRamProduct, qty, true);
                                            setShowRamModal(false);
                                            setPendingRamProduct(null);
                                        }}
                                        className="border border-neutral-700 hover:border-[#00f3ff] hover:bg-[#00f3ff]/10 text-white py-4 font-mono font-bold transition-all text-xl"
                                    >
                                        {qty} x Module{qty > 1 ? 's' : ''}
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => { setShowRamModal(false); setPendingRamProduct(null); }}
                                className="mt-6 text-red-500 text-xs hover:text-red-400 font-mono underline"
                            >
                                CANCEL_CONFIGURATION
                            </button>
                        </div>
                    </div>
                )}

                <div className="flex flex-1 overflow-hidden">
                    {/* Left Sidebar - Categories */}
                    <div className="w-[300px] bg-[#050505] border-r-2 border-[#333333] flex flex-col h-full">
                        {/* Sidebar Header - Fixed */}
                        <div className="p-4 border-b border-[#333333] shrink-0">
                            <h2 className="text-xl font-bold text-white tracking-wide">COMPONENTS</h2>
                        </div>

                        {/* Categories List - Scrollable */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar pb-10">
                            {CATEGORIES.map((cat, index) => {
                                // Section Header Logic
                                const prevCat = index > 0 ? CATEGORIES[index - 1] : null;
                                const isNewSection = !prevCat || cat.section !== prevCat.section;
                                const showSectionHeader = isNewSection && cat.section !== 'OTHERS';
                                const showSpacer = isNewSection && cat.section === 'OTHERS';

                                return (
                                    <React.Fragment key={cat.id}>
                                        {/* Section Header */}
                                        {showSectionHeader && (
                                            <div className={`px-4 py-2 mt-4 mb-2 border-b border-neutral-800 ${index === 0 ? 'mt-0' : ''}`}>
                                                <h3 className="text-[10px] font-bold text-[#666666] uppercase tracking-[0.2em]">{cat.section}</h3>
                                            </div>
                                        )}
                                        {/* Spacer for Untitled Sections */}
                                        {showSpacer && (
                                            <div className="h-8 border-b border-neutral-800 mb-2"></div>
                                        )}

                                        {/* Category Item */}
                                        {cat.subCategories ? (
                                            <div className="border-b border-neutral-900">
                                                {/* Parent Header */}
                                                <div
                                                    onClick={() => toggleCategory(cat.id)}
                                                    className={`
                                                        group flex items-center justify-between p-4 cursor-pointer hover:bg-neutral-900 transition-all
                                                        ${expandedCategories[cat.id] ? 'bg-neutral-900' : ''}
                                                    `}
                                                >
                                                    <span className="font-bold text-sm uppercase tracking-wider text-gray-400 group-hover:text-white">
                                                        {cat.name}
                                                    </span>
                                                    <span className="text-xs text-[#00f3ff]">
                                                        {expandedCategories[cat.id] ? '[-]' : '[+]'}
                                                    </span>
                                                </div>

                                                {/* Sub Categories */}
                                                {expandedCategories[cat.id] && (
                                                    <div className="bg-neutral-950/50">
                                                        {cat.subCategories.map(sub => {
                                                            const isSelected = buildState[sub.id];
                                                            const isActive = activeCategory === sub.id;

                                                            return (
                                                                <div
                                                                    key={sub.id}
                                                                    ref={el => categoryRefs.current[sub.id] = el}
                                                                    onClick={() => setActiveCategory(sub.id)}
                                                                    className={`
                                                                        group/item pl-8 pr-4 py-3 cursor-pointer border-l-4 transition-all flex items-center justify-between
                                                                        ${isActive ? 'bg-neutral-900 border-l-[#00f3ff]' : 'hover:bg-neutral-900 border-l-transparent'}
                                                                    `}
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={`text-xs uppercase font-bold ${isActive ? 'text-[#00f3ff]' : 'text-gray-500 hover:text-white'}`}>
                                                                            {sub.name}
                                                                        </span>
                                                                        {isSelected && (
                                                                            <div className="w-2 h-2 rounded-full bg-[#00f3ff]"></div>
                                                                        )}
                                                                    </div>

                                                                    {isSelected && (
                                                                        <button
                                                                            onClick={(e) => handleRemoveItem(e, sub.id)}
                                                                            className="opacity-0 group-hover/item:opacity-100 p-1 hover:text-red-500 text-gray-500 transition-all"
                                                                            title="Clear Selection"
                                                                        >
                                                                            <XMarkIcon className="w-4 h-4" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div
                                                ref={el => categoryRefs.current[cat.id] = el}
                                                onClick={() => setActiveCategory(cat.id)}
                                                className={`
                                                group flex items-center justify-between p-4 cursor-pointer border-b border-neutral-900 transition-all
                                                ${activeCategory === cat.id ? 'bg-neutral-800 border-l-4 border-l-[#00f3ff]' : 'hover:bg-neutral-900 border-l-4 border-l-transparent'}
                                            `}
                                            >
                                                <div className="flex flex-col">
                                                    <span className={`font-bold text-sm uppercase tracking-wider ${activeCategory === cat.id ? 'text-[#00f3ff]' : 'text-gray-400 group-hover:text-white'}`}>
                                                        {cat.name}
                                                    </span>
                                                    {buildState[cat.id] && (
                                                        <span className="text-xs text-gray-500 mt-1 truncate max-w-[180px]">
                                                            {buildState[cat.id].quantity > 1 ? `${buildState[cat.id].quantity} x ` : ''}{buildState[cat.id].name}
                                                        </span>
                                                    )}
                                                </div>

                                                {buildState[cat.id] && (
                                                    <button
                                                        onClick={(e) => handleRemoveItem(e, cat.id)}
                                                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-neutral-800 rounded-full text-gray-500 hover:text-red-500 transition-all"
                                                        title="Clear Selection"
                                                    >
                                                        <XMarkIcon className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </div>

                        {/* Total Price Area */}
                        <div className="p-6 bg-neutral-950 border-t border-neutral-800 shrink-0 z-10">
                            <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Estimated Total</div>
                            <div className="text-2xl font-black text-[#00f3ff]">
                                LKR {totalPrice.toLocaleString()}
                            </div>
                            {compatibility.issues.length > 0 && (
                                <div className="mt-4 p-3 bg-red-900/20 border border-red-900/50 rounded">
                                    <div className="text-red-500 font-bold text-xs uppercase mb-1">Compatibility Issues</div>
                                    <ul className="text-[10px] text-red-400 list-disc pl-3">
                                        {compatibility.issues.map((issue, i) => <li key={i}>{issue}</li>)}
                                    </ul>
                                </div>
                            )}
                            {compatibility.warnings.length > 0 && (
                                <div className="mt-2 p-3 bg-yellow-900/20 border border-yellow-900/50 rounded">
                                    <div className="text-yellow-500 font-bold text-xs uppercase mb-1">Advisories</div>
                                    <ul className="text-[10px] text-yellow-400 list-disc pl-3">
                                        {compatibility.warnings.map((warn, i) => <li key={i}>{warn}</li>)}
                                    </ul>
                                </div>
                            )}
                            <button
                                onClick={() => {
                                    if (compatibility.issues.length > 0) {
                                        alert("SYSTEM ALERT: Critical compatibility issues detected. Resolution required before proceeding.");
                                        return;
                                    }
                                    if (Object.keys(buildState).length === 0) {
                                        showToastMessage("NO COMPONENTS SELECTED");
                                        return;
                                    }
                                    navigate('/purchase-summary', {
                                        state: { buildState, totalPrice, compatibility }
                                    });
                                }}
                                className={`mt-4 w-full py-3 font-bold uppercase tracking-widest transition-colors rounded-sm text-sm
                                    ${compatibility.issues.length > 0
                                        ? 'bg-red-900/50 text-red-500 cursor-not-allowed border border-red-900'
                                        : 'bg-[#00f3ff] text-black hover:bg-[#00d2dd]'
                                    }
                                `}
                            >
                                {compatibility.issues.length > 0 ? 'Fix Issues to Proceed' : 'Complete Build'}
                            </button>

                            {/* Clear entire build */}
                            {Object.keys(buildState).length > 0 && (
                                <button
                                    onClick={() => {
                                        if (window.confirm('Clear the entire build? This will remove all selected components.')) {
                                            setBuildState({});
                                            setTotalPrice(0);
                                            showToastMessage('BUILD CLEARED');
                                        }
                                    }}
                                    className="mt-2 w-full py-2 font-bold uppercase tracking-widest transition-colors rounded-sm text-xs border border-red-900/50 text-red-500 hover:bg-red-900/20"
                                >
                                    ✕ Clear Entire Build
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Right Content - Product List */}
                    <div className="flex-1 bg-neutral-900 flex flex-col h-full min-w-0">
                        <div className="p-5 border-b border-neutral-800 bg-neutral-900 z-10 sticky top-0 backdrop-blur-sm">
                            {/* Step breadcrumb + nav arrows */}
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 min-w-0">
                                    {(() => {
                                        const parentCat = CATEGORIES.find(c => c.subCategories?.some(s => s.id === activeCategory));
                                        return (
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    {parentCat && (
                                                        <span className="text-[10px] font-bold text-gray-600 tracking-widest">
                                                            {parentCat.name} /
                                                        </span>
                                                    )}
                                                    <h1 className="text-2xl font-black uppercase text-white tracking-tighter">
                                                        {ALL_CATEGORIES.find(c => c.id === activeCategory)?.name}
                                                    </h1>
                                                    {buildState[activeCategory] && (
                                                        <span className="flex items-center gap-1 text-[10px] font-bold text-[#00f3ff] bg-[#00f3ff]/10 border border-[#00f3ff]/20 px-2 py-0.5 rounded-sm">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-[#00f3ff] inline-block"></span> SELECTED
                                                        </span>
                                                    )}
                                                    {/* GPU toggle inline with title */}
                                                    {activeCategory === 'gpu' && (
                                                        <div className="flex bg-neutral-800 rounded p-1 border border-neutral-700">
                                                            <button
                                                                onClick={() => setGpuBrand('NVIDIA')}
                                                                className={`px-4 py-1 text-xs font-bold uppercase rounded transition-all ${gpuBrand === 'NVIDIA' ? 'bg-[#76b900] text-black' : 'text-gray-500 hover:text-white'}`}
                                                            >NVIDIA</button>
                                                            <button
                                                                onClick={() => setGpuBrand('AMD')}
                                                                className={`px-4 py-1 text-xs font-bold uppercase rounded transition-all ${gpuBrand === 'AMD' ? 'bg-red-600 text-white' : 'text-gray-500 hover:text-white'}`}
                                                            >AMD</button>
                                                        </div>
                                                    )}

                                                </div>
                                                <p className="text-gray-600 text-xs mt-0.5 font-mono">
                                                    {products.length} results · {buildState[activeCategory] ? buildState[activeCategory].name.substring(0, 40) : 'no selection'}
                                                </p>
                                            </div>
                                        );
                                    })()}
                                </div>

                                {/* Controls: Clear + Prev/Next + Search */}
                                <div className="flex items-center gap-2 shrink-0">
                                    {buildState[activeCategory] && (
                                        <button
                                            onClick={handleClearSelection}
                                            className="px-3 py-1.5 bg-red-900/20 text-red-500 text-xs font-bold uppercase hover:bg-red-900/40 transition-colors border border-red-900/40 rounded-sm"
                                        >
                                            Clear
                                        </button>
                                    )}
                                    {(() => {
                                        const idx = ALL_CATEGORIES.findIndex(c => c.id === activeCategory);
                                        const prev = idx > 0 ? ALL_CATEGORIES[idx - 1] : null;
                                        const next = idx < ALL_CATEGORIES.length - 1 ? ALL_CATEGORIES[idx + 1] : null;
                                        return (
                                            <>
                                                <button
                                                    disabled={!prev}
                                                    onClick={() => prev && setActiveCategory(prev.id)}
                                                    title={prev ? `Previous: ${prev.name}` : 'First component'}
                                                    className={`px-3 py-1.5 text-xs font-bold uppercase border rounded-sm transition-all ${prev
                                                        ? 'border-neutral-700 text-gray-400 hover:border-[#00f3ff] hover:text-[#00f3ff]'
                                                        : 'border-neutral-800 text-neutral-700 cursor-not-allowed'
                                                        }`}
                                                >
                                                    ← Prev
                                                </button>
                                                <button
                                                    disabled={!next}
                                                    onClick={() => next && setActiveCategory(next.id)}
                                                    title={next ? `Next: ${next.name}` : 'Last component'}
                                                    className={`px-3 py-1.5 text-xs font-bold uppercase border rounded-sm transition-all ${next
                                                        ? 'border-neutral-700 text-gray-400 hover:border-[#00f3ff] hover:text-[#00f3ff]'
                                                        : 'border-neutral-800 text-neutral-700 cursor-not-allowed'
                                                        }`}
                                                >
                                                    Next →
                                                </button>
                                            </>
                                        );
                                    })()}
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="SEARCH_DB..."
                                            className="bg-neutral-800 border border-neutral-700 text-white px-4 py-2 pl-10 text-sm font-mono w-64 focus:border-[#00f3ff] outline-none rounded-none transition-all placeholder-gray-600"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                        <span className="absolute left-3 top-2.5 text-gray-500 text-xs">🔍</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
                            {loading ? (
                                <>
                                    <ProductSkeleton />
                                    <ProductSkeleton />
                                    <ProductSkeleton />
                                    <ProductSkeleton />
                                </>
                            ) : products.length > 0 ? (
                                getSortedList().map((item) => {
                                    const isSelected = buildState[activeCategory]?.id === item.id;
                                    const compatible = isCompatible(item);

                                    return (
                                        <div
                                            key={item.id}
                                            onClick={() => handleSelectProduct(item)}
                                            className={`
                                            relative flex items-center p-4 bg-neutral-950 border rounded-none cursor-pointer group transition-all duration-300
                                            ${isSelected ? 'border-[#00f3ff] shadow-[0_0_20px_rgba(0,243,255,0.1)]' : 'border-neutral-800 hover:border-gray-600'}
                                            ${!compatible ? 'opacity-60 grayscale hover:grayscale-0' : ''}
                                        `}
                                        >
                                            {/* Selection Indicator */}
                                            <div className={`absolute top-0 left-0 bottom-0 w-1 transition-colors ${isSelected ? 'bg-[#00f3ff]' : 'bg-transparent group-hover:bg-gray-700'}`}></div>

                                            {/* Product Image */}
                                            <div className="relative flex items-center justify-center w-24 h-24 bg-neutral-900 border border-neutral-800 mr-6 overflow-hidden shrink-0">
                                                {item.image_url ? (
                                                    <img
                                                        src={item.image_url}
                                                        alt={item.name}
                                                        className="w-full h-full object-contain p-2"
                                                        onError={(e) => {
                                                            e.target.onerror = null;
                                                            e.target.style.display = 'none';
                                                        }}
                                                    />
                                                ) : (
                                                    <span className="text-neutral-700 text-xs font-mono select-none">NO_IMG</span>
                                                )}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className={`font-bold text-lg leading-tight ${isSelected ? 'text-[#00f3ff]' : 'text-gray-200'}`}>
                                                        {item.name}
                                                    </h3>
                                                    {!compatible && (
                                                        <span className="bg-red-900/50 text-red-500 text-[10px] uppercase font-bold px-2 py-0.5 border border-red-900 rounded">
                                                            Incompatible
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {item.specs && Object.entries(item.specs).map(([k, v]) => {
                                                        if (!['socket', 'chipset', 'wattage', 'type', 'brand', 'form_factor'].includes(k)) return null;
                                                        return (
                                                            <span key={k} className="px-2 py-1 bg-neutral-900 border border-neutral-800 text-neutral-400 text-xs font-mono uppercase rounded-sm">
                                                                {k}: {v}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Price & Action */}
                                            <div className="text-right pl-6 border-l border-neutral-800 ml-6 min-w-[140px] flex flex-col items-end justify-center h-full">
                                                <div className="font-mono text-[#00f3ff] font-bold text-lg mb-2">
                                                    {getPrice(item)}
                                                </div>
                                                <button
                                                    className={`
                                                    px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all
                                                    ${isSelected
                                                            ? 'bg-[#00f3ff] text-black border border-[#00f3ff]'
                                                            : 'bg-transparent text-gray-500 border border-neutral-700 group-hover:border-gray-400 group-hover:text-white'
                                                        }
                                                `}
                                                >
                                                    {isSelected ? 'SELECTED' : 'SELECT'}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center text-gray-600 font-mono py-20">
                                // NO_COMPONENTS_FOUND_IN_SECTOR
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Toast Notification */}
                {toast && (
                    <div className="fixed bottom-24 right-8 bg-[#00f3ff] text-black px-6 py-4 font-bold tracking-widest uppercase shadow-[0_0_20px_rgba(0,243,255,0.4)] z-50 animate-bounce-short border-2 border-white">
                        <div className="text-[10px] font-mono mb-1 text-neutral-800">SYSTEM_MESSAGE:</div>
                        {toast}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ManualBuildPage;
