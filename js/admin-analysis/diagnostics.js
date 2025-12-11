// js/admin-analysis/diagnostics.js
import * as State from './state.js';

export function runDiagnosticCheck() {
    console.log('========== DIAGNOSTIC CHECK ==========');
    console.log('Map:', State.map ? 'Initialized' : 'NOT initialized');
    console.log('Site Location:', State.selectedSiteLocation);
    console.log('Rectangle Bounds:', State.rectangleBounds);
    console.log('Analysis Params:', State.analysisParams);
    console.log('POIs by Category:');
    Object.entries(State.allPOIsDataByCategory).forEach(([cat, pois]) => {
        console.log(`  ${cat}: ${pois.length} items`);
        if (pois.length > 0) {
            const first = pois[0];
            console.log(`    Sample:`, {
                name: first.name,
                coords: [first.lat, first.lng],
                distance: `${first.distanceMiles.toFixed(2)} miles`
            });
        }
    });
    console.log('Highways:', State.highwayData.length);
    if (State.highwayData.length > 0) {
        const first = State.highwayData[0];
        console.log(`  Sample:`, {
            name: first.name,
            type: first.type,
            distance: `${first.distanceMiles.toFixed(2)} miles`
        });
    }
    console.log('Total Markers:', State.markers.length);
    console.log('======================================');
}

export function exportState() {
    const state = {
        timestamp: new Date().toISOString(),
        siteLocation: State.selectedSiteLocation,
        rectangleBounds: State.rectangleBounds,
        analysisParams: State.analysisParams,
        pois: Object.keys(State.allPOIsDataByCategory).reduce((acc, cat) => {
            acc[cat] = State.allPOIsDataByCategory[cat].length;
            return acc;
        }, {}),
        highways: State.highwayData.length,
        markers: State.markers.length
    };
    console.log('=== EXPORTED STATE ===');
    console.log(JSON.stringify(state, null, 2));
    console.log('======================');
    return state;
}

// Setup global diagnostics
export function setupGlobalDiagnostics() {
    window.runAdminDiagnostics = runDiagnosticCheck;
    window.exportAdminState = exportState;
    
    console.log('✓ Admin diagnostics ready');
    console.log('Available global functions:');
    console.log('  - runAdminDiagnostics() - Run full diagnostic check');
    console.log('  - exportAdminState() - Export current state as JSON');
}