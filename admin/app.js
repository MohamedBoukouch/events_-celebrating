/* =====================================================
   LP ADMIN DASHBOARD — admin/app.js
   • Requests: newest first, phone number shown, no images column
   • After approve → show Share Link + QR buttons in row
   • No image upload anywhere in requests flow
   ===================================================== */

const CONFIG = {
  API_URL:    'https://events-celebrating.vercel.app/api/proxy',
  IMG_URL:    'https://events-celebrating.vercel.app/api/image',
  LP_BASE:    'https://events-celebrating.vercel.app/lp.html',
  ADMIN_PASS: '0000'
};

let uploadedImages = [];
let uploadedURLs   = [];
let currentTab     = 'create';
let adminPass      = '';

/* ── PROXY HELPER ─────────────────────────────────── */
function toProxiedUrl(url) {
  if (!url) return '';
  if (url.includes('/api/image')) return url;
  const patterns = [
    /[?&]id=([a-zA-Z0-9_-]{10,})/,
    /\/d\/([a-zA-Z0-9_-]{10,})\//,
    /thumbnail\?id=([a-zA-Z0-9_-]{10,})/
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return CONFIG.IMG_URL + '?id=' + m[1];
  }
  return url;
}

/* ── LOGIN ────────────────────────────────────────── */
document.getElementById('pass-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') doLogin();
});

async function doLogin() {
  const val = document.getElementById('pass-input').value.trim();
  if (!val) { showErr('Please enter your password'); return; }
  adminPass = val;

  const btn = document.getElementById('login-btn');
  btn.innerHTML = '<span class="spinner"></span>';
  btn.disabled  = true;

  try {
    const data = await apiGet({ action: 'getAllClients', pass: adminPass });
    if (data.error) {
      showErr('Wrong password');
      btn.innerHTML = 'Enter →';
      btn.disabled  = false;
      return;
    }
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    if (data.data) loadClientsData(data.data);
    loadRequestsData();
  } catch (err) {
    console.error(err);
    showErr('Connection error — check console');
    btn.innerHTML = 'Enter →';
    btn.disabled  = false;
  }
}

function showErr(msg) { document.getElementById('login-err').textContent = msg; }

function logout() {
  adminPass = '';
  document.getElementById('pass-input').value = '';
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('dashboard').classList.add('hidden');
}

/* ── API ──────────────────────────────────────────── */
async function apiGet(params) {
  const url = new URL(CONFIG.API_URL);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  const res = await fetch(url.toString());
  return res.json();
}

async function apiPost(body) {
  const res = await fetch(CONFIG.API_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body)
  });
  return res.json();
}

/* ── SIDEBAR / TABS ───────────────────────────────── */
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }

function switchTab(tab, btn) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.sb-item').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  if (btn) btn.classList.add('active');
  currentTab = tab;
  document.getElementById('top-bar-title').textContent =
    tab === 'create' ? 'Create LP' : tab === 'clients' ? 'All LPs' : 'Requests';
  if (window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('open');
  if (tab === 'clients')  refreshClients();
  if (tab === 'requests') refreshRequests();
}

function refreshData() {
  if (currentTab === 'clients')  refreshClients();
  if (currentTab === 'requests') refreshRequests();
  showToast('Refreshed', 'info');
}

/* ── IMAGE UPLOAD (Create LP only) ───────────────── */
function handleImages(e) {
  const files   = Array.from(e.target.files || []);
  const allowed = 6 - uploadedImages.length - uploadedURLs.length;
  files.slice(0, Math.max(0, allowed)).forEach(file => {
    if (file.size > 5 * 1024 * 1024) { showToast('Image too large (max 5MB)', 'error'); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target.result;
      uploadedImages.push({ base64: dataUrl.split(',')[1], mime: file.type || 'image/jpeg', name: file.name || 'image.jpg', preview: dataUrl });
      renderPreviews();
    };
    reader.onerror = () => showToast('Error reading file', 'error');
    reader.readAsDataURL(file);
  });
  e.target.value = '';
}

