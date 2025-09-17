require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const chatRoutes = require('./routes/chat');
const redisClient = require('./utils/redisClient');

const app = express();

// Allow frontend to talk to us from any domain
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());

app.use('/api/chat', chatRoutes);

// Simple health check endpoint
app.get('/health', (_, res) => res.json({ ok: true }));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Handle websocket connections for real-time chat
io.on('connection', socket => {
  console.log('socket connected', socket.id);
  socket.on('start_session', ({ sessionId }) => {
    socket.join(sessionId);
  });
  socket.on('disconnect', () => console.log('socket disconnect', socket.id));
});

const PORT = process.env.PORT || 5000;
redisClient.connect().then(() => {
  server.listen(PORT, () => console.log(`Backend listening ${PORT}`));
}).catch(err => {
  console.error('Redis connect failed', err);
  process.exit(1);
});
