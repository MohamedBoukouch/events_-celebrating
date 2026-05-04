/* =====================================================
   LP ADMIN DASHBOARD — JavaScript (FULLY FIXED v2)
   ===================================================== */

const CONFIG = {
  API_URL: 'https://events-celebrating.vercel.app/api/proxy',
  LP_BASE: 'https://events-celebrating.vercel.app/lp.html',
  ADMIN_PASS: '0000'
};

let uploadedImages = [];
let uploadedURLs = [];
let currentTab = 'create';
let adminPass = '';

// ── LOGIN ──────────────────────────────────────────────────
document.getElementById('pass-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') doLogin();
});

function doLogin() {
  const val = document.getElementById('pass-input').value.trim();
  if (!val) { showErr('Please enter your password'); return; }
  adminPass = val;
  document.getElementById('login-btn').innerHTML = '<span class="spinner"></span>';
  apiGet({ action: 'getAllClients', pass: adminPass })
    .then(data => {
      if (data.error) {
        showErr('Wrong password');
        document.getElementById('login-btn').innerHTML = 'Enter →';
        return;
      }
      document.getElementById('login-screen').classList.add('hidden');
      document.getElementById('dashboard').classList.remove('hidden');
      loadClientsData(data.data || []);
      loadRequestsData([]);
    })
    .catch(() => {
      showErr('Connection error');
      document.getElementById('login-btn').innerHTML = 'Enter →';
    });
}

function showErr(msg) { document.getElementById('login-err').textContent = msg; }

function logout() {
  adminPass = '';
  document.getElementById('pass-input').value = '';
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('dashboard').classList.add('hidden');
}

// ── API HELPERS ────────────────────────────────────────────
async function apiGet(params) {
  const url = new URL(CONFIG.API_URL);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  return res.json();
}

