@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 goto :missing_node

where npm >nul 2>&1
if errorlevel 1 goto :missing_npm

echo Installing dependencies from package-lock.json...
call npm ci
if errorlevel 1 goto :install_failed

echo.
echo Setup completed successfully.
echo Run start.cmd to start the development server.
pause
exit /b 0

:missing_node
echo Node.js was not found. Install Node.js 22 or later, then run setup.cmd again.
pause
exit /b 1

:missing_npm
echo npm was not found. Reinstall Node.js with npm, then run setup.cmd again.
pause
exit /b 1

:install_failed
echo.
echo Setup failed. Review the npm error shown above.
pause
exit /b 1
