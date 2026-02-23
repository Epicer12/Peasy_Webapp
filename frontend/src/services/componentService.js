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
        'winsoft_price', 'laptops_price', 'price'
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
        const name = item.component_name || item.processor_name || item.name || "Unknown Component";
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

        // Correct mappings based on Database Inspection
        const tableMap = {
            "cpu": "processors_prices",
            "motherboard": "motherboards_prices", // Added for clarity
            "mobo": "motherboards_prices",
            "ram": "memory_prices",
            "gpu": "graphic_cards_prices",
            "ssd": "storage_prices",
            "hdd": "storage_prices",
            "psu": "power_supply_units_prices",
            "case": "case_prices",
            "cooler": "cooling_prices",
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
            // Most _prices tables use 'component_name'
            queryBuilder = queryBuilder.ilike('component_name', `%${query}%`);
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
