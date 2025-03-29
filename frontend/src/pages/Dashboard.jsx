import React, { useState, useEffect } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  TextField,
  Button,
  Paper,
  Divider,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import axios from 'axios';

function Dashboard() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    fetchConversations();
    fetchSystemPrompt();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation);
    }
  }, [selectedConversation]);

  const fetchConversations = async () => {
    try {
      const response = await axios.get('/api/messages');
      setConversations(response.data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  const fetchMessages = async (phoneNumber) => {
    try {
      const response = await axios.get(`/api/messages/${phoneNumber}`);
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const fetchSystemPrompt = async () => {
    try {
      const response = await axios.get('/api/prompt');
      setSystemPrompt(response.data.prompt);
    } catch (error) {
      console.error('Error fetching system prompt:', error);
    }
  };

  const handleSavePrompt = async () => {
    try {
      await axios.post('/api/prompt', { prompt: systemPrompt });
      setShowSettings(false);
    } catch (error) {
      console.error('Error saving system prompt:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    window.location.href = '/login';
  };

  const formatPhoneNumber = (phoneNumber) => {
    return '+' + phoneNumber.replace('@c.us', '');
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <AppBar position="fixed">
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setDrawerOpen(true)}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            WhatsApp AI Admin
          </Typography>
          <IconButton color="inherit" onClick={() => setShowSettings(true)}>
            <SettingsIcon />
          </IconButton>
          <IconButton color="inherit" onClick={handleLogout}>
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <Box sx={{ width: 300, mt: 8 }}>
          <List>
            {conversations.map((conversation) => (
              <ListItem
                button
                key={conversation.phoneNumber}
                selected={selectedConversation === conversation.phoneNumber}
                onClick={() => {
                  setSelectedConversation(conversation.phoneNumber);
                  setDrawerOpen(false);
                }}
              >
                <ListItemAvatar>
                  <Avatar>{formatPhoneNumber(conversation.phoneNumber)[1]}</Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={formatPhoneNumber(conversation.phoneNumber)}
                  secondary={conversation.lastMessage}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          mt: 8,
          backgroundColor: '#f0f2f5',
        }}
      >
        {showSettings ? (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              System Prompt Settings
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={6}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Button variant="contained" onClick={handleSavePrompt}>
              Save Changes
            </Button>
          </Paper>
        ) : selectedConversation ? (
          <Paper sx={{ p: 3, height: 'calc(100vh - 100px)', overflow: 'auto' }}>
            <Typography variant="h6" gutterBottom>
              {formatPhoneNumber(selectedConversation)}
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {messages.map((message, index) => (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  justifyContent: message.isFromUser ? 'flex-start' : 'flex-end',
                  mb: 2,
                }}
              >
                <Paper
                  sx={{
                    p: 2,
                    maxWidth: '70%',
                    backgroundColor: message.isFromUser ? '#fff' : '#d9fdd3',
                  }}
                >
                  <Typography>{message.message}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(message.timestamp).toLocaleString()}
                  </Typography>
                </Paper>
              </Box>
            ))}
          </Paper>
        ) : (
          <Typography variant="h6" color="text.secondary" align="center">
            Select a conversation from the sidebar
          </Typography>
        )}
      </Box>
    </Box>
  );
}

export default Dashboard; 