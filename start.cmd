@echo off
setlocal
cd /d "%~dp0"

where npm >nul 2>&1
if errorlevel 1 goto :missing_npm

if not exist "node_modules\" goto :setup_required

echo Starting the development server...
call npm run dev
if errorlevel 1 goto :start_failed
exit /b 0

:missing_npm
echo npm was not found. Install Node.js 22 or later, then run setup.cmd.
pause
exit /b 1

:setup_required
echo Dependencies are not installed. Run setup.cmd first.
pause
exit /b 1

:start_failed
echo.
echo The development server stopped with an error.
pause
exit /b 1
