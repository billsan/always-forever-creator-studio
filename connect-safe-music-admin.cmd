@echo off
setlocal
cd /d "%~dp0"
echo Step 1 of 3: Creating the Safe Music catalog table...
call npx wrangler d1 execute aaf-creator-db --remote --file=schema.sql
if errorlevel 1 goto :failed
echo.
echo Step 2 of 3: Enter a long private administrator key.
echo Save it in your password manager. Do not put it in website code.
call npx wrangler secret put MUSIC_ADMIN_KEY
if errorlevel 1 goto :failed
echo.
echo Step 3 of 3: Publishing the updated studio...
call npx wrangler deploy
if errorlevel 1 goto :failed
echo.
echo Ready: https://studio.alwaysandforever.life/safe-music-admin.html
pause
exit /b 0
:failed
echo Setup stopped because one step did not finish.
pause
exit /b 1
