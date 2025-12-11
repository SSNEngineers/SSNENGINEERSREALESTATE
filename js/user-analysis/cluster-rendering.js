// ==================== CLUSTER RENDERING ====================

import { ctx, poiClusters, MAP_WIDTH, MAP_HEIGHT } from './state.js';
import { isWithinMapBounds } from './utilities.js';
import { loadImageCached } from './rendering.js';

/**
 * Draw all clusters with enhanced styling
 */
export function drawClustersEnhanced() {
    poiClusters.forEach(cluster => {
        let clusterX = cluster.clusterX;
        let clusterY = cluster.clusterY;

        if (cluster.isDragged) {
            clusterX = cluster.draggedX;
            clusterY = cluster.draggedY;
        }

        // Only draw if cluster is within bounds
        if (!isWithinMapBounds(clusterX, clusterY, MAP_WIDTH, MAP_HEIGHT)) return;

        // Draw small white circle at mean position
        if (isWithinMapBounds(cluster.meanX, cluster.meanY, MAP_WIDTH, MAP_HEIGHT)) {
            ctx.fillStyle = 'white';
            ctx.strokeStyle = '#8B0000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cluster.meanX, cluster.meanY, 5, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
        }

        // Draw arrow from mean point to cluster
        drawClusterArrowWhiteEnhanced(cluster.meanX, cluster.meanY, clusterX, clusterY);

        // Draw cluster box
        const originalClusterX = cluster.clusterX;
        const originalClusterY = cluster.clusterY;

        cluster.clusterX = clusterX;
        cluster.clusterY = clusterY;

        drawClusterBoxEnhanced(cluster);

        // Restore original for next time (unless permanently dragged)
        if (!cluster.isDragged) {
            cluster.clusterX = originalClusterX;
            cluster.clusterY = originalClusterY;
        }
    });
}

/**
 * Draw arrow from mean point to cluster
 */
