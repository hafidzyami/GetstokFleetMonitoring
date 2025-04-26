// repository/truck_history_repository.go
package repository

import (
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/model"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/config"
	"time"
)

type TruckHistoryRepository interface {
	CreatePositionHistory(history *model.TruckPositionHistory) error
	CreateFuelHistory(history *model.TruckFuelHistory) error
	GetPositionHistoryByTruckID(truckID uint, limit int) ([]*model.TruckPositionHistory, error)
	GetFuelHistoryByTruckID(truckID uint, limit int) ([]*model.TruckFuelHistory, error)
	GetPositionHistoryByTruckIDWithDateRange(truckID uint, days int) ([]*model.TruckPositionHistory, error)
	GetFuelHistoryByTruckIDWithDateRange(truckID uint, days int) ([]*model.TruckFuelHistory, error)
}

type truckHistoryRepository struct{}

func NewTruckHistoryRepository() TruckHistoryRepository {
	return &truckHistoryRepository{}
}

// CreatePositionHistory menyimpan data posisi baru
func (r *truckHistoryRepository) CreatePositionHistory(history *model.TruckPositionHistory) error {
	return config.DB.Create(history).Error
}

// CreateFuelHistory menyimpan data fuel baru
func (r *truckHistoryRepository) CreateFuelHistory(history *model.TruckFuelHistory) error {
	return config.DB.Create(history).Error
}

// GetPositionHistoryByTruckID mendapatkan riwayat posisi untuk truck tertentu
func (r *truckHistoryRepository) GetPositionHistoryByTruckID(truckID uint, limit int) ([]*model.TruckPositionHistory, error) {
	var histories []*model.TruckPositionHistory
	query := config.DB.Where("truck_id = ?", truckID).Order("timestamp DESC")
	
	if limit > 0 {
		query = query.Limit(limit)
	}
	
	err := query.Find(&histories).Error
	return histories, err
}

// GetPositionHistoryByTruckIDWithDateRange mendapatkan riwayat posisi untuk truck tertentu dalam rentang hari tertentu
func (r *truckHistoryRepository) GetPositionHistoryByTruckIDWithDateRange(truckID uint, days int) ([]*model.TruckPositionHistory, error) {
	var histories []*model.TruckPositionHistory
	
	// Kalkulasi tanggal mulai (days hari yang lalu dari sekarang)
	startDate := time.Now().AddDate(0, 0, -days)
	
	// Query dengan filter tanggal
	query := config.DB.Where("truck_id = ? AND timestamp >= ?", truckID, startDate).Order("timestamp DESC")
	
	err := query.Find(&histories).Error
	return histories, err
}

// GetFuelHistoryByTruckID mendapatkan riwayat fuel untuk truck tertentu
func (r *truckHistoryRepository) GetFuelHistoryByTruckID(truckID uint, limit int) ([]*model.TruckFuelHistory, error) {
	var histories []*model.TruckFuelHistory
	query := config.DB.Where("truck_id = ?", truckID).Order("timestamp DESC")
	
	if limit > 0 {
		query = query.Limit(limit)
	}
	
	err := query.Find(&histories).Error
	return histories, err
}

// GetFuelHistoryByTruckIDWithDateRange mendapatkan riwayat fuel untuk truck tertentu dalam rentang hari tertentu
func (r *truckHistoryRepository) GetFuelHistoryByTruckIDWithDateRange(truckID uint, days int) ([]*model.TruckFuelHistory, error) {
	var histories []*model.TruckFuelHistory
	
	// Kalkulasi tanggal mulai (days hari yang lalu dari sekarang)
	startDate := time.Now().AddDate(0, 0, -days)
	
	// Query dengan filter tanggal
	query := config.DB.Where("truck_id = ? AND timestamp >= ?", truckID, startDate).Order("timestamp DESC")
	
	err := query.Find(&histories).Error
	return histories, err
}