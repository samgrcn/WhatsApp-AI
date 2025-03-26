require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const { addMessage, getConversationHistory } = require('./messageDb');
const { setupAdminDashboard } = require('./admin');

// Initialize WhatsApp client
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: ['--no-sandbox']
  }
});

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
    
    // Get AI response from DeepSeek
    const aiResponse = await getAIResponse(message.body, phoneNumber);
    
    // Store AI response in database
    await addMessage(phoneNumber, aiResponse, false);
    
    // Reply with AI response
    await message.reply(aiResponse);
    console.log(`Replied to ${phoneNumber} with: ${aiResponse.substring(0, 100)}...`);
  } catch (error) {
    // Log error but don't send any message
    console.error('Error processing message:', error);
    // No reply sent when there's an error
  }
});

// Function to get response from DeepSeek API
async function getAIResponse(userMessage, phoneNumber) {
  try {
    // Get conversation history
    const history = await getConversationHistory(phoneNumber, 5);
    
    // Create messages array for the API with conversation history
    const messages = [
      {
        role: 'system',
        content: `You are a human assistant at a gym. Help users with booking fitness consultations and answer questions about gym services, membership, classes, and fitness advice. 
        
        KEY GYM INFORMATION:
        - Gym Name: FitLife Fitness
        - Locations: 
          * Main Location: 123 Fitness Street (Weekdays: 6:00am-10:00pm, Weekends: 8:00am-8:00pm)
          * Secondary Location: 456 Wellness Avenue (Weekdays: 6:30am-9:30pm, Weekends: 8:00am-7:00pm)
        - Services: Personal training, group classes, fitness consultations, nutrition planning
        - Consultation Booking: Book a free fitness consultation via WhatsApp or website
        - Pricing: Personal training ranges from $60 to $120 per hour depending on timing
        - Contact: WhatsApp/Tel: +1 (555) 123-4567, Email: info@fitlifefitness.com
        
        When clients want to book a consultation, ask for their preferred date, time, location, and what specific fitness goals they want to discuss. Let them know a confirmation will be sent shortly.
        
        Be casual, friendly, and use natural language. Use contractions, occasional emojis, and vary your response style to sound like a human gym staff member.`
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
    // Don't return any fallback message, instead throw the error so it's caught in the message handler
    throw error;
  }
}

// Initialize WhatsApp client
client.initialize();

// Start admin dashboard
setupAdminDashboard(); 