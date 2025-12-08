// ==================== POI CLUSTERING LOGIC ====================

import { 
    MAP_WIDTH, 
    MAP_HEIGHT, 
    allPOIsDataByCategory, 
    selectedPOIs,
    poiClusters,
    setPOIClusters,
    highwayData
} from './state.js';
import { GRID_ROWS, GRID_COLS } from './constants.js';

/**
 * Create POI clusters using 5x5 grid system
 */
export function createPOIClusters() {
    const clusters = [];
    const cellWidth = MAP_WIDTH / GRID_COLS;
    const cellHeight = MAP_HEIGHT / GRID_ROWS;

    console.log(`Creating ${GRID_ROWS}x${GRID_COLS} grid with cell size: ${cellWidth.toFixed(2)}x${cellHeight.toFixed(2)}`);

    const gridCells = [];
    for (let row = 0; row < GRID_ROWS; row++) {
        for (let col = 0; col < GRID_COLS; col++) {
            gridCells.push({
                row,
                col,
                pois: [],
                x: col * cellWidth,
                y: row * cellHeight,
                width: cellWidth,
                height: cellHeight
            });
        }
    }

    // Assign POIs to grid cells
    for (const [category, pois] of Object.entries(allPOIsDataByCategory)) {
        for (let idx = 0; idx < pois.length; idx++) {
            if (!selectedPOIs[category] || !selectedPOIs[category][idx]) continue;

            const poi = pois[idx];

            const col = Math.floor(poi.pixelX / cellWidth);
            const row = Math.floor(poi.pixelY / cellHeight);
            const cellIndex = row * GRID_COLS + col;

            if (cellIndex >= 0 && cellIndex < gridCells.length) {
                gridCells[cellIndex].pois.push({ poi, category, idx });
            }
        }
    }

    // Create clusters from cells with 2+ POIs
    gridCells.forEach((cell, cellIndex) => {
        if (cell.pois.length >= 2) {
            const meanX = cell.pois.reduce((sum, p) => sum + p.poi.pixelX, 0) / cell.pois.length;
            const meanY = cell.pois.reduce((sum, p) => sum + p.poi.pixelY, 0) / cell.pois.length;

            // Position cluster outside the mean point
            const offsetDistance = 80;
            const angle = Math.atan2(meanY - MAP_HEIGHT / 2, meanX - MAP_WIDTH / 2);

            const cluster = {
                id: `cluster_${cellIndex}`,
                pois: cell.pois,
                meanX: meanX,
                meanY: meanY,
                clusterX: meanX + Math.cos(angle) * offsetDistance,
                clusterY: meanY + Math.sin(angle) * offsetDistance,
                size: 80,
                cellRow: cell.row,
                cellCol: cell.col
            };

            // Adjust for overlaps with highways
            let adjusted = adjustForOverlaps(cluster);
            cluster.clusterX = adjusted.x;
            cluster.clusterY = adjusted.y;

            clusters.push(cluster);
        }
    });

    setPOIClusters(clusters);
    console.log(`✓ Created ${clusters.length} clusters from ${GRID_ROWS}x${GRID_COLS} grid`);
}

/**
 * Adjust cluster position to avoid overlaps with highways
 */
export function adjustForOverlaps(cluster) {
    // Check if cluster overlaps with highways
    for (const hw of highwayData) {
        const dist = Math.sqrt(
            Math.pow(cluster.clusterX - hw.pixelX, 2) +
            Math.pow(cluster.clusterY - hw.pixelY, 2)
        );

        if (dist < 100) {
            // Move cluster away from highway
            const angle = Math.atan2(cluster.clusterY - hw.pixelY, cluster.clusterX - hw.pixelX);
            return {
                x: hw.pixelX + Math.cos(angle) * 120,
                y: hw.pixelY + Math.sin(angle) * 120
            };
        }
    }

    return { x: cluster.clusterX, y: cluster.clusterY };
}

/**
 * Optimize cluster positions to avoid overlaps
 */
