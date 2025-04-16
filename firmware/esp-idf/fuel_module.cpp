#include "fuel_module.h"
#include "hardware.h"
#include "mqtt_module.h"
#include "utils.h"

// Fuel samples array
int fuelSamples[MAX_FUEL_SAMPLES];
int fuelSampleCount = 0;

void initFuelModule() {
  // Initialize fuel samples array
  for(int i = 0; i < MAX_FUEL_SAMPLES; i++) {
    fuelSamples[i] = 0;
  }
  
  SerialMon.println("Fuel module initialized");
}

// Task for sampling fuel levels
void fuelSamplerTask(void *pvParameters) {
  SerialMon.println("Fuel sampler task started");
  TickType_t xLastWakeTime;
  xLastWakeTime = xTaskGetTickCount();
  
  for (;;) {
    // Get fuel value
    int fuelValue = analogRead(FUEL_ADC_PIN);
    
    // Update samples array with mutex
    if (xSemaphoreTake(fuelSamplerMutex, portMAX_DELAY) == pdTRUE) {
      fuelSamples[fuelSampleCount] = fuelValue;
      fuelSampleCount = (fuelSampleCount + 1) % MAX_FUEL_SAMPLES;
      xSemaphoreGive(fuelSamplerMutex);
    }
    
    SerialMon.print("Fuel sample collected: ");
    SerialMon.println(fuelValue);
    
    // Wait until next interval
    vTaskDelayUntil(&xLastWakeTime, FUEL_SAMPLING_INTERVAL / portTICK_PERIOD_MS);
  }
}

// Task for publishing fuel data
void fuelPublisherTask(void *pvParameters) {
  SerialMon.println("Fuel publisher task started");
  TickType_t xLastWakeTime;
  xLastWakeTime = xTaskGetTickCount();
  
  // Add initial delay to avoid collision with position publishing
  vTaskDelay(10000 / portTICK_PERIOD_MS);
  
  for (;;) {
    if (mqttConnected) {
      sendFuelData();
    } else {
      SerialMon.println("Skip fuel publish: MQTT connected=" + String(mqttConnected));
    }
    
    // Wait until next interval
    vTaskDelayUntil(&xLastWakeTime, FUEL_INTERVAL / portTICK_PERIOD_MS);
  }
}

void sendFuelData() {
  StaticJsonDocument<128> doc;
  char buffer[128];
  int fuelAverage = 0;
  
  // Calculate average with mutex
  if (xSemaphoreTake(fuelSamplerMutex, portMAX_DELAY) == pdTRUE) {
    fuelAverage = getFuelAverage();
    xSemaphoreGive(fuelSamplerMutex);
  }
  
  doc.clear();
  doc["timestamp"] = getISO8601Timestamp();
  doc["fuel"] = fuelAverage;

  SerialMon.print("Publish fuel data: ");
  serializeJson(doc, SerialMon);
  SerialMon.println();
  
  serializeJson(doc, buffer);
  
  // Publish with mutex
  if (xSemaphoreTake(mqttMutex, portMAX_DELAY) == pdTRUE) {
    mqtt.publish(topicPubFuel.c_str(), buffer);
    xSemaphoreGive(mqttMutex);
  }
}

int getFuelAverage() {
  // Calculate average from collected samples
  // This function must be called after acquiring the mutex
  long sum = 0;
  int count = 0;
  
  for (int i = 0; i < MAX_FUEL_SAMPLES; i++) {
    if (fuelSamples[i] != 0) {  // Only count non-zero values
      sum += fuelSamples[i];
      count++;
    }
  }
  
  if (count == 0) {
    return analogRead(FUEL_ADC_PIN); // If no samples yet, get direct reading
  }
  
  return sum / count;
}