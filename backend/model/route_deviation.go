package model

import (
	"time"
	"gorm.io/gorm"
)

// TruckRouteDeviation represents a deviation from the planned route
type TruckRouteDeviation struct {
	ID              uint           `gorm:"primaryKey" json:"id"`
	TruckID         uint           `json:"truck_id"`
	MacID           string         `json:"mac_id"`
	RoutePlanID     uint           `json:"route_plan_id"`
	DriverID        uint           `json:"driver_id"`         
	Latitude        float64        `json:"latitude"`          // Truck position when deviation was detected
	Longitude       float64        `json:"longitude"`         // Truck position when deviation was detected
	RefLatitude     float64        `json:"ref_latitude"`      // Closest point on route
	RefLongitude    float64        `json:"ref_longitude"`     // Closest point on route
	Distance        float64        `json:"distance"`          // Distance in meters from route
	SegmentIndex    int            `json:"segment_index"`     // Index of the route segment where deviation occurred
	Timestamp       time.Time      `json:"timestamp"`         // When the deviation was detected
	CreatedAt       time.Time      `json:"created_at"`
	DeletedAt       gorm.DeletedAt `json:"-" gorm:"index"`
}

// RouteDeviationResponse is the DTO for returning route deviation data
type RouteDeviationResponse struct {
	ID              uint      `json:"id"`
	TruckID         uint      `json:"truck_id"`
	MacID           string    `json:"mac_id"`
	RoutePlanID     uint      `json:"route_plan_id"`
	DriverID        uint      `json:"driver_id"`
	Latitude        float64   `json:"latitude"`
	Longitude       float64   `json:"longitude"`
	RefLatitude     float64   `json:"ref_latitude"`
	RefLongitude    float64   `json:"ref_longitude"`
	Distance        float64   `json:"distance"`
	SegmentIndex    int       `json:"segment_index"`
	Timestamp       time.Time `json:"timestamp"`
}

// ToRouteDeviationResponse converts TruckRouteDeviation model to RouteDeviationResponse DTO
func (d *TruckRouteDeviation) ToRouteDeviationResponse() RouteDeviationResponse {
	return RouteDeviationResponse{
		ID:           d.ID,
		TruckID:      d.TruckID,
		MacID:        d.MacID,
		RoutePlanID:  d.RoutePlanID,
		DriverID:     d.DriverID,
		Latitude:     d.Latitude,
		Longitude:    d.Longitude,
		RefLatitude:  d.RefLatitude,
		RefLongitude: d.RefLongitude,
		Distance:     d.Distance,
		SegmentIndex: d.SegmentIndex,
		Timestamp:    d.Timestamp,
	}
}
