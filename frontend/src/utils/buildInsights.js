// Build Intelligence Engine — plain English hints for the summary page

const num = (v) => {
    if (!v) return 0;
    if (typeof v === 'number') return v;
    const n = parseInt(v.toString().replace(/[^\d]/g, ''));
    return isNaN(n) ? 0 : n;
};

// ── Build Stats — rich performance dashboard data ─────────────────────────────

export const getBuildStats = (buildState) => {
    const { cpu, gpu, ram, psu, ssd, hdd, motherboard } = buildState;

    const n = (v) => {
        if (!v) return 0;
        if (typeof v === 'number') return v;
        const parsed = parseFloat(v.toString().replace(/[^\d.]/g, ''));
        return isNaN(parsed) ? 0 : parsed;
    };

    // ── Safe spec extraction helpers ──────────────────────────────────────────
    const getSpec = (item, keys, fallback = 'N/A') => {
        if (!item) return fallback;
        for (const k of keys) {
            if (item.specs && item.specs[k]) return item.specs[k];
            if (item[k]) return item[k];
        }
        return fallback;
    };

    // ── CPU ───────────────────────────────────────────────────────────────────
    const cpuTdp = n(getSpec(cpu, ['tdp', 'default_tdp']));
    const cpuCores = getSpec(cpu, ['core_count', 'cores'], 'N/A');
    const cpuThreads = getSpec(cpu, ['thread_count', 'threads'], 'N/A');
    const cpuBase = getSpec(cpu, ['core_clock', 'base_clock'], 'N/A');
    const cpuBoost = getSpec(cpu, ['boost_clock'], 'N/A');
    const cpuCache = getSpec(cpu, ['l3_cache', 'cache'], 'N/A');
    const cpuName = cpu ? (cpu.name || '').toUpperCase() : '';

    // CPU power tier for bottleneck math (0-100)
    let cpuPwr = 0;
    if (cpu) {
        if (cpuName.includes('I9') || cpuName.includes('RYZEN 9')) cpuPwr = 100;
        else if (cpuName.includes('I7') || cpuName.includes('RYZEN 7')) cpuPwr = 85;
        else if (cpuName.includes('I5') || cpuName.includes('RYZEN 5')) cpuPwr = 65;
        else if (cpuName.includes('I3') || cpuName.includes('RYZEN 3')) cpuPwr = 40;
        else cpuPwr = 30;
    }

    // ── GPU ───────────────────────────────────────────────────────────────────
    const gpuTdp = n(getSpec(gpu, ['tdp']));
    const gpuVram = getSpec(gpu, ['memory', 'vram', 'ram'], 'N/A');
    const gpuCoreClk = getSpec(gpu, ['core_clock'], 'N/A');
    const gpuMemClk = getSpec(gpu, ['memory_clock', 'effective_memory_clock'], 'N/A');
    const gpuName = gpu ? (gpu.name || '').toUpperCase() : '';
    const hasRT = gpuName.includes('RTX') || gpuName.includes('RX 6') || gpuName.includes('RX 7');

    // GPU power tier for bottleneck and FPS math (0-100)
    let gpuPwr = 0;
    if (gpu) {
        if (gpuName.includes('4090') || gpuName.includes('7900 XTX')) gpuPwr = 100;
        else if (gpuName.includes('4080') || gpuName.includes('7900 XT') || gpuName.includes('3090')) gpuPwr = 90;
        else if (gpuName.includes('4070') || gpuName.includes('7800') || gpuName.includes('3080')) gpuPwr = 75;
        else if (gpuName.includes('4060') || gpuName.includes('7600') || gpuName.includes('3070')) gpuPwr = 60;
        else if (gpuName.includes('3060') || gpuName.includes('6600')) gpuPwr = 45;
        else gpuPwr = 25;
    }

    // ── RAM ───────────────────────────────────────────────────────────────────
    const ramType = getSpec(ram, ['type', 'memory_type'], 'N/A').toUpperCase();
    const ramSpeed = getSpec(ram, ['speed'], 'N/A');
    const ramModules = n(getSpec(ram, ['modules'], ram ? 1 : 0));
    const ramCapacityMap = getSpec(ram, ['capacity'], '');
    // Try to guess total capacity if not explicit
    let ramCap = 'N/A';
    if (ramCapacityMap !== 'N/A') ramCap = ramCapacityMap;
    else if (ram && ram.name) {
        const match = ram.name.match(/(\d+)\s*GB/i);
        if (match) ramCap = match[0];
    }
    const ramChannel = ramModules >= 4 ? 'Quad Channel' : ramModules >= 2 ? 'Dual Channel' : ramModules === 1 ? 'Single Channel' : 'N/A';

    // ── Storage ───────────────────────────────────────────────────────────────
    let storageType = 'N/A';
    if (ssd && hdd) storageType = 'NVMe SSD + HDD';
    else if (ssd) storageType = 'NVMe SSD';
    else if (hdd) storageType = 'Mechanical HDD';

    // Fake speeds if not natively in DB, as requested by UI design for completeness
    const readSpeed = ssd ? 'Up to 7300 MB/s' : hdd ? 'Up to 150 MB/s' : 'N/A';
    const writeSpeed = ssd ? 'Up to 6000 MB/s' : hdd ? 'Up to 130 MB/s' : 'N/A';

    // ── System Metrics & FPS Math ──────────────────────────────────────────────
    const systemTdp = cpuTdp + gpuTdp + (cpu || gpu ? 80 : 0);

    // FPS Estimates (made up heuristics based on gpuPwr and cpuPwr)
    // Base FPS determined by GPU, penalized if CPU is vastly weaker
    const bottleneckFactor = cpu && gpu ? Math.max(0, (gpuPwr - cpuPwr) * 0.8) : 0;

    let fps1080 = 0, fps1440 = 0, fps4K = 0;
    if (gpu) {
        // GPU base performance
        const base1080 = 60 + (gpuPwr * 1.8);
        const base1440 = 40 + (gpuPwr * 1.3);
        const base4K = 20 + (gpuPwr * 0.8);

        // Apply CPU bottleneck (CPU matters more at lower res)
        fps1080 = Math.max(30, Math.round(base1080 - (bottleneckFactor * 1.5)));
        fps1440 = Math.max(20, Math.round(base1440 - (bottleneckFactor * 0.8)));
        fps4K = Math.max(10, Math.round(base4K - (bottleneckFactor * 0.2)));
    }

    // Bottleneck detection
    let bottleneckStatus = 'Balanced Build';
    let bottleneckColor = 'text-green-500';
    if (cpu && gpu) {
        if (gpuPwr > cpuPwr + 25) {
            bottleneckStatus = `CPU Bottleneck (~${Math.round(Math.min(100, (gpuPwr - cpuPwr)))}%)`;
            bottleneckColor = 'text-red-500';
        } else if (cpuPwr > gpuPwr + 40) {
            bottleneckStatus = 'GPU Bottleneck (CPU underutilized)';
            bottleneckColor = 'text-yellow-500';
        }
    } else if (!cpu || !gpu) {
        bottleneckStatus = 'Incomplete Build';
        bottleneckColor = 'text-gray-500';
    }

    // Total Score
    const totalScore = Math.round((gpuPwr * 0.5) + (cpuPwr * 0.3) + ((ramType.includes('DDR5') ? 100 : 70) * 0.1) + ((ssd ? 100 : 30) * 0.1));

    return {
        hasData: !!(cpu || gpu),
        fps: {
            // Only show numbers if both CPU and GPU exist
            p1080: cpu && gpu ? `${fps1080} FPS` : '—',
            p1440: cpu && gpu ? `${fps1440} FPS` : '—',
            p4K: cpu && gpu ? `${fps4K} FPS` : '—'
        },
        cpu: {
            cores: cpuCores !== 'N/A' && cpuThreads !== 'N/A' ? `${cpuCores} Cores / ${cpuThreads} Threads` : cpuCores,
            baseClock: cpuBase !== 'N/A' ? (cpuBase.toString().includes('GHz') ? cpuBase : `${cpuBase} GHz`) : 'N/A',
            boostClock: cpuBoost !== 'N/A' ? (cpuBoost.toString().includes('GHz') ? cpuBoost : `${cpuBoost} GHz`) : 'N/A',
            cache: cpuCache
        },
        gpu: {
            vram: gpuVram !== 'N/A' ? (gpuVram.toString().includes('GB') ? gpuVram : `${gpuVram} GB`) : 'N/A',
            coreClock: gpuCoreClk !== 'N/A' ? (gpuCoreClk.toString().includes('MHz') ? gpuCoreClk : `${gpuCoreClk} MHz`) : 'N/A',
            memorySpeed: gpuMemClk !== 'N/A' ? (gpuMemClk.toString().includes('MHz') ? gpuMemClk : `${gpuMemClk} MHz`) : 'N/A',
            rayTracing: gpu ? (hasRT ? 'Supported' : 'Not Supported') : 'N/A'
        },
        memory: {
            capacity: ramCap,
            speed: ramSpeed !== 'N/A' ? (ramSpeed.toString().includes('MHz') || ramSpeed.toString().includes('MT/s') ? ramSpeed : `${ramSpeed} MT/s`) : 'N/A',
            type: ramType,
            channel: ramChannel
        },
        storage: {
            type: storageType,
            read: readSpeed,
            write: writeSpeed
        },
        system: {
            power: `${systemTdp} W`,
            score: cpu && gpu ? `${totalScore}/100` : '—',
            bottleneck: bottleneckStatus,
            bottleneckColor: bottleneckColor
        }
    };
};


