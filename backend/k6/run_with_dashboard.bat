@echo off
REM This batch file runs k6 with the built-in web dashboard

echo Fleet Monitoring Backend Load Testing with K6 Dashboard
echo ====================================================
echo.
echo This will run k6 with its built-in web dashboard - you'll be able to see results in real-time.
echo.
echo Please select the test to run:
echo 1. Run master test (all REST API controllers)
echo 2. Run WebSocket test
echo 3. Exit
echo.

set /p choice="Enter your choice (1-3): "

if "%choice%"=="1" (
    echo.
    echo Running master test script with dashboard...
    echo Opening http://localhost:5665
    echo You'll see the dashboard in your browser...
    echo Press Ctrl+C when you want to stop the test
    k6 run --out dashboard master_test.js
) else if "%choice%"=="2" (
    echo.
    echo Running WebSocket test with dashboard...
    echo Opening http://localhost:5665
    echo You'll see the dashboard in your browser...
    echo Press Ctrl+C when you want to stop the test
    k6 run --out dashboard websocket_test.js
) else if "%choice%"=="3" (
    exit
) else (
    echo Invalid choice. Please run the script again.
    exit
)

echo.
echo Test complete!
