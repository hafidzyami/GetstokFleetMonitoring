package model

import (
	"time"
	"gorm.io/gorm"
)

// TruckIdleDetection menyimpan data ketika truk terdeteksi idle
type TruckIdleDetection struct {
	ID         uint           `gorm:"primaryKey" json:"id"`
	TruckID    uint           `json:"truck_id"`
	MacID      string         `json:"mac_id"`
	Latitude   float64        `json:"latitude"`
	Longitude  float64        `json:"longitude"`
	StartTime  time.Time      `json:"start_time"`
	EndTime    time.Time      `json:"end_time"`
	Duration   int            `json:"duration"` // Durasi dalam detik
	IsResolved bool           `json:"is_resolved" gorm:"default:false"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `json:"-" gorm:"index"`
}

// TruckIdleResponse DTO untuk mengembalikan data idle
type TruckIdleResponse struct {
	ID         uint      `json:"id"`
	TruckID    uint      `json:"truck_id"`
	MacID      string    `json:"mac_id"`
	PlateNumber string   `json:"plate_number,omitempty"`
	Latitude   float64   `json:"latitude"`
	Longitude  float64   `json:"longitude"`
	StartTime  time.Time `json:"start_time"`
	EndTime    time.Time `json:"end_time"`
	Duration   int       `json:"duration"`
	IsResolved bool      `json:"is_resolved"`
	CreatedAt  time.Time `json:"created_at"`
}

// WebsocketIdleNotification format notifikasi untuk dikirim via websocket
type WebsocketIdleNotification struct {
	Type        string    `json:"type"`
	MacID       string    `json:"mac_id"`
	PlateNumber string    `json:"plate_number,omitempty"`
	Latitude    float64   `json:"latitude"`
	Longitude   float64   `json:"longitude"`
	StartTime   time.Time `json:"start_time"`
	Duration    int       `json:"duration"`
}
