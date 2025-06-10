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
	TopicDataPrefix = "getstokfms/+/data" // Untuk semua data kendaraan (posisi dan bahan bakar)
	QOS             = 1
)

// VehicleData menyimpan semua data kendaraan (posisi dan bahan bakar)
type VehicleData struct {
	T   string  `json:"T"`
	Lat float64 `json:"Lat"`
	Lon float64 `json:"Lon"`
	F   float64 `json:"F"`
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
	deviationService service.RouteDeviationService
	idleService      service.TruckIdleService
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

// SetTruckIdleService sets the truck idle detection service for MQTT handlers
func SetTruckIdleService(svc service.TruckIdleService) {
	idleService = svc
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
	// Handler untuk semua data kendaraan
	dataHandler := func(client mqtt.Client, msg mqtt.Message) {
		topic := msg.Topic()

		// Ekstrak mac_id dari topik (format: getstokfms/{mac_id}/data)
		parts := strings.Split(topic, "/")
		if len(parts) < 3 {
			log.Printf("Invalid topic format: %s", topic)
			return
		}
		macID := parts[1]

		log.Printf("Received message: %s", msg.Payload())

		// Parse JSON
		var vehicleData VehicleData
		if err := json.Unmarshal(msg.Payload(), &vehicleData); err != nil {
			log.Printf("Failed to parse vehicle data: %v", err)
			return
		}

		log.Printf("Received vehicle data for device %s: Timestamp=%s, Lat=%f, Lng=%f, Fuel=%f%%",
			macID, vehicleData.T, vehicleData.Lat, vehicleData.Lon, vehicleData.F)

		// Save data to database if repository is set
		if truckRepo != nil && truckHistoryRepo != nil {
			// Parse timestamp
			loc, _ := time.LoadLocation("Asia/Jakarta")
			dataTime, err := time.Parse("2006-01-02 15:04:05.000", vehicleData.T)
			if err != nil {
				// Coba format alternatif jika format pertama gagal
				dataTime, err = time.Parse(time.RFC3339, vehicleData.T)
				if err != nil {
					log.Printf("Failed to parse vehicle timestamp: %v", err)
					dataTime = time.Now().In(loc)
				} else {
					// Konversi ke zona waktu WIB jika parsing berhasil
					dataTime = dataTime.In(loc)
				}
			} else {
				// Pastikan menggunakan zona waktu WIB
				dataTime = dataTime.In(loc)
			}

			var truckID uint

			// Try to find existing truck
			truck, err := truckRepo.FindByMacID(macID)
			if err != nil {
				// Create new truck if not found
				truck = &model.Truck{
					MacID:        macID,
					Latitude:     vehicleData.Lat,
					Longitude:    vehicleData.Lon,
					Fuel:         vehicleData.F,
					LastPosition: dataTime,
					LastFuel:     dataTime,
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
				// Update existing truck's current data
				truck.Latitude = vehicleData.Lat
				truck.Longitude = vehicleData.Lon
				truck.Fuel = vehicleData.F
				truck.LastPosition = dataTime
				truck.LastFuel = dataTime
				truck.UpdatedAt = time.Now()

				if err := truckRepo.Update(truck); err != nil {
					log.Printf("Failed to update truck data: %v", err)
					return
				}

				truckID = truck.ID
			}

			// Save position history
			positionHistory := &model.TruckPositionHistory{
				TruckID:   truckID,
				MacID:     macID,
				Latitude:  vehicleData.Lat,
				Longitude: vehicleData.Lon,
				Timestamp: dataTime,
				CreatedAt: time.Now(),
			}

			if err := truckHistoryRepo.CreatePositionHistory(positionHistory); err != nil {
				log.Printf("Failed to save position history: %v", err)
			} else {
				log.Printf("Saved position history for truck %s", macID)
			}

			// Save fuel history
			fuelHistory := &model.TruckFuelHistory{
				TruckID:   truckID,
				MacID:     macID,
				Fuel:      vehicleData.F,
				Timestamp: dataTime,
				CreatedAt: time.Now(),
			}

			if err := truckHistoryRepo.CreateFuelHistory(fuelHistory); err != nil {
				log.Printf("Failed to save fuel history: %v", err)
			} else {
				log.Printf("Saved fuel history for truck %s", macID)
			}

			// Check and record route deviation if needed
			if deviationService != nil {
				log.Printf("Checking for route deviation for truck %s", macID)
				if err := deviationService.DetectAndSaveDeviation(macID, vehicleData.Lat, vehicleData.Lon, dataTime); err != nil {
					// Just log the error, don't interrupt the main flow
					log.Printf("Error checking route deviation: %v", err)
				}
			}

			// Process position for idle detection
			if idleService != nil {
				log.Printf("Processing position for idle detection for truck %s", macID)
				if err := idleService.ProcessPosition(macID, vehicleData.Lat, vehicleData.Lon, dataTime); err != nil {
					// Just log the error, don't interrupt the main flow
					log.Printf("Error processing idle detection: %v", err)
				}
			}
		}

		// Kirim update ke semua client WebSocket
		wsHub := websocket.GetHub()
		if wsHub != nil {
			// Buat pesan realtime untuk posisi
			positionUpdate := RealtimePositionUpdate{
				Type:      "position",
				MacID:     macID,
				Latitude:  vehicleData.Lat,
				Longitude: vehicleData.Lon,
				Timestamp: vehicleData.T,
			}

			// Buat pesan realtime untuk fuel
			fuelUpdate := RealtimeFuelUpdate{
				Type:      "fuel",
				MacID:     macID,
				Fuel:      vehicleData.F,
				Timestamp: vehicleData.T,
			}

			// Marshal position update ke JSON
			positionJsonData, err := json.Marshal(positionUpdate)
			if err != nil {
				log.Printf("Error marshaling position update: %v", err)
			} else {
				// Broadcast position update ke semua client
				clientCount := wsHub.GetClientCount()
				if clientCount > 0 {
					wsHub.Broadcast(positionJsonData)
					log.Printf("Broadcasted position update to %d clients", clientCount)
				}
			}

			// Marshal fuel update ke JSON
			fuelJsonData, err := json.Marshal(fuelUpdate)
			if err != nil {
				log.Printf("Error marshaling fuel update: %v", err)
			} else {
				// Broadcast fuel update ke semua client
				clientCount := wsHub.GetClientCount()
				if clientCount > 0 {
					wsHub.Broadcast(fuelJsonData)
					log.Printf("Broadcasted fuel update to %d clients", clientCount)
				}
			}

			if wsHub.GetClientCount() == 0 {
				log.Printf("No WebSocket clients connected, updates not broadcasted")
			}
		}
	}

	// Subscribe ke topik data
	if token := mc.client.Subscribe(TopicDataPrefix, QOS, dataHandler); token.Wait() && token.Error() != nil {
		log.Printf("Error subscribing to data topic: %v", token.Error())
	} else {
		log.Printf("Subscribed to topic: %s", TopicDataPrefix)
	}
}

// Disconnect memutuskan koneksi dari broker MQTT
func (mc *MQTTClient) Disconnect() {
	// Unsubscribe dari topik data
	if token := mc.client.Unsubscribe(TopicDataPrefix); token.Wait() && token.Error() != nil {
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
