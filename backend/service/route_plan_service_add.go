package service

import (
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/model"
)

// GetAllActiveRoutePlans retrieve all active route plans
func (s *routePlanService) GetAllActiveRoutePlans() ([]*model.RoutePlanResponse, error) {
	// Get all active route plans
	routePlans, err := s.routePlanRepo.FindAllActiveRoutePlans()
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
