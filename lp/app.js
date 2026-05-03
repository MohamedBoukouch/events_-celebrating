/* =====================================================
   BIRTHDAY LP PAGE — JavaScript (FIXED)
   ===================================================== */

// ── CONFIG ────────────────────────────────────────────────
const LP_CONFIG = {
  API_URL: 'https://events-celebrating.vercel.app/api/proxy'
};

// ── SILENT BACKGROUND MUSIC (FIXED) ──────────────────────
const MUSIC = {
  audio: null,
  started: false,
  initAttempts: 0,
  maxAttempts: 5,

  init() {
    // ✅ VOTRE LIEN CLOUDINARY
    this.audio = new Audio('https://res.cloudinary.com/ds9v1rpfi/video/upload/v1777808988/love_zmgfmy.mp3');
    this.audio.loop = true;
    this.audio.volume = 0.6;

    // Error handling
    this.audio.addEventListener('error', (e) => {
      console.error('Audio error:', e);
      console.log('Audio source:', this.audio.src);
    });

    // Try autoplay immediately
    this._tryPlay();

    // Setup interaction listeners
    const events = ['click', 'touchstart', 'keydown'];
    
    const startOnInteraction = () => {
      if (this.started) {
        this._cleanupListeners(startOnInteraction, events);
        return;
      }
      
      this._tryPlay();
      this.initAttempts++;
      
      if (this.started || this.initAttempts >= this.maxAttempts) {
        this._cleanupListeners(startOnInteraction, events);
      }
    };

    events.forEach(ev =>
      document.addEventListener(ev, startOnInteraction, { passive: true })
    );
  },

  _cleanupListeners(fn, events) {
    events.forEach(ev => document.removeEventListener(ev, fn));
  },

  _tryPlay() {
    if (!this.audio || this.started) return;
    
    const promise = this.audio.play();
    if (promise !== undefined) {
      promise
        .then(() => {
          this.started = true;
          console.log('Music playing! 🎵');
        })
        .catch((err) => {
          console.log('Autoplay blocked, waiting for user interaction...');
        });
    }
  }
};

// ── PAGE INIT ─────────────────────────────────────────────
const params = new URLSearchParams(window.location.search);
const lpId = params.get('id');

// Start music as early as possible
MUSIC.init();

if (lpId) {
  document.getElementById('lp-screen').style.display = 'block';
  loadLP(lpId);
} else {
  document.getElementById('request-screen').style.display = 'flex';
}

async function loadLP(id) {
  try {
    const url = new URL(LP_CONFIG.API_URL);
    url.searchParams.set('action', 'getLP');
    url.searchParams.set('id', id);
    const res = await fetch(url.toString());
    const data = await res.json();
    if (data.error || !data.data) { showError(); return; }
    initLP(data.data);
  } catch(e) {
    initLP({ name: 'You', images: [], custom_message: '' });
  }
}

function showError() {
  document.getElementById('lp-screen').style.display = 'none';
  document.getElementById('error-screen').style.display = 'flex';
}

// ── LP INIT ───────────────────────────────────────────────
let BOOK_IMAGES = [];

function initLP(lpData) {
  BOOK_IMAGES = lpData.images || [];
  const name = lpData.name || 'You';
  const msg = lpData.custom_message || '';

  document.getElementById('word-name').textContent = name.toUpperCase();

  if (msg) {
    document.getElementById('custom-msg-section').style.display = 'block';
    document.getElementById('custom-msg-card').textContent = msg;
  }

  document.title = `Happy Birthday ${name}! 💖`;

  initStars();
  initMatrix();
  initHearts();
  initConfetti();
  setTimeout(runCountdown, 400);
}

// ── STARS ─────────────────────────────────────────────────
function initStars() {
  const starsEl = document.getElementById('stars');
  for (let i = 0; i < 200; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    const sz = Math.random() * 3 + 1;
    s.style.cssText = `width:${sz}px;height:${sz}px;top:${Math.random()*100}%;left:${Math.random()*100}%;--d:${(Math.random()*3+1).toFixed(1)}s;animation-delay:${(Math.random()*3).toFixed(1)}s`;
    starsEl.appendChild(s);
  }
}

