#ifndef HARDWARE_H
#define HARDWARE_H

#include "config.h"

// Hardware pin definitions
#define BUILTIN_LED 2
#define MODEM_TX 17
#define MODEM_RX 16
#define FUEL_ADC_PIN 34
#define GPS_RX 22
#define GPS_TX 23

// Global objects for hardware
extern TinyGPSPlus gps;
extern HardwareSerial SerialGPS;
extern TinyGsm modem;
extern TinyGsmClient client;
extern PubSubClient mqtt;

// Initialize hardware
void setupHardware();

#endif // HARDWARE_H