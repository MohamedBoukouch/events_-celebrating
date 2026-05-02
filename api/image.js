// api/image.js — Vercel serverless function
// Proxies Google Drive images to avoid 403 CORS errors.
// Usage: /api/image?id=DRIVE_FILE_ID

module.exports = async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Missing id parameter' });
  }

  try {
    // Try direct download URL first
    const driveUrl = `https://drive.google.com/uc?export=download&id=${id}&confirm=t`;

    const driveRes = await fetch(driveUrl, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'image/*,*/*'
      }
    });

    if (!driveRes.ok) {
      return res.status(driveRes.status).json({ error: 'Drive fetch failed: ' + driveRes.status });
    }

    const contentType = driveRes.headers.get('content-type') || 'image/jpeg';
    const buffer = await driveRes.arrayBuffer();

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // cache 24h
    return res.status(200).send(Buffer.from(buffer));

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};