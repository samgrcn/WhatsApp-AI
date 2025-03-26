# WhatsApp Auto-Response System for Fitness Business

An automated messaging system that responds to WhatsApp messages for Oompf! Fitness using DeepSeek's API.

## Features

- Automatically responds to client inquiries on WhatsApp
- Handles booking requests for fitness consultations
- Answers common questions about gym services, pricing, and schedules
- Maintains conversation history for context-aware responses
- Includes a web-based admin dashboard to monitor conversations

## Quick Setup (User-Friendly)

### For Mac:
- Simply double-click the `setup.command` file
- A Terminal window will open and guide you through the installation

### For Linux:
- Right-click on the `install` file and select "Run as Program" or "Execute"
- Or open a terminal and run:
  ```bash
  ./install
  ```

### For Windows:
- Simply double-click `setup.bat`

The installation scripts will:
1. Check if Node.js is installed
2. Install dependencies
3. Create necessary data files
4. Set up the environment file
5. Prompt you for your DeepSeek API key
6. Start the application if you choose

## Manual Setup (Command Line)

1. Install dependencies:
   ```
   npm install
   ```

2. Create the data directory and initial messages file:
   ```
   mkdir -p data
   echo "[]" > data/messages.json
   ```

3. Create a `.env` file based on `.env.example` and add your DeepSeek API key:
   ```
   cp .env.example .env
   ```
   Then edit the `.env` file and add your API key:
   ```
   DEEPSEEK_API_KEY=your_deepseek_api_key_here
   ```

4. Run the application:
   ```
   npm start
   ```

5. Scan the QR code that appears in the terminal with your WhatsApp mobile app:
   - Open WhatsApp on your phone
   - Tap Menu or Settings
   - Select WhatsApp Web
   - Point your phone to the QR code on the screen

## Admin Dashboard

The application includes a web-based admin dashboard that allows you to:

1. View all conversations organized by phone number
2. See the complete message history for each conversation
3. Monitor messages in real-time (auto-refreshes every 30 seconds)

To access the admin dashboard, open your browser and go to:
```
http://localhost:3000
```

## Customization

You can customize the gym information by modifying the system prompt in the `getAIResponse` function in `src/index.js`.

## Adding More Features

To enhance the application, consider adding:

1. Database integration (MongoDB, PostgreSQL) for better message storage
2. Human takeover functionality for complex inquiries
3. Appointment scheduling integration with calendar systems
4. Analytics and reporting features
5. Multi-language support

## Deployment

For production deployment, you can use services like Heroku or AWS:

1. Set the necessary environment variables in your hosting platform
2. The included Procfile will work with Heroku

## Troubleshooting

- If the WhatsApp client disconnects, restart the application
- For DeepSeek API issues, verify your API key is correct
- Check the terminal logs for detailed error information
- If you see any errors about missing data directory or files, make sure to run the setup script or manually create the data directory and messages.json file 