package service

import (
	"encoding/json"
	"os"
	
	webpush "github.com/SherClockHolmes/webpush-go"
	
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/model"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/repository"
)

type PushService interface {
	SaveSubscription(userID uint, endpoint, p256dh, auth, role string) error
	SendNotification(title, message, url string, targetRoles []string) (int, error)
	DeleteSubscription(endpoint string) error
	GetVAPIDPublicKey() string
}

type pushService struct {
	pushRepo repository.PushRepository
}

func NewPushService(pushRepo repository.PushRepository) PushService {
	return &pushService{
		pushRepo: pushRepo,
	}
}

func (s *pushService) SaveSubscription(userID uint, endpoint, p256dh, auth, role string) error {
	subscription := &model.PushSubscription{
		UserID:    userID,
		Endpoint:  endpoint,
		P256dh:    p256dh,
		Auth:      auth,
		Role:      role,
	}
	
	return s.pushRepo.SaveSubscription(subscription)
}

func (s *pushService) SendNotification(title, message, url string, targetRoles []string) (int, error) {
	// Ambil subscription berdasarkan role
	subscriptions, err := s.pushRepo.GetSubscriptionsByRole(targetRoles)
	if err != nil {
		return 0, err
	}
	
	// Persiapkan payload notifikasi
	payload := map[string]interface{}{
		"title":   title,
		"message": message,
	}
	
	if url != "" {
		payload["url"] = url
	}
	
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return 0, err
	}
	
	// Kirim notifikasi ke semua subscription
	successCount := 0
	
	for _, sub := range subscriptions {
		// Buat subscription object sesuai format webpush
		s := &webpush.Subscription{
			Endpoint: sub.Endpoint,
			Keys: webpush.Keys{
				P256dh: sub.P256dh,
				Auth:   sub.Auth,
			},
		}
		
		// Kirim notifikasi
		_, err := webpush.SendNotification(payloadBytes, s, &webpush.Options{
			VAPIDPublicKey:  os.Getenv("VAPID_PUBLIC_KEY"),
			VAPIDPrivateKey: os.Getenv("VAPID_PRIVATE_KEY"),
			TTL:             30,
			Subscriber:      os.Getenv("VAPID_SUBSCRIBER"),
		})
		
		if err != nil {
			// Log error but continue with other subscriptions
			continue
		}
		
		successCount++
	}
	
	return successCount, nil
}

func (s *pushService) DeleteSubscription(endpoint string) error {
	return s.pushRepo.DeleteSubscription(endpoint)
}

func (s *pushService) GetVAPIDPublicKey() string {
	return os.Getenv("VAPID_PUBLIC_KEY")
}