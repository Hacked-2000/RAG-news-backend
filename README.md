# RAG News Chatbot - Backend

A powerful Node.js backend for an AI-powered news chatbot that uses Retrieval-Augmented Generation (RAG) to provide intelligent responses about current events.

## 🚀 Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: Redis (session storage)
- **Vector Database**: Qdrant (news embeddings)
- **AI Models**: 
  - Google Gemini 2.5 Flash (primary LLM)
  - OpenAI GPT-4o-mini (fallback LLM)
- **Real-time**: Socket.io
- **News Sources**: RSS feeds from BBC, TechCrunch, The Verge, etc.

## 📋 Features

- **RAG-powered responses** using news article embeddings
- **Session management** with Redis persistence
- **Real-time chat** via WebSocket connections
- **Smart response detection** for greetings, thanks, etc.
- **Security filtering** against unauthorized requests
- **Multi-source news ingestion** from RSS feeds
- **Automatic session cleanup** with configurable TTL

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 16+ 
- Redis instance (local or cloud)
- Qdrant vector database
- Google Gemini API key
- OpenAI API key (optional, for fallback)

### 1. Clone & Install
```bash
git clone https://github.com/Hacked-2000/RAG-news-backend.git
cd RAG-news-backend
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=4000

# Redis Configuration
REDIS_URL=redis://localhost:6379
# Or use Redis Cloud: redis://username:password@host:port

# Qdrant Vector Database
QDRANT_URL=http://localhost:6333
# Or use Qdrant Cloud: https://your-cluster.qdrant.io
QDRANT_COLLECTION=news_passages
QDRANT_API_KEY=your_qdrant_api_key

# AI Model Configuration
GOOGLE_API_KEY=your_google_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash

OPENAI_API_KEY=your_openai_api_key
OPENAI_EMBED_MODEL=text-embedding-3-small
OPENAI_CHAT_MODEL=gpt-4o-mini

# Session & Cache Configuration
SESSION_TTL=604800  # 7 days in seconds
RETRIEVE_K=5        # Number of articles to retrieve
EMBED_DIM=768       # Embedding dimensions
```

### 3. Initialize News Database
Run the ingestion script to populate your vector database with news articles:

```bash
node src/ingest/ingest.js
```

### 4. Start the Server
```bash
# Development
npm run dev

# Production
npm start
```

The server will start on `http://localhost:4000`

## 📡 API Endpoints

### Chat Management
- `POST /api/chat/session` - Create new chat session
- `GET /api/chat/session/:id/history` - Get chat history
- `POST /api/chat/session/:id/clear` - Clear session history
- `POST /api/chat/message` - Send message and get AI response

### Health Check
- `GET /health` - Server health status

## 🔧 Configuration Options

### Session TTL & Cache Notes

**Session Management:**
- Sessions are stored in Redis with automatic expiration
- Default TTL: 7 days (configurable via `SESSION_TTL`)
- Sessions auto-extend on activity
- Cleanup happens automatically via Redis TTL

**Cache Strategy:**
- Chat history cached in Redis for fast retrieval
- Vector embeddings cached in Qdrant for similarity search
- News articles refreshed via periodic ingestion

**Performance Notes:**
- Redis handles ~100K+ concurrent sessions efficiently
- Qdrant provides sub-100ms vector search
- Session data is lightweight (~1KB per session)

## 🗞️ News Sources

The system ingests news from multiple RSS feeds:
- BBC News
- TechCrunch  
- The Verge
- NPR
- GitHub Blog
- Dev.to
- Times of India
- And more...

## 🛡️ Security Features

- **Input validation** on all endpoints
- **Rate limiting** via session management
- **Unauthorized request filtering** (blocks code/token requests)
- **CORS protection** with configurable origins
- **Environment variable protection** (sensitive data not exposed)

## 🚀 Deployment

### Docker Deployment
```bash
# Build image
docker build -t rag-news-backend .

# Run container
docker run -p 4000:4000 --env-file .env rag-news-backend
```

### Cloud Deployment (Heroku/Railway/Render)
1. Set environment variables in your platform
2. Ensure Redis and Qdrant instances are accessible
3. Run ingestion script after deployment
4. Monitor logs for successful startup

### Environment-Specific Notes
- **Development**: Use local Redis/Qdrant instances
- **Production**: Use managed Redis (Redis Cloud) and Qdrant Cloud
- **Scaling**: Stateless design allows horizontal scaling

## 📊 Monitoring & Logs

The application logs important events:
- Session creation/cleanup
- AI model responses
- Vector search performance
- RSS feed ingestion status
- Error handling and recovery

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Troubleshooting

**Common Issues:**

1. **Redis Connection Failed**
   - Check Redis URL and credentials
   - Ensure Redis server is running
   - Verify network connectivity

2. **Qdrant Connection Issues**
   - Verify Qdrant URL and API key
   - Check if collection exists
   - Run ingestion script to create collection

3. **AI Model Errors**
   - Verify API keys are valid
   - Check API quotas and limits
   - Monitor rate limiting

4. **News Ingestion Fails**
   - Check RSS feed URLs
   - Verify network connectivity
   - Review ingestion logs

For more help, check the logs or open an issue on GitHub.