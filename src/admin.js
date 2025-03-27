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
        .phone-list {
          display: flex;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }
        .phone-item {
          display: flex;
          align-items: center;
          margin: 5px 10px;
          padding: 8px;
          border-radius: 5px;
          cursor: pointer;
          background-color: #f0f0f0;
          transition: all 0.2s;
        }
        .phone-item:hover {
          background-color: #e0e0e0;
        }
        .phone-item.active {
          background-color: #e6f7ff;
          font-weight: bold;
        }
        .profile-pic {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          margin-right: 10px;
          background-color: #ddd;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          color: #555;
        }
        .message-container {
          max-height: 500px;
          overflow-y: auto;
          border: 1px solid #ccc;
          padding: 15px;
          margin-top: 10px;
        }
        .message {
          margin: 10px 0;
          padding: 12px 15px;
          border-radius: 12px;
          max-width: 80%;
          position: relative;
        }
        .user-message {
          background-color: #e6f7ff;
          margin-left: auto;
          text-align: right;
        }
        .assistant-message {
          background-color: #f0f0f0;
        }
        .message-time {
          font-size: 0.8em;
          color: #888;
          margin-top: 5px;
        }
        .search-bar {
          width: 100%;
          padding: 10px;
          margin-bottom: 15px;
          border-radius: 5px;
          border: 1px solid #ccc;
        }
      </style>
    </head>
    <body>
      <h1>WhatsApp Admin - Dashboard</h1>
      
      <div>
        <span class="button active" id="btn-conversations" onclick="showConversations()">Conversations</span>
        <span class="button" id="btn-settings" onclick="showSettings()">Settings</span>
      </div>
      
      <div id="content">
        <div id="conversations-view">
          <input type="text" class="search-bar" id="search-input" placeholder="Search by phone number..." oninput="filterPhoneNumbers()">
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
      document.addEventListener('DOMContentLoaded', function() {
        // Load conversations immediately when the page loads
        fetchPhoneNumbers();
        
        // Setup search functionality
        document.getElementById('search-input').addEventListener('input', filterPhoneNumbers);
      });
      
      function showConversations() {
        document.getElementById('conversations-view').style.display = 'block';
        document.getElementById('settings-view').style.display = 'none';
        document.getElementById('btn-conversations').classList.add('active');
        document.getElementById('btn-settings').classList.remove('active');
        
        // Refresh conversations
        fetchPhoneNumbers();
      }
      
      function showSettings() {
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
      
      // Filter phone numbers based on search input
      function filterPhoneNumbers() {
        const searchText = document.getElementById('search-input').value.toLowerCase();
        const phoneItems = document.querySelectorAll('.phone-item');
        
        phoneItems.forEach(item => {
          const phoneNumber = item.getAttribute('data-phone');
          if (phoneNumber.toLowerCase().includes(searchText)) {
            item.style.display = 'flex';
          } else {
            item.style.display = 'none';
          }
        });
      }
      
      // Format phone number to display format (remove @c.us)
      function formatPhoneNumber(phoneNumber) {
        return '+' + phoneNumber.replace('@c.us', '');
      }
      
      // Get first letter of phone number for avatar placeholder
      function getInitial(phoneNumber) {
        const formattedNumber = formatPhoneNumber(phoneNumber);
        return formattedNumber.charAt(1); // Skip the '+' and get first digit
      }
      
      // Fetch all messages and extract unique phone numbers
      function fetchPhoneNumbers() {
        fetch('/api/messages')
          .then(response => response.json())
          .then(messages => {
            console.log('Fetched messages:', messages.length);
            
            // Group messages by phone number
            const phoneGroups = {};
            messages.forEach(msg => {
              if (!phoneGroups[msg.phoneNumber]) {
                phoneGroups[msg.phoneNumber] = [];
              }
              phoneGroups[msg.phoneNumber].push(msg);
            });
            
            // Get unique phone numbers with their latest message timestamp
            const phoneData = Object.keys(phoneGroups).map(phone => {
              const latestMsg = phoneGroups[phone].sort((a, b) => 
                new Date(b.timestamp) - new Date(a.timestamp)
              )[0];
              
              return {
                phoneNumber: phone,
                latestTimestamp: new Date(latestMsg.timestamp),
                messageCount: phoneGroups[phone].length
              };
            });
            
            // Sort by most recent message timestamp
            phoneData.sort((a, b) => b.latestTimestamp - a.latestTimestamp);
            
            // Display phone number list
            const phoneListEl = document.getElementById('phone-list');
            if (phoneData.length > 0) {
              phoneListEl.innerHTML = '';
              
              phoneData.forEach(data => {
                const phoneEl = document.createElement('div');
                phoneEl.className = 'phone-item';
                phoneEl.setAttribute('data-phone', data.phoneNumber);
                
                // Create avatar placeholder
                const avatar = document.createElement('div');
                avatar.className = 'profile-pic';
                avatar.textContent = getInitial(data.phoneNumber);
                
                // Create phone number text
                const phoneText = document.createElement('span');
                phoneText.textContent = formatPhoneNumber(data.phoneNumber);
                
                phoneEl.appendChild(avatar);
                phoneEl.appendChild(phoneText);
                
                phoneEl.onclick = function() { 
                  // Deactivate all phone items
                  document.querySelectorAll('.phone-item').forEach(item => {
                    item.classList.remove('active');
                  });
                  
                  // Activate this phone item
                  phoneEl.classList.add('active');
                  
                  loadConversation(data.phoneNumber); 
                };
                
                phoneListEl.appendChild(phoneEl);
              });
              
              // Load first conversation
              if (phoneData.length > 0) {
                document.querySelector('.phone-item').classList.add('active');
                loadConversation(phoneData[0].phoneNumber);
              }
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
        
        fetch('/api/messages/' + encodeURIComponent(phoneNumber))
          .then(response => response.json())
          .then(messages => {
            console.log('Fetched messages for conversation:', messages.length);
            
            const container = document.getElementById('conversation-container');
            container.innerHTML = '<h3>Conversation with ' + formatPhoneNumber(phoneNumber) + '</h3>';
            
            const chatDiv = document.createElement('div');
            chatDiv.className = 'message-container';
            
            messages.forEach(msg => {
              const msgDiv = document.createElement('div');
              msgDiv.className = 'message ' + (msg.isFromUser ? 'user-message' : 'assistant-message');
              
              const time = new Date(msg.timestamp).toLocaleString();
              
              msgDiv.innerHTML = '<div>' + msg.message + '</div>' +
                               '<div class="message-time">' + time + '</div>';
              
              chatDiv.appendChild(msgDiv);
            });
            
            container.appendChild(chatDiv);
            
            // Scroll to the bottom of the conversation
            chatDiv.scrollTop = chatDiv.scrollHeight;
          })
          .catch(error => {
            console.error('Error loading conversation:', error);
            document.getElementById('conversation-container').innerHTML = 
              '<p>Error loading conversation: ' + error.message + '</p>';
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