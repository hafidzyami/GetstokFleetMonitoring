// backend/model/truck.go - tambahkan field PlateNumber
package model

import (
	"time"
	"gorm.io/gorm"
)

type Truck struct {
	ID           uint           `gorm:"primaryKey" json:"id"`
	MacID        string         `json:"mac_id" gorm:"uniqueIndex"`
	Type         string         `json:"type"`
	PlateNumber  string         `json:"plate_number"`
	Latitude     float64        `json:"latitude"`
	Longitude    float64        `json:"longitude"`
	Fuel         float64        `json:"fuel"`
	LastPosition time.Time      `json:"last_position"`
	LastFuel     time.Time      `json:"last_fuel"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `json:"-" gorm:"index"`
}

// TruckResponse DTO for returning truck data
type TruckResponse struct {
	ID           uint      `json:"id"`
	MacID        string    `json:"mac_id"`
	Type         string    `json:"type"`
	PlateNumber  string    `json:"plate_number"`
	Latitude     float64   `json:"latitude"`
	Longitude    float64   `json:"longitude"`
	Fuel         float64   `json:"fuel"`
	LastPosition time.Time `json:"last_position"`
	LastFuel     time.Time `json:"last_fuel"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type TruckUpdateRequest struct {
	PlateNumber string `json:"plate_number"`
	Type        string `json:"type"`
}

// ToTruckResponse converts Truck model to TruckResponse DTO
func (t *Truck) ToTruckResponse() TruckResponse {
	return TruckResponse{
		ID:           t.ID,
		MacID:        t.MacID,
		Type:         t.Type,
		PlateNumber:  t.PlateNumber,
		Latitude:     t.Latitude,
		Longitude:    t.Longitude,
		Fuel:         t.Fuel,
		LastPosition: t.LastPosition,
		LastFuel:     t.LastFuel,
		UpdatedAt:    t.UpdatedAt,
	}
}