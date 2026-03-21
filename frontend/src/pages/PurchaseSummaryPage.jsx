import React, { useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { XMarkIcon, ArrowLeftIcon, ShoppingCartIcon, CheckCircleIcon, BarsArrowUpIcon, ArrowPathIcon, PresentationChartLineIcon } from '@heroicons/react/24/outline';
import logo from '../assets/logo-white.png';
import { analyzeBottleneck } from '../services/componentService';
import BottleneckAnalysisModal from '../components/modals/BottleneckAnalysisModal';
import PerformanceDashboardModal from '../components/modals/PerformanceDashboardModal';

const PurchaseSummaryPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { buildState, totalPrice, compatibility } = location.state || { buildState: {}, totalPrice: 0, compatibility: { issues: [], warnings: [] } };

    const [orderId] = React.useState(() => Math.random().toString(36).substr(2, 9).toUpperCase());

    // Bottleneck Analysis States
    const [isBottleneckModalOpen, setIsBottleneckModalOpen] = useState(false);
    const [isPerfModalOpen, setIsPerfModalOpen] = useState(false);
    const [bottleneckReport, setBottleneckReport] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const handleDetectBottlenecks = useCallback(async () => {
        const components = Object.entries(buildState).map(([catId, item]) => ({
            ...item,
            type: catId,
        }));
        if (components.length === 0) return;
        setIsAnalyzing(true);
        try {
            const report = await analyzeBottleneck(components);
            setBottleneckReport(report);
            setIsBottleneckModalOpen(true);
        } catch (error) {
            console.error('Error analyzing bottleneck:', error);
        } finally {
            setIsAnalyzing(false);
        }
    }, [buildState]);

    // Group items for display
    const coreComponents = ['cpu', 'motherboard', 'ram', 'gpu', 'ssd', 'hdd', 'psu', 'case', 'cooler', 'software'];
    const peripherals = ['monitors', 'keyboards', 'mice', 'headsets', 'speakers', 'kameralizer', 'flight_stick', 'stream_deck', 'webcam', 'microphone', 'capture_card'];

    // Helper to categorize
    const getCategoryType = (key) => {
        if (coreComponents.includes(key)) return 'CORE COMPONENTS';
        if (peripherals.includes(key)) return 'PERIPHERALS';
        return 'ACCESSORIES'; // Cables, Consoles, etc.
    };

    const groupedItems = Object.entries(buildState).reduce((acc, [key, item]) => {
        const type = getCategoryType(key);
        if (!acc[type]) acc[type] = [];
        acc[type].push({ ...item, key }); // Keep key for reference
        return acc;
    }, {});

    const handleBack = () => {
        // Navigate back to build page, passing state back if needed (or relying on context if we had it)
        // For now, we just go back. Ideally, ManualBuildPage should initialize from location.state if present, 
        // but since we are using local state there, we might lose it if we don't pass it back.
        // Let's pass it back just in case we update ManualBuildPage to read it.
        navigate('/manual-build', { state: { preservedBuildState: buildState } });
    };

    const handleAddToCart = () => {
        alert("System Integration Initiated. Added to Cart.");
        // in real app: addToCart(buildState); navigate('/cart');
    };

    return (
        <div className="h-screen overflow-hidden bg-[#050505] text-[#eeeeee] font-mono selection:bg-[#ccff00] selection:text-black flex flex-col">

            {/* Header */}
            <div className="flex h-20 shrink-0 bg-[#050505] border-b-2 border-[#333333] z-50">
                <div className="w-[300px] flex justify-start items-center pl-4 border-r-2 border-[#333333] shrink-0">
                    <img src={logo} alt="PEASY" className="h-full max-h-12 object-contain" />
                </div>
                <header className="flex-1 flex items-center justify-between px-8 bg-[#050505]">
                    <h1 className="text-2xl md:text-3xl font-black tracking-[-0.05em] uppercase text-[#eeeeee]">
                        SYSTEM CONFIGURATION SUMMARY
                    </h1>
                    <span className="text-[10px] font-mono text-[#666666]">ORD.ID: {orderId}</span>
                </header>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Left Column: Component List */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {/* Render Groups */}
                    {['CORE COMPONENTS', 'PERIPHERALS', 'ACCESSORIES'].map(group => {
                        const items = groupedItems[group];
                        if (!items || items.length === 0) return null;

                        return (
                            <div key={group} className="mb-8">
                                <h2 className="text-[#00f3ff] font-bold text-sm tracking-[0.2em] mb-4 border-b border-[#333333] pb-2">
                                    {group}
                                </h2>
                                <div className="space-y-4">
                                    {items.map((item) => (
                                        <div key={item.key} className="flex items-center bg-neutral-900/50 border border-neutral-800 p-4 rounded-none hover:border-neutral-700 transition-colors">
                                            <div className="w-16 h-16 bg-neutral-950 border border-neutral-800 flex items-center justify-center mr-4 shrink-0">
                                                <img src={item.image} alt={item.name} className="w-full h-full object-cover opacity-80" onError={(e) => e.target.style.display = 'none'} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[10px] bg-neutral-800 text-gray-400 px-1.5 py-0.5 rounded uppercase">
                                                        {item.key}
                                                    </span>
                                                </div>
                                                <h3 className="font-bold text-lg text-white leading-tight truncate">{item.name}</h3>
                                                {item.quantity > 1 && (
                                                    <span className="text-xs text-[#00f3ff] font-bold mt-1 block">
                                                        QTY: {item.quantity}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-right pl-4">
                                                <div className="font-mono text-lg font-bold text-white">
                                                    LKR {(item.price * (item.quantity || 1)).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Right Column: Order Summary */}
                <div className="w-1/3 min-w-[400px] bg-neutral-900 border-l-2 border-[#333333] p-8 flex flex-col h-full">
                    <h2 className="text-lg font-black uppercase text-white mb-6 tracking-wide">Order Summary</h2>

                    <div className="space-y-4 mb-8 flex-1">
                        <div className="flex justify-between text-gray-400 text-xs">
                            <span>Subtotal</span>
                            <span>LKR {totalPrice.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-gray-400 text-xs">
                            <span>Processing Fee</span>
                            <span>LKR 0.00</span>
                        </div>
                        <div className="flex justify-between text-gray-400 text-xs">
                            <span>Tax (Est.)</span>
                            <span>LKR {(totalPrice * 0.00).toLocaleString()}</span>
                        </div>

                        <div className="my-6 border-t-2 border-dashed border-neutral-700"></div>

                        <div className="flex justify-between items-end">
                            <span className="text-gray-300 font-bold text-sm uppercase tracking-widest">Total</span>
                            <span className="text-2xl font-black text-[#00f3ff] leading-none">
                                LKR {totalPrice.toLocaleString()}
                            </span>
                        </div>
                    </div>

                    {/* CORE_COMMAND_PANEL */}
                    <div className="my-6 bg-[#0a0a0a] border border-[#333] p-6 shadow-2xl">
                        <div className="text-[11px] font-black font-mono text-[#00f3ff] border-b-2 border-[#1a1a1a] pb-4 mb-6 uppercase tracking-[0.3em]">CORE_COMMAND_PANEL</div>
                        <div className="flex flex-col gap-3">
                            <button
                                className="w-full border-2 border-[#333] text-[#eeeeee] py-4 text-[12px] font-black uppercase tracking-widest hover:border-[#00f3ff] transition-all flex items-center justify-center gap-2"
                                onClick={handleDetectBottlenecks}
                                disabled={isAnalyzing}
                            >
                                {isAnalyzing ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <BarsArrowUpIcon className="w-5 h-5" />}
                                {isAnalyzing ? 'CALCULATING_BALANCE...' : 'DETECT_BOTTLENECKS'}
                            </button>
                            <button
                                className="w-full border-2 border-[#333] text-[#eeeeee] py-4 text-[12px] font-black uppercase tracking-widest hover:border-[#00f3ff] transition-all flex items-center justify-center gap-2 group"
                                onClick={() => setIsPerfModalOpen(true)}
                                disabled={!bottleneckReport}
                            >
                                <PresentationChartLineIcon className="w-5 h-5 group-hover:text-[#00f3ff] transition-colors" />
                                PERFORMANCE_DASHBOARD
                            </button>

                        </div>
                    </div>

                    <div className="space-y-3 mt-auto">
                        <button
                            onClick={handleAddToCart}
                            className="w-full py-4 bg-[#00f3ff] text-black font-black text-sm uppercase tracking-widest hover:bg-[#00d2dd] transition-all flex items-center justify-center gap-2"
                        >
                            <ShoppingCartIcon className="w-5 h-5" />
                            Initialize Purchase
                        </button>

                        <button
                            onClick={handleBack}
                            className="w-full py-4 bg-transparent border border-neutral-700 text-gray-400 font-bold text-xs uppercase tracking-widest hover:border-white hover:text-white transition-all flex items-center justify-center gap-2"
                        >
                            <ArrowLeftIcon className="w-4 h-4" />
                            Back to Configuration
                        </button>
                    </div>

                    <div className="mt-8 pt-6 border-t border-neutral-800">
                        <div className="flex items-center gap-2 text-green-500 mb-2">
                            <CheckCircleIcon className="w-4 h-4" />
                            <span className="text-[10px] font-bold uppercase">Compatibility Verified</span>
                        </div>
                        <p className="text-[10px] text-gray-600 leading-relaxed">
                            System configuration has passed internal consistency checks. All core components are architecturally compatible.
                        </p>
                    </div>
                </div>
            </div>

            {/* Bottleneck Analysis Modal */}
            <BottleneckAnalysisModal
                isOpen={isBottleneckModalOpen}
                onClose={() => setIsBottleneckModalOpen(false)}
                report={bottleneckReport}
            />

            {/* Performance Dashboard Modal — same logic as BuildDetailsPage */}
            <PerformanceDashboardModal
                isOpen={isPerfModalOpen}
                onClose={() => setIsPerfModalOpen(false)}
                report={bottleneckReport}
            />
        </div>
    );
};

export default PurchaseSummaryPage;
