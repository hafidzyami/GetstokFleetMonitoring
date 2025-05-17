package repository

import (
	"time"

	"github.com/hafidzyami/GetstokFleetMonitoring/backend/model"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/config"
)

type TruckIdleRepository interface {
	Create(idle *model.TruckIdleDetection) error
	Update(idle *model.TruckIdleDetection) error
	FindByID(id uint) (*model.TruckIdleDetection, error)
	FindByTruckID(truckID uint) ([]*model.TruckIdleDetection, error)
	FindActiveByTruckID(truckID uint) (*model.TruckIdleDetection, error)
	FindByMacID(macID string) ([]*model.TruckIdleDetection, error)
	FindActiveByMacID(macID string) (*model.TruckIdleDetection, error)
	FindAll() ([]*model.TruckIdleDetection, error)
	FindAllActive() ([]*model.TruckIdleDetection, error)
	FindByDateRange(start, end time.Time) ([]*model.TruckIdleDetection, error) 
}

type truckIdleRepository struct{}

func NewTruckIdleRepository() TruckIdleRepository {
	return &truckIdleRepository{}
}

// Create creates a new idle detection record
func (r *truckIdleRepository) Create(idle *model.TruckIdleDetection) error {
	return config.DB.Create(idle).Error
}

// Update updates an existing idle detection record
func (r *truckIdleRepository) Update(idle *model.TruckIdleDetection) error {
	return config.DB.Save(idle).Error
}

// FindByID finds an idle detection by ID
func (r *truckIdleRepository) FindByID(id uint) (*model.TruckIdleDetection, error) {
	var idle model.TruckIdleDetection
	err := config.DB.First(&idle, id).Error
	if err != nil {
		return nil, err
	}
	return &idle, nil
}

// FindByTruckID finds all idle detections for a truck
func (r *truckIdleRepository) FindByTruckID(truckID uint) ([]*model.TruckIdleDetection, error) {
	var idles []*model.TruckIdleDetection
	err := config.DB.Where("truck_id = ?", truckID).Order("start_time desc").Find(&idles).Error
	if err != nil {
		return nil, err
	}
	return idles, nil
}

// FindActiveByTruckID finds active (unresolved) idle detection for a truck
func (r *truckIdleRepository) FindActiveByTruckID(truckID uint) (*model.TruckIdleDetection, error) {
	var idle model.TruckIdleDetection
	err := config.DB.Where("truck_id = ? AND is_resolved = ?", truckID, false).
		Order("start_time desc").First(&idle).Error
	if err != nil {
		return nil, err
	}
	return &idle, nil
}

// FindByMacID finds all idle detections for a device MAC ID
func (r *truckIdleRepository) FindByMacID(macID string) ([]*model.TruckIdleDetection, error) {
	var idles []*model.TruckIdleDetection
	err := config.DB.Where("mac_id = ?", macID).Order("start_time desc").Find(&idles).Error
	if err != nil {
		return nil, err
	}
	return idles, nil
}

// FindActiveByMacID finds active (unresolved) idle detection for a device MAC ID
func (r *truckIdleRepository) FindActiveByMacID(macID string) (*model.TruckIdleDetection, error) {
	var idle model.TruckIdleDetection
	err := config.DB.Where("mac_id = ? AND is_resolved = ?", macID, false).
		Order("start_time desc").First(&idle).Error
	if err != nil {
		return nil, err
	}
	return &idle, nil
}

// FindAll returns all idle detections
func (r *truckIdleRepository) FindAll() ([]*model.TruckIdleDetection, error) {
	var idles []*model.TruckIdleDetection
	err := config.DB.Order("start_time desc").Find(&idles).Error
	if err != nil {
		return nil, err
	}
	return idles, nil
}

// FindAllActive returns all active (unresolved) idle detections
func (r *truckIdleRepository) FindAllActive() ([]*model.TruckIdleDetection, error) {
	var idles []*model.TruckIdleDetection
	err := config.DB.Where("is_resolved = ?", false).Order("start_time desc").Find(&idles).Error
	if err != nil {
		return nil, err
	}
	return idles, nil
}

// FindByDateRange returns all idle detections within a date range
func (r *truckIdleRepository) FindByDateRange(start, end time.Time) ([]*model.TruckIdleDetection, error) {
	var idles []*model.TruckIdleDetection
	err := config.DB.Where("start_time >= ? AND start_time <= ?", start, end).
		Order("start_time desc").Find(&idles).Error
	if err != nil {
		return nil, err
	}
	return idles, nil
}
