#!/bin/bash
# This shell script runs k6 with InfluxDB output

echo "Fleet Monitoring Backend Load Testing with InfluxDB"
echo "=================================================="
echo
echo "Please select the test to run:"
echo "1. Run master test (all REST API controllers)"
echo "2. Run WebSocket test"
echo "3. Run both tests sequentially"
echo "4. Exit"
echo

read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        echo
        echo "Running master test script for all REST API controllers..."
        k6 run master_test.js --out influxdb=http://localhost:8086/k6
        ;;
    2)
        echo
        echo "Running WebSocket test..."
        k6 run websocket_test.js --out influxdb=http://localhost:8086/k6
        ;;
    3)
        echo
        echo "Running master test script for all REST API controllers..."
        k6 run master_test.js --out influxdb=http://localhost:8086/k6
        echo
        echo "Running WebSocket test..."
        k6 run websocket_test.js --out influxdb=http://localhost:8086/k6
        ;;
    4)
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
echo "You can view the test results in Grafana at: http://localhost:8083"
echo "(login with admin/admin)"
