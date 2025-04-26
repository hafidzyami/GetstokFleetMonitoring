/**
 * Utility functions for calculating distances between points and polylines
 */

/**
 * Calculate distance between two points using the Haversine formula
 * @param {Array} point1 [lat, lng] coordinates
 * @param {Array} point2 [lat, lng] coordinates
 * @returns {number} Distance in meters
 */
export function calculateHaversineDistance(point1, point2) {
  const R = 6371000; // Earth's radius in meters
  const lat1 = point1[0] * Math.PI / 180;
  const lat2 = point2[0] * Math.PI / 180;
  const deltaLat = (point2[0] - point1[0]) * Math.PI / 180;
  const deltaLng = (point2[1] - point1[1]) * Math.PI / 180;

  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
          Math.cos(lat1) * Math.cos(lat2) *
          Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate shortest distance from a point to a polyline segment
 * @param {Array} point [lat, lng] coordinates
 * @param {Array} polylinePoint1 [lat, lng] coordinates of first polyline point
 * @param {Array} polylinePoint2 [lat, lng] coordinates of second polyline point
 * @returns {Object} Object with distance and reference point
 */
function calculateDistanceToSegment(point, polylinePoint1, polylinePoint2) {
  // If segment is a point, just calculate distance to that point
  if (polylinePoint1[0] === polylinePoint2[0] && polylinePoint1[1] === polylinePoint2[1]) {
    return {
      distance: calculateHaversineDistance(point, polylinePoint1),
      referencePoint: polylinePoint1
    };
  }

  // Calculate projection of point onto line segment
  // Convert to flat Cartesian space for approximation
  const lng1 = polylinePoint1[1] * Math.cos(polylinePoint1[0] * Math.PI / 180);
  const lng2 = polylinePoint2[1] * Math.cos(polylinePoint2[0] * Math.PI / 180);
  const lngPoint = point[1] * Math.cos(point[0] * Math.PI / 180);
  
  const x1 = polylinePoint1[0];
  const y1 = lng1;
  const x2 = polylinePoint2[0];
  const y2 = lng2;
  const x = point[0];
  const y = lngPoint;

  // Vector from p1 to p2
  const dx = x2 - x1;
  const dy = y2 - y1;
  
  // Length of line segment squared
  const segmentLengthSquared = dx * dx + dy * dy;
  
  // Parameter of projection onto line (0 to 1 = on line segment)
  let projection = 0;
  
  if (segmentLengthSquared !== 0) {
    projection = ((x - x1) * dx + (y - y1) * dy) / segmentLengthSquared;
  }
  
  let closestX, closestY;
  
  if (projection < 0) {
    // Closest point is p1
    closestX = x1;
    closestY = y1;
    return {
      distance: calculateHaversineDistance(point, polylinePoint1),
      referencePoint: polylinePoint1
    };
  } else if (projection > 1) {
    // Closest point is p2
    closestX = x2;
    closestY = y2;
    return {
      distance: calculateHaversineDistance(point, polylinePoint2),
      referencePoint: polylinePoint2
    };
  } else {
    // Closest point is on segment
    closestX = x1 + projection * dx;
    closestY = y1 + projection * dy;
  }
  
  // Convert back from flat Cartesian
  const closestLng = closestY / Math.cos(closestX * Math.PI / 180);
  
  // Reference point on the polyline
  const referencePoint = [closestX, closestLng];
  
  // Calculate Haversine distance to closest point
  return {
    distance: calculateHaversineDistance(point, referencePoint),
    referencePoint: referencePoint
  };
}

/**
 * Calculate shortest distance from a point to a polyline
 * @param {Array} point [lat, lng] coordinates
 * @param {Array} polyline Array of [lat, lng] coordinates forming the polyline
 * @returns {Object} Object containing distance in meters and reference point coordinates
 */
export function calculateDistanceToPolyline(point, polyline) {
  if (!point || point.length !== 2) {
    console.error('calculateDistanceToPolyline: Invalid point:', point);
    return { distance: Infinity, referencePoint: null, segmentIndex: -1 };
  }

  if (!polyline || !Array.isArray(polyline) || polyline.length === 0) {
    console.error('calculateDistanceToPolyline: Empty or invalid polyline:', polyline);
    return { distance: Infinity, referencePoint: null, segmentIndex: -1 };
  }
  
  if (polyline.length === 1) {
    console.log('calculateDistanceToPolyline: Single point polyline');
    return { 
      distance: calculateHaversineDistance(point, polyline[0]), 
      referencePoint: polyline[0],
      segmentIndex: 0
    };
  }
  
  let minDistance = Infinity;
  let closestReferencePoint = null;
  let closestSegmentIndex = -1;
  
  // Check distance to each segment in polyline
  for (let i = 0; i < polyline.length - 1; i++) {
    try {
      const result = calculateDistanceToSegment(point, polyline[i], polyline[i + 1]);
      if (result.distance < minDistance) {
        minDistance = result.distance;
        closestReferencePoint = result.referencePoint;
        closestSegmentIndex = i;
      }
    } catch (error) {
      console.error(`Error calculating distance to segment ${i}:`, error);
    }
  }
  
  console.log(`Distance from [${point[0].toFixed(6)}, ${point[1].toFixed(6)}] to polyline (${polyline.length} points): ${minDistance.toFixed(2)}m`);
  return { 
    distance: minDistance, 
    referencePoint: closestReferencePoint,
    segmentIndex: closestSegmentIndex
  };
}
