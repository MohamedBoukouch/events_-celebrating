// // api/proxy.js — Vercel serverless function (CommonJS — works on all Vercel plans)

// const GAS_URL = 'https://script.google.com/macros/s/AKfycbznOWf7cnikmA7lyCNLEkLXnhsRDu3nH-7V0lreqlGPZvKiLAXN1XiEVjWzR5Wae5KN/exec';

// module.exports = async function handler(req, res) {
//   res.setHeader('Access-Control-Allow-Origin', '*');
//   res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
//   res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

//   if (req.method === 'OPTIONS') {
//     return res.status(200).end();
//   }

//   try {
//     let gasRes;

//     if (req.method === 'GET') {
//       const params = new URLSearchParams();
//       Object.entries(req.query || {}).forEach(([k, v]) => params.set(k, String(v)));
//       const url = GAS_URL + '?' + params.toString();

//       gasRes = await fetch(url, { redirect: 'follow' });

//     } else {
//       // POST — body already parsed as JSON by Vercel, re-encode as form
//       const body = req.body || {};
//       const formParts = [];
//       Object.entries(body).forEach(([k, v]) => {
//         const val = (v !== null && typeof v === 'object') ? JSON.stringify(v) : String(v == null ? '' : v);
//         formParts.push(encodeURIComponent(k) + '=' + encodeURIComponent(val));
//       });

//       gasRes = await fetch(GAS_URL, {
//         method:   'POST',
//         headers:  { 'Content-Type': 'application/x-www-form-urlencoded' },
//         body:     formParts.join('&'),
//         redirect: 'follow'
//       });
//     }

//     const text = await gasRes.text();

//     // Try to parse as JSON
//     try {
//       const json = JSON.parse(text);
//       return res.status(200).json(json);
//     } catch (_) {
//       // GAS returned HTML — almost always means wrong deployment settings
//       return res.status(502).json({
//         error: 'GAS returned HTML instead of JSON. Re-deploy your Apps Script as: Execute as ME + Anyone.',
//         preview: text.substring(0, 300)
//       });
//     }

//   } catch (err) {
//     return res.status(500).json({ error: 'Proxy internal error: ' + err.message });
//   }
// };

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
      const body = req.body || {};
      const formParts = [];
      Object.entries(body).forEach(([k, v]) => {
        const val = (v !== null && typeof v === 'object') ? JSON.stringify(v) : String(v == null ? '' : v);
        formParts.push(encodeURIComponent(k) + '=' + encodeURIComponent(val));
      });
      gasRes = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formParts.join('&'),
        redirect: 'follow'
      });
    }

    const text = await gasRes.text();

    try {
      // ✅ Rewrite all Google Drive URLs to go through our image proxy
      const json = JSON.parse(text);
      const rewritten = JSON.parse(
        JSON.stringify(json).replace(
          /https:\/\/drive\.google\.com\/(?:uc|thumbnail)\?[^"]*id=([a-zA-Z0-9_-]+)[^"]*/g,
          (match, fileId) => `https://events-celebrating.vercel.app/api/image?id=${fileId}`
        )
      );
      return res.status(200).json(rewritten);
    } catch (_) {
      return res.status(502).json({
        error: 'GAS returned HTML instead of JSON. Re-deploy Apps Script as: Execute as ME + Anyone.',
        preview: text.substring(0, 300)
      });
    }

  } catch (err) {
    return res.status(500).json({ error: 'Proxy error: ' + err.message });
  }
};