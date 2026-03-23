import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, ShoppingCartIcon, CheckCircleIcon, LightBulbIcon, CpuChipIcon, ComputerDesktopIcon, CircleStackIcon, ServerIcon, BoltIcon, PresentationChartLineIcon } from '@heroicons/react/24/outline';
import logo from '../assets/logo-white.png';
import { generateBuildInsights, getBuildStats } from '../utils/buildInsights';

// Friendly display names for component keys
const KEY_LABELS = {
    cpu: 'CPU', gpu: 'GPU', motherboard: 'Motherboard', ram: 'Memory',
    ssd: 'Storage (SSD)', hdd: 'Storage (HDD)', psu: 'Power Supply',
    case: 'Case', cooler: 'CPU Cooler', software: 'Software',
    monitors: 'Monitor', keyboards: 'Keyboard', mice: 'Mouse',
    headsets: 'Headset', speakers: 'Speakers', connectors: 'Connectors', converters: 'Converters',
};

// Hint type → colour/icon
const HINT_STYLES = {
    success: { bar: 'bg-green-500', text: 'text-green-400', bg: 'bg-green-900/10 border-green-900/30' },
    warning: { bar: 'bg-yellow-500', text: 'text-yellow-400', bg: 'bg-yellow-900/10 border-yellow-900/30' },
    tip: { bar: 'bg-[#00f3ff]', text: 'text-[#00f3ff]', bg: 'bg-[#00f3ff]/5 border-[#00f3ff]/20' },
    info: { bar: 'bg-neutral-500', text: 'text-gray-400', bg: 'bg-neutral-900/50 border-neutral-800' },
};

const PurchaseSummaryPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { buildState, totalPrice, compatibility } = location.state || { buildState: {}, totalPrice: 0, compatibility: { issues: [], warnings: [] } };

    const [orderId] = React.useState(() => Math.random().toString(36).substr(2, 9).toUpperCase());

    // Generate smart hints + build stats from build state
    const buildHints = useMemo(() => generateBuildInsights(buildState), [buildState]);
    const buildStats = useMemo(() => getBuildStats(buildState), [buildState]);

    // Group items for display
    const coreComponents = ['cpu', 'gpu', 'motherboard', 'ram', 'ssd', 'hdd', 'psu', 'case', 'cooler', 'software'];
    const peripherals = ['monitors', 'keyboards', 'mice', 'headsets', 'speakers', 'kameralizer', 'flight_stick', 'stream_deck', 'webcam', 'microphone', 'capture_card'];

    const getCategoryType = (key) => {
        if (coreComponents.includes(key)) return 'CORE COMPONENTS';
        if (peripherals.includes(key)) return 'PERIPHERALS';
        return 'ACCESSORIES';
    };

    const groupedItems = Object.entries(buildState).reduce((acc, [key, item]) => {
        const type = getCategoryType(key);
        if (!acc[type]) acc[type] = [];
        acc[type].push({ ...item, key });
        return acc;
    }, {});

    // Total hint count for the summary panel
    const totalHints = Object.values(buildHints).flat().length;
    const warningHints = Object.values(buildHints).flat().filter(h => h.type === 'warning').length;

    const [isSaving, setIsSaving] = React.useState(false);
    const [showSaveModal, setShowSaveModal] = React.useState(false);
    const [saveForm, setSaveForm] = React.useState({
        name: `SYSTEM_BUILD_${orderId}`,
        status: "Planned",
        description: ""
    });

    const handleBack = () => navigate('/manual-build', { state: { preservedBuildState: buildState } });
    
    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Import saveProject directly or use it from services
            const { saveProject } = await import('../services/componentService');
            const { auth } = await import('../firebase');
            
            const user = auth.currentUser;
            
            // Convert buildState to an array of components for the backend
            const componentsArray = Object.entries(buildState).map(([key, item]) => ({
                id: item.id,
                type: KEY_LABELS[key] || key,
                name: item.name,
                price: item.price,
                quantity: item.quantity || 1,
                specs: item.specs
            }));

            const payload = {
                user_id: user?.uid || "00000000-0000-0000-0000-000000000000",
                user_email: user?.email || null,
                name: saveForm.name,
                description: saveForm.description,
                total_price: totalPrice,
                components: componentsArray,
                status: saveForm.status,
                progress: saveForm.status === "Completed" ? 100 : (saveForm.status === "In Progress" ? 50 : 0)
            };

            await saveProject(payload);
            setShowSaveModal(false);
            alert("SYSTEM_INTEGRATION_COMPLETE: Build successfully archived to projects.");
            navigate('/');
        } catch (e) {
            console.error("Save error:", e);
            alert("CRITICAL_FAILURE: " + e.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddToCart = () => {
        alert("COMMUNICATION_LINK_ESTABLISHED: Preparing purchase sequence...");
        navigate('/marketplace');
    };

    return (
        <div className="h-screen overflow-hidden bg-[#050505] text-[#eeeeee] font-mono selection:bg-[#ccff00] selection:text-black flex flex-col relative">
            
            {/* Save Modal Overlays everything */}
            {showSaveModal && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[100] p-6">
                    <div className="bg-[#0a0a0a] border border-[#00f3ff] w-full max-w-md p-8 relative overflow-hidden">
                        {/* Brackets */}
                        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#00f3ff]"></div>
                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#00f3ff]"></div>

                        <h3 className="text-xl font-black text-[#00f3ff] mb-6 uppercase tracking-widest">Archive Build Configuration</h3>
                        
                        <div className="space-y-5">
                            <div>
                                <label className="block text-[10px] text-[#444] font-bold uppercase mb-2">Build Identity</label>
                                <input 
                                    className="w-full bg-[#111] border border-[#222] text-[#fff] p-3 outline-none focus:border-[#00f3ff] transition-colors"
                                    value={saveForm.name}
                                    onChange={e => setSaveForm({...saveForm, name: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] text-[#444] font-bold uppercase mb-2">Operational Status</label>
                                <select 
                                    className="w-full bg-[#111] border border-[#222] text-[#fff] p-3 outline-none focus:border-[#00f3ff] transition-colors appearance-none"
                                    value={saveForm.status}
                                    onChange={e => setSaveForm({...saveForm, status: e.target.value})}
                                >
                                    <option value="Planned">Planned</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Completed">Completed</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] text-[#444] font-bold uppercase mb-2">System Manual / Bio</label>
                                <textarea 
                                    className="w-full bg-[#111] border border-[#222] text-[#fff] p-3 outline-none focus:border-[#00f3ff] transition-colors min-h-[100px] resize-none"
                                    placeholder="Enter build description..."
                                    value={saveForm.description}
                                    onChange={e => setSaveForm({...saveForm, description: e.target.value})}
                                />
                            </div>

                            <div className="pt-4 flex gap-4">
                                <button 
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="flex-1 bg-[#00f3ff] text-black h-12 font-black uppercase tracking-widest hover:bg-[#00d2dd] transition-all disabled:opacity-50"
                                >
                                    {isSaving ? "SYNCHRONIZING..." : "CONFIRM_ARCHIVE"}
                                </button>
                                <button 
                                    onClick={() => setShowSaveModal(false)}
                                    className="px-6 border border-red-900 text-red-500 font-bold uppercase hover:bg-red-900/10 transition-all"
                                >
                                    ABORT
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex h-20 shrink-0 bg-[#050505] border-b-2 border-[#333333] z-50">
                <div className="w-[300px] flex justify-start items-center pl-4 border-r-2 border-[#333333] shrink-0">
                    <img src={logo} alt="PEASY" className="h-full max-h-12 object-contain" />
                </div>
                <header className="flex-1 flex items-center justify-between px-8 bg-[#050505]">
                    <h1 className="text-2xl md:text-3xl font-black tracking-[-0.05em] uppercase text-[#eeeeee]">
                        System Configuration Summary
                    </h1>
                    <span className="text-[10px] font-mono text-[#666666]">ORD.ID: {orderId}</span>
                </header>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Left Column: Component List with Hints */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">

                    {/* Compatibility banners */}
                    {compatibility?.issues?.length > 0 && (
                        <div className="mb-6 p-4 bg-red-900/20 border border-red-900 rounded-sm">
                            <div className="flex items-center gap-2 text-red-400 font-bold text-xs uppercase mb-2">
                                {compatibility.issues.length} Compatibility Issue{compatibility.issues.length > 1 ? 's' : ''} Detected
                            </div>
                            <ul className="space-y-1">
                                {compatibility.issues.map((issue, i) => (
                                    <li key={i} className="text-red-300 text-xs">{issue}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {compatibility?.warnings?.length > 0 && (
                        <div className="mb-6 p-4 bg-yellow-900/10 border border-yellow-900/40 rounded-sm">
                            <div className="flex items-center gap-2 text-yellow-400 font-bold text-xs uppercase mb-2">
                                {compatibility.warnings.length} Advisory Notice{compatibility.warnings.length > 1 ? 's' : ''}
                            </div>
                            <ul className="space-y-1">
                                {compatibility.warnings.map((w, i) => (
                                    <li key={i} className="text-yellow-300 text-xs">{w}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Component groups */}
                    {['CORE COMPONENTS', 'PERIPHERALS', 'ACCESSORIES'].map(group => {
                        const items = groupedItems[group];
                        if (!items || items.length === 0) return null;

                        return (
                            <div key={group} className="mb-10">
                                <h2 className="text-[#00f3ff] font-bold text-xs tracking-[0.25em] mb-4 border-b border-[#333333] pb-2 uppercase">
                                    {group}
                                </h2>
                                <div className="space-y-3">
                                    {items.map((item) => {
                                        const hints = buildHints[item.key] || [];
                                        return (
                                            <div key={item.key} className="bg-neutral-900/40 border border-neutral-800 rounded-none overflow-hidden hover:border-neutral-700 transition-colors">
                                                {/* Main row */}
                                                <div className="flex items-center p-4">
                                                    <div className="w-16 h-16 bg-neutral-950 border border-neutral-800 flex items-center justify-center mr-4 shrink-0">
                                                        <img 
                                                            src={item.image_url || item.image} 
                                                            alt={item.name} 
                                                            style={{ transform: item.image_rotate ? `rotate(${item.image_rotate}deg)` : 'none' }}
                                                            className="w-full h-full object-contain opacity-80 transition-transform duration-500" 
                                                            onError={(e) => e.target.style.display = 'none'} 
                                                        />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-[10px] bg-neutral-800 text-[#00f3ff] px-2 py-0.5 rounded-sm uppercase font-bold tracking-wide">
                                                                {KEY_LABELS[item.key] || item.key}
                                                            </span>
                                                            {hints.length > 0 && (
                                                                <span className="flex items-center gap-1 text-[9px] text-gray-500">
                                                                    <LightBulbIcon className="w-3 h-3" />
                                                                    {hints.length} insight{hints.length > 1 ? 's' : ''}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <h3 className="font-bold text-base text-white leading-tight">{item.name}</h3>
                                                        {item.quantity > 1 && (
                                                            <span className="text-xs text-[#00f3ff] font-bold mt-0.5 block">QTY: {item.quantity}</span>
                                                        )}
                                                        {/* Specs summary row */}
                                                        {item.specs && (
                                                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                                {Object.entries(item.specs)
                                                                    .filter(([k, v]) => v && v !== 'Unknown' && ['socket', 'type', 'wattage', 'tdp', 'form_factor', 'mem_type', 'manufacturer'].includes(k))
                                                                    .slice(0, 4)
                                                                    .map(([k, v]) => (
                                                                        <span key={k} className="text-[10px] bg-neutral-800 text-neutral-500 px-1.5 py-0.5 rounded-sm font-mono uppercase">
                                                                            {k}: {v}
                                                                        </span>
                                                                    ))
                                                                }
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="text-right pl-4 shrink-0">
                                                        <div className="font-mono text-lg font-bold text-white">
                                                            LKR {(item.price * (item.quantity || 1)).toLocaleString()}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Hints — shown inline below the component */}
                                                {hints.length > 0 && (
                                                    <div className="border-t border-neutral-800 divide-y divide-neutral-800/50">
                                                        {hints.map((hint, i) => {
                                                            const style = HINT_STYLES[hint.type] || HINT_STYLES.info;
                                                            return (
                                                                <div key={i} className={`flex gap-3 px-4 py-2.5 ${style.bg} border-l-0`}>
                                                                    <div className={`w-0.5 shrink-0 self-stretch rounded-full ${style.bar}`}></div>
                                                                    <p className={`text-xs leading-relaxed ${style.text}`}>{hint.message}</p>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Right Column: Order Summary */}
                <div className="w-[460px] shrink-0 bg-neutral-900 border-l-2 border-[#333333] flex flex-col h-full overflow-hidden">

                    {/* Fixed top: title + price */}
                    <div className="px-8 pt-8 pb-4 shrink-0">
                        <h2 className="text-lg font-black uppercase text-white mb-5 tracking-wide">Order Summary</h2>
                        <div className="space-y-2.5">
                            <div className="flex justify-between text-gray-400 text-xs">
                                <span>Subtotal</span>
                                <span>LKR {totalPrice.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-gray-400 text-xs">
                                <span>Processing Fee</span>
                                <span>LKR 0.00</span>
                            </div>
                            <div className="my-3 border-t-2 border-dashed border-neutral-700"></div>
                            <div className="flex justify-between items-end">
                                <span className="text-gray-300 font-bold text-sm uppercase tracking-widest">Total</span>
                                <span className="text-2xl font-black text-[#00f3ff] leading-none">
                                    LKR {totalPrice.toLocaleString()}
                                </span>
                            </div>
                        </div>
                        <div className="mt-4 border-t border-neutral-800"></div>
                    </div>

                    {/* Scrollable middle: Performance Estimator + insights */}
                    <div className="flex-1 overflow-y-auto px-8 py-4 custom-scrollbar">

                        {/* Performance Dashboard */}
                        <div className="mb-4">
                            <div className="flex items-center gap-2 mb-3 px-1">
                                <PresentationChartLineIcon className="w-5 h-5 text-[#00f3ff]" />
                                <h3 className="text-sm font-black uppercase tracking-widest text-white">Performance Stats</h3>
                            </div>

                            {!buildStats.hasData ? (
                                <div className="border border-neutral-800 bg-neutral-900/50 p-6 text-center">
                                    <p className="text-[11px] text-gray-500 uppercase tracking-widest">Select CPU and GPU to see estimates</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* FPS Estimates */}
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="bg-neutral-950 border border-neutral-800 p-3 text-center transition-colors hover:border-[#00f3ff]/50">
                                            <div className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">1080p Ultra</div>
                                            <div className="text-xl font-black text-white">{buildStats.fps.p1080}</div>
                                        </div>
                                        <div className="bg-neutral-950 border border-neutral-800 p-3 text-center transition-colors hover:border-[#00f3ff]/50">
                                            <div className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">1440p High</div>
                                            <div className="text-xl font-black text-white">{buildStats.fps.p1440}</div>
                                        </div>
                                        <div className="bg-neutral-950 border border-neutral-800 p-3 text-center transition-colors hover:border-[#00f3ff]/50">
                                            <div className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">4K Medium</div>
                                            <div className="text-xl font-black text-white">{buildStats.fps.p4K}</div>
                                        </div>
                                    </div>

                                    {/* System Metrics */}
                                    <div className="bg-neutral-900 border border-neutral-800 p-4">
                                        <div className="flex items-center gap-2 mb-3">
                                            <BoltIcon className="w-4 h-4 text-yellow-500" />
                                            <h4 className="text-[11px] font-bold text-gray-300 uppercase tracking-wider">System Metrics</h4>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center bg-neutral-950 px-3 py-2 border border-neutral-800/50">
                                                <span className="text-[10px] text-gray-500 uppercase">Power Draw</span>
                                                <span className="text-xs font-mono text-yellow-400 font-bold">{buildStats.system.power}</span>
                                            </div>
                                            <div className="flex justify-between items-center bg-neutral-950 px-3 py-2 border border-neutral-800/50">
                                                <span className="text-[10px] text-gray-500 uppercase">Bottleneck</span>
                                                <span className={`text-[10px] font-bold uppercase tracking-wider ${buildStats.system.bottleneckColor}`}>{buildStats.system.bottleneck}</span>
                                            </div>
                                            <div className="flex justify-between items-center bg-neutral-950 px-3 py-2 border border-neutral-800/50">
                                                <span className="text-[10px] text-gray-500 uppercase">Sys Score</span>
                                                <span className="text-xs font-mono text-[#00f3ff] font-bold">{buildStats.system.score}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Hardware Details Grid */}
                                    <div className="grid grid-cols-2 gap-3">
                                        {/* CPU */}
                                        <div className="bg-neutral-950 border border-neutral-800 p-3">
                                            <div className="flex items-center gap-2 mb-2">
                                                <CpuChipIcon className="w-3.5 h-3.5 text-gray-400" />
                                                <h4 className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">CPU</h4>
                                            </div>
                                            <div className="space-y-1.5">
                                                <div className="flex justify-between"><span className="text-[9px] text-gray-500">Cores</span><span className="text-[9px] text-white font-mono">{buildStats.cpu.cores}</span></div>
                                                <div className="flex justify-between"><span className="text-[9px] text-gray-500">Base</span><span className="text-[9px] text-white font-mono">{buildStats.cpu.baseClock}</span></div>
                                                <div className="flex justify-between"><span className="text-[9px] text-gray-500">Boost</span><span className="text-[9px] text-white font-mono">{buildStats.cpu.boostClock}</span></div>
                                                <div className="flex justify-between"><span className="text-[9px] text-gray-500">Cache</span><span className="text-[9px] text-white font-mono">{buildStats.cpu.cache}</span></div>
                                            </div>
                                        </div>

                                        {/* GPU */}
                                        <div className="bg-neutral-950 border border-neutral-800 p-3">
                                            <div className="flex items-center gap-2 mb-2">
                                                <ComputerDesktopIcon className="w-3.5 h-3.5 text-gray-400" />
                                                <h4 className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">GPU</h4>
                                            </div>
                                            <div className="space-y-1.5">
                                                <div className="flex justify-between"><span className="text-[9px] text-gray-500">VRAM</span><span className="text-[9px] text-white font-mono">{buildStats.gpu.vram}</span></div>
                                                <div className="flex justify-between"><span className="text-[9px] text-gray-500">Core</span><span className="text-[9px] text-white font-mono">{buildStats.gpu.coreClock}</span></div>
                                                <div className="flex justify-between"><span className="text-[9px] text-gray-500">Memory</span><span className="text-[9px] text-white font-mono">{buildStats.gpu.memorySpeed}</span></div>
                                                <div className="flex justify-between"><span className="text-[9px] text-gray-500">RTX/RT</span><span className={`text-[9px] font-mono ${buildStats.gpu.rayTracing === 'Supported' ? 'text-green-400' : 'text-gray-500'}`}>{buildStats.gpu.rayTracing}</span></div>
                                            </div>
                                        </div>

                                        {/* Memory */}
                                        <div className="bg-neutral-950 border border-neutral-800 p-3">
                                            <div className="flex items-center gap-2 mb-2">
                                                <CircleStackIcon className="w-3.5 h-3.5 text-gray-400" />
                                                <h4 className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">Memory</h4>
                                            </div>
                                            <div className="space-y-1.5">
                                                <div className="flex justify-between"><span className="text-[9px] text-gray-500">Capacity</span><span className="text-[9px] text-white font-mono">{buildStats.memory.capacity}</span></div>
                                                <div className="flex justify-between"><span className="text-[9px] text-gray-500">Speed</span><span className="text-[9px] text-white font-mono">{buildStats.memory.speed}</span></div>
                                                <div className="flex justify-between"><span className="text-[9px] text-gray-500">Type</span><span className="text-[9px] text-white font-mono">{buildStats.memory.type}</span></div>
                                                <div className="flex justify-between"><span className="text-[9px] text-gray-500">Config</span><span className="text-[9px] text-white font-mono">{buildStats.memory.channel}</span></div>
                                            </div>
                                        </div>

                                        {/* Storage */}
                                        <div className="bg-neutral-950 border border-neutral-800 p-3">
                                            <div className="flex items-center gap-2 mb-2">
                                                <ServerIcon className="w-3.5 h-3.5 text-gray-400" />
                                                <h4 className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">Storage</h4>
                                            </div>
                                            <div className="space-y-1.5">
                                                <div className="flex justify-between"><span className="text-[9px] text-gray-500">Drive</span><span className="text-[9px] text-white font-mono text-right">{buildStats.storage.type}</span></div>
                                                <div className="flex justify-between"><span className="text-[9px] text-gray-500">Read</span><span className="text-[9px] text-white font-mono text-right">{buildStats.storage.read}</span></div>
                                                <div className="flex justify-between"><span className="text-[9px] text-gray-500">Write</span><span className="text-[9px] text-white font-mono text-right">{buildStats.storage.write}</span></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Insights count */}
                        {totalHints > 0 && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-neutral-800/40 border border-neutral-700">
                                <LightBulbIcon className="w-3.5 h-3.5 text-[#00f3ff] shrink-0" />
                                <span className="text-[11px] text-gray-400">
                                    <span className="text-white font-bold">{totalHints}</span> build insight{totalHints > 1 ? 's' : ''} found below{warningHints > 0 ? ` · ` : ''}
                                    {warningHints > 0 && <span className="text-yellow-400 font-bold">{warningHints} warning{warningHints > 1 ? 's' : ''}</span>}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Fixed bottom: buttons + compat */}
                    <div className="px-8 pt-4 pb-8 shrink-0 border-t border-neutral-800">
                        <div className="space-y-3">
                            <button
                                onClick={() => setShowSaveModal(true)}
                                className="w-full py-4 bg-[#00f3ff] text-black font-black text-sm uppercase tracking-widest hover:bg-[#00d2dd] transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,243,255,0.2)]"
                            >
                                <CheckCircleIcon className="w-5 h-5" />
                                Save to My Projects
                            </button>
                            <button
                                onClick={handleAddToCart}
                                className="w-full py-3 bg-neutral-900 border border-neutral-800 text-gray-400 font-bold text-[10px] uppercase tracking-[0.2em] hover:border-[#00f3ff] hover:text-[#00f3ff] transition-all flex items-center justify-center gap-2"
                            >
                                <ShoppingCartIcon className="w-4 h-4" />
                                Initialize Purchase
                            </button>
                            <button
                                onClick={handleBack}
                                className="w-full py-3 bg-transparent border border-neutral-800 text-gray-600 font-bold text-[10px] uppercase tracking-[0.2em] hover:border-white hover:text-white transition-all flex items-center justify-center gap-2"
                            >
                                <ArrowLeftIcon className="w-3 h-3" />
                                Back to Configuration
                            </button>
                        </div>
                        <div className="mt-5 flex items-center gap-2">
                            <CheckCircleIcon className={`w-4 h-4 shrink-0 ${compatibility?.issues?.length === 0 ? 'text-green-500' : 'text-red-500'}`} />
                            <p className="text-[10px] text-gray-600 leading-relaxed uppercase font-mono tracking-tighter">
                                {compatibility?.issues?.length === 0
                                    ? 'COMPONENT_SYNC: OK'
                                    : `SYSTEM_ALERT: ${compatibility?.issues?.length} ISSUES`
                                }
                            </p>
                        </div>
                    </div>
                </div>

            </div>

        </div>
    );
};

export default PurchaseSummaryPage;
