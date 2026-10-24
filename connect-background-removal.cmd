@echo off
setlocal
title Always and Forever Creator Studio - Background Removal
cd /d "%~dp0"

echo.
echo Connect Secure Background Removal
echo =================================
echo.
echo Get your API key from your remove.bg account first.
echo The key will be saved directly as a private Cloudflare secret.
echo It will not be written into this folder or shown to customers.
echo.
call npm.cmd install
if errorlevel 1 goto :failed

call npx.cmd wrangler secret put REMOVE_BG_API_KEY
if errorlevel 1 goto :failed

echo.
echo SUCCESS: Background removal is connected.
echo Open the Studio, select a photo slide, and choose Photo Prep.
echo.
pause
exit /b 0

:failed
echo.
echo Setup stopped before completion.
echo Leave this window open and send Codex a screenshot of the error above.
echo.
pause
exit /b 1
