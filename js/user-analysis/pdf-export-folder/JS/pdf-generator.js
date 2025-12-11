// ==================== PDF GENERATOR MAIN ====================
// js/user-analysis/pdf-export-folder/JS/pdf-generator.js

import { addEnhancedHeader, addEnhancedFooter, addPageNumber } from './pdf-styles.js';
import { formatNumber, formatDecimal, formatCurrency } from './pdf-helpers.js';

/**
 * Generate complete PDF with census data
 * @param {Object} censusResults - Census data results
 * @param {Object} formData - Form data from footer form
 * @param {HTMLCanvasElement} mapCanvas - Canvas with map
 * @param {Object} selectedSiteLocation - Site location data
 */
export async function generatePDF(censusResults, formData, mapCanvas, selectedSiteLocation) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageW = 297;
    const pageH = 210;
    const margin = 10;
    
    // Extract location name
    const locationName = selectedSiteLocation.address.split(',')[0].trim();
    
    // Get map image
    const mapDataUrl = mapCanvas.toDataURL('image/png', 1.0);
    
    // ==================== PAGE 1: FULL MAP ====================
    addEnhancedHeader(doc, pageW, 'Retailer Map');
    
    // Add full map
    const mapStartY = 20;
    const mapHeight = pageH - mapStartY - 35;
    doc.addImage(mapDataUrl, 'PNG', margin, mapStartY, pageW - (margin * 2), mapHeight);
    
    addEnhancedFooter(doc, pageW, pageH, formData.agent1, formData.agent2, formData.location);
    addPageNumber(doc, 1, 2, pageW, pageH);
    
    // ==================== PAGE 2: DEMOGRAPHIC REPORT ====================
    doc.addPage();
    addEnhancedHeader(doc, pageW, 'Demographic Analysis Report');
    
    // Add small overview map on right
    await addSmallOverviewMap(doc, pageW, pageH, selectedSiteLocation);
    
    // Add site location info
    addSiteLocationInfo(doc, margin, pageW, selectedSiteLocation);
    
    // Add demographic tables
    addPopulationTable(doc, margin, pageW, censusResults);
    addHouseholdTable(doc, margin, pageW, censusResults);
    
    // Add census disclaimer
    addCensusDisclaimer(doc, margin, pageW, pageH);
    
    addEnhancedFooter(doc, pageW, pageH, formData.agent1, formData.agent2, formData.location);
    addPageNumber(doc, 2, 2, pageW, pageH);
    
    // Save PDF
    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `Retailer_Map_${locationName.replace(/[^a-z0-9]/gi, '_')}_${dateStr}.pdf`;
    doc.save(fileName);
    
    console.log('✅ PDF generated successfully');
}

/**
 * Add small overview map with radius circles
 */
async function addSmallOverviewMap(doc, pageW, pageH, selectedSiteLocation) {
    const smallMapWidth = (pageW - 20) * 0.35;
    const smallMapHeight = 65;
    const smallMapX = pageW - 10 - smallMapWidth;
    const smallMapY = 24;
    
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = 800;
    tempCanvas.height = 600;
    
    try {
        const lat = selectedSiteLocation.lat;
        const lng = selectedSiteLocation.lng;
        const radiusMeters = 5 * 1609.34;
        const latRad = lat * Math.PI / 180;
        const metersPerPixelAtZoom0 = 156543.03392 * Math.cos(latRad);
        const targetPixelsForRadius = 240;
        const calculatedZoom = Math.floor(Math.log2((metersPerPixelAtZoom0 * targetPixelsForRadius) / radiusMeters));
        
        // Draw map tiles
        await drawMapTiles(tempCtx, lat, lng, calculatedZoom);
        
        // Draw radius circles
        const metersPerPixel = metersPerPixelAtZoom0 / Math.pow(2, calculatedZoom);
        const radius1Mile = 1609.34 / metersPerPixel;
        const radius3Mile = 4828.03 / metersPerPixel;
        const radius5Mile = 8046.72 / metersPerPixel;
        
        tempCtx.strokeStyle = 'rgba(255, 0, 0, 0.85)';
        tempCtx.lineWidth = 4;
        [radius5Mile, radius3Mile, radius1Mile].forEach(r => {
            tempCtx.beginPath();
            tempCtx.arc(400, 300, r, 0, 2 * Math.PI);
            tempCtx.stroke();
        });
        
        // Draw site marker
        tempCtx.fillStyle = 'red';
        tempCtx.beginPath();
        tempCtx.arc(400, 300, 12, 0, 2 * Math.PI);
        tempCtx.fill();
        tempCtx.strokeStyle = 'white';
        tempCtx.lineWidth = 3;
        tempCtx.stroke();
        
        const smallMapDataUrl = tempCanvas.toDataURL('image/png', 1.0);
        doc.addImage(smallMapDataUrl, 'PNG', smallMapX, smallMapY, smallMapWidth, smallMapHeight);
        
        // Add decorative border
        doc.setDrawColor(139, 0, 0);
        doc.setLineWidth(1);
        doc.rect(smallMapX, smallMapY, smallMapWidth, smallMapHeight);
        
    } catch (error) {
        console.warn('Failed to generate overview map:', error);
        // Draw fallback placeholder
        tempCtx.fillStyle = '#f0f0f0';
        tempCtx.fillRect(0, 0, 800, 600);
        const fallbackUrl = tempCanvas.toDataURL('image/png', 1.0);
        doc.addImage(fallbackUrl, 'PNG', smallMapX, smallMapY, smallMapWidth, smallMapHeight);
    }
}

