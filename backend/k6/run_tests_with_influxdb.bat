@echo off
REM This batch file runs k6 with InfluxDB output

echo Fleet Monitoring Backend Load Testing with InfluxDB
echo ==================================================
echo.
echo Please select the test to run:
echo 1. Run master test (all REST API controllers)
echo 2. Run WebSocket test
echo 3. Run both tests sequentially
echo 4. Exit
echo.

set /p choice="Enter your choice (1-4): "

if "%choice%"=="1" (
    echo.
    echo Running master test script for all REST API controllers...
    k6 run master_test.js --out influxdb=http://localhost:8086/k6
) else if "%choice%"=="2" (
    echo.
    echo Running WebSocket test...
    k6 run websocket_test.js --out influxdb=http://localhost:8086/k6
) else if "%choice%"=="3" (
    echo.
    echo Running master test script for all REST API controllers...
    k6 run master_test.js --out influxdb=http://localhost:8086/k6
    echo.
    echo Running WebSocket test...
    k6 run websocket_test.js --out influxdb=http://localhost:8086/k6
) else if "%choice%"=="4" (
    exit
) else (
    echo Invalid choice. Please run the script again.
    exit
)

echo.
echo Tests complete!
echo.
echo You can view the test results in Grafana at: http://localhost:8083
echo (login with admin/admin)
echo.
echo NOTE: Make sure your monitoring stack is running: 
echo       cd monitoring
echo       docker-compose up -d
