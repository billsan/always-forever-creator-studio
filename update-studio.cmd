@echo off
setlocal
title Always and Forever Creator Studio - Update
cd /d "%~dp0"

if not exist "package.json" goto :missingfiles
if not exist "wrangler.jsonc" goto :missingfiles
if not exist "src\index.js" goto :missingfiles
if not exist "public\app.js" goto :missingfiles

echo.
echo Always and Forever Creator Studio
echo AI Obituary Writer + Dual-Destination Memorial QR v1.7.6.1
echo ==================================
echo.
echo Installing or updating deployment tools...
call npm.cmd install
if errorlevel 1 goto :failed

echo.
echo Deploying Creator Studio v1.7.6.1...
call npm.cmd run deploy
if errorlevel 1 goto :failed

echo.
echo SUCCESS: Creator Studio v1.7.6.1 was deployed.
echo Refresh the Studio with Ctrl+F5.
echo To enable final rendering, run connect-shotstack-rendering.cmd once.
echo.
pause
exit /b 0

:missingfiles
echo.
echo ERROR: This folder is missing required Creator Studio files.
echo Make sure you extracted the COMPLETE v1.7.6.1 ZIP before running this updater.
echo Required: package.json, wrangler.jsonc, src, and public.
echo.
pause
exit /b 2

:failed
echo.
echo The update stopped before completion.
echo Leave this window open and send me a screenshot of the error above.
echo.
pause
exit /b 1
