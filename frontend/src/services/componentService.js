import { supabase } from '../supabaseClient';

console.log("[ComponentService] Module Loaded - Direct Supabase Version");

const cleanPrice = (priceStr) => {
    if (!priceStr) return null;
    if (typeof priceStr === 'number') return priceStr;
    const clean = priceStr.toString().replace(/[^0-9.]/g, '');
    return parseFloat(clean) || null;
};

const getBestPrice = (item) => {
    const priceFields = [
        'computerzone_price', 'nanotek_price', 'pcbuilders_price',
        'winsoft_price', 'laptops_price', 'price',
        'computerzone_price_lkr', 'nanotek_price_lkr', 'pc_builders_price_lkr',
        'winsoft_price_lkr', 'cz_price',
        'price_computerzone', 'price_nanotek', 'price_pcbuilders', 'price_winsoft'
    ];
    let minPrice = Infinity;
    let found = false;
    for (const field of priceFields) {
        const val = cleanPrice(item[field]);
        if (val && val > 0 && val < minPrice) {
            minPrice = val;
            found = true;
        }
    }
    return found ? minPrice : null;
};

const parseSpecs = (name, type) => {
    const specs = {};
    const n = name.toUpperCase();

    if (type === 'cpu') {
        if (n.includes('INTEL')) specs.brand = 'Intel';
        else if (n.includes('AMD')) specs.brand = 'AMD';

        // Socket Inference
        if (specs.brand === 'Intel') {
            if (n.includes('ULTRA') || n.includes('1851')) specs.socket = "LGA1851"; // Core Ultra 15th+
            else if (n.match(/1[234]\d{3}/)) specs.socket = "LGA1700"; // 12th, 13th, 14th Gen
            else if (n.match(/1[01]\d{3}/)) specs.socket = "LGA1200"; // 10th, 11th Gen
        } else if (specs.brand === 'AMD') {
            if (n.includes('AM5') || n.match(/RYZEN.(7|9|5|3).(7|8|9)\d{3}/)) specs.socket = "AM5"; // Ryzen 7000/8000/9000
            else if (n.includes('AM4') || n.match(/RYZEN.(7|9|5|3).(1|2|3|4|5)\d{3}/)) specs.socket = "AM4"; // Ryzen 1000-5000
        }
    }

    if (type === 'mobo' || type === 'motherboard') {
        const nUpper = n.toUpperCase();

        // Socket Inference via Chipset
        // AMD AM5 (600 & 800 series)
        if (nUpper.match(/X870|X670|B650|B850|B840|A620/)) specs.socket = "AM5";
        // AMD AM4 (300, 400, 500 series)
        else if (nUpper.match(/X570|B550|A520|X470|B450|B350|A320/)) specs.socket = "AM4";
        // Intel LGA1851 (800 series)
        else if (nUpper.match(/Z890|B860|H810/)) specs.socket = "LGA1851";
        // Intel LGA1700 (600 & 700 series)
        else if (nUpper.match(/Z790|B760|H770|Z690|B660|H610/)) specs.socket = "LGA1700";
        // Intel LGA1200 (400 & 500 series)
        else if (nUpper.match(/Z590|B560|H510|Z490|H410/)) specs.socket = "LGA1200";

        // Explicit overrides
        if (nUpper.includes('LGA1700')) specs.socket = "LGA1700";
        if (nUpper.includes('LGA1851')) specs.socket = "LGA1851";
        if (nUpper.includes('AM5')) specs.socket = "AM5";
        if (nUpper.includes('AM4')) specs.socket = "AM4";

        // RAM Type
        if (nUpper.includes('DDR5')) specs.ram_type = "DDR5";
        else if (nUpper.includes('DDR4')) specs.ram_type = "DDR4";
        else {
            // Inference based on chipset/socket if explicit DDR label missing
            if (specs.socket === "AM5" || specs.socket === "LGA1851") specs.ram_type = "DDR5";
            // LGA1700/LGA1200 can be mixed, safe to leave undefined or assume DDR4 for older? 
            // Leaving undefined means strict check might fail or pass depending on logic.
            // Better to assume DDR5 for Z790? No, many are D4.
        }

        // Form Factor
        if (nUpper.includes('ITX')) specs.form_factor = "ITX";
        else if (nUpper.includes('MICRO') || nUpper.includes('MATX') || nUpper.includes('M-ATX')) specs.form_factor = "Micro-ATX";
        else if (nUpper.includes('E-ATX') || nUpper.includes('EATX')) specs.form_factor = "E-ATX";
        else specs.form_factor = "ATX";
    }

    if (type === 'ram' || type === 'memory') {
        if (n.includes('DDR5')) specs.type = "DDR5";
        else if (n.includes('DDR4')) specs.type = "DDR4";
    }

    if (type === 'psu' || type === 'power_supply') {
        const wattage = n.match(/(\d{3,4})\s?W/);
        if (wattage) specs.wattage = wattage[1];
    }

    if (type === 'case') {
        if (n.includes('ITX')) specs.form_factor = "ITX";
        else if (n.includes('MICRO') || n.includes('MATX')) specs.form_factor = "Micro-ATX";
        else specs.form_factor = "ATX"; // Most cases are ATX
    }

    return specs;
};

