package repository

import (
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/config"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/model"
)

type PushRepository interface {
	SaveSubscription(subscription *model.PushSubscription) error
	GetSubscriptionsByRole(roles []string) ([]model.PushSubscription, error)
	DeleteSubscription(endpoint string) error
}

type pushRepository struct{}

func NewPushRepository() PushRepository {
	return &pushRepository{}
}

func (r *pushRepository) SaveSubscription(subscription *model.PushSubscription) error {
	// Upsert - jika endpoint sudah ada, update
	var existingSub model.PushSubscription
	result := config.DB.Where("endpoint = ?", subscription.Endpoint).First(&existingSub)
	
	if result.Error == nil {
		// Update subscription yang ada
		subscription.ID = existingSub.ID
		return config.DB.Save(subscription).Error
	}
	
	// Buat baru jika tidak ditemukan
	return config.DB.Create(subscription).Error
}

func (r *pushRepository) GetSubscriptionsByRole(roles []string) ([]model.PushSubscription, error) {
	var subscriptions []model.PushSubscription
	
	// Jika roles kosong, kembalikan semua subscription
	if len(roles) == 0 {
		err := config.DB.Find(&subscriptions).Error
		return subscriptions, err
	}
	
	// Filter berdasarkan roles
	err := config.DB.Where("role IN ?", roles).Find(&subscriptions).Error
	return subscriptions, err
}

func (r *pushRepository) DeleteSubscription(endpoint string) error {
	return config.DB.Where("endpoint = ?", endpoint).Delete(&model.PushSubscription{}).Error
}