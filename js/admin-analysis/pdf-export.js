// js/admin-analysis/pdf-export.js
import * as State from './state.js';
import { categorizeRoute } from './utilities.js';

export async function generatePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageW = 297, pageH = 210, margin = 15;
    const btn = document.getElementById('exportBtn');
    
    if (!State.map || !State.rectangleBounds) {
        alert('Map not ready or bounds not calculated.');
        return;
    }
    
    btn.disabled = true;
    btn.innerText = '⏳ Generating PDF...';
    
    try {
        const siteName = State.selectedSiteLocation.address.split(',')[0];
        const sitePincode = getSitePincode();
        
        // PAGE 1: COVER PAGE
        doc.setFontSize(28).setFont(undefined, 'bold');
        doc.setTextColor(139, 0, 0);
        doc.text('SITE ANALYSIS REPORT', pageW / 2, 40, { align: 'center' });
        
        doc.setFontSize(14).setFont(undefined, 'normal');
        doc.setTextColor(80, 80, 80);
        
        let y = 70;
        doc.text('Location Name:', margin + 20, y);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(siteName, margin + 70, y);
        
        y += 12;
        doc.setFont(undefined, 'normal');
        doc.setTextColor(80, 80, 80);
        doc.text('Location Pincode:', margin + 20, y);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(sitePincode, margin + 70, y);
        
        y += 12;
        doc.setFont(undefined, 'normal');
        doc.setTextColor(80, 80, 80);
        doc.text('Search Area:', margin + 20, y);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(`${State.analysisParams.radius} miles`, margin + 70, y);
        
        // PAGE 2: FULL-PAGE SQUARE MAP (NO TITLE, NO COORDINATES)
        doc.addPage();
        const mapImage = await captureRectangleMapImage();
        
        if (mapImage) {
            // Calculate maximum square size that fits the page
            const availableWidth = pageW - (margin * 2);
            const availableHeight = pageH - (margin * 2);
            const maxSize = Math.min(availableWidth, availableHeight);
            
            // Center the square on the page
            const xPos = (pageW - maxSize) / 2;
            const yPos = (pageH - maxSize) / 2;
            
            doc.addImage(mapImage, 'PNG', xPos, yPos, maxSize, maxSize);
        }
        
        // PAGE 3: RECTANGLE COORDINATES
        doc.addPage();
        doc.setFontSize(18).setFont(undefined, 'bold');
        doc.setTextColor(139, 0, 0);
        doc.text('Rectangle Coordinates', pageW / 2, 20, { align: 'center' });
        
        y = 40;
        doc.setFontSize(11).setFont(undefined, 'normal');
        doc.setTextColor(0, 0, 0);
        
        doc.setFont(undefined, 'bold');
        doc.text('Top Left:', margin, y);
        doc.setFont(undefined, 'normal');
        doc.text(`${State.rectangleBounds.topLeft.lat.toFixed(6)}, ${State.rectangleBounds.topLeft.lng.toFixed(6)}`, margin + 30, y);
        
        y += 10;
        doc.setFont(undefined, 'bold');
        doc.text('Top Right:', margin, y);
        doc.setFont(undefined, 'normal');
        doc.text(`${State.rectangleBounds.topRight.lat.toFixed(6)}, ${State.rectangleBounds.topRight.lng.toFixed(6)}`, margin + 30, y);
        
        y += 10;
        doc.setFont(undefined, 'bold');
        doc.text('Bottom Left:', margin, y);
        doc.setFont(undefined, 'normal');
        doc.text(`${State.rectangleBounds.bottomLeft.lat.toFixed(6)}, ${State.rectangleBounds.bottomLeft.lng.toFixed(6)}`, margin + 30, y);
        
        y += 10;
        doc.setFont(undefined, 'bold');
        doc.text('Bottom Right:', margin, y);
        doc.setFont(undefined, 'normal');
        doc.text(`${State.rectangleBounds.bottomRight.lat.toFixed(6)}, ${State.rectangleBounds.bottomRight.lng.toFixed(6)}`, margin + 30, y);
        
        // PAGE 4+: ALL POI CATEGORIES ON SAME PAGES
        doc.addPage();
        doc.setFontSize(20).setFont(undefined, 'bold');
        doc.setTextColor(139, 0, 0);
        doc.text('Points of Interest Details', pageW / 2, 20, { align: 'center' });
        
        y = 35;
        let categoryIndex = 1;
        
        for (const [category, pois] of Object.entries(State.allPOIsDataByCategory)) {
            if (pois.length === 0) continue;
            
            // Check if we need a new page (leave space for category header + at least 2 POIs)
            if (y > pageH - 60) {
                doc.addPage();
                y = 20;
            }
            
            // Category Header
            doc.setFontSize(14).setFont(undefined, 'bold');
            doc.setTextColor(139, 0, 0);
            doc.text(`${categoryIndex}. ${category.replace(/_/g, ' ').toUpperCase()}`, margin, y);
            
            y += 8;
            doc.setFontSize(10).setFont(undefined, 'normal');
            doc.setTextColor(0, 0, 0);
            
            pois.forEach((poi, idx) => {
                // Check if we need new page for this POI entry
                if (y > pageH - 25) {
                    doc.addPage();
                    y = 20;
                }
                
                // Roman numerals for sub-items
                const roman = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii', 'xiii', 'xiv', 'xv'];
                doc.setFont(undefined, 'bold');
                doc.text(`   ${roman[idx] || (idx + 1)}. ${poi.name}`, margin + 5, y);
                
                y += 5;
                doc.setFont(undefined, 'normal');
                doc.setFontSize(9);
                doc.text(`      Coordinates: ${poi.coordinates}`, margin + 5, y);
                
                y += 4;
                
                // Wrap long addresses
                const maxAddressWidth = pageW - margin - 50;
                const addressLines = doc.splitTextToSize(`      Address: ${poi.address}`, maxAddressWidth);
                
                addressLines.forEach(line => {
                    if (y > pageH - 15) {
                        doc.addPage();
                        y = 20;
                    }
                    doc.text(line, margin + 5, y);
                    y += 4;
                });
                
                doc.text(`      Distance: ${poi.distanceMiles.toFixed(2)} miles`, margin + 5, y);
                y += 7;
                doc.setFontSize(10);
            });
            
            y += 5; // Space between categories
            categoryIndex++;
        }
        
        // HIGHWAYS SECTION (on same page structure)
        if (State.highwayData.length > 0) {
            // Check if we need a new page
            if (y > pageH - 50) {
                doc.addPage();
                y = 20;
            }
            
            doc.setFontSize(14).setFont(undefined, 'bold');
            doc.setTextColor(0, 102, 204);
            doc.text('Highways & Main Routes', margin, y);
            
            y += 8;
            doc.setFontSize(10).setFont(undefined, 'normal');
            doc.setTextColor(0, 0, 0);
            
            State.highwayData.forEach((hw, idx) => {
                if (y > pageH - 20) {
                    doc.addPage();
                    y = 20;
                }
                
                const roman = ['i', 'ii', 'iii', 'iv'];
                doc.setFont(undefined, 'bold');
                doc.text(`   ${roman[idx]}. ${hw.name} (${categorizeRoute(hw.type)})`, margin + 5, y);
                
                y += 5;
                doc.setFont(undefined, 'normal');
                doc.setFontSize(9);
                
                if (hw.ref) {
                    doc.text(`      Reference: ${hw.ref}`, margin + 5, y);
                    y += 4;
                }
                
                doc.text(`      Distance: ${hw.distanceMiles.toFixed(2)} miles`, margin + 5, y);
                y += 7;
                doc.setFontSize(10);
            });
        }
        
        // Page numbers
        const total = doc.internal.getNumberOfPages();
        for (let i = 1; i <= total; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(120, 120, 120);
            doc.text(`Page ${i} of ${total}`, pageW / 2, pageH - 5, { align: 'center' });
        }
        
        const dateStr = new Date().toISOString().slice(0, 10);
        doc.save(`Site_Analysis_${dateStr}.pdf`);
    } catch (err) {
        console.error('PDF generation error:', err);
        alert('Error generating PDF. Check console for details.');
    } finally {
        btn.disabled = false;
        btn.innerText = '📄 Finish & Export PDF';
    }
}

