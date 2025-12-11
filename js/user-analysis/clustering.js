// ==================== POI CLUSTERING LOGIC ====================

import {
  MAP_WIDTH,
  MAP_HEIGHT,
  allPOIsDataByCategory,
  selectedPOIs,
  poiClusters,
  setPOIClusters,
  highwayData,
  originalClusterAssignments,
  setOriginalClusterAssignments,
  clusteringComplete,
  setClusteringComplete,
} from "./state.js";
import { calculateDistance } from "./utilities.js";

// Clustering configuration
const CLUSTER_RADIUS_METERS_PRIMARY = 100; // 100 meter radius for primary clustering
const CLUSTER_RADIUS_MILES_PRIMARY = CLUSTER_RADIUS_METERS_PRIMARY / 1609.34;

const CLUSTER_RADIUS_MILES_SECONDARY = 0.3; // 0.3 mile radius for secondary clustering

/**
 * Pre-cluster POIs that are at the exact same location (same building)
 */
function preclusterSameLocationPOIs(allPOIs) {
  const locationGroups = new Map();
  const clustered = new Set();
  const preclusters = [];

  console.log("\n--- PHASE 0: Same Location Pre-Clustering ---");

  // Group POIs by exact location
  allPOIs.forEach((poiData, idx) => {
    const locationKey = `${poiData.poi.lat.toFixed(
      6
    )},${poiData.poi.lng.toFixed(6)}`;

    if (!locationGroups.has(locationKey)) {
      locationGroups.set(locationKey, []);
    }
    locationGroups.get(locationKey).push(idx);
  });

  // Create clusters for locations with 2+ POIs
  locationGroups.forEach((indices, locationKey) => {
    if (indices.length >= 2) {
      console.log(
        `Found ${indices.length} POIs at same location: ${locationKey}`
      );

      const clusterPOIs = indices.map((idx) => allPOIs[idx]);
      const poi = clusterPOIs[0].poi;

      // Position cluster AT the mean point initially (no offset)
      const cluster = {
        id: `same_location_${preclusters.length}`,
        pois: clusterPOIs,
        meanX: meanX,
        meanY: meanY,
        clusterX: meanX, // ⭐ No offset
        clusterY: meanY, // ⭐ No offset
        size: 80,
        phase: "same-location",
        isDragged: false, // ⭐ Explicitly set to false
      };

      preclusters.push(cluster);
      indices.forEach((idx) => clustered.add(idx));

      console.log(
        `  Created same-location cluster: ${clusterPOIs
          .map((p) => p.poi.name)
          .join(", ")}`
      );
    }
  });

  console.log(
    `✓ Phase 0 complete: ${clustered.size} POIs pre-clustered in ${preclusters.length} same-location clusters`
  );

  return { preclusters, clustered };
}

/**
 * Create POI clusters - only runs ONCE on initial load
 */
