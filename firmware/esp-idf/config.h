#ifndef CONFIG_H
#define CONFIG_H

// Library definitions
#define TINY_GSM_MODEM_SIM800
#define SerialMon Serial
#define SerialAT Serial1
#define TINY_GSM_DEBUG SerialMon
#define GSM_PIN ""

// Include required libraries
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

// Interval times (ms)
#define POSITION_INTERVAL 60000      // 1 minute
#define FUEL_INTERVAL 300000         // 5 minutes
#define FUEL_SAMPLING_INTERVAL 30000 // 30 seconds
#define MQTT_CHECK_INTERVAL 5000     // 5 seconds

// Task stack sizes and priorities
#define TASK_STACK_SIZE 4096
#define GPS_TASK_PRIORITY 2
#define FUEL_TASK_PRIORITY 2
#define MQTT_TASK_PRIORITY 3

// GPRS/MQTT Configuration
const char apn[] = "internet";
const char gprsUser[] = "";
const char gprsPass[] = "";
const char* broker = "mqtt.eclipseprojects.io";
const char* mqttUsername = "";
const char* mqttPassword = "";

// Fuel sensor configuration
#define MAX_FUEL_SAMPLES 10  // Maximum 10 samples (5 min / 30 sec)

// Globals for topic names (will be set during initialization)
extern String topicPubPosition;
extern String topicPubFuel;
extern const char* topicSubLed;

// Status flags for connections
extern bool gpsReady;
extern bool networkConnected;
extern bool mqttConnected;

// Mutex handles
extern SemaphoreHandle_t fuelSamplerMutex;
extern SemaphoreHandle_t gpsMutex;
extern SemaphoreHandle_t mqttMutex;

#endif // CONFIG_H