// Rough GPU performance tier based on TDP + name
const getGpuTier = (gpuItem) => {
    if (!gpuItem) return null;
    const tdp = gpuItem.specs?.tdp || num(gpuItem.tdp);
    const name = (gpuItem.name || '').toUpperCase();
    if (name.includes('4090') || name.includes('3090') || tdp >= 400) return { id: 'flagship', label: 'Flagship', use: '4K gaming and professional work' };
    if (name.includes('4080') || name.includes('3080') || (tdp >= 280)) return { id: 'highend', label: 'High-End', use: '4K or ultra-quality 1440p gaming' };
    if (name.includes('4070') || name.includes('3070') || (tdp >= 180)) return { id: 'midhigh', label: 'Mid-High', use: '1440p gaming' };
    if (name.includes('4060') || name.includes('3060') || (tdp >= 100)) return { id: 'mid', label: 'Mid-Range', use: '1080p gaming' };
    return { id: 'entry', label: 'Entry-Level', use: 'everyday tasks and light gaming' };
};

const getCpuStrength = (cpuItem) => {
    if (!cpuItem) return 'unknown';
    const tdp = cpuItem.specs?.tdp || num(cpuItem.default_tdp);
    if (tdp >= 125) return 'strong';
    if (tdp >= 65) return 'mid';
    return 'light';
};

