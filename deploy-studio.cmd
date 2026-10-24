@echo off
setlocal
title Always and Forever Creator Studio - Cloudflare Deployment
cd /d "%~dp0"

echo.
echo Always and Forever Creator Studio
echo Cloudflare Deployment
echo ==================================
echo.
echo Step 1 of 3: Installing the Cloudflare deployment tools...
call npm.cmd install
if errorlevel 1 goto :failed

echo.
echo Step 2 of 3: Connecting securely to your Cloudflare account...
echo Your web browser may open. Approve the Cloudflare request, then return here.
call npx.cmd wrangler login
if errorlevel 1 goto :failed

echo.
echo Step 3 of 3: Deploying Creator Studio...
call npm.cmd run deploy
if errorlevel 1 goto :failed

echo.
echo SUCCESS: Creator Studio was deployed.
echo Copy the workers.dev address displayed above and send it to Codex.
echo.
pause
exit /b 0

:failed
echo.
echo The deployment stopped before completion.
echo Leave this window open and send Codex a screenshot of the error above.
echo.
pause
exit /b 1
