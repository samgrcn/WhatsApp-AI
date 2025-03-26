#!/bin/bash

# WhatsApp Auto-Responder Setup Script for Linux/Mac
echo "====== Setting up WhatsApp Auto-Responder for Oompf! Fitness ======"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js not found. Please install Node.js first."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

echo "Node.js found: $(node -v)"

# Install dependencies
echo "Installing dependencies..."
npm install

# Create data directory and messages.json
echo "Setting up data storage..."
mkdir -p data
echo "[]" > data/messages.json

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo "Please edit the .env file to add your DeepSeek API key."
    echo "You can open it with: nano .env"
fi

# Prompt for API key if not set
if grep -q "your_deepseek_api_key_here" .env; then
    echo "DeepSeek API key not set in .env file."
    read -p "Enter your DeepSeek API key: " api_key
    if [ ! -z "$api_key" ]; then
        # Replace the placeholder with the provided API key
        sed -i.bak "s/your_deepseek_api_key_here/$api_key/g" .env
        rm -f .env.bak
        echo "API key set in .env file."
    else
        echo "No API key provided. Please edit the .env file manually."
    fi
fi

echo "Setup complete!"
echo ""
echo "To start the WhatsApp Auto-Responder, run:"
echo "npm start"
echo ""
echo "After starting, scan the QR code with WhatsApp to connect your account."
echo "The admin dashboard will be available at: http://localhost:3000"

# Ask if user wants to start now
read -p "Start the WhatsApp Auto-Responder now? (y/n): " start_now
if [[ $start_now == "y" || $start_now == "Y" ]]; then
    npm start
fi 