#ifndef GPS_MODULE_H
#define GPS_MODULE_H

#include "config.h"

// GPS data structure
typedef struct {
  double latitude;
  double longitude;
  double speed;
  double course;
  double altitude;
  bool isValid;
} GpsData;

extern GpsData currentGpsData;

// Initialize GPS module
void initGpsModule();

// GPS task
void gpsTask(void *pvParameters);

// Position publisher task
void positionPublisherTask(void *pvParameters);

// Send position data via MQTT
void sendPositionData();

#endif // GPS_MODULE_H