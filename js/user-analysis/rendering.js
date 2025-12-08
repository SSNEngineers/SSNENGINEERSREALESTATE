// ==================== CANVAS RENDERING FUNCTIONS ====================

import {
    ctx,
    MAP_WIDTH,
    MAP_HEIGHT,
    selectedSiteLocation,
    allPOIsDataByCategory,
    highwayData,
    selectedHighways,
    selectedPOIs,
    poiClusters,
    analysisParams
} from './state.js';
import { latLngToPixel } from './coordinates.js';
import { getHighwayColor, isWithinMapBounds, loadImage } from './utilities.js';
import { checkCollisionWithHighways, findSafePosition } from './clustering.js';

// Logo cache for performance
const logoCache = new Map();

/**
 * Load image with caching
 */
export async function loadImageCached(url) {
    if (logoCache.has(url)) {
        return logoCache.get(url);
    }

    try {
        const img = await loadImage(url);
        logoCache.set(url, img);
        return img;
    } catch (error) {
        console.warn(`Failed to load image: ${url}`);
        throw error;
    }
}

/**
 * Draw site marker (green circle with 'S')
 */
export function drawSiteMarker() {
    const siteCoords = latLngToPixel(selectedSiteLocation.lat, selectedSiteLocation.lng);

    console.log('Drawing site marker at:', siteCoords);
    // ==================== USE RESIZED RADIUS HERE ====================
    // Use resized radius if available
    const markerRadius = window.siteMarkerPosition?.radius || 20;
    // ==================== END RESIZED RADIUS ====================


    if (siteCoords.x < 0 || siteCoords.x > MAP_WIDTH ||
        siteCoords.y < 0 || siteCoords.y > MAP_HEIGHT) {
        console.error('⚠️ Site marker position is outside canvas!');
        return;
    }

    let drawX = siteCoords.x;
    let drawY = siteCoords.y;

    if (window.siteMarkerPosition && window.siteMarkerPosition.isDragged) {
        drawX = window.siteMarkerPosition.x;
        drawY = window.siteMarkerPosition.y;

        // Draw orange circle at original position
        ctx.fillStyle = '#FF8C00';
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(siteCoords.x, siteCoords.y, 8, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        // Draw bold orange line
        ctx.strokeStyle = '#FF8C00';
        ctx.lineWidth = 6;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(siteCoords.x, siteCoords.y);
        ctx.lineTo(drawX, drawY);
        ctx.stroke();
    }

    // Store site marker position globally
    if (!window.siteMarkerPosition) {
        window.siteMarkerPosition = { x: drawX, y: drawY, radius: 25 };
    } else {
        window.siteMarkerPosition.x = drawX;
        window.siteMarkerPosition.y = drawY;
    }

    // Draw green circle with 'S'
    ctx.fillStyle = '#00FF00';
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(drawX, drawY, markerRadius, 0, 2 * Math.PI);  // ⭐ CHANGED
    ctx.fill();
    ctx.stroke();

    // Draw 'S' letter
    ctx.fillStyle = 'white';
    ctx.font = `bold ${Math.floor(markerRadius * 0.9)}px Arial`;  // ⭐ SCALE FONT
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('S', drawX, drawY);

    console.log('✓ Site marker drawn');
}

/**
 * Draw search radius circle (enhanced version)
 */
export function drawSearchRadiusEnhanced() {
    const siteCoords = latLngToPixel(selectedSiteLocation.lat, selectedSiteLocation.lng);
    const radiusMiles = analysisParams.radius;

    // Calculate a point at the edge of the radius
    const radiusDegrees = (radiusMiles * 1609.34) / (111320 * Math.cos(selectedSiteLocation.lat * Math.PI / 180));
    const edgePoint = {
        lat: selectedSiteLocation.lat,
        lng: selectedSiteLocation.lng + radiusDegrees
    };

    const edgeCoords = latLngToPixel(edgePoint.lat, edgePoint.lng);
    const radiusPixels = Math.abs(edgeCoords.x - siteCoords.x);

    console.log(`Radius: ${radiusMiles} miles = ${radiusPixels.toFixed(1)} pixels at this zoom level`);
}

/**
 * Draw highways (static enhanced version)
 */
export function drawHighwaysStaticEnhanced() {
    console.log(`\nDrawing ${highwayData.length} highways...`);

    let drawnCount = 0;
    highwayData.forEach((hw, idx) => {
        if (!selectedHighways[idx]) return;

        if (!hw.pixelPath || hw.pixelPath.length < 2) {
            console.warn(`Highway ${hw.name} has insufficient path points`);
            return;
        }

        // Draw highway path
        ctx.strokeStyle = getHighwayColor(hw.type);
        ctx.lineWidth = 4;
        ctx.beginPath();

        let validPoints = 0;
        hw.pixelPath.forEach((point, i) => {
            if (isWithinMapBounds(point[0], point[1], MAP_WIDTH, MAP_HEIGHT)) {
                if (i === 0 || validPoints === 0) {
                    ctx.moveTo(point[0], point[1]);
                } else {
                    ctx.lineTo(point[0], point[1]);
                }
                validPoints++;
            }
        });

        if (validPoints >= 2) {
            ctx.stroke();
            drawnCount++;

            if (isWithinMapBounds(hw.pixelX, hw.pixelY, MAP_WIDTH, MAP_HEIGHT)) {
                drawHighwayLabel(hw);
            }
        } else {
            console.warn(`Highway ${hw.name} has no valid points within bounds`);
        }
    });

    console.log(`✓ Drew ${drawnCount} highways`);
}

/**
 * Draw highway label
 */
export function drawHighwayLabel(hw) {
    const label = hw.ref || hw.name.substring(0, 10);
    const color = getHighwayColor(hw.type);

    const fontSize = hw.labelSize || 14;
    ctx.font = `bold ${fontSize}px Arial`;
    const metrics = ctx.measureText(label);
    const padding = 10;
    const boxWidth = metrics.width + padding * 2;
    const boxHeight = 28;

    let labelX = hw.pixelX;
    let labelY = hw.pixelY - 20;

    if (hw.isDragged) {
        labelX = hw.draggedX;
        labelY = hw.draggedY;

        // Draw red circle at original position
        ctx.fillStyle = '#FF0000';
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(hw.originalPixelX || hw.pixelX, hw.originalPixelY || hw.pixelY, 8, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        // Draw bold red line
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 6;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(hw.originalPixelX || hw.pixelX, hw.originalPixelY || hw.pixelY);
        ctx.lineTo(labelX, labelY);
        ctx.stroke();
    } else {
        // Check for collision with site marker
        if (window.siteMarkerPosition) {
            const dist = Math.sqrt(
                Math.pow(labelX - window.siteMarkerPosition.x, 2) +
                Math.pow(labelY - window.siteMarkerPosition.y, 2)
            );

            if (dist < 80) {
                const angle = Math.atan2(
                    labelY - window.siteMarkerPosition.y,
                    labelX - window.siteMarkerPosition.x
                );

                labelX = window.siteMarkerPosition.x + Math.cos(angle) * 100;
                labelY = window.siteMarkerPosition.y + Math.sin(angle) * 100;

                ctx.strokeStyle = 'white';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.moveTo(hw.pixelX, hw.pixelY);
                ctx.lineTo(labelX, labelY);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }
    }

    // Draw label box
    ctx.fillStyle = color;
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(labelX - boxWidth / 2, labelY - boxHeight / 2, boxWidth, boxHeight, 6);
    ctx.fill();
    ctx.stroke();

    // Draw text
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, labelX, labelY);
}

/**
 * Draw individual POIs with collision avoidance
 */
export function drawIndividualPOIsEnhanced() {
    console.log('\nDrawing individual POIs with collision avoidance...');

    let drawnCount = 0;
    for (const [category, pois] of Object.entries(allPOIsDataByCategory)) {
        for (let idx = 0; idx < pois.length; idx++) {
            if (!selectedPOIs[category] || !selectedPOIs[category][idx]) continue;

            const poi = pois[idx];

            // Check if POI is in a cluster
            const isInCluster = poiClusters.some(cluster =>
                cluster.pois.some(p => p.poi === poi)
            );

            if (!isInCluster && isWithinMapBounds(poi.pixelX, poi.pixelY, MAP_WIDTH, MAP_HEIGHT)) {
                const collision = checkCollisionWithHighways(poi.pixelX, poi.pixelY, poi.logoSize / 2);

                if (collision.collides) {
                    const safePos = findSafePosition(poi.pixelX, poi.pixelY, poi.logoSize / 2);

                    if (safePos.adjusted) {
                        // Draw dotted line to original position
                        ctx.strokeStyle = 'white';
                        ctx.lineWidth = 2;
                        ctx.setLineDash([5, 5]);
                        ctx.beginPath();
                        ctx.moveTo(poi.pixelX, poi.pixelY);
                        ctx.lineTo(safePos.x, safePos.y);
                        ctx.stroke();
                        ctx.setLineDash([]);

                        // Draw small green dot at original position
                        ctx.fillStyle = '#00FF00';
                        ctx.beginPath();
                        ctx.arc(poi.pixelX, poi.pixelY, 5, 0, 2 * Math.PI);
                        ctx.fill();

                        drawPOILogoStaticCached({ ...poi, pixelX: safePos.x, pixelY: safePos.y });
                    } else {
                        drawPOILogoStaticCached(poi);
                    }
                } else {
                    drawPOILogoStaticCached(poi);
                }

                drawnCount++;
            }
        }
    }

    console.log(`✓ Drew ${drawnCount} individual POIs with smart positioning`);
}

/**
 * Draw POI logo with caching
 */
export function drawPOILogoStaticCached(poi) {
    let x = poi.pixelX;
    let y = poi.pixelY;

    if (poi.isDragged) {
        x = poi.draggedX;
        y = poi.draggedY;

        // Draw red circle at original position
        ctx.fillStyle = '#FF0000';
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(poi.originalPixelX || poi.pixelX, poi.originalPixelY || poi.pixelY, 8, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        // Draw bold red line to new position
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 6;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(poi.originalPixelX || poi.pixelX, poi.originalPixelY || poi.pixelY);
        ctx.lineTo(x, y);
        ctx.stroke();
    }

    const size = poi.logoSize || 40;

    if (!isWithinMapBounds(x, y, MAP_WIDTH, MAP_HEIGHT)) return;

    if (poi.logoUrl) {
        loadImageCached(poi.logoUrl).then(img => {
            // Calculate aspect ratio
            const imgAspect = img.width / img.height;
            let logoWidth = size;
            let logoHeight = size;
            
            if (imgAspect > 1) {
                logoHeight = size / imgAspect;
            } else {
                logoWidth = size * imgAspect;
            }

            // Calculate box dimensions with padding
            const boxPadding = 12;
            const boxWidth = logoWidth + (boxPadding * 2);
            const boxHeight = logoHeight + (boxPadding * 2);

            // Draw white rounded rectangle box
            ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;

            ctx.fillStyle = 'white';
            ctx.strokeStyle = '#8B0000';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.roundRect(
                x - boxWidth / 2,
                y - boxHeight / 2,
                boxWidth,
                boxHeight,
                5
            );
            ctx.fill();
            ctx.stroke();

            // Reset shadow
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;

            // Draw logo centered in box
            // Draw logo centered in box with 2px margin
            const margin = 2;
            ctx.drawImage(
                img, 
                x - (logoWidth - margin) / 2, 
                y - (logoHeight - margin) / 2, 
                logoWidth - margin, 
                logoHeight - margin
            );
        }).catch(() => {
            if (poi.category === 'popularLocations') {
                drawStarIcon(x, y, size);
            }
        });
    } else if (poi.category === 'popularLocations') {
        drawStarIcon(x, y, size);
    }
}

/**
 * Draw star icon for popular locations
 */
export function drawStarIcon(x, y, size) {
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(x, y, size / 2 + 2, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillStyle = '#FFD700';
    ctx.font = `${size}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⭐', x, y);
}

/**
 * Draw small star icon
 */
export function drawStarIconSmall(x, y, size) {
    ctx.fillStyle = '#FFD700';
    ctx.font = `${size}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⭐', x, y);
}

/**
 * Clear logo cache
 */
export function clearLogoCache() {
    logoCache.clear();
}