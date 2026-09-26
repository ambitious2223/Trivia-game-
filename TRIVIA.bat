@echo off
title Trivia Game - Starting...
color 0B

echo.
echo  =====================================================
echo   TRIVIA GAME - Bridge + App
echo  =====================================================
echo.

:: Always run from this script's folder (portable — no absolute path)
cd /d "%~dp0"
if %errorlevel% neq 0 (
    color 0C
    echo  [ERROR] Could not enter project folder.
    pause
    exit /b 1
)

node --version >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo  [ERROR] Node.js is not installed or not in PATH.
    echo  Install from: https://nodejs.org
    pause
    exit /b 1
)

echo  [OK] Node.js:
node --version
echo  [OK] Project: %cd%
echo.

if not exist "node_modules\" (
    echo  [INSTALLING] npm install...
    call npm install
    if %errorlevel% neq 0 (
        color 0C
        echo  [ERROR] npm install failed.
        pause
        exit /b 1
    )
)

echo  [STARTING] Trivia Game — bridge + Vite (unique ports)
echo  Game:    http://localhost:4481
echo  Bridge:  http://localhost:4480
echo  Tip: set VITE_BRIDGE_URL in .env if the bridge is not local.
echo.

start "" cmd /c "timeout /t 3 >nul && start http://localhost:4481"
call npm run start:live

pause
