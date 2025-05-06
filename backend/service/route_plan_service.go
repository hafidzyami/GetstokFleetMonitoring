package service

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
	"log"

	"github.com/hafidzyami/GetstokFleetMonitoring/backend/model"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/repository"
)

type RoutePlanService interface {
	CreateRoutePlan(req model.RoutePlanCreateRequest, plannerId uint) (*model.RoutePlanResponse, error)
	GetRoutePlansByDriverID(driverID uint) ([]*model.RoutePlanResponse, error)
	GetRoutePlanByID(id uint) (*model.RoutePlanResponse, error)
	GetAllRoutePlans() ([]*model.RoutePlanResponse, error)
	GetAllActiveRoutePlans() ([]*model.RoutePlanResponse, error)
	UpdateRoutePlanStatus(id uint, status string) error
	UpdateAvoidanceAreaStatus(id uint, status string) error
	DeleteRoutePlan(id uint) error
	DeleteAvoidanceArea(id uint) error
	AddAvoidanceAreaToRoutePlan(routePlanID uint, areaRequests []model.AvoidanceAreaRequest) (*model.RoutePlanResponse, error)
	GetAvoidanceAreasByPermanentStatus(isPermanent bool) ([]model.AvoidanceAreaResponse, error)
	UpdateRoutePlan(id uint, routeGeometry string, extras map[string]interface{}) (*model.RoutePlanResponse, error)
}

type routePlanService struct {
	routePlanRepo repository.RoutePlanRepository
	truckRepo     repository.TruckRepository
	userRepo      repository.UserRepository
	s3Service     S3Service
}

func NewRoutePlanService(
	routePlanRepo repository.RoutePlanRepository,
	truckRepo repository.TruckRepository,
	userRepo repository.UserRepository,
) RoutePlanService {
	s3Service, _ := NewS3Service()

	return &routePlanService{
		routePlanRepo: routePlanRepo,
		truckRepo:     truckRepo,
		userRepo:      userRepo,
		s3Service:     s3Service,
	}
}

func (s *routePlanService) AddAvoidanceAreaToRoutePlan(routePlanID uint, areaRequests []model.AvoidanceAreaRequest) (*model.RoutePlanResponse, error) {
	// Validasi route plan exists
	_, err := s.routePlanRepo.FindByID(routePlanID)
	if err != nil {
		return nil, fmt.Errorf("route plan not found: %w", err)
	}

	// Iterasi setiap area
	for _, areaReq := range areaRequests {
		// Buat area
		area := &model.RouteAvoidanceArea{
			RoutePlanID: routePlanID,
			Reason:      areaReq.Reason,
			IsPermanent: areaReq.IsPermanent,
			RequesterID: areaReq.RequesterID,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		}

		// Handle photo jika ada
		if areaReq.PhotoKey != "" && s.s3Service != nil {
			area.PhotoKey = areaReq.PhotoKey
			photoURL, err := s.s3Service.GeneratePresignedURL(areaReq.PhotoKey)
			if err == nil {
				area.PhotoURL = photoURL
			}
		}

		// Simpan area
		if err := s.routePlanRepo.AddAvoidanceArea(area); err != nil {
			return nil, fmt.Errorf("failed to save avoidance area: %w", err)
		}

		// Buat points
		var points []*model.RouteAvoidancePoint
		for i, point := range areaReq.Points {
			points = append(points, &model.RouteAvoidancePoint{
				RouteAvoidanceAreaID: area.ID,
				Latitude:             point.Latitude,
				Longitude:            point.Longitude,
				Order:                i,
				CreatedAt:            time.Now(),
				UpdatedAt:            time.Now(),
			})
		}

		// Simpan points
		if err := s.routePlanRepo.AddAvoidancePoints(points); err != nil {
			return nil, fmt.Errorf("failed to save avoidance points: %w", err)
		}
	}

	// Return updated route plan
	return s.GetRoutePlanByID(routePlanID)
}