function renderPreviews() {
  const wrap = document.getElementById('image-previews');
  if (!wrap) return;
  wrap.innerHTML = '';
  const all = [
    ...uploadedURLs.map((u, idx) => ({ type: 'url',   url: toProxiedUrl(u), idx })),
    ...uploadedImages.map((img, idx) => ({ type: 'local', url: img.preview,       idx }))
  ];
  all.forEach(item => {
    const div = document.createElement('div');
    div.className = 'img-thumb';
    div.innerHTML = `
      <img src="${item.url}" alt=""
        onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22%3E%3Crect width=%2240%22 height=%2240%22 fill=%22%23ff2d78%22/%3E%3Ctext x=%2220%22 y=%2225%22 font-size=%2220%22 text-anchor=%22middle%22 fill=%22white%22%3E📷%3C/text%3E%3C/svg%3E'"/>
      <button class="img-thumb-del" onclick="removeImage(${item.idx},'${item.type}')">✕</button>`;
    wrap.appendChild(div);
  });
}

function removeImage(idx, type) {
  if (type === 'url') uploadedURLs.splice(idx, 1);
  else                uploadedImages.splice(idx, 1);
  renderPreviews();
}

async function uploadAllImages() {
  const results = [];
  for (const img of uploadedImages) {
    const res = await apiPost({ action: 'uploadImage', pass: adminPass, data: img.base64, mimeType: img.mime, filename: img.name });
    if (res.error) throw new Error(res.error);
    if (res.url)   results.push(res.url);
  }
  return results;
}

/* ── CREATE LP ────────────────────────────────────── */
async function createLP() {
  const name = document.getElementById('c-name').value.trim();
  const msg  = document.getElementById('c-message').value.trim();
  if (!name) { showToast('Please enter a name', 'error'); return; }

  const btn = document.getElementById('create-btn');
  btn.disabled  = true;
  btn.innerHTML = '<span class="spinner"></span> Uploading...';

  try {
    if (uploadedImages.length > 0) {
      btn.innerHTML = '<span class="spinner"></span> Uploading images...';
      const newURLs  = await uploadAllImages();
      uploadedURLs   = [...uploadedURLs, ...newURLs];
      uploadedImages = [];
      renderPreviews();
    }

    btn.innerHTML = '<span class="spinner"></span> Creating LP...';
    const res = await apiPost({ action: 'createLP', pass: adminPass, name, images: uploadedURLs, custom_message: msg || '' });
    if (res.error) throw new Error(res.error);

    showResult(`${CONFIG.LP_BASE}?id=${res.id}`);
    showToast('LP created! 🎉', 'success');

    document.getElementById('c-name').value    = '';
    document.getElementById('c-message').value = '';
    uploadedImages = [];
    uploadedURLs   = [];
    renderPreviews();
  } catch (err) {
    console.error(err);
    showToast('Error: ' + (err.message || 'Unknown'), 'error');
  } finally {
    btn.disabled  = false;
    btn.innerHTML = '<span>✨ Generate LP</span>';
  }
}

function showResult(url) {
  const card = document.getElementById('result-card');
  card.style.display = 'block';
  document.getElementById('result-link').value = url;
  const qrWrap = document.getElementById('qr-wrap');
  qrWrap.innerHTML = '';
  try {
    new QRCode(qrWrap, { text: url, width: 160, height: 160, colorDark: '#000', colorLight: '#fff', correctLevel: QRCode.CorrectLevel.H });
  } catch (e) { console.error(e); }
}

function downloadQR() {
  const canvas = document.querySelector('#qr-wrap canvas');
  if (!canvas) { showToast('QR not ready', 'error'); return; }
  const a = document.createElement('a');
  a.href     = canvas.toDataURL('image/png');
  a.download = 'lp-qr.png';
  a.click();
}

function shareWA() {
  const link = document.getElementById('result-link').value;
  if (!link) return;
  window.open(`https://wa.me/?text=${encodeURIComponent('🎂 Your Birthday LP is ready! 💖 ' + link)}`, '_blank');
}

