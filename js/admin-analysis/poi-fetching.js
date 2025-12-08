// js/admin-analysis/poi-fetching.js
import * as State from './state.js';
import { osmTags, FAMOUS_LOCATIONS, LOGODEV_API_KEY } from './constants.js';
import * as Utils from './utilities.js';

export async function fetchAllPOIs() {
    const categories = Object.keys(State.analysisParams.pois);
    const container = document.getElementById('poiSections');
    container.innerHTML = '';
    
    // PRIORITY 1: Always fetch popularLocations first if requested
    if (State.analysisParams.pois.popularLocations) {
        console.log('Fetching PRIORITY: Popular Locations...');
        const section = createPOISection('popularLocations');
        container.appendChild(section);
        let pois = await fetchPOIsForCategory('popularLocations');
        pois = await prioritizeFamousLocations(pois, 'popularLocations');
        pois = pois.slice(0, 15); // Maximum 15 for popular locations
        State.allPOIsDataByCategory['popularLocations'] = pois;
        renderPOIsInSection('popularLocations', pois);
        await Utils.delay(2000);
    }
    
    // PRIORITY 2: Fetch other categories
    for (let i = 0; i < categories.length; i++) {
        const cat = categories[i];
        if (cat === 'popularLocations') continue; // Already processed
        console.log(`Fetching ${cat}... (${i + 1}/${categories.length})`);
        const section = createPOISection(cat);
        container.appendChild(section);
        let pois = await fetchPOIsForCategory(cat);
        pois = await prioritizeFamousLocations(pois, cat);
        pois = pois.slice(0, State.analysisParams.pois[cat]);
        State.allPOIsDataByCategory[cat] = pois;
        renderPOIsInSection(cat, pois);
        if (i < categories.length - 1) {
            await Utils.delay(2000);
        }
    }
    
    console.log('✓ All POIs fetched and rendered');
}

async function fetchPOIsForCategory(category) {
    const tag = osmTags[category];
    const radiusMeters = State.analysisParams.radius * 1609.34;
    let query;
    
    if (category === 'popularLocations') {
        query = `[out:json][timeout:25];(
            node["tourism"="attraction"](around:${radiusMeters},${State.selectedSiteLocation.lat},${State.selectedSiteLocation.lng});
            way["tourism"="attraction"](around:${radiusMeters},${State.selectedSiteLocation.lat},${State.selectedSiteLocation.lng});
            node["amenity"="community_centre"](around:${radiusMeters},${State.selectedSiteLocation.lat},${State.selectedSiteLocation.lng});
            way["amenity"="community_centre"](around:${radiusMeters},${State.selectedSiteLocation.lat},${State.selectedSiteLocation.lng});
            node["leisure"="park"]["name"](around:${radiusMeters},${State.selectedSiteLocation.lat},${State.selectedSiteLocation.lng});
            way["leisure"="park"]["name"](around:${radiusMeters},${State.selectedSiteLocation.lat},${State.selectedSiteLocation.lng});
            node["shop"="department_store"](around:${radiusMeters},${State.selectedSiteLocation.lat},${State.selectedSiteLocation.lng});
            way["shop"="department_store"](around:${radiusMeters},${State.selectedSiteLocation.lat},${State.selectedSiteLocation.lng});
        );out center;`;
    } else if (category === 'school') {
        // Include both schools and universities
        query = `[out:json][timeout:25];(
            node["amenity"="school"](around:${radiusMeters},${State.selectedSiteLocation.lat},${State.selectedSiteLocation.lng});
            way["amenity"="school"](around:${radiusMeters},${State.selectedSiteLocation.lat},${State.selectedSiteLocation.lng});
            node["amenity"="university"](around:${radiusMeters},${State.selectedSiteLocation.lat},${State.selectedSiteLocation.lng});
            way["amenity"="university"](around:${radiusMeters},${State.selectedSiteLocation.lat},${State.selectedSiteLocation.lng});
        );out center;`;
    } else {
        const [key, value] = tag.split('=');
        query = `[out:json][timeout:25];(
            node["${key}"="${value}"](around:${radiusMeters},${State.selectedSiteLocation.lat},${State.selectedSiteLocation.lng});
            way["${key}"="${value}"](around:${radiusMeters},${State.selectedSiteLocation.lat},${State.selectedSiteLocation.lng});
            relation["${key}"="${value}"](around:${radiusMeters},${State.selectedSiteLocation.lat},${State.selectedSiteLocation.lng});
        );out center;`;
    }
    
    try {
        const response = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            body: query
        });
        const data = await response.json();
        let pois = processPOIData(data.elements, category);
        return pois;
    } catch (error) {
        console.error(`Error fetching ${category}:`, error);
        return [];
    }
}

async function prioritizeFamousLocations(pois, category) {
    if (!FAMOUS_LOCATIONS[category]) return pois;
    const famousNames = FAMOUS_LOCATIONS[category].map(name => name.toLowerCase());
    const famousPOIs = [];
    const regularPOIs = [];
    
    // Separate famous and regular POIs
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
    
    console.log(`${category}: Found ${famousPOIs.length} famous, ${regularPOIs.length} regular`);
    
    // Try to get logos for famous locations first
    await enrichPOIsWithLogos(famousPOIs);
    
    // Filter famous POIs that have logos
    const famousWithLogos = famousPOIs.filter(poi => poi.logoUrl);
    const famousWithoutLogos = famousPOIs.filter(poi => !poi.logoUrl);
    
    // Get logos for regular POIs
    await enrichPOIsWithLogos(regularPOIs);
    const regularWithLogos = regularPOIs.filter(poi => poi.logoUrl);
    
    // PRIORITY ORDER:
    // 1. Famous locations WITH logos
    // 2. Regular locations WITH logos (if famous don't have logos)
    // 3. Famous locations WITHOUT logos (as fallback)
    if (famousWithLogos.length > 0) {
        console.log(`Prioritizing ${famousWithLogos.length} famous locations with logos`);
        return [...famousWithLogos, ...regularWithLogos, ...famousWithoutLogos];
    } else {
        console.log(`No famous locations with logos found, using regular locations`);
        return [...regularWithLogos, ...famousWithoutLogos];
    }
}

