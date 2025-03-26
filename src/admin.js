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
      <title>Oompf! Fitness - Debug Dashboard</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .button { 
          display: inline-block;
          padding: 10px 20px; 
          margin: 5px;
          background-color: #f8f8f8; 
          border: 1px solid #ccc;
          cursor: pointer;
        }
        .button.active {
          background-color: #e6f7ff;
          font-weight: bold;
        }
        #content {
          margin-top: 20px;
          padding: 20px;
          border: 1px solid #ccc;
        }
        #prompt-area {
          width: 100%;
          height: 200px;
          margin: 10px 0;
        }
        #save-btn {
          background-color: #4CAF50;
          color: white;
          padding: 10px 20px;
          border: none;
          cursor: pointer;
        }
      </style>
    </head>
    <body>
      <h1>WhatsApp Admin - Debug Mode</h1>
      
      <div>
        <span class="button active" id="btn-conversations" onclick="showConversations()">Conversations</span>
        <span class="button" id="btn-settings" onclick="showSettings()">Settings</span>
      </div>
      
      <div id="content">
        <div id="conversations-view">
          <p>Conversations will appear here.</p>
          <div id="phone-list" class="phone-list">Loading phone numbers...</div>
          <div id="conversation-container"></div>
        </div>
        
        <div id="settings-view" style="display:none;">
          <h2>System Prompt</h2>
          <textarea id="prompt-area"></textarea>
          <div>
            <button id="save-btn" onclick="savePromptSimple()">Save Prompt</button>
          </div>
          <div id="result"></div>
        </div>
      </div>

      <script>
      // Simple functions to test basic functionality
      function showConversations() {
        // alert('Conversations tab clicked');
        document.getElementById('conversations-view').style.display = 'block';
        document.getElementById('settings-view').style.display = 'none';
        document.getElementById('btn-conversations').classList.add('active');
        document.getElementById('btn-settings').classList.remove('active');
        
        // Load conversations when switching to this tab
        fetchPhoneNumbers();
      }
      
      function showSettings() {
        // alert('Settings tab clicked');
        document.getElementById('conversations-view').style.display = 'none';
        document.getElementById('settings-view').style.display = 'block';
        document.getElementById('btn-conversations').classList.remove('active');
        document.getElementById('btn-settings').classList.add('active');
        
        // Load prompt
        fetch('/api/prompt')
          .then(response => response.json())
          .then(data => {
            document.getElementById('prompt-area').value = data.prompt;
          })
          .catch(error => {
            alert('Error loading prompt: ' + error.message);
          });
      }
      
      // Fetch all messages and extract unique phone numbers
      function fetchPhoneNumbers() {
        fetch('/api/messages')
          .then(response => response.json())
          .then(messages => {
            console.log('Fetched messages:', messages.length);
            
            // Get unique phone numbers
            const phoneNumbers = [...new Set(messages.map(msg => msg.phoneNumber))];
            console.log('Unique phone numbers:', phoneNumbers);
            
            // Display phone number list
            const phoneListEl = document.getElementById('phone-list');
            if (phoneNumbers.length > 0) {
              phoneListEl.innerHTML = '<strong>Select a conversation:</strong> ';
              
              phoneNumbers.forEach(phone => {
                const phoneEl = document.createElement('span');
                phoneEl.className = 'phone-number';
                phoneEl.textContent = phone;
                phoneEl.style.margin = '0 10px';
                phoneEl.style.padding = '5px';
                phoneEl.style.cursor = 'pointer';
                phoneEl.style.backgroundColor = '#f0f0f0';
                phoneEl.style.borderRadius = '3px';
                phoneEl.onclick = function() { loadConversation(phone); };
                phoneListEl.appendChild(phoneEl);
              });
              
              // Load first conversation
              loadConversation(phoneNumbers[0]);
            } else {
              phoneListEl.innerHTML = '<p>No conversations available yet.</p>';
            }
          })
          .catch(error => {
            console.error('Error fetching phone numbers:', error);
            document.getElementById('phone-list').innerHTML = 
              '<strong>Error loading conversations:</strong> ' + error.message;
          });
      }
      
      // Load conversation for a specific phone number
      function loadConversation(phoneNumber) {
        console.log('Loading conversation for:', phoneNumber);
        
        // Update active phone number highlighting
        document.querySelectorAll('.phone-number').forEach(el => {
          if (el.textContent === phoneNumber) {
            el.style.fontWeight = 'bold';
            el.style.backgroundColor = '#e6f7ff';
          } else {
            el.style.fontWeight = 'normal';
            el.style.backgroundColor = '#f0f0f0';
          }
        });
        
        fetch('/api/messages/' + encodeURIComponent(phoneNumber))
          .then(response => response.json())
          .then(messages => {
            console.log('Fetched messages for conversation:', messages.length);
            
            const container = document.getElementById('conversation-container');
            container.innerHTML = '<h3>Conversation with ' + phoneNumber + '</h3>';
            
            const chatDiv = document.createElement('div');
            chatDiv.style.maxHeight = '400px';
            chatDiv.style.overflowY = 'auto';
            chatDiv.style.border = '1px solid #ccc';
            chatDiv.style.padding = '10px';
            chatDiv.style.marginTop = '10px';
            
            messages.forEach(msg => {
              const msgDiv = document.createElement('div');
              msgDiv.style.margin = '10px 0';
              msgDiv.style.padding = '8px 15px';
              msgDiv.style.borderRadius = '10px';
              msgDiv.style.maxWidth = '80%';
              
              if (msg.isFromUser) {
                msgDiv.style.marginLeft = 'auto';
                msgDiv.style.backgroundColor = '#e6f7ff';
                msgDiv.style.textAlign = 'right';
              } else {
                msgDiv.style.backgroundColor = '#f0f0f0';
              }
              
              const time = new Date(msg.timestamp).toLocaleString();
              msgDiv.innerHTML = '<div>' + msg.message + '</div>' +
                               '<small style="color:#888">' + time + '</small>';
              
              chatDiv.appendChild(msgDiv);
            });
            
            container.appendChild(chatDiv);
          })
          .catch(error => {
            console.error('Error loading conversation:', error);
            document.getElementById('conversation-container').innerHTML = 
              '<p>Error loading conversation: ' + error.message + '</p>';
          });
      }
      
      function savePromptSimple() {
        const promptText = document.getElementById('prompt-area').value;
        alert('About to save prompt: ' + promptText.substring(0, 20) + '...');
        
        fetch('/api/prompt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: promptText })
        })
          .then(response => response.json())
          .then(data => {
            document.getElementById('result').textContent = 'Saved successfully!';
            setTimeout(() => {
              document.getElementById('result').textContent = '';
            }, 3000);
          })
          .catch(error => {
            alert('Error saving: ' + error.message);
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