export function optimizeClusterPositions() {
    const MIN_DISTANCE = 100;

    poiClusters.forEach((cluster, index) => {
        let adjusted = true;
        let attempts = 0;
        const MAX_ATTEMPTS = 50;

        while (adjusted && attempts < MAX_ATTEMPTS) {
            adjusted = false;
            attempts++;

            // Check distance from highways
            for (const hw of highwayData) {
                const dist = Math.sqrt(
                    Math.pow(cluster.clusterX - hw.pixelX, 2) +
                    Math.pow(cluster.clusterY - hw.pixelY, 2)
                );

                if (dist < MIN_DISTANCE) {
                    const angle = Math.atan2(cluster.clusterY - hw.pixelY, cluster.clusterX - hw.pixelX);
                    cluster.clusterX = hw.pixelX + Math.cos(angle) * (MIN_DISTANCE + 20);
                    cluster.clusterY = hw.pixelY + Math.sin(angle) * (MIN_DISTANCE + 20);
                    adjusted = true;
                    break;
                }
            }

            if (adjusted) continue;

            // Check distance from other clusters
            for (let j = 0; j < poiClusters.length; j++) {
                if (j === index) continue;

                const otherCluster = poiClusters[j];
                const dist = Math.sqrt(
                    Math.pow(cluster.clusterX - otherCluster.clusterX, 2) +
                    Math.pow(cluster.clusterY - otherCluster.clusterY, 2)
                );

                if (dist < MIN_DISTANCE) {
                    const angle = Math.atan2(
                        cluster.clusterY - otherCluster.clusterY,
                        cluster.clusterX - otherCluster.clusterX
                    );
                    cluster.clusterX = otherCluster.clusterX + Math.cos(angle) * (MIN_DISTANCE + 20);
                    cluster.clusterY = otherCluster.clusterY + Math.sin(angle) * (MIN_DISTANCE + 20);
                    adjusted = true;
                    break;
                }
            }

            // Ensure cluster stays within map bounds
            const clusterRadius = cluster.size / 2;
            if (cluster.clusterX - clusterRadius < 0) cluster.clusterX = clusterRadius;
            if (cluster.clusterX + clusterRadius > MAP_WIDTH) cluster.clusterX = MAP_WIDTH - clusterRadius;
            if (cluster.clusterY - clusterRadius < 0) cluster.clusterY = clusterRadius;
            if (cluster.clusterY + clusterRadius > MAP_HEIGHT) cluster.clusterY = MAP_HEIGHT - clusterRadius;
        }
    });
}

/**
 * Check collision with highways for POI positioning
 */
export function checkCollisionWithHighways(x, y, radius) {
    // Check if a point collides with any highway
    for (const hw of highwayData) {
        const dist = Math.sqrt(
            Math.pow(x - hw.pixelX, 2) +
            Math.pow(y - hw.pixelY, 2)
        );

        if (dist < (radius + 60)) {
            return { collides: true, highway: hw, distance: dist };
        }
    }

    // Check collision with site marker
    if (window.siteMarkerPosition) {
        const dist = Math.sqrt(
            Math.pow(x - window.siteMarkerPosition.x, 2) +
            Math.pow(y - window.siteMarkerPosition.y, 2)
        );

        if (dist < (radius + window.siteMarkerPosition.radius + 40)) {
            return { collides: true, siteMarker: true, distance: dist };
        }
    }

    return { collides: false };
}

/**
 * Find safe position for POI to avoid collisions
 */
export function findSafePosition(originalX, originalY, radius, maxAttempts = 12) {
    const angleStep = (Math.PI * 2) / maxAttempts;
    const distances = [100, 120, 140, 160];

    for (const distance of distances) {
        for (let i = 0; i < maxAttempts; i++) {
            const angle = i * angleStep;
            const newX = originalX + Math.cos(angle) * distance;
            const newY = originalY + Math.sin(angle) * distance;

            // Check if within bounds
            if (newX < radius || newX > MAP_WIDTH - radius ||
                newY < radius || newY > MAP_HEIGHT - radius) {
                continue;
            }

            // Check if safe from collisions
            const collision = checkCollisionWithHighways(newX, newY, radius);
            if (!collision.collides) {
                return { x: newX, y: newY, adjusted: true };
            }
        }
    }

    return { x: originalX, y: originalY, adjusted: false };
}