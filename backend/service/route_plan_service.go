package service

import (
	"errors"
	"strings"
	"time"

	"github.com/hafidzyami/GetstokFleetMonitoring/backend/model"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/repository"
)

type RoutePlanService interface {
	CreateRoutePlan(req model.RoutePlanCreateRequest, plannerId uint) (*model.RoutePlanResponse, error)
	GetRoutePlanByID(id uint) (*model.RoutePlanResponse, error)
	GetAllRoutePlans() ([]*model.RoutePlanResponse, error)
	UpdateRoutePlanStatus(id uint, status string) error
	DeleteRoutePlan(id uint) error
}

type routePlanService struct {
	routePlanRepo repository.RoutePlanRepository
	truckRepo     repository.TruckRepository
	userRepo      repository.UserRepository
}

func NewRoutePlanService(
	routePlanRepo repository.RoutePlanRepository, 
	truckRepo repository.TruckRepository,
	userRepo repository.UserRepository,
) RoutePlanService {
	return &routePlanService{
		routePlanRepo: routePlanRepo,
		truckRepo:     truckRepo,
		userRepo:      userRepo,
	}
}

// CreateRoutePlan creates a new route plan
func (s *routePlanService) CreateRoutePlan(req model.RoutePlanCreateRequest, plannerId uint) (*model.RoutePlanResponse, error) {
	// Find driver by name
	var driverId uint
	drivers, err := s.userRepo.FindByRole("driver")
	if err != nil {
		return nil, err
	}
	
	driverFound := false
	for _, driver := range drivers {
		if driver.Name == req.DriverName {
			driverId = driver.ID
			driverFound = true
			break
		}
	}
	
	if !driverFound {
		return nil, errors.New("driver not found")
	}
	
	// Find truck by plate number or MAC ID
	var truckId uint
	plateAndMac := strings.Split(req.VehiclePlate, "/")
	if len(plateAndMac) < 2 {
		return nil, errors.New("invalid vehicle plate format")
	}
	
	macID := strings.TrimSpace(plateAndMac[1])
	
	truck, err := s.truckRepo.FindByMacID(macID)
	if err != nil {
		return nil, errors.New("truck not found")
	}
	
	truckId = truck.ID
	
	// Create new route plan
	routePlan := &model.RoutePlan{
		DriverID:      driverId,
		TruckID:       truckId,
		PlannerID:     plannerId, // Add planner ID to route plan
		RouteGeometry: req.RouteGeometry,
		Status:        "planned",
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}
	
	if err := s.routePlanRepo.Create(routePlan); err != nil {
		return nil, err
	}
	
	// Add waypoints
	var waypoints []*model.RouteWaypoint
	for i, waypointReq := range req.Waypoints {
		waypoint := &model.RouteWaypoint{
			RoutePlanID: routePlan.ID,
			Latitude:    waypointReq.Latitude,
			Longitude:   waypointReq.Longitude,
			Address:     waypointReq.Address,
			Order:       i,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		}
		waypoints = append(waypoints, waypoint)
	}
	
	if err := s.routePlanRepo.AddWaypoints(waypoints); err != nil {
		return nil, err
	}
	
	// Add avoidance areas and points
	for _, areaReq := range req.AvoidanceAreas {
		area := &model.RouteAvoidanceArea{
			RoutePlanID:   routePlan.ID,
			Reason:        areaReq.Reason,
			IsPermanent:   areaReq.IsPermanent,
			PhotoData:     areaReq.Photo,
			CreatedAt:     time.Now(),
			UpdatedAt:     time.Now(),
		}
		
		if err := s.routePlanRepo.AddAvoidanceArea(area); err != nil {
			return nil, err
		}
		
		// Add points for this area
		var points []*model.RouteAvoidancePoint
		for i, pointReq := range areaReq.Points {
			point := &model.RouteAvoidancePoint{
				RouteAvoidanceAreaID: area.ID,
				Latitude:            pointReq.Latitude,
				Longitude:           pointReq.Longitude,
				Order:               i,
				CreatedAt:           time.Now(),
				UpdatedAt:           time.Now(),
			}
			points = append(points, point)
		}
		
		if err := s.routePlanRepo.AddAvoidancePoints(points); err != nil {
			return nil, err
		}
	}
	
	// Return created route plan
	return s.GetRoutePlanByID(routePlan.ID)
}

