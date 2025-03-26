const express = require('express');
const fs = require('fs').promises;
const path = require('path');

// Path to the messages file
const DATA_DIR = path.join(__dirname, '..', 'data');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');

function setupAdminDashboard(port = process.env.PORT || 3000) {
  const app = express();
  
  // Set up middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // Serve static files
  app.use(express.static(path.join(__dirname, 'public')));
  
  // View all messages
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
  
  // Get messages by phone number
  app.get('/api/messages/:phoneNumber', async (req, res) => {
    try {
      const data = await fs.readFile(MESSAGES_FILE, 'utf8');
      const messages = JSON.parse(data);
      
      const phoneMessages = messages.filter(
        msg => msg.phoneNumber === req.params.phoneNumber
      ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      
      res.json(phoneMessages);
    } catch (error) {
      console.error('Error reading messages:', error);
      res.status(500).json({ error: 'Failed to read messages' });
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
      <title>FitLife Fitness - WhatsApp Dashboard</title>
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
      </style>
    </head>
    <body>
      <h1>FitLife Fitness - WhatsApp Admin Dashboard</h1>
      <div id="phone-list" class="phone-list">Loading phone numbers...</div>
      <div id="conversation-container"></div>

      <script>
        // Fetch all messages and extract unique phone numbers
        async function fetchPhoneNumbers() {
          const response = await fetch('/api/messages');
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
            phoneEl.onclick = function() { loadConversation(phone); };
            phoneListEl.appendChild(phoneEl);
          });
          
          // Load first conversation if available
          if (phoneNumbers.length > 0) {
            loadConversation(phoneNumbers[0]);
          } else {
            document.getElementById('conversation-container').innerHTML = 
              '<p>No conversations available yet.</p>';
          }
        }
        
        // Load conversation for a specific phone number
        async function loadConversation(phoneNumber) {
          // Update active phone number
          document.querySelectorAll('.phone-number').forEach(function(el) {
            el.classList.remove('active');
            if (el.textContent === phoneNumber) {
              el.classList.add('active');
            }
          });
          
          const response = await fetch('/api/messages/' + phoneNumber);
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
        }
        
        // Initialize
        fetchPhoneNumbers();
        
        // Refresh data every 30 seconds
        setInterval(fetchPhoneNumbers, 30000);
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