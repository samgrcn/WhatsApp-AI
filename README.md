# WhatsApp Auto-Response System for Fitness Business

An automated messaging system that responds to WhatsApp messages for a gym business using DeepSeek's API.

## Features

- Automatically responds to client inquiries on WhatsApp
- Handles booking requests for fitness consultations
- Answers common questions about gym services, pricing, and schedules
- Maintains conversation history for context-aware responses
- Includes a web-based admin dashboard to monitor conversations

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Copy the `.env.example` file and name it `.env`:
   ```
   cp .env.example .env
   ```

3. Edit the `.env` file to add you DeepSeek API key:
   ```
   DEEPSEEK_API_KEY=your_deepseek_api_key_here
   ```
   - Linux/macOS:
   ```
   nano .env
   ```
   - Windows:
   ```
   notepad .env
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

## Will be added in the near future...

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