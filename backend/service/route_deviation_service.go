package service

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/hafidzyami/GetstokFleetMonitoring/backend/model"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/repository"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/utils"
)

const (
	// Deviation threshold in meters
	DeviationThreshold = 35.0
)

// NotificationRequest represents the payload for sending notifications
type NotificationRequest struct {
	Title         string   `json:"title"`
	Message       string   `json:"message"`
	URL           string   `json:"url,omitempty"`
	TargetRoles   []string `json:"targetRoles"`
	TargetUserIDs []uint   `json:"targetUserIDs"`
}

type RouteDeviationService interface {
	DetectAndSaveDeviation(macID string, latitude, longitude float64, timestamp time.Time) error
}

type routeDeviationService struct {
	truckRepo         repository.TruckRepository
	routePlanRepo     repository.RoutePlanRepository
	deviationRepo     repository.RouteDeviationRepository
	userRepo          repository.UserRepository
}

func NewRouteDeviationService(
	truckRepo repository.TruckRepository,
	routePlanRepo repository.RoutePlanRepository,
	deviationRepo repository.RouteDeviationRepository,
	userRepo repository.UserRepository,
) RouteDeviationService {
	return &routeDeviationService{
		truckRepo:         truckRepo,
		routePlanRepo:     routePlanRepo,
		deviationRepo:     deviationRepo,
		userRepo:          userRepo,
	}
}

// DetectAndSaveDeviation checks if a truck position deviates from its route plan
// and saves the deviation if it exceeds the threshold
func (s *routeDeviationService) DetectAndSaveDeviation(macID string, latitude, longitude float64, timestamp time.Time) error {
	// Find the truck by MAC ID
	truck, err := s.truckRepo.FindByMacID(macID)
	if err != nil {
		return err
	}

	// Find the active route plan for this truck
	routePlan, err := s.routePlanRepo.FindActiveRoutePlansByTruckID(truck.ID)
	if err != nil {
		// No active route plan for this truck, skip deviation check
		log.Printf("No active route plan found for truck %s (ID: %d)", macID, truck.ID)
		return nil
	}

	// Get route plan details including driver ID
	driverID := routePlan.DriverID

	// Decode the route geometry
	points, err := utils.DecodeRouteGeometry(routePlan.RouteGeometry)
	if err != nil {
		log.Printf("Error decoding route geometry for route plan %d: %v", routePlan.ID, err)
		return err
	}

	if len(points) == 0 {
		log.Printf("Empty route geometry for route plan %d", routePlan.ID)
		return nil
	}

	// Calculate the distance from the truck position to the route
	currentPoint := utils.LatLng{Lat: latitude, Lng: longitude}
	distance, referencePoint, segmentIndex := utils.CalculateDistanceToPolyline(currentPoint, points)

	// Check if the distance exceeds the threshold
	if distance >= DeviationThreshold {
		// Create a new route deviation record
		deviation := &model.TruckRouteDeviation{
			TruckID:      truck.ID,
			MacID:        macID,
			RoutePlanID:  routePlan.ID,
			DriverID:     driverID,
			Latitude:     latitude,
			Longitude:    longitude,
			RefLatitude:  referencePoint.Lat,
			RefLongitude: referencePoint.Lng,
			Distance:     distance,
			SegmentIndex: segmentIndex,
			Timestamp:    timestamp,
			CreatedAt:    time.Now(),
		}

		// Save the deviation
		err = s.deviationRepo.Create(deviation)
		if err != nil {
			log.Printf("Error saving route deviation for truck %s: %v", macID, err)
			return err
		}

		log.Printf("Route deviation detected and saved for truck %s (ID: %d): %.2f meters from route", 
			macID, truck.ID, distance)

		// Get vehicle plate number for notification
		plateNumber := truck.PlateNumber
		if plateNumber == "" {
			plateNumber = macID
		}

		// After saving to the database, send notification
		// Get driver name if userRepo is available
		var driverName string
		if s.userRepo != nil {
			driver, err := s.userRepo.FindByID(driverID)
			if err == nil && driver != nil {
				driverName = driver.Name
			}
		}
		
		if driverName == "" {
			driverName = fmt.Sprintf("Driver #%d", driverID)
		}

		// Create notification
		if err := s.sendDeviationNotification(truck, routePlan, distance, driverID, plateNumber, driverName); err != nil {
			log.Printf("Error sending route deviation notification: %v", err)
			// Don't return the error here to avoid disrupting the main flow
		}
	}

	return nil
}

// sendDeviationNotification sends a push notification about the route deviation
func (s *routeDeviationService) sendDeviationNotification(truck *model.Truck, routePlan *model.RoutePlan, distance float64, driverID uint, plateNumber, driverName string) error {
	// Get notification service URL from environment
	notificationServiceURL := os.Getenv("NOTIFICATION_SERVICE_URL")
	if notificationServiceURL == "" {
		// Default URL for container environment
		notificationServiceURL = "http://getstok-notification:8081/api/v1/push/send"
	} else {
		notificationServiceURL = fmt.Sprintf("%s/api/v1/push/send", notificationServiceURL)
	}

	// Prepare notification message
	title := "Route Deviation Alert"
	message := fmt.Sprintf("Vehicle %s operated by %s is deviating from its planned route by %.0f meters.", 
		plateNumber, driverName, distance)

	// Optional: Add URL to redirect to when notification is clicked
	// This could be the dashboard page with the active truck selected
	url := fmt.Sprintf("/management/dashboard?truck=%s", truck.MacID)

	// Create notification request
	notificationPayload := NotificationRequest{
		Title:         title,
		Message:       message,
		URL:           url,
		TargetRoles:   []string{"management"}, // Send to all management users
		TargetUserIDs: []uint{driverID},       // Also notify the driver
	}

	// Convert to JSON
	jsonData, err := json.Marshal(notificationPayload)
	if err != nil {
		return fmt.Errorf("error marshaling notification payload: %w", err)
	}

	// Send POST request to notification service
	resp, err := http.Post(notificationServiceURL, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("error sending notification request: %w", err)
	}
	defer resp.Body.Close()

	// Check response status
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("notification service returned non-OK status: %d", resp.StatusCode)
	}

	log.Printf("Route deviation notification sent for truck %s (Driver ID: %d)", truck.MacID, driverID)
	return nil
}
