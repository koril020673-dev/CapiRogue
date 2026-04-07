@echo off
setlocal

cd /d "%~dp0"
set "PID_FILE=.vite-dev.pid"

if exist "%PID_FILE%" (
  set /p OLD_PID=<"%PID_FILE%"
  tasklist /FI "PID eq %OLD_PID%" | find "%OLD_PID%" >nul
  if not errorlevel 1 (
    echo Dev server already running. PID: %OLD_PID%
    echo URL: http://localhost:5173 (or next available port)
    goto :eof
  ) else (
    del "%PID_FILE%" >nul 2>&1
  )
)

for /f %%I in ('powershell -NoProfile -Command "$p = Start-Process -FilePath cmd.exe -ArgumentList '/c','npm run dev' -WorkingDirectory '%cd%' -WindowStyle Minimized -PassThru; $p.Id"') do set "NEW_PID=%%I"

echo %NEW_PID%>"%PID_FILE%"
echo Dev server started. PID: %NEW_PID%
echo Open: http://localhost:5173 (if busy, Vite will use another port)
