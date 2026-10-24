@echo off
setlocal
cd /d "%~dp0"
echo Connect the Always ^& Forever AI Obituary Writer
echo.
if not exist "wrangler.jsonc" (
  echo ERROR: wrangler.jsonc was not found. Extract the complete ZIP before running this file.
  pause
  exit /b 1
)
call npx wrangler secret put OPENAI_API_KEY --name aaf-creator-studio --config wrangler.jsonc
if errorlevel 1 exit /b 1
echo.
echo OpenAI is connected. Deploying Creator Studio v1.7.0...
call npx wrangler deploy --name aaf-creator-studio --config wrangler.jsonc --keep-vars
pause
