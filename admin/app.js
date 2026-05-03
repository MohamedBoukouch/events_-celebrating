/* =====================================================
   LP ADMIN DASHBOARD — JavaScript (FULLY FIXED)
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
document.addEventListener('DOMContentLoaded', function() {
  const passInput = document.getElementById('pass-input');
  if(passInput) {
    passInput.addEventListener('keydown', e => {
      if(e.key === 'Enter') doLogin();
    });
  }
  
  // Setup drag & drop
  const zone = document.getElementById('upload-zone');
  if(zone){
    zone.addEventListener('dragover', e => { 
      e.preventDefault(); 
      zone.style.borderColor='var(--pink)'; 
    });
    zone.addEventListener('dragleave', () => { 
      zone.style.borderColor=''; 
    });
    zone.addEventListener('drop', e => {
      e.preventDefault(); 
      zone.style.borderColor='';
      const dt = e.dataTransfer;
      if(dt && dt.files && dt.files.length) {
        handleImages({ target:{ files: dt.files } });
      }
    });
  }
});

async function doLogin(){
  const val = document.getElementById('pass-input').value.trim();
  if(!val){ showErr('Please enter your password'); return; }
  adminPass = val;
  
  const btn = document.getElementById('login-btn');
  btn.innerHTML = '<span class="spinner"></span>';
  btn.disabled = true;
  
  try {
    const data = await apiGet({ action:'getAllClients', pass: adminPass });
    
    if(data.error){ 
      showErr('Wrong password'); 
      btn.innerHTML='Enter →'; 
      btn.disabled = false;
      return; 
    }
    
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    
    if(data.data) {
      loadClientsData(data.data);
    }
    loadRequestsData();
    
  } catch(err) {
    console.error('Login error:', err);
    showErr('Connection error'); 
    btn.innerHTML='Enter →'; 
    btn.disabled = false;
  }
}

function showErr(msg){ 
  document.getElementById('login-err').textContent = msg; 
}

function logout(){
  adminPass = '';
  document.getElementById('pass-input').value = '';
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('dashboard').classList.add('hidden');
}

// ── API HELPERS ────────────────────────────────────────────
async function apiGet(params){
  const url = new URL(CONFIG.API_URL);
  Object.entries(params).forEach(([k,v]) => url.searchParams.set(k,String(v)));
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
  if(window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('open');
  if(tab === 'clients') refreshClients();
  if(tab === 'requests') refreshRequests();
}

function refreshData(){
  if(currentTab === 'clients') refreshClients();
  if(currentTab === 'requests') refreshRequests();
  showToast('Refreshed', 'info');
}

// ── IMAGE UPLOAD (FULLY FIXED) ─────────────────────────────
function handleImages(e){
  const files = Array.from(e.target.files || []);
  const currentTotal = uploadedImages.length + uploadedURLs.length;
  const allowed = Math.max(0, 6 - currentTotal);
  
  if(allowed <= 0){
    showToast('Maximum 6 images allowed', 'error');
    return;
  }
  
  files.slice(0, allowed).forEach(file => {
    if(!file || !file.size) return;
    
    if(file.size > 5*1024*1024){ 
      showToast('Image too large (max 5MB): ' + (file.name || ''), 'error'); 
      return; 
    }
    
    // Validate file type
    if(!file.type || !file.type.startsWith('image/')){
      showToast('Invalid file type: ' + (file.name || ''), 'error');
      return;
    }
    
    const reader = new FileReader();
    
    reader.onload = function(ev) {
      try {
        const dataUrl = ev.target.result;
        if(!dataUrl || typeof dataUrl !== 'string') {
          throw new Error('Invalid file data');
        }
        
        // Clean base64 extraction
        const commaIndex = dataUrl.indexOf(',');
        if(commaIndex === -1) {
          throw new Error('Invalid data URL format');
        }
        
        const base64 = dataUrl.substring(commaIndex + 1);
        // Remove any whitespace or newlines that might corrupt the base64
        const cleanBase64 = base64.replace(/\s/g, '');
        
        const mime = file.type || 'image/jpeg';
        const name = (file.name || 'image.jpg').replace(/[^a-zA-Z0-9.-]/g, '_');
        
        uploadedImages.push({ 
          base64: cleanBase64, 
          mime: mime, 
          name: name, 
          preview: dataUrl 
        });
        
        renderPreviews();
      } catch(err) {
        console.error('File processing error:', err);
        showToast('Error processing image: ' + (file.name || ''), 'error');
      }
    };
    
    reader.onerror = function() {
      showToast('Error reading file: ' + (file.name || ''), 'error');
    };
    
    reader.readAsDataURL(file);
  });
  
  // Reset input
  if(e.target) e.target.value = '';
}

function renderPreviews(){
  const wrap = document.getElementById('image-previews');
  if(!wrap) return;
  
  wrap.innerHTML = '';
  
  const all = [
    ...uploadedURLs.map((u, idx) => ({ type:'url', url:u, idx:idx })),
    ...uploadedImages.map((i, idx) => ({ type:'local', url:i.preview, idx:idx }))
  ];
  
  all.forEach((item) => {
    const div = document.createElement('div');
    div.className = 'img-thumb';
    div.innerHTML = `
      <img src="${item.url}" alt="" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22%3E%3Crect width=%2240%22 height=%2240%22 fill=%22%23ff2d78%22/%3E%3Ctext x=%2220%22 y=%2225%22 font-size=%2220%22 text-anchor=%22middle%22 fill=%22white%22%3E%F0%9F%93%B7%3C/text%3E%3C/svg%3E'"/>
      <button class="img-thumb-del" onclick="removeImage(${item.idx}, '${item.type}')">✕</button>
    `;
    wrap.appendChild(div);
  });
}

function removeImage(idx, type){
  if(type === 'url'){
    uploadedURLs.splice(idx, 1);
  } else {
    uploadedImages.splice(idx, 1);
  }
  renderPreviews();
}

// ── UPLOAD ALL PENDING IMAGES ──────────────────────────────
async function uploadAllImages(){
  const results = [];
  
  for(let i = 0; i < uploadedImages.length; i++){
    const img = uploadedImages[i];
    try {
      const res = await apiPost({
        action:'uploadImage',
        pass: adminPass,
        data: img.base64,
        mimeType: img.mime,
        filename: img.name
      });
      
      if(res.error) {
        console.error('Upload error:', res.error);
        throw new Error(res.error);
      }
      
      if(res.url) {
        results.push(res.url);
      } else {
        throw new Error('No URL returned from upload');
      }
    } catch(err) {
      console.error('Upload failed for image ' + i + ':', err);
      throw err;
    }
  }
  
  return results;
}

// ── CREATE LP (FULLY FIXED) ────────────────────────────────
async function createLP(){
  const name = document.getElementById('c-name').value.trim();
  const msg = document.getElementById('c-message').value.trim();
  
  if(!name){ 
    showToast('Please enter a name', 'error'); 
    return; 
  }

  const btn = document.getElementById('create-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Uploading...';

  try {
    // Upload local images first
    let newURLs = [];
    
    if(uploadedImages.length > 0){
      btn.innerHTML = '<span class="spinner"></span> Uploading images...';
      newURLs = await uploadAllImages();
      uploadedURLs = [...uploadedURLs, ...newURLs];
      uploadedImages = [];
      renderPreviews();
    }

    btn.innerHTML = '<span class="spinner"></span> Creating LP...';
    
    // Ensure images is always a clean array
    const allImages = [];
    if(Array.isArray(uploadedURLs)){
      uploadedURLs.forEach(url => {
        if(url && typeof url === 'string' && url.trim()){
          allImages.push(url.trim());
        }
      });
    }
    
    const res = await apiPost({
      action:'createLP',
      pass: adminPass,
      name: name,
      images: allImages,
      custom_message: msg || ''
    });

    if(res.error) throw new Error(res.error);
    if(!res.id) throw new Error('No LP ID returned');

    const lpUrl = `${CONFIG.LP_BASE}?id=${res.id}`;
    showResult(lpUrl);
    showToast('LP created! 🎉', 'success');

    // Reset form
    document.getElementById('c-name').value = '';
    document.getElementById('c-message').value = '';
    uploadedImages = [];
    uploadedURLs = [];
    renderPreviews();

  } catch(err) {
    console.error('Create LP error:', err);
    showToast('Error: ' + (err.message || 'Unknown error'), 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>✨ Generate LP</span>';
  }
}

function showResult(url){
  const card = document.getElementById('result-card');
  card.style.display = 'block';
  document.getElementById('result-link').value = url;

  const qrWrap = document.getElementById('qr-wrap');
  qrWrap.innerHTML = '';
  
  try {
    new QRCode(qrWrap, {
      text: url,
      width: 160, 
      height: 160,
      colorDark:'#000', 
      colorLight:'#fff',
      correctLevel: QRCode.CorrectLevel.H
    });
  } catch(e) {
    console.error('QR error:', e);
    qrWrap.innerHTML = '<p style="color:#f87171">QR Error</p>';
  }
}

function downloadQR(){
  const canvas = document.querySelector('#qr-wrap canvas');
  if(!canvas){ 
    showToast('QR not ready', 'error'); 
    return; 
  }
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = 'lp-qr.png';
  a.click();
}

function shareWA(){
  const link = document.getElementById('result-link').value;
  if(!link) return;
  const text = encodeURIComponent('🎂 Your Birthday LP is ready! 💖 ' + link);
  window.open(`https://wa.me/?text=${text}`, '_blank');
}

// ── CLIENTS TABLE ──────────────────────────────────────────
async function refreshClients(){
  const tbody = document.getElementById('clients-tbody');
  if(tbody) {
    tbody.innerHTML = '<tr><td colspan="5" class="loading-row">Loading...</td></tr>';
  }
  
  try {
    const data = await apiGet({ action:'getAllClients', pass: adminPass });
    loadClientsData(data.data || []);
  } catch(err) {
    console.error('Refresh clients error:', err);
    if(tbody) {
      tbody.innerHTML = '<tr><td colspan="5" class="loading-row">Error loading</td></tr>';
    }
  }
}

function loadClientsData(rows){
  const badge = document.getElementById('badge-clients');
  if(badge) badge.textContent = (rows || []).length;

  const tbody = document.getElementById('clients-tbody');
  if(!tbody) return;
  
  if(!rows || !rows.length){
    tbody.innerHTML = '<tr><td colspan="5" class="loading-row">No LPs yet</td></tr>';
    return;
  }
  
  tbody.innerHTML = rows.map(r => {
    const images = parseImagesSafe(r.images);
    return `
    <tr>
      <td><strong>${esc(r.name || '')}</strong></td>
      <td style="color:var(--text-dim);font-size:.82rem">${formatDate(r.created_at)}</td>
      <td><span class="status-badge status-${r.status || 'active'}">${r.status || 'active'}</span></td>
      <td>
        <div class="table-img-row">
          ${images.slice(0,3).map(u=>`<img class="table-thumb" src="${esc(u)}" onerror="this.style.display='none'" alt=""/>`).join('')}
          ${images.length>3 ? `<span style="font-size:.75rem;color:var(--text-dim);align-self:center">+${images.length-3}</span>` : ''}
        </div>
      </td>
      <td>
        <div class="action-btns">
          <button class="action-btn" onclick="viewQR('${esc(r.id)}','${esc(r.name)}')">🔗 QR</button>
          <button class="action-btn" onclick="openEdit('${esc(r.id)}','${esc(r.name)}','${esc(r.custom_message||'')}','${esc(r.status||'active')}')">✏️ Edit</button>
          <button class="action-btn danger" onclick="deleteLP('${esc(r.id)}')">🗑 Delete</button>
        </div>
      </td>
    </tr>
  `}).join('');
}

// ── REQUESTS TABLE ─────────────────────────────────────────
async function refreshRequests(){
  const tbody = document.getElementById('requests-tbody');
  if(tbody) {
    tbody.innerHTML = '<tr><td colspan="7" class="loading-row">Loading...</td></tr>';
  }
  
  try {
    const data = await apiGet({ action:'getAllRequests', pass: adminPass });
    loadRequestsData(data.data || []);
  } catch(err) {
    console.error('Refresh requests error:', err);
    if(tbody) {
      tbody.innerHTML = '<tr><td colspan="7" class="loading-row">Error loading</td></tr>';
    }
  }
}

async function loadRequestsData(rows){
  if(!rows){
    try {
      const data = await apiGet({ action:'getAllRequests', pass: adminPass });
      rows = data.data || [];
    } catch(e) {
      rows = [];
    }
  }
  
  const pending = (rows || []).filter(r => r.status === 'pending').length;
  const badge = document.getElementById('badge-requests');
  if(badge) badge.textContent = pending || '';

  const tbody = document.getElementById('requests-tbody');
  if(!tbody) return;
  
  if(!rows || !rows.length){
    tbody.innerHTML = '<tr><td colspan="7" class="loading-row">No requests yet</td></tr>';
    return;
  }
  
  tbody.innerHTML = rows.map(r => {
    const images = parseImagesSafe(r.images);
    const whatsapp = r.whatsapp || '';
    const cleanWA = whatsapp.replace(/[^0-9+]/g, '');
    
    return `
    <tr>
      <td><strong>${esc(r.name || '')}</strong></td>
      <td>
        ${whatsapp ? `<a href="https://wa.me/${cleanWA}" target="_blank" style="color:var(--success);text-decoration:none">📱 ${esc(whatsapp)}</a>` : '—'}
        ${r.email ? `<br><span style="font-size:.78rem;color:var(--text-dim)">${esc(r.email)}</span>` : ''}
      </td>
      <td>
        <div class="table-img-row">
          ${images.slice(0,3).map(u=>`<img class="table-thumb" src="${esc(u)}" onerror="this.style.display='none'" alt=""/>`).join('')}
          ${images.length>3 ? `<span style="font-size:.75rem;color:var(--text-dim);align-self:center">+${images.length-3}</span>` : ''}
        </div>
      </td>
      <td style="max-width:180px;font-size:.85rem;color:var(--text-dim)">${esc((r.message||'').substring(0,80))}${(r.message||'').length>80?'…':''}</td>
      <td style="color:var(--text-dim);font-size:.82rem">${formatDate(r.requested_at)}</td>
      <td><span class="status-badge status-${r.status || 'pending'}">${r.status || 'pending'}</span></td>
      <td>
        <div class="action-btns">
          ${r.status === 'pending' ? `
            <button class="action-btn success" onclick="approveRequest('${esc(r.id)}','${esc(whatsapp)}')">✅ Approve</button>
            <button class="action-btn danger" onclick="rejectRequest('${esc(r.id)}')">✕ Reject</button>
          ` : `
            ${r.status === 'approved' ? `
              <button class="action-btn" onclick="viewQR('${esc(r.lp_id || 'lp_from_req_'+r.id)}','${esc(r.name)}')">🔗 QR</button>
              <button class="action-btn whatsapp-btn" onclick="sendWhatsApp('${esc(r.lp_id || 'lp_from_req_'+r.id)}','${esc(whatsapp)}','${esc(r.name)}')">📱 Send WA</button>
            ` : ''}
          `}
        </div>
      </td>
    </tr>
  `}).join('');
}

async function approveRequest(id, whatsapp){
  if(!confirm('Approve this request and create their LP?')) return;
  
  try {
    const res = await apiPost({ 
      action:'updateRequestStatus', 
      pass: adminPass, 
      id: id, 
      status:'approved' 
    });
    
    if(res.error){ 
      showToast('Error: '+res.error,'error'); 
      return; 
    }
    
    showToast('Approved! LP created 🎉', 'success');
    
    if(res.lpId && whatsapp){
      const url = `${CONFIG.LP_BASE}?id=${res.lpId}`;
      const cleanNum = whatsapp.replace(/[^0-9]/g, '');
      const waMsg = encodeURIComponent(`🎂 Hi! Your Birthday LP is ready! 💖\n\n${url}\n\nEnjoy your special day! 🎉`);
      window.open(`https://wa.me/${cleanNum}?text=${waMsg}`, '_blank');
    }
    
    refreshRequests();
  } catch(err) {
    showToast('Error: ' + err.message, 'error');
  }
}

function sendWhatsApp(lpId, whatsapp, name){
  if(!whatsapp){ 
    showToast('No WhatsApp number available', 'error'); 
    return; 
  }
  
  const url = `${CONFIG.LP_BASE}?id=${lpId}`;
  const modal = document.getElementById('send-wa-modal');
  const linkInput = document.getElementById('send-wa-link');
  const actionBtn = document.getElementById('send-wa-action-btn');
  
  if(linkInput) linkInput.value = url;
  
  const cleanNumber = whatsapp.replace(/[^0-9]/g, '');
  const waMsg = encodeURIComponent(`🎂 Hi ${name || ''}! Your Birthday LP is ready! 💖\n\n${url}\n\nEnjoy your special day! 🎉`);
  
  if(actionBtn) {
    actionBtn.onclick = () => {
      window.open(`https://wa.me/${cleanNumber}?text=${waMsg}`, '_blank');
      if(modal) modal.style.display = 'none';
    };
  }
  
  if(modal) modal.style.display = 'flex';
}

async function rejectRequest(id){
  if(!confirm('Reject this request?')) return;
  
  try {
    await apiPost({ 
      action:'updateRequestStatus', 
      pass: adminPass, 
      id: id, 
      status:'rejected' 
    });
    showToast('Request rejected', 'info');
    refreshRequests();
  } catch(err) {
    showToast('Error: ' + err.message, 'error');
  }
}

// ── EDIT MODAL ─────────────────────────────────────────────
function openEdit(id, name, msg, status){
  document.getElementById('edit-id').value = id || '';
  document.getElementById('edit-name').value = name || '';
  document.getElementById('edit-message').value = msg || '';
  document.getElementById('edit-status').value = status || 'active';
  document.getElementById('edit-modal').style.display = 'flex';
}

async function saveEdit(){
  const id = document.getElementById('edit-id').value;
  
  try {
    const res = await apiPost({
      action:'updateLP', 
      pass: adminPass,
      id: id,
      name: document.getElementById('edit-name').value || '',
      custom_message: document.getElementById('edit-message').value || '',
      status: document.getElementById('edit-status').value || 'active'
    });
    
    if(res.error){ 
      showToast('Error: '+res.error,'error'); 
      return; 
    }
    
    showToast('Saved! ✓', 'success');
    document.getElementById('edit-modal').style.display = 'none';
    refreshClients();
  } catch(err) {
    showToast('Error: ' + err.message, 'error');
  }
}

async function deleteLP(id){
  if(!confirm('Delete this LP permanently?')) return;
  
  try {
    const res = await apiGet({ 
      action:'deleteClient', 
      pass: adminPass, 
      id: id 
    });
    
    if(res.error){ 
      showToast('Error: '+res.error,'error'); 
      return; 
    }
    
    showToast('Deleted', 'info');
    refreshClients();
  } catch(err) {
    showToast('Error: ' + err.message, 'error');
  }
}

// ── QR MODAL ───────────────────────────────────────────────
function viewQR(id, name){
  const url = `${CONFIG.LP_BASE}?id=${id}`;
  document.getElementById('modal-link').value = url;

  const wrap = document.getElementById('modal-qr-wrap');
  wrap.innerHTML = '';
  
  try {
    new QRCode(wrap, {
      text: url, 
      width:180, 
      height:180,
      colorDark:'#000', 
      colorLight:'#fff',
      correctLevel: QRCode.CorrectLevel.H
    });
  } catch(e) {
    console.error('QR error:', e);
  }

  const waBtn = document.getElementById('modal-wa-btn');
  if(waBtn) {
    waBtn.onclick = () => {
      const text = encodeURIComponent('🎂 Happy Birthday LP for '+(name||'')+'! 💖 '+url);
      window.open(`https://wa.me/?text=${text}`, '_blank');
    };
  }

  let dlCanvas = null;
  const checkCanvas = setInterval(() => {
    dlCanvas = wrap.querySelector('canvas');
    if(dlCanvas){
      clearInterval(checkCanvas);
      const dlBtn = document.getElementById('modal-dl-btn');
      if(dlBtn) {
        dlBtn.onclick = () => {
          const a = document.createElement('a');
          a.href = dlCanvas.toDataURL('image/png');
          a.download = `lp-qr-${id}.png`;
          a.click();
        };
      }
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
  if(!el) return;
  el.select();
  document.execCommand('copy');
  showToast('Copied! ✓', 'success');
}

function esc(str){
  if(str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

function formatDate(str){
  if(!str) return '—';
  try {
    return new Date(str).toLocaleDateString('en-GB', {
      day:'2-digit',
      month:'short',
      year:'numeric'
    });
  } catch { 
    return String(str); 
  }
}

function parseImagesSafe(imagesField){
  if(!imagesField) return [];
  if(Array.isArray(imagesField)) {
    return imagesField.filter(u => u && typeof u === 'string');
  }
  if(typeof imagesField === 'string') {
    if(imagesField.trim() === '') return [];
    try {
      const parsed = JSON.parse(imagesField);
      if(Array.isArray(parsed)) return parsed.filter(u => u && typeof u === 'string');
    } catch(_) {}
    return imagesField.split(',').filter(s => s && s.trim());
  }
  return [];
}

let toastTimer;
function showToast(msg, type='info'){
  const t = document.getElementById('toast');
  if(!t) return;
  t.textContent = msg || '';
  t.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.className='toast', 3000);
}