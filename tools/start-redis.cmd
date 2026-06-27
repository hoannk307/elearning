@echo off
REM Khoi dong Redis portable cho Kids LMS (dev local)
echo Starting Redis on localhost:6379 ...
"%~dp0redis\redis-server.exe" "%~dp0redis\redis.windows.conf"
