// ==================== UI PANEL UPDATES ====================

import { 
    selectedSiteLocation, 
    analysisParams, 
    allPOIsDataByCategory,
    highwayData,
    selectedPOIs,
    selectedHighways,
    rectangleBounds,
    clearPermanentDraggedPosition
} from './state.js';
import { categoryIcons } from './constants.js';
import { getHighwayColor, categorizeRoute, showNotification } from './utilities.js';
import { calculateAllPixelCoordinates } from './coordinates.js';
import { createPOIClusters } from './clustering.js';
import { restoreDraggedPositions } from './drag-functionality.js';
import { redrawStaticMapSmooth } from './main-render.js';
import { isDragMode } from './state.js';

/**
 * Update all info panels with current data
 */
export function updateInfoPanels() {
    document.getElementById('locationInfo').innerHTML = `
        <strong>Address:</strong> ${selectedSiteLocation.address}<br>
        <strong>Coordinates:</strong> ${selectedSiteLocation.lat.toFixed(6)}, ${selectedSiteLocation.lng.toFixed(6)}
    `;

    document.getElementById('searchArea').innerHTML = `
        <strong>Radius:</strong> ${analysisParams.radius} miles
    `;

    const poiSectionsContainer = document.getElementById('poiSections');
    poiSectionsContainer.innerHTML = '';

    for (const [category, pois] of Object.entries(allPOIsDataByCategory)) {
        if (pois.length === 0) continue;

        const section = document.createElement('div');
        section.className = 'poi-category-section';
        section.innerHTML = `<h4>${categoryIcons[category]} ${category.replace(/_/g, ' ').toUpperCase()}</h4>`;

        const list = document.createElement('ul');
        list.className = 'poi-list';

        pois.forEach((poi, idx) => {
            const categoryLabel = (category === 'popularLocations') ? 
                ' <span style="background: #666; color: white; padding: 2px 6px; border-radius: 3px; font-size: 0.7rem; margin-left: 5px;">(Landmark)</span>' : '';

            const li = document.createElement('li');
            li.innerHTML = `
                <input type="checkbox" 
                       data-category="${category}" 
                       data-index="${idx}"
                       ${selectedPOIs[category][idx] ? 'checked' : ''} 
                       onchange="togglePOI('${category}', ${idx}, this.checked)">
                ${poi.logoUrl ? `<img class="poi-logo" src="${poi.logoUrl}" alt="${poi.name}">` : '⭐'}
                ${idx + 1}. ${poi.name}${categoryLabel}: ${poi.distanceMiles.toFixed(2)} mi
            `;
            list.appendChild(li);
        });

        section.appendChild(list);
        poiSectionsContainer.appendChild(section);
    }

    if (highwayData.length > 0) {
        const highwaySection = document.createElement('div');
        highwaySection.className = 'highway-section';
        highwaySection.innerHTML = `<h4>🛣️ Main Routes & Highways</h4>`;

        const list = document.createElement('ul');
        list.className = 'poi-list';

        highwayData.forEach((hw, idx) => {
            const color = getHighwayColor(hw.type);
            const li = document.createElement('li');
            li.innerHTML = `
                <input type="checkbox" 
                       data-index="${idx}"
                       ${selectedHighways[idx] ? 'checked' : ''} 
                       onchange="toggleHighway(${idx}, this.checked)">
                <span class="route-badge" style="background: ${color};">${hw.ref || hw.name.substring(0, 3).toUpperCase()}</span>
                ${hw.name} (${categorizeRoute(hw.type)}): ${hw.distanceMiles.toFixed(2)} mi
            `;
            list.appendChild(li);
        });

        highwaySection.appendChild(list);
        document.getElementById('highwaySection').appendChild(highwaySection);
    }
}

/**
 * Toggle POI visibility
 */
export function togglePOI(category, index, checked) {
    // Don't allow toggling during drag mode
    if (isDragMode) {
        showNotification('Please disable drag mode first', 'warning');
        // Revert checkbox state
        setTimeout(() => {
            const checkbox = document.querySelector(`#poiSections input[type="checkbox"][data-category="${category}"][data-index="${index}"]`);
            if (checkbox) checkbox.checked = !checked;
        }, 0);
        return;
    }

    selectedPOIs[category][index] = checked;

    const poi = allPOIsDataByCategory[category][index];
    
    if (!checked) {
        // Remove from permanent storage if unchecked
        const key = `${category}-${poi.id}`;
        clearPermanentDraggedPosition('poi', key);
    }

    // Recalculate clusters but restore positions after
    calculateAllPixelCoordinates();
    createPOIClusters();
    restoreDraggedPositions();
    redrawStaticMapSmooth();
}

/**
 * Toggle highway visibility
 */
export function toggleHighway(index, checked) {
    // Don't allow toggling during drag mode
    if (isDragMode) {
        showNotification('Please disable drag mode first', 'warning');
        // Revert checkbox state
        setTimeout(() => {
            const checkbox = document.querySelector(`#highwaySection input[type="checkbox"][data-index="${index}"]`);
            if (checkbox) checkbox.checked = !checked;
        }, 0);
        return;
    }

    selectedHighways[index] = checked;

    if (!checked) {
        clearPermanentDraggedPosition('highway', index);
    }

    restoreDraggedPositions();
    redrawStaticMapSmooth();
}

/**
 * Make toggle functions globally available
 */
export function setupGlobalToggleFunctions() {
    window.togglePOI = togglePOI;
    window.toggleHighway = toggleHighway;
}