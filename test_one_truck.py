#!/usr/bin/env python3
import paho.mqtt.client as mqtt
import json
import datetime

# MQTT settings
broker = "getstokfms.com"
port = 1883
mac_id = "B0:B2:1C:A7:25:F4"
topic_prefix = "getstokfms"

# Payloads
timestamp = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S+0000")

fuel_payload = {
    "Timestamp": timestamp,
    "Fuel": 21.0
}
# Dayang Sumbi
position_payload = {
    "Timestamp": timestamp,
    "Latitude": -6.887383985615818,
    "Longitude": 107.6131624127243
}

# JAKARTA
# LATITUDE: -6.1944
# LONGITUDE: 106.8229
# position_payload = {
#     "Timestamp": timestamp,
#     "Latitude": -6.1944,
#     "Longitude": 106.8229
# }

# BANDUNG
# LATITUDE: -6.881644473995715
# LONGITUDE: 107.61256547847621

# position_payload = {
#     "Timestamp": timestamp,
#     "Latitude": -6.888639013514371,
#     "Longitude": 107.61343560992547
# }

# Connect and publish
client = mqtt.Client()
client.connect(broker, port, 60)


client.publish(f"{topic_prefix}/{mac_id}/fuel", json.dumps(fuel_payload), qos=1)
client.publish(f"{topic_prefix}/{mac_id}/position", json.dumps(position_payload), qos=1)
    

client.disconnect()
