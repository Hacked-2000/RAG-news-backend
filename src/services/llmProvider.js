const axios = require('axios');
const OpenAI = require('openai');

// Set up OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function callGemini(prompt) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error('NO GOOGLE_API_KEY set');

  // Use Google's Gemini API
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const body = {
    contents: [{
      parts: [{
        text: prompt
      }]
    }],
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 1024,
    }
  };

  try {
    const resp = await axios.post(url, body, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Dig out the actual text from Gemini's nested response
    if (resp.data.candidates && resp.data.candidates[0] && resp.data.candidates[0].content) {
      return resp.data.candidates[0].content.parts[0].text;
    } else {
      throw new Error('Unexpected response format from Gemini API');
    }
  } catch (error) {
    console.error('Gemini API Error:', error.response?.data || error.message);
    throw new Error(`Gemini API call failed: ${error.response?.data?.error?.message || error.message}`);
  }
}

async function callOpenAI(prompt) {
  // Simple OpenAI chat completion
  const r = await openai.chat.completions.create({
    model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 512
  });
  return r.choices[0].message.content;
}

module.exports = { callGemini, callOpenAI };
