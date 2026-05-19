// api/image.js — Vercel serverless function
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: 'Missing id parameter' });
  }

  const urls = [
    `https://drive.google.com/thumbnail?id=${id}&sz=w1200`,
    `https://lh3.googleusercontent.com/d/${id}=w1200`,
    `https://drive.google.com/uc?export=download&id=${id}`,
  ];

  for (const driveUrl of urls) {
    try {
      const driveRes = await fetch(driveUrl, {
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'image/*,*/*;q=0.8',
        }
      });

      if (!driveRes.ok) continue;

      const contentType = driveRes.headers.get('content-type') || 'image/jpeg';
      if (contentType.includes('text/html')) continue;

      const buffer = await driveRes.arrayBuffer();
      if (buffer.byteLength < 100) continue;

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.status(200).send(Buffer.from(buffer));

    } catch (_) {
      continue;
    }
  }

  return res.status(404).json({ error: 'Image not found', id });
};