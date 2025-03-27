const fs = require('fs').promises;
const path = require('path');

// Path to the data directory and config file
const DATA_DIR = path.join(__dirname, '..', 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'settings.json');

// Initialize a variable to hold the current default prompt
let DEFAULT_SYSTEM_PROMPT = '';

// Load system prompt from settings.json at startup
async function initializePrompt() {
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf8');
    const config = JSON.parse(data);
    if (config.systemPrompt) {
      DEFAULT_SYSTEM_PROMPT = config.systemPrompt;
      console.log('Loaded system prompt from settings.json');
    }
  } catch (error) {
    console.error('Error reading settings.json:', error);
  }
}

// Initialize the prompt at startup
initializePrompt();

// Get the current system prompt
async function getSystemPrompt() {
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf8');
    const config = JSON.parse(data);
    return config.systemPrompt || DEFAULT_SYSTEM_PROMPT;
  } catch (error) {
    console.error('Error reading system prompt:', error);
    return DEFAULT_SYSTEM_PROMPT;
  }
}

// Update the system prompt
async function updateSystemPrompt(newPrompt) {
  try {
    // Read existing config
    let config = {};
    try {
      const data = await fs.readFile(CONFIG_FILE, 'utf8');
      config = JSON.parse(data);
    } catch (error) {
      // If file doesn't exist or is invalid, use empty object
      config = {};
    }
    
    // Update system prompt
    config.systemPrompt = newPrompt;
    
    // Also update the default
    DEFAULT_SYSTEM_PROMPT = newPrompt;
    
    // Save updated config
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
    console.log('System prompt updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating system prompt:', error);
    throw error;
  }
}

module.exports = {
  getSystemPrompt,
  updateSystemPrompt,
  DEFAULT_SYSTEM_PROMPT
}; 