async function captureRectangleMapImage() {
    try {
        hideAllMapElements();
        
        const bounds = L.latLngBounds(
            [State.rectangleBounds.south, State.rectangleBounds.west],
            [State.rectangleBounds.north, State.rectangleBounds.east]
        );
        
        // Get map container
        const container = State.map.getContainer();
        const originalWidth = container.clientWidth;
        const originalHeight = container.clientHeight;
        
        // Calculate aspect ratio and resize to SQUARE for radius circle
        const deltaLat = State.rectangleBounds.north - State.rectangleBounds.south;
        const deltaLng = State.rectangleBounds.east - State.rectangleBounds.west;
        const avgLat = (State.rectangleBounds.north + State.rectangleBounds.south) / 2;
        
        // Make it square by using the larger dimension
        const latDistance = deltaLat;
        const lngDistance = deltaLng * Math.cos(avgLat * Math.PI / 180);
        const maxDimension = Math.max(latDistance, lngDistance);
        
        // Set square dimensions
        const squareSize = 800; // Fixed square size for better quality
        
        container.style.width = `${squareSize}px`;
        container.style.height = `${squareSize}px`;
        
        State.map.invalidateSize();
        
        // Fit exactly to bounds with no padding
        State.map.fitBounds(bounds, {
            padding: [0, 0],
            animate: false,
            maxZoom: 15
        });
        
        await delay(2000);  // Allow tiles to fully load
        
        // Capture at HIGH resolution (scale=4 for 4x DPI)
        const canvas = await html2canvas(container, {
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#f0f0f0',
            scale: 4,  // HIGH DPI - 4x resolution
            logging: false,
            width: squareSize,
            height: squareSize
        });
        
        // Restore original size
        container.style.width = `${originalWidth}px`;
        container.style.height = `${originalHeight}px`;
        
        State.map.invalidateSize();
        
        showAllMapElements();
        
        return canvas.toDataURL('image/png', 1.0);
    } catch (error) {
        console.error('Map capture error:', error);
        showAllMapElements();
        return null;
    }
}

