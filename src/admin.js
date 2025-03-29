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
const { addMessage, getConversationHistory } = require('./messageDb');
const { getSystemPrompt, updateSystemPrompt, DEFAULT_SYSTEM_PROMPT } = require('./config');

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

function setupAdminDashboard(port = process.env.PORT || 3001) {
  const app = express();
  
  // Initialize data structures immediately
  initializeDataStructure();
  
  // Set up middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));
  
  // API routes
  app.post('/api/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      const adminData = JSON.parse(await fs.readFile(ADMIN_FILE, 'utf8'));
      
      if (username === adminData.username && await bcrypt.compare(password, adminData.password)) {
        req.session.authenticated = true;
        req.session.username = username;
        res.json({ success: true });
      } else {
        res.status(401).json({ error: 'Invalid credentials' });
      }
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  app.get('/api/messages', requireAuth, async (req, res) => {
    try {
      const data = await fs.readFile(MESSAGES_FILE, 'utf8');
      const messages = JSON.parse(data);
      
      // Group messages by phone number and get the latest message for each
      const conversations = {};
      messages.forEach(msg => {
        if (!conversations[msg.phoneNumber]) {
          conversations[msg.phoneNumber] = {
            phoneNumber: msg.phoneNumber,
            lastMessage: msg.message,
            timestamp: msg.timestamp
          };
        } else if (new Date(msg.timestamp) > new Date(conversations[msg.phoneNumber].timestamp)) {
          conversations[msg.phoneNumber].lastMessage = msg.message;
          conversations[msg.phoneNumber].timestamp = msg.timestamp;
        }
      });
      
      res.json(Object.values(conversations));
    } catch (error) {
      console.error('Error reading messages:', error);
      res.status(500).json({ error: 'Failed to read messages' });
    }
  });
  
  app.get('/api/messages/:phoneNumber', requireAuth, async (req, res) => {
    try {
      const data = await fs.readFile(MESSAGES_FILE, 'utf8');
      const messages = JSON.parse(data);
      
      const phoneNumber = req.params.phoneNumber;
      const phoneMessages = messages
        .filter(msg => msg.phoneNumber === phoneNumber)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      
      res.json(phoneMessages);
    } catch (error) {
      console.error('Error reading messages:', error);
      res.status(500).json({ error: 'Failed to read messages' });
    }
  });
  
  app.get('/api/prompt', requireAuth, async (req, res) => {
    try {
      const prompt = await getSystemPrompt();
      res.json({ prompt });
    } catch (error) {
      res.status(500).json({ error: 'Failed to read prompt' });
    }
  });
  
  app.post('/api/prompt', requireAuth, async (req, res) => {
    try {
      const { prompt } = req.body;
      await updateSystemPrompt(prompt);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update prompt' });
    }
  });
  
  // Serve static files from the React app in production
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '..', 'frontend', 'dist')));
    
    // Handle React Router by serving index.html for all non-API routes
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api/')) {
        res.sendFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'));
      }
    });
  }
  
  // Start server
  app.listen(port, () => {
    console.log(`Admin dashboard running at http://localhost:${port}`);
  });
}

module.exports = { setupAdminDashboard }; 