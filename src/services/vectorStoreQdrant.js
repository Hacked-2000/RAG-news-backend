const { QdrantClient } = require('@qdrant/js-client-rest');

// Connect to Qdrant vector database
const client = new QdrantClient({
  url: process.env.QDRANT_URL || 'http://localhost:6333',
  apiKey: process.env.QDRANT_API_KEY || undefined
});

const COLLECTION = process.env.QDRANT_COLLECTION || 'news_passages';

// Make sure our collection exists before we try to use it
async function ensureCollection(dim){
  try {
    await client.getCollection(COLLECTION);
  } catch(e){
    // Collection doesn't exist, so create it
    await client.createCollection(COLLECTION, {
      vectors: { size: dim, distance: 'Cosine' }
    });
  }
}

// Add new vectors to the database
async function upsert(points){
  await client.upsert(COLLECTION, { points });
}

// Find similar vectors to the query
async function search(vector, top=5){
  const result = await client.search(COLLECTION, { vector, limit: top });
  return result;
}

module.exports = { ensureCollection, upsert, search };
