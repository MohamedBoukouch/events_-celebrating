// api/proxy.js — DIAGNOSTIC + FIXED VERSION
const GAS_URL = 'https://script.google.com/macros/s/AKfycbylXWtTH_5wn4wbjdiJGvxq1fcko-lE7_UA26lQAop-WmrHtR5cu42Bq6rnmui8XK6v/exec';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    let targetUrl = GAS_URL;
    let fetchOptions = {
      method: req.method,
      redirect: 'manual',
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

    console.log('>>> REQUEST:', req.method, targetUrl);
    console.log('>>> BODY:', JSON.stringify(req.body));

    // Step 1: Initial request
    let response = await fetch(targetUrl, fetchOptions);
    console.log('<<< STEP 1 STATUS:', response.status, 'LOCATION:', response.headers.get('location'));

    // Step 2: Follow redirects manually (GAS does 2-3 redirects)
    let redirectCount = 0;
    const maxRedirects = 5;

    while ((response.status === 302 || response.status === 301 || response.status === 307) && redirectCount < maxRedirects) {
      const location = response.headers.get('location');
      if (!location) break;

      console.log('<<< REDIRECT #' + redirectCount + ' to:', location.substring(0, 100));

      // GAS redirects to script.googleusercontent.com
      response = await fetch(location, {
        method: req.method === 'POST' && redirectCount === 0 ? 'POST' : 'GET',
        redirect: 'manual',
        headers: req.method === 'POST' && redirectCount === 0 ? { 'Content-Type': 'application/json' } : {},
        body: req.method === 'POST' && redirectCount === 0 ? JSON.stringify(req.body || {}) : undefined,
      });

      console.log('<<< AFTER REDIRECT STATUS:', response.status);
      redirectCount++;
    }

    const text = await response.text();
    console.log('<<< FINAL STATUS:', response.status);
    console.log('<<< BODY:', text.substring(0, 500));

    // Check for auth errors in response
    if (text.toLowerCase().includes('unauthorized') || 
        text.includes('Sign in') || 
        text.includes('google.com/signin') ||
        text.includes('Authentication required')) {

      return res.status(403).json({
        error: 'GAS returned Unauthorized',
        diagnosis: 'Your GAS Web App is NOT set to "Anyone" access',
        solution: '1. Open GAS → Deploy → Manage deployments → Click pencil icon → Change "Who has access" to "Anyone" → Deploy',
        solution2: '2. Or create NEW deployment: Deploy → New deployment → Web app → Execute as: Me → Who has access: Anyone',
        gasUrl: GAS_URL,
        responsePreview: text.substring(0, 200)
      });
    }

    // Try to parse as JSON
    try {
      return res.status(200).json(JSON.parse(text));
    } catch (e) {
      return res.status(200).json({
        _note: 'Non-JSON response from GAS',
        body: text.substring(0, 1000),
        status: response.status,
        url: targetUrl
      });
    }

  } catch (err) {
    console.error('PROXY ERROR:', err);
    return res.status(500).json({ 
      error: 'Proxy error: ' + err.message,
      stack: err.stack 
    });
  }
};