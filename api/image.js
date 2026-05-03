// api/image.js — Vercel serverless function
// Proxies Google Drive images to avoid 403 CORS errors.
// Usage: /api/image?id=DRIVE_FILE_ID

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: 'Missing id parameter' });
  }

  // Try thumbnail URL first (works without auth for shared files)
  const urls = [
    `https://drive.google.com/thumbnail?id=${id}&sz=w1000`,
    `https://lh3.googleusercontent.com/d/${id}`,
    `https://drive.google.com/uc?export=download&id=${id}&confirm=t`,
  ];

  for (const driveUrl of urls) {
    try {
      const driveRes = await fetch(driveUrl, {
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Vercel/1.0)',
          'Accept': 'image/*,*/*;q=0.8',
        }
      });

      if (!driveRes.ok) continue;

      const contentType = driveRes.headers.get('content-type') || 'image/jpeg';
      // Only serve actual image responses, not HTML error pages
      if (contentType.includes('text/html')) continue;

      const buffer = await driveRes.arrayBuffer();
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.status(200).send(Buffer.from(buffer));
    } catch (_) {
      continue;
    }
  }

  return res.status(404).json({ error: 'Could not fetch image from Drive' });
};