const fs = require('fs').promises;
const path = require('path');

// Path to the data directory and config file
const DATA_DIR = path.join(__dirname, '..', 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

// Default system prompt
const DEFAULT_SYSTEM_PROMPT = `You are a helpful fitness assistant for Oompf! Fitness. 
Your role is to assist clients with fitness-related questions, provide workout guidance, 
and help schedule training sessions. You should be friendly, encouraging, and professional.

Please provide information about:
- Available classes and schedules
- Personal training options
- Fitness tips and recommendations
- Nutrition advice
- Membership information

If asked about something outside of fitness or Oompf! services, politely redirect the conversation
back to fitness-related topics.`;

// Ensure the data directory and config file exist
async function ensureConfigFile() {
  try {
    // Create data directory if it doesn't exist
    await fs.mkdir(DATA_DIR, { recursive: true });
    
    // Check if config.json exists, if not create it with default values
    try {
      await fs.access(CONFIG_FILE);
    } catch (error) {
      // File doesn't exist, create it with default system prompt
      const defaultConfig = {
        systemPrompt: DEFAULT_SYSTEM_PROMPT
      };
      
      await fs.writeFile(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2), 'utf8');
      console.log('Created config.json with default system prompt');
    }
  } catch (error) {
    console.error('Error setting up config file:', error);
  }
}

// Get the current system prompt
async function getSystemPrompt() {
  try {
    await ensureConfigFile();
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
    await ensureConfigFile();
    
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