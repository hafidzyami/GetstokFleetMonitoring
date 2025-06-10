#!/usr/bin/env python3
import paho.mqtt.client as mqtt
import json
import datetime

# MQTT settings
broker = "mqtt.eclipseprojects.io"
port = 1883
mac_id = "MAC1"
topic_prefix = "getstokfms"

# Payloads
timestamp = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S+0000")


# Dayang Sumbi (DEVIASI)
# payload = {
#     "Timestamp": timestamp,
#     "Latitude": -6.887383985615818,
#     "Longitude": 107.6131624127243,
#     "Fuel": 21.0,
# }

# Dago (TIDAK DEVIASI)
# payload = {
#     "Timestamp": timestamp,
#     "Latitude": -6.887420,
#     "Longitude": 107.613630,
#     "Fuel": 21.0,
# }

# Cisitu (TIDAK DEVIASI)
# payload ={
#     "Timestamp": timestamp,
#     "Latitude": -6.879485954583086,
#     "Longitude": 107.61345285727668,
#     "Fuel": 21.0,
# }

# 34 m
# payload = {
#     "Timestamp": timestamp,
#     "Latitude": -6.87976790788259,
#     "Longitude": 107.61335607580925,
#     "Fuel": 21.0,
# }

# 35 m
# payload = {
#     "Timestamp": timestamp,
#     "Latitude": -6.879787517134441,
#     "Longitude": 107.61334943246129,
#     "Fuel": 21.0,
# }

# titik asal
# payload = {
#     "Timestamp": timestamp,
#     "Latitude": -6.886238850014156,
#     "Longitude": 107.61367505554882,
#     "Fuel": 21.0,
# }

# titik atas
# payload = {
#     "Timestamp": timestamp,
#     "Latitude": -6.886114025435882,
#     "Longitude": 107.6136724400316,
#     "Fuel": 21.0,
# }

# titik bawah
# payload = {
#     "Timestamp": timestamp,
#     "Latitude": -6.886366000322036,
#     "Longitude": 107.61364270727107,
#     "Fuel": 21.0,
# }

# titik kiri
# payload = {
#     "Timestamp": timestamp,
#     "Latitude": -6.886239514490615,
#     "Longitude": 107.6135709581818,
#     "Fuel": 21.0,
# }

# titik keluar idle
payload = {
    "T": timestamp,
    "Lat":  -6.898968611981169,
    "Lon": 107.61500888964427,
    "F": 21.0,
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


client.publish(f"{topic_prefix}/{mac_id}/data", json.dumps(payload), qos=1)
    

client.disconnect()
