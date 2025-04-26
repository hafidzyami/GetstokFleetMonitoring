// service/truck_history_service.go
package service

import (
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/model"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/repository"
)

type TruckHistoryService interface {
	GetPositionHistory(truckID uint, limit int) ([]*model.TruckPositionHistory, error)
	GetFuelHistory(truckID uint, limit int) ([]*model.TruckFuelHistory, error)
	GetPositionHistoryLast30Days(truckID uint) ([]*model.DateGroupedPositionHistory, error)
	GetFuelHistoryLast30Days(truckID uint) ([]*model.DateGroupedFuelHistory, error)
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

// GetPositionHistoryLast30Days mengambil riwayat posisi untuk 30 hari terakhir dan mengelompokkannya berdasarkan tanggal
func (s *truckHistoryService) GetPositionHistoryLast30Days(truckID uint) ([]*model.DateGroupedPositionHistory, error) {
	// Ambil data posisi untuk 30 hari terakhir
	positions, err := s.truckHistoryRepo.GetPositionHistoryByTruckIDWithDateRange(truckID, 30)
	if err != nil {
		return nil, err
	}
	
	// Map untuk mengelompokkan data berdasarkan tanggal
	groupedPositions := make(map[string][]*model.TruckPositionHistory)
	for _, position := range positions {
		// Format tanggal sebagai string YYYY-MM-DD
		dateKey := position.Timestamp.Format("2006-01-02")
		groupedPositions[dateKey] = append(groupedPositions[dateKey], position)
	}
	
	// Konversi map menjadi array untuk respons JSON
	result := make([]*model.DateGroupedPositionHistory, 0, len(groupedPositions))
	for dateKey, positions := range groupedPositions {
		result = append(result, &model.DateGroupedPositionHistory{
			Date:      dateKey,
			Positions: positions,
		})
	}
	
	return result, nil
}

// GetFuelHistoryLast30Days mengambil riwayat fuel untuk 30 hari terakhir dan mengelompokkannya berdasarkan tanggal
func (s *truckHistoryService) GetFuelHistoryLast30Days(truckID uint) ([]*model.DateGroupedFuelHistory, error) {
	// Ambil data fuel untuk 30 hari terakhir
	fuels, err := s.truckHistoryRepo.GetFuelHistoryByTruckIDWithDateRange(truckID, 30)
	if err != nil {
		return nil, err
	}
	
	// Map untuk mengelompokkan data berdasarkan tanggal
	groupedFuels := make(map[string][]*model.TruckFuelHistory)
	for _, fuel := range fuels {
		// Format tanggal sebagai string YYYY-MM-DD
		dateKey := fuel.Timestamp.Format("2006-01-02")
		groupedFuels[dateKey] = append(groupedFuels[dateKey], fuel)
	}
	
	// Konversi map menjadi array untuk respons JSON
	result := make([]*model.DateGroupedFuelHistory, 0, len(groupedFuels))
	for dateKey, fuels := range groupedFuels {
		result = append(result, &model.DateGroupedFuelHistory{
			Date:  dateKey,
			Fuels: fuels,
		})
	}
	
	return result, nil
}