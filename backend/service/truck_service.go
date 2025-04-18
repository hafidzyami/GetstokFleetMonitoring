package service

import (
	"fmt"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/model"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/repository"
)

type TruckService interface {
	GetAllTrucks() ([]*model.TruckResponse, error)
	GetTruckByMacID(macID string) (*model.TruckResponse, error)
	UpdateTruckInfo(macID string, plateNumber string, truckType string) error
	UpdateTruckInfoByID(id uint, macID string, plateNumber string, truckType string) error
	CreateTruck(truck *model.Truck) error
}

type truckService struct {
	truckRepo repository.TruckRepository
}

func NewTruckService(truckRepo repository.TruckRepository) TruckService {
	return &truckService{
		truckRepo: truckRepo,
	}
}

// GetAllTrucks returns all trucks
func (s *truckService) GetAllTrucks() ([]*model.TruckResponse, error) {
	trucks, err := s.truckRepo.FindAll()
	if err != nil {
		return nil, err
	}
	
	// Convert to response DTOs
	var responses []*model.TruckResponse
	for _, truck := range trucks {
		response := truck.ToTruckResponse()
		responses = append(responses, &response)
	}
	
	return responses, nil
}

// GetTruckByMacID finds truck by mac_id
func (s *truckService) GetTruckByMacID(macID string) (*model.TruckResponse, error) {
	truck, err := s.truckRepo.FindByMacID(macID)
	if err != nil {
		return nil, err
	}
	
	response := truck.ToTruckResponse()
	return &response, nil
}

// UpdateTruckInfo updates truck information
func (s *truckService) UpdateTruckInfo(macID string, plateNumber string, truckType string) error {
	// Validate if truck exists
	_, err := s.truckRepo.FindByMacID(macID)
	if err != nil {
		return err
	}
	
	// Update truck information
	return s.truckRepo.UpdateInfo(macID, plateNumber, truckType)
}

// UpdateTruckInfoByID updates truck information including MAC ID by truck ID
func (s *truckService) UpdateTruckInfoByID(id uint, macID string, plateNumber string, truckType string) error {
	// Validate if truck exists
	truck, err := s.truckRepo.FindByID(id)
	if err != nil {
		return err
	}
	
	// Check if MAC ID is being changed and if the new MAC ID is already used
	if macID != "" && macID != truck.MacID {
		// Check if the new MAC ID already exists
		existingTruck, err := s.truckRepo.FindByMacID(macID)
		if err == nil && existingTruck.ID != id {
			return fmt.Errorf("another truck with MAC ID %s already exists", macID)
		}
		
		// Update MAC ID
		truck.MacID = macID
	}
	
	// Update other fields if provided
	if plateNumber != "" {
		truck.PlateNumber = plateNumber
	}
	
	if truckType != "" {
		truck.Type = truckType
	}
	
	// Update the truck
	return s.truckRepo.Update(truck)
}

// CreateTruck creates a new truck
func (s *truckService) CreateTruck(truck *model.Truck) error {
	// Check if truck with same MAC ID already exists
	_, err := s.truckRepo.FindByMacID(truck.MacID)
	if err == nil {
		return fmt.Errorf("truck with MAC ID %s already exists", truck.MacID)
	}
	
	// Create the truck
	return s.truckRepo.Create(truck)
}