export const generateBuildInsights = (buildState) => {
    const hints = {}; // { [componentKey]: [{ type, message }] }
    const add = (key, type, message) => {
        if (!hints[key]) hints[key] = [];
        hints[key].push({ type, message });
    };

    const { cpu, gpu, motherboard, ram, psu, case: pcCase, cooler, ssd, hdd } = buildState;

    // ── GPU: performance context + bottleneck ────────────────────────────────
    if (gpu) {
        const tier = getGpuTier(gpu);
        if (tier) {
            add('gpu', 'info', `This is a ${tier.label} graphics card, great for ${tier.use}.`);
        }

        if (cpu) {
            const cpuStr = getCpuStrength(cpu);
            const gpuT = getGpuTier(gpu);
            if (gpuT && (gpuT.id === 'highend' || gpuT.id === 'flagship') && cpuStr === 'light') {
                add('gpu', 'warning', `This GPU is very powerful but your CPU may hold it back. Consider pairing it with a stronger processor to get the most out of it.`);
                add('cpu', 'tip', `This processor is better suited to a mid-range GPU. Your selected GPU may not run at its full potential with this CPU.`);
            }
            if (gpuT && gpuT.id === 'entry' && cpuStr === 'strong') {
                add('gpu', 'tip', `Your CPU is much more capable than this GPU. A more powerful graphics card would better match this processor.`);
            }
        }
    }

    // ── CPU: general note ────────────────────────────────────────────────────
    if (cpu && !gpu) {
        add('cpu', 'tip', `Don't forget to add a GPU — most tasks need one for display output.`);
    }

    // ── Motherboard: socket confirmation ────────────────────────────────────
    if (motherboard && cpu) {
        const cpuSock = cpu.specs?.socket || cpu.cpu_socket || '';
        const moboSock = motherboard.specs?.socket || motherboard.socket || '';
        if (cpuSock && moboSock && moboSock.toUpperCase() !== 'UNKNOWN') {
            add('motherboard', 'success', `Compatible with your CPU — both use the ${cpuSock} socket.`);
        }
        const moboRam = (motherboard.specs?.ram_type || motherboard.memory_type || '').toUpperCase();
        if (moboRam && moboRam !== 'UNKNOWN') {
            add('motherboard', 'info', `This board supports ${moboRam} memory — make sure your RAM matches.`);
        }
    }

    // ── RAM: type match ──────────────────────────────────────────────────────
    if (ram) {
        const ramType = (ram.specs?.type || ram.type || '').toUpperCase();
        const moboRam = motherboard ? (motherboard.specs?.ram_type || motherboard.memory_type || '').toUpperCase() : '';
        const cpuMem = cpu ? (cpu.specs?.mem_type || cpu.sys_mem_type || '').toUpperCase() : '';
        const ref = moboRam || cpuMem;

        if (ref && ref !== 'UNKNOWN' && ramType) {
            if (ref.includes(ramType)) {
                add('ram', 'success', `${ramType} RAM — matches what your ${moboRam ? 'motherboard' : 'CPU'} supports. Good to go.`);
            } else {
                add('ram', 'warning', `This RAM is ${ramType} but your ${moboRam ? 'motherboard' : 'CPU'} supports ${ref}. These may not work together.`);
            }
        }

        if (ramType === 'DDR5') {
            add('ram', 'info', `DDR5 is the latest standard — faster and future-proof, but only works on newer boards.`);
        }
    }

    // ── PSU: plain wattage assessment ───────────────────────────────────────
    if (psu) {
        const gpuTdp = gpu ? (gpu.specs?.tdp || num(gpu.tdp)) : 0;
        const cpuTdp = cpu ? (cpu.specs?.tdp || num(cpu.default_tdp)) : 0;
        const needed = gpuTdp + cpuTdp + 100;
        const psuW = psu.specs?.wattage || num(psu.wattage);

        if (psuW && needed > 100) {
            if (psuW >= needed * 1.5) {
                add('psu', 'success', `Plenty of power — this PSU has a lot of headroom for your build. You could even add more components later without worry.`);
            } else if (psuW >= needed * 1.2) {
                add('psu', 'success', `Good match — this PSU comfortably handles your CPU and GPU with room to spare.`);
            } else if (psuW >= needed) {
                add('psu', 'warning', `This PSU can technically run your build, but the headroom is slim. A higher-wattage model would be safer for daily use.`);
            }
        }
    }

    // ── CPU Cooler: adequacy ─────────────────────────────────────────────────
    if (cooler && cpu) {
        const cpuTdp = cpu.specs?.tdp || num(cpu.default_tdp);
        const coolerTdp = cooler.specs?.tdp_rating || num(cooler.tdp);

        if (cpuTdp && coolerTdp) {
            if (coolerTdp >= cpuTdp * 1.5) {
                add('cooler', 'success', `This cooler handles more heat than your CPU produces — great if you plan to push your system hard.`);
            } else if (coolerTdp >= cpuTdp * 1.2) {
                add('cooler', 'success', `Well matched to your CPU. Should keep temperatures comfortable under normal use.`);
            } else if (coolerTdp >= cpuTdp) {
                add('cooler', 'warning', `This cooler barely keeps up with your CPU's heat output. It will work, but a beefier cooler would give you more breathing room.`);
            }
        }
    }

    // ── Case: fit notes ──────────────────────────────────────────────────────
    if (pcCase && gpu) {
        const gpuLen = gpu.specs?.length_mm || num(gpu.length);
        const caseClear = pcCase.specs?.gpu_clearance_mm
            || num((pcCase.supported_gpu_length_mm || '').toString().replace(/[^\d]/g, ''));
        if (gpuLen && caseClear && gpuLen <= caseClear) {
            const margin = caseClear - gpuLen;
            if (margin <= 20) {
                add('case', 'warning', `Your GPU fits, but it's a tight squeeze — only ${margin}mm of space left inside the case.`);
            } else {
                add('case', 'success', `Your GPU fits comfortably with ${margin}mm to spare.`);
            }
        }
    }

    // ── Storage pairing suggestions ──────────────────────────────────────────
    if (ssd && !hdd) {
        add('ssd', 'tip', `SSD gives you fast load times. If you need lots of storage for photos, videos or games, consider adding an HDD too.`);
    }
    if (hdd && !ssd) {
        add('hdd', 'tip', `HDDs are great for large storage, but adding a small SSD for Windows and your main apps would make everything feel much snappier.`);
    }
    if (ssd && hdd) {
        add('ssd', 'success', `Good combo — fast SSD for your OS and apps, large HDD for storage.`);
    }

    return hints;
};
