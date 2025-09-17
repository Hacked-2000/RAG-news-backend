const express = require('express');
const { v4: uuidv4 } = require('uuid');
const redisClient = require('../utils/redisClient');
const { embedTexts } = require('../services/embeddingProvider');
const vectorstore = require('../services/vectorStoreQdrant');
const { callGemini, callOpenAI } = require('../services/llmProvider');

const router = express.Router();

// Start a new chat session
router.post('/session', async (req, res) => {
  const sessionId = uuidv4();
  // Start with empty message history
  await redisClient.hSet(`session:${sessionId}`, 'messages', JSON.stringify([]));
  // Auto-expire after a week to keep Redis clean
  await redisClient.expire(`session:${sessionId}`, parseInt(process.env.SESSION_TTL || 60 * 60 * 24 * 7));
  res.json({ sessionId });
});

// Get chat history for a session
router.get('/session/:id/history', async (req, res) => {
  const sid = req.params.id;
  const raw = await redisClient.hGet(`session:${sid}`, 'messages');
  const messages = raw ? JSON.parse(raw) : [];
  res.json({ messages });
});

// Wipe a session clean
router.post('/session/:id/clear', async (req, res) => {
  const sid = req.params.id;
  await redisClient.del(`session:${sid}`);
  res.json({ ok: true });
});

// Check if message contains unauthorized/restricted requests
function isUnauthorizedRequest(message) {
  const lowerMsg = message.toLowerCase();

  const restrictedPatterns = [
    // Code/system access requests
    /show me your code/i,
    /give me your code/i,
    /provide.*code/i,
    /source code/i,
    /your implementation/i,
    /how are you built/i,
    /your architecture/i,

    // Token/credential requests
    /api key/i,
    /token/i,
    /password/i,
    /credentials/i,
    /secret/i,
    /private key/i,
    /access key/i,

    // System information requests
    /system prompt/i,
    /your prompt/i,
    /instructions/i,
    /configuration/i,
    /database/i,
    /server/i,
    /backend/i,

    // Bypass attempts
    /ignore.*instructions/i,
    /forget.*rules/i,
    /act as/i,
    /pretend to be/i,
    /jailbreak/i,
    /override/i
  ];

  return restrictedPatterns.some(pattern => pattern.test(lowerMsg));
}

// Check if message is a human-like response (greetings, thanks, etc.)
function isHumanLikeResponse(message) {
  const lowerMsg = message.toLowerCase().trim();

  const patterns = {
    thanks: /^(thank you|thanks|thank u|thanku|thx|ty|appreciate|grateful)$/i,
    greetings: /^(hi|hello|hey|good morning|good afternoon|good evening|howdy)$/i,
    compliments: /^(good|great|excellent|awesome|amazing|perfect|nice|cool|wonderful|fantastic|brilliant)$/i,
    goodbye: /^(bye|goodbye|see you|take care|farewell|cya|later)$/i,
    positive: /^(yes|yeah|yep|ok|okay|sure|alright|sounds good)$/i,
    wow: /^(wow|omg|amazing|incredible|unbelievable)$/i
  };

  for (const [type, pattern] of Object.entries(patterns)) {
    if (pattern.test(lowerMsg)) {
      return type;
    }
  }
  return null;
}

// Generate friendly responses for human-like messages
function generateFriendlyResponse(type, originalMessage) {
  const responses = {
    thanks: [
      "You're very welcome! 😊 Happy to help with any news questions!",
      "My pleasure! 🙌 Feel free to ask about anything else!",
      "Glad I could help! 😄 What else would you like to know?",
      "You're welcome! 💫 Always here for your news updates!"
    ],
    greetings: [
      "Hello there! 👋 Ready to catch up on the latest news?",
      "Hey! 😊 What's happening in the news world today?",
      "Hi! 🌟 Looking for any specific news updates?",
      "Hello! 👋 What news topics interest you today?"
    ],
    compliments: [
      "Thank you so much! 😊 That means a lot! What else can I help you with?",
      "Aww, thanks! 🥰 I'm here whenever you need news updates!",
      "You're too kind! 😄 Ready for more news discussions?",
      "That's so nice of you to say! 🌟 What's next on your mind?"
    ],
    goodbye: [
      "Take care! 👋 Come back anytime for news updates!",
      "Goodbye! 😊 See you next time for more news!",
      "Bye! 🌟 Always here when you need the latest info!",
      "See you later! 👋 Stay informed!"
    ],
    positive: [
      "Great! 😊 What would you like to know about?",
      "Awesome! 🎉 How can I help you today?",
      "Perfect! 😄 What news topics interest you?",
      "Sounds good! 👍 What's on your mind?"
    ],
    wow: [
      "I know, right?! 🤩 The news world is always full of surprises!",
      "Exactly! 😲 There's always something interesting happening!",
      "Right?! 🔥 The world moves fast these days!",
      "I'm glad you find it interesting! 🌟 Want to know more?"
    ]
  };

  const typeResponses = responses[type] || responses.positive;
  return typeResponses[Math.floor(Math.random() * typeResponses.length)];
}

