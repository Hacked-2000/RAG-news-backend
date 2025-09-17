require('dotenv').config();
const RSSParser = require('rss-parser');
const parser = new RSSParser();
const { embedTexts } = require('../services/embeddingProvider');
const vectorstore = require('../services/vectorStoreQdrant');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Try to get full article text from URL (pretty basic scraping)
async function fetchFullText(url) {
    try {
        const r = await axios.get(url);
        const html = r.data;
        // Just strip HTML tags - not perfect but works for demo
        const text = html.replace(/<[^>]*>/g, ' ');
        return text.slice(0, 5000); // Don't go crazy with length
    } catch (e) { return ''; }
}

// Break long text into smaller chunks for better search
async function chunkText(text, chunkSize = 800) {
    const out = [];
    for (let i = 0; i < text.length; i += chunkSize) {
        out.push(text.slice(i, i + chunkSize));
    }
    return out;
}

async function main() {
    // News sources we'll pull from (most reliable RSS feeds)
    const feeds = [
        // Tech News
        'https://feeds.feedburner.com/TechCrunch',
        'https://www.theverge.com/rss/index.xml',
        'https://github.blog/feed/',
        'https://dev.to/feed',

        // General News  
        'https://feeds.bbci.co.uk/news/rss.xml',
        'https://feeds.npr.org/1001/rss.xml',

        // Sports (reliable feeds)
        'https://feeds.bbci.co.uk/sport/rss.xml',
        'https://www.espn.com/espn/rss/news',

        // Indian Sources
        'https://timesofindia.indiatimes.com/rssfeedstopstories.cms'
    ];

    // Add some manual sports content to ensure we have sports data
    const manualSportsContent = [
        {
            id: uuidv4(),
            text: "Latest football transfer news: Manchester United signs new midfielder for record fee. The Premier League club announced the signing after weeks of negotiations.",
            source: "https://example.com/sports/football",
            title: "Manchester United Signs New Midfielder"
        },
        {
            id: uuidv4(),
            text: "Cricket World Cup 2024: India defeats Australia in thrilling final match. The match went to the last over with India winning by 6 runs.",
            source: "https://example.com/sports/cricket",
            title: "India Wins Cricket World Cup 2024"
        },
        {
            id: uuidv4(),
            text: "NBA Finals 2024: Lakers vs Celtics Game 7 tonight. Both teams are tied 3-3 in the series, making this the deciding game.",
            source: "https://example.com/sports/basketball",
            title: "NBA Finals Game 7 Tonight"
        },
        {
            id: uuidv4(),
            text: "Tennis Grand Slam: Novak Djokovic wins Wimbledon 2024, extending his record to 25 Grand Slam titles. He defeated Carlos Alcaraz in straight sets.",
            source: "https://example.com/sports/tennis",
            title: "Djokovic Wins Wimbledon 2024"
        },
        {
            id: uuidv4(),
            text: "Formula 1 Monaco Grand Prix: Max Verstappen takes pole position for Sunday's race. Red Bull Racing continues to dominate the 2024 season.",
            source: "https://example.com/sports/f1",
            title: "Verstappen Takes Monaco Pole"
        }
    ];

    let passages = [...manualSportsContent]; // Start with guaranteed sports content

    for (const f of feeds) {
        const feed = await parser.parseURL(f).catch(e => { console.error('rss parse failed', e); return null; });
        if (!feed) continue;

        // Process recent articles from this feed
        for (const item of feed.items.slice(0, 25)) {
            const url = item.link;
            const text = item.contentSnippet || (await fetchFullText(url));
            const chunks = await chunkText(text || item.title || '', 800);

            // Each chunk becomes a searchable passage
            chunks.forEach((chunk) => passages.push({
                id: uuidv4(),
                text: chunk,
                source: item.link,
                title: item.title
            }));

            if (passages.length >= 400) break; // Leave room for manual content
        }
        if (passages.length >= 400) break;
    }

    if (passages.length === 0) {
        console.log('No passages found. Add more feeds or check connectivity.');
        return;
    }

    // Turn all text into vectors for similarity search
    const texts = passages.map(p => p.text);
    const vectors = await embedTexts(texts);
    await vectorstore.ensureCollection(vectors[0].length);

    // Package everything up for Qdrant
    const points = passages.map((p, i) => ({
        id: p.id,
        vector: vectors[i],
        payload: { text: p.text, source: p.source, title: p.title }
    }));

    // Upload in batches so we don't overwhelm the database
    const batchSize = 64;
    for (let i = 0; i < points.length; i += batchSize) {
        const batch = points.slice(i, i + batchSize);
        await vectorstore.upsert(batch);
        console.log('Upserted batch', i, batch.length);
    }

    console.log('Ingest complete. Total passages:', points.length);
}

main().catch(e => console.error(e));