function processPOIData(elements, category) {
    return elements.map(el => {
        const pos = el.lat ? { lat: el.lat, lng: el.lon } : { lat: el.center.lat, lng: el.center.lon };
        const tags = el.tags || {};
        const name = tags.name || category.replace(/_/g, ' ').toUpperCase();
        const distance = Utils.calculateDistance(State.selectedSiteLocation.lat, State.selectedSiteLocation.lng, pos.lat, pos.lng);
        const distanceMiles = distance / 1.60934;
        return {
            id: el.id,
            name,
            lat: pos.lat,
            lng: pos.lng,
            website: tags.website || tags['contact:website'],
            category,
            distanceMiles,
            visible: true,
            logoUrl: null,
            coordinates: `${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}`,
            address: Utils.formatAddress(tags),
            postalCode: tags['addr:postcode'] || 'N/A'
        };
    }).sort((a, b) => a.distanceMiles - b.distanceMiles);
}

async function enrichPOIsWithLogos(pois) {
    const promises = pois.map(poi => enrichPOIWithLogo(poi));
    await Promise.all(promises);
}

async function enrichPOIWithLogo(poi) {
    if (!poi.website) return false;
    
    try {
        let domain = poi.website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
        const response = await fetch(`https://img.logo.dev/${domain}?token=${LOGODEV_API_KEY}&size=200`);
        if (response.ok) {
            const blob = await response.blob();
            if (blob.size < 500) return false;
            poi.logoUrl = response.url;
            return true;
        }
    } catch (error) {
        console.log('Logo fetch failed for:', poi.website);
    }
    return false;
}

function createPOISection(category) {
    const section = document.createElement('div');
    section.className = 'poi-category-section';
    section.id = `poi-section-${category}`;
    section.innerHTML = `
        <h4>${categoryIcons[category] || '📍'} ${category.replace(/_/g, ' ').toUpperCase()}</h4>
        <div class="select-controls">
            <button class="mini-btn" onclick="toggleCategoryPOIs('${category}', true)">Select All</button>
            <button class="mini-btn" onclick="toggleCategoryPOIs('${category}', false)">Deselect All</button>
        </div>
        <ul class="poi-list" id="poi-list-${category}">
            <li class="empty-message">Loading...</li>
        </ul>
    `;
    return section;
}

function renderPOIsInSection(category, pois) {
    const list = document.getElementById(`poi-list-${category}`);
    list.innerHTML = '';
    
    if (pois.length === 0) {
        list.innerHTML = '<li class="empty-message">No POIs with logos found in this area.</li>';
        return;
    }
    
    pois.forEach((poi, index) => {
        const li = document.createElement('li');
        const famousBadge = poi.isFamous ? '<span style="background: gold; color: black; padding: 2px 6px; border-radius: 3px; font-size: 0.75rem; font-weight: bold; margin-left: 5px;">FAMOUS</span>' : '';
        li.innerHTML = `
            <input type="checkbox" checked onchange="togglePOIVisibility('${category}', ${index}, this.checked)">
            ${poi.logoUrl ? `<img class="poi-logo" src="${poi.logoUrl}" alt="${poi.name}">` : ''}
            <span>${index + 1}. ${poi.name}${famousBadge}: ${poi.distanceMiles.toFixed(2)} mi</span>
        `;
        list.appendChild(li);
        addPOIMarker(poi, category);
    });
}

const categoryIcons = {
    popularLocations: "⭐",
    school: "🏫",
    hospital: "🏥",
    fast_food: "🍔",
    supermarket: "🛒",
    shopping_mall: "🏬",
    coffee_shop: "☕"
};

function addPOIMarker(poi, category) {
    const icon = L.divIcon({
        className: 'poi-marker-icon',
        html: poi.logoUrl 
            ? `<img src="${poi.logoUrl}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.4); background: white;">`
            : `<div style="background: #FFD700; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.4);">
                <span style="font-size: 24px;">${categoryIcons[category] || '★'}</span>
            </div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 40]
    });
    
    const marker = L.marker([poi.lat, poi.lng], {
        icon: icon,
        draggable: true
    }).addTo(State.map);
    
    // Update position on drag
    marker.on('dragend', function (e) {
        const newPos = e.target.getLatLng();
        poi.lat = newPos.lat;
        poi.lng = newPos.lng;
        poi.coordinates = `${newPos.lat.toFixed(6)}, ${newPos.lng.toFixed(6)}`;
        console.log(`${poi.name} moved to: ${poi.coordinates}`);
    });
    
    marker.bindPopup(`
        <b>${poi.name}</b><br>
        <strong>Distance:</strong> ${poi.distanceMiles.toFixed(2)} miles<br>
        <strong>Category:</strong> ${category.replace(/_/g, ' ')}<br>
        ${poi.address !== 'N/A' ? '<strong>Address:</strong> ' + poi.address + '<br>' : ''}
        ${poi.website ? '<a href="' + poi.website + '" target="_blank">Website</a><br>' : ''}
        <em style="color: #666; font-size: 0.85em;">Drag to reposition</em>
    `);
    
    poi.marker = marker;
    State.markers.push(marker);
}