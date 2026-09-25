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
set "FITLOG_SITE=%~1"
if not defined FITLOG_SITE if exist "D:\xampp\htdocs\FitLog-main" set "FITLOG_SITE=D:\xampp\htdocs\FitLog-main"
if not defined FITLOG_SITE if exist "C:\xampp\htdocs\FitLog-main" set "FITLOG_SITE=C:\xampp\htdocs\FitLog-main"
if not defined FITLOG_SITE if exist "D:\xampp\htdocs\FitLog" set "FITLOG_SITE=D:\xampp\htdocs\FitLog"
if not defined FITLOG_SITE if exist "C:\xampp\htdocs\FitLog" set "FITLOG_SITE=C:\xampp\htdocs\FitLog"
if not defined FITLOG_SITE (
  echo Build complete. Pass your XAMPP site folder to start.bat to copy the app there.
  pause
  exit /b 0
)
xcopy "dist\*" "%FITLOG_SITE%\" /E /I /Y >nul
if errorlevel 1 (
  echo Could not copy the build into %FITLOG_SITE%.
  pause
  exit /b 1
)
echo FitLog copied to %FITLOG_SITE%.
echo Start Apache and MySQL in XAMPP, then open the site's localhost address.
pause