export function createPOIClusters() {
  // ⭐ If clustering already complete, restore from saved assignments
  if (clusteringComplete && originalClusterAssignments) {
    console.log("✓ Clustering already complete - restoring saved clusters");
    restoreSavedClusters();
    return;
  }

  const clusters = [];

  // Collect all POIs (excluding highways and site marker)
  const allPOIs = [];
  for (const [category, pois] of Object.entries(allPOIsDataByCategory)) {
    for (let idx = 0; idx < pois.length; idx++) {
      if (selectedPOIs[category] && selectedPOIs[category][idx]) {
        allPOIs.push({ poi: pois[idx], category, idx });
      }
    }
  }

  console.log(`\n=== CLUSTERING: Processing ${allPOIs.length} POIs ===`);

  // Track which POIs have been clustered
  const clustered = new Set();

  // ========== PHASE 0: Same Location Pre-Clustering ==========
  console.log("\n--- PHASE 0: Same Location Pre-Clustering ---");
  const { preclusters, clustered: preclusteredIndices } =
    preclusterSameLocationPOIs(allPOIs);
  clusters.push(...preclusters);

  // Mark pre-clustered POIs as already clustered
  preclusteredIndices.forEach((idx) => clustered.add(idx));

  // ========== PHASE 1: 100m Clustering ==========
  console.log("\n--- PHASE 1: 100m Radius Clustering ---");

  for (let i = 0; i < allPOIs.length; i++) {
    if (clustered.has(i)) continue;

    const poi1 = allPOIs[i];

    // STEP 1: Find all POIs within 100m radius
    const nearbyPOIs = [i]; // Start with current POI

    for (let j = i + 1; j < allPOIs.length; j++) {
      if (clustered.has(j)) continue;

      const poi2 = allPOIs[j];

      // Calculate distance in miles
      const distanceMiles =
        calculateDistance(
          poi1.poi.lat,
          poi1.poi.lng,
          poi2.poi.lat,
          poi2.poi.lng
        ) / 1.60934; // Convert km to miles

      if (distanceMiles <= CLUSTER_RADIUS_MILES_PRIMARY) {
        nearbyPOIs.push(j);
      }
    }

    // Need at least 2 POIs to form a cluster
    if (nearbyPOIs.length < 2) {
      continue;
    }

    console.log(
      `Found ${nearbyPOIs.length} POIs within 100m of ${poi1.poi.name}`
    );

    // STEP 2: Check if POIs are on the same side of highways
    const sameSideGroups = groupBySideOfHighway(nearbyPOIs, allPOIs);

    // Create clusters from each group that has 2+ POIs
    sameSideGroups.forEach((group) => {
      if (group.length >= 2) {
        createClusterFromGroup(group, allPOIs, clusters, clustered, "100m");
      }
    });
  }

  console.log(
    `✓ Phase 1 complete: ${clustered.size} POIs clustered in ${clusters.length} clusters`
  );

  // ========== PHASE 2: 0.3 Mile Clustering (Fallback) ==========
  console.log("\n--- PHASE 2: 0.3 Mile Radius Clustering (Fallback) ---");

  const unclusteredBefore = allPOIs.length - clustered.size;
  console.log(
    `Attempting to cluster ${unclusteredBefore} remaining POIs with 0.3 mile radius...`
  );

  for (let i = 0; i < allPOIs.length; i++) {
    if (clustered.has(i)) continue;

    const poi1 = allPOIs[i];

    // Find all POIs within 0.3 mile radius
    const nearbyPOIs = [i];

    for (let j = i + 1; j < allPOIs.length; j++) {
      if (clustered.has(j)) continue;

      const poi2 = allPOIs[j];

      const distanceMiles =
        calculateDistance(
          poi1.poi.lat,
          poi1.poi.lng,
          poi2.poi.lat,
          poi2.poi.lng
        ) / 1.60934;

      if (distanceMiles <= CLUSTER_RADIUS_MILES_SECONDARY) {
        nearbyPOIs.push(j);
      }
    }

    // Need at least 2 POIs to form a cluster
    if (nearbyPOIs.length < 2) {
      continue;
    }

    console.log(
      `Found ${nearbyPOIs.length} POIs within 0.3 mile of ${poi1.poi.name}`
    );

    // Check if POIs are on the same side of highways
    const sameSideGroups = groupBySideOfHighway(nearbyPOIs, allPOIs);

    // Create clusters from each group that has 2+ POIs
    sameSideGroups.forEach((group) => {
      if (group.length >= 2) {
        createClusterFromGroup(group, allPOIs, clusters, clustered, "0.3mi");
      }
    });
  }

  console.log(`✓ Phase 2 complete: ${clustered.size} total POIs clustered`);

  setPOIClusters(clusters);

  // ⭐ SAVE cluster assignments permanently
  saveClusterAssignments(clusters);
  setClusteringComplete(true);

  console.log(`\n=== CLUSTERING COMPLETE ===`);
  console.log(`✓ Total clusters created: ${clusters.length}`);
  console.log(`✓ POIs clustered: ${clustered.size}`);
  console.log(
    `✓ POIs remaining individual: ${allPOIs.length - clustered.size}`
  );
  console.log(`✓ Cluster assignments saved - will not recalculate`);
}

/**
 * ⭐ NEW: Save cluster assignments to permanent storage
 */
function saveClusterAssignments(clusters) {
  const assignments = {
    clusters: clusters.map((cluster) => ({
      id: cluster.id,
      pois: cluster.pois.map((p) => ({
        category: p.category,
        idx: p.idx,
        poiId: p.poi.id,
      })),
      meanX: cluster.meanX,
      meanY: cluster.meanY,
      clusterX: cluster.clusterX,
      clusterY: cluster.clusterY,
      size: cluster.size,
      phase: cluster.phase,
    })),
  };

  setOriginalClusterAssignments(assignments);
  console.log(
    "✓ Saved cluster assignments for",
    assignments.clusters.length,
    "clusters"
  );
}

/**
 * ✅ NEW: Restore clusters from saved assignments (filters based on current selection)
 */