func (s *routePlanService) GetRoutePlansByDriverID(driverID uint) ([]*model.RoutePlanResponse, error) {
	// Get route plans by driver ID
	routePlans, err := s.routePlanRepo.FindByDriverID(driverID)
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
		PlannerID:     plannerId,
		RouteGeometry: req.RouteGeometry,
		Status:        "planned",
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	// Jika ada informasi extras dari body request
	if req.ExtrasData != "" {
		// Parse extras data
		var extras model.RouteExtras
		if err := json.Unmarshal([]byte(req.ExtrasData), &extras); err == nil {
			if err := routePlan.SetExtras(&extras); err != nil {
				// Tangani error sesuai kebutuhan, misalnya log atau return
				log.Printf("failed to set extras: %v", err)
			}
		}
	}

	if err := s.routePlanRepo.Create(routePlan); err != nil {
		return nil, err
	}

	// Tambahkan waypoints
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

	// Tambahkan avoidance areas dan points
	for _, areaReq := range req.AvoidanceAreas {
		area := &model.RouteAvoidanceArea{
			RoutePlanID: routePlan.ID,
			Status:      areaReq.Status,
			Reason:      areaReq.Reason,
			IsPermanent: areaReq.IsPermanent,
			RequesterID: areaReq.RequesterID,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		}

		// Handle photo upload to S3 if photo is provided
		// Prioritaskan PhotoKey jika tersedia
		if areaReq.PhotoKey != "" {
			// Gunakan PhotoKey yang sudah diupload
			area.PhotoKey = areaReq.PhotoKey

			// Generate URL
			if s.s3Service != nil {
				photoURL, err := s.s3Service.GeneratePresignedURL(areaReq.PhotoKey)
				if err == nil {
					area.PhotoURL = photoURL
				}
			}
		} else if areaReq.Photo != "" && s.s3Service != nil {
			// Fallback ke cara lama jika PhotoKey tidak tersedia
			objectKey, photoURL, err := s.s3Service.UploadBase64Image(areaReq.Photo, "avoidance-areas")
			if err == nil {
				area.PhotoKey = objectKey
				area.PhotoURL = photoURL
			}
		}

		if err := s.routePlanRepo.AddAvoidanceArea(area); err != nil {
			return nil, err
		}

		// Tambahkan points for this area
		var points []*model.RouteAvoidancePoint
		for i, pointReq := range areaReq.Points {
			point := &model.RouteAvoidancePoint{
				RouteAvoidanceAreaID: area.ID,
				Latitude:             pointReq.Latitude,
				Longitude:            pointReq.Longitude,
				Order:                i,
				CreatedAt:            time.Now(),
				UpdatedAt:            time.Now(),
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

		// Regenerate URL if needed
		photoURL := area.PhotoURL
		if photoURL == "" && area.PhotoKey != "" && s.s3Service != nil {
			// Generate fresh URL if we have the object key
			newURL, err := s.s3Service.GeneratePresignedURL(area.PhotoKey)
			if err == nil {
				photoURL = newURL

				// Update the URL in the database
				area.PhotoURL = newURL
				if err := s.routePlanRepo.UpdateAvoidanceArea(area); err != nil {
					log.Printf("failed to update avoidance area: %v", err)
				}
			}
		}

		areaResponses[i] = model.AvoidanceAreaResponse{
			ID:          area.ID,
			Reason:      area.Reason,
			Status:      area.Status,
			RequesterID: area.RequesterID,
			IsPermanent: area.IsPermanent,
			PhotoURL:    photoURL,
			Points:      pointResponses,
		}
	}

	// Get extras data
	var extras *model.RouteExtras
	if routePlan.ExtrasData != "" {
		extras, _ = routePlan.GetExtras()
	}

	// Create response
	response := &model.RoutePlanResponse{
		ID:             routePlan.ID,
		DriverName:     driver.Name,
		PlannerName:    planner.Name,
		VehiclePlate:   truck.PlateNumber + "/" + truck.MacID,
		RouteGeometry:  routePlan.RouteGeometry,
		Extras:         extras,
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
	validStatuses := []string{"planned", "active", "completed", "cancelled", "on confirmation"}
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

// UpdateAvoidanceAreaStatus updates status of an avoidance area
func (s *routePlanService) UpdateAvoidanceAreaStatus(id uint, status string) error {
	// Validasi status
	validStatuses := []string{"pending", "approved", "rejected"}
	isValidStatus := false
	for _, validStatus := range validStatuses {
		if status == validStatus {
			isValidStatus = true
			break
		}
	}

	if !isValidStatus {
		return errors.New("invalid status: must be 'pending', 'approved', or 'rejected'")
	}

	// Verify avoidance area exists
	_, err := s.routePlanRepo.FindAvoidanceAreaByID(id)
	if err != nil {
		return errors.New("avoidance area not found")
	}

	// Update status
	return s.routePlanRepo.UpdateAvoidanceAreaStatus(id, status)
}

// DeleteAvoidanceArea deletes an avoidance area and its points
func (s *routePlanService) DeleteAvoidanceArea(id uint) error {
	// Verify avoidance area exists and get its data
	area, err := s.routePlanRepo.FindAvoidanceAreaByID(id)
	if err != nil {
		return errors.New("avoidance area not found")
	}

	// Delete photo from S3 if exists
	if area.PhotoKey != "" && s.s3Service != nil {
		_ = s.s3Service.DeleteObject(area.PhotoKey)
	}

	if err := s.UpdateAvoidanceAreaStatus(id, "rejected"); err != nil {
		log.Printf("failed to update avoidance area status to rejected: %v", err)
	}
	

	// Delete from database
	return s.routePlanRepo.DeleteAvoidanceArea(id)
}

// DeleteRoutePlan deletes a route plan
func (s *routePlanService) DeleteRoutePlan(id uint) error {
	// Get avoidance areas to delete photos from S3
	if s.s3Service != nil {
		areas, err := s.routePlanRepo.FindAvoidanceAreasByRoutePlanID(id)
		if err == nil {
			// Delete photos from S3
			for _, area := range areas {
				if area.PhotoKey != "" {
					_ = s.s3Service.DeleteObject(area.PhotoKey)
				}
			}
		}
	}

	// Delete route plan and related data from database
	return s.routePlanRepo.Delete(id)
}

// GetAvoidanceAreasByPermanentStatus returns all avoidance areas filtered by permanent status
func (s *routePlanService) GetAvoidanceAreasByPermanentStatus(isPermanent bool) ([]model.AvoidanceAreaResponse, error) {
	// Get avoidance areas by permanent status
	areas, err := s.routePlanRepo.FindAvoidanceAreasByPermanentStatus(isPermanent)
	if err != nil {
		return nil, err
	}

	// Create responses
	areaResponses := make([]model.AvoidanceAreaResponse, 0, len(areas))
	for _, area := range areas {
		// Get points for this area
		points, err := s.routePlanRepo.FindAvoidancePointsByAreaID(area.ID)
		if err != nil {
			continue // Skip this area if points can't be fetched
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

		// Regenerate URL if needed
		photoURL := area.PhotoURL
		if photoURL == "" && area.PhotoKey != "" && s.s3Service != nil {
			// Generate fresh URL if we have the object key
			newURL, err := s.s3Service.GeneratePresignedURL(area.PhotoKey)
			if err == nil {
				photoURL = newURL

				// Update the URL in the database
				area.PhotoURL = newURL
				if err := s.routePlanRepo.UpdateAvoidanceArea(area); err != nil {
					log.Printf("failed to update avoidance area: %v", err)
				}
			}
		}

		areaResponses = append(areaResponses, model.AvoidanceAreaResponse{
			ID:          area.ID,
			Reason:      area.Reason,
			Status:      area.Status,
			RequesterID: area.RequesterID,
			IsPermanent: area.IsPermanent,
			PhotoURL:    photoURL,
			Points:      pointResponses,
			CreatedAt:   area.CreatedAt,
		})
	}

	return areaResponses, nil
}

// UpdateRoutePlan updates the route geometry and extras of a route plan
func (s *routePlanService) UpdateRoutePlan(id uint, routeGeometry string, extras map[string]interface{}) (*model.RoutePlanResponse, error) {
	// Get route plan
	routePlan, err := s.routePlanRepo.FindByID(id)
	if err != nil {
		return nil, errors.New("route plan not found")
	}

	// Update route geometry
	routePlan.RouteGeometry = routeGeometry
	routePlan.UpdatedAt = time.Now()

	// Update extras if provided
	if extras != nil {
		// Convert generic map to RouteExtras struct
		extrasBytes, err := json.Marshal(extras)
		if err != nil {
			return nil, errors.New("invalid extras format")
		}

		// Store as JSON string
		routePlan.ExtrasData = string(extrasBytes)
	}

	// Save updates
	if err := s.routePlanRepo.Update(routePlan); err != nil {
		return nil, err
	}

	// Return updated route plan
	return s.GetRoutePlanByID(id)
}