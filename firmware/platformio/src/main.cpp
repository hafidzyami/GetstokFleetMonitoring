#define TINY_GSM_MODEM_SIM800
#define SerialMon Serial
#define SerialAT Serial1
#define TINY_GSM_DEBUG SerialMon
#define GSM_PIN ""

#include <TinyGsmClient.h>
#include <PubSubClient.h>
#include <TinyGPS++.h>
#include <ArduinoJson.h>
#include <TimeLib.h>
#include <WiFi.h>

// FreeRTOS
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/queue.h"
#include "freertos/semphr.h"

#define BUILTIN_LED 2

// Interval waktu (ms)
#define POSITION_INTERVAL 60000    // 1 menit
#define FUEL_INTERVAL 300000       // 5 menit
#define FUEL_SAMPLING_INTERVAL 30000 // 30 detik
#define MQTT_CHECK_INTERVAL 5000   // 5 detik

// Ukuran stack untuk task
#define TASK_STACK_SIZE 4096
#define GPS_TASK_PRIORITY 2
#define FUEL_TASK_PRIORITY 2
#define MQTT_TASK_PRIORITY 3

// GPS
TinyGPSPlus gps;
HardwareSerial SerialGPS(2); // Gunakan Serial2 untuk GPS

// SIM800L
const char apn[] = "internet";
const char gprsUser[] = "";
const char gprsPass[] = "";
const char* broker = "staging.getstokfms.com";
const char* mqttUsername = "";
const char* mqttPassword = "";

TinyGsm modem(SerialAT);
TinyGsmClient client(modem);
PubSubClient mqtt(client);

#define MODEM_TX 17
#define MODEM_RX 16
#define FUEL_ADC_PIN 34

// Untuk penyimpanan sampel bahan bakar
#define MAX_FUEL_SAMPLES 10  // Maksimum 10 sampel (5 menit / 30 detik)
int fuelSamples[MAX_FUEL_SAMPLES];
int fuelSampleCount = 0;
SemaphoreHandle_t fuelSamplerMutex;

// Variabel untuk GPS data
typedef struct {
  double latitude;
  double longitude;
  double speed;
  double course;
  double altitude;
  bool isValid;
} GpsData;

GpsData currentGpsData;
SemaphoreHandle_t gpsMutex;

// Topic MQTT
String topicPubPosition;
String topicPubFuel;
const char* topicSubLed = "getstokfms/led";

// Status flag untuk koneksi
bool gpsReady = false;
bool networkConnected = false;
bool mqttConnected = false;

// Function prototypes
String get_mac_address();
String get_ISO8601_timestamp();
void send_position_data();
void send_fuel_data();
void collect_fuel_sample();
int get_fuel_average();
int get_timestamp();

// Task prototypes
void gpsTask(void *pvParameters);
void fuelSamplerTask(void *pvParameters);
void mqttTask(void *pvParameters);
void positionPublisherTask(void *pvParameters);
void fuelPublisherTask(void *pvParameters);

// Mutex untuk MQTT
SemaphoreHandle_t mqttMutex;

void mqttCallback(char* topic, byte* message, unsigned int len) {
  SerialMon.print("Message arrived on topic: ");
  SerialMon.println(topic);
  String incoming_message;
  for (int i = 0; i < len; i++) {
    incoming_message += (char)message[i];
  }
  incoming_message.trim();
  SerialMon.println(incoming_message);
  if (incoming_message == "ON") {
    digitalWrite(BUILTIN_LED, HIGH);
  }
  if (incoming_message == "OFF") {
    digitalWrite(BUILTIN_LED, LOW);
  }
}

boolean mqttConnect() {
  SerialMon.print("Connecting to ");
  SerialMon.print(broker);
  
  // Gunakan MAC address sebagai ID device untuk memastikan unik
  String deviceId = "Device_" + get_mac_address();
  deviceId.replace(":", "");  // Hapus karakter ':' 
  
  boolean status = mqtt.connect(deviceId.c_str(), mqttUsername, mqttPassword);
  if (!status) {
    SerialMon.println(" fail");
    return false;
  }
  SerialMon.println(" success");
  mqtt.subscribe(topicSubLed);
  return mqtt.connected();
}

