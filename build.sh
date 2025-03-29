#!/bin/bash

# Install backend dependencies
echo "Installing backend dependencies..."
npm install

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd frontend
npm install
cd ..

# Build frontend
echo "Building frontend..."
cd frontend
npm run build
cd ..

# Start backend
echo "Starting backend..."
node src/index.js 