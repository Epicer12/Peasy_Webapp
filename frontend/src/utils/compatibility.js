
// Utility to check compatibility between components

export const checkCompatibility = (parts) => {
    const issues = [];
    const warnings = [];

    const { cpu, motherboard, ram, gpu, psu, case: pcCase, cooler, storage } = parts;

    // 1. CPU <-> Motherboard (Socket & Brand)
    if (cpu && motherboard) {
        if (cpu.specs?.socket && motherboard.specs?.socket) {
            if (cpu.specs.socket !== "Unknown" && motherboard.specs.socket !== "Unknown") {
                if (cpu.specs.socket !== motherboard.specs.socket) {
                    issues.push(`Incompatible CPU Socket: ${cpu.name} (${cpu.specs.socket}) vs ${motherboard.name} (${motherboard.specs.socket})`);
                }
            }
        }
    }

    // 2. Motherboard <-> RAM (Type)
    if (motherboard && ram) {
        if (motherboard.specs?.ram_type && ram.specs?.type) {
            if (motherboard.specs.ram_type !== "Unknown" && ram.specs.type !== "Unknown") {
                if (motherboard.specs.ram_type !== ram.specs.type) {
                    issues.push(`Incompatible RAM Type: ${motherboard.specs.ram_type} board vs ${ram.specs.type} RAM.`);
                }
            }
        }
    }

    // 3. GPU <-> PSU (Wattage)
    if (gpu && psu) {
        let neededWattage = 500; // Baseline

        // Use parsed chipset if available, else heuristic
        const gpuChipset = gpu.specs?.chipset || gpu.name;
        const lowName = gpuChipset.toLowerCase();

        if (lowName.includes("5090") || lowName.includes("4090") || lowName.includes("3090") || lowName.includes("7900 xtx")) neededWattage = 850;
        else if (lowName.includes("5080") || lowName.includes("4080") || lowName.includes("3080") || lowName.includes("7900 xt")) neededWattage = 750;
        else if (lowName.includes("5070") || lowName.includes("4070") || lowName.includes("3070") || lowName.includes("7800")) neededWattage = 650;
        else if (lowName.includes("5060") || lowName.includes("4060") || lowName.includes("3060") || lowName.includes("7600")) neededWattage = 550;

        if (psu.specs?.wattage && psu.specs.wattage !== "Unknown") {
            const psuW = parseInt(psu.specs.wattage);
            if (psuW < neededWattage) {
                warnings.push(`Low Power Warning: Recommended for this build is ${neededWattage}W+, but PSU is ${psuW}W.`);
            }
        }
    }

    // 4. Case <-> Motherboard (Form Factor)
    if (pcCase && motherboard) {
        const moboFF = motherboard.specs?.form_factor;
        const caseFF = pcCase.specs?.form_factor;

        if (moboFF && caseFF && moboFF !== "Unknown" && caseFF !== "Unknown") {
            // E-ATX needs E-ATX case
            if (moboFF === "E-ATX" && caseFF !== "E-ATX") {
                issues.push(`Case Size Mismatch: E-ATX Motherboard requires an E-ATX/Full Tower case.`);
            }
            // ATX needs ATX or larger
            else if (moboFF === "ATX" && (caseFF === "Micro-ATX" || caseFF === "ITX")) {
                issues.push(`Case Size Mismatch: ATX Motherboard will not fit in a ${caseFF} case.`);
            }
            // Micro-ATX needs Micro-ATX or larger (ITX is smaller)
            else if (moboFF === "Micro-ATX" && caseFF === "ITX") {
                issues.push(`Case Size Mismatch: Micro-ATX Motherboard will not fit in an ITX case.`);
            }
        }
    }

    // 5. CPU Cooler <-> CPU (Socket)
    if (cpu && cooler) {
        const cpuSocket = cpu.specs?.socket;
        const coolerSockets = cooler.specs?.socket_support; // Array

        if (cpuSocket && coolerSockets && cpuSocket !== "Unknown" && Array.isArray(coolerSockets)) {
            // If array is populated and doesn't include the socket
            if (coolerSockets.length > 0 && !coolerSockets.includes(cpuSocket)) {
                // Check if it supports Threadripper specifically
                if (cpuSocket === "TR4" && !coolerSockets.includes("TR4")) {
                    issues.push(`Cooler Incompatible: Selected cooler does not support the TR4 (Threadripper) socket.`);
                }
                // General check, but be lenient as parser is heuristic
                else if (!coolerSockets.some(s => cpuSocket.includes(s) || s.includes(cpuSocket))) {
                    // warnings.push(`Cooler Compatibility Note: Ensure cooler supports ${cpuSocket}.`);
                }
            }
        }
    }

    // 6. Storage <-> Motherboard (Basic Interface Check)
    if (storage && motherboard) {
        const moboRam = motherboard.specs?.ram_type; // Heuristic for age
        if (moboRam === "DDR3" && (storage.specs?.interface === "M.2" || storage.name.includes("NVMe"))) {
            issues.push(`Legacy Board Warning: ${motherboard.name} (DDR3 era) likely does not support M.2 NVMe drives.`);
        }
    }

    return { issues, warnings };
};