export function drawClusterArrowWhiteEnhanced(fromX, fromY, toX, toY) {
    if (!isWithinMapBounds(fromX, fromY, MAP_WIDTH, MAP_HEIGHT) || 
        !isWithinMapBounds(toX, toY, MAP_WIDTH, MAP_HEIGHT)) return;

    // Draw red circle at mean position
    ctx.fillStyle = '#8B0000';
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(fromX, fromY, 6, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    // Draw bold red line to cluster
    ctx.strokeStyle = '#8B0000';
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    // Draw red arrowhead
    const angle = Math.atan2(toY - fromY, toX - fromX);
    const arrowSize = 8;

    ctx.fillStyle = '#8B0000';
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
        toX - arrowSize * Math.cos(angle - Math.PI / 6),
        toY - arrowSize * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
        toX - arrowSize * Math.cos(angle + Math.PI / 6),
        toY - arrowSize * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
}

/**
 * Draw cluster box with logos (NO FALLBACK)
 */
/**
 * Draw cluster box with logos (NO BOXES AROUND INDIVIDUAL LOGOS)
 */
export function drawClusterBoxEnhanced(cluster) {
    const x = cluster.clusterX;
    const y = cluster.clusterY;
    
    // Use resized size if available, otherwise default
    const size = cluster.size || 80;

    const poisCount = cluster.pois.length;
    
    const cols = Math.ceil(Math.sqrt(poisCount));
    const rows = Math.ceil(poisCount / cols);
    const maxLogoSize = Math.floor((size - 20) / (cols + 0.5));
    const logoSize = Math.max(25, Math.min(maxLogoSize, 60));
    
    const padding = 8;

    const boxWidth = (logoSize * cols) + (padding * (cols + 1));
    const boxHeight = (logoSize * rows) + (padding * (rows + 1));

    // Draw white rounded rectangle with shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    ctx.fillStyle = 'white';
    ctx.strokeStyle = '#8B0000';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(
        x - boxWidth / 2,
        y - boxHeight / 2,
        boxWidth,
        boxHeight,
        10
    );
    ctx.fill();
    ctx.stroke();

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Draw logos in grid WITHOUT individual boxes
    cluster.pois.forEach((poiData, i) => {
        const row = Math.floor(i / cols);
        const col = i % cols;

        const logoX = x - boxWidth / 2 + padding + (col * (logoSize + padding)) + logoSize / 2;
        const logoY = y - boxHeight / 2 + padding + (row * (logoSize + padding)) + logoSize / 2;

        const poi = poiData.poi;

        // Only draw if logo exists
        if (poi.logoUrl) {
            loadImageCached(poi.logoUrl).then(img => {
                // Calculate aspect ratio to maintain original shape
                const imgAspect = img.width / img.height;
                let drawWidth = logoSize;
                let drawHeight = logoSize;
                
                if (imgAspect > 1) {
                    drawHeight = logoSize / imgAspect;
                } else {
                    drawWidth = logoSize * imgAspect;
                }

                // Draw logo WITHOUT box - just the logo image with slight padding
                const margin = 4;
                ctx.drawImage(
                    img, 
                    logoX - (drawWidth - margin) / 2, 
                    logoY - (drawHeight - margin) / 2, 
                    drawWidth - margin, 
                    drawHeight - margin
                );

                // NO BORDER - logos are displayed in their natural shape
            }).catch(() => {
                // If logo fails to load, don't draw anything (no fallback)
                console.warn(`Failed to load logo in cluster for ${poi.name}`);
            });
        }
    });
}

/**
 * Draw basic clusters
 */
export function drawClusters() {
    poiClusters.forEach(cluster => {
        // Draw small white circle at mean position
        ctx.fillStyle = 'white';
        ctx.strokeStyle = '#8B0000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cluster.meanX, cluster.meanY, 6, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        // Draw arrow from mean point to cluster
        drawClusterArrowWhite(cluster.meanX, cluster.meanY, cluster.clusterX, cluster.clusterY);

        // Draw cluster box
        drawClusterBox(cluster);
    });
}

/**
 * Draw cluster arrow (basic version)
 */
export function drawClusterArrowWhite(fromX, fromY, toX, toY) {
    // Draw red circle at mean position
    ctx.fillStyle = '#8B0000';
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(fromX, fromY, 6, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    // Draw bold red line
    ctx.strokeStyle = '#8B0000';
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    // Draw white arrowhead
    const angle = Math.atan2(toY - fromY, toX - fromX);
    const arrowSize = 8;

    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
        toX - arrowSize * Math.cos(angle - Math.PI / 6),
        toY - arrowSize * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
        toX - arrowSize * Math.cos(angle + Math.PI / 6),
        toY - arrowSize * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
}

/**
 * Draw cluster box (basic version) - NO FALLBACK
 */
/**
 * Draw cluster box (basic version) - NO BOXES AROUND LOGOS
 */
export function drawClusterBox(cluster) {
    let x = cluster.clusterX;
    let y = cluster.clusterY;

    if (cluster.isDragged) {
        x = cluster.draggedX;
        y = cluster.draggedY;
    }

    const size = cluster.size;
    const poisCount = cluster.pois.length;
    const logoSize = Math.min(35, size / (Math.ceil(Math.sqrt(poisCount)) + 1));
    const padding = 8;

    const cols = Math.ceil(Math.sqrt(poisCount));
    const rows = Math.ceil(poisCount / cols);

    const boxWidth = (logoSize * cols) + (padding * (cols + 1));
    const boxHeight = (logoSize * rows) + (padding * (rows + 1));

    // Draw white rounded rectangle with shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    ctx.fillStyle = 'white';
    ctx.strokeStyle = '#8B0000';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(
        x - boxWidth / 2,
        y - boxHeight / 2,
        boxWidth,
        boxHeight,
        10
    );
    ctx.fill();
    ctx.stroke();

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Draw logos WITHOUT individual boxes
    cluster.pois.forEach((poiData, i) => {
        const row = Math.floor(i / cols);
        const col = i % cols;

        const logoX = x - boxWidth / 2 + padding + (col * (logoSize + padding)) + logoSize / 2;
        const logoY = y - boxHeight / 2 + padding + (row * (logoSize + padding)) + logoSize / 2;

        const poi = poiData.poi;

        // Only draw if logo exists
        if (poi.logoUrl) {
            loadImageCached(poi.logoUrl).then(img => {
                const imgAspect = img.width / img.height;
                let drawWidth = logoSize;
                let drawHeight = logoSize;
                
                if (imgAspect > 1) {
                    drawHeight = logoSize / imgAspect;
                } else {
                    drawWidth = logoSize * imgAspect;
                }

                const margin = 4;
                ctx.drawImage(
                    img, 
                    logoX - (drawWidth - margin) / 2, 
                    logoY - (drawHeight - margin) / 2, 
                    drawWidth - margin, 
                    drawHeight - margin
                );

                // NO BORDER - natural logo shape
            }).catch(() => {
                // No fallback - just skip
                console.warn(`Failed to load logo in cluster for ${poi.name}`);
            });
        }
    });
}