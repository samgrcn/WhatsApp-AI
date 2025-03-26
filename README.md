# WhatsApp Auto-Response System for Fitness Business

An automated messaging system that responds to WhatsApp messages for Oompf! Fitness using DeepSeek's API.

## Features

- Automatically responds to client inquiries on WhatsApp
- Handles booking requests for fitness consultations
- Answers common questions about gym services, pricing, and schedules
- Maintains conversation history for context-aware responses
- Includes a web-based admin dashboard to monitor conversations

## Quick Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/samgrcn/WhatsApp-AI
   cd WhatsApp-AI
   ```

2. Run the setup script:
   ```bash
   sh setup.sh
   ```

   This script will:
   - Check if Node.js is installed and install it if necessary.
   - Install all dependencies.
   - Create the necessary data files.
   - Prompt you for your DeepSeek API key.
   - Start the application.

3. Scan the QR code that appears in the terminal with your WhatsApp mobile app:
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