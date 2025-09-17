// Mock embedding provider for testing when API quotas are exceeded
function generateMockEmbedding(text, dimensions = 768) {
  // Create a simple hash-based embedding for consistent results
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Generate deterministic "embedding" based on text hash
  const embedding = [];
  for (let i = 0; i < dimensions; i++) {
    const seed = hash + i;
    embedding.push((Math.sin(seed) + Math.cos(seed * 0.7)) * 0.5);
  }

  return embedding;
}

async function embedTexts(texts) {
  console.log('Using mock embeddings for testing...');
  const out = [];

  for (const text of texts) {
    const mockEmbedding = generateMockEmbedding(text, 768);
    out.push(mockEmbedding);
  }

  return out;
}

module.exports = { embedTexts };
