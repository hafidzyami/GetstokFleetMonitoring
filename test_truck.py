#!/usr/bin/env python3
import paho.mqtt.client as mqtt
import json
import time
import random
import datetime
import argparse
import logging
import math
from threading import Thread

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("Truck-Simulator")

# Default MQTT broker settings
DEFAULT_BROKER = "mqtt.eclipseprojects.io"
DEFAULT_PORT = 1883
DEFAULT_TOPIC_PREFIX = "getstokfms"

# Jakarta area coordinates for reference
JAKARTA_CENTER_LAT = -6.890562
JAKARTA_CENTER_LONG = 107.613235
SPREAD_RADIUS = 0.1 

class TruckSimulator:
    def __init__(self, truck_id, broker_url, port, topic_prefix, interval=5):
        """Initialize a truck simulator with given ID."""
        self.truck_id = f"MAC{truck_id}"
        self.broker_url = broker_url
        self.port = port
        self.topic_prefix = topic_prefix
        self.position_topic = f"{topic_prefix}/{self.truck_id}/position"
        self.fuel_topic = f"{topic_prefix}/{self.truck_id}/fuel"
        self.interval = interval
        self.running = False
        
        # Generate a dispersed starting position for each truck
        # Use a formula to evenly distribute trucks in a circular pattern
        angle = (truck_id - 1) * (2 * math.pi / 10)  # Divide circle into 10 parts
        distance = SPREAD_RADIUS * (0.5 + 0.5 * random.random())  # Random distance within radius
        
        self.latitude = JAKARTA_CENTER_LAT + distance * math.cos(angle)
        self.longitude = JAKARTA_CENTER_LONG + distance * math.sin(angle)
        
        # Define a "destination" for the truck to move towards
        self.dest_lat = JAKARTA_CENTER_LAT + SPREAD_RADIUS * random.uniform(-1, 1)
        self.dest_long = JAKARTA_CENTER_LONG + SPREAD_RADIUS * random.uniform(-1, 1)
        
        # Movement speed (degrees per update)
        self.speed = random.uniform(0.0008, 0.002)  # Roughly 80-200m per update
        
        # Initial fuel level (50-100%)
        self.fuel_level = random.uniform(50, 100)
        
        # Connect to MQTT broker
        self.client = mqtt.Client(client_id=f"simulator-{self.truck_id}")
        self.client.on_connect = self.on_connect
        self.client.on_disconnect = self.on_disconnect
        
    def on_connect(self, client, userdata, flags, rc, properties):
        """Callback when client connects to the broker."""
        if rc == 0:
            logger.info(f"Truck {self.truck_id} connected to MQTT broker")
        else:
            logger.error(f"Truck {self.truck_id} failed to connect to MQTT broker with code {rc}")
    
    def on_disconnect(self, client, userdata, rc):
        """Callback when client disconnects from the broker."""
        if rc != 0:
            logger.warning(f"Truck {self.truck_id} unexpectedly disconnected from MQTT broker")
    
    def connect(self):
        """Connect to the MQTT broker."""
        try:
            logger.info(f"Truck {self.truck_id} connecting to {self.broker_url}:{self.port}")
            self.client.connect(self.broker_url, self.port, 60)
            self.client.loop_start()
            return True
        except Exception as e:
            logger.error(f"Could not connect to MQTT broker: {e}")
            return False
    
    def disconnect(self):
        """Disconnect from the MQTT broker."""
        self.client.loop_stop()
        self.client.disconnect()
        logger.info(f"Truck {self.truck_id} disconnected from MQTT broker")
    
    def update_position(self):
        """Update the truck's position with movement toward destination."""
        # Calculate direction vector to destination
        lat_diff = self.dest_lat - self.latitude
        long_diff = self.dest_long - self.longitude
        distance = math.sqrt(lat_diff**2 + long_diff**2)
        
        # If close to destination, choose a new destination
        if distance < self.speed * 2:
            self.dest_lat = JAKARTA_CENTER_LAT + SPREAD_RADIUS * random.uniform(-1, 1)
            self.dest_long = JAKARTA_CENTER_LONG + SPREAD_RADIUS * random.uniform(-1, 1)
            logger.info(f"Truck {self.truck_id} reached destination, heading to new destination at ({self.dest_lat:.6f}, {self.dest_long:.6f})")
            lat_diff = self.dest_lat - self.latitude
            long_diff = self.dest_long - self.longitude
            distance = math.sqrt(lat_diff**2 + long_diff**2)
        
        # Normalize direction vector and multiply by speed
        if distance > 0:
            self.latitude += (lat_diff / distance) * self.speed
            self.longitude += (long_diff / distance) * self.speed
        
        # Add small random variation to movement
        self.latitude += random.uniform(-0.0001, 0.0001)
        self.longitude += random.uniform(-0.0001, 0.0001)
    
    def update_fuel(self):
        """Update the truck's fuel level with a small decrease."""
        # Decrease fuel by 0.1-0.5%
        self.fuel_level -= random.uniform(0.1, 0.5)
        # Keep above 0%
        self.fuel_level = max(self.fuel_level, 0)
        
        # Simulate refueling when below 10%
        if self.fuel_level < 10:
            self.fuel_level = random.uniform(90, 100)
            logger.info(f"Truck {self.truck_id} refueled to {self.fuel_level:.2f}%")
    
    def publish_position(self):
        """Publish the truck's position to MQTT."""
        timestamp = datetime.datetime.now().isoformat()
        data = {
            "Timestamp": timestamp,
            "Latitude": self.latitude,
            "Longitude": self.longitude
        }
        payload = json.dumps(data)
        result = self.client.publish(self.position_topic, payload, qos=1)
        if result.rc == mqtt.MQTT_ERR_SUCCESS:
            logger.debug(f"Truck {self.truck_id} position published: {payload}")
        else:
            logger.error(f"Failed to publish position for truck {self.truck_id}")
    
    def publish_fuel(self):
        """Publish the truck's fuel level to MQTT."""
        timestamp = datetime.datetime.now().isoformat()
        data = {
            "Timestamp": timestamp,
            "Fuel": self.fuel_level
        }
        payload = json.dumps(data)
        result = self.client.publish(self.fuel_topic, payload, qos=1)
        if result.rc == mqtt.MQTT_ERR_SUCCESS:
            logger.debug(f"Truck {self.truck_id} fuel published: {payload}")
        else:
            logger.error(f"Failed to publish fuel for truck {self.truck_id}")
    
    def run(self):
        """Run the truck simulator, publishing data at regular intervals."""
        self.running = True
        position_counter = 0
        fuel_counter = 0
        
        logger.info(f"Truck {self.truck_id} starting at ({self.latitude:.6f}, {self.longitude:.6f})")
        
        while self.running:
            # Update and publish position every update
            self.update_position()
            self.publish_position()
            position_counter += 1
            
            # Update and publish fuel every 5 updates (5x interval seconds)
            if position_counter % 5 == 0:
                self.update_fuel()
                self.publish_fuel()
                fuel_counter += 1
            
            # Log current state
            logger.info(f"Truck {self.truck_id}: Pos=({self.latitude:.6f}, {self.longitude:.6f}), Fuel={self.fuel_level:.2f}%")
            
            # Wait for the next interval
            time.sleep(self.interval)
    
    def stop(self):
        """Stop the truck simulator."""
        self.running = False


