@echo off
REM This batch file runs a debugging version of the WebSocket test

echo WebSocket Debugging Test
echo ======================
echo.
echo This will run a single WebSocket connection test with detailed logging
echo.

k6 run --verbose websocket_debug.js

echo.
echo Test complete!
echo.
pause