// GetRoutePlanByID retrieves a route plan by ID
func (s *routePlanService) GetRoutePlanByID(id uint) (*model.RoutePlanResponse, error) {
	// Get route plan
	routePlan, err := s.routePlanRepo.FindByID(id)
	if err != nil {
		return nil, err
	}
	
	// Get driver info
	driver, err := s.userRepo.FindByID(routePlan.DriverID)
	if err != nil {
		return nil, err
	}
	
	// Get planner info
	planner, err := s.userRepo.FindByID(routePlan.PlannerID)
	if err != nil {
		// If planner not found, proceed without planner name
		planner = &model.User{Name: "Unknown"}
	}
	
	// Get truck info
	truck, err := s.truckRepo.FindByID(routePlan.TruckID)
	if err != nil {
		return nil, err
	}
	
	// Get waypoints
	waypoints, err := s.routePlanRepo.FindWaypointsByRoutePlanID(routePlan.ID)
	if err != nil {
		return nil, err
	}
	
	waypointResponses := make([]model.WaypointResponse, len(waypoints))
	for i, waypoint := range waypoints {
		waypointResponses[i] = model.WaypointResponse{
			ID:        waypoint.ID,
			Latitude:  waypoint.Latitude,
			Longitude: waypoint.Longitude,
			Address:   waypoint.Address,
			Order:     waypoint.Order,
		}
	}
	
	// Get avoidance areas
	areas, err := s.routePlanRepo.FindAvoidanceAreasByRoutePlanID(routePlan.ID)
	if err != nil {
		return nil, err
	}
	
	areaResponses := make([]model.AvoidanceAreaResponse, len(areas))
	for i, area := range areas {
		// Get points for this area
		points, err := s.routePlanRepo.FindAvoidancePointsByAreaID(area.ID)
		if err != nil {
			return nil, err
		}
		
		pointResponses := make([]model.AvoidancePointResponse, len(points))
		for j, point := range points {
			pointResponses[j] = model.AvoidancePointResponse{
				ID:        point.ID,
				Latitude:  point.Latitude,
				Longitude: point.Longitude,
				Order:     point.Order,
			}
		}
		
		areaResponses[i] = model.AvoidanceAreaResponse{
			ID:          area.ID,
			Reason:      area.Reason,
			IsPermanent: area.IsPermanent,
			HasPhoto:    area.PhotoData != "",
			Points:      pointResponses,
		}
	}
	
	// Create response
	response := &model.RoutePlanResponse{
		ID:             routePlan.ID,
		DriverName:     driver.Name,
		PlannerName:    planner.Name,  // Add planner name to response
		VehiclePlate:   truck.PlateNumber + "/" + truck.MacID,
		RouteGeometry:  routePlan.RouteGeometry,
		Status:         routePlan.Status,
		Waypoints:      waypointResponses,
		AvoidanceAreas: areaResponses,
		CreatedAt:      routePlan.CreatedAt,
		UpdatedAt:      routePlan.UpdatedAt,
	}
	
	return response, nil
}

// GetAllRoutePlans retrieves all route plans
func (s *routePlanService) GetAllRoutePlans() ([]*model.RoutePlanResponse, error) {
	// Get all route plans
	routePlans, err := s.routePlanRepo.FindAll()
	if err != nil {
		return nil, err
	}
	
	// Create responses
	responses := make([]*model.RoutePlanResponse, len(routePlans))
	for i, routePlan := range routePlans {
		response, err := s.GetRoutePlanByID(routePlan.ID)
		if err != nil {
			return nil, err
		}
		responses[i] = response
	}
	
	return responses, nil
}

// UpdateRoutePlanStatus updates the status of a route plan
func (s *routePlanService) UpdateRoutePlanStatus(id uint, status string) error {
	// Validate status
	validStatuses := []string{"planned", "active", "completed", "cancelled"}
	isValidStatus := false
	for _, validStatus := range validStatuses {
		if status == validStatus {
			isValidStatus = true
			break
		}
	}
	
	if !isValidStatus {
		return errors.New("invalid status")
	}
	
	// Get route plan
	routePlan, err := s.routePlanRepo.FindByID(id)
	if err != nil {
		return err
	}
	
	// Update status
	routePlan.Status = status
	routePlan.UpdatedAt = time.Now()
	
	return s.routePlanRepo.Update(routePlan)
}

// DeleteRoutePlan deletes a route plan
func (s *routePlanService) DeleteRoutePlan(id uint) error {
	return s.routePlanRepo.Delete(id)
}