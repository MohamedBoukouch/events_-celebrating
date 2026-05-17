// =====================================================
//  BIRTHDAY LP — lp/app.js  (FULLY FIXED)
//
//  FIX: submitRequest() now:
//    1. Uploads each image to Drive via uploadRequestImage
//    2. Collects the returned URLs
//    3. POSTs submitRequest with the URL array
//  This guarantees images column is populated in GAS.
// =====================================================

const API_URL  = 'https://events-celebrating.vercel.app/api/proxy';
const LP_BASE  = 'https://events-celebrating.vercel.app/lp.html';

/* ─── helpers ─────────────────────────────────────── */
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

/* ─── REQUEST FORM images ──────────────────────────── */
let reqImages = [];   // { base64, mime, name, preview }

function handleReqImages(e) {
  const files   = Array.from(e.target.files);
  const allowed = 6 - reqImages.length;
  files.slice(0, allowed).forEach(file => {
    if (file.size > 5 * 1024 * 1024) {
      alert('Image too large (max 5MB): ' + file.name);
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target.result;
      reqImages.push({
        base64:  dataUrl.split(',')[1],
        mime:    file.type,
        name:    file.name,
        preview: dataUrl
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
    div.innerHTML = `
      <img src="${img.preview}" alt=""/>
      <button onclick="removeReqImage(${i})">✕</button>`;
    wrap.appendChild(div);
  });
}

function removeReqImage(idx) {
  reqImages.splice(idx, 1);
  renderReqPreviews();
}

/* ─── UPLOAD one image to Drive ────────────────────── */
async function uploadOneImage(img) {
  const res = await apiPost({
    action:   'uploadRequestImage',
    data:     img.base64,
    mimeType: img.mime,
    filename: img.name
  });
  if (res.error) throw new Error('Upload failed: ' + res.error);
  return res.url;   // proxied URL: /api/image?id=DRIVE_ID
}

/* ─── SUBMIT REQUEST ────────────────────────────────── */
async function submitRequest() {
  const name     = (document.getElementById('req-name')     || {}).value || '';
  const whatsapp = (document.getElementById('req-whatsapp') || {}).value || '';
  const message  = (document.getElementById('req-message')  || {}).value || '';
  const email    = (document.getElementById('req-email')    || {}).value || '';

  if (!name.trim())     { setReqResult('Please enter your name', 'error');      return; }
  if (!whatsapp.trim()) { setReqResult('Please enter your WhatsApp', 'error');  return; }

  const btn = document.getElementById('req-submit-btn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Uploading images…'; }

  try {
    /* 1 ── upload all images first, collect URLs */
    const imageUrls = [];
    for (let i = 0; i < reqImages.length; i++) {
      if (btn) btn.textContent = `⏳ Uploading image ${i + 1}/${reqImages.length}…`;
      const url = await uploadOneImage(reqImages[i]);
      imageUrls.push(url);
    }

    /* 2 ── submit the request with image URLs */
    if (btn) btn.textContent = '⏳ Sending request…';
    const res = await apiPost({
      action:   'submitRequest',
      name:     name.trim(),
      whatsapp: whatsapp.trim(),
      message:  message.trim(),
      email:    email.trim(),
      images:   imageUrls        // ← array of proxied Drive URLs
    });

    if (res.error) throw new Error(res.error);

    setReqResult('✅ Request sent! We will send your LP to your WhatsApp soon 🎉', 'success');

    /* reset form */
    ['req-name','req-whatsapp','req-message','req-email'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    reqImages = [];
    renderReqPreviews();

  } catch (err) {
    setReqResult('Error: ' + err.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Send Request 💌'; }
  }
}

function setReqResult(msg, type) {
  const el = document.getElementById('req-result');
  if (!el) return;
  el.textContent  = msg;
  el.style.color  = type === 'error' ? '#ff4d4d' : '#4dff91';
}

/* ════════════════════════════════════════════════════
   LP DISPLAY (when ?id= is present)
   ════════════════════════════════════════════════════ */

/* ─── init ─────────────────────────────────────────── */
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

/* ─── load LP data ─────────────────────────────────── */
async function loadLP(id) {
  try {
    const data = await apiGet({ action: 'getLP', id });
    if (data.error || !data.data) {
      document.getElementById('lp-screen').style.display    = 'none';
      document.getElementById('error-screen').style.display = 'flex';
      return;
    }
    initLP(data.data);
  } catch (err) {
    document.getElementById('lp-screen').style.display    = 'none';
    document.getElementById('error-screen').style.display = 'flex';
  }
}

/* ─── initialise the LP page ───────────────────────── */
function initLP(lp) {
  /* name */
  const nameEl = document.getElementById('word-name');
  if (nameEl) nameEl.textContent = lp.name || '';

  /* custom message */
  const msgSec  = document.getElementById('custom-msg-section');
  const msgCard = document.getElementById('custom-msg-card');
  const msgText = lp.custom_message || lp.message || '';
  if (msgText && msgSec && msgCard) {
    msgCard.textContent   = msgText;
    msgSec.style.display  = 'block';
  }

  /* images */
  const images = Array.isArray(lp.images) ? lp.images.filter(Boolean) : [];
  buildPhotoBook(images);

  /* kick off animations */
  startCountdown();
}

/* ─── countdown ────────────────────────────────────── */
function startCountdown() {
  const overlay = document.getElementById('countdown-overlay');
  const numEl   = document.getElementById('countdown-num');
  if (!overlay || !numEl) { startAnimations(); return; }

  let n = 3;
  numEl.textContent = n;
  overlay.style.display = 'flex';

  const iv = setInterval(() => {
    n--;
    if (n <= 0) {
      clearInterval(iv);
      overlay.style.display = 'none';
      startAnimations();
    } else {
      numEl.textContent = n;
    }
  }, 1000);
}

/* ─── main animations stub ─────────────────────────── */
function startAnimations() {
  spawnStars();
  spawnHearts();
  animateWords();
}

/* ─── stars ────────────────────────────────────────── */
function spawnStars() {
  const c = document.getElementById('stars');
  if (!c) return;
  for (let i = 0; i < 80; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    s.style.cssText = `
      left:${Math.random()*100}%;
      top:${Math.random()*100}%;
      animation-delay:${Math.random()*3}s;
      animation-duration:${1.5+Math.random()*2}s;
      width:${1+Math.random()*3}px;
      height:${1+Math.random()*3}px;
    `;
    c.appendChild(s);
  }
}

/* ─── floating hearts ──────────────────────────────── */
function spawnHearts() {
  const c = document.getElementById('hearts-c');
  if (!c) return;
  const emojis = ['💖','💕','💗','🎂','🎉','✨','💝'];
  setInterval(() => {
    const h = document.createElement('div');
    h.className   = 'float-heart';
    h.textContent = emojis[Math.floor(Math.random()*emojis.length)];
    h.style.cssText = `
      left:${Math.random()*100}%;
      font-size:${1+Math.random()*1.5}rem;
      animation-duration:${3+Math.random()*4}s;
    `;
    c.appendChild(h);
    setTimeout(() => h.remove(), 7000);
  }, 600);
}

/* ─── word entrance ────────────────────────────────── */
function animateWords() {
  ['word-happy','word-birthday','word-name'].forEach((id, i) => {
    const el = document.getElementById(id);
    if (!el) return;
    setTimeout(() => el.classList.add('visible'), i * 600);
  });
}

/* ════════════════════════════════════════════════════
   PHOTO BOOK
   ════════════════════════════════════════════════════ */
let bookPages   = [];
let currentPage = 0;
let isDragging  = false;
let dragStartX  = 0;
let bookOpen    = false;

function buildPhotoBook(images) {
  /* always add a cover page, then one page per image */
  bookPages = [{ type: 'cover' }];
  images.forEach(url => bookPages.push({ type: 'photo', url }));
  bookPages.push({ type: 'end' });

  if (bookPages.length <= 1) {
    /* no images — hide photobook section */
    const pb = document.getElementById('photobook');
    if (pb) pb.style.display = 'none';
  }
}

function openBook() {
  const closed = document.getElementById('closed-book');
  const open   = document.getElementById('open-book-wrap');
  if (closed) closed.style.display = 'none';
  if (open)   open.style.display   = 'block';
  bookOpen    = true;
  currentPage = 0;
  renderBook();
}

function renderBook() {
  const left  = document.getElementById('static-left');
  const front = document.getElementById('flip-front');
  const back  = document.getElementById('flip-back');
  const prog  = document.getElementById('book-progress');

  const leftPage  = bookPages[currentPage];
  const rightPage = bookPages[currentPage + 1];

  if (left)  left.innerHTML  = pageHTML(leftPage);
  if (front) front.innerHTML = pageHTML(rightPage || { type: 'end' });
  if (back)  back.innerHTML  = pageHTML(bookPages[currentPage + 2] || { type: 'end' });

  if (prog) prog.textContent = `${Math.min(currentPage + 2, bookPages.length)} / ${bookPages.length}`;

  /* arrows */
  const al = document.getElementById('arrow-left');
  const ar = document.getElementById('arrow-right');
  if (al) al.style.opacity = currentPage > 0 ? '1' : '0.2';
  if (ar) ar.style.opacity = currentPage + 2 < bookPages.length ? '1' : '0.2';
}

function pageHTML(page) {
  if (!page) return '<div class="ph-page"><div class="ph-text">✨</div></div>';
  if (page.type === 'cover') return '<div class="ph-page cover-page"><div class="ph-text">💕<br><span style="font-size:.9rem">Our Memories</span></div></div>';
  if (page.type === 'end')   return '<div class="ph-page"><div class="ph-text">💖<br><span style="font-size:.8rem">The End</span></div></div>';
  if (page.type === 'photo') return `<div class="ph-page photo-page"><img src="${page.url}" alt="" onerror="this.style.display='none'"/></div>`;
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
  const x    = e.touches ? e.touches[0].clientX : e.clientX;
  const diff = dragStartX - x;
  const page = document.getElementById('flip-page');
  if (page) page.style.transform = `rotateY(${Math.min(Math.max(diff / 3, 0), 180)}deg)`;
}

function endDrag(e) {
  if (!isDragging) return;
  isDragging = false;
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup',   endDrag);
  document.removeEventListener('touchmove', onDrag);
  document.removeEventListener('touchend',  endDrag);

  const x    = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
  const diff = dragStartX - x;
  const page = document.getElementById('flip-page');

  if (Math.abs(diff) > 60) {
    if (diff > 0 && currentPage + 2 < bookPages.length) {
      /* turn forward */
      if (page) page.style.transform = 'rotateY(180deg)';
      setTimeout(() => {
        currentPage += 2;
        if (page) page.style.transform = '';
        renderBook();
      }, 300);
    } else if (diff < 0 && currentPage > 0) {
      /* turn backward */
      currentPage -= 2;
      if (page) page.style.transform = '';
      renderBook();
    } else {
      if (page) page.style.transform = '';
    }
  } else {
    if (page) page.style.transform = '';
  }
}

/* arrow click helpers */
function prevPage() {
  if (currentPage > 0) { currentPage -= 2; renderBook(); }
}
function nextPage() {
  if (currentPage + 2 < bookPages.length) { currentPage += 2; renderBook(); }
}

document.addEventListener('DOMContentLoaded', () => {
  const al = document.getElementById('arrow-left');
  const ar = document.getElementById('arrow-right');
  if (al) al.addEventListener('click', prevPage);
  if (ar) ar.addEventListener('click', nextPage);
});

/* ─── heart formation (decorative) ────────────────── */
function closeHeartFormation() {
  const hf = document.getElementById('heart-formation');
  if (hf) hf.style.display = 'none';
}