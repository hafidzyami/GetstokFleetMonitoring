#!/bin/bash
# This shell script runs all k6 load tests for the fleet monitoring backend

echo "Fleet Monitoring Backend Load Testing"
echo "====================================="
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
        k6 run master_test.js
        ;;
    2)
        echo
        echo "Running WebSocket test..."
        k6 run websocket_test.js
        ;;
    3)
        echo
        echo "Running master test script for all REST API controllers..."
        k6 run master_test.js
        echo
        echo "Running WebSocket test..."
        k6 run websocket_test.js
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
echo "You can also run individual controller tests:"
echo
echo "k6 run auth_controller_test.js"
echo "k6 run truck_controller_test.js"
echo "k6 run route_plan_controller_test.js"
echo "k6 run user_controller_test.js"
echo "k6 run fuel_receipt_controller_test.js"
echo "k6 run upload_controller_test.js"
echo "k6 run ocr_controller_test.js"
echo "k6 run routing_controller_test.js"
echo "k6 run route_deviation_controller_test.js"
echo "k6 run truck_idle_controller_test.js"
echo "k6 run driver_location_controller_test.js"
echo "k6 run websocket_test.js"
