@echo off
setlocal
cd /d "%~dp0"
title Always and Forever - Obituary Test Access

echo.
echo Always and Forever Creator Studio v1.7.4
echo Secure Obituary Test Access Setup
echo =========================================
echo.
echo This creates a PRIVATE test key for the owner/admin.
echo It does NOT disable WooCommerce payment protection for customers.
echo.
echo Choose a long private key that only you know.
echo Wrangler will securely store it as OBITUARY_TEST_KEY.
echo.
call npx wrangler secret put OBITUARY_TEST_KEY
if errorlevel 1 goto :failed

echo.
echo Publishing Creator Studio with secure test access...
call npx wrangler deploy
if errorlevel 1 goto :failed

echo.
echo SUCCESS: Secure obituary test access is connected.
echo Open your Creator Studio domain followed by /test-obituary
echo Enter the SAME private key you just saved.
echo The test session lasts 2 hours.
echo.
pause
exit /b 0

:failed
echo.
echo Setup stopped before completion.
echo Leave this window open and send a screenshot of the error above.
echo.
pause
exit /b 1
