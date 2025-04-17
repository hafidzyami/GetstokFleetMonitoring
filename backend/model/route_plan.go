package model

import (
	"time"
	"gorm.io/gorm"
	"encoding/json"
)

// RoutePlan represents a planned route for a truck
type RoutePlan struct {
	ID            uint           `gorm:"primaryKey" json:"id"`
	DriverID      uint           `json:"driver_id"`
	TruckID       uint           `json:"truck_id"`
	PlannerID     uint           `json:"planner_id"` // Track who created the route plan
	RouteGeometry string         `json:"route_geometry" gorm:"type:text"`
	ExtrasData    string         `json:"extras_data,omitempty" gorm:"type:text"` // JSON string untuk menyimpan extras data
	Status        string         `json:"status" gorm:"default:'planned'"` // planned, active, completed, cancelled
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `json:"-" gorm:"index"`
}

type RouteExtras struct {
	Waytype   *ExtraValues `json:"waytype,omitempty"`
	Tollways  *ExtraValues `json:"tollways,omitempty"`
	Surface   *ExtraValues `json:"surface,omitempty"`
	Waycategory *ExtraValues `json:"waycategory,omitempty"`
	Suitability *ExtraValues `json:"suitability,omitempty"`
}

// ExtraValues adalah struktur untuk menyimpan values dan summary dari extras
type ExtraValues struct {
	Values  [][]int         `json:"values"`
	Summary []ExtraSummary `json:"summary"`
}

// ExtraSummary adalah struktur untuk menyimpan summary value
type ExtraSummary struct {
	Value      int     `json:"value"`
	Distance   float64 `json:"distance"`
	Amount     float64 `json:"amount"`
}

// RouteWaypoint represents a waypoint in a planned route
type RouteWaypoint struct {
	ID         uint           `gorm:"primaryKey" json:"id"`
	RoutePlanID uint          `json:"route_plan_id"`
	Latitude   float64        `json:"latitude"`
	Longitude  float64        `json:"longitude"`
	Address    string         `json:"address" gorm:"type:text"`
	Order      int            `json:"order"` // Sequence order of the waypoint
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `json:"-" gorm:"index"`
}

// RouteAvoidanceArea represents an area to be avoided in a route
type RouteAvoidanceArea struct {
	ID               uint           `gorm:"primaryKey" json:"id"`
	RoutePlanID      uint           `json:"route_plan_id"`
	Reason           string         `json:"reason" gorm:"type:text"`
	IsPermanent      bool           `json:"is_permanent"`
	PhotoURL         string         `json:"photo_url,omitempty"`     // S3 URL for the photo
	PhotoKey         string         `json:"photo_key,omitempty"`     // S3 object key for the photo
	RequesterID      uint           `json:"requester_id"` // ID of the user who requested the avoidance area
	Status           string         `json:"status" gorm:"default:'pending'"` // Status: pending, approved, rejected
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	DeletedAt        gorm.DeletedAt `json:"-" gorm:"index"`
}

// RouteAvoidancePoint represents a point in an avoidance area
type RouteAvoidancePoint struct {
	ID                 uint           `gorm:"primaryKey" json:"id"`
	RouteAvoidanceAreaID uint          `json:"route_avoidance_area_id"`
	Latitude           float64        `json:"latitude"`
	Longitude          float64        `json:"longitude"`
	Order              int            `json:"order"` // Sequence order of the point
	CreatedAt          time.Time      `json:"created_at"`
	UpdatedAt          time.Time      `json:"updated_at"`
	DeletedAt          gorm.DeletedAt `json:"-" gorm:"index"`
}

// RoutePlanCreateRequest is the DTO for creating a new route plan
type RoutePlanCreateRequest struct {
	DriverName        string                      `json:"driver_name" validate:"required"`
	VehiclePlate      string                      `json:"vehicle_plate" validate:"required"` 
	RouteGeometry     string                      `json:"route_geometry"`
	ExtrasData        string                      `json:"extras_data,omitempty"` // JSON string data untuk extras
	Waypoints         []WaypointRequest           `json:"waypoints" validate:"required,min=2"`
	AvoidanceAreas    []AvoidanceAreaRequest      `json:"avoidance_areas,omitempty"`
}

