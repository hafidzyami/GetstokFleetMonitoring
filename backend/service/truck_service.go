package service

import (
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/model"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/repository"
)

type TruckService interface {
	GetAllTrucks() ([]*model.TruckResponse, error)
	GetTruckByMacID(macID string) (*model.TruckResponse, error)
	UpdateTruckInfo(macID string, plateNumber string, truckType string) error
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