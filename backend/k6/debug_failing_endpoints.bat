@echo off
REM This batch file runs debugging for failing endpoints

echo Debugging Failing Endpoints
echo =========================
echo.
echo This will run a single test for the failing endpoints with detailed logging
echo.

k6 run --verbose debug_failing_endpoints.js

echo.
echo Test complete!
echo.
pause
