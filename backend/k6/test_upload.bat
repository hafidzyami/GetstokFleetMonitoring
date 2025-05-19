@echo off
REM This batch file runs just the upload controller test to verify it works

echo Running upload controller test...
k6 run upload_controller_test.js
