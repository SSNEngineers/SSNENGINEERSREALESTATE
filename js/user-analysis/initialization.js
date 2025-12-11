// ==================== INITIALIZATION AND MAIN FLOW ====================

import {
  setAnalysisParams,
  setSelectedSiteLocation,
  setRectangleBounds,
  analysisParams,
} from "./state.js";
import {
  calculateRectangleBounds,
  calculateAllPixelCoordinatesWithValidation,
} from "./coordinates.js";
import { fetchAllPOIs, waitForAllLogosToLoad } from "./api-fetching.js";
import { fetchHighways } from "./highway-fetching.js";
import { createPOIClusters } from "./clustering.js";
import { updateInfoPanels } from "./ui-updates.js";
import { renderStaticMap } from "./main-render.js";
import { delay } from "./utilities.js";
import { debounce } from "./utilities.js";
import { updateCanvasSize } from "./canvas-setup.js";
import { redrawStaticMap } from "./main-render.js";

/**
 * Main initialization on window load
 */
export async function initializeAnalysis() {
  try {
    // Check authentication
    const user =
      sessionStorage.getItem("ssnai_user") ||
      localStorage.getItem("ssnai_user");
    if (!user) {
      window.location.href = "login.html";
      return;
    }

    // Get analysis parameters
    const params = JSON.parse(sessionStorage.getItem("analysis_params"));
    if (!params) {
      alert("No analysis parameters found");
      window.location.href = "dashboard.html";
      return;
    }

    setAnalysisParams(params);

    // Start analysis
    await performAnalysis();
  } catch (error) {
    console.error("Initialization error:", error);
    alert("Error initializing analysis: " + error.message);
  }
}

/**
 * Main analysis flow
 */
export async function performAnalysis() {
  try {
    // Geocode address
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        analysisParams.address
      )}&limit=1`
    );
    const data = await response.json();

    if (data && data.length > 0) {
      const location = {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        address: data[0].display_name,
      };
      setSelectedSiteLocation(location);

      console.log(`Site location: ${location.lat}, ${location.lng}`);

      // Calculate rectangle bounds with padding
      const bounds = calculateRectangleBounds(
        location.lat,
        location.lng,
        analysisParams.radius
      );
      setRectangleBounds(bounds);

      console.log("Rectangle bounds calculated:", bounds);

      // Fetch all data
      console.log("Fetching POIs...");
      await fetchAllPOIs();

      console.log("Waiting before highway fetch...");
      await delay(2000);

      console.log("Fetching highways...");
      await fetchHighways();

      // Calculate pixel coordinates with validation
      console.log("Calculating coordinates...");
      calculateAllPixelCoordinatesWithValidation();

      // Wait for all logos to be fully loaded before clustering
      console.log("Waiting for all logos to load...");
      await waitForAllLogosToLoad();

      // Create clusters AFTER all logos are loaded
      console.log("Creating clusters...");
      createPOIClusters();

      // Hide loading, show content
      document.getElementById("loadingOverlay").style.display = "none";
      document.getElementById("mainContent").style.display = "grid";

      console.log("Updating UI panels...");
      updateInfoPanels();

      console.log("Rendering static map...");
      await renderStaticMap();

      // ⭐ ADD THIS LINE
      window.analysisComplete = true;

      console.log("✓ Analysis complete!");
    } else {
      alert("Location not found");
      window.location.href = "dashboard.html";
    }
  } catch (error) {
    console.error("Analysis error:", error);
    alert("Error performing analysis: " + error.message);
    console.error("Stack trace:", error.stack);
  }
}

/**
 * Setup window resize handler
 */
export function setupResizeHandler() {
  const handleResize = debounce(() => {
    console.log("Window resized, updating canvas...");
    updateCanvasSize();

    // Only recalculate and redraw if analysis is complete
    if (window.analysisComplete) {
      calculateAllPixelCoordinatesWithValidation();
      createPOIClusters();
      redrawStaticMap();
    }
  }, 300);

  window.addEventListener("resize", handleResize);
}

/**
 * Setup error handlers
 */
export function setupErrorHandlers() {
  window.addEventListener("error", (event) => {
    console.error("Global error caught:", event.error);

    const loadingOverlay = document.getElementById("loadingOverlay");
    if (loadingOverlay) {
      loadingOverlay.innerHTML = `
                <div class="loading-content">
                    <h2 style="color: #dc3545;">Error</h2>
                    <p>Something went wrong: ${event.error.message}</p>
                    <button onclick="window.location.href='dashboard.html'" 
                            style="margin-top: 20px; padding: 10px 20px; background: white; color: #8B0000; border: none; border-radius: 5px; cursor: pointer;">
                        Return to Dashboard
                    </button>
                </div>
            `;
    }
  });

  window.addEventListener("unhandledrejection", (event) => {
    console.error("Unhandled promise rejection:", event.reason);
  });
}

/**
 * Cleanup on page unload
 */
export function setupCleanupHandlers() {
  window.addEventListener("beforeunload", () => {
    // Clear caches if needed
    console.log("Cleaning up...");
  });
}
