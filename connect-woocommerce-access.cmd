@echo off
setlocal
cd /d "%~dp0"
echo Step 1 of 3: Creating the paid-access table...
call npx wrangler d1 execute aaf-creator-db --remote --file=schema.sql
if errorlevel 1 goto :failed
echo.
echo Step 2 of 3: Enter the Shared Secret from WordPress.
echo Find it under WordPress Dashboard - Settings - AAF Creator Studio.
call npx wrangler secret put STUDIO_AUTH_SECRET
if errorlevel 1 goto :failed
echo.
echo Step 3 of 3: Publishing Creator Studio...
call npx wrangler deploy
if errorlevel 1 goto :failed
echo.
echo WooCommerce access is connected.
pause
exit /b 0
:failed
echo Setup stopped because one step did not finish.
pause
exit /b 1
