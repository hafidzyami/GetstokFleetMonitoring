package service

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/hafidzyami/GetstokFleetMonitoring/backend/model"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/repository"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/websocket"
)

const (
	// IdleRadius is the radius in meters within which a truck is considered to be idling
	IdleRadius = 15.0
	
	// IdleDetectionCount is the number of position reports within IdleRadius needed to trigger idle detection
	IdleDetectionCount = 12
)


// IdlePosition menyimpan posisi sementara untuk deteksi idle
type IdlePosition struct {
	Latitude  float64
	Longitude float64
	Timestamp time.Time
}

// PositionCache menyimpan cache posisi untuk setiap truck
type PositionCache struct {
	MacID     string
	Positions []IdlePosition
	mutex     sync.Mutex
}

// TruckIdleService mengelola deteksi dan notifikasi idle truck
type TruckIdleService interface {
	ProcessPosition(macID string, latitude, longitude float64, timestamp time.Time) error
	GetAllIdleDetections() ([]*model.TruckIdleResponse, error)
	GetIdleDetectionsByTruckID(truckID uint) ([]*model.TruckIdleResponse, error)
	GetIdleDetectionsByMacID(macID string) ([]*model.TruckIdleResponse, error)
	ResolveIdleDetection(idleID uint) error
	GetActiveIdleDetections() ([]*model.TruckIdleResponse, error)
}

type truckIdleService struct {
	idleRepo      repository.TruckIdleRepository
	truckRepo     repository.TruckRepository
	userRepo      repository.UserRepository
	routePlanRepo repository.RoutePlanRepository
	positionCache map[string]*PositionCache
	cacheMutex    sync.RWMutex
}

// NewTruckIdleService creates a new instance of TruckIdleService
func NewTruckIdleService(
	idleRepo repository.TruckIdleRepository,
	truckRepo repository.TruckRepository,
	userRepo repository.UserRepository,
	routePlanRepo repository.RoutePlanRepository,
) TruckIdleService {
	return &truckIdleService{
		idleRepo:      idleRepo,
		truckRepo:     truckRepo,
		userRepo:      userRepo,
		routePlanRepo: routePlanRepo,
		positionCache: make(map[string]*PositionCache),
	}
}

