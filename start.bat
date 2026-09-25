@echo off
cd /d "%~dp0"
if not exist node_modules (
  echo FitLog dependencies are missing. Run npm ci once while online.
  pause
  exit /b 1
)
node -e "const [major,minor]=process.versions.node.split('.').map(Number);if(major<24||(major===24&&minor<14))process.exit(1)"
if errorlevel 1 (
  echo FitLog needs Node.js 24.14 or newer.
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