/**
 * Draw map tiles on canvas
 */
async function drawMapTiles(ctx, lat, lng, zoom) {
    const deg2tile = (lat, lon, zoom) => {
        const latRad = lat * Math.PI / 180;
        const n = Math.pow(2, zoom);
        return [
            ((lon + 180) / 360) * n,
            (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n
        ];
    };
    
    const [centerTileX, centerTileY] = deg2tile(lat, lng, zoom);
    const startX = Math.floor(centerTileX - 2);
    const startY = Math.floor(centerTileY - 2);
    const endX = startX + 5;
    const endY = startY + 5;
    
    const tileCanvas = document.createElement('canvas');
    tileCanvas.width = 1280;
    tileCanvas.height = 1280;
    const tileCtx = tileCanvas.getContext('2d');
    
    const tilePromises = [];
    for (let x = startX; x < endX; x++) {
        for (let y = startY; y < endY; y++) {
            const tileUrl = `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
            tilePromises.push(new Promise((resolve) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                    tileCtx.drawImage(img, (x - startX) * 256, (y - startY) * 256, 256, 256);
                    resolve();
                };
                img.onerror = () => resolve();
                img.src = tileUrl;
            }));
        }
    }
    await Promise.all(tilePromises);
    
    const sitePixelX = (centerTileX - startX) * 256;
    const sitePixelY = (centerTileY - startY) * 256;
    const offsetX = sitePixelX - 400;
    const offsetY = sitePixelY - 300;
    ctx.drawImage(tileCanvas, -offsetX, -offsetY);
}

/**
 * Add site location information box
 */
function addSiteLocationInfo(doc, margin, pageW, selectedSiteLocation) {
    const locationBoxWidth = (pageW - 20) * 0.6;
    let locationStartY = 29;
    
    // Section title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(139, 0, 0);
    doc.text('Site Location Information', margin + 5, locationStartY);
    
    // Info box background
    doc.setFillColor(240, 245, 255);
    doc.setDrawColor(139, 0, 0);
    doc.setLineWidth(0.5);
    doc.rect(margin + 5, locationStartY + 3, locationBoxWidth - 5, 15, 'FD');
    
    // Address details
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    let locationY = locationStartY + 10;
    
    doc.setFont('helvetica', 'bold');
    doc.text('Address:', margin + 10, locationY);
    doc.setFont('helvetica', 'normal');
    const addressLines = doc.splitTextToSize(selectedSiteLocation.address, locationBoxWidth - 45);
    doc.text(addressLines, margin + 35, locationY);
}

/**
 * Add population and age table
 */
function addPopulationTable(doc, margin, pageW, censusResults) {
    const locationBoxWidth = (pageW - 20) * 0.6;
    let table1Y = 60;
    
    // Table title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(139, 0, 0);
    doc.text('Population & Age Demographics', margin + 5, table1Y);
    table1Y += 5;
    
    // Table header
    doc.setFillColor(139, 0, 0);
    doc.rect(margin + 5, table1Y, locationBoxWidth - 5, 8, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    
    const colMetric = margin + 8;
    const col1Mile = margin + 60;
    const col3Mile = margin + 80;
    const col5Mile = margin + 100;
    table1Y += 6;
    
    doc.text('Metric', colMetric, table1Y);
    doc.text('1 Mile', col1Mile, table1Y);
    doc.text('3 Mile', col3Mile, table1Y);
    doc.text('5 Mile', col5Mile, table1Y);
    
    // Table data
    const populationData = [
        { metric: 'Total Population', oneMile: formatNumber(censusResults['1_mile'].population), threeMile: formatNumber(censusResults['3_mile'].population), fiveMile: formatNumber(censusResults['5_mile'].population) },
        { metric: 'Avg Age', oneMile: formatDecimal(censusResults['1_mile'].avg_age), threeMile: formatDecimal(censusResults['3_mile'].avg_age), fiveMile: formatDecimal(censusResults['5_mile'].avg_age) },
        { metric: 'Avg Age (Male)', oneMile: formatDecimal(censusResults['1_mile'].avg_age_male), threeMile: formatDecimal(censusResults['3_mile'].avg_age_male), fiveMile: formatDecimal(censusResults['5_mile'].avg_age_male) },
        { metric: 'Avg Age (Female)', oneMile: formatDecimal(censusResults['1_mile'].avg_age_female), threeMile: formatDecimal(censusResults['3_mile'].avg_age_female), fiveMile: formatDecimal(censusResults['5_mile'].avg_age_female) }
    ];
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    table1Y += 4;
    
    populationData.forEach((row, idx) => {
        doc.setFillColor(idx % 2 === 0 ? 240 : 255, idx % 2 === 0 ? 245 : 255, 255);
        doc.rect(margin + 5, table1Y - 3, locationBoxWidth - 5, 6, 'F');
        doc.setFont('helvetica', 'bold');
        doc.text(row.metric, colMetric, table1Y);
        doc.setFont('helvetica', 'normal');
        doc.text(row.oneMile, col1Mile, table1Y);
        doc.text(row.threeMile, col3Mile, table1Y);
        doc.text(row.fiveMile, col5Mile, table1Y);
        table1Y += 6;
    });
    
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.3);
    doc.rect(margin + 5, 65, locationBoxWidth - 5, table1Y - 65);
}

/**
 * Add household and income table
 */
function addHouseholdTable(doc, margin, pageW, censusResults) {
    const locationBoxWidth = (pageW - 20) * 0.6;
    let table2Y = 105;  // Increased spacing from 95 to 105
    
    // Table title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(139, 0, 0);
    doc.text('Households & Income', margin + 5, table2Y);
    table2Y += 5;
    
    // Table header
    doc.setFillColor(139, 0, 0);
    doc.rect(margin + 5, table2Y, locationBoxWidth - 5, 8, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    
    const colMetric = margin + 8;
    const col1Mile = margin + 60;
    const col3Mile = margin + 80;
    const col5Mile = margin + 100;
    table2Y += 6;
    
    doc.text('Metric', colMetric, table2Y);
    doc.text('1 Mile', col1Mile, table2Y);
    doc.text('3 Mile', col3Mile, table2Y);
    doc.text('5 Mile', col5Mile, table2Y);
    
    // Table data
    const householdData = [
        { metric: 'Total Households', oneMile: formatNumber(censusResults['1_mile'].households), threeMile: formatNumber(censusResults['3_mile'].households), fiveMile: formatNumber(censusResults['5_mile'].households) },
        { metric: 'Persons per HH', oneMile: formatDecimal(censusResults['1_mile'].avg_hh_size), threeMile: formatDecimal(censusResults['3_mile'].avg_hh_size), fiveMile: formatDecimal(censusResults['5_mile'].avg_hh_size) },
        { metric: 'Avg HH Income', oneMile: formatCurrency(censusResults['1_mile'].avg_median_income), threeMile: formatCurrency(censusResults['3_mile'].avg_median_income), fiveMile: formatCurrency(censusResults['5_mile'].avg_median_income) },
        { metric: 'Avg Home Value', oneMile: formatCurrency(censusResults['1_mile'].avg_median_home_value), threeMile: formatCurrency(censusResults['3_mile'].avg_median_home_value), fiveMile: formatCurrency(censusResults['5_mile'].avg_median_home_value) }
    ];
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    table2Y += 4;
    
    householdData.forEach((row, idx) => {
        doc.setFillColor(idx % 2 === 0 ? 240 : 255, idx % 2 === 0 ? 245 : 255, 255);
        doc.rect(margin + 5, table2Y - 3, locationBoxWidth - 5, 6, 'F');
        doc.setFont('helvetica', 'bold');
        doc.text(row.metric, colMetric, table2Y);
        doc.setFont('helvetica', 'normal');
        doc.text(row.oneMile, col1Mile, table2Y);
        doc.text(row.threeMile, col3Mile, table2Y);
        doc.text(row.fiveMile, col5Mile, table2Y);
        table2Y += 6;
    });
    
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.3);
    doc.rect(margin + 5, 110, locationBoxWidth - 5, table2Y - 110);  // Updated Y position from 100 to 110
    
    // Add census disclaimer OUTSIDE the box
    const noteY = table2Y + 6;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('* Data derived from U.S. Census Bureau', margin + 5, noteY);
}

/**
 * Add census disclaimer
 */
function addCensusDisclaimer(doc, margin, pageW, pageH) {
    // This is now added inside addHouseholdTable function
    // Keeping this function for compatibility but it does nothing
}