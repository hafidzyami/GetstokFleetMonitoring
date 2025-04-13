// repository/truck_history_repository.go
package repository

import (
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/model"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/config"
)

type TruckHistoryRepository interface {
	CreatePositionHistory(history *model.TruckPositionHistory) error
	CreateFuelHistory(history *model.TruckFuelHistory) error
	GetPositionHistoryByTruckID(truckID uint, limit int) ([]*model.TruckPositionHistory, error)
	GetFuelHistoryByTruckID(truckID uint, limit int) ([]*model.TruckFuelHistory, error)
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