function restoreSavedClusters() {
    if (!originalClusterAssignments) {
        console.warn('No saved cluster assignments found');
        return;
    }

    const restoredClusters = [];

    originalClusterAssignments.clusters.forEach((savedCluster) => {
        // Filter to only include POIs that are currently selected
        const availablePOIs = [];

        savedCluster.pois.forEach((savedPOI) => {
            const category = savedPOI.category;
            const idx = savedPOI.idx;

            // Check if this POI is currently selected
            if (selectedPOIs[category] && selectedPOIs[category][idx]) {
                // Get the actual POI object
                const poi = allPOIsDataByCategory[category][idx];
                if (poi) {
                    availablePOIs.push({
                        poi: poi,
                        category: category,
                        idx: idx,
                    });
                }
            }
        });

        // Only create cluster if at least 2 POIs are still selected
        if (availablePOIs.length >= 2) {
            // ✅ FIX: Recalculate mean position based on available POIs
            const meanX =
                availablePOIs.reduce((sum, p) => sum + p.poi.pixelX, 0) /
                availablePOIs.length;
            const meanY =
                availablePOIs.reduce((sum, p) => sum + p.poi.pixelY, 0) /
                availablePOIs.length;

            const cluster = {
                id: savedCluster.id,
                pois: availablePOIs,
                meanX: meanX,
                meanY: meanY,
                clusterX: meanX,  // ✅ FIX: Use recalculated position
                clusterY: meanY,  // ✅ FIX: Use recalculated position
                size: savedCluster.size,
                phase: savedCluster.phase,
                isDragged: false  // ✅ FIX: Reset drag state
            };

            restoredClusters.push(cluster);
        }
    });

    setPOIClusters(restoredClusters);
    console.log(
        `✅ Restored ${restoredClusters.length} clusters from saved assignments with corrected positions`
    );
}

/**
 * Group POIs by which side of highways they're on
 */
function groupBySideOfHighway(poiIndices, allPOIs) {
  if (highwayData.length === 0) {
    // No highways, all POIs are in same group
    return [poiIndices];
  }

  const groups = [];
  const assigned = new Set();

  for (const poiIdx of poiIndices) {
    if (assigned.has(poiIdx)) continue;

    const group = [poiIdx];
    assigned.add(poiIdx);

    const poi1 = allPOIs[poiIdx];

    // Find other POIs on the same side
    for (const otherIdx of poiIndices) {
      if (assigned.has(otherIdx)) continue;

      const poi2 = allPOIs[otherIdx];

      if (areOnSameSideOfHighways(poi1.poi, poi2.poi)) {
        group.push(otherIdx);
        assigned.add(otherIdx);
      }
    }

    groups.push(group);
  }

  console.log(`  Grouped into ${groups.length} side(s) of highway`);
  return groups;
}

/**
 * Check if two POIs are on the same side of all highways
 */
function areOnSameSideOfHighways(poi1, poi2) {
  // Check each highway
  for (const highway of highwayData) {
    if (!highway.pixelPath || highway.pixelPath.length < 2) continue;

    // Find the closest segment of the highway to these POIs
    const closestSegment = findClosestHighwaySegment(highway, poi1, poi2);

    if (closestSegment) {
      const [x1, y1] = closestSegment.start;
      const [x2, y2] = closestSegment.end;

      // Calculate which side each POI is on
      const side1 = getPointSideOfLine(
        x1,
        y1,
        x2,
        y2,
        poi1.pixelX,
        poi1.pixelY
      );
      const side2 = getPointSideOfLine(
        x1,
        y1,
        x2,
        y2,
        poi2.pixelX,
        poi2.pixelY
      );

      // If they're on opposite sides of any highway, return false
      if (side1 !== 0 && side2 !== 0 && side1 !== side2) {
        console.log(
          `  POIs ${poi1.name} and ${poi2.name} are on opposite sides of ${highway.name}`
        );
        return false;
      }
    }
  }

  return true; // Same side of all highways (or no relevant highways)
}

/**
 * Find the closest highway segment to two POIs
 */
function findClosestHighwaySegment(highway, poi1, poi2) {
  let minDist = Infinity;
  let closestSegment = null;

  const midX = (poi1.pixelX + poi2.pixelX) / 2;
  const midY = (poi1.pixelY + poi2.pixelY) / 2;

  for (let i = 0; i < highway.pixelPath.length - 1; i++) {
    const start = highway.pixelPath[i];
    const end = highway.pixelPath[i + 1];

    // Distance from midpoint to this segment
    const dist = distanceToLineSegment(
      midX,
      midY,
      start[0],
      start[1],
      end[0],
      end[1]
    );

    if (dist < minDist) {
      minDist = dist;
      closestSegment = { start, end };
    }
  }

  // Only consider segments that are reasonably close (within 200 pixels)
  return minDist < 200 ? closestSegment : null;
}

/**
 * Calculate which side of a line a point is on
 * Returns: 1 (left), -1 (right), 0 (on line)
 */
