#include "mqtt_module.h"
#include "hardware.h"
#include "utils.h"

void initMqtt() {
  mqtt.setServer(broker, 1883);
  mqtt.setCallback(mqttCallback);

  // Build publish topics with MAC address
  String mac = getMacAddress();
  topicPubPosition = "getstokfms/" + mac + "/position";
  topicPubFuel = "getstokfms/" + mac + "/fuel";
  
  SerialMon.print("Position topic: ");
  SerialMon.println(topicPubPosition);
  SerialMon.print("Fuel topic: ");
  SerialMon.println(topicPubFuel);
  
  SerialMon.println("MQTT module initialized");
}

void mqttCallback(char* topic, byte* message, unsigned int len) {
  SerialMon.print("Message arrived on topic: ");
  SerialMon.println(topic);
  String incoming_message;
  for (int i = 0; i < len; i++) {
    incoming_message += (char)message[i];
  }
  incoming_message.trim();
  SerialMon.println(incoming_message);
  if (incoming_message == "ON") {
    digitalWrite(BUILTIN_LED, HIGH);
  }
  if (incoming_message == "OFF") {
    digitalWrite(BUILTIN_LED, LOW);
  }
}

boolean mqttConnect() {
  SerialMon.print("Connecting to ");
  SerialMon.print(broker);
  
  // Use MAC address as device ID to ensure uniqueness
  String deviceId = "Device_" + getMacAddress();
  deviceId.replace(":", "");  // Remove ':' characters
  
  boolean status = mqtt.connect(deviceId.c_str(), mqttUsername, mqttPassword);
  if (!status) {
    SerialMon.println(" fail");
    return false;
  }
  SerialMon.println(" success");
  mqtt.subscribe(topicSubLed);
  return mqtt.connected();
}

// Task for managing MQTT connection
void mqttTask(void *pvParameters) {
  SerialMon.println("MQTT task started");
  int reconnectCount = 0;
  
  for (;;) {
    if (xSemaphoreTake(mqttMutex, portMAX_DELAY) == pdTRUE) {
      if (!mqtt.connected()) {
        mqttConnected = false;
        SerialMon.println("MQTT disconnected, attempting reconnect...");
        
        if (mqttConnect()) {
          mqttConnected = true;
          reconnectCount = 0;
          SerialMon.println("MQTT reconnected");
        } else {
          reconnectCount++;
          
          if (reconnectCount >= 5) {
            SerialMon.println("Multiple reconnect failures, restarting modem...");
            modem.restart();
            if (!modem.waitForNetwork(60000L)) {
              ESP.restart();  // If still fails, restart ESP32
            }
            if (!modem.gprsConnect(apn, gprsUser, gprsPass)) {
              ESP.restart();
            }
            reconnectCount = 0;
          }
        }
      } else {
        mqttConnected = true;
        mqtt.loop();  // Process incoming messages
      }
      xSemaphoreGive(mqttMutex);
    }
    
    vTaskDelay(MQTT_CHECK_INTERVAL / portTICK_PERIOD_MS);
  }
}