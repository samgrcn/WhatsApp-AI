@echo off
echo ====== Setting up WhatsApp Auto-Responder for Oompf! Fitness ======

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Node.js not found. Please install Node.js first.
    echo Visit: https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js found: 
node -v

REM Install dependencies
echo Installing dependencies...
call npm install

REM Create data directory and messages.json
echo Setting up data storage...
if not exist data mkdir data
echo [] > data\messages.json

REM Create .env file if it doesn't exist
if not exist .env (
    echo Creating .env file from template...
    copy .env.example .env
    echo Please edit the .env file to add your DeepSeek API key.
)

REM Prompt for API key if not set
findstr /C:"your_deepseek_api_key_here" .env >nul
if %ERRORLEVEL% equ 0 (
    echo DeepSeek API key not set in .env file.
    set /p api_key=Enter your DeepSeek API key: 
    
    if not "%api_key%"=="" (
        REM Replace placeholder with provided API key (requires PowerShell)
        powershell -Command "(Get-Content .env) -replace 'your_deepseek_api_key_here', '%api_key%' | Set-Content .env"
        echo API key set in .env file.
    ) else (
        echo No API key provided. Please edit the .env file manually.
    )
)

echo Setup complete!
echo.
echo To start the WhatsApp Auto-Responder, run:
echo npm start
echo.
echo After starting, scan the QR code with WhatsApp to connect your account.
echo The admin dashboard will be available at: http://localhost:3000

REM Ask if user wants to start now
set /p start_now=Start the WhatsApp Auto-Responder now? (y/n): 
if /i "%start_now%"=="y" (
    call npm start
)

pause 