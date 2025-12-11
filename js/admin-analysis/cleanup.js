// js/admin-analysis/cleanup.js
import * as State from './state.js';

export function cleanupMap() {
    if (!State.map) return;
    
    // Remove all markers
    State.markers.forEach(marker => {
        if (State.map.hasLayer(marker)) {
            State.map.removeLayer(marker);
        }
    });
    State.markers = [];
    
    // Remove site marker
    if (State.siteMarker && State.map.hasLayer(State.siteMarker)) {
        State.map.removeLayer(State.siteMarker);
    }
    State.siteMarker = null;
    
    // Remove search area
    if (State.searchAreaShape && State.map.hasLayer(State.searchAreaShape)) {
        State.map.removeLayer(State.searchAreaShape);
    }
    State.searchAreaShape = null;
    
    // Remove highway layers
    State.highwayLayers.forEach(layer => {
        if (State.map.hasLayer(layer)) {
            State.map.removeLayer(layer);
        }
    });
    State.highwayLayers = [];
    
    // Clear highway data
    State.highwayData.forEach(hw => {
        if (hw.marker && State.map.hasLayer(hw.marker)) {
            State.map.removeLayer(hw.marker);
        }
    });
    State.highwayData = [];
    
    console.log('✓ Map cleaned up');
}

export function clearAnalysisData() {
    State.allPOIsDataByCategory = {};
    State.selectedSiteLocation = null;
    State.analysisParams = null;
    State.rectangleBounds = null;
    
    // Clear DOM elements
    const poiSections = document.getElementById('poiSections');
    if (poiSections) poiSections.innerHTML = '';
    
    const highwaySection = document.getElementById('highwaySection');
    if (highwaySection) highwaySection.innerHTML = '';
    
    const locationInfo = document.getElementById('locationInfo');
    if (locationInfo) locationInfo.innerHTML = 'Loading...';
    
    const searchArea = document.getElementById('searchArea');
    if (searchArea) searchArea.innerHTML = 'Loading...';
    
    console.log('✓ Analysis data cleared');
}

export function resetAppState() {
    cleanupMap();
    clearAnalysisData();
    
    // Reset button states
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) exportBtn.disabled = true;
    
    // Hide loading overlay
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) loadingOverlay.style.display = 'none';
    
    console.log('✓ Application state reset');
}

// Setup global cleanup functions
export function setupGlobalCleanup() {
    window.cleanupAdminMap = cleanupMap;
    window.clearAdminAnalysis = clearAnalysisData;
    window.resetAdminApp = resetAppState;
    
    console.log('✓ Admin cleanup functions ready');
    console.log('Available global functions:');
    console.log('  - cleanupAdminMap() - Remove all map elements');
    console.log('  - clearAdminAnalysis() - Clear analysis data');
    console.log('  - resetAdminApp() - Full application reset');
}

// Add cleanup on page unload
window.addEventListener('beforeunload', () => {
    console.log('Cleaning up admin analysis...');
    resetAppState();
});