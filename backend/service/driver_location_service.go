package service

import (
	"errors"
	"fmt"
	"time"

	"github.com/hafidzyami/GetstokFleetMonitoring/backend/model"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/repository"
)

type DriverLocationService interface {
	UpdateDriverLocation(routePlanID uint, driverID uint, req model.DriverLocationRequest) (*model.DriverLocationResponse, error)
	GetLatestDriverLocation(routePlanID uint) (*model.DriverLocationResponse, error)
	GetDriverLocationHistory(routePlanID uint) ([]*model.DriverLocationResponse, error)
	GetActiveRoute(driverID uint) (*model.ActiveRouteResponse, error)
	DeleteLocationHistory(routePlanID uint) error
}

type driverLocationService struct {
	locationRepo  repository.DriverLocationRepository
	routePlanRepo repository.RoutePlanRepository
	userRepo      repository.UserRepository
	routePlanSvc  RoutePlanService
}

func NewDriverLocationService(
	locationRepo repository.DriverLocationRepository,
	routePlanRepo repository.RoutePlanRepository,
	userRepo repository.UserRepository,
	routePlanSvc RoutePlanService,
) DriverLocationService {
	return &driverLocationService{
		locationRepo:  locationRepo,
		routePlanRepo: routePlanRepo,
		userRepo:      userRepo,
		routePlanSvc:  routePlanSvc,
	}
}

