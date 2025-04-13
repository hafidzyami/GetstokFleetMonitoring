// model/truck_history.go
package model

import (
	"time"
	"gorm.io/gorm"
)

// TruckPositionHistory menyimpan setiap update posisi truck
type TruckPositionHistory struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	TruckID   uint           `json:"truck_id"`
	MacID     string         `json:"mac_id"`
	Latitude  float64        `json:"latitude"`
	Longitude float64        `json:"longitude"`
	Timestamp time.Time      `json:"timestamp"`
	CreatedAt time.Time      `json:"created_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}

// TruckFuelHistory menyimpan setiap update fuel truck
type TruckFuelHistory struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	TruckID   uint           `json:"truck_id"`
	MacID     string         `json:"mac_id"`
	Fuel      float64        `json:"fuel"`
	Timestamp time.Time      `json:"timestamp"`
	CreatedAt time.Time      `json:"created_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}