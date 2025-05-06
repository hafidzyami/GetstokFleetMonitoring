// backend/mqtt/mqtt.go
package mqtt

import (
	"encoding/json"
	"log"
	"os"
	"strings"
	"time"

	mqtt "github.com/eclipse/paho.mqtt.golang"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/model"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/repository"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/service"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/websocket"
)

// Definisi topik
const (
	TopicPositionPrefix = "getstokfms/+/position" // Untuk data posisi kendaraan
	TopicFuelPrefix     = "getstokfms/+/fuel"     // Untuk data bahan bakar
	QOS                 = 1
)

// PositionData menyimpan data posisi kendaraan
type PositionData struct {
	Timestamp string  `json:"timestamp"`
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

// FuelData menyimpan data bahan bakar kendaraan
type FuelData struct {
	Timestamp string  `json:"timestamp"`
	Fuel      float64 `json:"fuel"`
}

// Struct untuk data yang dikirim ke frontend
type RealtimePositionUpdate struct {
	Type      string  `json:"type"`
	MacID     string  `json:"mac_id"`
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
	Timestamp string  `json:"timestamp"`
}

type RealtimeFuelUpdate struct {
	Type      string  `json:"type"`
	MacID     string  `json:"mac_id"`
	Fuel      float64 `json:"fuel"`
	Timestamp string  `json:"timestamp"`
}

// MQTTClient adalah client MQTT sederhana
type MQTTClient struct {
	client mqtt.Client
}

var (
	truckRepo        repository.TruckRepository
	truckHistoryRepo repository.TruckHistoryRepository
	routePlanRepo    repository.RoutePlanRepository
	deviationRepo    repository.RouteDeviationRepository
	deviationService service.RouteDeviationService
)

// SetTruckRepository sets the truck repository for MQTT handlers
func SetTruckRepository(repo repository.TruckRepository) {
	truckRepo = repo
}

// SetTruckHistoryRepository sets the truck history repository for MQTT handlers
func SetTruckHistoryRepository(repo repository.TruckHistoryRepository) {
	truckHistoryRepo = repo
}

// SetRouteDeviationService sets the route deviation service for MQTT handlers
func SetRouteDeviationService(svc service.RouteDeviationService) {
	deviationService = svc
}

// NewMQTTClient membuat client MQTT baru
func NewMQTTClient(brokerURL string, clientID string) *MQTTClient {
	// Opsi client MQTT
	opts := mqtt.NewClientOptions().
		AddBroker(brokerURL).
		SetClientID(clientID).
		SetCleanSession(true).
		SetAutoReconnect(true).
		SetMaxReconnectInterval(5 * time.Second).
		SetKeepAlive(60 * time.Second).
		SetPingTimeout(10 * time.Second).
		SetConnectionLostHandler(func(client mqtt.Client, err error) {
			log.Printf("MQTT connection lost: %v", err)
		}).
		SetOnConnectHandler(func(client mqtt.Client) {
			log.Println("Connected to MQTT broker")
		})

	client := mqtt.NewClient(opts)

	return &MQTTClient{
		client: client,
	}
}

// Connect menghubungkan ke broker MQTT
func (mc *MQTTClient) Connect() error {
	if token := mc.client.Connect(); token.Wait() && token.Error() != nil {
		return token.Error()
	}
	return nil
}

// Subscribe berlangganan ke topik MQTT
func (mc *MQTTClient) Subscribe() {
	// Handler untuk data posisi
	positionHandler := func(client mqtt.Client, msg mqtt.Message) {
		topic := msg.Topic()

		// Ekstrak mac_id dari topik (format: getstokfms/{mac_id}/position)
		parts := strings.Split(topic, "/")
		if len(parts) < 3 {
			log.Printf("Invalid topic format: %s", topic)
			return
		}
		macID := parts[1]

		// Parse JSON
		var positionData PositionData
		if err := json.Unmarshal(msg.Payload(), &positionData); err != nil {
			log.Printf("Failed to parse position data: %v", err)
			return
		}

		log.Printf("Received position data for device %s: Timestamp=%s, Lat=%f, Lng=%f",
			macID, positionData.Timestamp, positionData.Latitude, positionData.Longitude)

		// Save data to database if repository is set
		if truckRepo != nil && truckHistoryRepo != nil {
			// Parse timestamp
			loc, _ := time.LoadLocation("Asia/Jakarta")
			positionTime, err := time.Parse("2006-01-02 15:04:05.000 -0700", positionData.Timestamp)
			if err != nil {
				// Coba format alternatif jika format pertama gagal
				positionTime, err = time.Parse(time.RFC3339, positionData.Timestamp)
				if err != nil {
					log.Printf("Failed to parse position timestamp: %v", err)
					positionTime = time.Now().In(loc)
				} else {
					// Konversi ke zona waktu WIB jika parsing berhasil
					positionTime = positionTime.In(loc)
				}
			} else {
				// Pastikan menggunakan zona waktu WIB
				positionTime = positionTime.In(loc)
			}

			var truckID uint

			// Try to find existing truck
			truck, err := truckRepo.FindByMacID(macID)
			if err != nil {
				// Create new truck if not found
				truck = &model.Truck{
					MacID:        macID,
					Latitude:     positionData.Latitude,
					Longitude:    positionData.Longitude,
					LastPosition: positionTime,
					CreatedAt:    time.Now(),
					UpdatedAt:    time.Now(),
				}
				if err := truckRepo.Create(truck); err != nil {
					log.Printf("Failed to create truck record: %v", err)
					return
				} else {
					log.Printf("Created new truck record for macID %s", macID)
				}

				// Get truck ID for the newly created truck
				newTruck, err := truckRepo.FindByMacID(macID)
				if err != nil {
					log.Printf("Failed to get truck ID after creation: %v", err)
					return
				}
				truckID = newTruck.ID
			} else {
				// Update existing truck's current position
				truck.Latitude = positionData.Latitude
				truck.Longitude = positionData.Longitude
				truck.LastPosition = positionTime
				truck.UpdatedAt = time.Now()

				if err := truckRepo.Update(truck); err != nil {
					log.Printf("Failed to update truck position: %v", err)
					return
				}

				truckID = truck.ID
			}

			// Save position history
			positionHistory := &model.TruckPositionHistory{
				TruckID:   truckID,
				MacID:     macID,
				Latitude:  positionData.Latitude,
				Longitude: positionData.Longitude,
				Timestamp: positionTime,
				CreatedAt: time.Now(),
			}

			if err := truckHistoryRepo.CreatePositionHistory(positionHistory); err != nil {
				log.Printf("Failed to save position history: %v", err)
			} else {
				log.Printf("Saved position history for truck %s", macID)
			}
			
			// Check and record route deviation if needed
			if deviationService != nil {
				log.Printf("Checking for route deviation for truck %s", macID)
				if err := deviationService.DetectAndSaveDeviation(macID, positionData.Latitude, positionData.Longitude, positionTime); err != nil {
					// Just log the error, don't interrupt the main flow
					log.Printf("Error checking route deviation: %v", err)
				}
			}
		}

		// Kirim update ke semua client WebSocket
		wsHub := websocket.GetHub()
		if wsHub != nil {
			// Buat pesan realtime
			update := RealtimePositionUpdate{
				Type:      "position",
				MacID:     macID,
				Latitude:  positionData.Latitude,
				Longitude: positionData.Longitude,
				Timestamp: positionData.Timestamp,
			}

			// Marshal ke JSON
			jsonData, err := json.Marshal(update)
			if err != nil {
				log.Printf("Error marshaling position update: %v", err)
				return
			}

			// Broadcast ke semua client
			clientCount := wsHub.GetClientCount()
			if clientCount > 0 {
				// Broadcast ke semua client
				wsHub.Broadcast(jsonData)
				log.Printf("Broadcasted position update to %d clients", clientCount)
			} else {
				log.Printf("No WebSocket clients connected, position update not broadcasted")
			}
		}
	}

	// Handler untuk data bahan bakar
	fuelHandler := func(client mqtt.Client, msg mqtt.Message) {
		topic := msg.Topic()

		// Ekstrak mac_id dari topik (format: getstokfms/{mac_id}/fuel)
		parts := strings.Split(topic, "/")
		if len(parts) < 3 {
			log.Printf("Invalid topic format: %s", topic)
			return
		}
		macID := parts[1]

		// Parse JSON
		var fuelData FuelData
		if err := json.Unmarshal(msg.Payload(), &fuelData); err != nil {
			log.Printf("Failed to parse fuel data: %v", err)
			return
		}

		log.Printf("Received fuel data for device %s: Timestamp=%s, Fuel=%f%%",
			macID, fuelData.Timestamp, fuelData.Fuel)

		// Save data to database if repository is set
		if truckRepo != nil && truckHistoryRepo != nil {
			// Parse timestamp
			loc, _ := time.LoadLocation("Asia/Jakarta")
			fuelTime, err := time.Parse("2006-01-02 15:04:05.000 -0700", fuelData.Timestamp)
			if err != nil {
				// Coba format alternatif jika format pertama gagal
				fuelTime, err = time.Parse(time.RFC3339, fuelData.Timestamp)
				if err != nil {
					log.Printf("Failed to parse fuel timestamp: %v", err)
					fuelTime = time.Now().In(loc)
				} else {
					// Konversi ke zona waktu WIB jika parsing berhasil
					fuelTime = fuelTime.In(loc)
				}
			} else {
				// Pastikan menggunakan zona waktu WIB
				fuelTime = fuelTime.In(loc)
			}

			var truckID uint

			// Try to find existing truck
			truck, err := truckRepo.FindByMacID(macID)
			if err != nil {
				// Create new truck if not found
				truck = &model.Truck{
					MacID:     macID,
					Fuel:      fuelData.Fuel,
					LastFuel:  fuelTime,
					CreatedAt: time.Now(),
					UpdatedAt: time.Now(),
				}
				if err := truckRepo.Create(truck); err != nil {
					log.Printf("Failed to create truck record: %v", err)
					return
				} else {
					log.Printf("Created new truck record for macID %s", macID)
				}

				// Get truck ID for the newly created truck
				newTruck, err := truckRepo.FindByMacID(macID)
				if err != nil {
					log.Printf("Failed to get truck ID after creation: %v", err)
					return
				}
				truckID = newTruck.ID
			} else {
				// Update existing truck's current fuel
				truck.Fuel = fuelData.Fuel
				truck.LastFuel = fuelTime
				truck.UpdatedAt = time.Now()

				if err := truckRepo.Update(truck); err != nil {
					log.Printf("Failed to update truck fuel: %v", err)
					return
				}

				truckID = truck.ID
			}

			// Save fuel history
			fuelHistory := &model.TruckFuelHistory{
				TruckID:   truckID,
				MacID:     macID,
				Fuel:      fuelData.Fuel,
				Timestamp: fuelTime,
				CreatedAt: time.Now(),
			}

			if err := truckHistoryRepo.CreateFuelHistory(fuelHistory); err != nil {
				log.Printf("Failed to save fuel history: %v", err)
			} else {
				log.Printf("Saved fuel history for truck %s", macID)
			}
		}

		// Kirim update ke semua client WebSocket
		wsHub := websocket.GetHub()
		if wsHub != nil {
			// Buat pesan realtime
			update := RealtimeFuelUpdate{
				Type:      "fuel",
				MacID:     macID,
				Fuel:      fuelData.Fuel,
				Timestamp: fuelData.Timestamp,
			}

			// Marshal ke JSON
			jsonData, err := json.Marshal(update)
			if err != nil {
				log.Printf("Error marshaling fuel update: %v", err)
				return
			}

			// Broadcast ke semua client
			clientCount := wsHub.GetClientCount()
			if clientCount > 0 {
				// Broadcast ke semua client
				wsHub.Broadcast(jsonData)
				log.Printf("Broadcasted fuel update to %d clients", clientCount)
			} else {
				log.Printf("No WebSocket clients connected, fuel update not broadcasted")
			}
		}
	}

	// Subscribe ke topik posisi
	if token := mc.client.Subscribe(TopicPositionPrefix, QOS, positionHandler); token.Wait() && token.Error() != nil {
		log.Printf("Error subscribing to position topic: %v", token.Error())
	} else {
		log.Printf("Subscribed to topic: %s", TopicPositionPrefix)
	}

	// Subscribe ke topik bahan bakar
	if token := mc.client.Subscribe(TopicFuelPrefix, QOS, fuelHandler); token.Wait() && token.Error() != nil {
		log.Printf("Error subscribing to fuel topic: %v", token.Error())
	} else {
		log.Printf("Subscribed to topic: %s", TopicFuelPrefix)
	}
}

// Disconnect memutuskan koneksi dari broker MQTT
func (mc *MQTTClient) Disconnect() {
	// Unsubscribe dari semua topik
	if token := mc.client.Unsubscribe(TopicPositionPrefix, TopicFuelPrefix); token.Wait() && token.Error() != nil {
		log.Printf("Error unsubscribing: %v", token.Error())
	}

	mc.client.Disconnect(250)
	log.Println("Disconnected from MQTT broker")
}

// StartMQTTClient memulai client MQTT dengan konfigurasi default
func StartMQTTClient() *MQTTClient {
	// Dapatkan konfigurasi MQTT dari environment variable
	brokerURL := os.Getenv("MQTT_BROKER_URL")
	if brokerURL == "" {
		brokerURL = "tcp://mqtt-broker:1883"
	}

	clientID := os.Getenv("MQTT_CLIENT_ID")
	if clientID == "" {
		clientID = "getstok-fms-client"
	}

	// Buat client
	mqttClient := NewMQTTClient(brokerURL, clientID)

	// Hubungkan ke broker
	if err := mqttClient.Connect(); err != nil {
		log.Printf("Failed to connect to MQTT broker: %v", err)
		return nil
	}

	// Subscribe ke topik
	mqttClient.Subscribe()

	return mqttClient
}
