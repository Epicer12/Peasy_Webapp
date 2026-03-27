export const getMarketplaceOffers = async () => {
    try {
        const response = await fetch('/api/marketplace/offers');
        if (!response.ok) throw new Error('Failed to fetch marketplace offers');
        return await response.json();
    } catch (e) {
        console.error(e);
        return [];
    }
};
