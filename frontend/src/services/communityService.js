import { API_BASE_URL } from '../utils/apiClient';

/**
 * Service for Community Hub API interactions
 */

export const getCommunityBuilds = async (limit = 20, offset = 0) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/community/builds?limit=${limit}&offset=${offset}`);
        if (!response.ok) throw new Error('Failed to fetch community builds');
        return await response.json();
    } catch (e) {
        console.error(e);
        return [];
    }
};

export const getCommunityBuildById = async (id) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/community/builds/${id}`);
        if (!response.ok) throw new Error('Failed to fetch build details');
        return await response.json();
    } catch (e) {
        console.error(e);
        throw e;
    }
};

export const toggleLike = async (id, token) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/community/builds/${id}/like`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) throw new Error('Failed to toggle like');
        return await response.json();
    } catch (e) {
        console.error(e);
        throw e;
    }
};

export const addComment = async (id, commentText, isAnonymous, token) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/community/builds/${id}/comment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ comment_text: commentText, is_anonymous: isAnonymous })
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Failed to add comment');
        }
        return await response.json();
    } catch (e) {
        throw e;
    }
};

export const publishProject = async (id, buildStory, imageUrl, authorName, displayName, token) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/community/publish/${id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                build_story: buildStory,
                image_url: imageUrl,
                author_name: authorName,
                display_name: displayName
            })
        });
        if (!response.ok) throw new Error('Failed to publish project');
        return await response.json();
    } catch (e) {
        console.error(e);
        throw e;
    }
};

export const updateCommunityBuild = async (id, name, authorName, buildStory, token) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/community/builds/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name: name,
                author_name: authorName,
                build_story: buildStory
            })
        });
        if (!response.ok) throw new Error('Failed to update community build');
        return await response.json();
    } catch (e) {
        console.error(e);
        throw e;
    }
};

export const getUserCommunityBuilds = async (token) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/community/my-builds`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) throw new Error('Failed to fetch user community builds');
        return await response.json();
    } catch (e) {
        console.error(e);
        return [];
    }
};