void setup() {
  SerialMon.begin(115200);
  delay(10);
  pinMode(BUILTIN_LED, OUTPUT);

  analogReadResolution(12); // Default 12-bit (0 - 4095)
  pinMode(FUEL_ADC_PIN, INPUT);  

  // Inisialisasi mutex
  fuelSamplerMutex = xSemaphoreCreateMutex();
  gpsMutex = xSemaphoreCreateMutex();
  mqttMutex = xSemaphoreCreateMutex();

  // GPS Setup
  SerialGPS.begin(9600, SERIAL_8N1, 22, 23); // RX=22, TX=23

  // SIM800L setup
  SerialAT.begin(115200, SERIAL_8N1, MODEM_RX, MODEM_TX);
  delay(3000);
  SerialMon.println("Initializing modem ...");
  modem.restart();

  if (GSM_PIN && modem.getSimStatus() != 3) {
    modem.simUnlock(GSM_PIN);
  }

  SerialMon.print("Waiting for network...");
  if (!modem.waitForNetwork(60000L)) {
    SerialMon.println(" fail");
    ESP.restart();
  }
  SerialMon.println(" success");
  networkConnected = true;

  if (!modem.gprsConnect(apn, gprsUser, gprsPass)) {
    SerialMon.println(" GPRS connect fail");
    ESP.restart();
  }
  SerialMon.println("GPRS connected");

  // Set NTP server for time sync
  modem.NTPServerSync("132.163.96.5", 20);

  mqtt.setServer(broker, 1883);
  mqtt.setCallback(mqttCallback);

  // Bangun topic publish dengan MAC address
  String mac = get_mac_address();
  topicPubPosition = "getstokfms/" + mac + "/position";
  topicPubFuel = "getstokfms/" + mac + "/fuel";
  
  SerialMon.print("Position topic: ");
  SerialMon.println(topicPubPosition);
  SerialMon.print("Fuel topic: ");
  SerialMon.println(topicPubFuel);
  
  // Inisialisasi array sampel bahan bakar
  for(int i = 0; i < MAX_FUEL_SAMPLES; i++) {
    fuelSamples[i] = 0;
  }

  // Inisialisasi GPS data
  if (xSemaphoreTake(gpsMutex, portMAX_DELAY) == pdTRUE) {
    currentGpsData.isValid = false;
    currentGpsData.latitude = 0;
    currentGpsData.longitude = 0;
    currentGpsData.speed = 0;
    currentGpsData.course = 0;
    currentGpsData.altitude = 0;
    xSemaphoreGive(gpsMutex);
  }

  // Membuat RTOS tasks
  xTaskCreate(gpsTask, "GPS_Task", TASK_STACK_SIZE, NULL, GPS_TASK_PRIORITY, NULL);
  xTaskCreate(fuelSamplerTask, "Fuel_Task", TASK_STACK_SIZE, NULL, FUEL_TASK_PRIORITY, NULL);
  xTaskCreate(mqttTask, "MQTT_Task", TASK_STACK_SIZE, NULL, MQTT_TASK_PRIORITY, NULL);
  xTaskCreate(positionPublisherTask, "Position_Publisher", TASK_STACK_SIZE, NULL, 1, NULL);
  xTaskCreate(fuelPublisherTask, "Fuel_Publisher", TASK_STACK_SIZE, NULL, 1, NULL);

  SerialMon.println("All tasks started");
}

void loop() {
  // Kosong karena semua proses dijalankan oleh RTOS tasks
  vTaskDelay(1000 / portTICK_PERIOD_MS);
}

// Task untuk membaca dan memproses data GPS
void gpsTask(void *pvParameters) {
  SerialMon.println("GPS task started");
  
  for (;;) {
    while (SerialGPS.available() > 0) {
      gps.encode(SerialGPS.read());
    }
    
    // Update struktur GPS data dengan semaphore
    if (gps.location.isValid()) {
      if (xSemaphoreTake(gpsMutex, portMAX_DELAY) == pdTRUE) {
        currentGpsData.isValid = true;
        currentGpsData.latitude = gps.location.lat();
        currentGpsData.longitude = gps.location.lng();
        
        if (gps.speed.isValid()) {
          currentGpsData.speed = gps.speed.kmph();
        }
        
        if (gps.course.isValid()) {
          currentGpsData.course = gps.course.deg();
        }
        
        if (gps.altitude.isValid()) {
          currentGpsData.altitude = gps.altitude.meters();
        }
        
        xSemaphoreGive(gpsMutex);
        
        if (!gpsReady) {
          gpsReady = true;
          SerialMon.println("GPS fix acquired.");
        }
      }
    }
    
    vTaskDelay(100 / portTICK_PERIOD_MS);  // Cek GPS setiap 100ms
  }
}