const transformData = (items, type) => {
    return items.map(item => {
        const name = item.component_name || item.processor_name || item.name || item.model || item.model_name || item.final_model_name || "Unknown Component";
        return {
            ...item,
            id: item.id || item.component_name || Math.random().toString(36).substr(2, 9),
            name: name,
            price: getBestPrice(item),
            image: item.image || null,
            specs: { ...item, ...parseSpecs(name, type) } // Merge raw + parsed
        };
    });
};

export const searchComponents = async (query, type) => {
    try {
        console.log(`[ComponentService] searchComponents called for ${type}, Query: ${query}`);

        // Maps component type to its Supabase table
        const tableMap = {
            // --- _final tables (authoritative dataset used by the build AI) ---
            "cpu": "cpu_final",
            "gpu": "gpu_final",
            "ram": "ram_final",
            "ssd": "ssd_final",
            "hdd": "hdd_final",
            "psu": "psu_final",
            "case": "cases_final",
            "motherboard": "motherboard_final",
            "mobo": "motherboard_final",
            "cooler": "cpu_coolers_final",

            // --- _prices tables (used for the component browser / shop pages) ---
            "software": "os_software_prices",
            "os": "os_software_prices",
            "mice": "peripherals_prices",
            "headsets": "peripherals_prices",
            "keyboards": "peripherals_prices",
            "consoles": "console_handheld_gaming_prices",
            "console": "console_handheld_gaming_prices",
            "monitors": "monitors_prices",
            "all_in_one": "all_in_one_systems_prices",
            "desktop": "desktop_pcs_prices",
            "system": "desktop_systems_prices",
            "expansion": "expansion_cards_networking_prices",
            "connector": "cable_connector_prices",
            "connectors": "cable_connector_prices",
            "converter": "cable_converter_prices",
            "converters": "cable_converter_prices",
            "party": "party_box_pricing",
        };

        // Name column differs per table — _final tables don't use 'component_name'
        const searchColumnMap = {
            "cpu_final": "model",
            "gpu_final": "name",
            "ram_final": "name",
            "ssd": "ssd_final",
            "ssd_final": "final_model_name",
            "hdd_final": "name",
            "psu_final": "final_model_name",
            "cases_final": "name",
            "motherboard_final": "name",
            "cpu_coolers_final": "model_name",
        };

        // Special Multi-Table Fetch for Speakers
        if (type === 'speakers') {
            let peripheralsQuery = supabase
                .from('peripherals_prices')
                .select('*')
                .ilike('component_name', '%speaker%'); // Filter for speakers

            let partyBoxQuery = supabase
                .from('party_box_pricing')
                .select('*');

            if (query && query.trim()) {
                peripheralsQuery = peripheralsQuery.ilike('component_name', `%${query}%`);
                partyBoxQuery = partyBoxQuery.ilike('component_name', `%${query}%`);
            }

            const [peripheralsRes, partyBoxRes] = await Promise.all([
                peripheralsQuery.limit(50),
                partyBoxQuery.limit(50)
            ]);

            const pData = peripheralsRes.data || [];
            const pbData = partyBoxRes.data || [];

            console.log(`[Speakers] Peripherals: ${pData.length}, PartyBox: ${pbData.length}`);

            const transformedP = transformData(pData, 'speakers');
            const transformedPB = transformData(pbData, 'speakers');

            return [...transformedPB, ...transformedP]; // PartyBox first? or mixed?
        }

        const normalizedType = type?.toLowerCase() || '';
        const tableName = tableMap[normalizedType];

        if (!tableName) {
            console.warn(`[ComponentService] No table mapping found for type: '${type}'. Skipping fetch.`);
            return [];
        }

        let queryBuilder = supabase
            .from(tableName)
            .select('*');

        // Use the correct name column for this table (defaults to 'component_name' for _prices tables)
        const nameCol = searchColumnMap[tableName] || 'component_name';

        if (query && query.trim()) {
            queryBuilder = queryBuilder.ilike(nameCol, `%${query}%`);
        }

        // Strict Filtering for Peripherals (Keyboards vs Mice vs Others)
        if (type === 'keyboards') {
            queryBuilder = queryBuilder.ilike('component_name', '%keyboard%');
        } else if (type === 'mice') {
            // "mouse" covers "Gaming Mouse", "Wireless Mouse"
            queryBuilder = queryBuilder.ilike('component_name', '%mouse%');
        } else if (type === 'headsets') {
            // Headsets/Headphones from peripherals table
            queryBuilder = queryBuilder.or('component_name.ilike.%headset%,component_name.ilike.%headphone%');
            // Exclude Speakers
            queryBuilder = queryBuilder.not('component_name', 'ilike', '%speaker%');
        } else if (type === 'consoles') {
            // Strict filter for Consoles
            queryBuilder = queryBuilder.or('component_name.ilike.%console%,component_name.ilike.%handheld%,component_name.ilike.%ps5%,component_name.ilike.%playstation%,component_name.ilike.%xbox%,component_name.ilike.%switch%,component_name.ilike.%nintendo%');

            // Exclude Accessories to ensure only actual Consoles/Systems appear
            queryBuilder = queryBuilder.not('component_name', 'ilike', '%controller%');
            queryBuilder = queryBuilder.not('component_name', 'ilike', '%stand%');
            queryBuilder = queryBuilder.not('component_name', 'ilike', '%station%');
            queryBuilder = queryBuilder.not('component_name', 'ilike', '%cooling%');
            queryBuilder = queryBuilder.not('component_name', 'ilike', '%remote%');
            // User reported "wireless headset" appeared. Excluding audio gear.
            queryBuilder = queryBuilder.not('component_name', 'ilike', '%headset%');
            queryBuilder = queryBuilder.not('component_name', 'ilike', '%headphone%');
        } else if (type === 'monitors') {
            // Just in case monitors table has other stuff? Unlikely but safe.
        }

        const { data, error } = await queryBuilder.limit(50);

        if (error) {
            console.error(`Supabase error fetching ${type} from ${tableName}:`, error);
            return [];
        }

        console.log(`[ComponentService] Fetched raw data for ${type} from ${tableName}. Length:`, data?.length);

        if (data && data.length > 0) {
            console.log(`[ComponentService] Raw Item 0:`, data[0]);
            const transformed = transformData(data, type);
            console.log(`[ComponentService] Transformed Item 0:`, transformed[0]);
            return transformed;
        }

        return [];
    } catch (error) {
        console.error("Error searching components:", error);
        return [];
    }
};

