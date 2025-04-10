// service/truck_history_service.go
package service

import (
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/model"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/repository"
)

type TruckHistoryService interface {
	GetPositionHistory(truckID uint, limit int) ([]*model.TruckPositionHistory, error)
	GetFuelHistory(truckID uint, limit int) ([]*model.TruckFuelHistory, error)
}

type truckHistoryService struct {
	truckHistoryRepo repository.TruckHistoryRepository
}

func NewTruckHistoryService(truckHistoryRepo repository.TruckHistoryRepository) TruckHistoryService {
	return &truckHistoryService{
		truckHistoryRepo: truckHistoryRepo,
	}
}

func (s *truckHistoryService) GetPositionHistory(truckID uint, limit int) ([]*model.TruckPositionHistory, error) {
	return s.truckHistoryRepo.GetPositionHistoryByTruckID(truckID, limit)
}

func (s *truckHistoryService) GetFuelHistory(truckID uint, limit int) ([]*model.TruckFuelHistory, error) {
	return s.truckHistoryRepo.GetFuelHistoryByTruckID(truckID, limit)
}