// ── MATRIX ────────────────────────────────────────────────
function initMatrix() {
  const cv = document.getElementById('matrix'), ctx = cv.getContext('2d');
  function resize() { cv.width = window.innerWidth; cv.height = window.innerHeight; }
  resize(); window.addEventListener('resize', resize);
  const chars = 'ｦｧｨｩｪｫｬｭｮｯｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789♥♡❤';
  const fs = 16; let cols, drops;
  function init() { cols = Math.floor(cv.width / fs); drops = Array(cols).fill(1); }
  init(); window.addEventListener('resize', init);
  function draw() {
    ctx.fillStyle = 'rgba(4,1,15,0.08)'; ctx.fillRect(0, 0, cv.width, cv.height);
    for (let i = 0; i < drops.length; i++) {
      const ch = chars[Math.floor(Math.random() * chars.length)];
      ctx.fillStyle = Math.random() > .85 ? '#ff2d78' : `rgba(255,${Math.floor(Math.random()*60+20)},${Math.floor(Math.random()*80+40)},${0.5+Math.random()*0.5})`;
      ctx.font = `${fs}px monospace`;
      ctx.fillText(ch, i * fs, drops[i] * fs);
      if (drops[i] * fs > cv.height && Math.random() > .975) drops[i] = 0;
      drops[i]++;
    }
  }
  setInterval(draw, 45);
}

// ── HEARTS ────────────────────────────────────────────────
function initHearts() {
  const c = document.getElementById('hearts-c');
  ['❤️','💕','💖','💗','💓','💞','🌹','✨'].forEach(em => {
    for (let j = 0; j < 2; j++) {
      const h = document.createElement('div'); h.className = 'fheart';
      h.style.cssText = `left:${Math.random()*100}%;--d:${(Math.random()*8+6).toFixed(1)}s;animation-delay:${(Math.random()*9).toFixed(1)}s;font-size:${(Math.random()*1.4+.7).toFixed(1)}rem`;
      h.textContent = em; c.appendChild(h);
    }
  });
}

// ── CONFETTI ──────────────────────────────────────────────
function initConfetti() {
  const c = document.getElementById('conf-c');
  ['#ff2d78','#ffd700','#4ade80','#38bdf8','#a855f7','#ff9f1a','#ff69b4'].forEach(col => {
    for (let i = 0; i < 6; i++) {
      const el = document.createElement('div'); el.className = 'conf';
      el.style.cssText = `left:${Math.random()*100}%;background:${col};--d:${(Math.random()*4+3).toFixed(1)}s;--dl:${(Math.random()*6).toFixed(1)}s;width:${Math.floor(Math.random()*8+4)}px;height:${Math.floor(Math.random()*8+4)}px;border-radius:${Math.random()>.5?'50%':'2px'}`;
      c.appendChild(el);
    }
  });
}

// ── COUNTDOWN + SEQUENCE ──────────────────────────────────
function runCountdown() {
  const overlay = document.getElementById('countdown-overlay');
  const numEl = document.getElementById('countdown-num');
  const steps = ['3','2','1','GO!'];
  let i = 0;
  function tick() {
    numEl.textContent = steps[i];
    numEl.style.animation = 'none'; void numEl.offsetWidth; numEl.style.animation = 'cpop .5s ease-out';
    i++;
    if (i < steps.length) { setTimeout(tick, 1000); }
    else {
      overlay.classList.add('hidden');
      setTimeout(() => {
        overlay.style.display = 'none';
        document.getElementById('main-page').classList.add('visible');
        startSequence();
      }, 800);
    }
  }
  tick();
}