// Main chat endpoint - this is where the magic happens
router.post('/message', async (req, res) => {
  const { sessionId, message } = req.body;
  if (!sessionId || !message) return res.status(400).json({ error: 'sessionId & message required' });

  // Check for unauthorized requests first
  if (isUnauthorizedRequest(message)) {
    const restrictedResponse = "I can't provide that information. 🔒 I'm designed to help with news and current events only. These types of requests are restricted for security reasons. Is there anything about recent news I can help you with instead? 📰";

    // Save both messages to chat history
    const raw = await redisClient.hGet(`session:${sessionId}`, 'messages');
    const hist = raw ? JSON.parse(raw) : [];
    hist.push({ role: 'user', text: message, ts: Date.now() });
    hist.push({ role: 'assistant', text: restrictedResponse, ts: Date.now() });
    await redisClient.hSet(`session:${sessionId}`, 'messages', JSON.stringify(hist));
    await redisClient.expire(`session:${sessionId}`, parseInt(process.env.SESSION_TTL || 60 * 60 * 24 * 7));

    return res.json({ answer: restrictedResponse, sources: [] });
  }

  // Check if this is a human-like response
  const humanResponseType = isHumanLikeResponse(message);
  if (humanResponseType) {
    const friendlyResponse = generateFriendlyResponse(humanResponseType, message);

    // Save both messages to chat history
    const raw = await redisClient.hGet(`session:${sessionId}`, 'messages');
    const hist = raw ? JSON.parse(raw) : [];
    hist.push({ role: 'user', text: message, ts: Date.now() });
    hist.push({ role: 'assistant', text: friendlyResponse, ts: Date.now() });
    await redisClient.hSet(`session:${sessionId}`, 'messages', JSON.stringify(hist));
    await redisClient.expire(`session:${sessionId}`, parseInt(process.env.SESSION_TTL || 60 * 60 * 24 * 7));

    return res.json({ answer: friendlyResponse, sources: [] });
  }

  // Turn the user's question into a vector for searching
  const qVec = (await embedTexts([message]))[0];

  // Find the most relevant news articles
  const k = parseInt(process.env.RETRIEVE_K || 5);
  const hits = await vectorstore.search(qVec, k);

  // Combine all the relevant articles into context
  const contextText = hits.map(h => `SOURCE: ${h.payload.source || 'unknown'}\n${h.payload.text}`).join('\n\n---\n\n');

  // Build the prompt for the AI
  const prompt = `You are a helpful assistant that answers questions about current news and events. Answer the user's question in a natural, conversational way using the news information provided.

Guidelines:
- Be conversational and friendly, like chatting with a friend
- Don't act like a TV news anchor or use broadcast language
- Don't say "Good evening everyone" or "That's all for now" 
- Don't mention being an AI or language model
- Just answer the question directly and naturally
- If the news articles don't contain relevant info, say "I don't have recent information about that topic"
- Keep responses concise and to the point

News Information:
${contextText}

User Question: ${message}

Answer naturally:`;

  // Get response from AI (try Gemini first, fallback to OpenAI)
  let answer;
  try {
    if (process.env.GOOGLE_API_KEY) {
      // Use Gemini if we have the key
      const g = await callGemini(prompt);
      // Gemini response format is a bit weird, so extract the text
      answer = g?.candidates?.[0]?.content?.[0]?.text || JSON.stringify(g);
    } else {
      answer = await callOpenAI(prompt);
    }
  } catch (err) {
    console.error('LLM failed', err);
    return res.status(500).json({ error: 'LLM call failed', detail: err.message });
  }

  // Save both messages to chat history
  const raw = await redisClient.hGet(`session:${sessionId}`, 'messages');
  const hist = raw ? JSON.parse(raw) : [];
  hist.push({ role: 'user', text: message, ts: Date.now() });
  hist.push({ role: 'assistant', text: answer, ts: Date.now() });
  await redisClient.hSet(`session:${sessionId}`, 'messages', JSON.stringify(hist));
  // Keep the session alive for another week
  await redisClient.expire(`session:${sessionId}`, parseInt(process.env.SESSION_TTL || 60 * 60 * 24 * 7));

  res.json({ answer, sources: hits.map(h => h.payload.source) });
});

module.exports = router;
