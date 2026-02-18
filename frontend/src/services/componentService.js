import { supabase } from '../../supabaseClient';

// Service to interact with Supabase directly for component search
// Bypasses backend API as per user request

export const searchComponents = async (query, type) => {
    // Map frontend 'type' to Supabase table config
    const tableConfig = {
        "cpu": { table: "cpu", searchCol: "processor_name" },
        "gpu": { table: "gpu", searchCol: "component_name" },
        "ram": { table: "ram", searchCol: "component_name" },
        "storage": { table: "storage_devices", searchCol: "component_name" },
        "psu": { table: "power_supplies", searchCol: "component_name" },
        "case": { table: "cases", searchCol: "component_name" }
    };

    const config = tableConfig[type?.toLowerCase()];

    if (!config) {
        console.warn(`Unknown component type: ${type}`);
        return [];
    }

    try {
        let dbQuery = supabase
            .from(config.table)
            .select('*');
        //.limit(50); // Limit removed to fetch ALL components

        // If query exists and is not empty, filter by the specific name column
        if (query && query.trim().length > 0) {
            dbQuery = dbQuery.ilike(config.searchCol, `%${query}%`);
        }

        const { data, error } = await dbQuery;

        if (error) {
            console.error(`Supabase search error on table '${config.table}':`, error);
            return [];
        }

        if (!data) return [];

        // Normalize output so frontend always sees a 'name' property
        return data.map(item => ({
            ...item,
            name: item[config.searchCol] || item.name || "Unknown Product"
        }));

    } catch (error) {
        console.error("Unexpected error searching components:", error);
        return [];
    }
};

export const submitBuildRequest = async (payload) => {
    console.log("Submitting build request (mock):", payload);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return { success: true };
};
