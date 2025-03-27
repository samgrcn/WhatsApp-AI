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

// Message queue to track recent messages from each user
const messageQueues = new Map();

// Function to generate a random delay between min and max seconds
function getRandomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min) * 1000;
}

// Function to check if messages are related
function areMessagesRelated(messages) {
  if (messages.length < 2) return true;
  
  const greetings = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening'];
  const firstMsg = messages[0].toLowerCase();
  const secondMsg = messages[1].toLowerCase();
  
  // If first message is a greeting, treat them as related
  if (greetings.some(greeting => firstMsg.includes(greeting))) {
    return true;
  }
  
  // If messages are sent within 30 seconds, likely related
  const timeDiff = messages[1].timestamp - messages[0].timestamp;
  if (timeDiff < 30000) return true;
  
  // If second message starts with conjunction or continuation, likely related
  const continuationWords = ['and', 'also', 'plus', 'additionally', 'moreover', 'i', 'i\'d', 'i\'m', 'i am'];
  if (continuationWords.some(word => secondMsg.startsWith(word))) {
    return true;
  }
  
  return false;
}

// Function to process message queue
async function processMessageQueue(phoneNumber) {
  const queue = messageQueues.get(phoneNumber);
  if (!queue || queue.length === 0) return;
  
  try {
    let messagesToProcess = [queue[0]];
    
    // Check if we should combine with next message
    if (queue.length > 1 && areMessagesRelated([queue[0], queue[1]])) {
      messagesToProcess.push(queue[1]);
      queue.shift(); // Remove first message since we're combining it
    }
    
    // Combine messages if there are multiple
    const combinedMessage = messagesToProcess.map(msg => msg.message).join('\n');
    
    // Add a human-like delay before responding (10-20 seconds)
    const delay = getRandomDelay(10, 20);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Get AI response
    const aiResponse = await getAIResponse(combinedMessage, phoneNumber);
    
    // Store AI response in database
    await addMessage(phoneNumber, aiResponse, false);
    
    // Send the response
    const lastMessage = messagesToProcess[messagesToProcess.length - 1].originalMessage;
    await lastMessage.reply(aiResponse);
    
    // Remove processed messages from queue
    queue.shift();
    
    // If there are more messages in queue, process them after a delay (5-10 seconds)
    if (queue.length > 0) {
      setTimeout(() => processMessageQueue(phoneNumber), getRandomDelay(5, 10));
    } else {
      messageQueues.delete(phoneNumber);
    }
  } catch (error) {
    console.error('Error processing message queue:', error);
    messageQueues.delete(phoneNumber);
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
    
    // Add message to queue
    if (!messageQueues.has(phoneNumber)) {
      messageQueues.set(phoneNumber, []);
      // Start processing queue after a small delay
      setTimeout(() => processMessageQueue(phoneNumber), 1000);
    }
    
    messageQueues.get(phoneNumber).push({
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
setupAdminDashboard();

// Initialize WhatsApp client
client.initialize(); 