#include "gps_module.h"
#include "hardware.h"
#include "mqtt_module.h"
#include "utils.h"

// Global GPS data
GpsData currentGpsData;

void initGpsModule() {
  // Initialize GPS data
  if (xSemaphoreTake(gpsMutex, portMAX_DELAY) == pdTRUE) {
    currentGpsData.isValid = false;
    currentGpsData.latitude = 0;
    currentGpsData.longitude = 0;
    currentGpsData.speed = 0;
    currentGpsData.course = 0;
    currentGpsData.altitude = 0;
    xSemaphoreGive(gpsMutex);
  }
  
  SerialMon.println("GPS module initialized");
}

// Task for reading and processing GPS data
void gpsTask(void *pvParameters) {
  SerialMon.println("GPS task started");
  
  for (;;) {
    while (SerialGPS.available() > 0) {
      gps.encode(SerialGPS.read());
    }
    
    // Update GPS data structure with semaphore
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
    
    vTaskDelay(100 / portTICK_PERIOD_MS);  // Check GPS every 100ms
  }
}

// Task for publishing position data
void positionPublisherTask(void *pvParameters) {
  SerialMon.println("Position publisher task started");
  TickType_t xLastWakeTime;
  xLastWakeTime = xTaskGetTickCount();
  
  for (;;) {
    if (gpsReady && mqttConnected) {
      sendPositionData();
    } else {
      SerialMon.println("Skip position publish: GPS ready=" + String(gpsReady) + 
                         ", MQTT connected=" + String(mqttConnected));
    }
    
    // Wait for next interval
    vTaskDelayUntil(&xLastWakeTime, POSITION_INTERVAL / portTICK_PERIOD_MS);
  }
}

void sendPositionData() {
  StaticJsonDocument<256> doc;
  char buffer[256];
  getTimestamp(); // Sync NTP
  bool positionValid = false;
  
  // Get GPS data with mutex
  if (xSemaphoreTake(gpsMutex, portMAX_DELAY) == pdTRUE) {
    doc.clear();
    doc["timestamp"] = getISO8601Timestamp();

    if (currentGpsData.isValid) {
      doc["latitude"] = currentGpsData.latitude;
      doc["longitude"] = currentGpsData.longitude;
      
      // Add other GPS data if available
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
    
    // Publish with mutex
    if (xSemaphoreTake(mqttMutex, portMAX_DELAY) == pdTRUE) {
      mqtt.publish(topicPubPosition.c_str(), buffer);
      xSemaphoreGive(mqttMutex);
    }
  }
}