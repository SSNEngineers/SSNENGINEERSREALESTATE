// js/admin-analysis.js
// ==================== ADMIN ANALYSIS - MODULAR ENTRY ====================

// Import config
import { LOGODEV_API_KEY, osmTags, categoryIcons, FAMOUS_LOCATIONS } from './admin-analysis/constants.js';

// Import state
import * as State from './admin-analysis/state.js';

// Import utilities
import * as Utils from './admin-analysis/utilities.js';

// Import core logic
import * as POIFetching from './admin-analysis/poi-fetching.js';
import * as HighwayFetching from './admin-analysis/highway-fetching.js';
import * as PdfExport from './admin-analysis/pdf-export.js';
import * as UiUpdates from './admin-analysis/ui-updates.js';
import * as Initialization from './admin-analysis/initialization.js';

// Initialize on load
window.addEventListener('load', async () => {
    if (!await Initialization.checkAuth()) return;
    await Initialization.initializeUI();
    await Initialization.geocodeAndAnalyze();
    UiUpdates.updateInfoPanel();
});

// Make PDF function globally available for button
window.generatePDF = PdfExport.generatePDF;