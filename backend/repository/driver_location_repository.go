package repository

import (
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/model"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/config"
)

type DriverLocationRepository interface {
	Create(location *model.DriverLocation) error
	FindByID(id uint) (*model.DriverLocation, error)
	FindByRoutePlanID(routePlanID uint) ([]*model.DriverLocation, error)
	FindLatestByRoutePlanID(routePlanID uint) (*model.DriverLocation, error)
	FindByDriverID(driverID uint) ([]*model.DriverLocation, error)
	FindLatestByDriverID(driverID uint) (*model.DriverLocation, error)
	FindAll() ([]*model.DriverLocation, error)
	Update(location *model.DriverLocation) error
	Delete(id uint) error
	DeleteAllByRoutePlanID(routePlanID uint) error
}

type driverLocationRepository struct{}

func NewDriverLocationRepository() DriverLocationRepository {
	return &driverLocationRepository{}
}

// Create creates a new driver location in the database
func (r *driverLocationRepository) Create(location *model.DriverLocation) error {
	return config.DB.Create(location).Error
}

// FindByID finds a driver location by ID
func (r *driverLocationRepository) FindByID(id uint) (*model.DriverLocation, error) {
	var location model.DriverLocation
	err := config.DB.First(&location, id).Error
	if err != nil {
		return nil, err
	}
	return &location, nil
}

// FindByRoutePlanID finds all locations for a route plan
func (r *driverLocationRepository) FindByRoutePlanID(routePlanID uint) ([]*model.DriverLocation, error) {
	var locations []*model.DriverLocation
	err := config.DB.Where("route_plan_id = ?", routePlanID).Order("timestamp desc").Find(&locations).Error
	if err != nil {
		return nil, err
	}
	return locations, nil
}

// FindLatestByRoutePlanID finds the latest location for a route plan
func (r *driverLocationRepository) FindLatestByRoutePlanID(routePlanID uint) (*model.DriverLocation, error) {
	var location model.DriverLocation
	err := config.DB.Where("route_plan_id = ?", routePlanID).Order("timestamp desc").First(&location).Error
	if err != nil {
		return nil, err
	}
	return &location, nil
}

// FindByDriverID finds all locations for a driver
func (r *driverLocationRepository) FindByDriverID(driverID uint) ([]*model.DriverLocation, error) {
	var locations []*model.DriverLocation
	err := config.DB.Where("driver_id = ?", driverID).Order("timestamp desc").Find(&locations).Error
	if err != nil {
		return nil, err
	}
	return locations, nil
}

// FindLatestByDriverID finds the latest location for a driver
func (r *driverLocationRepository) FindLatestByDriverID(driverID uint) (*model.DriverLocation, error) {
	var location model.DriverLocation
	err := config.DB.Where("driver_id = ?", driverID).Order("timestamp desc").First(&location).Error
	if err != nil {
		return nil, err
	}
	return &location, nil
}

// FindAll returns all driver locations
func (r *driverLocationRepository) FindAll() ([]*model.DriverLocation, error) {
	var locations []*model.DriverLocation
	err := config.DB.Find(&locations).Error
	if err != nil {
		return nil, err
	}
	return locations, nil
}

// Update updates an existing driver location
func (r *driverLocationRepository) Update(location *model.DriverLocation) error {
	return config.DB.Save(location).Error
}

// Delete deletes a driver location by ID
func (r *driverLocationRepository) Delete(id uint) error {
	return config.DB.Delete(&model.DriverLocation{}, id).Error
}

// DeleteAllByRoutePlanID deletes all locations for a route plan
func (r *driverLocationRepository) DeleteAllByRoutePlanID(routePlanID uint) error {
	return config.DB.Where("route_plan_id = ?", routePlanID).Delete(&model.DriverLocation{}).Error
}