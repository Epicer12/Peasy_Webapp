import { API_BASE_URL } from '../utils/apiClient';

export const getMarketplaceOffers = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/marketplace/offers`);
        if (!response.ok) throw new Error('Failed to fetch marketplace offers');
        return await response.json();
    } catch (e) {
        console.error(e);
        return [];
    }
};
