// js/admin-analysis/utilities.js
export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in km
}

export function formatAddress(tags) {
    const parts = [
        tags['addr:housenumber'],
        tags['addr:street'],
        tags['addr:city'],
        tags['addr:state'],
        tags['addr:postcode']
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'N/A';
}
// ✅ ADD THIS MISSING FUNCTION
export function categorizeRoute(type) {
    switch (type) {
        case 'motorway': return 'Highway';
        case 'trunk': return 'Expressway';
        case 'primary': return 'Main Road';
        case 'tertiary': return 'Local Road';
        default: return type.charAt(0).toUpperCase() + type.slice(1);
    }
}