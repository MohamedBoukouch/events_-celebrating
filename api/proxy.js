// api/proxy.js — Vercel serverless function (CommonJS)
const GAS_URL = 'https://script.google.com/macros/s/AKfycbznOWf7cnikmA7lyCNLEkLXnhsRDu3nH-7V0lreqlGPZvKiLAXN1XiEVjWzR5Wae5KN/exec';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    let gasRes;

    if (req.method === 'GET') {
      const params = new URLSearchParams();
      Object.entries(req.query || {}).forEach(([k, v]) => params.set(k, String(v)));
      gasRes = await fetch(GAS_URL + '?' + params.toString(), { redirect: 'follow' });

    } else {
      // POST — always send as JSON so large base64 images don't get mangled
      // GAS doPost will read e.postData.contents and JSON.parse it
      const body = req.body || {};
      gasRes = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        redirect: 'follow'
      });
    }

    const text = await gasRes.text();
    try {
      const json = JSON.parse(text);
      return res.status(200).json(json);
    } catch (_) {
      return res.status(502).json({
        error: 'GAS returned HTML instead of JSON. Re-deploy Apps Script as: Execute as ME + Anyone access.',
        preview: text.substring(0, 300)
      });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Proxy error: ' + err.message });
  }
};