// const { createClient } = require('redis');

// // Connect to Redis (cloud or local)
// const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
// console.log('Redis URL configured:', redisUrl ? 'yes' : 'no');

// const client = createClient({
//   url: redisUrl
// });

// // Log any Redis connection issues
// client.on('error', err=> console.error('Redis Client Error', err));
// client.on('connect', () => console.log('Redis connected successfully'));

// module.exports = client;
const { createClient } = require('redis');

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
console.log('Redis URL configured:', redisUrl ? 'yes' : 'no');
console.log('Redis url: ', redisUrl);

const client = createClient({
  url: redisUrl,
  socket: {
    tls: true,               // ✅ Enables SSL/TLS
    rejectUnauthorized: false // Optional, useful for cloud Redis
  }
});

client.on('error', (err) => console.error('Redis Client Error', err));
client.on('connect', () => console.log('✅ Redis connected successfully'));

(async () => {
  try {
    await client.connect();
  } catch (err) {
    console.error('Failed to connect to Redis:', err);
  }
})();

module.exports = client;