function hideAllMapElements() {
    if (State.siteMarker) State.map.removeLayer(State.siteMarker);
    if (State.searchAreaShape) State.map.removeLayer(State.searchAreaShape);
    
    Object.keys(State.allPOIsDataByCategory).forEach(cat => {
        State.allPOIsDataByCategory[cat].forEach(poi => {
            if (poi.marker) State.map.removeLayer(poi.marker);
        });
    });
    
    State.highwayLayers.forEach(layer => {
        if (layer) State.map.removeLayer(layer);
    });
    
    State.highwayData.forEach(hw => {
        if (hw.marker) State.map.removeLayer(hw.marker);
    });
}

function showAllMapElements() {
    if (State.siteMarker) State.siteMarker.addTo(State.map);
    if (State.searchAreaShape) State.searchAreaShape.addTo(State.map);
    
    Object.keys(State.allPOIsDataByCategory).forEach(cat => {
        State.allPOIsDataByCategory[cat].forEach(poi => {
            if (poi.marker && poi.visible) poi.marker.addTo(State.map);
        });
    });
    
    State.highwayData.forEach(hw => {
        if (hw.marker && hw.visible) hw.marker.addTo(State.map);
    });
    
    fitMapToRadius();
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

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getSitePincode() {
    try {
        for (const c of Object.keys(State.allPOIsDataByCategory || {})) {
            const arr = State.allPOIsDataByCategory[c] || [];
            if (arr.length && arr[0].postalCode && arr[0].postalCode !== 'N/A') return arr[0].postalCode;
        }
    } catch (e) { }
    return 'N/A';
}