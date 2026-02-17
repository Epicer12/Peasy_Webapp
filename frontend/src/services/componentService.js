import { supabase } from '../supabaseClient';

// Cache found table names to avoid probing every time
const tableCache = {};
const dataCache = {}; // Cache full datasets to avoid re-fetching 100k rows

export const searchComponents = async (query, type) => {
    if (!type) return [];

    const lowerType = type.toLowerCase();

    // Define candidate table names for each type - EXHAUSTIVE LIST
    let candidates = ['components', 'parts'];

    if (lowerType.includes('cpu') || lowerType.includes('processor')) candidates = ['cpu', 'cpus', 'processor', 'processors', 'central_processing_unit'];
    else if (lowerType.includes('gpu') || lowerType.includes('graphics') || lowerType.includes('video')) candidates = ['gpu', 'gpus', 'graphic_card', 'graphics_cards', 'video_card', 'video_cards', 'vga'];
    else if (lowerType.includes('ram') || lowerType.includes('memory')) candidates = ['ram', 'rams', 'memory', 'memories', 'stick', 'sticks'];
    else if (lowerType.includes('motherboard') || lowerType.includes('mobo') || lowerType.includes('mainboard')) candidates = ['motherboard', 'motherboards', 'mobo', 'mobos', 'mainboard', 'mainboards'];
    else if (lowerType.includes('psu') || lowerType.includes('power')) candidates = ['power_supplies', 'psu', 'psus', 'power_supply', 'pwr', 'power'];
    else if (lowerType.includes('case') || lowerType.includes('chassis') || lowerType.includes('tower')) candidates = ['cases', 'case', 'pc_case', 'pc_cases', 'computer_case', 'chassis', 'tower', 'cabinet'];
    else if (lowerType.includes('storage') || lowerType.includes('drive') || lowerType.includes('disk') || lowerType.includes('ssd') || lowerType.includes('hdd')) candidates = ['storage_devices', 'storage', 'storages', 'disk', 'disks', 'drive', 'drives', 'ssd', 'ssds', 'hdd', 'hdds', 'hard_drive', 'hard_drives'];

    // Check cache first
    let targetTable = tableCache[lowerType];

    // Force known mappings provided by user
    const KNOWN_MAPPINGS = {
        'psu': 'power_supplies',
        'case': 'cases',
        'storage': 'storage_devices'
    };

    if (KNOWN_MAPPINGS[lowerType]) {
        targetTable = KNOWN_MAPPINGS[lowerType];
        console.log(`[Service] Using forced mapping for '${type}' -> '${targetTable}'`);
    }

    if (!targetTable) {
        // Find the first working table by probing
        for (const t of candidates) {
            // Just probing existence
            const { error } = await supabase.from(t).select('id').limit(1);
            if (!error) {
                targetTable = t;
                tableCache[lowerType] = t; // Cache it
                console.log(`[Service] Resolved '${type}' to table '${t}'`);
                break;
            }
        }
    }

    if (!targetTable) {
        console.warn(`[Service] Could not find any working table for type '${type}'. Tried:`, candidates);
        // Last ditch effort: try the type name itself lowercased
        targetTable = lowerType.replace(/\s+/g, '_');
        console.log(`[Service] Trying fallback table '${targetTable}'`);
    }

    // Check Data Cache
    let allData = dataCache[targetTable];

    if (!allData) {
        // EMERGENCY DEBUG MODE: Client-side filtering
        console.log(`[Service] Fetching all data (limit 100000) from '${targetTable}'...`);

        const { data, error } = await supabase
            .from(targetTable)
            .select('*')
            .limit(100000); // Fetch everything as requested by user

        if (error) {
            console.error(`[Service] Error searching ${targetTable}:`, error);
            return [];
        }

        if (!data || data.length === 0) {
            console.warn(`[Service] Table '${targetTable}' returned NO data.`);
            return [];
        }

        allData = data;
        dataCache[targetTable] = allData; // Store in cache
        console.log(`[Service] Cached ${allData.length} items for '${targetTable}'`);
    } else {
        console.log(`[Service] Using cached data for '${targetTable}' (${allData.length} items)`);
    }

    // Filter in Javascript
    const lowerQuery = query ? query.toLowerCase() : "";

    let filtered = allData;

    if (lowerQuery) {
        filtered = allData.filter(item => {
            return Object.values(item).some(val =>
                String(val).toLowerCase().includes(lowerQuery)
            );
        });
    }

    // Limit results for UI
    return filtered.slice(0, 50);
};
// Submit build request to database
export const submitBuildRequest = async (buildData) => {
    try {
        const { data, error } = await supabase
            .from('build_requests')
            .insert([buildData])
            .select();

        if (error) {
            console.error("[Service] Error submitting build request:", error);
            return { success: false, error };
        }

        return { success: true, data };
    } catch (err) {
        console.error("[Service] Unexpected error submitting build request:", err);
        return { success: false, error: err };
    }
};