// calculateDistance calculates the distance between two coordinates in meters
func calculateDistance(lat1, lon1, lat2, lon2 float64) float64 {
	const R = 6371000.0 // Earth radius in meters
	
	phi1 := lat1 * math.Pi / 180
	phi2 := lat2 * math.Pi / 180
	deltaPhi := (lat2 - lat1) * math.Pi / 180
	deltaLambda := (lon2 - lon1) * math.Pi / 180
	
	a := math.Sin(deltaPhi/2)*math.Sin(deltaPhi/2) +
		math.Cos(phi1)*math.Cos(phi2)*
			math.Sin(deltaLambda/2)*math.Sin(deltaLambda/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	
	return R * c
}

// isWithinRadius checks if a position is within specified radius from reference
func isWithinRadius(refLat, refLon, lat, lon, radius float64) bool {
	return calculateDistance(refLat, refLon, lat, lon) <= radius
}

// getOrCreateCache gets the position cache for macID or creates a new one if it doesn't exist
func (s *truckIdleService) getOrCreateCache(macID string) *PositionCache {
	s.cacheMutex.RLock()
	cache, exists := s.positionCache[macID]
	s.cacheMutex.RUnlock()
	
	if !exists {
		cache = &PositionCache{
			MacID:     macID,
			Positions: make([]IdlePosition, 0, IdleDetectionCount),
		}
		s.cacheMutex.Lock()
		s.positionCache[macID] = cache
		s.cacheMutex.Unlock()
	}
	
	return cache
}

// ProcessPosition processes a new position report and detects idle state
func (s *truckIdleService) ProcessPosition(macID string, latitude, longitude float64, timestamp time.Time) error {
	// Get cache for this truck
	cache := s.getOrCreateCache(macID)
	
	// Lock cache for this operation
	cache.mutex.Lock()
	defer cache.mutex.Unlock()
	
	// Create new position
	newPos := IdlePosition{
		Latitude:  latitude,
		Longitude: longitude,
		Timestamp: timestamp,
	}
	
	// If cache is empty, just add the position and return
	if len(cache.Positions) == 0 {
		cache.Positions = append(cache.Positions, newPos)
		return nil
	}
	
	// Get first (reference) position in cache
	refPos := cache.Positions[0]
	
	// Check if new position is within idle radius of reference position
	if isWithinRadius(refPos.Latitude, refPos.Longitude, latitude, longitude, IdleRadius) {
		// Add new position to cache
		cache.Positions = append(cache.Positions, newPos)
		
		// Check if we have enough positions to trigger idle detection
		if len(cache.Positions) >= IdleDetectionCount {
			// Trigger idle detection
			if err := s.createIdleDetection(macID, refPos, newPos); err != nil {
				return err
			}
			
			// Clear cache after detection
			cache.Positions = []IdlePosition{}
		}
	} else {
		// Position is outside idle radius, reset cache with new reference position
		cache.Positions = []IdlePosition{newPos}
		
		// Check if there's an active idle detection and resolve it
		existingIdle, err := s.idleRepo.FindActiveByMacID(macID)
		if err == nil && existingIdle != nil {
			// Update existing idle detection to mark it as resolved
			existingIdle.IsResolved = true
			existingIdle.EndTime = timestamp
			existingIdle.Duration = int(timestamp.Sub(existingIdle.StartTime).Seconds())
			existingIdle.UpdatedAt = time.Now()
			
			if err := s.idleRepo.Update(existingIdle); err != nil {
				log.Printf("Failed to resolve idle detection when truck moved: %v", err)
			} else {
				log.Printf("Resolved idle detection for truck %s as it moved outside idle radius", macID)
				
				// Send notification about resolution
				s.sendIdleResolvedNotification(macID, existingIdle.ID, existingIdle.Duration)
			}
		}
	}
	
	return nil
}

// createIdleDetection creates a new idle detection record and sends notification
func (s *truckIdleService) createIdleDetection(macID string, startPos, endPos IdlePosition) error {
	// Check if there's already an active (unresolved) idle detection for this truck
	existingIdle, err := s.idleRepo.FindActiveByMacID(macID)
	if err == nil && existingIdle != nil {
		// Update existing idle detection instead of creating a new one
		existingIdle.EndTime = endPos.Timestamp
		existingIdle.Duration = int(endPos.Timestamp.Sub(existingIdle.StartTime).Seconds())
		existingIdle.UpdatedAt = time.Now()
		
		if err := s.idleRepo.Update(existingIdle); err != nil {
			return fmt.Errorf("failed to update existing idle detection: %w", err)
		}
		
		// Send updated notification
		s.sendIdleNotification(macID, existingIdle.Latitude, existingIdle.Longitude, 
			existingIdle.StartTime, existingIdle.Duration)
		
		return nil
	}
	
	// Find truckID from macID
	truck, err := s.truckRepo.FindByMacID(macID)
	if err != nil {
		return fmt.Errorf("failed to find truck by macID: %w", err)
	}
	
	// Calculate duration in seconds
	duration := int(endPos.Timestamp.Sub(startPos.Timestamp).Seconds())
	
	// Create new idle detection
	idleDetection := &model.TruckIdleDetection{
		TruckID:    truck.ID,
		MacID:      macID,
		Latitude:   startPos.Latitude,
		Longitude:  startPos.Longitude,
		StartTime:  startPos.Timestamp,
		EndTime:    endPos.Timestamp,
		Duration:   duration,
		IsResolved: false,
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}
	
	// Save to database
	if err := s.idleRepo.Create(idleDetection); err != nil {
		return fmt.Errorf("failed to create idle detection: %w", err)
	}
	
	log.Printf("Idle detection created for truck %s: duration %d seconds", macID, duration)
	
	// Send WebSocket notification
	s.sendIdleNotification(macID, startPos.Latitude, startPos.Longitude, startPos.Timestamp, duration)
	
	// Send push notification
	if err := s.sendIdlePushNotification(truck, duration); err != nil {
		log.Printf("Error sending idle push notification: %v", err)
		// Don't return the error here to avoid disrupting the main flow
	}
	
	return nil
}

// sendIdleNotification sends a notification about idle detection through WebSocket
func (s *truckIdleService) sendIdleNotification(macID string, latitude, longitude float64, 
	startTime time.Time, duration int) {
	
	// Get truck info for plate number
	truck, err := s.truckRepo.FindByMacID(macID)
	var plateNumber string
	if err == nil {
		plateNumber = truck.PlateNumber
	}
	
	// Create notification
	notification := model.WebsocketIdleNotification{
		Type:        "idle_detection",
		MacID:       macID,
		PlateNumber: plateNumber,
		Latitude:    latitude,
		Longitude:   longitude,
		StartTime:   startTime,
		Duration:    duration,
	}
	
	// Marshal to JSON
	jsonData, err := json.Marshal(notification)
	if err != nil {
		log.Printf("Error marshaling idle notification: %v", err)
		return
	}
	
	// Broadcast notification to all WebSocket clients
	wsHub := websocket.GetHub()
	if wsHub != nil {
		clientCount := wsHub.GetClientCount()
		if clientCount > 0 {
			wsHub.Broadcast(jsonData)
			log.Printf("Broadcasted idle notification to %d clients", clientCount)
		} else {
			log.Printf("No WebSocket clients connected, idle notification not broadcasted")
		}
	}
}

// sendIdleResolvedNotification sends a notification when an idle state is resolved
func (s *truckIdleService) sendIdleResolvedNotification(macID string, idleID uint, duration int) {
	// Get truck info for plate number
	truck, err := s.truckRepo.FindByMacID(macID)
	var plateNumber string
	if err == nil {
		plateNumber = truck.PlateNumber
	}
	
	// Create notification
	notification := map[string]interface{}{
		"type":         "idle_resolved",
		"mac_id":       macID,
		"plate_number": plateNumber,
		"idle_id":      idleID,
		"duration":     duration,
		"timestamp":    time.Now(),
	}
	
	// Marshal to JSON
	jsonData, err := json.Marshal(notification)
	if err != nil {
		log.Printf("Error marshaling idle resolution notification: %v", err)
		return
	}
	
	// Broadcast notification to all WebSocket clients
	wsHub := websocket.GetHub()
	if wsHub != nil {
		clientCount := wsHub.GetClientCount()
		if clientCount > 0 {
			wsHub.Broadcast(jsonData)
			log.Printf("Broadcasted idle resolution notification to %d clients", clientCount)
		} else {
			log.Printf("No WebSocket clients connected, idle resolution notification not broadcasted")
		}
	}
}

// GetAllIdleDetections returns all idle detections
func (s *truckIdleService) GetAllIdleDetections() ([]*model.TruckIdleResponse, error) {
	idles, err := s.idleRepo.FindAll()
	if err != nil {
		return nil, err
	}
	
	return s.mapIdleDetectionsToResponses(idles)
}

// GetIdleDetectionsByTruckID returns idle detections for a specific truck
func (s *truckIdleService) GetIdleDetectionsByTruckID(truckID uint) ([]*model.TruckIdleResponse, error) {
	idles, err := s.idleRepo.FindByTruckID(truckID)
	if err != nil {
		return nil, err
	}
	
	return s.mapIdleDetectionsToResponses(idles)
}

// GetIdleDetectionsByMacID returns idle detections for a specific MAC ID
func (s *truckIdleService) GetIdleDetectionsByMacID(macID string) ([]*model.TruckIdleResponse, error) {
	idles, err := s.idleRepo.FindByMacID(macID)
	if err != nil {
		return nil, err
	}
	
	return s.mapIdleDetectionsToResponses(idles)
}

// ResolveIdleDetection marks an idle detection as resolved
func (s *truckIdleService) ResolveIdleDetection(idleID uint) error {
	idle, err := s.idleRepo.FindByID(idleID)
	if err != nil {
		return fmt.Errorf("idle detection not found: %w", err)
	}
	
	idle.IsResolved = true
	idle.UpdatedAt = time.Now()
	
	return s.idleRepo.Update(idle)
}

// GetActiveIdleDetections returns all active (unresolved) idle detections
func (s *truckIdleService) GetActiveIdleDetections() ([]*model.TruckIdleResponse, error) {
	idles, err := s.idleRepo.FindAllActive()
	if err != nil {
		return nil, err
	}
	
	return s.mapIdleDetectionsToResponses(idles)
}

// mapIdleDetectionsToResponses maps model entities to response DTOs
func (s *truckIdleService) mapIdleDetectionsToResponses(idles []*model.TruckIdleDetection) ([]*model.TruckIdleResponse, error) {
	responses := make([]*model.TruckIdleResponse, len(idles))
	
	for i, idle := range idles {
		// Get truck plate number
		var plateNumber string
		truck, err := s.truckRepo.FindByID(idle.TruckID)
		if err == nil {
			plateNumber = truck.PlateNumber
		}
		
		responses[i] = &model.TruckIdleResponse{
			ID:         idle.ID,
			TruckID:    idle.TruckID,
			MacID:      idle.MacID,
			PlateNumber: plateNumber,
			Latitude:   idle.Latitude,
			Longitude:  idle.Longitude,
			StartTime:  idle.StartTime,
			EndTime:    idle.EndTime,
			Duration:   idle.Duration,
			IsResolved: idle.IsResolved,
			CreatedAt:  idle.CreatedAt,
		}
	}
	
	return responses, nil
}

// sendIdlePushNotification sends a push notification about idle detection
func (s *truckIdleService) sendIdlePushNotification(truck *model.Truck, duration int) error {
	// Get notification service URL from environment
	notificationServiceURL := os.Getenv("NOTIFICATION_SERVICE_URL")
	if notificationServiceURL == "" {
		// Default URL for container environment
		notificationServiceURL = "http://getstok-notification:8081/api/v1/push/send"
	} else {
		notificationServiceURL = fmt.Sprintf("%s/api/v1/push/send", notificationServiceURL)
	}

	// Get vehicle plate number for notification
	plateNumber := truck.PlateNumber
	if plateNumber == "" {
		plateNumber = truck.MacID
	}

	// Get driver information if available
	var driverID uint
	var driverName string

	// Try to find active route plan to get driver info
	if s.routePlanRepo != nil {
		routePlan, err := s.routePlanRepo.FindActiveRoutePlansByTruckID(truck.ID)
		if err == nil && routePlan != nil {
			driverID = routePlan.DriverID

			// Get driver name if userRepo is available
			if s.userRepo != nil {
				driver, err := s.userRepo.FindByID(driverID)
				if err == nil && driver != nil {
					driverName = driver.Name
				}
			}
		}
	}

	if driverName == "" {
		if driverID != 0 {
			driverName = fmt.Sprintf("Driver #%d", driverID)
		} else {
			driverName = "Unknown Driver"
		}
	}

	// Convert duration to minutes for user-friendly message
	durationMinutes := duration / 60

	// Prepare notification message
	title := "Vehicle Idle Alert"
	message := fmt.Sprintf("Vehicle %s operated by %s has been idle for %d minutes.", 
		plateNumber, driverName, durationMinutes)

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

	log.Printf("Idle push notification sent for truck %s (Driver ID: %d)", truck.MacID, driverID)
	return nil
}