async function apiPost(body) {
  const res = await fetch(CONFIG.API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.json();
}

// ── SIDEBAR & TABS ─────────────────────────────────────────
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

function switchTab(tab, btn) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.sb-item').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  if (btn) btn.classList.add('active');
  currentTab = tab;
  document.getElementById('top-bar-title').textContent =
    tab === 'create' ? 'Create LP' : tab === 'clients' ? 'All LPs' : 'Requests';
  if (window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('open');
  if (tab === 'clients') refreshClients();
  if (tab === 'requests') refreshRequests();
}

function refreshData() {
  if (currentTab === 'clients') refreshClients();
  if (currentTab === 'requests') refreshRequests();
  showToast('Refreshed', 'info');
}

// ── IMAGE UPLOAD (Create LP) ───────────────────────────────
function handleImages(e) {
  const files = Array.from(e.target.files);
  const allowed = 6 - uploadedImages.length - uploadedURLs.length;
  files.slice(0, allowed).forEach(file => {
    if (file.size > 5 * 1024 * 1024) { showToast('Image too large (max 5MB)', 'error'); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target.result;
      const base64 = dataUrl.split(',')[1];
      uploadedImages.push({ base64, mime: file.type, name: file.name, preview: dataUrl });
      renderPreviews();
    };
    reader.readAsDataURL(file);
  });
  e.target.value = '';
}

function renderPreviews() {
  const wrap = document.getElementById('image-previews');
  wrap.innerHTML = '';
  const all = [
    ...uploadedURLs.map(u => ({ type: 'url', url: u })),
    ...uploadedImages.map(i => ({ type: 'local', url: i.preview }))
  ];
  all.forEach((item, i) => {
    const div = document.createElement('div');
    div.className = 'img-thumb';
    div.innerHTML = `<img src="${item.url}" alt=""/>
      <button class="img-thumb-del" onclick="removeImage(${i}, '${item.type}')">✕</button>`;
    wrap.appendChild(div);
  });
}

function removeImage(idx, type) {
  if (type === 'url') { uploadedURLs.splice(idx, 1); }
  else { const localIdx = idx - uploadedURLs.length; uploadedImages.splice(localIdx, 1); }
  renderPreviews();
}

async function uploadAllImages() {
  const results = [];
  for (const img of uploadedImages) {
    const res = await apiPost({
      action: 'uploadImage',
      pass: adminPass,
      data: img.base64,
      mimeType: img.mime,
      filename: img.name
    });
    if (res.error) throw new Error(res.error);
    results.push(res.url);
  }
  return results;
}

// ── CREATE LP ──────────────────────────────────────────────
async function createLP() {
  const name = document.getElementById('c-name').value.trim();
  const msg = document.getElementById('c-message').value.trim();
  if (!name) { showToast('Please enter a name', 'error'); return; }

  const btn = document.getElementById('create-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Uploading images...';

  try {
    let newURLs = [];
    if (uploadedImages.length > 0) {
      newURLs = await uploadAllImages();
      uploadedURLs = [...uploadedURLs, ...newURLs];
      uploadedImages = [];
    }

    btn.innerHTML = '<span class="spinner"></span> Creating LP...';
    const res = await apiPost({
      action: 'createLP',
      pass: adminPass,
      name,
      images: uploadedURLs,
      custom_message: msg
    });

    if (res.error) throw new Error(res.error);

    const lpUrl = `${CONFIG.LP_BASE}?id=${res.id}`;
    showResult(lpUrl);
    showToast('LP created! 🎉', 'success');

    document.getElementById('c-name').value = '';
    document.getElementById('c-message').value = '';
    uploadedImages = [];
    uploadedURLs = [];
    renderPreviews();

  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>✨ Generate LP</span>';
  }
}

function showResult(url) {
  const card = document.getElementById('result-card');
  card.style.display = 'block';
  document.getElementById('result-link').value = url;

  const qrWrap = document.getElementById('qr-wrap');
  qrWrap.innerHTML = '';
  new QRCode(qrWrap, {
    text: url, width: 160, height: 160,
    colorDark: '#000', colorLight: '#fff',
    correctLevel: QRCode.CorrectLevel.H
  });
}

function downloadQR() {
  const canvas = document.querySelector('#qr-wrap canvas');
  if (!canvas) { showToast('QR not ready', 'error'); return; }
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = 'lp-qr.png';
  a.click();
}

function shareWA() {
  const link = document.getElementById('result-link').value;
  window.open(`https://wa.me/?text=${encodeURIComponent('🎂 Your Birthday LP is ready! 💖 ' + link)}`, '_blank');
}

// ── CLIENTS TABLE ──────────────────────────────────────────
async function refreshClients() {
  document.getElementById('clients-tbody').innerHTML =
    '<tr><td colspan="5" class="loading-row">Loading...</td></tr>';
  try {
    const data = await apiGet({ action: 'getAllClients', pass: adminPass });
    loadClientsData(data.data || []);
  } catch (err) {
    document.getElementById('clients-tbody').innerHTML =
      `<tr><td colspan="5" class="loading-row">Error: ${err.message}</td></tr>`;
  }
}

function loadClientsData(rows) {
  rows = [...rows].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  document.getElementById('badge-clients').textContent = rows.length;

  const tbody = document.getElementById('clients-tbody');
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="loading-row">No LPs yet</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map(r => {
    const imgs = Array.isArray(r.images) ? r.images : parseImagesClient(r.images);
    const idSafe = esc(r.id || '');
    const nameSafe = esc(r.name || '');
    const msgSafe = esc(r.custom_message || '');
    const status = r.status || 'active';
    return `
    <tr>
      <td><strong>${nameSafe}</strong></td>
      <td style="color:var(--text-dim);font-size:.82rem">${formatDate(r.created_at)}</td>
      <td><span class="status-badge status-${status}">${status}</span></td>
      <td>
        <div class="table-img-row">
          ${imgs.slice(0, 3).map(u => `<img class="table-thumb" src="${u}" onerror="this.style.display='none'" alt=""/>`).join('')}
          ${imgs.length > 3 ? `<span style="font-size:.75rem;color:var(--text-dim);align-self:center">+${imgs.length - 3}</span>` : ''}
        </div>
      </td>
      <td>
        <div class="action-btns">
          <button class="action-btn" onclick="viewQR('${idSafe}','${nameSafe}')">🔗 QR</button>
          <button class="action-btn" onclick="openEdit('${idSafe}','${nameSafe}','${msgSafe}','${status}')">✏️ Edit</button>
          <button class="action-btn danger" onclick="deleteLP('${idSafe}')">🗑 Delete</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

// Helper: parse images field that might be a comma-separated string or JSON
function parseImagesClient(field) {
  if (!field) return [];
  if (Array.isArray(field)) return field.filter(Boolean);
  if (typeof field === 'string') {
    if (!field.trim()) return [];
    try {
      const p = JSON.parse(field);
      if (Array.isArray(p)) return p.filter(Boolean);
    } catch (e) {}
    return field.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
}

// ── REQUESTS TABLE ─────────────────────────────────────────
async function refreshRequests() {
  document.getElementById('requests-tbody').innerHTML =
    '<tr><td colspan="7" class="loading-row">Loading...</td></tr>';
  try {
    const data = await apiGet({ action: 'getAllRequests', pass: adminPass });
    loadRequestsData(data.data || []);
  } catch (err) {
    document.getElementById('requests-tbody').innerHTML =
      `<tr><td colspan="7" class="loading-row">Error: ${err.message}</td></tr>`;
  }
}

function loadRequestsData(rows) {
  rows = [...rows].sort((a, b) => new Date(b.requested_at || 0) - new Date(a.requested_at || 0));

  const pending = rows.filter(r => r.status === 'pending').length;
  document.getElementById('badge-requests').textContent = pending || '';

  const tbody = document.getElementById('requests-tbody');
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="loading-row">No requests yet</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map(r => {
    // ✅ FIX: GAS now returns images as array; still handle string fallback
    const imgs = Array.isArray(r.images) ? r.images.filter(Boolean) : parseImagesClient(r.images);
    const idSafe = esc(r.id || '');
    const nameSafe = esc(r.name || '');
    const waSafe = esc(r.whatsapp || '');
    const lpIdSafe = esc(r.lp_id || '');
    const status = r.status || 'pending';

    // ✅ FIX: WhatsApp number display + direct chat link
    const waDisplay = r.whatsapp
      ? `<a href="${buildWALink(r.whatsapp)}" target="_blank" style="color:var(--success);text-decoration:none">📱 ${esc(r.whatsapp)}</a>`
      : '—';
    const emailDisplay = r.email
      ? `<br><span style="font-size:.78rem;color:var(--text-dim)">${esc(r.email)}</span>`
      : '';

    const msgText = r.message || '';
    const msgDisplay = esc(msgText.substring(0, 80)) + (msgText.length > 80 ? '…' : '');

    const imgHtml = imgs.length > 0
      ? imgs.slice(0, 3).map(u =>
          `<img class="table-thumb" src="${u}"
            onerror="this.onerror=null;this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22><rect width=%2240%22 height=%2240%22 fill=%22%23ff2d78%22/><text x=%2220%22 y=%2225%22 font-size=%2220%22 text-anchor=%22middle%22 fill=%22white%22>📷</text></svg>'"
            alt=""/>`
        ).join('') + (imgs.length > 3 ? `<span style="font-size:.75rem;color:var(--text-dim);align-self:center">+${imgs.length - 3}</span>` : '')
      : '<span style="font-size:.8rem;color:var(--text-dim)">No images</span>';

    let actionBtns = '';
    if (status === 'pending') {
      actionBtns = `
        <button class="action-btn success" data-approve-id="${idSafe}" data-approve-wa="${waSafe}" data-approve-name="${nameSafe}" onclick="handleApprove(this)">✅ Approve</button>
        <button class="action-btn danger" data-reject-id="${idSafe}" onclick="handleReject(this)">✕ Reject</button>`;
    } else if (status === 'approved') {
      actionBtns = `
        <button class="action-btn" data-qr-id="${lpIdSafe}" data-qr-name="${nameSafe}" onclick="handleViewQR(this)">🔗 QR</button>
        <button class="action-btn whatsapp-btn" data-share-lp="${lpIdSafe}" data-share-wa="${waSafe}" data-share-name="${nameSafe}" onclick="handleSendWA(this)">📱 Send WA</button>`;
    }

    return `
    <tr>
      <td><strong>${nameSafe}</strong></td>
      <td>${waDisplay}${emailDisplay}</td>
      <td><div class="table-img-row">${imgHtml}</div></td>
      <td style="max-width:180px;font-size:.85rem;color:var(--text-dim)">${msgDisplay || '—'}</td>
      <td style="color:var(--text-dim);font-size:.82rem">${formatDate(r.requested_at)}</td>
      <td><span class="status-badge status-${status}">${status}</span></td>
      <td><div class="action-btns">${actionBtns}</div></td>
    </tr>`;
  }).join('');
}

// ✅ FIX: Build direct WhatsApp chat link — strips leading 0, adds +212
function buildWALink(phone, message) {
  if (!phone) return 'https://wa.me/';
  // Remove spaces, dashes, dots
  let clean = String(phone).replace(/[\s\-\.]/g, '');
  // If starts with 0, replace with 212 (Morocco)
  if (clean.startsWith('0')) clean = '212' + clean.substring(1);
  // If already has + prefix, strip it
  if (clean.startsWith('+')) clean = clean.substring(1);
  const url = 'https://wa.me/' + clean;
  return message ? url + '?text=' + encodeURIComponent(message) : url;
}

// data-attribute–based handlers
function handleApprove(btn) {
  const id = btn.dataset.approveId;
  const wa = btn.dataset.approveWa;
  const name = btn.dataset.approveName;
  approveRequest(id, wa, name);
}
function handleReject(btn) {
  rejectRequest(btn.dataset.rejectId);
}
function handleViewQR(btn) {
  viewQR(btn.dataset.qrId, btn.dataset.qrName);
}
function handleSendWA(btn) {
  openShareModal(btn.dataset.shareLp, btn.dataset.shareWa, btn.dataset.shareName);
}

// ── APPROVE REQUEST ────────────────────────────────────────
async function approveRequest(id, whatsapp, name) {
  if (!confirm(`Approve request for ${name} and create their LP?`)) return;
  try {
    const res = await apiPost({
      action: 'updateRequestStatus',
      pass: adminPass,
      id,
      status: 'approved'
    });
    if (res.error) { showToast('Error: ' + res.error, 'error'); return; }

    showToast('Approved! LP created 🎉', 'success');
    await refreshRequests();

    if (res.lpId) {
      openShareModal(res.lpId, whatsapp, name);
    }
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}

async function rejectRequest(id) {
  if (!confirm('Reject this request?')) return;
  try {
    await apiPost({ action: 'updateRequestStatus', pass: adminPass, id, status: 'rejected' });
    showToast('Request rejected', 'info');
    refreshRequests();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}

// ── SHARE MODAL ────────────────────────────────────────────
function openShareModal(lpId, whatsapp, name) {
  if (!lpId) { showToast('LP ID missing', 'error'); return; }

  const url = `${CONFIG.LP_BASE}?id=${lpId}`;

  document.getElementById('share-modal-name').textContent = `LP for ${name}`;
  document.getElementById('share-modal-link').value = url;

  // Build QR
  const qrWrap = document.getElementById('share-modal-qr');
  qrWrap.innerHTML = '';
  new QRCode(qrWrap, {
    text: url, width: 160, height: 160,
    colorDark: '#000', colorLight: '#fff',
    correctLevel: QRCode.CorrectLevel.H
  });

  // Download button — wait for canvas to render
  const dlBtn = document.getElementById('share-modal-dl-btn');
  dlBtn.style.display = 'none';
  setTimeout(() => {
    const canvas = qrWrap.querySelector('canvas');
    if (canvas) {
      dlBtn.style.display = '';
      dlBtn.onclick = () => {
        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        a.download = `lp-qr-${lpId}.png`;
        a.click();
      };
    }
  }, 400);

  // ✅ FIX: WhatsApp button opens DIRECT chat to user's phone number
  const waMsg = `🎂 Joyeux anniversaire ${name}! 💖\n\nTon LP est prêt ici :\n${url}\n\nProfite bien de ta journée spéciale! 🎉`;
  const waBtn = document.getElementById('share-modal-wa-btn');
  waBtn.style.display = '';
  waBtn.onclick = () => window.open(buildWALink(whatsapp, waMsg), '_blank');

  document.getElementById('share-modal').style.display = 'flex';
}

// ── EDIT MODAL ─────────────────────────────────────────────
function openEdit(id, name, msg, status) {
  document.getElementById('edit-id').value = id;
  document.getElementById('edit-name').value = name;
  document.getElementById('edit-message').value = msg;
  document.getElementById('edit-status').value = status;
  document.getElementById('edit-modal').style.display = 'flex';
}

async function saveEdit() {
  const id = document.getElementById('edit-id').value;
  try {
    const res = await apiPost({
      action: 'updateLP', pass: adminPass,
      id,
      name: document.getElementById('edit-name').value,
      custom_message: document.getElementById('edit-message').value,
      status: document.getElementById('edit-status').value
    });
    if (res.error) { showToast('Error: ' + res.error, 'error'); return; }
    showToast('Saved! ✓', 'success');
    document.getElementById('edit-modal').style.display = 'none';
    refreshClients();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}

async function deleteLP(id) {
  if (!confirm('Delete this LP permanently?')) return;
  try {
    const res = await apiGet({ action: 'deleteClient', pass: adminPass, id });
    if (res.error) { showToast('Error: ' + res.error, 'error'); return; }
    showToast('Deleted', 'info');
    refreshClients();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}

// ── QR MODAL ───────────────────────────────────────────────
function viewQR(id, name) {
  if (!id) { showToast('LP ID not available', 'error'); return; }
  const url = `${CONFIG.LP_BASE}?id=${id}`;
  document.getElementById('modal-link').value = url;

  const wrap = document.getElementById('modal-qr-wrap');
  wrap.innerHTML = '';
  new QRCode(wrap, {
    text: url, width: 180, height: 180,
    colorDark: '#000', colorLight: '#fff',
    correctLevel: QRCode.CorrectLevel.H
  });

  document.getElementById('modal-wa-btn').onclick = () =>
    window.open(`https://wa.me/?text=${encodeURIComponent('🎂 Happy Birthday LP for ' + name + '! 💖 ' + url)}`, '_blank');

  const checkCanvas = setInterval(() => {
    const dlCanvas = wrap.querySelector('canvas');
    if (dlCanvas) {
      clearInterval(checkCanvas);
      document.getElementById('modal-dl-btn').onclick = () => {
        const a = document.createElement('a');
        a.href = dlCanvas.toDataURL('image/png');
        a.download = `lp-qr-${id}.png`;
        a.click();
      };
    }
  }, 100);

  document.getElementById('qr-modal').style.display = 'flex';
}

// ── UTILS ──────────────────────────────────────────────────
function closeModal(e) {
  if (e.target.classList.contains('modal-overlay'))
    e.target.style.display = 'none';
}

function copyText(inputId) {
  const el = document.getElementById(inputId);
  el.select();
  document.execCommand('copy');
  showToast('Copied! ✓', 'success');
}

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ✅ FIX: formatDate — handles ISO strings, Date objects, and bad values gracefully
function formatDate(str) {
  if (!str) return '—';
  try {
    const d = new Date(str);
    if (isNaN(d.getTime())) return String(str);
    return d.toLocaleDateString('fr-MA', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  } catch { return String(str); }
}

let toastTimer;
function showToast(msg, type = 'info') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.className = 'toast', 3000);
}

// ── DRAG & DROP UPLOAD ─────────────────────────────────────
const zone = document.getElementById('upload-zone');
if (zone) {
  zone.addEventListener('dragover', e => {
    e.preventDefault();
    zone.style.borderColor = 'var(--pink)';
  });
  zone.addEventListener('dragleave', () => {
    zone.style.borderColor = '';
  });
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.style.borderColor = '';
    const dt = e.dataTransfer;
    if (dt.files.length) handleImages({ target: { files: dt.files, value: '' } });
  });
}