// WaypointRequest represents a waypoint in a route plan creation request
type WaypointRequest struct {
	Latitude   float64 `json:"latitude" validate:"required"`
	Longitude  float64 `json:"longitude" validate:"required"`
	Address    string  `json:"address,omitempty"`
}

// AvoidanceAreaRequest represents an avoidance area in a route plan creation request
type AvoidanceAreaRequest struct {
	Reason      string               `json:"reason" validate:"required"`
	IsPermanent bool                 `json:"is_permanent"`
	RequesterID uint                 `json:"requester_id"` // ID of the user who requested the avoidance area
	Status      string               `json:"status,omitempty"` // Status of the area: pending, approved, rejected
	Photo       string               `json:"photo,omitempty"` // Base64 encoded image (deprecated)
	PhotoKey    string               `json:"photo_key,omitempty"` // S3 object key yang sudah diupload
	Points      []AvoidancePointRequest `json:"points" validate:"required,min=3"`
}

// AvoidancePointRequest represents a point in an avoidance area creation request
type AvoidancePointRequest struct {
	Latitude  float64 `json:"latitude" validate:"required"`
	Longitude float64 `json:"longitude" validate:"required"`
}

// RoutePlanResponse is the DTO for returning a route plan
type RoutePlanResponse struct {
	ID              uint                  `json:"id"`
	DriverName      string                `json:"driver_name"`
	VehiclePlate    string                `json:"vehicle_plate"`
	PlannerName     string                `json:"planner_name"` 
	RouteGeometry   string                `json:"route_geometry"`
	Extras          *RouteExtras          `json:"extras,omitempty"` // Route extras data
	Status          string                `json:"status"`
	Waypoints       []WaypointResponse    `json:"waypoints"`
	AvoidanceAreas  []AvoidanceAreaResponse `json:"avoidance_areas,omitempty"`
	CreatedAt       time.Time             `json:"created_at"`
	UpdatedAt       time.Time             `json:"updated_at"`
}

// WaypointResponse represents a waypoint in a route plan response
type WaypointResponse struct {
	ID        uint    `json:"id"`
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
	Address   string  `json:"address,omitempty"`
	Order     int     `json:"order"`
}

// AvoidanceAreaResponse represents an avoidance area in a route plan response
type AvoidanceAreaResponse struct {
	ID          uint                    `json:"id"`
	Reason      string                  `json:"reason"`
	RequesterID uint                    `json:"requester_id"`
	IsPermanent bool                    `json:"is_permanent"`
	PhotoURL    string                  `json:"photo_url,omitempty"`
	Status      string                  `json:"status"`
	Points      []AvoidancePointResponse `json:"points"`
	CreatedAt   time.Time               `json:"created_at"`
}

// AvoidancePointResponse represents a point in an avoidance area response
type AvoidancePointResponse struct {
	ID         uint    `json:"id"`
	Latitude   float64 `json:"latitude"`
	Longitude  float64 `json:"longitude"`
	Order      int     `json:"order"`
}

func (r *RoutePlan) SetExtras(extras *RouteExtras) error {
	if extras == nil {
		r.ExtrasData = ""
		return nil
	}
	
	data, err := json.Marshal(extras)
	if err != nil {
		return err
	}
	
	r.ExtrasData = string(data)
	return nil
}

// GetExtras untuk mendapatkan extras data dari field ExtrasData
func (r *RoutePlan) GetExtras() (*RouteExtras, error) {
	if r.ExtrasData == "" {
		return nil, nil
	}
	
	var extras RouteExtras
	err := json.Unmarshal([]byte(r.ExtrasData), &extras)
	if err != nil {
		return nil, err
	}
	
	return &extras, nil
}