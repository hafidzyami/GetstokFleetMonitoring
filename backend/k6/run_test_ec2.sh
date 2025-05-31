#!/bin/bash
# This shell script runs k6 with InfluxDB output on EC2

echo "Fleet Monitoring Backend Load Testing on EC2 with InfluxDB"
echo "========================================================"
echo

# Define EC2 private IP or localhost for InfluxDB connection
INFLUXDB_HOST="localhost"
# Define which config file to use
CONFIG_FILE="config.ec2.js"

echo "Please select the test to run:"
echo "1. Run master test (all REST API controllers + WebSocket)"
echo "2. Exit"
echo

read -p "Enter your choice (1-2): " choice

case $choice in
    1)
        echo
        echo "Running master test script for all REST API controllers and Websocket..."
        sed -i "s/import { BASE_URL, OPTIONS.*} from '.\/config.js';/import { BASE_URL, OPTIONS, TEST_DATA, getAuthToken } from '.\/config.ec2.js';/" master_test.js
        k6 run master_test.js --out influxdb=http://${INFLUXDB_HOST}:8086/k6
        ;;
    2)
        exit 0
        ;;
    *)
        echo "Invalid choice. Please run the script again."
        exit 1
        ;;
esac

echo
echo "Tests complete!"
echo
echo "You can view the test results in Grafana at: http://54.169.106.52:8083"
echo "(login with admin/admin)"