def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description='MQTT Truck Fleet Simulator')
    parser.add_argument('-b', '--broker', default=DEFAULT_BROKER,
                        help=f'MQTT broker URL (default: {DEFAULT_BROKER})')
    parser.add_argument('-p', '--port', type=int, default=DEFAULT_PORT,
                        help=f'MQTT broker port (default: {DEFAULT_PORT})')
    parser.add_argument('-t', '--topic', default=DEFAULT_TOPIC_PREFIX,
                        help=f'Topic prefix (default: {DEFAULT_TOPIC_PREFIX})')
    parser.add_argument('-n', '--num-trucks', type=int, default=10,
                        help='Number of trucks to simulate (default: 10)')
    parser.add_argument('-i', '--interval', type=int, default=5,
                        help='Update interval in seconds (default: 5)')
    return parser.parse_args()


def main():
    """Main function to run the truck simulator."""
    args = parse_arguments()
    
    # Extract broker URL (remove tcp:// if present)
    broker_url = args.broker
    if broker_url.startswith("tcp://"):
        broker_url = broker_url[6:]
    
    logger.info(f"Starting {args.num_trucks} truck simulators")
    logger.info(f"Connecting to MQTT broker at {broker_url}:{args.port}")
    logger.info(f"Using topic prefix: {args.topic}")
    logger.info(f"Update interval: {args.interval} seconds")
    
    # Create truck simulators
    trucks = []
    threads = []
    try:
        for i in range(1, args.num_trucks + 1):
            truck = TruckSimulator(
                truck_id=i,
                broker_url=broker_url,
                port=args.port,
                topic_prefix=args.topic,
                interval=args.interval
            )
            if truck.connect():
                trucks.append(truck)
                thread = Thread(target=truck.run)
                thread.daemon = True
                threads.append(thread)
                thread.start()
                # Small delay between starting each truck to spread out messages
                time.sleep(0.5)
        
        # Keep the main thread running
        while threads:
            for thread in threads:
                thread.join(1)  # Join with timeout to keep main thread responsive
                if not thread.is_alive():
                    threads.remove(thread)
    
    except KeyboardInterrupt:
        logger.info("Interrupted. Stopping simulators...")
    finally:
        # Clean shutdown
        for truck in trucks:
            truck.stop()
            truck.disconnect()
        
        logger.info("All trucks stopped and disconnected.")


if __name__ == "__main__":
    main()