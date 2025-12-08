// js/admin-analysis/highway-fetching.js
import * as State from './state.js';
import * as Utils from './utilities.js';

export async function fetchHighways() {
    const radiusMeters = State.analysisParams.radius * 1609.34;
    const query = `[out:json][timeout:30];(way["highway"~"tertiary|secondary|primary|trunk|motorway"](around:${radiusMeters},${State.selectedSiteLocation.lat},${State.selectedSiteLocation.lng}););out body;>;out skel qt;`;
    
    try {
        const response = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            body: query
        });
        const data = await response.json();
        
        // ✅ CORRECT: Use setter function instead of direct assignment
        const processedHighways = processHighwayData(data.elements);
        State.setHighwayData(processedHighways); // ✅ FIX HERE
        
        renderHighways();
    } catch (error) {
        console.error('Highway fetch error:', error);
    }
}

function processHighwayData(elements) {
    const nodes = {};
    elements.forEach(el => {
        if (el.type === 'node') {
            nodes[el.id] = { lat: el.lat, lng: el.lon };
        }
    });
    
    const highways = elements.filter(el => el.type === 'way' && el.tags && el.tags.highway);
    let processed = highways.map(way => {
        const path = way.nodes.map(nodeId => {
            const node = nodes[nodeId];
            return node ? [node.lat, node.lng] : null;
        }).filter(Boolean);
        
        if (path.length === 0) return null;
        
        const center = {
            lat: path.reduce((sum, p) => sum + p[0], 0) / path.length,
            lng: path.reduce((sum, p) => sum + p[1], 0) / path.length
        };
        
        const distanceMiles = Utils.calculateDistance(
            State.selectedSiteLocation.lat, 
            State.selectedSiteLocation.lng, 
            center.lat, 
            center.lng
        ) / 1.60934;
        
        return {
            id: way.id,
            type: way.tags.highway,
            name: way.tags.name || 'Unnamed Road',
            ref: way.tags.ref,
            path,
            center,
            distanceMiles,
            visible: true
        };
    }).filter(h => h && h.path.length > 1).sort((a, b) => a.distanceMiles - b.distanceMiles);
    
    // Get ONE of each type: motorway, trunk, primary, tertiary
    const result = [];
    const targetTypes = ['motorway', 'trunk', 'primary', 'tertiary'];
    
    for (const targetType of targetTypes) {
        const found = processed.find(hw => hw.type === targetType);
        if (found) {
            result.push(found);
        }
    }
    
    return result.slice(0, 4); // Max 4 highways
}

function renderHighways() {
    const section = document.createElement('div');
    section.className = 'highway-section';
    section.innerHTML = `<h4>🛣️ Main Routes & Highways</h4><ul class="poi-list" id="highway-list"></ul>`;
    
    const existingSection = document.getElementById('highwaySection');
    if (existingSection.firstChild) {
        existingSection.removeChild(existingSection.firstChild);
    }
    existingSection.appendChild(section);
    
    const list = document.getElementById('highway-list');
    if (State.highwayData.length === 0) {
        list.innerHTML = '<li class="empty-message">No highways found in this area.</li>';
        return;
    }
    
    State.highwayData.forEach((highway, index) => {
        const color = getHighwayColor(highway.type);
        const li = document.createElement('li');
        li.innerHTML = `
            <input type="checkbox" checked onchange="toggleHighwayVisibility(${index}, this.checked)">
            <span class="route-badge" style="background: ${color};">${highway.ref || highway.name.substring(0, 3).toUpperCase()}</span>
            <span>${highway.name} (${categorizeRoute(highway.type)}): ${highway.distanceMiles.toFixed(2)} mi</span>
        `;
        list.appendChild(li);
        addHighwayLabel(highway, color);
    });
}

function addHighwayLabel(highway, color) {
    const center = highway.center;
    const labelText = highway.ref || highway.name;
    
    const label = L.divIcon({
        className: 'highway-label',
        html: `<div class="highway-label-text" style="background: ${color}; color: white; padding: 6px 12px; border-radius: 6px; font-weight: bold; font-size: 13px; white-space: nowrap; text-shadow: 1px 1px 2px rgba(0,0,0,0.8); border: 2px solid white;">${labelText}</div>`,
        iconSize: [0, 0]
    });
    
    const marker = L.marker([center.lat, center.lng], {
        icon: label,
        draggable: true
    }).addTo(State.map);
    
    marker.bindPopup(`
        <b>${highway.name}</b><br>
        <strong>Type:</strong> ${categorizeRoute(highway.type)}<br>
        ${highway.ref ? '<strong>Ref:</strong> ' + highway.ref + '<br>' : ''}
        <strong>Distance:</strong> ${highway.distanceMiles.toFixed(2)} miles<br>
        <em style="color: #666; font-size: 0.85em;">Drag to reposition</em>
    `);
    
    highway.marker = marker;
    State.highwayLayers.push(marker);
}

export function toggleHighwayVisibility(index, checked) {
    const highway = State.highwayData[index];
    if (highway && highway.marker) {
        if (checked) {
            highway.marker.addTo(State.map);
        } else {
            State.map.removeLayer(highway.marker);
        }
        highway.visible = checked;
    }
}

function getHighwayColor(type) {
    switch (type) {
        case 'motorway': return '#E60000'; // Red for Highway
        case 'trunk': return '#FF8C00'; // Orange for Expressway
        case 'primary': return '#0066FF'; // Blue for Main Road
        case 'tertiary': return '#9933FF'; // Purple for Local Road
        default: return '#808080';
    }
}

function categorizeRoute(type) {
    switch (type) {
        case 'motorway': return 'Highway';
        case 'trunk': return 'Expressway';
        case 'primary': return 'Main Road';
        case 'tertiary': return 'Local Road';
        default: return type.charAt(0).toUpperCase() + type.slice(1);
    }
}

// Make public if needed
window.toggleHighwayVisibility = toggleHighwayVisibility;