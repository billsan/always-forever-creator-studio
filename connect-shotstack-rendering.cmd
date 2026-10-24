@echo off
setlocal
cd /d "%~dp0"
echo.
echo Connect Shotstack rendering to Creator Studio
echo The key is stored as an encrypted Cloudflare secret and is never added to the website files.
echo.
call npx wrangler secret put SHOTSTACK_API_KEY
if errorlevel 1 goto :error
echo.
echo Shotstack is connected in SANDBOX mode for safe testing.
echo Run update-studio.cmd to publish the rendering build.
pause
exit /b 0
:error
echo.
echo The Shotstack key was not saved. Check the message above and try again.
pause
exit /b 1
