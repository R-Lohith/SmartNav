@echo off
echo Starting SmartNav Project Services...

:: Start Client
start "SmartNav - Frontend" /d "client" cmd /k "npm run dev"

:: Start Server
start "SmartNav - Main Backend" /d "server" cmd /k "npm run dev"

:: Start Python Backend
start "SmartNav - Python Backend" /d "py_server" cmd /k "python backend.py"

echo All services launched!
echo You can monitor each service in its own window.
pause
