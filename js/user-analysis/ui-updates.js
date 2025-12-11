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

    // ✅ ADD GLOBAL SELECT ALL / UNSELECT ALL BUTTONS
    const globalControls = document.createElement('div');
    globalControls.className = 'global-controls-section';
    globalControls.innerHTML = `
        <h4 style="color: #8B0000; margin-bottom: 1rem; font-size: 1rem;">
            <i class="fas fa-layer-group"></i> All Categories & Highways
        </h4>
        <div class="global-button-row">
            <button class="global-control-btn select-all-btn" onclick="selectAllItemsGlobal()">
                <i class="fas fa-check-double"></i> Select All
            </button>
            <button class="global-control-btn unselect-all-btn" onclick="unselectAllItemsGlobal()">
                <i class="fas fa-times-circle"></i> Unselect All
            </button>
        </div>
    `;
    poiSectionsContainer.appendChild(globalControls);

    // ✅ CREATE POI CATEGORIES WITH SELECT ALL / UNSELECT ALL PER CATEGORY
    for (const [category, pois] of Object.entries(allPOIsDataByCategory)) {
        if (pois.length === 0) continue;

        const section = document.createElement('div');
        section.className = 'poi-category-section';
        
        // Category header with buttons
        const headerHtml = `
            <div class="category-header-wrapper">
                <h4>${categoryIcons[category]} ${category.replace(/_/g, ' ').toUpperCase()}</h4>
                <div class="category-button-row">
                    <button class="category-control-btn select-btn" onclick="selectAllInCategory('${category}')">
                        <i class="fas fa-check"></i> Select All
                    </button>
                    <button class="category-control-btn unselect-btn" onclick="unselectAllInCategory('${category}')">
                        <i class="fas fa-times"></i> Unselect All
                    </button>
                </div>
            </div>
        `;
        section.innerHTML = headerHtml;

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

    // ✅ HIGHWAY SECTION WITH SELECT ALL / UNSELECT ALL
    if (highwayData.length > 0) {
        const highwaySection = document.createElement('div');
        highwaySection.className = 'highway-section';
        
        const headerHtml = `
            <div class="category-header-wrapper">
                <h4>🛣️ Main Routes & Highways</h4>
                <div class="category-button-row">
                    <button class="category-control-btn select-btn" onclick="selectAllHighways()">
                        <i class="fas fa-check"></i> Select All
                    </button>
                    <button class="category-control-btn unselect-btn" onclick="unselectAllHighways()">
                        <i class="fas fa-times"></i> Unselect All
                    </button>
                </div>
            </div>
        `;
        highwaySection.innerHTML = headerHtml;

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
 * Toggle POI visibility - NO RECLUSTERING
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

    // Only restore saved clusters (no recalculation)
    calculateAllPixelCoordinates();
    createPOIClusters(); // This will now restore from saved assignments
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
 * Select all items in a specific category
 */
export function selectAllInCategory(category) {
    if (!allPOIsDataByCategory[category]) return;
    
    const pois = allPOIsDataByCategory[category];
    pois.forEach((poi, idx) => {
        selectedPOIs[category][idx] = true;
        
        // Update checkbox
        const checkbox = document.querySelector(`input[type="checkbox"][data-category="${category}"][data-index="${idx}"]`);
        if (checkbox) checkbox.checked = true;
    });
    
    calculateAllPixelCoordinates();
    createPOIClusters();
    restoreDraggedPositions();
    redrawStaticMapSmooth();
    
    showNotification(`All items in ${category.replace(/_/g, ' ')} selected`, 'success');
}

/**
 * Unselect all items in a specific category
 */
export function unselectAllInCategory(category) {
    if (!allPOIsDataByCategory[category]) return;
    
    const pois = allPOIsDataByCategory[category];
    pois.forEach((poi, idx) => {
        selectedPOIs[category][idx] = false;
        
        // Update checkbox
        const checkbox = document.querySelector(`input[type="checkbox"][data-category="${category}"][data-index="${idx}"]`);
        if (checkbox) checkbox.checked = false;
        
        // Clear dragged position
        const key = `${category}-${poi.id}`;
        clearPermanentDraggedPosition('poi', key);
    });
    
    calculateAllPixelCoordinates();
    createPOIClusters();
    restoreDraggedPositions();
    redrawStaticMapSmooth();
    
    showNotification(`All items in ${category.replace(/_/g, ' ')} unselected`, 'success');
}

/**
 * Select all highways
 */
export function selectAllHighways() {
    highwayData.forEach((hw, idx) => {
        selectedHighways[idx] = true;
        
        // Update checkbox
        const checkbox = document.querySelector(`#highwaySection input[type="checkbox"][data-index="${idx}"]`);
        if (checkbox) checkbox.checked = true;
    });
    
    restoreDraggedPositions();
    redrawStaticMapSmooth();
    
    showNotification('All highways selected', 'success');
}

/**
 * Unselect all highways
 */
export function unselectAllHighways() {
    highwayData.forEach((hw, idx) => {
        selectedHighways[idx] = false;
        
        // Update checkbox
        const checkbox = document.querySelector(`#highwaySection input[type="checkbox"][data-index="${idx}"]`);
        if (checkbox) checkbox.checked = false;
        
        // Clear dragged position
        clearPermanentDraggedPosition('highway', idx);
    });
    
    restoreDraggedPositions();
    redrawStaticMapSmooth();
    
    showNotification('All highways unselected', 'success');
}

/**
 * Select ALL items globally (all categories + highways)
 */
export function selectAllItemsGlobal() {
    // Select all POI categories
    for (const [category, pois] of Object.entries(allPOIsDataByCategory)) {
        pois.forEach((poi, idx) => {
            selectedPOIs[category][idx] = true;
            
            const checkbox = document.querySelector(`input[type="checkbox"][data-category="${category}"][data-index="${idx}"]`);
            if (checkbox) checkbox.checked = true;
        });
    }
    
    // Select all highways
    highwayData.forEach((hw, idx) => {
        selectedHighways[idx] = true;
        
        const checkbox = document.querySelector(`#highwaySection input[type="checkbox"][data-index="${idx}"]`);
        if (checkbox) checkbox.checked = true;
    });
    
    calculateAllPixelCoordinates();
    createPOIClusters();
    restoreDraggedPositions();
    redrawStaticMapSmooth();
    
    showNotification('All categories and highways selected', 'success');
}

/**
 * Unselect ALL items globally (all categories + highways)
 */
export function unselectAllItemsGlobal() {
    // Unselect all POI categories
    for (const [category, pois] of Object.entries(allPOIsDataByCategory)) {
        pois.forEach((poi, idx) => {
            selectedPOIs[category][idx] = false;
            
            const checkbox = document.querySelector(`input[type="checkbox"][data-category="${category}"][data-index="${idx}"]`);
            if (checkbox) checkbox.checked = false;
            
            const key = `${category}-${poi.id}`;
            clearPermanentDraggedPosition('poi', key);
        });
    }
    
    // Unselect all highways
    highwayData.forEach((hw, idx) => {
        selectedHighways[idx] = false;
        
        const checkbox = document.querySelector(`#highwaySection input[type="checkbox"][data-index="${idx}"]`);
        if (checkbox) checkbox.checked = false;
        
        clearPermanentDraggedPosition('highway', idx);
    });
    
    calculateAllPixelCoordinates();
    createPOIClusters();
    restoreDraggedPositions();
    redrawStaticMapSmooth();
    
    showNotification('All categories and highways unselected', 'success');
}


export function setupGlobalToggleFunctions() {
    window.togglePOI = togglePOI;
    window.toggleHighway = toggleHighway;
    window.selectAllInCategory = selectAllInCategory;
    window.unselectAllInCategory = unselectAllInCategory;
    window.selectAllHighways = selectAllHighways;
    window.unselectAllHighways = unselectAllHighways;
    window.selectAllItemsGlobal = selectAllItemsGlobal;
    window.unselectAllItemsGlobal = unselectAllItemsGlobal;
}