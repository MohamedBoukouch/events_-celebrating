// =====================================================
//  BIRTHDAY LP — lp/app.js  (FULLY FIXED v4)
//
//  THE BUG: Images were uploaded to Drive correctly,
//  but submitRequest() was called WITHOUT the returned
//  URLs — so images column was always [].
//
//  THE FIX: uploadOneReqImage() runs for each file,
//  returns the Drive proxy URL, then submitRequest
//  is called with the complete imageUrls[] array.
// =====================================================

const API_URL = 'https://events-celebrating.vercel.app/api/proxy';

/* ── API helpers ──────────────────────────────────── */
async function apiGet(params) {
  const url = new URL(API_URL);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  return res.json();
}

async function apiPost(body) {
  const res = await fetch(API_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body)
  });
  return res.json();
}

/* ── Request form — image state ───────────────────── */
let reqImages = []; // [{ base64, mime, name, preview }]

function handleReqImages(e) {
  const files   = Array.from(e.target.files);
  const allowed = 6 - reqImages.length;
  files.slice(0, allowed).forEach(file => {
    if (file.size > 5 * 1024 * 1024) {
      showReqResult('Image too large (max 5MB): ' + file.name, 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      reqImages.push({
        base64:  ev.target.result.split(',')[1],
        mime:    file.type,
        name:    file.name,
        preview: ev.target.result
      });
      renderReqPreviews();
    };
    reader.readAsDataURL(file);
  });
  e.target.value = '';
}

function renderReqPreviews() {
  const wrap = document.getElementById('req-previews');
  if (!wrap) return;
  wrap.innerHTML = '';
  reqImages.forEach((img, i) => {
    const div = document.createElement('div');
    div.className = 'req-thumb';
    div.innerHTML = `<img src="${img.preview}" alt=""/>
      <button onclick="removeReqImage(${i})">✕</button>`;
    wrap.appendChild(div);
  });
}

function removeReqImage(idx) {
  reqImages.splice(idx, 1);
  renderReqPreviews();
}

/* ── Upload ONE image → returns proxied Drive URL ─── */
async function uploadOneReqImage(img) {
  const res = await apiPost({
    action:   'uploadRequestImage',
    data:     img.base64,
    mimeType: img.mime,
    filename: img.name
  });
  if (res.error) throw new Error('Upload failed: ' + res.error);
  if (!res.url)  throw new Error('No URL returned from upload');
  return res.url;
}

/* ── SUBMIT REQUEST ─────────────────────────────────
   FLOW:
   1. Upload each image → collect Drive URLs
   2. POST submitRequest with those URLs in body.images
   This is the ONLY correct order. Do not merge steps.
   ─────────────────────────────────────────────────── */
async function submitRequest() {
  const name     = (document.getElementById('req-name')     || {value:''}).value.trim();
  const whatsapp = (document.getElementById('req-whatsapp') || {value:''}).value.trim();
  const message  = (document.getElementById('req-message')  || {value:''}).value.trim();
  const email    = (document.getElementById('req-email')    || {value:''}).value.trim();

  if (!name)     { showReqResult('Please enter your name',     'error'); return; }
  if (!whatsapp) { showReqResult('Please enter your WhatsApp', 'error'); return; }

  const btn = document.getElementById('req-submit-btn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Please wait…'; }

  try {
    /* ── STEP 1: upload images, collect URLs ── */
    const imageUrls = [];

    for (let i = 0; i < reqImages.length; i++) {
      if (btn) btn.textContent = `⏳ Uploading photo ${i + 1} / ${reqImages.length}…`;
      const url = await uploadOneReqImage(reqImages[i]);
      imageUrls.push(url);
      console.log('[LP] image', i + 1, 'uploaded →', url);
    }

    /* ── STEP 2: submit with URLs ── */
    if (btn) btn.textContent = '⏳ Sending request…';

    console.log('[LP] submitting request, images:', imageUrls);

    const res = await apiPost({
      action:   'submitRequest',
      name,
      whatsapp,
      message,
      email,
      images:   imageUrls   // ← real array of Drive proxy URLs
    });

    console.log('[LP] submitRequest response:', res);

    if (res.error) throw new Error(res.error);

    showReqResult('✅ Request sent! We will contact you on WhatsApp soon 🎉', 'success');

    // reset
    ['req-name','req-whatsapp','req-message','req-email'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    reqImages = [];
    renderReqPreviews();

  } catch (err) {
    console.error('[LP] submitRequest error:', err);
    showReqResult('Error: ' + err.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Send Request 💌'; }
  }
}

function showReqResult(msg, type) {
  const el = document.getElementById('req-result');
  if (!el) return;
  el.textContent = msg;
  el.style.color = type === 'error' ? '#ff4d4d' : '#4dff91';
}

/* ════════════════════════════════════════════════════
   LP DISPLAY  (when ?id= is present)
   ════════════════════════════════════════════════════ */

window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const lpId   = params.get('id');
  if (lpId) {
    document.getElementById('lp-screen').style.display      = 'block';
    document.getElementById('request-screen').style.display = 'none';
    loadLP(lpId);
  } else {
    document.getElementById('request-screen').style.display = 'block';
    document.getElementById('lp-screen').style.display      = 'none';
  }
});

async function loadLP(id) {
  try {
    const data = await apiGet({ action: 'getLP', id });
    if (data.error || !data.data) { showErrorScreen(); return; }
    initLP(data.data);
  } catch (err) {
    showErrorScreen();
  }
}

function showErrorScreen() {
  const lp  = document.getElementById('lp-screen');
  const err = document.getElementById('error-screen');
  if (lp)  lp.style.display  = 'none';
  if (err) err.style.display = 'flex';
}

function initLP(lp) {
  const nameEl = document.getElementById('word-name');
  if (nameEl) nameEl.textContent = lp.name || '';

  const msgText = lp.custom_message || lp.message || '';
  const msgSec  = document.getElementById('custom-msg-section');
  const msgCard = document.getElementById('custom-msg-card');
  if (msgText && msgSec && msgCard) {
    msgCard.textContent  = msgText;
    msgSec.style.display = 'block';
  }

  const images = Array.isArray(lp.images) ? lp.images.filter(Boolean) : [];
  buildPhotoBook(images);
  startCountdown();
}

/* ── countdown ────────────────────────────────────── */
function startCountdown() {
  const overlay = document.getElementById('countdown-overlay');
  const numEl   = document.getElementById('countdown-num');
  if (!overlay || !numEl) { startAnimations(); return; }
  let n = 3;
  numEl.textContent     = n;
  overlay.style.display = 'flex';
  const iv = setInterval(() => {
    n--;
    if (n <= 0) { clearInterval(iv); overlay.style.display = 'none'; startAnimations(); }
    else numEl.textContent = n;
  }, 1000);
}

function startAnimations() { spawnStars(); spawnHearts(); animateWords(); }

function spawnStars() {
  const c = document.getElementById('stars');
  if (!c) return;
  for (let i = 0; i < 80; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    s.style.cssText = `left:${Math.random()*100}%;top:${Math.random()*100}%;
      animation-delay:${Math.random()*3}s;animation-duration:${1.5+Math.random()*2}s;
      width:${1+Math.random()*3}px;height:${1+Math.random()*3}px`;
    c.appendChild(s);
  }
}

function spawnHearts() {
  const c = document.getElementById('hearts-c');
  if (!c) return;
  const emojis = ['💖','💕','💗','🎂','🎉','✨','💝'];
  setInterval(() => {
    const h = document.createElement('div');
    h.className   = 'float-heart';
    h.textContent = emojis[Math.floor(Math.random()*emojis.length)];
    h.style.cssText = `left:${Math.random()*100}%;font-size:${1+Math.random()*1.5}rem;animation-duration:${3+Math.random()*4}s`;
    c.appendChild(h);
    setTimeout(() => h.remove(), 7000);
  }, 600);
}

function animateWords() {
  ['word-happy','word-birthday','word-name'].forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) setTimeout(() => el.classList.add('visible'), i * 600);
  });
}

