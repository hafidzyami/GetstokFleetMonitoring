#include "hardware.h"

// Initialize global objects
TinyGPSPlus gps;
HardwareSerial SerialGPS(2); // Use Serial2 for GPS
TinyGsm modem(SerialAT);
TinyGsmClient client(modem);
PubSubClient mqtt(client);

// Mutex handles initialization
SemaphoreHandle_t fuelSamplerMutex = NULL;
SemaphoreHandle_t gpsMutex = NULL;
SemaphoreHandle_t mqttMutex = NULL;

// Status flags initialization
bool gpsReady = false;
bool networkConnected = false;
bool mqttConnected = false;

// Global topic names
String topicPubPosition;
String topicPubFuel;
const char* topicSubLed = "getstokfms/led";

void setupHardware() {
  // Set up LED
  pinMode(BUILTIN_LED, OUTPUT);
  
  // Set up ADC for fuel sensor
  analogReadResolution(12); // Default 12-bit (0 - 4095)
  pinMode(FUEL_ADC_PIN, INPUT);
  
  // Initialize mutex handles
  fuelSamplerMutex = xSemaphoreCreateMutex();
  gpsMutex = xSemaphoreCreateMutex();
  mqttMutex = xSemaphoreCreateMutex();
  
  // Initialize GPS serial
  SerialGPS.begin(9600, SERIAL_8N1, GPS_RX, GPS_TX);
  
  // Initialize modem serial
  SerialAT.begin(115200, SERIAL_8N1, MODEM_RX, MODEM_TX);
  
  SerialMon.println("Hardware initialized");
}