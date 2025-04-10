package repository

import (
	"time"

	"github.com/hafidzyami/GetstokFleetMonitoring/backend/model"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/config"
)

type TruckRepository interface {
	Create(truck *model.Truck) error
	FindByMacID(macID string) (*model.Truck, error)
	FindAll() ([]*model.Truck, error)
	Update(truck *model.Truck) error
	UpdateInfo(macID string, plateNumber string, truckType string) error
}

type truckRepository struct{}

func NewTruckRepository() TruckRepository {
	return &truckRepository{}
}

// Create creates a new truck in database
func (r *truckRepository) Create(truck *model.Truck) error {
	return config.DB.Create(truck).Error
}

// FindByMacID finds truck by mac_id
func (r *truckRepository) FindByMacID(macID string) (*model.Truck, error) {
	var truck model.Truck
	err := config.DB.Where("mac_id = ?", macID).First(&truck).Error
	if err != nil {
		return nil, err
	}
	return &truck, nil
}

// FindAll returns all trucks
func (r *truckRepository) FindAll() ([]*model.Truck, error) {
	var trucks []*model.Truck
	err := config.DB.Find(&trucks).Error
	if err != nil {
		return nil, err
	}
	return trucks, nil
}

// Update updates an existing truck
func (r *truckRepository) Update(truck *model.Truck) error {
	return config.DB.Save(truck).Error
}

// UpdateInfo updates truck information like plate number and type
func (r *truckRepository) UpdateInfo(macID string, plateNumber string, truckType string) error {
	updates := map[string]interface{}{"updated_at": time.Now()}
	
	if plateNumber != "" {
		updates["plate_number"] = plateNumber
	}
	
	if truckType != "" {
		updates["type"] = truckType
	}
	
	return config.DB.Model(&model.Truck{}).
		Where("mac_id = ?", macID).
		Updates(updates).Error
}