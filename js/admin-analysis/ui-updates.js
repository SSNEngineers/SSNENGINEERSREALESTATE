// js/admin-analysis/ui-updates.js
import * as State from './state.js';
import { categoryIcons } from './constants.js';

export function setupGlobalFunctions() {
    // Set global functions for toggle visibility
    window.togglePOIVisibility = togglePOIVisibility;
    window.toggleCategoryPOIs = toggleCategoryPOIs;
    window.toggleHighwayVisibility = toggleHighwayVisibility;
}

export function updateInfoPanel() {
    // Update location info
    document.getElementById('locationInfo').innerHTML = `
        <strong>Address:</strong> ${State.selectedSiteLocation.address}<br>
        <strong>Coordinates:</strong> ${State.selectedSiteLocation.lat.toFixed(6)}, ${State.selectedSiteLocation.lng.toFixed(6)}
    `;
    
    // Update search area
    document.getElementById('searchArea').innerHTML = `
        <strong>Radius:</strong> ${State.analysisParams.radius} miles
    `;
    
    // Set up UI events
    setupGlobalFunctions();
}

function toggleCategoryPOIs(category, checked) {
    const pois = State.allPOIsDataByCategory[category] || [];
    pois.forEach(p => {
        p.visible = checked;
        if (p.marker) {
            if (checked) {
                p.marker.addTo(State.map);
            } else {
                State.map.removeLayer(p.marker);
            }
        }
    });
    
    // Update checkboxes
    const checkboxes = document.querySelectorAll(`#poi-list-${category} input[type="checkbox"]`);
    checkboxes.forEach(cb => cb.checked = checked);
}

function togglePOIVisibility(category, index, checked) {
    const poi = State.allPOIsDataByCategory[category][index];
    poi.visible = checked;
    
    if (poi.marker) {
        if (checked) {
            poi.marker.addTo(State.map);
        } else {
            State.map.removeLayer(poi.marker);
        }
    }
}

// Make these functions available globally
window.toggleCategoryPOIs = toggleCategoryPOIs;
window.togglePOIVisibility = togglePOIVisibility;