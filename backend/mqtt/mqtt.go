// backend/mqtt/mqtt.go
package mqtt

import (
	"encoding/json"
	"log"
	"os"
	"strings"
	"time"

	mqtt "github.com/eclipse/paho.mqtt.golang"
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

// MQTTClient adalah client MQTT sederhana
type MQTTClient struct {
	client mqtt.Client
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