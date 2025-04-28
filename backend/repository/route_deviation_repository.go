package repository

import (
	"time"

	"github.com/hafidzyami/GetstokFleetMonitoring/backend/config"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/model"
)

type RouteDeviationRepository interface {
	Create(deviation *model.TruckRouteDeviation) error
	FindByID(id uint) (*model.TruckRouteDeviation, error)
	FindByTruckID(truckID uint, limit int) ([]*model.TruckRouteDeviation, error)
	FindByRoutePlanID(routePlanID uint, limit int) ([]*model.TruckRouteDeviation, error)
	FindByMacIDWithDateRange(macID string, days int) ([]*model.TruckRouteDeviation, error)
	FindByTruckIDWithDateRange(truckID uint, days int) ([]*model.TruckRouteDeviation, error)
}

type routeDeviationRepository struct{}

func NewRouteDeviationRepository() RouteDeviationRepository {
	return &routeDeviationRepository{}
}

// Create creates a new route deviation record in the database
func (r *routeDeviationRepository) Create(deviation *model.TruckRouteDeviation) error {
	return config.DB.Create(deviation).Error
}

// FindByID finds a route deviation by ID
func (r *routeDeviationRepository) FindByID(id uint) (*model.TruckRouteDeviation, error) {
	var deviation model.TruckRouteDeviation
	err := config.DB.First(&deviation, id).Error
	if err != nil {
		return nil, err
	}
	return &deviation, nil
}

// FindByTruckID finds route deviations by truck ID
func (r *routeDeviationRepository) FindByTruckID(truckID uint, limit int) ([]*model.TruckRouteDeviation, error) {
	var deviations []*model.TruckRouteDeviation
	query := config.DB.Where("truck_id = ?", truckID).Order("timestamp DESC")
	
	if limit > 0 {
		query = query.Limit(limit)
	}
	
	err := query.Find(&deviations).Error
	return deviations, err
}

// FindByRoutePlanID finds route deviations by route plan ID
func (r *routeDeviationRepository) FindByRoutePlanID(routePlanID uint, limit int) ([]*model.TruckRouteDeviation, error) {
	var deviations []*model.TruckRouteDeviation
	query := config.DB.Where("route_plan_id = ?", routePlanID).Order("timestamp DESC")
	
	if limit > 0 {
		query = query.Limit(limit)
	}
	
	err := query.Find(&deviations).Error
	return deviations, err
}

// FindByMacIDWithDateRange finds route deviations by MAC ID within a specified date range
func (r *routeDeviationRepository) FindByMacIDWithDateRange(macID string, days int) ([]*model.TruckRouteDeviation, error) {
	var deviations []*model.TruckRouteDeviation
	
	// Calculate start date (days days ago from now)
	startDate := time.Now().AddDate(0, 0, -days)
	
	// Query with date filter
	err := config.DB.Where("mac_id = ? AND timestamp >= ?", macID, startDate).Order("timestamp DESC").Find(&deviations).Error
	return deviations, err
}

// FindByTruckIDWithDateRange finds route deviations by truck ID within a specified date range
func (r *routeDeviationRepository) FindByTruckIDWithDateRange(truckID uint, days int) ([]*model.TruckRouteDeviation, error) {
	var deviations []*model.TruckRouteDeviation
	
	// Calculate start date (days days ago from now)
	startDate := time.Now().AddDate(0, 0, -days)
	
	// Query with date filter
	err := config.DB.Where("truck_id = ? AND timestamp >= ?", truckID, startDate).Order("timestamp DESC").Find(&deviations).Error
	return deviations, err
}