function startSequence() {
  const wH = document.getElementById('word-happy');
  const wB = document.getElementById('word-birthday');
  const wN = document.getElementById('word-name');
  const sL = document.getElementById('stage-love');
  const sH = document.getElementById('stage-happy');
  const pb = document.getElementById('photobook');
  const ms = document.getElementById('custom-msg-section');

  wH.classList.add('show');
  setTimeout(() => { wH.classList.remove('show'); wH.classList.add('hide');
    setTimeout(() => { wB.classList.add('show');
      setTimeout(() => { wB.classList.remove('show'); wB.classList.add('hide');
        setTimeout(() => { wN.classList.add('show');
          setTimeout(() => { wN.classList.remove('show'); wN.classList.add('hide');
            setTimeout(() => { sL.classList.add('show');
              setTimeout(() => { sL.classList.remove('show'); sL.classList.add('hide');
                setTimeout(() => { sH.classList.add('show');
                  setTimeout(() => { sH.classList.remove('show'); sH.classList.add('hide');
                    setTimeout(() => {
                      pb.classList.add('visible');
                      if (ms && ms.style.display !== 'none') ms.style.display = 'block';
                      pb.scrollIntoView({ behavior: 'smooth' });
                    }, 400);
                  }, 2000);
                }, 300);
              }, 1000);
            }, 300);
          }, 1000);
        }, 300);
      }, 1000);
    }, 300);
  }, 1000);
}

/* ═══════════════════════════════════════════════════
   BOOK ENGINE
   ═══════════════════════════════════════════════════ */
let bookOpen = false, currentSpread = 0, isAnimating = false, totalSpreads = 0;
const closedBook = document.getElementById('closed-book');
const openBookWrap = document.getElementById('open-book-wrap');
const openBookEl = document.getElementById('open-book');
const staticLeft = document.getElementById('static-left');
const flipPage = document.getElementById('flip-page');
const flipFront = document.getElementById('flip-front');
const flipBack = document.getElementById('flip-back');
const bookProgress = document.getElementById('book-progress');
const arrowLeft = document.getElementById('arrow-left');
const arrowRight = document.getElementById('arrow-right');

let spreads = [];

function buildSpreads() {
  const s = [];
  for (let i = 0; i < BOOK_IMAGES.length; i += 2)
    s.push([BOOK_IMAGES[i] || null, BOOK_IMAGES[i+1] || null]);
  s.push([null, null]);
  return s;
}

function getSpreadHTML(img, side, idx, total) {
  if (idx === total - 1 && !img) return `
    <div class="last-page-content">
      <div class="lp-heart">💖</div>
      <div class="lp-title">The End 🌹</div>
      <div class="lp-sub">Every moment with you<br>is a page worth keeping 💕</div>
    </div>`;
  if (img) return `<img src="${img}" alt="" style="width:100%;height:100%;object-fit:cover;display:block" onerror="this.outerHTML='<div class=phpage><div class=phtext>💖</div></div>'"/>`;
  return `<div class="ph-page"><div class="ph-text">💖</div></div>`;
}

function renderSpread(idx) {
  if (!spreads.length) return;
  const spread = spreads[idx];
  staticLeft.innerHTML = getSpreadHTML(spread[0], 'left', idx, spreads.length);
  flipFront.innerHTML = getSpreadHTML(spread[1], 'right', idx, spreads.length);
  arrowLeft.style.opacity = idx > 0 ? '0.4' : '0.1';
  arrowRight.style.opacity = idx < spreads.length - 1 ? '0.4' : '0.1';
  document.querySelectorAll('.prog-dot').forEach((d, i) => d.classList.toggle('active', i === idx));
}

function buildProgressDots() {
  bookProgress.innerHTML = '';
  spreads.forEach((_, i) => {
    const d = document.createElement('div');
    d.className = 'prog-dot' + (i === 0 ? ' active' : '');
    bookProgress.appendChild(d);
  });
}