// Task untuk mengambil sampel bahan bakar
void fuelSamplerTask(void *pvParameters) {
  SerialMon.println("Fuel sampler task started");
  TickType_t xLastWakeTime;
  xLastWakeTime = xTaskGetTickCount();
  
  for (;;) {
    // Ambil nilai bahan bakar
    int fuelValue = analogRead(FUEL_ADC_PIN);
    
    // Update array sampel dengan mutex
    if (xSemaphoreTake(fuelSamplerMutex, portMAX_DELAY) == pdTRUE) {
      fuelSamples[fuelSampleCount] = fuelValue;
      fuelSampleCount = (fuelSampleCount + 1) % MAX_FUEL_SAMPLES;
      xSemaphoreGive(fuelSamplerMutex);
    }
    
    SerialMon.print("Fuel sample collected: ");
    SerialMon.println(fuelValue);
    
    // Tunggu sampai interval berikutnya
    vTaskDelayUntil(&xLastWakeTime, FUEL_SAMPLING_INTERVAL / portTICK_PERIOD_MS);
  }
}

// Task untuk mengelola koneksi MQTT
void mqttTask(void *pvParameters) {
  SerialMon.println("MQTT task started");
  int reconnectCount = 0;
  
  for (;;) {
    if (xSemaphoreTake(mqttMutex, portMAX_DELAY) == pdTRUE) {
      if (!mqtt.connected()) {
        mqttConnected = false;
        SerialMon.println("MQTT disconnected, attempting reconnect...");
        
        if (mqttConnect()) {
          mqttConnected = true;
          reconnectCount = 0;
          SerialMon.println("MQTT reconnected");
        } else {
          reconnectCount++;
          
          if (reconnectCount >= 5) {
            SerialMon.println("Multiple reconnect failures, restarting modem...");
            modem.restart();
            if (!modem.waitForNetwork(60000L)) {
              ESP.restart();  // Kalau tetap gagal, restart ESP32
            }
            if (!modem.gprsConnect(apn, gprsUser, gprsPass)) {
              ESP.restart();
            }
            reconnectCount = 0;
          }
        }
      } else {
        mqttConnected = true;
        mqtt.loop();  // Proses pesan masuk
      }
      xSemaphoreGive(mqttMutex);
    }
    
    vTaskDelay(MQTT_CHECK_INTERVAL / portTICK_PERIOD_MS);
  }
}

// Task untuk mempublikasi data posisi
void positionPublisherTask(void *pvParameters) {
  SerialMon.println("Position publisher task started");
  TickType_t xLastWakeTime;
  xLastWakeTime = xTaskGetTickCount();
  
  for (;;) {
    if (gpsReady && mqttConnected) {
      send_position_data();
    } else {
      SerialMon.println("Skip position publish: GPS ready=" + String(gpsReady) + ", MQTT connected=" + String(mqttConnected));
    }
    
    // Tunggu interval berikutnya
    vTaskDelayUntil(&xLastWakeTime, POSITION_INTERVAL / portTICK_PERIOD_MS);
  }
}

// Task untuk mempublikasi data bahan bakar
void fuelPublisherTask(void *pvParameters) {
  SerialMon.println("Fuel publisher task started");
  TickType_t xLastWakeTime;
  xLastWakeTime = xTaskGetTickCount();
  
  // Beri delay awal agar tidak bentrok dengan pengiriman posisi
  vTaskDelay(10000 / portTICK_PERIOD_MS);
  
  for (;;) {
    if (mqttConnected) {
      send_fuel_data();
    } else {
      SerialMon.println("Skip fuel publish: MQTT connected=" + String(mqttConnected));
    }
    
    // Tunggu interval berikutnya
    vTaskDelayUntil(&xLastWakeTime, FUEL_INTERVAL / portTICK_PERIOD_MS);
  }
}

