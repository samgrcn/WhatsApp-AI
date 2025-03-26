#!/bin/bash

# Welcome message
echo "Welcome to the Oompf! Fitness WhatsApp Auto-Responder Setup!"
echo "This script will guide you through the installation process."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Installing Node.js..."
    # Check if Homebrew is installed
    if ! command -v brew &> /dev/null; then
        echo "Installing Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    fi
    # Install Node.js using Homebrew
    brew install node
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Create data directory and messages.json file
echo "Creating data directory and messages.json file..."
mkdir -p data
echo "[]" > data/messages.json

# Prompt for DeepSeek API key
echo "Please enter your DeepSeek API key:"
read deepseek_api_key

# Create .env file with the API key
echo "DEEPSEEK_API_KEY=$deepseek_api_key" > .env

# Start the application
echo "Starting the application..."
npm start

# Keep the terminal open if there is an error
if [ $? -ne 0 ]; then
    echo "An error occurred. Press Enter to exit."
    read
fi 