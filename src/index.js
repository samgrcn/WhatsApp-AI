require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const { addMessage, getConversationHistory } = require('./messageDb');
const { setupAdminDashboard } = require('./admin');
const { getSystemPrompt } = require('./config');

// Initialize WhatsApp client
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: ['--no-sandbox']
  }
});

// Store pending messages for each user
const pendingMessages = new Map();

// Function to generate a random delay between min and max seconds
function getRandomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min) * 1000;
}

// Function to process messages after the 30-second window
async function processMessages(phoneNumber) {
  const messages = pendingMessages.get(phoneNumber);
  if (!messages || messages.length === 0) return;
  
  try {
    // Combine all messages
    const combinedMessage = messages.map(msg => msg.message).join('\n');
    
    // Add a human-like delay before responding (10-20 seconds)
    const delay = getRandomDelay(10, 20);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Get AI response
    const aiResponse = await getAIResponse(combinedMessage, phoneNumber);
    
    // Store AI response in database
    await addMessage(phoneNumber, aiResponse, false);
    
    // Send the response without reply
    await client.sendMessage(phoneNumber, aiResponse);
    
    // Clear pending messages
    pendingMessages.delete(phoneNumber);
  } catch (error) {
    console.error('Error processing messages:', error);
    pendingMessages.delete(phoneNumber);
  }
}

// Generate QR code for WhatsApp Web
client.on('qr', (qr) => {
  console.log('Scan the QR code below to log in:');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('WhatsApp client is ready!');
});

// Handle incoming messages
client.on('message', async (message) => {
  // Skip messages from groups and from the client itself
  if (message.from.includes('g.us') || message.fromMe) return;
  
  try {
    const phoneNumber = message.from;
    console.log(`New message from ${phoneNumber}: ${message.body}`);
    
    // Store user message in database
    await addMessage(phoneNumber, message.body, true);
    
    // Add message to pending messages
    if (!pendingMessages.has(phoneNumber)) {
      pendingMessages.set(phoneNumber, []);
      // Set timeout to process messages after 30 seconds
      setTimeout(() => processMessages(phoneNumber), 30000);
    }
    
    pendingMessages.get(phoneNumber).push({
      message: message.body,
      timestamp: Date.now(),
      originalMessage: message
    });
    
  } catch (error) {
    console.error('Error handling message:', error);
  }
});

// Function to get response from DeepSeek API
async function getAIResponse(userMessage, phoneNumber) {
  try {
    // Get conversation history
    const history = await getConversationHistory(phoneNumber, 5);
    
    // Get the system prompt from config
    const systemPrompt = await getSystemPrompt();
    
    // Create messages array for the API with conversation history
    const messages = [
      {
        role: 'system',
        content: systemPrompt
      }
    ];
    
    // Add conversation history to messages array
    for (const msg of history) {
      messages.push({
        role: msg.isFromUser ? 'user' : 'assistant',
        content: msg.message
      });
    }
    
    // Add current user message if not already included in history
    if (!history.length || history[history.length - 1].message !== userMessage) {
      messages.push({
        role: 'user',
        content: userMessage
      });
    }
    
    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: 'deepseek-chat',
        messages: messages,
        max_tokens: 500
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
        }
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('DeepSeek API error:', error.response?.data || error.message);
    throw error;
  }
}

// Initialize admin dashboard
setupAdminDashboard(3001);

// Initialize WhatsApp client
client.initialize(); 