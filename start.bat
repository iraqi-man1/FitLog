@echo off
cd /d "%~dp0"
if not exist node_modules (
  echo FitLog dependencies are missing. Run npm ci once while online.
  pause
  exit /b 1
)
call npm.cmd run build
if errorlevel 1 (
  pause
  exit /b 1
)
echo.
echo Open http://127.0.0.1:4173/ in your browser.
echo Keep this window open while using FitLog.
call npm.cmd run start
