@echo off
setlocal

cd /d "%~dp0"
set "PID_FILE=.vite-dev.pid"

if not exist "%PID_FILE%" (
  echo No PID file found. Dev server may already be stopped.
  goto :eof
)

set /p PID=<"%PID_FILE%"
taskkill /PID %PID% /T /F >nul 2>&1

if errorlevel 1 (
  echo Could not stop PID %PID%. It may already be stopped.
) else (
  echo Dev server stopped. PID: %PID%
)

del "%PID_FILE%" >nul 2>&1
