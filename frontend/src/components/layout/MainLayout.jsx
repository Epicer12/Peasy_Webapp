import React, { useState } from 'react';
import logo from '../../assets/logo-white.png';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
    HomeIcon,
    CpuChipIcon,
    WrenchScrewdriverIcon,
    QuestionMarkCircleIcon,
    ShoppingBagIcon,
    UserGroupIcon,
    Bars3Icon,
    XMarkIcon
} from '@heroicons/react/24/outline';

const MainLayout = () => {
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const navigation = [
        { name: 'HOME', href: '/home', icon: HomeIcon },
        { name: 'PLAN', href: '/plan', icon: CpuChipIcon },
        { name: 'ASSEMBLE', href: '/assemble', icon: WrenchScrewdriverIcon },
        { name: 'TROUBLESHOOT', href: '/troubleshoot', icon: QuestionMarkCircleIcon },
        { name: 'MARKET', href: '/marketplace', icon: ShoppingBagIcon },
        { name: 'COMMUNITY', href: '/community', icon: UserGroupIcon },
    ];

    const getPageTitle = () => {
        const path = location.pathname;
        const activeNav = navigation.find(n => n.href === path);
        if (activeNav) return activeNav.name;
        if (path === '/camera') return 'SCANNER';
        if (path.startsWith('/model')) return 'MODEL_VIEW';
        return 'DASHBOARD';
    };

    return (
        <div className="flex h-screen bg-[#050505] text-[#eeeeee] font-mono overflow-hidden selection:bg-[#ccff00] selection:text-black">
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/80 z-40 lg:hidden backdrop-blur-sm"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Brutalist Sidebar - Standard Width */}
            <aside className={`
        fixed inset-y-0 left-0 z-50 w-48 bg-[#050505] border-r-2 border-[#333333] transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        flex flex-col justify-between
      `}>
                {/* Brand / Logo Area */}
                <div className="h-20 flex flex-col justify-center items-center border-b-2 border-[#333333] p-4">
                    <img src={logo} alt="PEASY" className="h-full object-contain" />
                </div>

                {/* Vertical Navigation - Horizontal Text */}
                <nav className="flex-1 flex flex-col py-6 px-3 space-y-1 overflow-y-auto scrollbar-hide">
                    {navigation.map((item) => (
                        <NavLink
                            key={item.name}
                            to={item.href}
                            onClick={() => setSidebarOpen(false)}
                            className={({ isActive }) => `
                                flex items-center gap-3 px-3 py-2 text-xs md:text-sm font-bold tracking-widest uppercase transition-all duration-200
                                border-l-2
                                ${isActive
                                    ? 'text-[#050505] bg-[#00f3ff] border-[#00f3ff]' // Active: filled block
                                    : 'text-[#666666] border-transparent hover:text-[#eeeeee] hover:bg-[#1a1a1a] hover:border-[#333]'
                                }
                            `}
                        >
                            {/* Icon could be added here if we want, currently using text only based on design prefs */}
                            {item.name}
                        </NavLink>
                    ))}
                </nav>

                {/* User Profile / Footer */}
                <div className="border-t-2 border-[#333333] flex flex-col">
                    <NavLink
                        to="/profile"
                        className={({ isActive }) => `
                            flex flex-col justify-center items-center py-3 transition-all duration-200
                            ${isActive ? 'bg-[#00f3ff] text-[#050505]' : 'hover:bg-[#1a1a1a]'}
                        `}
                    >
                        <div className="w-full px-4 flex items-center justify-between">
                            <span className={`text-[10px] ${location.pathname.startsWith('/profile') ? 'text-black' : 'text-[#666]'}`}>USER: 8829</span>
                            <div className={`w-6 h-6 border-2 ${location.pathname.startsWith('/profile') ? 'border-black' : 'border-[#eeeeee]'} flex items-center justify-center font-bold text-[10px]`}>
                                US
                            </div>
                        </div>
                    </NavLink>

                    {/* Nested Scan Link - Visible when on Profile or Warranty */}
                    {(location.pathname === '/profile' || location.pathname === '/warranty') && (
                        <NavLink
                            to="/warranty"
                            className={({ isActive }) => `
                                py-3 px-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-200 text-center
                                ${isActive ? 'text-[#00f3ff] bg-[#0a0a0a]' : 'text-[#555] hover:text-[#cf0] hover:bg-[#0a0a0a]'}
                                border-t border-[#1a1a1a] border-dashed
                            `}
                        >
                            {">"} Scan Warranty
                        </NavLink>
                    )}
                </div>
            </aside>

            {/* Main Content Wrapper */}
            <div className="flex-1 flex flex-col min-w-0">

                {/* Brutalist Header */}
                <header className="h-16 md:h-20 flex items-end justify-between px-6 md:px-8 pb-3 border-b-2 border-[#333333] bg-[#050505]">
                    <div className="flex flex-col w-full">
                        <div className="flex justify-between items-start mb-1">
                            {/* Hamburger for mobile */}
                            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-[#eeeeee]">
                                <Bars3Icon className="w-6 h-6" />
                            </button>
                            <span className="text-[10px] font-mono text-[#666666] ml-auto">SYS.VER.2.0.5 // ONLINE</span>
                        </div>
                        <h2 className="text-2xl md:text-4xl font-black tracking-[-0.05em] uppercase leading-none text-[#eeeeee]">
                            {getPageTitle()}
                        </h2>
                    </div>
                </header>

                {/* Page Content - Added bottom padding */}
                <main className="flex-1 overflow-y-auto p-6 md:p-12 pb-32 relative scrollbar-thin scrollbar-thumb-[#333333] scrollbar-track-transparent">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
