// api/proxy.js — Vercel serverless function
// Proxies ALL requests to Google Apps Script

const GAS_URL = 'https://script.google.com/macros/s/AKfycbz8cA1_Br60ubNnyfTkbg_yX7w_Vm7hmrcji7xONt4wNsRckHc1-iSOS53QxARh9z2t/exec';

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    let targetUrl = GAS_URL;
    let fetchOptions = {
      method: req.method,
      redirect: 'follow',
      headers: {},
    };

    if (req.method === 'GET') {
      const params = new URLSearchParams();
      Object.entries(req.query || {}).forEach(([k, v]) => {
        if (v !== undefined && v !== null) params.set(k, String(v));
      });
      targetUrl += '?' + params.toString();
    } else {
      fetchOptions.headers['Content-Type'] = 'application/json';
      fetchOptions.body = JSON.stringify(req.body || {});
    }

    console.log('>>> PROXY REQUEST:', req.method, targetUrl);

    const response = await fetch(targetUrl, fetchOptions);
    const text = await response.text();

    console.log('<<< GAS STATUS:', response.status);
    console.log('<<< GAS BODY:', text.substring(0, 300));

    // Check for auth errors
    if (text.toLowerCase().includes('unauthorized') || 
        text.includes('Sign in')) {
      return res.status(403).json({
        error: 'GAS requires authentication. Redeploy with "Anyone" access.'
      });
    }

    // Parse JSON
    try {
      return res.status(200).json(JSON.parse(text));
    } catch {
      return res.status(200).json({
        _note: 'Non-JSON response',
        body: text.substring(0, 500)
      });
    }

  } catch (err) {
    console.error('PROXY ERROR:', err);
    return res.status(500).json({ error: err.message });
  }
};