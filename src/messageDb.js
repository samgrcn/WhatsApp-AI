const fs = require('fs').promises;
const path = require('path');

// Path to the data directory
const DATA_DIR = path.join(__dirname, '..', 'data');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');

// Ensure the data directory exists
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating data directory:', error);
  }
}

// Load messages from file
async function loadMessages() {
  try {
    await ensureDataDir();
    const data = await fs.readFile(MESSAGES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist or is invalid, return empty array
    return [];
  }
}

// Save messages to file
async function saveMessages(messages) {
  try {
    await ensureDataDir();
    await fs.writeFile(MESSAGES_FILE, JSON.stringify(messages, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving messages:', error);
  }
}

// Add a new message to the database
async function addMessage(phoneNumber, message, isFromUser, timestamp = new Date()) {
  const messages = await loadMessages();
  
  messages.push({
    phoneNumber,
    message,
    isFromUser,
    timestamp: timestamp.toISOString()
  });
  
  await saveMessages(messages);
}

// Get conversation history for a specific phone number
async function getConversationHistory(phoneNumber, limit = 10) {
  const messages = await loadMessages();
  
  return messages
    .filter(msg => msg.phoneNumber === phoneNumber)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit)
    .reverse();
}

module.exports = {
  addMessage,
  getConversationHistory
}; 