#!/usr/bin/env python3
import paho.mqtt.client as mqtt
import json
import datetime

# MQTT settings
broker = "mqtt.eclipseprojects.io"
port = 1883
mac_id = "MAC2"
topic_prefix = "getstokfms"

# Payloads
timestamp = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S+0000")

fuel_payload = {
    "Timestamp": timestamp,
    "Fuel": 21.0
}


position_payload = {
    "Timestamp": timestamp,
    "Latitude": -6.8804582750200405,
    "Longitude": 107.61318441988006
}

# Connect and publish
client = mqtt.Client()
client.connect(broker, port, 60)

client.publish(f"{topic_prefix}/{mac_id}/fuel", json.dumps(fuel_payload), qos=1)
client.publish(f"{topic_prefix}/{mac_id}/position", json.dumps(position_payload), qos=1)

client.disconnect()
