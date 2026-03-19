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
        'price_computerzone', 'price_nanotek', 'price_pcbuilders', 'price_winsoft', 'estimated_price',
        'pc_builders_price', 'estimated_lkr_price', 'estimated_price_lkr', 'cz_price',
        'computerzone_price_lkr', 'nanotek_price_lkr', 'pc_builders_price_lkr', 'winsoft_price_lkr'
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

const parseSpecs = (item, type) => {
    const specs = {};
    const name = (item.name || item.final_model_name || item.model_name || '');
    const n = name.toUpperCase();

    if (type === 'cpu') {
        // Brand
        specs.brand = item.brand || (n.includes('INTEL') ? 'Intel' : n.includes('AMD') ? 'AMD' : null);
        // Socket — use the native cpu_socket column directly from the DB
        specs.socket = item.cpu_socket || null;
        // Memory type the CPU supports (DDR3/DDR4/DDR5)
        specs.mem_type = item.sys_mem_type || null;
        // TDP in watts
        specs.tdp = item.default_tdp ? parseInt(item.default_tdp) : null;
    }

    if (type === 'mobo' || type === 'motherboard') {
        // Socket — use native socket column directly
        specs.socket = item.socket || null;
        // Form factor from DB; normalise casing
        const ff = (item.form_factor || '').toLowerCase();
        if (ff.includes('itx')) specs.form_factor = 'ITX';
        else if (ff.includes('micro') || ff.includes('matx') || ff.includes('m-atx')) specs.form_factor = 'Micro-ATX';
        else if (ff.includes('e-atx') || ff.includes('eatx')) specs.form_factor = 'E-ATX';
        else specs.form_factor = 'ATX';
        // RAM type supported by mobo
        specs.ram_type = item.memory_type || null;
    }

    if (type === 'ram') {
        // RAM type (DDR4/DDR5) from the DB 'type' column
        specs.type = item.type || null;
        specs.speed_mhz = item.speed_mhz || null;
    }

    if (type === 'gpu') {
        // Physical length in mm so we can check against case clearance
        specs.length_mm = item.length ? parseInt(item.length) : null;
        specs.tdp = item.tdp ? parseInt(item.tdp) : null;
        specs.manufacturer = item.manufacturer || null;
    }

    if (type === 'psu') {
        // Wattage from native DB column
        const wattVal = item.wattage ? parseInt(item.wattage) : null;
        specs.wattage = (wattVal && wattVal > 0) ? wattVal : null;
        // If wattage is 0 or unknown, try parsing from name string
        if (!specs.wattage) {
            const wMatch = n.match(/(\d{3,4})\s?W/);
            if (wMatch) specs.wattage = parseInt(wMatch[1]);
        }
        specs.form_factor = item.form_factor || 'ATX';
    }

    if (type === 'case') {
        // Motherboard form factor support from DB column
        const ms = (item.motherboard_support || '').toLowerCase();
        if (ms.includes('itx')) specs.mobo_support = 'ITX';
        else if (ms.includes('micro') || ms.includes('matx')) specs.mobo_support = 'Micro-ATX';
        else if (ms.includes('e-atx') || ms.includes('eatx')) specs.mobo_support = 'E-ATX';
        else specs.mobo_support = 'ATX';
        // GPU clearance
        const gpuClearanceStr = (item.supported_gpu_length_mm || '').replace(/[^\d]/g, '');
        specs.gpu_clearance_mm = gpuClearanceStr ? parseInt(gpuClearanceStr) : null;
        // CPU cooler clearance
        const coolerClearanceStr = (item.supported_cpu_cooler_height_mm || '').replace(/[^\d]/g, '');
        specs.cooler_clearance_mm = coolerClearanceStr ? parseInt(coolerClearanceStr) : null;
        // PSU form factor the case accepts
        specs.psu_form_factor = item.psu_form_factor || 'ATX';
    }

    if (type === 'cooler') {
        // Supported sockets is a comma-separated string e.g. "LGA1155, LGA1150, AM4"
        specs.supported_sockets = item.supported_sockets
            ? item.supported_sockets.split(',').map(s => s.trim().toUpperCase())
            : [];
        // TDP the cooler can handle e.g "65W"
        const tdpStr = (item.tdp || '').replace(/[^\d]/g, '');
        specs.tdp_rating = tdpStr ? parseInt(tdpStr) : null;
        // Physical height
        const heightStr = (item.height_size || '').replace(/[^\d]/g, '');
        specs.height_mm = heightStr ? parseInt(heightStr) : null;
    }

    return specs;
};

const transformData = (items, type) => {
    return items.map(item => {
        const name = item.component_name || item.processor_name || item.name || item.final_model_name || item.model_name ||
            (item.brand && item.line && item.model ? `${item.brand} ${item.line} ${item.model}` : "Unknown Component");
        const specs = parseSpecs(item, type);
        return {
            ...item,
            id: item.id || item.component_name || Math.random().toString(36).substr(2, 9),
            name: name,
            price: getBestPrice(item),
            image_url: item.image_url || null,
            image: item.image || null,
            specs: specs
        };
    });
};

export const searchComponents = async (query, type) => {
    try {
        console.log(`[ComponentService] searchComponents called for ${type}, Query: ${query}`);

        // Correct mappings based on Database Inspection
        const tableMap = {
            "cpu": "cpu_final",
            "motherboard": "motherboard_final", // Added for clarity
            "mobo": "motherboard_final",
            "ram": "ram_final",
            "gpu": "gpu_final",
            "ssd": "ssd_final",
            "hdd": "hdd_final",
            "psu": "psu_final",
            "case": "cases_final",
            "cooler": "cpu_coolers_final",
            "case_fans": "case_fans_final", // Mapped newly provided table
            "software": "os_software_prices",
            "os": "os_software_prices", // Keep for backward compat
            "mice": "peripherals_prices",
            "headsets": "peripherals_prices",
            "consoles": "console_handheld_gaming_prices",
            "monitors": "monitors_prices",
            "keyboards": "peripherals_prices",

            // New ones - keeping mapping if they exist
            "all_in_one": "all_in_one_systems_prices",
            "desktop": "desktop_pcs_prices",
            "system": "desktop_systems_prices",
            "expansion": "expansion_cards_networking_prices",
            "connector": "cable_connector_prices",
            "converter": "cable_converter_prices",
            "console": "console_handheld_gaming_prices",
            "party": "party_box_pricing",
            "connectors": "cable_connector_prices",
            "converters": "cable_converter_prices"
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

        const tableName = tableMap[type?.toLowerCase()] || type;

        let queryBuilder = supabase
            .from(tableName)
            .select('*');

        if (query && query.trim()) {
            if (tableName === 'cpu_final') {
                queryBuilder = queryBuilder.or(`brand.ilike.%${query}%,line.ilike.%${query}%,model.ilike.%${query}%`);
            } else {
                let searchColumn = 'component_name';
                if (['gpu_final', 'cases_final', 'motherboard_final', 'ram_final'].includes(tableName)) searchColumn = 'name';
                else if (['ssd_final', 'hdd_final', 'psu_final'].includes(tableName)) searchColumn = 'final_model_name';
                else if (tableName === 'cpu_coolers_final') searchColumn = 'model_name';

                queryBuilder = queryBuilder.ilike(searchColumn, `%${query}%`);
            }
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