/* ── CLIENTS TABLE ────────────────────────────────── */
async function refreshClients() {
  const tbody = document.getElementById('clients-tbody');
  if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="loading-row">Loading...</td></tr>';
  try {
    const data = await apiGet({ action: 'getAllClients', pass: adminPass });
    loadClientsData(data.data || []);
  } catch (err) {
    console.error(err);
    if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="loading-row">Error loading</td></tr>';
  }
}

function loadClientsData(rows) {
  const badge = document.getElementById('badge-clients');
  if (badge) badge.textContent = (rows || []).length;
  const tbody = document.getElementById('clients-tbody');
  if (!tbody) return;
  if (!rows || !rows.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="loading-row">No LPs yet</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map(r => {
    const images = Array.isArray(r.images) ? r.images : [];
    return `<tr>
      <td><strong>${esc(r.name || '')}</strong></td>
      <td style="color:var(--text-dim);font-size:.82rem">${formatDate(r.created_at)}</td>
      <td><span class="status-badge status-${r.status || 'active'}">${r.status || 'active'}</span></td>
      <td>
        <div class="table-img-row">
          ${images.slice(0,3).map(u => `<img class="table-thumb" src="${esc(toProxiedUrl(u))}" onerror="this.style.display='none'" alt=""/>`).join('')}
          ${images.length > 3 ? `<span style="font-size:.75rem;color:var(--text-dim);align-self:center">+${images.length-3}</span>` : ''}
        </div>
      </td>
      <td>
        <div class="action-btns">
          <button class="action-btn" onclick="viewQR('${esc(r.id)}','${esc(r.name)}')">🔗 QR</button>
          <button class="action-btn" onclick="openEdit('${esc(r.id)}','${esc(r.name)}','${esc(r.custom_message||'')}','${esc(r.status||'active')}')">✏️ Edit</button>
          <button class="action-btn danger" onclick="deleteLP('${esc(r.id)}')">🗑 Delete</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

/* ── REQUESTS TABLE ───────────────────────────────── */
// Columns: Name | Phone | Message | Date | Status | Actions
// Newest first. After approve: show QR + Share buttons.

async function refreshRequests() {
  const tbody = document.getElementById('requests-tbody');
  if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="loading-row">Loading...</td></tr>';
  try {
    const data = await apiGet({ action: 'getAllRequests', pass: adminPass });
    loadRequestsData(data.data || []);
  } catch (err) {
    console.error(err);
    if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="loading-row">Error loading</td></tr>';
  }
}

async function loadRequestsData(rows) {
  if (!rows) {
    try { const d = await apiGet({ action: 'getAllRequests', pass: adminPass }); rows = d.data || []; }
    catch (_) { rows = []; }
  }

  // ── Newest first ──
  rows = [...rows].reverse();

  const pending = rows.filter(r => r.status === 'pending').length;
  const badge   = document.getElementById('badge-requests');
  if (badge) badge.textContent = pending || '';

  const tbody = document.getElementById('requests-tbody');
  if (!tbody) return;

  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="loading-row">No requests yet</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map(r => {
    const whatsapp = r.whatsapp || '';
    const cleanWA  = whatsapp.replace(/[^0-9]/g, '');
    const lpUrl    = r.lp_id ? `${CONFIG.LP_BASE}?id=${r.lp_id}` : '';

    // Actions column varies by status
    let actionsHtml = '';
    if (r.status === 'pending') {
      actionsHtml = `
        <button class="action-btn success" onclick="approveRequest('${esc(r.id)}','${esc(whatsapp)}')">✅ Approve</button>
        <button class="action-btn danger"  onclick="rejectRequest('${esc(r.id)}')">✕ Reject</button>`;
    } else if (r.status === 'approved' && r.lp_id) {
      actionsHtml = `
        <button class="action-btn" onclick="viewQR('${esc(r.lp_id)}','${esc(r.name)}')">🔗 QR</button>
        <button class="action-btn" onclick="copyLpLink('${esc(lpUrl)}')">📋 Copy Link</button>
        ${whatsapp ? `<button class="action-btn whatsapp-btn" onclick="sendWhatsApp('${esc(r.lp_id)}','${esc(whatsapp)}','${esc(r.name)}')">📱 Send WA</button>` : ''}`;
    } else if (r.status === 'rejected') {
      actionsHtml = `<span style="color:var(--text-dim);font-size:.8rem">Rejected</span>`;
    }

    return `<tr>
      <td><strong>${esc(r.name || '')}</strong></td>
      <td>
        ${whatsapp
          ? `<a href="https://wa.me/${cleanWA}" target="_blank" style="color:#25d366;text-decoration:none;font-weight:600">📱 ${esc(whatsapp)}</a>`
          : '<span style="color:var(--text-dim)">—</span>'}
        ${r.email ? `<br><span style="font-size:.75rem;color:var(--text-dim)">${esc(r.email)}</span>` : ''}
      </td>
      <td style="max-width:180px;font-size:.85rem;color:var(--text-dim)">${esc((r.message||'').substring(0,80))}${(r.message||'').length>80?'…':''}</td>
      <td style="color:var(--text-dim);font-size:.82rem;white-space:nowrap">${formatDate(r.requested_at)}</td>
      <td><span class="status-badge status-${r.status||'pending'}">${r.status||'pending'}</span></td>
      <td>
        <div class="action-btns">${actionsHtml}</div>
      </td>
    </tr>`;
  }).join('');
}

/* ── APPROVE ──────────────────────────────────────── */
async function approveRequest(id, whatsapp) {
  if (!confirm('Approve this request and create their LP?')) return;
  try {
    const res = await apiPost({ action: 'updateRequestStatus', pass: adminPass, id, status: 'approved' });
    if (res.error) { showToast('Error: ' + res.error, 'error'); return; }
    showToast('Approved! LP created 🎉', 'success');
    // Auto-open WhatsApp if number available
    if (res.lpId && whatsapp) {
      const url   = `${CONFIG.LP_BASE}?id=${res.lpId}`;
      const waMsg = encodeURIComponent(`🎂 Hi! Your Birthday LP is ready! 💖\n\n${url}\n\nEnjoy your special day! 🎉`);
      window.open(`https://wa.me/${whatsapp.replace(/[^0-9]/g,'')}?text=${waMsg}`, '_blank');
    }
    refreshRequests();
  } catch (err) { showToast('Error: ' + err.message, 'error'); }
}

async function rejectRequest(id) {
  if (!confirm('Reject this request?')) return;
  try {
    await apiPost({ action: 'updateRequestStatus', pass: adminPass, id, status: 'rejected' });
    showToast('Request rejected', 'info');
    refreshRequests();
  } catch (err) { showToast('Error: ' + err.message, 'error'); }
}

function copyLpLink(url) {
  if (!url) { showToast('No LP link available', 'error'); return; }
  navigator.clipboard.writeText(url).then(() => showToast('Link copied! ✓', 'success')).catch(() => {
    // fallback
    const el = document.createElement('input');
    el.value = url;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    showToast('Link copied! ✓', 'success');
  });
}

function sendWhatsApp(lpId, whatsapp, name) {
  if (!whatsapp) { showToast('No WhatsApp number available', 'error'); return; }
  const url      = `${CONFIG.LP_BASE}?id=${lpId}`;
  const modal    = document.getElementById('send-wa-modal');
  const linkInput = document.getElementById('send-wa-link');
  const actionBtn = document.getElementById('send-wa-action-btn');
  if (linkInput)  linkInput.value = url;
  const cleanNumber = whatsapp.replace(/[^0-9]/g, '');
  const waMsg       = encodeURIComponent(`🎂 Hi ${name || ''}! Your Birthday LP is ready! 💖\n\n${url}\n\nEnjoy your special day! 🎉`);
  if (actionBtn) {
    actionBtn.onclick = () => {
      window.open(`https://wa.me/${cleanNumber}?text=${waMsg}`, '_blank');
      if (modal) modal.style.display = 'none';
    };
  }
  if (modal) modal.style.display = 'flex';
}

/* ── EDIT MODAL ───────────────────────────────────── */
function openEdit(id, name, msg, status) {
  document.getElementById('edit-id').value      = id     || '';
  document.getElementById('edit-name').value    = name   || '';
  document.getElementById('edit-message').value = msg    || '';
  document.getElementById('edit-status').value  = status || 'active';
  document.getElementById('edit-modal').style.display = 'flex';
}

async function saveEdit() {
  const id = document.getElementById('edit-id').value;
  try {
    const res = await apiPost({
      action: 'updateLP', pass: adminPass, id,
      name:           document.getElementById('edit-name').value    || '',
      custom_message: document.getElementById('edit-message').value || '',
      status:         document.getElementById('edit-status').value  || 'active'
    });
    if (res.error) { showToast('Error: ' + res.error, 'error'); return; }
    showToast('Saved! ✓', 'success');
    document.getElementById('edit-modal').style.display = 'none';
    refreshClients();
  } catch (err) { showToast('Error: ' + err.message, 'error'); }
}

async function deleteLP(id) {
  if (!confirm('Delete this LP permanently?')) return;
  try {
    const res = await apiGet({ action: 'deleteClient', pass: adminPass, id });
    if (res.error) { showToast('Error: ' + res.error, 'error'); return; }
    showToast('Deleted', 'info');
    refreshClients();
  } catch (err) { showToast('Error: ' + err.message, 'error'); }
}

/* ── QR MODAL ─────────────────────────────────────── */
function viewQR(id, name) {
  const url  = `${CONFIG.LP_BASE}?id=${id}`;
  document.getElementById('modal-link').value = url;
  const wrap = document.getElementById('modal-qr-wrap');
  wrap.innerHTML = '';
  try {
    new QRCode(wrap, { text: url, width: 180, height: 180, colorDark: '#000', colorLight: '#fff', correctLevel: QRCode.CorrectLevel.H });
  } catch (e) { console.error(e); }
  const waBtn = document.getElementById('modal-wa-btn');
  if (waBtn) waBtn.onclick = () => window.open(`https://wa.me/?text=${encodeURIComponent('🎂 Happy Birthday LP for '+(name||'')+'! 💖 '+url)}`, '_blank');
  const check = setInterval(() => {
    const dlCanvas = wrap.querySelector('canvas');
    if (dlCanvas) {
      clearInterval(check);
      const dlBtn = document.getElementById('modal-dl-btn');
      if (dlBtn) dlBtn.onclick = () => {
        const a = document.createElement('a');
        a.href     = dlCanvas.toDataURL('image/png');
        a.download = `lp-qr-${id}.png`;
        a.click();
      };
    }
  }, 100);
  document.getElementById('qr-modal').style.display = 'flex';
}

/* ── UTILS ────────────────────────────────────────── */
function closeModal(e) { if (e.target.classList.contains('modal-overlay')) e.target.style.display = 'none'; }

function copyText(inputId) {
  const el = document.getElementById(inputId);
  if (!el) return;
  el.select();
  document.execCommand('copy');
  showToast('Copied! ✓', 'success');
}

function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function formatDate(str) {
  if (!str) return '—';
  try { return new Date(str).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch (_) { return String(str); }
}

let toastTimer;
function showToast(msg, type = 'info') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg || '';
  t.className   = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.className = 'toast', 3000);
}

// Drag-and-drop on upload zone
const zone = document.getElementById('upload-zone');
if (zone) {
  zone.addEventListener('dragover',  e => { e.preventDefault(); zone.style.borderColor = 'var(--pink)'; });
  zone.addEventListener('dragleave', () => { zone.style.borderColor = ''; });
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.style.borderColor = '';
    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files.length) handleImages({ target: { files: dt.files, value: '' } });
  });
}