/* ════════════════════════════════════════════════════
   PHOTO BOOK
   ════════════════════════════════════════════════════ */
let bookPages   = [];
let currentPage = 0;
let isDragging  = false;
let dragStartX  = 0;

function buildPhotoBook(images) {
  bookPages = [{ type: 'cover' }];
  images.forEach(url => bookPages.push({ type: 'photo', url }));
  bookPages.push({ type: 'end' });
  if (images.length === 0) {
    const pb = document.getElementById('photobook');
    if (pb) pb.style.display = 'none';
  }
}

function openBook() {
  const closed = document.getElementById('closed-book');
  const open   = document.getElementById('open-book-wrap');
  if (closed) closed.style.display = 'none';
  if (open)   open.style.display   = 'block';
  currentPage = 0;
  renderBook();
}

function renderBook() {
  const left  = document.getElementById('static-left');
  const front = document.getElementById('flip-front');
  const back  = document.getElementById('flip-back');
  const prog  = document.getElementById('book-progress');
  if (left)  left.innerHTML  = pageHTML(bookPages[currentPage]);
  if (front) front.innerHTML = pageHTML(bookPages[currentPage+1] || {type:'end'});
  if (back)  back.innerHTML  = pageHTML(bookPages[currentPage+2] || {type:'end'});
  if (prog)  prog.textContent = `${Math.min(currentPage+2,bookPages.length)} / ${bookPages.length}`;
  const al = document.getElementById('arrow-left');
  const ar = document.getElementById('arrow-right');
  if (al) al.style.opacity = currentPage > 0 ? '1' : '0.2';
  if (ar) ar.style.opacity = currentPage+2 < bookPages.length ? '1' : '0.2';
}

