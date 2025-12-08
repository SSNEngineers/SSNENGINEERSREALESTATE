// ==================== API FETCHING AND DATA PROCESSING ====================

import { 
    osmTags, 
    FAMOUS_LOCATIONS, 
    LOGODEV_API_KEY 
} from './constants.js';
import { 
    selectedSiteLocation, 
    analysisParams,
    allPOIsDataByCategory,
    setAllPOIsDataByCategory,
    selectedPOIs,
    setSelectedPOIs,
    highwayData,
    setHighwayData,
    selectedHighways,
    setSelectedHighways
} from './state.js';
import { calculateDistance, delay, formatAddress } from './utilities.js';

/**
 * Fetch with retry logic for failed requests
 */
export async function fetchWithRetry(url, options, retries = 3, delayMs = 3000) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Response is not JSON');
            }

            return await response.json();
        } catch (error) {
            console.warn(`Attempt ${i + 1} failed:`, error.message);

            if (i === retries - 1) {
                throw error;
            }

            await new Promise(resolve => setTimeout(resolve, delayMs * (i + 1)));
        }
    }
}

/**
 * Fetch POIs for a specific category from Overpass API
 */
export async function fetchPOIsForCategory(category) {
    const tag = osmTags[category];
    const radiusMeters = analysisParams.radius * 1609.34;

    let query;
    if (category === 'popularLocations') {
        query = `[out:json][timeout:15];(
            node["tourism"="attraction"](around:${radiusMeters},${selectedSiteLocation.lat},${selectedSiteLocation.lng});
            way["tourism"="attraction"](around:${radiusMeters},${selectedSiteLocation.lat},${selectedSiteLocation.lng});
            node["leisure"="park"]["name"](around:${radiusMeters},${selectedSiteLocation.lat},${selectedSiteLocation.lng});
            way["leisure"="park"]["name"](around:${radiusMeters},${selectedSiteLocation.lat},${selectedSiteLocation.lng});
            node["shop"="department_store"](around:${radiusMeters},${selectedSiteLocation.lat},${selectedSiteLocation.lng});
            way["shop"="department_store"](around:${radiusMeters},${selectedSiteLocation.lat},${selectedSiteLocation.lng});
        );out center;`;
    } else if (category === 'school') {
        query = `[out:json][timeout:15];(
            node["amenity"="school"](around:${radiusMeters},${selectedSiteLocation.lat},${selectedSiteLocation.lng});
            way["amenity"="school"](around:${radiusMeters},${selectedSiteLocation.lat},${selectedSiteLocation.lng});
            node["amenity"="university"](around:${radiusMeters},${selectedSiteLocation.lat},${selectedSiteLocation.lng});
            way["amenity"="university"](around:${radiusMeters},${selectedSiteLocation.lat},${selectedSiteLocation.lng});
        );out center;`;
    } else {
        const [key, value] = tag.split('=');
        query = `[out:json][timeout:15];(
            node["${key}"="${value}"](around:${radiusMeters},${selectedSiteLocation.lat},${selectedSiteLocation.lng});
            way["${key}"="${value}"](around:${radiusMeters},${selectedSiteLocation.lat},${selectedSiteLocation.lng});
        );out center;`;
    }

    try {
        const data = await fetchWithRetry('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            body: query,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        console.log(`✓ ${category}: received ${data.elements ? data.elements.length : 0} results`);
        let processed = processPOIData(data.elements || [], category);
        processed = limitDuplicatePOIs(processed, 3);
        return processed;
    } catch (error) {
        console.error(`✗ Failed to fetch ${category} after retries:`, error.message);
        return [];
    }
}

/**
 * Process raw POI data from Overpass API
 */
export function processPOIData(elements, category) {
    return elements.map(el => {
        const pos = el.lat ? { lat: el.lat, lng: el.lon } : { lat: el.center.lat, lng: el.center.lon };
        const tags = el.tags || {};
        const name = tags.name || category.replace(/_/g, ' ').toUpperCase();
        const distance = calculateDistance(selectedSiteLocation.lat, selectedSiteLocation.lng, pos.lat, pos.lng);
        const distanceMiles = distance / 1.60934;

        return {
            id: el.id,
            name,
            lat: pos.lat,
            lng: pos.lng,
            website: tags.website || tags['contact:website'],
            category,
            distanceMiles,
            logoUrl: null,
            coordinates: `${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}`,
            address: formatAddress(tags),
            postalCode: tags['addr:postcode'] || 'N/A',
            pixelX: 0,
            pixelY: 0,
            logoSize: 40
        };
    }).sort((a, b) => a.distanceMiles - b.distanceMiles);
}

/**
 * Limit duplicate POIs with same name
 */
export function limitDuplicatePOIs(pois, maxDuplicates = 3) {
    const nameCounts = {};
    const filteredPOIs = [];

    for (const poi of pois) {
        const baseName = poi.name
            .replace(/\s+(#\d+|Store|Location|Branch)/gi, '')
            .trim()
            .toLowerCase();

        if (!nameCounts[baseName]) {
            nameCounts[baseName] = 0;
        }

        if (nameCounts[baseName] < maxDuplicates) {
            filteredPOIs.push(poi);
            nameCounts[baseName]++;
        } else {
            console.log(`Skipping duplicate: ${poi.name} (already have ${maxDuplicates})`);
        }
    }

    console.log(`Filtered ${pois.length} POIs down to ${filteredPOIs.length} (max ${maxDuplicates} per name)`);
    return filteredPOIs;
}

/**
 * Fetch logo from Logo.dev API
 */
export async function fetchLogoFromLogoDev(website) {
    if (!website) return null;
    try {
        let domain = website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
        const response = await fetch(`https://img.logo.dev/${domain}?token=${LOGODEV_API_KEY}&size=200`);
        if (response.ok) {
            const blob = await response.blob();
            if (blob.size < 500) return null;
            return response.url;
        }
    } catch (error) {
        console.log('Logo fetch failed');
    }
    return null;
}

/**
 * Enrich single POI with logo
 */
export async function enrichPOIWithLogo(poi) {
    if (poi.website) {
        const logoUrl = await fetchLogoFromLogoDev(poi.website);
        if (logoUrl) {
            poi.logoUrl = logoUrl;
            return true;
        }
    }
    return false;
}

/**
 * Enrich multiple POIs with logos
 */
export async function enrichPOIsWithLogos(pois) {
    const promises = pois.map(poi => enrichPOIWithLogo(poi));
    await Promise.all(promises);
}

/**
 * Prioritize famous locations in POI list
 */
export async function prioritizeFamousLocations(pois, category) {
    if (!FAMOUS_LOCATIONS[category]) return pois;

    const famousNames = FAMOUS_LOCATIONS[category].map(name => name.toLowerCase());
    const famousPOIs = [];
    const regularPOIs = [];

    for (const poi of pois) {
        const poiName = poi.name.toLowerCase();
        const isFamous = famousNames.some(famousName =>
            poiName.includes(famousName.toLowerCase()) ||
            famousName.toLowerCase().includes(poiName)
        );

        if (isFamous) {
            famousPOIs.push({ ...poi, isFamous: true });
        } else {
            regularPOIs.push({ ...poi, isFamous: false });
        }
    }

    await enrichPOIsWithLogos(famousPOIs);
    await enrichPOIsWithLogos(regularPOIs);

    const famousWithLogos = famousPOIs.filter(poi => poi.logoUrl);
    const regularWithLogos = regularPOIs.filter(poi => poi.logoUrl);
    const famousWithoutLogos = famousPOIs.filter(poi => !poi.logoUrl);

    if (famousWithLogos.length > 0) {
        return [...famousWithLogos, ...regularWithLogos, ...famousWithoutLogos];
    } else {
        return [...regularWithLogos, ...famousWithoutLogos];
    }
}

/**
 * Filter to only famous locations with logos
 */
export async function filterOnlyFamousLocations(pois, category) {
    if (!FAMOUS_LOCATIONS[category]) return pois;

    const famousNames = FAMOUS_LOCATIONS[category].map(name => name.toLowerCase());

    console.log(`Attempting to fetch logos for ${pois.length} ${category} POIs...`);
    await enrichPOIsWithLogos(pois);

    const famousWithLogos = [];
    const famousWithoutLogos = [];
    const regularWithLogos = [];

    pois.forEach(poi => {
        const poiName = poi.name.toLowerCase();
        const isFamous = famousNames.some(famousName =>
            poiName.includes(famousName.toLowerCase()) ||
            famousName.toLowerCase().includes(poiName)
        );

        if (isFamous) {
            if (poi.logoUrl) {
                famousWithLogos.push({ ...poi, isFamous: true });
            } else {
                famousWithoutLogos.push({ ...poi, isFamous: true });
            }
        } else if (poi.logoUrl) {
            regularWithLogos.push({ ...poi, isFamous: false });
        }
    });

    console.log(`${category} breakdown: ${famousWithLogos.length} famous with logos, ${regularWithLogos.length} regular with logos, ${famousWithoutLogos.length} famous without logos`);

    return [...famousWithLogos, ...regularWithLogos, ...famousWithoutLogos];
}

/**
 * Fetch all POIs for all selected categories
 */
export async function fetchAllPOIs() {
    const categories = Object.keys(analysisParams.pois);

    for (let i = 0; i < categories.length; i++) {
        const cat = categories[i];
        console.log(`\nFetching category ${i + 1}/${categories.length}: ${cat}`);

        let pois = await fetchPOIsForCategory(cat);

        if (cat === 'popularLocations') {
            pois = await filterOnlyFamousLocations(pois, cat);
        } else {
            pois = await prioritizeFamousLocations(pois, cat);
        }

        pois = pois.slice(0, analysisParams.pois[cat]);
        allPOIsDataByCategory[cat] = pois;

        if (!selectedPOIs[cat]) selectedPOIs[cat] = {};
        pois.forEach((poi, idx) => {
            selectedPOIs[cat][idx] = true;
        });

        if (i < categories.length - 1) {
            console.log('Waiting 4 seconds before next request...');
            await delay(4000);
        }
    }

    console.log('\n✓ All POI categories fetched');
    console.log('Summary:', Object.entries(allPOIsDataByCategory).map(
        ([cat, pois]) => `${cat}: ${pois.length}`
    ).join(', '));
}