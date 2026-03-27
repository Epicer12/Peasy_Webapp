// [ComponentService] Unified API Version
// Centralized service for PC parts, project management, and hardware analysis.

export const searchComponents = async (query, type) => {
    try {
        console.log(`[ComponentService] searchComponents calling API for ${type}, Query: ${query}`);
        
        const response = await fetch(`/api/components/search?type=${encodeURIComponent(type)}&q=${encodeURIComponent(query || "")}`);
        if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`);
        }
        const data = await response.json();
        
        // Standardize formatting for frontend consumption
        return data.map(item => ({
            ...item,
            id: item.id || Math.random().toString(36).substr(2, 9),
            name: item.name || "Unknown Component",
            price: item.price || 0,
            image_url: item.image_url || null,
            image: item.image_url || null, // fallback for legacy code
            specs: item.specs || {}
        }));
    } catch (error) {
        console.error("Component Search Error:", error);
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
        console.error("Generate Builds Error:", e);
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
        console.error("Generate Summary Error:", e);
        return { summaries: [] };
    }
};

const BUILD_IMAGES = [
    "https://images.unsplash.com/photo-1587202376775-67b146200632?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1591405351990-4726e331f141?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1547082299-de196ea013d6?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1555680202-c86f0e12f086?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1624701928517-44c8ac49d93c?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1587302912306-cf1ed9c33146?q=80&w=800&auto=format&fit=crop"
];

export const saveProject = async (projectData) => {
    try {
        // Assign a random build image if none exists
        if (!projectData.image_url) {
            const randomIndex = Math.floor(Math.random() * BUILD_IMAGES.length);
            projectData.image_url = BUILD_IMAGES[randomIndex];
        }

        const response = await fetch('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(projectData)
        });
        if (!response.ok) throw new Error('Failed to save project');
        return await response.json();
    } catch (e) {
        console.error("Save Project Error:", e);
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
        console.error("Fetch Projects Error:", e);
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
        console.error("Fetch Project by ID Error:", e);
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
        console.error("Update Project Error:", e);
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
        console.error("Analyze Bottleneck Error:", e);
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
        console.error("Delete Project Error:", e);
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
        console.error("Delete Warranty Error:", e);
        throw e;
    }
};