function getPointSideOfLine(x1, y1, x2, y2, px, py) {
  const d = (px - x1) * (y2 - y1) - (py - y1) * (x2 - x1);
  if (Math.abs(d) < 1) return 0; // On the line
  return d > 0 ? 1 : -1;
}

/**
 * Calculate distance from point to line segment
 */
function distanceToLineSegment(px, py, x1, y1, x2, y2) {
  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;

  if (lenSq !== 0) param = dot / lenSq;

  let xx, yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  const dx = px - xx;
  const dy = py - yy;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Create a cluster from a group of POI indices
 */
function createClusterFromGroup(group, allPOIs, clusters, clustered, phase) {
  const clusterPOIs = group.map((idx) => allPOIs[idx]);

  // Calculate mean position
  const meanX =
    clusterPOIs.reduce((sum, p) => sum + p.poi.pixelX, 0) / clusterPOIs.length;
  const meanY =
    clusterPOIs.reduce((sum, p) => sum + p.poi.pixelY, 0) / clusterPOIs.length;

  const cluster = {
    id: `cluster_${clusters.length}`,
    pois: clusterPOIs,
    meanX: meanX,
    meanY: meanY,
    clusterX: meanX, // ⭐ No offset - positioned at mean
    clusterY: meanY, // ⭐ No offset - positioned at mean
    size: 80,
    phase: phase,
    isDragged: false, // ⭐ Explicitly set to false initially
  };

  // Adjust for overlaps with highways
  const adjusted = adjustForOverlaps(cluster);
  cluster.clusterX = adjusted.x;
  cluster.clusterY = adjusted.y;

  clusters.push(cluster);

  // Mark these POIs as clustered
  group.forEach((idx) => clustered.add(idx));

  console.log(
    `  [${phase}] Created cluster with ${clusterPOIs.length} POIs: ${clusterPOIs
      .map((p) => p.poi.name)
      .join(", ")}`
  );
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
      const angle = Math.atan2(
        cluster.clusterY - hw.pixelY,
        cluster.clusterX - hw.pixelX
      );
      return {
        x: hw.pixelX + Math.cos(angle) * 120,
        y: hw.pixelY + Math.sin(angle) * 120,
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
          const angle = Math.atan2(
            cluster.clusterY - hw.pixelY,
            cluster.clusterX - hw.pixelX
          );
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
          cluster.clusterX =
            otherCluster.clusterX + Math.cos(angle) * (MIN_DISTANCE + 20);
          cluster.clusterY =
            otherCluster.clusterY + Math.sin(angle) * (MIN_DISTANCE + 20);
          adjusted = true;
          break;
        }
      }

      // Ensure cluster stays within map bounds
      const clusterRadius = cluster.size / 2;
      if (cluster.clusterX - clusterRadius < 0)
        cluster.clusterX = clusterRadius;
      if (cluster.clusterX + clusterRadius > MAP_WIDTH)
        cluster.clusterX = MAP_WIDTH - clusterRadius;
      if (cluster.clusterY - clusterRadius < 0)
        cluster.clusterY = clusterRadius;
      if (cluster.clusterY + clusterRadius > MAP_HEIGHT)
        cluster.clusterY = MAP_HEIGHT - clusterRadius;
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
      Math.pow(x - hw.pixelX, 2) + Math.pow(y - hw.pixelY, 2)
    );

    if (dist < radius + 60) {
      return { collides: true, highway: hw, distance: dist };
    }
  }

  // Check collision with site marker
  if (window.siteMarkerPosition) {
    const dist = Math.sqrt(
      Math.pow(x - window.siteMarkerPosition.x, 2) +
        Math.pow(y - window.siteMarkerPosition.y, 2)
    );

    if (dist < radius + window.siteMarkerPosition.radius + 40) {
      return { collides: true, siteMarker: true, distance: dist };
    }
  }

  return { collides: false };
}

/**
 * Find safe position for POI to avoid collisions
 */
export function findSafePosition(
  originalX,
  originalY,
  radius,
  maxAttempts = 12
) {
  const angleStep = (Math.PI * 2) / maxAttempts;
  const distances = [100, 120, 140, 160];

  for (const distance of distances) {
    for (let i = 0; i < maxAttempts; i++) {
      const angle = i * angleStep;
      const newX = originalX + Math.cos(angle) * distance;
      const newY = originalY + Math.sin(angle) * distance;

      // Check if within bounds
      if (
        newX < radius ||
        newX > MAP_WIDTH - radius ||
        newY < radius ||
        newY > MAP_HEIGHT - radius
      ) {
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
