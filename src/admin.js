const express = require('express');
const fs = require('fs').promises;
const path = require('path');

// Path to the messages file
const DATA_DIR = path.join(__dirname, '..', 'data');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');

// Import the message functions and config functions
const { addMessage, getConversationHistory } = require('./messageDb');
const { getSystemPrompt, updateSystemPrompt, DEFAULT_SYSTEM_PROMPT } = require('./config');

// Initialize data directory and file at startup
async function initializeDataStructure() {
  try {
    // Create data directory if it doesn't exist
    await fs.mkdir(DATA_DIR, { recursive: true });
    
    // Check if messages.json exists, if not create it with empty array
    try {
      await fs.access(MESSAGES_FILE);
    } catch (error) {
      // File doesn't exist, create it with empty array
      await fs.writeFile(MESSAGES_FILE, '[]', 'utf8');
      console.log('Created empty messages.json file for admin dashboard');
    }
  } catch (error) {
    console.error('Error setting up data directory:', error);
  }
}

function setupAdminDashboard(port = process.env.PORT || 3000) {
  const app = express();
  
  // Initialize data structures immediately
  initializeDataStructure();
  
  // Set up middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // Serve static files
  app.use(express.static(path.join(__dirname, 'public')));
  
  // View all messages
  app.get('/api/messages', async (req, res) => {
    try {
      await initializeDataStructure(); // Ensure directory and file exist
      const data = await fs.readFile(MESSAGES_FILE, 'utf8');
      const messages = JSON.parse(data);
      
      // Log the number of messages found for debugging
      console.log(`GET /api/messages: Returned ${messages.length} messages`);
      
      res.json(messages);
    } catch (error) {
      console.error('Error reading messages:', error);
      res.status(500).json({ error: 'Failed to read messages' });
    }
  });
  
  // Get messages by phone number
  app.get('/api/messages/:phoneNumber', async (req, res) => {
    try {
      await initializeDataStructure(); // Ensure directory and file exist
      const data = await fs.readFile(MESSAGES_FILE, 'utf8');
      const messages = JSON.parse(data);
      
      const phoneNumber = req.params.phoneNumber;
      const phoneMessages = messages.filter(
        msg => msg.phoneNumber === phoneNumber
      ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      
      // Log the number of messages found for debugging
      console.log(`GET /api/messages/${phoneNumber}: Returned ${phoneMessages.length} messages`);
      
      res.json(phoneMessages);
    } catch (error) {
      console.error('Error reading messages:', error);
      res.status(500).json({ error: 'Failed to read messages' });
    }
  });
  
  // Get current system prompt
  app.get('/api/prompt', async (req, res) => {
    try {
      const prompt = await getSystemPrompt();
      console.log('GET /api/prompt: Returned system prompt');
      res.json({ prompt });
    } catch (error) {
      console.error('Error getting system prompt:', error);
      res.status(500).json({ error: 'Failed to get system prompt' });
    }
  });
  
  // Update system prompt
  app.post('/api/prompt', async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt) {
        console.error('POST /api/prompt: Missing prompt in request body');
        return res.status(400).json({ error: 'Prompt is required' });
      }
      
      await updateSystemPrompt(prompt);
      console.log('POST /api/prompt: Successfully updated system prompt');
      res.json({ success: true, message: 'Prompt updated successfully' });
    } catch (error) {
      console.error('Error updating system prompt:', error);
      res.status(500).json({ error: 'Failed to update system prompt' });
    }
  });
  
  // Create HTML for admin dashboard
  app.get('/', async (req, res) => {
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Oompf! Fitness - WhatsApp Dashboard</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
        h1 { color: #0a8d48; }
        .conversation { margin-bottom: 20px; border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
        .message { margin: 10px 0; padding: 8px 15px; border-radius: 15px; max-width: 80%; }
        .user { background-color: #e6f7ff; margin-left: auto; text-align: right; }
        .assistant { background-color: #f0f0f0; }
        .phone-list { margin-bottom: 20px; }
        .phone-number { cursor: pointer; color: #0066cc; margin-right: 10px; padding: 5px; }
        .phone-number:hover { text-decoration: underline; }
        .active { font-weight: bold; background-color: #e6f7ff; border-radius: 5px; }
        .tabs { display: flex; margin-bottom: 20px; }
        .tab { cursor: pointer; padding: 10px 20px; background-color: #f0f0f0; margin-right: 5px; border-radius: 5px 5px 0 0; }
        .tab.active { background-color: #e6f7ff; font-weight: bold; }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        #prompt-editor { width: 100%; height: 300px; padding: 10px; margin-bottom: 10px; font-family: monospace; }
        .button { padding: 10px 20px; background-color: #0a8d48; color: white; border: none; border-radius: 5px; cursor: pointer; }
        .notification { padding: 10px; margin: 10px 0; border-radius: 5px; display: none; }
        .success { background-color: #d4edda; color: #155724; }
        .error { background-color: #f8d7da; color: #721c24; }
      </style>
    </head>
    <body onload="initializeDashboard()">
      <h1>Oompf! Fitness - WhatsApp Admin Dashboard</h1>
      
      <div class="tabs">
        <div class="tab active" id="tab-conversations" onclick="switchTab('conversations')">Conversations</div>
        <div class="tab" id="tab-settings" onclick="switchTab('settings')">Settings</div>
      </div>
      
      <div id="conversations-tab" class="tab-content active">
        <div id="phone-list" class="phone-list">Loading phone numbers...</div>
        <div id="conversation-container"></div>
      </div>
      
      <div id="settings-tab" class="tab-content">
        <h2>System Prompt Settings</h2>
        <p>Customize the system prompt that determines how the AI assistant responds to users.</p>
        <textarea id="prompt-editor"></textarea>
        <div>
          <button class="button" onclick="savePrompt()">Save Prompt</button>
          <button class="button" onclick="resetPrompt()" style="background-color: #6c757d;">Reset to Default</button>
        </div>
        <div id="notification" class="notification"></div>
      </div>

      <script>
        // Initialize dashboard
        function initializeDashboard() {
          // Initially load phone numbers
          fetchPhoneNumbers();
          
          // Add event listeners for tab buttons explicitly
          document.getElementById('tab-conversations').addEventListener('click', function() {
            switchTab('conversations');
          });
          
          document.getElementById('tab-settings').addEventListener('click', function() {
            switchTab('settings');
          });
          
          // Set up refresh interval
          setInterval(fetchPhoneNumbers, 30000);
        }
        
        // Tab switching functionality
        function switchTab(tabName) {
          console.log('Switching to tab:', tabName);
          
          // Hide all tab contents
          document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
            tab.style.display = 'none';
          });
          
          // Show selected tab content
          const tabContent = document.getElementById(tabName + '-tab');
          tabContent.classList.add('active');
          tabContent.style.display = 'block';
          
          // Update tab styling
          document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
          });
          
          document.getElementById('tab-' + tabName).classList.add('active');
          
          // Load prompt data when switching to settings tab
          if (tabName === 'settings') {
            loadPrompt();
          }
        }
        
        // Fetch all messages and extract unique phone numbers
        async function fetchPhoneNumbers() {
          try {
            const response = await fetch('/api/messages');
            if (!response.ok) {
              throw new Error('Failed to fetch messages: ' + response.statusText);
            }
            
            const messages = await response.json();
            
            // Get unique phone numbers
            const phoneNumbers = [...new Set(messages.map(msg => msg.phoneNumber))];
            
            // Display phone number list
            const phoneListEl = document.getElementById('phone-list');
            phoneListEl.innerHTML = '<strong>Select a conversation:</strong> ';
            
            phoneNumbers.forEach(phone => {
              const phoneEl = document.createElement('span');
              phoneEl.className = 'phone-number';
              phoneEl.textContent = phone;
              phoneEl.addEventListener('click', function() { 
                loadConversation(phone); 
              });
              phoneListEl.appendChild(phoneEl);
            });
            
            // Load first conversation if available
            if (phoneNumbers.length > 0) {
              loadConversation(phoneNumbers[0]);
            } else {
              document.getElementById('conversation-container').innerHTML = 
                '<p>No conversations available yet.</p>';
            }
          } catch (error) {
            console.error('Error fetching phone numbers:', error);
            document.getElementById('phone-list').innerHTML = 
              '<strong>Error loading conversations:</strong> ' + error.message;
          }
        }
        
        // Load conversation for a specific phone number
        async function loadConversation(phoneNumber) {
          try {
            // Update active phone number
            document.querySelectorAll('.phone-number').forEach(function(el) {
              el.classList.remove('active');
              if (el.textContent === phoneNumber) {
                el.classList.add('active');
              }
            });
            
            const response = await fetch('/api/messages/' + encodeURIComponent(phoneNumber));
            if (!response.ok) {
              throw new Error('Failed to fetch conversation: ' + response.statusText);
            }
            
            const messages = await response.json();
            
            const container = document.getElementById('conversation-container');
            container.innerHTML = '<h2>Conversation with ' + phoneNumber + '</h2>' +
                                 '<div id="messages" class="conversation"></div>';
            
            const messagesEl = document.getElementById('messages');
            
            messages.forEach(function(msg) {
              const messageEl = document.createElement('div');
              messageEl.className = 'message ' + (msg.isFromUser ? 'user' : 'assistant');
              
              const time = new Date(msg.timestamp).toLocaleString();
              messageEl.innerHTML = '<div>' + msg.message + '</div>' +
                                   '<small>' + time + '</small>';
              
              messagesEl.appendChild(messageEl);
            });
          } catch (error) {
            console.error('Error loading conversation:', error);
            document.getElementById('conversation-container').innerHTML = 
              '<p>Error loading conversation: ' + error.message + '</p>';
          }
        }
        
        // Load the current system prompt
        async function loadPrompt() {
          try {
            const response = await fetch('/api/prompt');
            if (!response.ok) {
              throw new Error('Failed to fetch prompt: ' + response.statusText);
            }
            
            const data = await response.json();
            document.getElementById('prompt-editor').value = data.prompt;
          } catch (error) {
            console.error('Error loading prompt:', error);
            showNotification('Error loading prompt: ' + error.message, 'error');
          }
        }
        
        // Save the system prompt
        async function savePrompt() {
          try {
            const prompt = document.getElementById('prompt-editor').value;
            const response = await fetch('/api/prompt', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ prompt })
            });
            
            if (!response.ok) {
              throw new Error('Failed to save prompt: ' + response.statusText);
            }
            
            const data = await response.json();
            if (data.success) {
              showNotification('Prompt saved successfully!', 'success');
            } else {
              showNotification('Error: ' + data.error, 'error');
            }
          } catch (error) {
            console.error('Error saving prompt:', error);
            showNotification('Error saving prompt: ' + error.message, 'error');
          }
        }
        
        // Reset prompt to default
        async function resetPrompt() {
          if (confirm('Are you sure you want to reset the prompt to default?')) {
            try {
              const response = await fetch('/api/prompt', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ prompt: '${DEFAULT_SYSTEM_PROMPT.replace(/`/g, '\\`').replace(/\$/g, '\\$')}' })
              });
              
              if (!response.ok) {
                throw new Error('Failed to reset prompt: ' + response.statusText);
              }
              
              const data = await response.json();
              if (data.success) {
                document.getElementById('prompt-editor').value = '${DEFAULT_SYSTEM_PROMPT.replace(/`/g, '\\`').replace(/\$/g, '\\$')}';
                showNotification('Prompt reset to default!', 'success');
              } else {
                showNotification('Error: ' + (data.error || 'Unknown error'), 'error');
              }
            } catch (error) {
              console.error('Error resetting prompt:', error);
              showNotification('Error resetting prompt: ' + error.message, 'error');
            }
          }
        }
        
        // Show notification
        function showNotification(message, type) {
          const notification = document.getElementById('notification');
          notification.textContent = message;
          notification.className = 'notification ' + type;
          notification.style.display = 'block';
          
          // Auto-hide after 5 seconds
          setTimeout(() => {
            notification.style.display = 'none';
          }, 5000);
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