function openBook() {
  if (bookOpen) return;
  bookOpen = true;
  spreads = buildSpreads(); totalSpreads = spreads.length; currentSpread = 0;
  closedBook.style.transform = 'scale(0.8) rotateY(15deg)';
  closedBook.style.opacity = '0'; closedBook.style.transition = 'all 0.4s ease';
  setTimeout(() => {
    closedBook.style.display = 'none'; openBookWrap.classList.add('active');
    buildProgressDots(); renderSpread(0);
    openBookEl.style.opacity = '0'; openBookEl.style.transform = 'scale(0.7) rotateX(10deg)';
    openBookEl.style.transition = 'all 0.6s cubic-bezier(0.175,0.885,0.32,1.275)';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      openBookEl.style.opacity = '1'; openBookEl.style.transform = 'scale(1) rotateX(0)';
    }));
  }, 400);
}

let dragStartX = 0, isDragging = false, dragProgress = 0;
const FLIP_THRESHOLD = 80;

function startDrag(e) {
  if (isAnimating) return;
  isDragging = true;
  dragStartX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
  dragProgress = 0; flipPage.style.transition = 'none';
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', endDrag);
  document.addEventListener('touchmove', onDrag, { passive: false });
  document.addEventListener('touchend', endDrag);
}
function onDrag(e) {
  if (!isDragging) return; if (e.cancelable) e.preventDefault();
  const x = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
  dragProgress = dragStartX - x;
  const pct = Math.max(0, Math.min(1, dragProgress / 200));
  if (dragProgress > 0 && currentSpread < spreads.length - 1)
    flipPage.style.transform = `rotateY(-${pct*180}deg)`;
  else if (dragProgress < 0 && currentSpread > 0)
    flipPage.style.transform = `rotateY(${Math.min(20, Math.abs(dragProgress)*.2)}deg)`;
}
function endDrag() {
  if (!isDragging) return; isDragging = false;
  document.removeEventListener('mousemove', onDrag); document.removeEventListener('mouseup', endDrag);
  document.removeEventListener('touchmove', onDrag); document.removeEventListener('touchend', endDrag);
  flipPage.style.transition = '';
  if (dragProgress > FLIP_THRESHOLD && currentSpread < spreads.length - 1) flipForward();
  else if (dragProgress < -FLIP_THRESHOLD && currentSpread > 0) flipBackward();
  else { flipPage.style.transition = 'transform 0.4s cubic-bezier(0.175,0.885,0.32,1.275)'; flipPage.style.transform = 'rotateY(0deg)'; }
}

function flipForward() {
  if (isAnimating || currentSpread >= spreads.length - 1) return; isAnimating = true;
  const next = spreads[currentSpread + 1];
  flipBack.innerHTML = getSpreadHTML(next[0], 'left', currentSpread + 1, spreads.length);
  flipBack.style.borderRadius = '12px 0 0 12px';
  flipPage.style.transition = 'transform 0.65s cubic-bezier(0.645,0.045,0.355,1.000)';
  flipPage.style.transform = 'rotateY(-180deg)';
  setTimeout(() => {
    currentSpread++; renderSpread(currentSpread);
    flipPage.style.transition = 'none'; flipPage.style.transform = 'rotateY(0deg)'; isAnimating = false;
    if (currentSpread === spreads.length - 1) setTimeout(() => closeBook(), 2500);
  }, 650);
}
function flipBackward() {
  if (isAnimating || currentSpread <= 0) return; isAnimating = true;
  const prev = spreads[currentSpread - 1];
  flipBack.innerHTML = getSpreadHTML(prev[1], 'right', currentSpread - 1, spreads.length);
  flipBack.style.borderRadius = '0 12px 12px 0';
  flipPage.style.transition = 'none'; flipPage.style.transform = 'rotateY(-180deg)';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    flipPage.style.transition = 'transform 0.65s cubic-bezier(0.645,0.045,0.355,1.000)';
    flipPage.style.transform = 'rotateY(0deg)';
  }));
  setTimeout(() => { currentSpread--; renderSpread(currentSpread); isAnimating = false; }, 650);
}

