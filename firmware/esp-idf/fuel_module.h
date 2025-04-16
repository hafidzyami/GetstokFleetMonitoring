#ifndef FUEL_MODULE_H
#define FUEL_MODULE_H

#include "config.h"

// Global array for fuel samples
extern int fuelSamples[];
extern int fuelSampleCount;

// Initialize fuel module
void initFuelModule();

// Fuel sampler task
void fuelSamplerTask(void *pvParameters);

// Fuel publisher task
void fuelPublisherTask(void *pvParameters);

// Send fuel data via MQTT
void sendFuelData();

// Calculate average fuel level
int getFuelAverage();

#endif // FUEL_MODULE_H