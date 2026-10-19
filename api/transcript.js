const ACTOR_ID = process.env.APIFY_ACTOR_ID || 'aolmo/youtube-transcript';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.APIFY_API_TOKEN) return res.status(500).json({ error: 'Transcript service is not configured.' });

  try {
    const { url, language } = req.body || {};
    if (!url) return res.status(400).json({ error: 'A YouTube URL or video ID is required.' });
    const endpoint = `https://api.apify.com/v2/acts/${ACTOR_ID.replace('/', '~')}/run-sync-get-dataset-items?token=${encodeURIComponent(process.env.APIFY_API_TOKEN)}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoUrls: [url], languages: [language || 'en'], includeSegments: true })
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: 'Transcript service could not fetch this video.' });
    const item = Array.isArray(data) ? data[0] : data;
    if (!item) return res.status(404).json({ error: 'No transcript found for this video.' });
    if (item.error) return res.status(422).json({ error: item.error });
    return res.status(200).json({
      title: item.title || 'YouTube transcript',
      transcript: item.transcript || item.text || '',
      segments: item.segments || item.transcriptSegments || item.items || null,
      wordCount: item.wordCount || (item.transcript || item.text || '').trim().split(/\s+/).filter(Boolean).length,
      sourceUrl: item.url || url,
      timestamp: item.timestamp || new Date().toISOString()
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unexpected transcript error.' });
  }
}
