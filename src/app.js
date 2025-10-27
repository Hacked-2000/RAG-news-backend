// Load environment variables (works with both local .env and Render environment variables)
require('dotenv').config();

// Log environment variables for debugging (without sensitive values)
console.log('Environment check:');
console.log('- PORT:', process.env.PORT || 'not set');
console.log('- REDIS_URL:', process.env.REDIS_URL ? 'set' : 'not set');
console.log('- QDRANT_URL:', process.env.QDRANT_URL ? 'set' : 'not set');
console.log('- GOOGLE_API_KEY:', process.env.GOOGLE_API_KEY ? 'set' : 'not set');
console.log('- OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'set' : 'not set');
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const chatRoutes = require('./routes/chat');
const redisClient = require('./utils/redisClient');

const app = express();

// Trust proxy for deployment platforms like Render, Heroku, etc.
app.set('trust proxy', 1);

// Comprehensive CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Allow all origins for now (you can restrict this later)
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'Pragma'
  ],
  credentials: false, // Set to true if you need cookies/auth
  optionsSuccessStatus: 200 // For legacy browser support
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Additional headers for better compatibility
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Credentials', 'false');
  res.header('Access-Control-Max-Age', '86400'); // 24 hours
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} from ${req.ip || req.connection.remoteAddress}`);
  next();
});

app.use('/api/chat', chatRoutes);

// Simple health check endpoint
app.get('/health', (_, res) => res.json({ ok: true }));

const server = http.createServer(app);

// Socket.io with comprehensive CORS
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    credentials: false
  },
  allowEIO3: true, // Allow Engine.IO v3 clients
  transports: ['websocket', 'polling'] // Support both transport methods
});

// Handle websocket connections for real-time chat
io.on('connection', socket => {
  console.log('socket connected', socket.id, 'from', socket.handshake.address);

  socket.on('start_session', ({ sessionId }) => {
    console.log('Session started:', sessionId, 'for socket:', socket.id);
    socket.join(sessionId);
  });

  socket.on('disconnect', (reason) => {
    console.log('socket disconnect', socket.id, 'reason:', reason);
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

const PORT = process.env.PORT || 5000;
redisClient.connect().then(() => {
  server.listen(PORT, () => console.log(`Backend listening ${PORT}`));
}).catch(err => {
  console.error('Redis connect failed', err);
  process.exit(1);
});
