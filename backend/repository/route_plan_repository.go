package repository

import (
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/model"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/config"
	"gorm.io/gorm"
)

type RoutePlanRepository interface {
	Create(routePlan *model.RoutePlan) error
	AddWaypoints(waypoints []*model.RouteWaypoint) error
	AddAvoidanceArea(area *model.RouteAvoidanceArea) error
	AddAvoidancePoints(points []*model.RouteAvoidancePoint) error
	FindByID(id uint) (*model.RoutePlan, error)
	FindWaypointsByRoutePlanID(routePlanID uint) ([]*model.RouteWaypoint, error)
	FindAvoidanceAreasByRoutePlanID(routePlanID uint) ([]*model.RouteAvoidanceArea, error)
	FindAvoidancePointsByAreaID(areaID uint) ([]*model.RouteAvoidancePoint, error)
	FindAll() ([]*model.RoutePlan, error)
	Update(routePlan *model.RoutePlan) error
	UpdateAvoidanceArea(area *model.RouteAvoidanceArea) error
	Delete(id uint) error
}

type routePlanRepository struct{}

func NewRoutePlanRepository() RoutePlanRepository {
	return &routePlanRepository{}
}

// Create creates a new route plan in the database
func (r *routePlanRepository) Create(routePlan *model.RoutePlan) error {
	return config.DB.Create(routePlan).Error
}

// AddWaypoints adds waypoints to a route plan
func (r *routePlanRepository) AddWaypoints(waypoints []*model.RouteWaypoint) error {
	return config.DB.CreateInBatches(waypoints, len(waypoints)).Error
}

// AddAvoidanceArea adds an avoidance area to a route plan
func (r *routePlanRepository) AddAvoidanceArea(area *model.RouteAvoidanceArea) error {
	return config.DB.Create(area).Error
}

// AddAvoidancePoints adds points to an avoidance area
func (r *routePlanRepository) AddAvoidancePoints(points []*model.RouteAvoidancePoint) error {
	return config.DB.CreateInBatches(points, len(points)).Error
}

// FindByID finds a route plan by ID
func (r *routePlanRepository) FindByID(id uint) (*model.RoutePlan, error) {
	var routePlan model.RoutePlan
	err := config.DB.First(&routePlan, id).Error
	if err != nil {
		return nil, err
	}
	return &routePlan, nil
}

// FindWaypointsByRoutePlanID finds all waypoints for a route plan
func (r *routePlanRepository) FindWaypointsByRoutePlanID(routePlanID uint) ([]*model.RouteWaypoint, error) {
	var waypoints []*model.RouteWaypoint
	err := config.DB.Where("route_plan_id = ?", routePlanID).Order("\"order\" asc").Find(&waypoints).Error
	if err != nil {
		return nil, err
	}
	return waypoints, nil
}

// FindAvoidanceAreasByRoutePlanID finds all avoidance areas for a route plan
func (r *routePlanRepository) FindAvoidanceAreasByRoutePlanID(routePlanID uint) ([]*model.RouteAvoidanceArea, error) {
	var areas []*model.RouteAvoidanceArea
	err := config.DB.Where("route_plan_id = ?", routePlanID).Find(&areas).Error
	if err != nil {
		return nil, err
	}
	return areas, nil
}

// FindAvoidancePointsByAreaID finds all points for an avoidance area
func (r *routePlanRepository) FindAvoidancePointsByAreaID(areaID uint) ([]*model.RouteAvoidancePoint, error) {
	var points []*model.RouteAvoidancePoint
	err := config.DB.Where("route_avoidance_area_id = ?", areaID).Order("\"order\" asc").Find(&points).Error
	if err != nil {
		return nil, err
	}
	return points, nil
}

// FindAll returns all route plans
func (r *routePlanRepository) FindAll() ([]*model.RoutePlan, error) {
	var routePlans []*model.RoutePlan
	err := config.DB.Find(&routePlans).Error
	if err != nil {
		return nil, err
	}
	return routePlans, nil
}

// Update updates an existing route plan
func (r *routePlanRepository) Update(routePlan *model.RoutePlan) error {
	return config.DB.Save(routePlan).Error
}

// UpdateAvoidanceArea updates an existing avoidance area
func (r *routePlanRepository) UpdateAvoidanceArea(area *model.RouteAvoidanceArea) error {
	return config.DB.Save(area).Error
}

// Delete deletes a route plan by ID
func (r *routePlanRepository) Delete(id uint) error {
	return config.DB.Transaction(func(tx *gorm.DB) error {
		// First, find all avoidance areas for this route plan
		var areas []*model.RouteAvoidanceArea
		if err := tx.Where("route_plan_id = ?", id).Find(&areas).Error; err != nil {
			return err
		}

		// Delete all avoidance points for each area
		for _, area := range areas {
			if err := tx.Where("route_avoidance_area_id = ?", area.ID).Delete(&model.RouteAvoidancePoint{}).Error; err != nil {
				return err
			}
		}

		// Delete all avoidance areas
		if err := tx.Where("route_plan_id = ?", id).Delete(&model.RouteAvoidanceArea{}).Error; err != nil {
			return err
		}

		// Delete all waypoints
		if err := tx.Where("route_plan_id = ?", id).Delete(&model.RouteWaypoint{}).Error; err != nil {
			return err
		}

		// Finally, delete the route plan
		return tx.Delete(&model.RoutePlan{}, id).Error
	})
}