// UpdateDriverLocation updates the current location of a driver for a specific route
func (s *driverLocationService) UpdateDriverLocation(routePlanID uint, driverID uint, req model.DriverLocationRequest) (*model.DriverLocationResponse, error) {
	// Check if the route plan exists and is active
	routePlan, err := s.routePlanRepo.FindByID(routePlanID)
	if err != nil {
		return nil, errors.New("route plan not found")
	}

	if routePlan.Status != "active" {
		return nil, errors.New("route plan is not active")
	}

	// Check if the driver ID matches the route plan
	if routePlan.DriverID != driverID {
		return nil, errors.New("driver ID does not match route plan")
	}

	// Create new location record
	location := &model.DriverLocation{
		RoutePlanID: routePlanID,
		DriverID:    driverID,
		Latitude:    req.Latitude,
		Longitude:   req.Longitude,
		Timestamp:   req.Timestamp,
		Speed:       req.Speed,
		Bearing:     req.Bearing,
		Accuracy:    req.Accuracy,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	// Save to database
	if err := s.locationRepo.Create(location); err != nil {
		return nil, err
	}

	// Get driver name
	driver, err := s.userRepo.FindByID(driverID)
	var driverName string
	if err == nil {
		driverName = driver.Name
	} else {
		driverName = "Unknown Driver"
	}

	// Create response
	response := &model.DriverLocationResponse{
		ID:         location.ID,
		RoutePlanID: location.RoutePlanID,
		DriverID:   location.DriverID,
		DriverName: driverName,
		Latitude:   location.Latitude,
		Longitude:  location.Longitude,
		Timestamp:  location.Timestamp,
		Speed:      location.Speed,
		Bearing:    location.Bearing,
		Accuracy:   location.Accuracy,
		CreatedAt:  location.CreatedAt,
	}

	return response, nil
}

// GetLatestDriverLocation retrieves the latest location of a driver for a specific route
func (s *driverLocationService) GetLatestDriverLocation(routePlanID uint) (*model.DriverLocationResponse, error) {
	// Check if the route plan exists
	_, err := s.routePlanRepo.FindByID(routePlanID)
	if err != nil {
		return nil, errors.New("route plan not found")
	}

	// Get latest location
	location, err := s.locationRepo.FindLatestByRoutePlanID(routePlanID)
	if err != nil {
		return nil, errors.New("no location data found for this route")
	}

	// Get driver name
	driver, err := s.userRepo.FindByID(location.DriverID)
	var driverName string
	if err == nil {
		driverName = driver.Name
	} else {
		driverName = "Unknown Driver"
	}

	// Create response
	response := &model.DriverLocationResponse{
		ID:         location.ID,
		RoutePlanID: location.RoutePlanID,
		DriverID:   location.DriverID,
		DriverName: driverName,
		Latitude:   location.Latitude,
		Longitude:  location.Longitude,
		Timestamp:  location.Timestamp,
		Speed:      location.Speed,
		Bearing:    location.Bearing,
		Accuracy:   location.Accuracy,
		CreatedAt:  location.CreatedAt,
	}

	return response, nil
}

// GetDriverLocationHistory retrieves the location history of a driver for a specific route
func (s *driverLocationService) GetDriverLocationHistory(routePlanID uint) ([]*model.DriverLocationResponse, error) {
	// Check if the route plan exists
	_, err := s.routePlanRepo.FindByID(routePlanID)
	if err != nil {
		return nil, errors.New("route plan not found")
	}

	// Get location history
	locations, err := s.locationRepo.FindByRoutePlanID(routePlanID)
	if err != nil {
		return nil, err
	}

	if len(locations) == 0 {
		return []*model.DriverLocationResponse{}, nil
	}

	// Get driver name
	driver, err := s.userRepo.FindByID(locations[0].DriverID)
	var driverName string
	if err == nil {
		driverName = driver.Name
	} else {
		driverName = "Unknown Driver"
	}

	// Create responses
	responses := make([]*model.DriverLocationResponse, len(locations))
	for i, location := range locations {
		responses[i] = &model.DriverLocationResponse{
			ID:         location.ID,
			RoutePlanID: location.RoutePlanID,
			DriverID:   location.DriverID,
			DriverName: driverName,
			Latitude:   location.Latitude,
			Longitude:  location.Longitude,
			Timestamp:  location.Timestamp,
			Speed:      location.Speed,
			Bearing:    location.Bearing,
			Accuracy:   location.Accuracy,
			CreatedAt:  location.CreatedAt,
		}
	}

	return responses, nil
}

// GetActiveRoute retrieves the active route for a driver with their current location
func (s *driverLocationService) GetActiveRoute(driverID uint) (*model.ActiveRouteResponse, error) {
	// Log untuk debugging
	fmt.Println("GetActiveRoute service called for driverID:", driverID)
    
	// Find active routes for the driver
	routePlans, err := s.routePlanRepo.FindByDriverID(driverID)
	if err != nil {
		return nil, fmt.Errorf("failed to find route plans: %w", err)
	}
	
	fmt.Printf("Found %d route plans for driver %d\n", len(routePlans), driverID)

	// Find active route
	var activeRoutePlan *model.RoutePlan
	for _, rp := range routePlans {
		fmt.Printf("Route plan %d has status: %s\n", rp.ID, rp.Status)
		if rp.Status == "active" {
			activeRoutePlan = rp
			break
		}
	}

	if activeRoutePlan == nil {
		return nil, errors.New("no active route found for this driver")
	}

	// Get route plan details
	routePlanResponse, err := s.routePlanSvc.GetRoutePlanByID(activeRoutePlan.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to get route plan details: %w", err)
	}

	// Get latest location
	var locationResponse *model.DriverLocationResponse
	location, err := s.locationRepo.FindLatestByRoutePlanID(activeRoutePlan.ID)
	if err == nil {
		// Get driver name
		driver, err := s.userRepo.FindByID(location.DriverID)
		var driverName string
		if err == nil {
			driverName = driver.Name
		} else {
			driverName = "Unknown Driver"
		}

		locationResponse = &model.DriverLocationResponse{
			ID:         location.ID,
			RoutePlanID: location.RoutePlanID,
			DriverID:   location.DriverID,
			DriverName: driverName,
			Latitude:   location.Latitude,
			Longitude:  location.Longitude,
			Timestamp:  location.Timestamp,
			Speed:      location.Speed,
			Bearing:    location.Bearing,
			Accuracy:   location.Accuracy,
			CreatedAt:  location.CreatedAt,
		}
	}

	// Create response
	response := &model.ActiveRouteResponse{
		RoutePlan: routePlanResponse,
		Location:  locationResponse,
	}

	return response, nil
}

// DeleteLocationHistory deletes all location history for a route
func (s *driverLocationService) DeleteLocationHistory(routePlanID uint) error {
	// Check if the route plan exists
	_, err := s.routePlanRepo.FindByID(routePlanID)
	if err != nil {
		return errors.New("route plan not found")
	}

	// Delete all locations for this route
	return s.locationRepo.DeleteAllByRoutePlanID(routePlanID)
}