function closeBook() {
  openBookEl.style.transition = 'all 0.7s cubic-bezier(0.6,-0.28,0.735,0.045)';
  openBookEl.style.transform = 'scale(0.5) rotateX(20deg)'; openBookEl.style.opacity = '0';
  setTimeout(() => {
    openBookWrap.classList.remove('active'); closedBook.style.display = '';
    closedBook.style.transform = 'scale(0.8) rotateY(-15deg)'; closedBook.style.opacity = '0';
    closedBook.style.transition = 'all 0.5s cubic-bezier(0.175,0.885,0.32,1.275)';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      closedBook.style.transform = 'scale(1) rotateY(0)'; closedBook.style.opacity = '1';
    }));
    openBookEl.style.transform = ''; openBookEl.style.opacity = '';
    bookOpen = false; currentSpread = 0;
    setTimeout(() => showHeartFormation(), 600);
  }, 700);
}

if (openBookEl) {
  openBookEl.addEventListener('click', function(e) {
    if (isAnimating || isDragging) return;
    const r = openBookEl.getBoundingClientRect();
    const x = e.clientX - r.left; const hw = r.width / 2;
    if (x > hw * 1.3) flipForward();
    else if (x < hw * .7 && currentSpread > 0) flipBackward();
  });
}
if (staticLeft) {
  staticLeft.addEventListener('touchstart', startDrag);
  staticLeft.addEventListener('mousedown', startDrag);
}

/* ── HEART FORMATION ─────────────────────────────── */
function showHeartFormation() {
  const hf = document.getElementById('heart-formation');
  const canvas = document.getElementById('heart-canvas');
  hf.classList.add('show');
  const hfStars = document.getElementById('hf-stars');
  hfStars.innerHTML = '';
  for (let i = 0; i < 80; i++) {
    const s = document.createElement('div'); s.className = 'star';
    const sz = Math.random() * 2 + 0.5;
    s.style.cssText = `width:${sz}px;height:${sz}px;top:${Math.random()*100}%;left:${Math.random()*100}%;--d:${(Math.random()*3+1).toFixed(1)}s`;
    hfStars.appendChild(s);
  }
  canvas.querySelectorAll('.hf-card').forEach(c => c.remove());
  const imgs = BOOK_IMAGES; if (!imgs.length) return;
  const vmin = Math.min(window.innerWidth * 0.90, window.innerHeight * 0.72, 520);
  const SIZE = vmin;
  canvas.style.width = SIZE + 'px'; canvas.style.height = SIZE + 'px';
  function hXY(t) { return { x: 16 * Math.pow(Math.sin(t), 3), y: -(13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t)) }; }
  const NUM = 14; const rawPts = []; const tangents = [];
  for (let i = 0; i < NUM; i++) {
    const t = (i / NUM) * 2 * Math.PI; rawPts.push(hXY(t));
    const dt = 0.01, a = hXY(t), b = hXY(t + dt);
    tangents.push(Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI);
  }
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  rawPts.forEach(p => { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); });
  const pad = SIZE * .12, scX = (SIZE-pad*2)/(maxX-minX), scY = (SIZE-pad*2)/(maxY-minY), sc = Math.min(scX, scY);
  const oX = pad + ((SIZE-pad*2)-(maxX-minX)*sc)/2, oY = pad + ((SIZE-pad*2)-(maxY-minY)*sc)/2;
  const toC = p => ({ x: oX + (p.x-minX)*sc, y: oY + (p.y-minY)*sc });
  const CW = SIZE*0.26, CH = SIZE*0.28, cPad = SIZE*0.018, cBot = SIZE*0.06, iW = CW-cPad*2, iH = CH-cPad-cBot;
  const svgEl = document.getElementById('hf-heart-glow');
  const pathEl = document.getElementById('hf-heart-path');
  svgEl.setAttribute('viewBox', `0 0 ${SIZE} ${SIZE}`);
  const svgD = [];
  for (let i = 0; i <= 300; i++) {
    const t = (i/300)*2*Math.PI; const p = toC(hXY(t));
    svgD.push(i === 0 ? `M${p.x.toFixed(1)},${p.y.toFixed(1)}` : `L${p.x.toFixed(1)},${p.y.toFixed(1)}`);
  }
  pathEl.setAttribute('d', svgD.join('') + 'Z');
  setTimeout(() => svgEl.classList.add('visible'), 400);
  rawPts.forEach((rp, i) => {
    const cp = toC(rp); const img = imgs[i % imgs.length];
    const tilt = tangents[i] + (Math.random() - .5) * 25;
    const card = document.createElement('div'); card.className = 'hf-card';
    card.style.cssText = `width:${CW}px;height:${CH}px;left:${cp.x-CW/2}px;top:${cp.y-CH/2}px;padding:${cPad}px ${cPad}px ${cBot}px ${cPad}px;transform:scale(0) rotate(${tilt}deg);opacity:0;`;
    card.innerHTML = `<img src="${img}" alt="" style="width:${iW}px;height:${iH}px;object-fit:cover;display:block;border-radius:2px"/>`;
    canvas.appendChild(card);
    setTimeout(() => {
      card.style.transition = 'opacity .4s ease, transform .55s cubic-bezier(0.175,0.885,0.32,1.275), box-shadow .3s';
      card.style.transform = `scale(1) rotate(${tilt}deg)`; card.style.opacity = '1';
    }, i * 100);
  });
}

