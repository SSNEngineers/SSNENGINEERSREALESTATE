// js/admin-analysis/initialization.js
import * as State from './state.js';
import * as UiUpdates from './ui-updates.js';
import * as POIFetching from './poi-fetching.js';
import * as HighwayFetching from './highway-fetching.js';
import * as Utils from './utilities.js';

export async function checkAuth() {
    const isAdmin = sessionStorage.getItem('ssnai_admin') ||
                    localStorage.getItem('ssnai_admin') ||
                    localStorage.getItem('ssnai_admin_exists');
    if (!isAdmin) {
        alert('Admin access required');
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

export async function initializeUI() {
    const mapInstance = L.map('map', {
        zoomControl: true,
        scrollWheelZoom: true
    }).setView([35.7796, -78.6382], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(mapInstance);
    
    State.setMap(mapInstance);
    console.log('✓ Map initialized');
}

export async function geocodeAndAnalyze() {
    State.setAnalysisParams(JSON.parse(sessionStorage.getItem('analysis_params')));
    if (!State.analysisParams) {
        alert('No analysis parameters found');
        window.location.href = 'dashboard.html';
        return;
    }
    
    document.getElementById('loadingOverlay').style.display = 'flex';
    
    try {
        console.log('📍 Starting geocoding for:', State.analysisParams.address);
        
        // ✅ TRY EXACT ADDRESS FIRST
        let locationData = await geocodeAddress(State.analysisParams.address);
        
        // ✅ IF EXACT FAILS, TRY SIMPLIFIED VERSION
        if (!locationData || !locationData.lat || !locationData.lon) {
            console.log('⚠️ Exact address not found, trying simplified version');
            const simplifiedAddress = extractCityStateImproved(State.analysisParams.address);
            
            if (simplifiedAddress) {
                console.log('🔄 Trying:', simplifiedAddress);
                locationData = await geocodeAddress(simplifiedAddress);
            }
        }
        
        // ✅ FINAL VALIDATION
        if (!locationData || !locationData.lat || !locationData.lon) {
            throw new Error(`Unable to find location: "${State.analysisParams.address}"\n\nTip: Try a simpler address like "Raleigh, NC" or just the city name.`);
        }
        
        // ✅ SET LOCATION
        State.setSelectedSiteLocation({
            lat: parseFloat(locationData.lat),
            lng: parseFloat(locationData.lon),
            address: locationData.display_name || State.analysisParams.address
        });
        
        console.log('✅ Final location:', State.selectedSiteLocation);
        
        // ✅ CONTINUE WITH ANALYSIS
        const bounds = calculateRectangleBounds(
            State.selectedSiteLocation.lat,
            State.selectedSiteLocation.lng,
            State.analysisParams.radius
        );
        State.setRectangleBounds(bounds);
        
        drawSiteMarker();
        drawSearchArea();
        fitMapToRadius();
        
        await POIFetching.fetchAllPOIs();
        await Utils.delay(2000);
        await HighwayFetching.fetchHighways();
        
        document.getElementById('exportBtn').disabled = false;
        console.log('✅ Analysis complete');
        
    } catch (e) {
        console.error('❌ Analysis error:', e);
        alert(e.message || 'Unable to geocode location. Please try a different address.');
        window.location.href = 'dashboard.html';
    } finally {
        document.getElementById('loadingOverlay').style.display = 'none';
    }
}

/// ✅ FIXED VERSION (matching user-analysis approach)
async function geocodeAddress(address) {
    try {
        console.log('🔍 Geocoding address:', address);
        
        // ✅ SIMPLE FETCH - NO CUSTOM HEADERS
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
        
        const response = await fetch(url); // ✅ Default headers only
        
        if (!response.ok) {
            console.error(`❌ HTTP Error ${response.status}`);
            return null;
        }
        
        const data = await response.json();
        
        if (!data || !Array.isArray(data) || data.length === 0) {
            console.warn('⚠️ No results found for:', address);
            return null;
        }
        
        const firstResult = data[0];
        
        if (!firstResult || typeof firstResult.lat === 'undefined' || typeof firstResult.lon === 'undefined') {
            console.warn('⚠️ Result missing coordinates');
            return null;
        }
        
        console.log('✅ Geocoded successfully:', firstResult.display_name);
        return firstResult;
        
    } catch (error) {
        console.error('❌ Geocoding error:', error);
        return null;
    }
}

function extractCityStateImproved(fullAddress) {
    try {
        const parts = fullAddress.split(',').map(part => part.trim());
        
        console.log('📝 Address parts:', parts);
        
        // Strategy 1: Find 2-letter state code
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            
            // Match 2-letter state code (NC, CA, TX, etc.)
            if (/^[A-Z]{2}$/i.test(part)) {
                const state = part.toUpperCase();
                
                // Get city (part before state)
                if (i > 0) {
                    const city = parts[i - 1];
                    
                    // Skip if city is just numbers (zip code)
                    if (!/^\d+$/.test(city)) {
                        const simplified = `${city}, ${state}`;
                        console.log('✅ Extracted:', simplified);
                        return simplified;
                    }
                }
            }
        }
        
        // Strategy 2: Get the largest non-numeric part (likely city name)
        const nonNumericParts = parts.filter(p => {
            return p.length > 2 && !/^\d+$/.test(p) && p.toLowerCase() !== 'usa';
        });
        
        if (nonNumericParts.length > 0) {
            // Return the longest part (usually the city)
            const city = nonNumericParts.reduce((a, b) => a.length > b.length ? a : b);
            console.log('✅ Fallback to city:', city);
            return city;
        }
        
    } catch (error) {
        console.error('❌ Error extracting city/state:', error);
    }
    
    return null;
}

function calculateRectangleBounds(lat, lng, radiusMiles) {
    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
        console.error('Invalid coordinates for rectangle bounds:', lat, lng);
        throw new Error('Invalid coordinates for rectangle bounds');
    }
    
    const radiusKm = radiusMiles * 1.60934;
    const latDiff = radiusKm / 111.32; // degrees of latitude
    const lngDiff = radiusKm / (111.32 * Math.cos(lat * Math.PI / 180)); // degrees of longitude
    
    const paddingFactor = 1.05;
    const latDiffPadded = latDiff * paddingFactor;
    const lngDiffPadded = lngDiff * paddingFactor;
    
    return {
        north: lat + latDiffPadded,
        south: lat - latDiffPadded,
        east: lng + lngDiffPadded,
        west: lng - lngDiffPadded,
        topLeft: { lat: lat + latDiffPadded, lng: lng - lngDiffPadded },
        topRight: { lat: lat + latDiffPadded, lng: lng + lngDiffPadded },
        bottomLeft: { lat: lat - latDiffPadded, lng: lng - lngDiffPadded },
        bottomRight: { lat: lat - latDiffPadded, lng: lng + lngDiffPadded }
    };
}

function drawSiteMarker() {
    const siteName = State.selectedSiteLocation.address.split(',')[0];
    const siteMarker = L.marker([State.selectedSiteLocation.lat, State.selectedSiteLocation.lng], {
        icon: L.divIcon({
            className: 'site-marker',
            html: '<div style="background: #00FF00; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 4px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.4);"><span style="color: white; font-weight: bold; font-size: 18px;">S</span></div>',
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        }),
        draggable: false
    }).addTo(State.map);
    
    siteMarker.bindPopup(`<b>${siteName}</b><br>Coordinates: ${State.selectedSiteLocation.lat.toFixed(6)}, ${State.selectedSiteLocation.lng.toFixed(6)}<br>Address: ${State.selectedSiteLocation.address}`);
    State.setSiteMarker(siteMarker);
}

function drawSearchArea() {
    const radiusMeters = State.analysisParams.radius * 1609.34;
    const searchAreaShape = L.circle([State.selectedSiteLocation.lat, State.selectedSiteLocation.lng], {
        color: '#FF0000',
        fillColor: '#FF0000',
        fillOpacity: 0.15,
        weight: 3,
        radius: radiusMeters
    }).addTo(State.map);
    
    State.setSearchAreaShape(searchAreaShape);
}

function fitMapToRadius() {
    if (State.searchAreaShape) {
        const bounds = State.searchAreaShape.getBounds();
        const paddedBounds = bounds.pad(0.1);
        State.map.fitBounds(paddedBounds, {
            padding: [50, 50],
            maxZoom: 15
        });
    }
}