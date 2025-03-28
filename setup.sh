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

# Prompt for admin credentials
echo "Please enter admin username (default: admin):"
read admin_username
admin_username=${admin_username:-admin}

echo "Please enter admin password (default: admin123):"
read -s admin_password
admin_password=${admin_password:-admin123}
echo

# Create a temporary Node.js script to hash the password
echo "Creating admin credentials..."
cat > temp-hash-password.js << EOF
const bcrypt = require('bcryptjs');
const fs = require('fs');

const username = '$admin_username';
const password = '$admin_password';

// Hash the password (10 rounds of salt)
bcrypt.hash(password, 10, (err, hash) => {
  if (err) {
    console.error('Error hashing password:', err);
    process.exit(1);
  }
  
  // Create the admin.json file
  const adminData = {
    username: username,
    password: hash
  };
  
  fs.writeFileSync('./data/admin.json', JSON.stringify(adminData, null, 2), 'utf8');
  console.log('Admin credentials created successfully');
  
  // Clean up the temporary script
  fs.unlinkSync('./temp-hash-password.js');
});
EOF

# Execute the temporary script with Node.js
node temp-hash-password.js

# Create .env file with the API key
echo "DEEPSEEK_API_KEY=$deepseek_api_key" > .env

# Start the application
echo "Setup completed successfully. Starting the application..."
npm start

# Keep the terminal open if there is an error
if [ $? -ne 0 ]; then
    echo "An error occurred. Press Enter to exit."
    read
fi 