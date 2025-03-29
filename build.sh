#!/bin/bash

# Build frontend
echo "Building frontend..."
cd frontend
npm run build
cd ..

# Start backend
echo "Starting backend..."
node src/index.js 