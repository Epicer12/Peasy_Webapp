
// Utility to check compatibility between selected build components.
// Uses the actual DB field names as stored in item.specs by parseSpecs().

// Fuzzy socket match — handles compound sockets e.g. "AM3+/AM3", short-form "1150" vs "LGA1150"
const socketMatches = (sock1, sock2) => {
    if (!sock1 || !sock2) return true; // unknown → assume ok
    const a = sock1.toUpperCase().replace(/\s/g, '');
    const variants = sock2.toUpperCase().replace(/\s/g, '').split(/[,/]/);
    return variants.some(v => v === a || v.includes(a) || a.includes(v));
};

const isUnknown = (v) => !v || v.toString().toUpperCase() === 'UNKNOWN' || v.toString().trim() === '';

export const checkCompatibility = (parts) => {
    const issues = [];
    const warnings = [];

    const { cpu, motherboard, ram, gpu, psu, case: pcCase, cooler, ssd, hdd } = parts;

    // ─── 1. CPU ↔ Motherboard  (Socket) ─────────────────────────────────────
    if (cpu && motherboard) {
        const cpuSock = cpu.specs?.socket || cpu.cpu_socket || '';
        const moboSock = motherboard.specs?.socket || motherboard.socket || '';
        if (!isUnknown(cpuSock) && !isUnknown(moboSock)) {
            if (!socketMatches(cpuSock, moboSock)) {
                issues.push(`CPU socket mismatch: ${cpu.name} uses ${cpuSock} but ${motherboard.name} has ${moboSock}`);
            }
        }
    }

    // ─── 2. RAM ↔ Motherboard  (Memory type DDR3/DDR4/DDR5) ─────────────────
    if (ram && motherboard) {
        const moboRam = motherboard.specs?.ram_type || motherboard.memory_type || '';
        const ramType = ram.specs?.type || ram.type || '';
        if (!isUnknown(moboRam) && !isUnknown(ramType)) {
            if (!moboRam.toUpperCase().includes(ramType.toUpperCase()) && !ramType.toUpperCase().includes(moboRam.toUpperCase())) {
                issues.push(`RAM type mismatch: ${motherboard.name} requires ${moboRam} but selected RAM is ${ramType}`);
            }
        }
    }

    // ─── 3. RAM ↔ CPU  (if no motherboard selected yet) ─────────────────────
    if (ram && cpu && !motherboard) {
        const cpuMem = cpu.specs?.mem_type || cpu.sys_mem_type || '';
        const ramType = ram.specs?.type || ram.type || '';
        if (!isUnknown(cpuMem) && !isUnknown(ramType)) {
            if (!cpuMem.toUpperCase().includes(ramType.toUpperCase()) && !ramType.toUpperCase().includes(cpuMem.toUpperCase())) {
                warnings.push(`RAM type advisory: CPU supports ${cpuMem} but selected RAM is ${ramType}`);
            }
        }
    }

    // ─── 4. PSU ↔ System TDP  (CPU + GPU + 100W overhead) ───────────────────
    if (psu) {
        const gpuTdp = gpu ? (gpu.specs?.tdp || parseInt(gpu.tdp || '0')) : 0;
        const cpuTdp = cpu ? (cpu.specs?.tdp || parseInt(cpu.default_tdp || '0')) : 0;
        const systemTdp = (gpuTdp || 0) + (cpuTdp || 0) + 100;
        const psuW = psu.specs?.wattage || parseInt((psu.wattage || '').toString().replace(/[^\d]/g, '') || '0');

        if (psuW > 0 && systemTdp > 100) {
            if (psuW < systemTdp) {
                issues.push(`Insufficient PSU: System requires ~${systemTdp}W (CPU ${cpuTdp}W + GPU ${gpuTdp}W + 100W overhead) but PSU is only ${psuW}W`);
            } else if (psuW < systemTdp * 1.2) {
                warnings.push(`Low PSU headroom: ${psuW}W PSU for ~${systemTdp}W system — recommend at least ${Math.ceil(systemTdp * 1.2 / 50) * 50}W`);
            }
        }
    }

    // ─── 5. Case ↔ Motherboard  (Form factor) ────────────────────────────────
    if (pcCase && motherboard) {
        // motherboard stores form_factor in specs (normalised by parseSpecs)
        const moboFF = (motherboard.specs?.form_factor || motherboard.form_factor || '').toLowerCase();
        // case stores its mobo support as mobo_support (set by parseSpecs) OR raw motherboard_support
        const caseSupp = (pcCase.specs?.mobo_support || pcCase.motherboard_support || '').toLowerCase();

        if (!isUnknown(moboFF) && !isUnknown(caseSupp)) {
            if (moboFF.includes('e-atx') && !caseSupp.includes('e-atx')) {
                issues.push(`Form factor mismatch: E-ATX motherboard won't fit in this case (supports ${caseSupp})`);
            } else if (moboFF.includes('atx') && !moboFF.includes('micro') && !moboFF.includes('e-atx')
                && (caseSupp.includes('micro') || caseSupp.includes('itx'))) {
                issues.push(`Form factor mismatch: ATX motherboard won't fit in this case (supports ${caseSupp})`);
            } else if (moboFF.includes('micro') && caseSupp.includes('itx') && !caseSupp.includes('micro')) {
                issues.push(`Form factor mismatch: Micro-ATX motherboard won't fit in this ITX case`);
            }
        }
    }

    // ─── 6. Case ↔ GPU  (Clearance - length) ─────────────────────────────────
    if (pcCase && gpu) {
        const gpuLen = gpu.specs?.length_mm || parseInt(gpu.length || '0');
        const caseClear = pcCase.specs?.gpu_clearance_mm
            || parseInt((pcCase.supported_gpu_length_mm || '').toString().replace(/[^\d]/g, '') || '0');
        if (gpuLen && caseClear && gpuLen > caseClear) {
            issues.push(`GPU won't fit: ${gpu.name} is ${gpuLen}mm but case supports up to ${caseClear}mm`);
        }
    }

    // ─── 7. Case ↔ CPU Cooler  (Height clearance) ───────────────────────────
    if (pcCase && cooler) {
        const coolerH = cooler.specs?.height_mm
            || parseInt((cooler.height_size || '').toString().replace(/[^\d]/g, '') || '0');
        const caseH = pcCase.specs?.cooler_clearance_mm
            || parseInt((pcCase.supported_cpu_cooler_height_mm || '').toString().replace(/[^\d]/g, '') || '0');
        if (coolerH && caseH && coolerH > caseH) {
            issues.push(`Cooler too tall: ${cooler.name} is ${coolerH}mm but case supports up to ${caseH}mm`);
        }
    }

    // ─── 8. CPU Cooler ↔ CPU  (Socket) ───────────────────────────────────────
    if (cooler && cpu) {
        const cpuSock = (cpu.specs?.socket || cpu.cpu_socket || '').toUpperCase();
        // supported_sockets is parsed as an array by parseSpecs (cooler type)
        const coolerSocks = cooler.specs?.supported_sockets
            || (cooler.supported_sockets ? cooler.supported_sockets.split(',').map(s => s.trim().toUpperCase()) : []);

        if (!isUnknown(cpuSock) && coolerSocks.length > 0) {
            const fits = coolerSocks.some(sock => sock === cpuSock || sock.includes(cpuSock) || cpuSock.includes(sock));
            if (!fits) {
                issues.push(`Cooler socket mismatch: ${cooler.name} does not support ${cpuSock} socket`);
            }
        }
    }

    // ─── 9. CPU Cooler ↔ CPU  (TDP) ──────────────────────────────────────────
    if (cooler && cpu) {
        const cpuTdp = cpu.specs?.tdp || parseInt(cpu.default_tdp || '0');
        const coolerTdp = cooler.specs?.tdp_rating || parseInt((cooler.tdp || '').toString().replace(/[^\d]/g, '') || '0');
        if (cpuTdp && coolerTdp && cpuTdp > coolerTdp) {
            warnings.push(`Thermal warning: CPU TDP is ${cpuTdp}W but cooler is only rated for ${coolerTdp}W`);
        }
    }

    return { issues, warnings };
};
