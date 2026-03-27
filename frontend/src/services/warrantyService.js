import { auth } from '../firebase';
import { API_BASE_URL } from '../utils/apiClient';

export const getWarranties = async () => {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) return [];

        const token = await currentUser.getIdToken();
        const response = await fetch(`${API_BASE_URL}/api/warranty/list`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch warranties');
        }

        const data = await response.json();
        return data.map(item => {
            const info = item.extraction_data?.warranty_info || item.extraction_data || {};
            const stats = calculateWarrantyStats(info.purchase_date, info.warranty_period);
            return {
                id: item.id,
                name: info.product_name || 'Unknown Product',
                ...stats
            };
        });
    } catch (error) {
        console.error('Error fetching warranties:', error);
        return [];
    }
};

export const calculateWarrantyStats = (purchaseDateStr, periodStr) => {
    if (!purchaseDateStr || !periodStr || purchaseDateStr === "Not Detected" || periodStr === "Not Detected" || purchaseDateStr.trim() === "") {
        return { daysLeft: 0, totalDays: 365, percentage: 0, status: '#1a1a1a' };
    }

    try {
        const cleanDateStr = purchaseDateStr.replace(/[^\d\-\/]/g, ' ').trim().split(' ')[0];
        const purchaseDate = new Date(cleanDateStr);

        if (isNaN(purchaseDate.getTime())) {
            return { daysLeft: 0, totalDays: 365, percentage: 0, status: '#1a1a1a' };
        }

        let totalMonths = 0;
        const periodLower = periodStr.toLowerCase().replace(/[\s\-_]/g, '');
        const numMatch = periodLower.match(/\d+/);

        if (numMatch) {
            const num = parseInt(numMatch[0]);
            if (periodLower.includes('year') || periodLower.includes('yr')) {
                totalMonths = num * 12;
            } else if (periodLower.includes('month') || periodLower.includes('mo')) {
                totalMonths = num;
            } else if (num > 0) {
                totalMonths = num;
            }
        }

        if (totalMonths <= 0) {
            return { daysLeft: 0, totalDays: 365, percentage: 0, status: '#1a1a1a' };
        }

        const expiryDate = new Date(purchaseDate);
        expiryDate.setMonth(expiryDate.getMonth() + totalMonths);

        const today = new Date();
        const totalDurationTime = expiryDate.getTime() - purchaseDate.getTime();
        const remainingDurationTime = expiryDate.getTime() - today.getTime();

        const percentage = Math.max(0, Math.min(100, (remainingDurationTime / totalDurationTime) * 100));
        const daysLeft = Math.max(0, Math.floor(remainingDurationTime / (1000 * 60 * 60 * 24)));
        const totalDays = Math.floor(totalDurationTime / (1000 * 60 * 60 * 24));

        let status = '#00ff88'; // Green
        if (daysLeft <= 0) status = '#ff4444'; // Red
        else if (percentage < 20) status = '#ff4444'; // Red
        else if (percentage < 50) status = '#ffbb00'; // Amber/Yellow

        return {
            percentage: isNaN(percentage) ? 0 : percentage,
            daysLeft: isNaN(daysLeft) ? 0 : daysLeft,
            totalDays: isNaN(totalDays) ? 365 : totalDays,
            status
        };
    } catch (e) {
        return { daysLeft: 0, totalDays: 365, percentage: 0, status: '#1a1a1a' };
    }
};
