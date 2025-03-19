package service

import (
	"encoding/json"
	"fmt"
	"os"
	"strconv"
	"time"

	webpush "github.com/SherClockHolmes/webpush-go"

	"github.com/hafidzyami/GetstokFleetMonitoring/backend/model"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/repository"
)

type PushService interface {
	SaveSubscription(userID uint, endpoint, p256dh, auth, role string) error
	SendNotification(title, message, url string, targetRoles []string, targetUserIDs []uint) (int, error) // Updated
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
		UserID:   userID,
		Endpoint: endpoint,
		P256dh:   p256dh,
		Auth:     auth,
		Role:     role,
	}

	return s.pushRepo.SaveSubscription(subscription)
}

func (s *pushService) SendNotification(title, message, url string, targetRoles []string, targetUserIDs []uint) (int, error) {
	var allSubscriptions []model.PushSubscription

	// Ambil subscription berdasarkan role jika targetRoles tidak kosong
	if len(targetRoles) > 0 {
		roleSubscriptions, err := s.pushRepo.GetSubscriptionsByRole(targetRoles)
		if err != nil {
			return 0, err
		}
		allSubscriptions = append(allSubscriptions, roleSubscriptions...)
	}

	// Ambil subscription berdasarkan user IDs jika targetUserIDs tidak kosong
	if len(targetUserIDs) > 0 {
		userSubscriptions, err := s.pushRepo.GetSubscriptionsByUserIDs(targetUserIDs)
		if err != nil {
			return 0, err
		}
		allSubscriptions = append(allSubscriptions, userSubscriptions...)
	}

	// Hapus duplikasi subscription
	uniqueSubscriptions := s.removeDuplicateSubscriptions(allSubscriptions)

	payload := map[string]interface{}{
		"title":     title,
		"body":      message,                                                    // Gunakan "body" bukan "message" untuk iOS
		"tag":       "notification-" + strconv.FormatInt(time.Now().Unix(), 10), // Tambahkan tag unik
		"timestamp": time.Now().UnixMilli(),                                     // Timestamp dalam milisecond
	}

	if url != "" {
		payload["url"] = url
	}

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return 0, err
	}

	// Log payload yang dikirim
	fmt.Println("Sending notification payload:", string(payloadBytes))

	// Kirim notifikasi ke semua subscription
	successCount := 0
	var failedEndpoints []string

	for _, sub := range uniqueSubscriptions {
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
			TTL:             86400,
			Subscriber:      os.Getenv("VAPID_SUBSCRIBER"),
			Urgency:         webpush.UrgencyHigh,
		})

		if err != nil {
			// Log error but continue with other subscriptions
			failedEndpoints = append(failedEndpoints, sub.Endpoint)
			continue
		}

		successCount++
	}

	// Log failed endpoints
	if len(failedEndpoints) > 0 {
		fmt.Printf("Failed to send notifications to %d endpoints: %v\n", len(failedEndpoints), failedEndpoints)
	}

	return successCount, nil
}

// Helper function untuk menghapus duplikasi subscription
func (s *pushService) removeDuplicateSubscriptions(subscriptions []model.PushSubscription) []model.PushSubscription {
	seen := make(map[string]bool)
	result := []model.PushSubscription{}

	for _, sub := range subscriptions {
		if _, exists := seen[sub.Endpoint]; !exists {
			seen[sub.Endpoint] = true
			result = append(result, sub)
		}
	}

	return result
}

func (s *pushService) DeleteSubscription(endpoint string) error {
	return s.pushRepo.DeleteSubscription(endpoint)
}

func (s *pushService) GetVAPIDPublicKey() string {
	return os.Getenv("VAPID_PUBLIC_KEY")
}
