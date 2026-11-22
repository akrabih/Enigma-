@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  for /d %%D in ("%LOCALAPPDATA%\CodexEnigmaRuntime\node-v*-win-x64") do set "PATH=%%~fD;%PATH%"
)
where node >nul 2>nul
if errorlevel 1 (
  echo Please install Node.js 22 LTS from https://nodejs.org and run this file again.
  pause
  exit /b 1
)
if not exist "node_modules\vite" (
  call npm.cmd ci
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
call npm.cmd run dev -- --open
if errorlevel 1 pause
