/**
 * Vehicle Tracking and Fuel Monitoring System
 * 
 * This system tracks vehicle position via GPS and monitors fuel levels,
 * sending data via MQTT over GPRS.
 */

 #include "config.h"
 #include "hardware.h"
 #include "gps_module.h"
 #include "fuel_module.h"
 #include "modem_module.h"
 #include "mqtt_module.h"
 #include "utils.h"
 
 void setup() {
   // Initialize serial communication
   SerialMon.begin(115200);
   delay(10);
   SerialMon.println("Vehicle Tracking System Initializing...");
   
   // Initialize hardware
   setupHardware();
   
   // Initialize all modules
   initGpsModule();
   initFuelModule();
   initModem();
   initMqtt();
   
   // Create RTOS tasks
   createTasks();
   
   SerialMon.println("All tasks started");
 }
 
 void loop() {
   // Empty because all processes are handled by RTOS tasks
   vTaskDelay(1000 / portTICK_PERIOD_MS);
 }
 
 // Create all required FreeRTOS tasks
 void createTasks() {
   // GPS task
   xTaskCreate(gpsTask, "GPS_Task", TASK_STACK_SIZE, NULL, GPS_TASK_PRIORITY, NULL);
   
   // Fuel sampler task
   xTaskCreate(fuelSamplerTask, "Fuel_Task", TASK_STACK_SIZE, NULL, FUEL_TASK_PRIORITY, NULL);
   
   // MQTT task
   xTaskCreate(mqttTask, "MQTT_Task", TASK_STACK_SIZE, NULL, MQTT_TASK_PRIORITY, NULL);
   
   // Publisher tasks
   xTaskCreate(positionPublisherTask, "Position_Publisher", TASK_STACK_SIZE, NULL, 1, NULL);
   xTaskCreate(fuelPublisherTask, "Fuel_Publisher", TASK_STACK_SIZE, NULL, 1, NULL);
 }