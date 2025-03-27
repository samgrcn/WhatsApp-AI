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

function setupAdminDashboard(port = process.env.PORT || 3000) {
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
  
  // Login page
  app.get('/login', (req, res) => {
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>WhatsApp Bot - Login</title>
      <style>
        :root {
          --primary-color: #00a884;
          --secondary-color: #f0f2f5;
          --text-color: #111b21;
          --light-text: #667781;
          --border-color: #e9edef;
        }
        
        body {
          font-family: Segoe UI, Helvetica Neue, Helvetica, Lucida Grande, Arial, Ubuntu, Cantarell, Fira Sans, sans-serif;
          margin: 0;
          padding: 0;
          background: var(--secondary-color);
          color: var(--text-color);
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
        }
        
        .login-container {
          background: white;
          padding: 2rem;
          border-radius: 8px;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
          width: 100%;
          max-width: 400px;
        }
        
        .header {
          text-align: center;
          margin-bottom: 2rem;
        }
        
        .header h1 {
          color: var(--primary-color);
          font-size: 1.5rem;
          margin: 0;
        }
        
        .form-group {
          margin-bottom: 1rem;
        }
        
        label {
          display: block;
          margin-bottom: 0.5rem;
          color: var(--light-text);
        }
        
        input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          font-size: 1rem;
          box-sizing: border-box;
        }
        
        input:focus {
          outline: none;
          border-color: var(--primary-color);
        }
        
        button {
          width: 100%;
          padding: 0.75rem;
          background: var(--primary-color);
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 1rem;
          cursor: pointer;
          margin-top: 1rem;
        }
        
        button:hover {
          opacity: 0.9;
        }
        
        .error {
          color: #dc3545;
          font-size: 0.875rem;
          margin-top: 0.5rem;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="login-container">
        <div class="header">
          <h1>WhatsApp Bot Admin</h1>
        </div>
        <form action="/login" method="POST">
          <div class="form-group">
            <label for="username">Username</label>
            <input type="text" id="username" name="username" required>
          </div>
          <div class="form-group">
            <label for="password">Password</label>
            <input type="password" id="password" name="password" required>
          </div>
          ${req.query.error ? '<div class="error">Invalid username or password</div>' : ''}
          <button type="submit">Login</button>
        </form>
      </div>
    </body>
    </html>
    `;
    res.send(html);
  });
  
  // Login handler
  app.post('/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      const adminData = JSON.parse(await fs.readFile(ADMIN_FILE, 'utf8'));
      
      if (username === adminData.username && await bcrypt.compare(password, adminData.password)) {
        req.session.authenticated = true;
        req.session.username = username;
        res.redirect('/');
      } else {
        res.redirect('/login?error=1');
      }
    } catch (error) {
      console.error('Login error:', error);
      res.redirect('/login?error=1');
    }
  });
  
  // Logout handler
  app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
  });
  
  // Protect all other routes
  app.use(requireAuth);
  
  // API routes
  app.get('/api/messages', async (req, res) => {
    try {
      const data = await fs.readFile(MESSAGES_FILE, 'utf8');
      const messages = JSON.parse(data);
      res.json(messages);
    } catch (error) {
      console.error('Error reading messages:', error);
      res.status(500).json({ error: 'Failed to read messages' });
    }
  });
  
  app.get('/api/messages/:phoneNumber', async (req, res) => {
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
  
  app.get('/api/prompt', async (req, res) => {
    try {
      const prompt = await getSystemPrompt();
      res.json({ prompt });
    } catch (error) {
      res.status(500).json({ error: 'Failed to read prompt' });
    }
  });
  
  app.post('/api/prompt', async (req, res) => {
    try {
      const { prompt } = req.body;
      await updateSystemPrompt(prompt);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update prompt' });
    }
  });
  
  // Main dashboard page
  app.get('/', async (req, res) => {
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>WhatsApp Bot - Admin Dashboard</title>
      <style>
        :root {
          --primary-color: #00a884;
          --secondary-color: #f0f2f5;
          --text-color: #111b21;
          --light-text: #667781;
          --border-color: #e9edef;
          --message-out: #d9fdd3;
          --message-in: #ffffff;
        }
        
        body {
          font-family: Segoe UI, Helvetica Neue, Helvetica, Lucida Grande, Arial, Ubuntu, Cantarell, Fira Sans, sans-serif;
          margin: 0;
          padding: 0;
          background: var(--secondary-color);
          color: var(--text-color);
        }
        
        .header {
          background: var(--primary-color);
          color: white;
          padding: 10px 20px;
          display: flex;
          align-items: center;
          height: 54px;
        }
        
        .header h1 {
          font-size: 1.2rem;
          margin: 0;
        }
        
        .container {
          display: flex;
          height: calc(100vh - 74px);
        }
        
        .sidebar {
          width: 30%;
          min-width: 300px;
          background: white;
          border-right: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
        }
        
        .search-container {
          padding: 10px;
          background: var(--secondary-color);
        }
        
        .search-bar {
          width: 100%;
          padding: 8px 32px 8px 12px;
          border: none;
          border-radius: 8px;
          background: white;
          font-size: 15px;
        }
        
        .chat-list {
          flex: 1;
          overflow-y: auto;
        }
        
        .chat-item {
          display: flex;
          align-items: center;
          padding: 12px 20px;
          cursor: pointer;
          border-bottom: 1px solid var(--border-color);
          transition: background-color 0.2s;
        }
        
        .chat-item:hover {
          background-color: var(--secondary-color);
        }
        
        .chat-item.active {
          background-color: #f0f2f5;
        }
        
        .avatar {
          width: 49px;
          height: 49px;
          border-radius: 50%;
          background: var(--primary-color);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          margin-right: 15px;
        }
        
        .chat-info {
          flex: 1;
        }
        
        .chat-name {
          font-size: 17px;
          margin-bottom: 4px;
        }
        
        .chat-preview {
          font-size: 14px;
          color: var(--light-text);
        }
        
        .chat-time {
          font-size: 12px;
          color: var(--light-text);
        }
        
        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: #efeae2;
        }
        
        .chat-header {
          background: var(--secondary-color);
          padding: 10px 20px;
          display: flex;
          align-items: center;
          height: 54px;
          border-bottom: 1px solid var(--border-color);
        }
        
        .chat-messages {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
        }
        
        .message {
          max-width: 65%;
          margin: 8px 0;
          padding: 8px 12px;
          border-radius: 8px;
          position: relative;
          font-size: 14.2px;
          line-height: 19px;
        }
        
        .message.incoming {
          background: var(--message-in);
          margin-right: auto;
          border-top-left-radius: 0;
        }
        
        .message.outgoing {
          background: var(--message-out);
          margin-left: auto;
          border-top-right-radius: 0;
        }
        
        .message-time {
          font-size: 11px;
          color: var(--light-text);
          margin-top: 4px;
          text-align: right;
        }
        
        .settings-view {
          padding: 20px;
          background: white;
          display: none;
        }
        
        .settings-view h2 {
          margin-top: 0;
          color: var(--primary-color);
        }
        
        #prompt-area {
          width: 100%;
          min-height: 200px;
          padding: 12px;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          margin: 10px 0;
          font-family: inherit;
        }
        
        #save-btn {
          background: var(--primary-color);
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
        }
        
        #save-btn:hover {
          opacity: 0.9;
        }
        
        .tabs {
          background: var(--primary-color);
          padding: 0 20px;
          display: flex;
          gap: 20px;
        }
        
        .tab {
          color: rgba(255, 255, 255, 0.8);
          padding: 15px 0;
          cursor: pointer;
          position: relative;
          font-size: 15px;
        }
        
        .tab.active {
          color: white;
        }
        
        .tab.active:after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: white;
        }
        
        .user-info {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 1rem;
          color: white;
        }
        
        .logout-btn {
          color: rgba(255, 255, 255, 0.8);
          text-decoration: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          transition: background-color 0.2s;
        }
        
        .logout-btn:hover {
          background-color: rgba(255, 255, 255, 0.1);
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>WhatsApp Bot - Admin Dashboard</h1>
        <div class="user-info">
          <span>Welcome, ${req.session.username}</span>
          <a href="/logout" class="logout-btn">Logout</a>
        </div>
      </div>
      
      <div class="tabs">
        <div class="tab active" onclick="showConversations()">Conversations</div>
        <div class="tab" onclick="showSettings()">Settings</div>
      </div>
      
      <div class="container">
        <div id="conversations-view">
          <div class="sidebar">
            <div class="search-container">
              <input type="text" class="search-bar" id="search-input" placeholder="Search or start new chat" oninput="filterPhoneNumbers()">
            </div>
            <div id="phone-list" class="chat-list">Loading conversations...</div>
          </div>
          
          <div class="main-content">
            <div id="chat-header" class="chat-header">
              Select a conversation
            </div>
            <div id="conversation-container" class="chat-messages"></div>
          </div>
        </div>
        
        <div id="settings-view" class="settings-view">
          <h2>System Prompt</h2>
          <textarea id="prompt-area"></textarea>
          <button id="save-btn" onclick="savePromptSimple()">Save Changes</button>
          <div id="result"></div>
        </div>
      </div>

      <script>
      document.addEventListener('DOMContentLoaded', function() {
        fetchPhoneNumbers();
        document.getElementById('search-input').addEventListener('input', filterPhoneNumbers);
      });
      
      function showConversations() {
        document.getElementById('conversations-view').style.display = 'flex';
        document.getElementById('settings-view').style.display = 'none';
        document.querySelector('.tab:nth-child(1)').classList.add('active');
        document.querySelector('.tab:nth-child(2)').classList.remove('active');
        fetchPhoneNumbers();
      }
      
      function showSettings() {
        document.getElementById('conversations-view').style.display = 'none';
        document.getElementById('settings-view').style.display = 'block';
        document.querySelector('.tab:nth-child(1)').classList.remove('active');
        document.querySelector('.tab:nth-child(2)').classList.add('active');
        
        fetch('/api/prompt')
          .then(response => response.json())
          .then(data => {
            document.getElementById('prompt-area').value = data.prompt;
          })
          .catch(error => {
            console.error('Error loading prompt:', error);
          });
      }
      
      function formatPhoneNumber(phoneNumber) {
        return '+' + phoneNumber.replace('@c.us', '');
      }
      
      function getInitial(phoneNumber) {
        return formatPhoneNumber(phoneNumber).charAt(1);
      }
      
      function filterPhoneNumbers() {
        const searchText = document.getElementById('search-input').value.toLowerCase();
        const chatItems = document.querySelectorAll('.chat-item');
        
        chatItems.forEach(item => {
          const phoneNumber = item.getAttribute('data-phone');
          if (formatPhoneNumber(phoneNumber).toLowerCase().includes(searchText)) {
            item.style.display = 'flex';
          } else {
            item.style.display = 'none';
          }
        });
      }
      
      function fetchPhoneNumbers() {
        fetch('/api/messages')
          .then(response => response.json())
          .then(messages => {
            const phoneGroups = {};
            messages.forEach(msg => {
              if (!phoneGroups[msg.phoneNumber]) {
                phoneGroups[msg.phoneNumber] = [];
              }
              phoneGroups[msg.phoneNumber].push(msg);
            });
            
            const phoneData = Object.keys(phoneGroups).map(phone => {
              const messages = phoneGroups[phone].sort((a, b) => 
                new Date(b.timestamp) - new Date(a.timestamp)
              );
              return {
                phoneNumber: phone,
                lastMessage: messages[0],
                messageCount: messages.length
              };
            });
            
            phoneData.sort((a, b) => 
              new Date(b.lastMessage.timestamp) - new Date(a.lastMessage.timestamp)
            );
            
            const phoneListEl = document.getElementById('phone-list');
            if (phoneData.length > 0) {
              phoneListEl.innerHTML = '';
              
              phoneData.forEach(data => {
                const chatItem = document.createElement('div');
                chatItem.className = 'chat-item';
                chatItem.setAttribute('data-phone', data.phoneNumber);
                
                const time = new Date(data.lastMessage.timestamp);
                const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                const preview = data.lastMessage.message.substring(0, 40) + 
                               (data.lastMessage.message.length > 40 ? '...' : '');
                
                chatItem.innerHTML = 
                  '<div class="avatar">' + getInitial(data.phoneNumber) + '</div>' +
                  '<div class="chat-info">' +
                    '<div class="chat-name">' + formatPhoneNumber(data.phoneNumber) + '</div>' +
                    '<div class="chat-preview">' + preview + '</div>' +
                  '</div>' +
                  '<div class="chat-time">' + timeStr + '</div>';
                
                chatItem.onclick = function() {
                  document.querySelectorAll('.chat-item').forEach(item => {
                    item.classList.remove('active');
                  });
                  chatItem.classList.add('active');
                  loadConversation(data.phoneNumber);
                };
                
                phoneListEl.appendChild(chatItem);
              });
              
              // Load first conversation
              document.querySelector('.chat-item').click();
            } else {
              phoneListEl.innerHTML = '<div style="padding: 20px;">No conversations available yet.</div>';
            }
          })
          .catch(error => {
            console.error('Error fetching conversations:', error);
            document.getElementById('phone-list').innerHTML = 
              '<div style="padding: 20px; color: red;">Error loading conversations: ' + error.message + '</div>';
          });
      }
      
      function loadConversation(phoneNumber) {
        const chatHeader = document.getElementById('chat-header');
        chatHeader.textContent = formatPhoneNumber(phoneNumber);
        
        fetch('/api/messages/' + encodeURIComponent(phoneNumber))
          .then(response => response.json())
          .then(messages => {
            const container = document.getElementById('conversation-container');
            container.innerHTML = '';
            
            messages.forEach(msg => {
              const messageDiv = document.createElement('div');
              messageDiv.className = 'message ' + (msg.isFromUser ? 'incoming' : 'outgoing');
              
              const time = new Date(msg.timestamp).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit'
              });
              
              messageDiv.innerHTML = 
                '<div>' + msg.message + '</div>' +
                '<div class="message-time">' + time + '</div>';
              
              container.appendChild(messageDiv);
            });
            
            container.scrollTop = container.scrollHeight;
          })
          .catch(error => {
            console.error('Error loading conversation:', error);
            document.getElementById('conversation-container').innerHTML = 
              '<div style="padding: 20px; color: red;">Error loading conversation: ' + error.message + '</div>';
          });
      }
      
      function savePromptSimple() {
        const promptText = document.getElementById('prompt-area').value;
        
        fetch('/api/prompt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: promptText })
        })
          .then(response => response.json())
          .then(data => {
            const result = document.getElementById('result');
            result.textContent = 'Changes saved successfully!';
            result.style.color = 'green';
            setTimeout(() => {
              result.textContent = '';
            }, 3000);
          })
          .catch(error => {
            const result = document.getElementById('result');
            result.textContent = 'Error saving changes: ' + error.message;
            result.style.color = 'red';
          });
      }
      </script>
    </body>
    </html>
    `;
    res.send(html);
  });
  
  // Start server
  app.listen(port, () => {
    console.log(`Admin dashboard running at http://localhost:${port}`);
  });
}

module.exports = { setupAdminDashboard }; 