function closeHeartFormation() {
  const hf = document.getElementById('heart-formation');
  document.getElementById('hf-heart-glow').classList.remove('visible');
  hf.style.transition = 'opacity 0.5s'; hf.style.opacity = '0';
  setTimeout(() => { hf.classList.remove('show'); hf.style.opacity = ''; hf.style.transition = ''; }, 500);
}

/* ── REQUEST FORM ─────────────────────────────────── */
let reqImages = [];

function handleReqImages(e) {
  const files = Array.from(e.target.files);
  const allowed = 6 - reqImages.length;
  files.slice(0, allowed).forEach(f => {
    if (f.size > 5*1024*1024) return;
    const r = new FileReader();
    r.onload = ev => {
      reqImages.push({ base64: ev.target.result.split(',')[1], mime: f.type, name: f.name, preview: ev.target.result });
      renderReqPreviews();
    };
    r.readAsDataURL(f);
  });
  e.target.value = '';
}

function renderReqPreviews() {
  const wrap = document.getElementById('req-previews');
  wrap.innerHTML = reqImages.map((img, i) => `
    <div class="req-thumb">
      <img src="${img.preview}" alt="" onclick="reqImages.splice(${i},1);renderReqPreviews()"/>
    </div>
  `).join('');
}

async function submitRequest() {
  const name = document.getElementById('req-name').value.trim();
  const email = document.getElementById('req-email').value.trim();
  const msg = document.getElementById('req-message').value.trim();
  if (!name) { alert('Please enter your name'); return; }

  const btn = document.getElementById('req-submit-btn');
  btn.disabled = true; btn.textContent = 'Sending... 💌';

  const imageData = reqImages.map(i => i.base64);

  try {
    const payload = { action: 'submitRequest', name, email, message: msg, images: JSON.stringify(imageData) };
    const formBody = Object.entries(payload)
      .map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v))
      .join('&');

    const res = await fetch(LP_CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formBody
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    document.getElementById('req-result').innerHTML =
      '<span style="color:#4ade80">✅ Request sent! We\'ll create your LP and share the link soon 💖</span>';
    btn.textContent = 'Sent! 💖';
  } catch (err) {
    document.getElementById('req-result').innerHTML =
      '<span style="color:#f87171">❌ Error: ' + err.message + '</span>';
    btn.disabled = false;
    btn.textContent = 'Send Request 💌';
  }
}