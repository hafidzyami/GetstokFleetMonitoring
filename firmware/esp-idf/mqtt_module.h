#ifndef MQTT_MODULE_H
#define MQTT_MODULE_H

#include "config.h"

// Initialize MQTT
void initMqtt();

// MQTT task
void mqttTask(void *pvParameters);

// MQTT callback
void mqttCallback(char* topic, byte* message, unsigned int len);

// Connect to MQTT broker
boolean mqttConnect();

#endif // MQTT_MODULE_H