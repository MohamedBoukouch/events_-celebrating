/* =====================================================
   LP ADMIN DASHBOARD — JavaScript
   ===================================================== */

// ── CONFIG ─────────────────────────────────────────────────
const CONFIG = {
  // After deploying Apps Script, paste the Web App URL here:
  API_URL: 'https://script.google.com/macros/s/AKfycbxkFWtau_RwS5xKCdXZ5d6XzNqvnNJnejvOuhXr947xDc0A6XtGDQXLrORjjxjbL940/exec',
  // Your GitHub Pages base URL (where lp.html lives):
  LP_BASE: 'https://events-celebrating.vercel.app/lp.html',
  // Admin password (must match Code.gs ADMIN_PASS):
  ADMIN_PASS: '0000'
};

// ── STATE ──────────────────────────────────────────────────
let uploadedImages  = []; // base64 objects waiting to upload
let uploadedURLs    = []; // final Drive URLs
let isUploading     = false;
let currentTab      = 'create';
let adminPass       = '';

// ── LOGIN ──────────────────────────────────────────────────
document.getElementById('pass-input').addEventListener('keydown', e => {
  if(e.key === 'Enter') doLogin();
});

function doLogin(){
  const val = document.getElementById('pass-input').value.trim();
  if(!val){ showErr('Please enter your password'); return; }
  adminPass = val;
  // Quick validation — try fetching clients
  document.getElementById('login-btn').innerHTML = '<span class="spinner"></span>';
  apiGet({ action:'getAllClients', pass: adminPass })
    .then(data => {
      if(data.error){ showErr('Wrong password'); document.getElementById('login-btn').innerHTML='Enter →'; return; }
      document.getElementById('login-screen').classList.add('hidden');
      document.getElementById('dashboard').classList.remove('hidden');
      loadClientsData(data.data);
      loadRequestsData();
    })
    .catch(() => { showErr('Connection error — check API_URL in config'); document.getElementById('login-btn').innerHTML='Enter →'; });
}
function showErr(msg){ document.getElementById('login-err').textContent = msg; }
function logout(){
  adminPass = '';
  document.getElementById('pass-input').value = '';
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('dashboard').classList.add('hidden');
}

// ── API HELPERS ────────────────────────────────────────────
async function apiGet(params){
  const url = new URL(CONFIG.API_URL);
  Object.entries(params).forEach(([k,v]) => url.searchParams.set(k,v));
  const res = await fetch(url.toString());
  return res.json();
}
async function apiPost(body){
  const res = await fetch(CONFIG.API_URL, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(body)
  });
  return res.json();
}

// ── SIDEBAR & TABS ─────────────────────────────────────────
function toggleSidebar(){
  document.getElementById('sidebar').classList.toggle('open');
}
function switchTab(tab, btn){
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.sb-item').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-'+tab).classList.add('active');
  if(btn) btn.classList.add('active');
  currentTab = tab;
  document.getElementById('top-bar-title').textContent =
    tab === 'create' ? 'Create LP' : tab === 'clients' ? 'All LPs' : 'Requests';
  // Close sidebar on mobile
  if(window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('open');
  if(tab === 'clients')  refreshClients();
  if(tab === 'requests') refreshRequests();
}

function refreshData(){
  if(currentTab === 'clients')  refreshClients();
  if(currentTab === 'requests') refreshRequests();
  showToast('Refreshed', 'info');
}

// ── IMAGE UPLOAD ───────────────────────────────────────────
function handleImages(e){
  const files = Array.from(e.target.files);
  const allowed = 6 - uploadedImages.length - uploadedURLs.length;
  files.slice(0, allowed).forEach(file => {
    if(file.size > 5*1024*1024){ showToast('Image too large (max 5MB)', 'error'); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target.result;
      const base64  = dataUrl.split(',')[1];
      const mime    = file.type;
      const name    = file.name;
      uploadedImages.push({ base64, mime, name, preview: dataUrl });
      renderPreviews();
    };
    reader.readAsDataURL(file);
  });
  e.target.value = '';
}

function renderPreviews(){
  const wrap = document.getElementById('image-previews');
  wrap.innerHTML = '';
  const all = [
    ...uploadedURLs.map(u => ({ type:'url', url:u })),
    ...uploadedImages.map(i => ({ type:'local', url:i.preview, idx:uploadedImages.indexOf(i) }))
  ];
  all.forEach((item, i) => {
    const div = document.createElement('div');
    div.className = 'img-thumb';
    div.innerHTML = `<img src="${item.url}" alt=""/>
      <button class="img-thumb-del" onclick="removeImage(${i}, '${item.type}')">✕</button>`;
    wrap.appendChild(div);
  });
}

function removeImage(idx, type){
  if(type === 'url'){
    uploadedURLs.splice(idx, 1);
  } else {
    const localIdx = idx - uploadedURLs.length;
    uploadedImages.splice(localIdx, 1);
  }
  renderPreviews();
}

