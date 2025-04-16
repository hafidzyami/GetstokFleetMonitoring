#include "modem_module.h"
#include "hardware.h"

void initModem() {
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
  
  SerialMon.println("Modem initialized");
}

int getTimestamp() {
  int year3 = 0, month3 = 0, day3 = 0, hour3 = 0, min3 = 0, sec3 = 0;
  float timezone = 0;
  
  // Try to get time from network, up to 3 attempts
  bool timeSuccess = false;
  for (int8_t i = 3; i; i--) {
    if (modem.getNetworkTime(&year3, &month3, &day3, &hour3, &min3, &sec3, &timezone)) {
      timeSuccess = true;
      break;
    } else {
      vTaskDelay(1000 / portTICK_PERIOD_MS);  // Wait 1 second before retrying
    }
  }
  
  // If network time retrieval failed, use local time that's already set
  if (timeSuccess) {
    setTime(hour3, min3, sec3, day3, month3, year3);
  }
  
  return now();
}