// js/admin-analysis/state.js
export let map = null;
export let siteMarker = null;
export let searchAreaShape = null;
export let markers = [];
export let selectedSiteLocation = null;
export let allPOIsDataByCategory = {};
export let highwayData = [];
export let highwayLayers = [];
export let analysisParams = null;
export let rectangleBounds = null;

// Setters
export function setMap(m) { map = m; }
export function setSiteMarker(marker) { siteMarker = marker; }  // ✅ ADD THIS
export function setSearchAreaShape(shape) { searchAreaShape = shape; }  // ✅ ADD THIS
export function setSelectedSiteLocation(loc) { selectedSiteLocation = loc; }
export function setAnalysisParams(params) { analysisParams = params; }
export function setAllPOIsDataByCategory(data) { allPOIsDataByCategory = data; }
export function setHighwayData(data) { highwayData = data; }
export function setRectangleBounds(bounds) { rectangleBounds = bounds; }