void send_position_data() {
  StaticJsonDocument<256> doc;
  char buffer[256];
  get_timestamp(); // Sync NTP
  bool positionValid = false;
  
  // Ambil data GPS dengan mutex
  if (xSemaphoreTake(gpsMutex, portMAX_DELAY) == pdTRUE) {
    doc.clear();
    doc["timestamp"] = get_ISO8601_timestamp();

    if (currentGpsData.isValid) {
      doc["latitude"] = currentGpsData.latitude;
      doc["longitude"] = currentGpsData.longitude;
      
      // Tambahkan data lain dari GPS jika tersedia
      if (currentGpsData.speed > 0) {
        doc["speed"] = currentGpsData.speed;
      }
      
      if (currentGpsData.course > 0) {
        doc["heading"] = currentGpsData.course;
      }
      
      if (currentGpsData.altitude != 0) {
        doc["altitude"] = currentGpsData.altitude;
      }
      
      positionValid = true;
    } else {
      doc["latitude"] = nullptr;
      doc["longitude"] = nullptr;
      SerialMon.println("Position data not valid");
    }
    
    xSemaphoreGive(gpsMutex);
  }
  
  if (positionValid) {
    SerialMon.print("Publish position: ");
    serializeJson(doc, SerialMon);
    SerialMon.println();
    
    serializeJson(doc, buffer);
    
    // Publikasi dengan mutex
    if (xSemaphoreTake(mqttMutex, portMAX_DELAY) == pdTRUE) {
      mqtt.publish(topicPubPosition.c_str(), buffer);
      xSemaphoreGive(mqttMutex);
    }
  }
}

void send_fuel_data() {
  StaticJsonDocument<128> doc;
  char buffer[128];
  int fuelAverage = 0;
  
  // Hitung rata-rata dengan mutex
  if (xSemaphoreTake(fuelSamplerMutex, portMAX_DELAY) == pdTRUE) {
    fuelAverage = get_fuel_average();
    xSemaphoreGive(fuelSamplerMutex);
  }
  
  doc.clear();
  doc["timestamp"] = get_ISO8601_timestamp();
  doc["fuel"] = fuelAverage;

  SerialMon.print("Publish fuel data: ");
  serializeJson(doc, SerialMon);
  SerialMon.println();
  
  serializeJson(doc, buffer);
  
  // Publikasi dengan mutex
  if (xSemaphoreTake(mqttMutex, portMAX_DELAY) == pdTRUE) {
    mqtt.publish(topicPubFuel.c_str(), buffer);
    xSemaphoreGive(mqttMutex);
  }
}

int get_fuel_average() {
  // Hitung nilai rata-rata dari sampel yang terkumpul
  // Fungsi ini harus dipanggil setelah mengambil mutex
  long sum = 0;
  int count = 0;
  
  for (int i = 0; i < MAX_FUEL_SAMPLES; i++) {
    if (fuelSamples[i] != 0) {  // Hanya hitung nilai yang bukan 0
      sum += fuelSamples[i];
      count++;
    }
  }
  
  if (count == 0) {
    return analogRead(FUEL_ADC_PIN); // Jika belum ada sampel, ambil nilai langsung
  }
  
  return sum / count;
}

int get_timestamp() {
  int year3 = 0, month3 = 0, day3 = 0, hour3 = 0, min3 = 0, sec3 = 0;
  float timezone = 0;
  
  // Coba dapatkan waktu dari jaringan, hingga 3 kali percobaan
  bool timeSuccess = false;
  for (int8_t i = 3; i; i--) {
    if (modem.getNetworkTime(&year3, &month3, &day3, &hour3, &min3, &sec3, &timezone)) {
      timeSuccess = true;
      break;
    } else {
      vTaskDelay(1000 / portTICK_PERIOD_MS);  // Tunggu 1 detik sebelum coba lagi
    }
  }
  
  // Jika tidak berhasil mendapatkan waktu jaringan, gunakan waktu lokal yang sudah ada
  if (timeSuccess) {
    setTime(hour3, min3, sec3, day3, month3, year3);
  }
  
  return now();
}

String get_ISO8601_timestamp() {
  char timeStr[25];
  snprintf(timeStr, sizeof(timeStr), "%04d-%02d-%02dT%02d:%02d:%02dZ",
           year(), month(), day(), hour(), minute(), second());
  return String(timeStr);
}

String get_mac_address() {
  uint8_t mac[6];
  esp_read_mac(mac, ESP_MAC_WIFI_STA);
  char macStr[18];
  snprintf(macStr, sizeof(macStr), "%02X:%02X:%02X:%02X:%02X:%02X",
           mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
  return String(macStr);
}