// ── UPLOAD ALL PENDING IMAGES ──────────────────────────────
async function uploadAllImages(){
  const results = [];
  for(const img of uploadedImages){
    const res = await apiPost({
      action:'uploadImage',
      pass: adminPass,
      data: img.base64,
      mimeType: img.mime,
      filename: img.name
    });
    if(res.error) throw new Error(res.error);
    results.push(res.url);
  }
  return results;
}

// ── CREATE LP ──────────────────────────────────────────────
async function createLP(){
  const name = document.getElementById('c-name').value.trim();
  const msg  = document.getElementById('c-message').value.trim();
  if(!name){ showToast('Please enter a name', 'error'); return; }

  const btn = document.getElementById('create-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Uploading images...';

  try{
    // Upload local images first
    let newURLs = [];
    if(uploadedImages.length > 0){
      newURLs = await uploadAllImages();
      uploadedURLs = [...uploadedURLs, ...newURLs];
      uploadedImages = [];
    }

    btn.innerHTML = '<span class="spinner"></span> Creating LP...';
    const res = await apiPost({
      action:'createLP',
      pass: adminPass,
      name,
      images: uploadedURLs,
      custom_message: msg
    });

    if(res.error) throw new Error(res.error);

    const lpUrl = `${CONFIG.LP_BASE}?id=${res.id}`;
    showResult(lpUrl);
    showToast('LP created! 🎉', 'success');

    // Reset form
    document.getElementById('c-name').value  = '';
    document.getElementById('c-message').value = '';
    uploadedImages = [];
    uploadedURLs   = [];
    renderPreviews();

  } catch(err){
    showToast('Error: ' + err.message, 'error');
  } finally{
    btn.disabled = false;
    btn.innerHTML = '<span>✨ Generate LP</span>';
  }
}

function showResult(url){
  const card = document.getElementById('result-card');
  card.style.display = 'block';
  document.getElementById('result-link').value = url;

  // QR Code
  const qrWrap = document.getElementById('qr-wrap');
  qrWrap.innerHTML = '';
  new QRCode(qrWrap, {
    text: url,
    width: 160, height: 160,
    colorDark:'#000', colorLight:'#fff',
    correctLevel: QRCode.CorrectLevel.H
  });
}

function downloadQR(){
  const canvas = document.querySelector('#qr-wrap canvas');
  if(!canvas){ showToast('QR not ready', 'error'); return; }
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = 'lp-qr.png';
  a.click();
}

function shareWA(){
  const link = document.getElementById('result-link').value;
  window.open(`https://wa.me/?text=${encodeURIComponent('🎂 Your Birthday LP is ready! 💖 ' + link)}`, '_blank');
}

// ── CLIENTS TABLE ──────────────────────────────────────────
async function refreshClients(){
  document.getElementById('clients-tbody').innerHTML =
    '<tr><td colspan="5" class="loading-row">Loading...</td></tr>';
  const data = await apiGet({ action:'getAllClients', pass: adminPass });
  loadClientsData(data.data || []);
}

function loadClientsData(rows){
  const badge = document.getElementById('badge-clients');
  badge.textContent = rows.length;

  const tbody = document.getElementById('clients-tbody');
  if(!rows.length){
    tbody.innerHTML = '<tr><td colspan="5" class="loading-row">No LPs yet</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td><strong>${esc(r.name)}</strong></td>
      <td style="color:var(--text-dim);font-size:.82rem">${formatDate(r.created_at)}</td>
      <td><span class="status-badge status-${r.status}">${r.status}</span></td>
      <td>
        <div class="table-img-row">
          ${(r.images||[]).slice(0,3).map(u=>`<img class="table-thumb" src="${u}" onerror="this.style.display='none'" alt=""/>`).join('')}
          ${(r.images||[]).length>3 ? `<span style="font-size:.75rem;color:var(--text-dim);align-self:center">+${r.images.length-3}</span>` : ''}
        </div>
      </td>
      <td>
        <div class="action-btns">
          <button class="action-btn" onclick="viewQR('${r.id}','${esc(r.name)}')">🔗 QR</button>
          <button class="action-btn" onclick="openEdit('${r.id}','${esc(r.name)}','${esc(r.custom_message||'')}','${r.status}')">✏️ Edit</button>
          <button class="action-btn danger" onclick="deleteLP('${r.id}')">🗑 Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ── REQUESTS TABLE ─────────────────────────────────────────
async function refreshRequests(){
  document.getElementById('requests-tbody').innerHTML =
    '<tr><td colspan="5" class="loading-row">Loading...</td></tr>';
  const data = await apiGet({ action:'getAllRequests', pass: adminPass });
  loadRequestsData(data.data || []);
}

async function loadRequestsData(rows){
  if(!rows){
    const data = await apiGet({ action:'getAllRequests', pass: adminPass });
    rows = data.data || [];
  }
  const pending = rows.filter(r=>r.status==='pending').length;
  document.getElementById('badge-requests').textContent = pending || '';

  const tbody = document.getElementById('requests-tbody');
  if(!rows.length){
    tbody.innerHTML = '<tr><td colspan="5" class="loading-row">No requests yet</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td><strong>${esc(r.name)}</strong>${r.email?`<br><span style="font-size:.78rem;color:var(--text-dim)">${esc(r.email)}</span>`:''}</td>
      <td style="max-width:180px;font-size:.85rem;color:var(--text-dim)">${esc(r.message||'—').substring(0,80)}${(r.message||'').length>80?'…':''}</td>
      <td style="color:var(--text-dim);font-size:.82rem">${formatDate(r.requested_at)}</td>
      <td><span class="status-badge status-${r.status}">${r.status}</span></td>
      <td>
        <div class="action-btns">
          ${r.status==='pending' ? `
            <button class="action-btn success" onclick="approveRequest('${r.id}')">✅ Approve</button>
            <button class="action-btn danger"  onclick="rejectRequest('${r.id}')">✕ Reject</button>
          ` : `
            ${r.status==='approved' ? `<button class="action-btn" onclick="viewQR('lp_from_req_${r.id}','${esc(r.name)}')">🔗 QR</button>` : ''}
          `}
        </div>
      </td>
    </tr>
  `).join('');
}

async function approveRequest(id){
  if(!confirm('Approve this request and create their LP?')) return;
  const res = await apiPost({ action:'updateRequestStatus', pass:adminPass, id, status:'approved' });
  if(res.error){ showToast('Error: '+res.error,'error'); return; }
  showToast('Approved! LP created 🎉', 'success');
  if(res.lpId){
    const url = `${CONFIG.LP_BASE}?id=${res.lpId}`;
    showToast(`LP: ${url}`, 'info');
    viewQR(res.lpId, 'New LP');
  }
  refreshRequests();
}
async function rejectRequest(id){
  if(!confirm('Reject this request?')) return;
  await apiPost({ action:'updateRequestStatus', pass:adminPass, id, status:'rejected' });
  showToast('Request rejected', 'info');
  refreshRequests();
}

// ── EDIT MODAL ─────────────────────────────────────────────
function openEdit(id, name, msg, status){
  document.getElementById('edit-id').value     = id;
  document.getElementById('edit-name').value   = name;
  document.getElementById('edit-message').value= msg;
  document.getElementById('edit-status').value = status;
  document.getElementById('edit-modal').style.display = 'flex';
}
async function saveEdit(){
  const id  = document.getElementById('edit-id').value;
  const res = await apiPost({
    action:'updateLP', pass:adminPass,
    id,
    name:   document.getElementById('edit-name').value,
    custom_message: document.getElementById('edit-message').value,
    status: document.getElementById('edit-status').value
  });
  if(res.error){ showToast('Error: '+res.error,'error'); return; }
  showToast('Saved! ✓', 'success');
  document.getElementById('edit-modal').style.display = 'none';
  refreshClients();
}

async function deleteLP(id){
  if(!confirm('Delete this LP permanently?')) return;
  const res = await apiGet({ action:'deleteClient', pass:adminPass, id });
  if(res.error){ showToast('Error: '+res.error,'error'); return; }
  showToast('Deleted', 'info');
  refreshClients();
}

// ── QR MODAL ───────────────────────────────────────────────
function viewQR(id, name){
  const url = `${CONFIG.LP_BASE}?id=${id}`;
  document.getElementById('modal-link').value = url;

  const wrap = document.getElementById('modal-qr-wrap');
  wrap.innerHTML = '';
  new QRCode(wrap, {
    text:url, width:180, height:180,
    colorDark:'#000', colorLight:'#fff',
    correctLevel: QRCode.CorrectLevel.H
  });

  document.getElementById('modal-wa-btn').onclick = () =>
    window.open(`https://wa.me/?text=${encodeURIComponent('🎂 Happy Birthday LP for '+name+'! 💖 '+url)}`, '_blank');

  let dlCanvas = null;
  const checkCanvas = setInterval(() => {
    dlCanvas = wrap.querySelector('canvas');
    if(dlCanvas){
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
function closeModal(e){
  if(e.target.classList.contains('modal-overlay'))
    e.target.style.display = 'none';
}
function copyText(inputId){
  const el = document.getElementById(inputId);
  el.select();
  document.execCommand('copy');
  showToast('Copied! ✓', 'success');
}
function esc(str){
  return String(str||'')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}
function formatDate(str){
  if(!str) return '—';
  try{
    return new Date(str).toLocaleDateString('en-GB', {
      day:'2-digit',month:'short',year:'numeric'
    });
  } catch{ return str; }
}

let toastTimer;
function showToast(msg, type='info'){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className   = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.className='toast', 3000);
}

// Drag-over styling for upload zone
const zone = document.getElementById('upload-zone');
if(zone){
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.style.borderColor='var(--pink)'; });
  zone.addEventListener('dragleave', () => { zone.style.borderColor=''; });
  zone.addEventListener('drop', e => {
    e.preventDefault(); zone.style.borderColor='';
    const dt = e.dataTransfer;
    if(dt.files.length) handleImages({ target:{ files: dt.files, value:'' } });
  });
}