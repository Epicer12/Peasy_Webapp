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
