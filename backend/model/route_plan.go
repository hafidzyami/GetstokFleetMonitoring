package model

import (
	"time"
	"gorm.io/gorm"
)

// RoutePlan represents a planned route for a truck
type RoutePlan struct {
	ID            uint           `gorm:"primaryKey" json:"id"`
	DriverID      uint           `json:"driver_id"`
	TruckID       uint           `json:"truck_id"`
	PlannerID     uint           `json:"planner_id"` // Track who created the route plan
	RouteGeometry string         `json:"route_geometry" gorm:"type:text"`
	Status        string         `json:"status" gorm:"default:'planned'"` // planned, active, completed, cancelled
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `json:"-" gorm:"index"`
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
	PhotoFileName    string         `json:"photo_file_name,omitempty"`
	PhotoData        string         `json:"photo_data,omitempty" gorm:"type:text"`
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
	Photo       string               `json:"photo,omitempty"` // Base64 encoded image
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
	PlannerName     string                `json:"planner_name"` // Added planner name to response
	RouteGeometry   string                `json:"route_geometry"`
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
	IsPermanent bool                    `json:"is_permanent"`
	HasPhoto    bool                    `json:"has_photo"`
	Points      []AvoidancePointResponse `json:"points"`
}

// AvoidancePointResponse represents a point in an avoidance area response
type AvoidancePointResponse struct {
	ID         uint    `json:"id"`
	Latitude   float64 `json:"latitude"`
	Longitude  float64 `json:"longitude"`
	Order      int     `json:"order"`
}