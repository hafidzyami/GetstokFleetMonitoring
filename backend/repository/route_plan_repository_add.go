package repository

import (
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/config"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/model"
)

// Menambahkan fungsi untuk menemukan semua route plan yang active
func (r *routePlanRepository) FindAllActiveRoutePlans() ([]*model.RoutePlan, error) {
	var routePlans []*model.RoutePlan
	err := config.DB.Where("status = ?", "active").Find(&routePlans).Error
	if err != nil {
		return nil, err
	}
	return routePlans, nil
}

// Menambahkan fungsi untuk menemukan semua route plan active berdasarkan TruckID
func (r *routePlanRepository) FindActiveRoutePlansByTruckID(truckID uint) (*model.RoutePlan, error) {
	var routePlan model.RoutePlan
	err := config.DB.Where("truck_id = ? AND status = ?", truckID, "active").First(&routePlan).Error
	if err != nil {
		return nil, err
	}
	return &routePlan, nil
}
