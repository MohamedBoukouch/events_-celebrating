// api/proxy.js  — Vercel serverless function
// Proxies all requests to Google Apps Script, adding proper CORS headers.
// Deploy this file to your Vercel project under /api/proxy.js

export default async function handler(req, res) {
  // Allow your Vercel frontend to call this proxy
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const GAS_URL = 'https://script.google.com/macros/s/AKfycbxkFWtau_RwS5xKCdXZ5d6XzNqvnNJnejvOuhXr947xDc0A6XtGDQXLrORjjxjbL940/exec';

  try {
    let gasResponse;

    if (req.method === 'GET') {
      // Forward all query params to GAS
      const params = new URLSearchParams(req.query).toString();
      const url    = params ? `${GAS_URL}?${params}` : GAS_URL;
      gasResponse  = await fetch(url);

    } else if (req.method === 'POST') {
      // Forward POST body as form-encoded to GAS
      const body = req.body || {};
      const formBody = Object.entries(body)
        .map(([k, v]) => {
          const val = typeof v === 'object' ? JSON.stringify(v) : String(v);
          return encodeURIComponent(k) + '=' + encodeURIComponent(val);
        })
        .join('&');

      gasResponse = await fetch(GAS_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    formBody
      });
    }

    const data = await gasResponse.json();
    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}