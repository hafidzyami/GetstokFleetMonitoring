package utils

import (
	"errors"
	"math"
)

const (
	// Earth's radius in meters
	EARTH_RADIUS = 6371000
)

// LatLng represents a point with latitude and longitude coordinates
type LatLng struct {
	Lat float64
	Lng float64
}

// Decode Google Polyline format to array of LatLng
// DecodeRouteGeometry decodes a Google encoded polyline string into an array of LatLng points
// DecodeRouteGeometry decodes a Google encoded polyline string with elevation into an array of LatLng points
func DecodeRouteGeometry(encoded string) ([]LatLng, error) {
    if encoded == "" {
        return nil, errors.New("empty polyline string")
    }

    precision := 5
    factor := math.Pow10(precision)
    
    var points []LatLng
    index, lat, lng, ele := 0, 0, 0, 0
    
    for index < len(encoded) {
        // Decode latitude
        result, shift := 0, 0
        var b int
        for {
            if index >= len(encoded) {
                return nil, errors.New("invalid polyline format")
            }
            b = int(encoded[index]) - 63
            index++
            result |= (b & 0x1f) << shift
            shift += 5
            if b < 0x20 {
                break
            }
        }
        if (result & 1) != 0 {
            lat += ^(result >> 1)
        } else {
            lat += result >> 1
        }
        
        // Decode longitude
        result, shift = 0, 0
        for {
            if index >= len(encoded) {
                return nil, errors.New("invalid polyline format")
            }
            b = int(encoded[index]) - 63
            index++
            result |= (b & 0x1f) << shift
            shift += 5
            if b < 0x20 {
                break
            }
        }
        if (result & 1) != 0 {
            lng += ^(result >> 1)
        } else {
            lng += result >> 1
        }
        
        // Decode elevation (we skip it since we don't need it for distance calculations)
        // But we need to advance the index
        result, shift = 0, 0
        for {
            if index >= len(encoded) {
                break // Elevation might be optional, don't error
            }
            b = int(encoded[index]) - 63
            index++
            result |= (b & 0x1f) << shift
            shift += 5
            if b < 0x20 {
                break
            }
        }
        if (result & 1) != 0 {
            ele += ^(result >> 1)
        } else {
            ele += result >> 1
        }
        
        // Add the point to our result
        points = append(points, LatLng{
            Lat: float64(lat) / factor,
            Lng: float64(lng) / factor,
        })
    }
    
    return points, nil
}

// CalculateHaversineDistance calculates the distance between two points using the Haversine formula
func CalculateHaversineDistance(point1, point2 LatLng) float64 {
	lat1 := point1.Lat * math.Pi / 180
	lat2 := point2.Lat * math.Pi / 180
	deltaLat := (point2.Lat - point1.Lat) * math.Pi / 180
	deltaLng := (point2.Lng - point1.Lng) * math.Pi / 180

	a := math.Sin(deltaLat/2)*math.Sin(deltaLat/2) +
		math.Cos(lat1)*math.Cos(lat2)*
			math.Sin(deltaLng/2)*math.Sin(deltaLng/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	return EARTH_RADIUS * c
}

// CalculateDistanceToSegment calculates the shortest distance from a point to a line segment
// CalculateDistanceToSegment calculates the shortest distance from a point to a line segment
func CalculateDistanceToSegment(point, polylinePoint1, polylinePoint2 LatLng) (float64, LatLng) {
    // If segment is a point, just calculate distance to that point
    if polylinePoint1.Lat == polylinePoint2.Lat && polylinePoint1.Lng == polylinePoint2.Lng {
        return CalculateHaversineDistance(point, polylinePoint1), polylinePoint1
    }

    // Calculate projection of point onto line segment
    // Convert to flat Cartesian space for approximation (matching frontend)
    lng1 := polylinePoint1.Lng * math.Cos(polylinePoint1.Lat*math.Pi/180)
    lng2 := polylinePoint2.Lng * math.Cos(polylinePoint2.Lat*math.Pi/180)
    lngPoint := point.Lng * math.Cos(point.Lat*math.Pi/180)
    
    x1 := polylinePoint1.Lat
    y1 := lng1
    x2 := polylinePoint2.Lat
    y2 := lng2
    x := point.Lat
    y := lngPoint

    // Vector from p1 to p2
    dx := x2 - x1
    dy := y2 - y1
    
    // Length of line segment squared
    segmentLengthSquared := dx*dx + dy*dy
    
    // Parameter of projection onto line (0 to 1 = on line segment)
    var projection float64 = 0
    
    if segmentLengthSquared != 0 {
        projection = ((x-x1)*dx + (y-y1)*dy) / segmentLengthSquared
    }
    
    var closestX, closestY float64
    
    if projection < 0 {
        // Closest point is p1
        return CalculateHaversineDistance(point, polylinePoint1), polylinePoint1
    } else if projection > 1 {
        // Closest point is p2
        return CalculateHaversineDistance(point, polylinePoint2), polylinePoint2
    } else {
        // Closest point is on segment
        closestX = x1 + projection*dx
        closestY = y1 + projection*dy
    }
    
    // Convert back from flat Cartesian
    closestLng := closestY / math.Cos(closestX*math.Pi/180)
    
    // Reference point on the polyline
    referencePoint := LatLng{
        Lat: closestX,
        Lng: closestLng,
    }
    
    // Calculate Haversine distance to closest point
    distance := CalculateHaversineDistance(point, referencePoint)
    return distance, referencePoint
}

// CalculateDistanceToPolyline calculates the shortest distance from a point to a polyline
func CalculateDistanceToPolyline(point LatLng, polyline []LatLng) (float64, LatLng, int) {
	if len(polyline) == 0 {
		return math.Inf(1), LatLng{}, -1
	}

	if len(polyline) == 1 {
		return CalculateHaversineDistance(point, polyline[0]), polyline[0], 0
	}

	minDistance := math.Inf(1)
	var closestReferencePoint LatLng
	closestSegmentIndex := -1

	// Check distance to each segment in polyline
	for i := 0; i < len(polyline)-1; i++ {
		distance, referencePoint := CalculateDistanceToSegment(point, polyline[i], polyline[i+1])
		if distance < minDistance {
			minDistance = distance
			closestReferencePoint = referencePoint
			closestSegmentIndex = i
		}
	}

	return minDistance, closestReferencePoint, closestSegmentIndex
}
