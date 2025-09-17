const { createClient } = require('redis');

// Connect to Redis (cloud or local)
const client = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

// Log any Redis connection issues
client.on('error', err=> console.error('Redis Client Error', err));

module.exports = client;
