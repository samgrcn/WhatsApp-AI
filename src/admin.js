const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');

// Path to the data files
const DATA_DIR = path.join(__dirname, '..', 'data');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
const ADMIN_FILE = path.join(DATA_DIR, 'admin.json');

// Import the message functions and config functions
const { addMessage, getConversationHistory, getAllConversations } = require('./messageDb');
const { getSystemPrompt, updateSystemPrompt, DEFAULT_SYSTEM_PROMPT, setSystemPrompt } = require('./config');

// Initialize data directory and file at startup
async function initializeDataStructure() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    
    // Check if messages.json exists, if not create it
    try {
      await fs.access(MESSAGES_FILE);
    } catch (error) {
      await fs.writeFile(MESSAGES_FILE, '[]', 'utf8');
      console.log('Created empty messages.json file for admin dashboard');
    }
    
    // Check if admin.json exists, if not create it
    try {
      await fs.access(ADMIN_FILE);
    } catch (error) {
      const defaultAdmin = {
        username: 'admin',
        password: '$2a$10$XQxBtqxWxP5VFN5YGXEz8.d.RYheskpF6xUe.IhbZZEBZKyGNF.Hy' // Default password: admin123
      };
      await fs.writeFile(ADMIN_FILE, JSON.stringify(defaultAdmin, null, 2), 'utf8');
      console.log('Created admin.json with default credentials');
    }
  } catch (error) {
    console.error('Error setting up data directory:', error);
  }
}

// Authentication middleware
async function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) {
    return next();
  }
  // If it's an API request, return 401
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  // Otherwise redirect to login page
  res.redirect('/login');
}

function setupAdminRoutes(app) {
  // Authentication middleware
  const requireAuth = (req, res, next) => {
    if (req.session.isAuthenticated) {
      next();
    } else {
      res.status(401).json({ error: 'Unauthorized' });
    }
  };

  // Login endpoint
  app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
      // Read admin credentials from file
      const adminCredentials = JSON.parse(await fs.readFile(ADMIN_FILE, 'utf8'));
      const match = await bcrypt.compare(password, adminCredentials.password);
      
      if (username === adminCredentials.username && match) {
        req.session.isAuthenticated = true;
        res.json({ success: true });
      } else {
        res.status(401).json({ error: 'Invalid credentials' });
      }
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Logout endpoint
  app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
  });

  // Get all conversations
  app.get('/api/messages', requireAuth, async (req, res) => {
    try {
      const conversations = await getAllConversations();
      res.json(conversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get conversation history for a specific phone number
  app.get('/api/messages/:phoneNumber', requireAuth, async (req, res) => {
    try {
      const history = await getConversationHistory(req.params.phoneNumber);
      res.json(history);
    } catch (error) {
      console.error('Error fetching conversation history:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get current AI prompt
  app.get('/api/prompt', requireAuth, async (req, res) => {
    try {
      const prompt = await getSystemPrompt();
      res.json({ prompt });
    } catch (error) {
      console.error('Error fetching prompt:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Update AI prompt
  app.post('/api/prompt', requireAuth, async (req, res) => {
    try {
      const { prompt } = req.body;
      await setSystemPrompt(prompt);
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating prompt:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
}

module.exports = { setupAdminRoutes }; 