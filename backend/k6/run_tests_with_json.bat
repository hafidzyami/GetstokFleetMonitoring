@echo off
REM This batch file runs k6 with JSON output for simpler visualization

echo Fleet Monitoring Backend Load Testing with JSON Output
echo ====================================================
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
    k6 run master_test.js --out json=results.json
) else if "%choice%"=="2" (
    echo.
    echo Running WebSocket test...
    k6 run websocket_test.js --out json=websocket_results.json
) else if "%choice%"=="3" (
    echo.
    echo Running master test script for all REST API controllers...
    k6 run master_test.js --out json=results.json
    echo.
    echo Running WebSocket test...
    k6 run websocket_test.js --out json=websocket_results.json
) else if "%choice%"=="4" (
    exit
) else (
    echo Invalid choice. Please run the script again.
    exit
)

echo.
echo Tests complete!
echo.
echo Results have been saved to JSON files (results.json and/or websocket_results.json)
echo.
echo NOTE: To view metrics in real-time, try running with: 
echo       k6 run master_test.js --out dashboard