function pageHTML(page) {
  if (!page)                 return '<div class="ph-page"><div class="ph-text">✨</div></div>';
  if (page.type==='cover')   return '<div class="ph-page cover-page"><div class="ph-text">💕<br><span style="font-size:.9rem">Our Memories</span></div></div>';
  if (page.type==='end')     return '<div class="ph-page"><div class="ph-text">💖<br><span style="font-size:.8rem">The End</span></div></div>';
  if (page.type==='photo')   return `<div class="ph-page photo-page"><img src="${page.url}" alt="" onerror="this.style.display='none'"/></div>`;
  return '<div class="ph-page"></div>';
}

function startDrag(e) {
  isDragging = true;
  dragStartX = e.touches ? e.touches[0].clientX : e.clientX;
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup',   endDrag);
  document.addEventListener('touchmove', onDrag, { passive: true });
  document.addEventListener('touchend',  endDrag);
}

function onDrag(e) {
  if (!isDragging) return;
  const diff = dragStartX - (e.touches ? e.touches[0].clientX : e.clientX);
  const page = document.getElementById('flip-page');
  if (page) page.style.transform = `rotateY(${Math.min(Math.max(diff/3,0),180)}deg)`;
}

function endDrag(e) {
  if (!isDragging) return;
  isDragging = false;
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup',   endDrag);
  document.removeEventListener('touchmove', onDrag);
  document.removeEventListener('touchend',  endDrag);
  const diff = dragStartX - (e.changedTouches ? e.changedTouches[0].clientX : e.clientX);
  const page = document.getElementById('flip-page');
  if (Math.abs(diff) > 60) {
    if (diff > 0 && currentPage+2 < bookPages.length) {
      if (page) page.style.transform = 'rotateY(180deg)';
      setTimeout(() => { currentPage += 2; if (page) page.style.transform = ''; renderBook(); }, 300);
    } else if (diff < 0 && currentPage > 0) {
      currentPage -= 2; if (page) page.style.transform = ''; renderBook();
    } else { if (page) page.style.transform = ''; }
  } else { if (page) page.style.transform = ''; }
}

document.addEventListener('DOMContentLoaded', () => {
  const al = document.getElementById('arrow-left');
  const ar = document.getElementById('arrow-right');
  if (al) al.addEventListener('click', () => { if (currentPage > 0) { currentPage -= 2; renderBook(); } });
  if (ar) ar.addEventListener('click', () => { if (currentPage+2 < bookPages.length) { currentPage += 2; renderBook(); } });
});

function closeHeartFormation() {
  const hf = document.getElementById('heart-formation');
  if (hf) hf.style.display = 'none';
}