export const submitBuildRequest = async (payload) => {
    console.log("Submitting build request (mock):", payload);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return { success: true };
};

export const generateBuilds = async (payload) => {
    console.log("Generating builds for payload:", payload);
    try {
        const response = await fetch('/api/generate-builds', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ summary: payload })
        });
        if (!response.ok) {
            throw new Error('Failed to generate builds');
        }
        return await response.json();
    } catch (e) {
        console.error(e);
        return { builds: [], warning: "" };
    }
};

export const generateBuildSummary = async (builds) => {
    try {
        const response = await fetch('/api/generate-summary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ builds })
        });
        if (!response.ok) throw new Error('Failed to generate summary');
        return await response.json();
    } catch (e) {
        console.error(e);
        return { summaries: [] };
    }
};

export const saveProject = async (projectData) => {
    try {
        const response = await fetch('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(projectData)
        });
        if (!response.ok) throw new Error('Failed to save project');
        return await response.json();
    } catch (e) {
        console.error(e);
        throw e;
    }
};

export const getProjects = async (email) => {
    try {
        const url = email ? `/api/projects?user_email=${email}` : '/api/projects';
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch projects');
        return await response.json();
    } catch (e) {
        console.error(e);
        return [];
    }
};

export const getProjectById = async (id, email) => {
    try {
        const url = email ? `/api/projects/${id}?user_email=${email}` : `/api/projects/${id}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch project');
        return await response.json();
    } catch (e) {
        console.error(e);
        throw e;
    }
};

export const updateProject = async (id, projectData) => {
    try {
        const response = await fetch(`/api/projects/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(projectData)
        });
        if (!response.ok) throw new Error('Failed to update project');
        return await response.json();
    } catch (e) {
        console.error(e);
        throw e;
    }
};
export const analyzeBottleneck = async (components) => {
    try {
        const response = await fetch('/api/analyze/bottleneck', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(components)
        });
        if (!response.ok) throw new Error('Failed to analyze bottleneck');
        return await response.json();
    } catch (e) {
        console.error(e);
        throw e;
    }
};

export const deleteProject = async (id, email) => {
    try {
        const response = await fetch(`/api/projects/${id}?user_email=${email}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete project');
        return await response.json();
    } catch (e) {
        console.error(e);
        throw e;
    }
};

export const deleteWarranty = async (id, token) => {
    try {
        const response = await fetch(`/api/warranty/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to delete warranty');
        return await response.json();
    } catch (e) {
        console.error(e);
        throw e;
    }
};
