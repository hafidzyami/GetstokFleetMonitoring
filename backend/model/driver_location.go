package model

import (
	"time"
	"gorm.io/gorm"
)

// DriverLocation represents the current or historical location of a driver during a route
type DriverLocation struct {
	ID         uint           `gorm:"primaryKey" json:"id"`
	RoutePlanID uint          `json:"route_plan_id"`
	DriverID   uint           `json:"driver_id"`
	Latitude   float64        `json:"latitude"`
	Longitude  float64        `json:"longitude"`
	Timestamp  time.Time      `json:"timestamp"`
	Speed      float64        `json:"speed,omitempty"`
	Bearing    float64        `json:"bearing,omitempty"` // Direction in degrees
	Accuracy   float64        `json:"accuracy,omitempty"` // Location accuracy in meters
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `json:"-" gorm:"index"`
}

// DriverLocationRequest is the DTO for updating driver location
type DriverLocationRequest struct {
	Latitude  float64   `json:"latitude" validate:"required"`
	Longitude float64   `json:"longitude" validate:"required"`
	Timestamp time.Time `json:"timestamp" validate:"required"`
	Speed     float64   `json:"speed,omitempty"`
	Bearing   float64   `json:"bearing,omitempty"`
	Accuracy  float64   `json:"accuracy,omitempty"`
}

// DriverLocationResponse is the DTO for returning driver location
type DriverLocationResponse struct {
	ID         uint      `json:"id"`
	RoutePlanID uint     `json:"route_plan_id"`
	DriverID   uint      `json:"driver_id"`
	DriverName string    `json:"driver_name,omitempty"`
	Latitude   float64   `json:"latitude"`
	Longitude  float64   `json:"longitude"`
	Timestamp  time.Time `json:"timestamp"`
	Speed      float64   `json:"speed,omitempty"`
	Bearing    float64   `json:"bearing,omitempty"`
	Accuracy   float64   `json:"accuracy,omitempty"`
	CreatedAt  time.Time `json:"created_at"`
}

// ActiveRouteResponse is the DTO for returning information about an active route
type ActiveRouteResponse struct {
	RoutePlan *RoutePlanResponse    `json:"route_plan"`
	Location  *DriverLocationResponse `json:"current_location,omitempty"`
}