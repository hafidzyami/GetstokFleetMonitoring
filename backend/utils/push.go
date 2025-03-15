package utils

import (
	"encoding/json"
	"os"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/model"
	
	webpush "github.com/SherClockHolmes/webpush-go"
)

// Struktur untuk payload notifikasi
type PushNotification struct {
	Title   string `json:"title"`
	Message string `json:"message"`
	URL     string `json:"url,omitempty"`
}

// Kirim satu notifikasi ke satu subscription
func SendPushNotification(subscription *webpush.Subscription, notification PushNotification) error {
	// Marshal notification ke JSON
	payload, err := json.Marshal(notification)
	if err != nil {
		return err
	}
	
	// Kirim notifikasi menggunakan webpush
	_, err = webpush.SendNotification(payload, subscription, &webpush.Options{
		VAPIDPublicKey:  os.Getenv("VAPID_PUBLIC_KEY"),
		VAPIDPrivateKey: os.Getenv("VAPID_PRIVATE_KEY"),
		TTL:             30,
		Subscriber:      os.Getenv("VAPID_SUBSCRIBER"),
	})
	
	return err
}

// Konversi dari model ke subscription webpush
func ConvertToWebPushSubscription(sub *model.PushSubscription) *webpush.Subscription {
	return &webpush.Subscription{
		Endpoint: sub.Endpoint,
		Keys: webpush.Keys{
			P256dh: sub.P256dh,
			Auth:   sub.Auth,
		},
	}
}