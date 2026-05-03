/* ═══════════════════════════════════════════════════
   REQUEST FORM — WITH IMAGE COMPRESSION
   ═══════════════════════════════════════════════════ */
let reqImages = [];

// Compress image before upload to avoid 413 Payload Too Large
function compressImage(file, maxWidth = 1200, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = Math.round(height * (maxWidth / width));
          width = maxWidth;
        }
        
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Compression failed'));
            return;
          }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
        }, 'image/jpeg', quality);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

function handleReqImages(e) {
  const files = Array.from(e.target.files || []);
  const allowed = 6 - reqImages.length;
  
  files.slice(0, allowed).forEach(async (file) => {
    if (file.size > 5 * 1024 * 1024) { 
      alert('Image too large (max 5MB)'); 
      return; 
    }
    
    try {
      // Compress image to reduce base64 size by ~70%
      const compressedFile = await compressImage(file, 1200, 0.8);
      
      const r = new FileReader();
      r.onload = ev => {
        const dataUrl = ev.target.result;
        const commaIdx = dataUrl.indexOf(',');
        reqImages.push({
          dataUrl,
          base64: dataUrl.substring(commaIdx + 1),
          mime: 'image/jpeg',
          name: file.name.replace(/\.[^.]+$/, '.jpg')
        });
        renderReqPreviews();
      };
      r.readAsDataURL(compressedFile);
    } catch (err) {
      console.error('Compression error:', err);
      alert('Failed to process image. Please try another.');
    }
  });
  e.target.value = '';
}

function renderReqPreviews() {
  const wrap = document.getElementById('req-previews');
  wrap.innerHTML = reqImages.map((img, i) => `
    <div class="req-thumb">
      <img src="${img.dataUrl}" alt="" onclick="reqImages.splice(${i},1);renderReqPreviews()"/>
      <div class="req-thumb-del" onclick="reqImages.splice(${i},1);renderReqPreviews()">✕</div>
    </div>
  `).join('');
}

async function uploadOneImage(imgObj) {
  const res = await fetch(LP_CONFIG.API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'uploadImage',
      data: imgObj.base64,
      mimeType: imgObj.mime,
      filename: imgObj.name
    })
  });
  
  // Handle non-JSON responses gracefully
  const contentType = res.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const text = await res.text();
    throw new Error(`Server error ${res.status}: ${text.substring(0, 100)}`);
  }
  
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.url;
}

function validatePhone(phone) {
  const cleaned = phone.replace(/\s/g, '');
  return /^(06|07)\d{8}$/.test(cleaned);
}

async function submitRequest() {
  const name = document.getElementById('req-name').value.trim();
  const phone = document.getElementById('req-whatsapp').value.trim();
  const email = document.getElementById('req-email').value.trim();
  const msg = document.getElementById('req-message').value.trim();

  if (!name) { showReqError('Please enter your name'); return; }
  if (!phone) { showReqError('Please enter your WhatsApp number'); return; }
  if (!validatePhone(phone)) {
    showReqError('Please enter a valid number (e.g. 0682950546 — starts with 06 or 07, 10 digits)');
    return;
  }

  const btn = document.getElementById('req-submit-btn');
  const resultEl = document.getElementById('req-result');
  btn.disabled = true;
  btn.textContent = reqImages.length > 0 ? 'Uploading photos... 📸' : 'Sending... 💌';
  resultEl.innerHTML = '';

  try {
    /* Step 1: Upload each image individually */
    const uploadedUrls = [];
    for (let i = 0; i < reqImages.length; i++) {
      btn.textContent = `Uploading photo ${i + 1}/${reqImages.length}... 📸`;
      const url = await uploadOneImage(reqImages[i]);
      uploadedUrls.push(url);
    }

    /* Step 2: Submit the request with hosted image URLs */
    btn.textContent = 'Sending request... 💌';
    const res = await fetch(LP_CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'submitRequest',
        name,
        whatsapp: phone,
        email: email || '',
        message: msg || '',
        images: uploadedUrls
      })
    });

    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await res.text();
      throw new Error(`Server error ${res.status}: ${text.substring(0, 100)}`);
    }

    const data = await res.json();
    if (data.error) throw new Error(data.error);

    resultEl.innerHTML = '<span style="color:#4ade80">✅ Request sent! We\'ll create your LP and send the link to your WhatsApp soon 💖</span>';
    btn.textContent = 'Sent! 💖';

    setTimeout(() => {
      document.getElementById('req-name').value = '';
      document.getElementById('req-whatsapp').value = '';
      document.getElementById('req-email').value = '';
      document.getElementById('req-message').value = '';
      reqImages = [];
      renderReqPreviews();
      btn.disabled = false;
      btn.textContent = 'Send Request 💌';
      resultEl.innerHTML = '';
    }, 4000);

  } catch (err) {
    console.error('Submit error:', err);
    resultEl.innerHTML = '<span style="color:#f87171">❌ Error: ' + err.message + '</span>';
    btn.disabled = false;
    btn.textContent = 'Send Request 💌';
  }
}

function showReqError(msg) {
  document.getElementById('req-result').innerHTML = `<span style="color:#f87171">⚠️ ${msg}</span>`;
}