// ============================================================
// js/requirements.js — Stock Requirements + Credit Section
// Requirements: localStorage (vsm_requirements_v1)
// Credits:      localStorage (vsm_credits_v1)
// ============================================================

const Requirements = (() => {

  const REQ_KEY    = 'vsm_requirements_v1';
  const CREDIT_KEY = 'vsm_credits_v1';
  const TYPES = ['Sandal', 'Shoes', 'Slipper', 'Crocs', 'Flip Flops', 'Socks'];
  const CATS  = ['Men', 'Women', 'Boys', 'Girls', 'Kids'];
  const PRIO  = ['🔴 Urgent', '🟡 Normal', '🟢 Low'];
  const SHOE_STYLES = ['Lace', 'Velcro', 'Buckle', 'Loafer', 'Sports', 'Formal Lace', 'Formal Laceless', 'Safety Shoe', 'Water Shoe', 'Laceless'];

  let reqItems    = [];
  let creditItems = [];
  let activeTab   = 'requirements'; // 'requirements' | 'credit'

  const inr = n => '₹' + Number(n || 0).toLocaleString('en-IN');

  // ── IST helpers ───────────────────────────────────────────
  function getISTDateStr() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  }
  function getISTTimeStr() {
    return new Date().toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false
    });
  }

  // ── Persistence ──────────────────────────────────────────
  function loadReq()    { try { reqItems    = JSON.parse(localStorage.getItem(REQ_KEY)    || '[]'); } catch { reqItems = []; } }
  function saveReq()    { localStorage.setItem(REQ_KEY,    JSON.stringify(reqItems)); }
  function loadCredit() { try { creditItems = JSON.parse(localStorage.getItem(CREDIT_KEY) || '[]'); } catch { creditItems = []; } }
  function saveCredit() { localStorage.setItem(CREDIT_KEY, JSON.stringify(creditItems)); }

  // ── Render ────────────────────────────────────────────────
  function render() {
    loadReq();
    loadCredit();
    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="page-header">
        <div class="page-title">📋 Order <span>Requirements</span></div>
        <div style="display:flex;gap:10px;align-items:center" id="req-page-action-btns">
          <button class="btn btn-primary" id="req-add-btn">+ Add Requirement</button>
        </div>
      </div>

      <!-- Tabs -->
      <div class="page-tabs" id="req-tabs">
        <button class="page-tab-btn ${activeTab === 'requirements' ? 'active' : ''}" data-tab="requirements" id="tab-req">
          📋 Requirements
        </button>
        <button class="page-tab-btn ${activeTab === 'credit' ? 'active' : ''}" data-tab="credit" id="tab-credit">
          💳 Credit
          <span id="credit-badge" style="display:inline-flex;align-items:center;justify-content:center;background:var(--gold);color:#000;font-size:.65rem;font-weight:800;border-radius:10px;padding:1px 6px;margin-left:2px">${creditItems.filter(c=>!c.settled).length || ''}</span>
        </button>
      </div>

      <!-- Requirements Tab Content -->
      <div id="tab-content-requirements" style="display:${activeTab === 'requirements' ? 'block' : 'none'}">
        <!-- Add / Edit Form -->
        <div class="form-card" id="req-form-card" style="display:none">
          <div class="form-card-title" id="req-form-title">📝 Add Requirement</div>
          <div class="form-grid">
            <div class="form-group">
              <label for="req-brand">Brand / Dealer</label>
              <input type="text" id="req-brand" placeholder="e.g. Bata, Sparx, Campus" />
            </div>
            <div class="form-group">
              <label for="req-article">Article / Model</label>
              <input type="text" id="req-article" placeholder="Model name or description" />
            </div>
            <div class="form-group">
              <label for="req-category">Category</label>
              <select id="req-category">
                <option value="">All / Any</option>
                ${CATS.map(c => `<option>${c}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label for="req-type">Type</label>
              <select id="req-type">
                <option value="">All / Any</option>
                ${TYPES.map(t => `<option>${t}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label for="req-size">Size Range / Sizes</label>
              <input type="text" id="req-size" placeholder="e.g. 6,7,8 or 6-10" />
            </div>
            <div class="form-group">
              <label for="req-qty">Qty Needed (pairs) *</label>
              <input type="number" id="req-qty" placeholder="0" min="1" />
            </div>
            <div class="form-group">
              <label for="req-priority">Priority *</label>
              <select id="req-priority">
                ${PRIO.map(p => `<option>${p}</option>`).join('')}
              </select>
            </div>
            <div class="form-group" style="grid-column:1/-1">
              <label for="req-notes">Notes / Remarks</label>
              <textarea id="req-notes" rows="2" placeholder="Any extra details for this order item…" style="resize:vertical;font-family:inherit;font-size:.875rem;padding:10px 12px;background:var(--bg3);border:1.5px solid var(--border);border-radius:10px;color:var(--text);width:100%;box-sizing:border-box"></textarea>
            </div>
          </div>
          <div class="form-actions">
            <button class="btn btn-primary" id="req-save-btn">💾 Save</button>
            <button class="btn btn-secondary" id="req-cancel-btn">Cancel</button>
          </div>
        </div>

        <!-- Summary bar -->
        <div class="req-summary-bar" id="req-summary-bar">
          <div class="req-sum-card red">
            <span class="req-sum-icon">🔴</span>
            <div><div class="req-sum-val" id="rs-urgent">0</div><div class="req-sum-lbl">Urgent</div></div>
          </div>
          <div class="req-sum-card yellow">
            <span class="req-sum-icon">🟡</span>
            <div><div class="req-sum-val" id="rs-normal">0</div><div class="req-sum-lbl">Normal</div></div>
          </div>
          <div class="req-sum-card green">
            <span class="req-sum-icon">🟢</span>
            <div><div class="req-sum-val" id="rs-low">0</div><div class="req-sum-lbl">Low</div></div>
          </div>
          <div class="req-sum-card blue">
            <span class="req-sum-icon">📦</span>
            <div><div class="req-sum-val" id="rs-total-qty">0</div><div class="req-sum-lbl">Total Pairs Needed</div></div>
          </div>
        </div>

        <!-- Filter bar -->
        <div class="filter-bar" style="margin-bottom:8px">
          <input type="text" id="rq-search" placeholder="🔍 Search brand, article, notes…" />
          <select id="rq-prio">
            <option value="">All Priorities</option>
            ${PRIO.map(p => `<option>${p}</option>`).join('')}
          </select>
          <select id="rq-type">
            <option value="">All Types</option>
            ${TYPES.map(t => `<option>${t}</option>`).join('')}
          </select>
          <button class="btn btn-secondary btn-sm" id="rq-clear">✕ Clear</button>
          <button class="btn btn-secondary btn-sm" id="rq-print" style="margin-left:auto">🖨️ Print List</button>
        </div>

        <!-- List -->
        <div class="req-list" id="req-list"></div>
        <div id="req-empty" style="display:none">
          <div class="empty-state" style="margin-top:40px">
            <div class="empty-icon">📋</div>
            <p>No requirements added yet.<br><span style="color:var(--text3);font-size:.85rem">Click "+ Add Requirement" to note down items you need to order.</span></p>
          </div>
        </div>
      </div>

      <!-- Credit Tab Content -->
      <div id="tab-content-credit" style="display:${activeTab === 'credit' ? 'block' : 'none'}">
        <!-- Credit form card -->
        <div class="form-card" id="credit-form-card" style="display:none">
          <div class="form-card-title" id="credit-form-title">💳 Add Credit Entry</div>
          <div class="txn-header-grid">
            <div class="form-group">
              <label for="cr-date">Date *</label>
              <input type="date" id="cr-date" />
            </div>
            <div class="form-group">
              <label for="cr-customer">Customer Name</label>
              <input type="text" id="cr-customer" placeholder="Optional" />
            </div>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label for="cr-brand">Brand *</label>
              <input type="text" id="cr-brand" placeholder="e.g. Bata, Sparx" />
            </div>
            <div class="form-group">
              <label for="cr-article">Article / Model *</label>
              <input type="text" id="cr-article" placeholder="Model name" />
            </div>
            <div class="form-group">
              <label for="cr-size">Size *</label>
              <input type="number" id="cr-size" placeholder="6–12" min="1" max="15" />
            </div>
            <div class="form-group">
              <label for="cr-category">Category *</label>
              <select id="cr-category">
                <option value="">Select category</option>
                ${CATS.map(c => `<option>${c}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label for="cr-type">Type *</label>
              <select id="cr-type">
                <option value="">Select type</option>
                ${TYPES.map(t => `<option>${t}</option>`).join('')}
              </select>
            </div>
            <div class="form-group" id="cr-shoestyle-group" style="display:none">
              <label for="cr-shoestyle">Shoe Style *</label>
              <select id="cr-shoestyle">
                <option value="">Select style</option>
                ${SHOE_STYLES.map(s => `<option>${s}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label for="cr-color">Color *</label>
              <input type="text" id="cr-color" placeholder="e.g. Black, Brown" />
            </div>
            <div class="form-group">
              <label for="cr-qty">Qty (pairs) *</label>
              <input type="number" id="cr-qty" placeholder="1" min="1" value="1" />
            </div>
            <div class="form-group">
              <label for="cr-cost">Wholesale Rate / pair (₹) *</label>
              <input type="number" id="cr-cost" placeholder="0" min="0" step="1" />
            </div>
            <div class="form-group">
              <label for="cr-mrp">MRP / pair (₹) *</label>
              <input type="number" id="cr-mrp" placeholder="0" min="0" step="1" />
            </div>
            <div class="form-group">
              <label for="cr-sell">Selling Price / pair (₹) *</label>
              <input type="number" id="cr-sell" placeholder="0" min="0" step="1" />
            </div>
          </div>
          <!-- Live calc preview -->
          <div class="calc-grid" id="cr-calc-preview" style="margin-top:14px">
            <div class="calc-item">
              <div class="calc-label">Total Sale</div>
              <div class="calc-value" id="cr-calc-total">₹0</div>
            </div>
            <div class="calc-item">
              <div class="calc-label">Total Profit</div>
              <div class="calc-value" id="cr-calc-profit">₹0</div>
            </div>
          </div>
          <div class="form-actions">
            <button class="btn btn-primary" id="credit-save-btn">💳 Add to Credit</button>
            <button class="btn btn-secondary" id="credit-cancel-btn">Cancel</button>
          </div>
        </div>

        <!-- Credit Summary -->
        <div class="credit-summary-bar">
          <div class="credit-sum-card gold">
            <span class="credit-sum-icon">💳</span>
            <div>
              <div class="credit-sum-val" id="cr-sum-count">0</div>
              <div class="credit-sum-lbl">Pending Credits</div>
            </div>
          </div>
          <div class="credit-sum-card red">
            <span class="credit-sum-icon">💰</span>
            <div>
              <div class="credit-sum-val" id="cr-sum-total">₹0</div>
              <div class="credit-sum-lbl">Total Amount Owed</div>
            </div>
          </div>
        </div>

        <!-- Credit list -->
        <div class="credit-list" id="credit-list"></div>
        <div id="credit-empty" style="display:none">
          <div class="empty-state" style="margin-top:40px">
            <div class="empty-icon">💳</div>
            <p>No credit entries yet.<br><span style="color:var(--text3);font-size:.85rem">Click "+ Add Credit" to record items given on credit.</span></p>
          </div>
        </div>
      </div>
    `;

    // ── Tab switching ──
    document.querySelectorAll('.page-tab-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        activeTab = this.dataset.tab;
        document.querySelectorAll('.page-tab-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        document.getElementById('tab-content-requirements').style.display = activeTab === 'requirements' ? 'block' : 'none';
        document.getElementById('tab-content-credit').style.display       = activeTab === 'credit'       ? 'block' : 'none';
        // Update the action button
        const actionBtns = document.getElementById('req-page-action-btns');
        if (activeTab === 'requirements') {
          actionBtns.innerHTML = `<button class="btn btn-primary" id="req-add-btn">+ Add Requirement</button>`;
          document.getElementById('req-add-btn').addEventListener('click', () => showReqForm());
        } else {
          actionBtns.innerHTML = `<button class="btn btn-primary" id="credit-add-btn">+ Add Credit</button>`;
          document.getElementById('credit-add-btn').addEventListener('click', () => showCreditForm());
        }
      });
    });

    // Requirements tab listeners
    document.getElementById('req-add-btn').addEventListener('click', () => showReqForm());
    document.getElementById('rq-search').addEventListener('input', renderReqList);
    document.getElementById('rq-prio').addEventListener('change', renderReqList);
    document.getElementById('rq-type').addEventListener('change', renderReqList);
    document.getElementById('rq-clear').addEventListener('click', clearReqFilters);
    document.getElementById('rq-print').addEventListener('click', printList);

    renderReqList();
    renderCreditList();
  }

  // ══════════════════════════════════════════════════════════
  // REQUIREMENTS SECTION
  // ══════════════════════════════════════════════════════════

  let editReqId = null;

  function showReqForm(show = true, data = null) {
    const card = document.getElementById('req-form-card');
    const btn  = document.getElementById('req-add-btn');
    if (!card) return;
    card.style.display = show ? 'block' : 'none';
    if (btn) btn.textContent = show ? '✕ Close Form' : '+ Add Requirement';
    if (!show) { resetReqForm(); editReqId = null; }
    if (show && data) {
      document.getElementById('req-brand').value    = data.brand    || '';
      document.getElementById('req-article').value  = data.article  || '';
      document.getElementById('req-category').value = data.category || '';
      document.getElementById('req-type').value     = data.type     || '';
      document.getElementById('req-size').value     = data.size     || '';
      document.getElementById('req-qty').value      = data.qty      || '';
      document.getElementById('req-priority').value = data.priority || PRIO[1];
      document.getElementById('req-notes').value    = data.notes    || '';
      document.getElementById('req-form-title').textContent = '✏️ Edit Requirement';
      document.getElementById('req-save-btn').textContent   = '💾 Update';
    }
    if (show) card.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // attach save/cancel
    const saveBtn = document.getElementById('req-save-btn');
    const cancelBtn = document.getElementById('req-cancel-btn');
    if (saveBtn)   { const ns = saveBtn.cloneNode(true); saveBtn.parentNode.replaceChild(ns, saveBtn); ns.addEventListener('click', handleReqSave); }
    if (cancelBtn) { const nc = cancelBtn.cloneNode(true); cancelBtn.parentNode.replaceChild(nc, cancelBtn); nc.addEventListener('click', () => showReqForm(false)); }
  }

  function resetReqForm() {
    ['req-brand','req-article','req-size','req-qty','req-notes'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    const cat = document.getElementById('req-category'); if (cat) cat.value = '';
    const typ = document.getElementById('req-type');     if (typ) typ.value = '';
    const pri = document.getElementById('req-priority'); if (pri) pri.value = PRIO[1];
    const ttl = document.getElementById('req-form-title'); if (ttl) ttl.textContent = '📝 Add Requirement';
    const btn = document.getElementById('req-save-btn');   if (btn) btn.textContent = '💾 Save';
  }

  function handleReqSave() {
    const qty = Number(document.getElementById('req-qty')?.value) || 0;
    if (qty < 1) { App.toast('Please enter quantity needed (min 1).', 'error'); return; }

    const item = {
      id:       editReqId || Date.now().toString(36) + Math.random().toString(36).slice(2),
      brand:    document.getElementById('req-brand')?.value.trim()    || '',
      article:  document.getElementById('req-article')?.value.trim()  || '',
      category: document.getElementById('req-category')?.value        || '',
      type:     document.getElementById('req-type')?.value            || '',
      size:     document.getElementById('req-size')?.value.trim()     || '',
      qty,
      priority: document.getElementById('req-priority')?.value        || PRIO[1],
      notes:    document.getElementById('req-notes')?.value.trim()    || '',
      createdAt: editReqId ? (reqItems.find(x => x.id === editReqId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
      done: false
    };

    if (editReqId) {
      const idx = reqItems.findIndex(x => x.id === editReqId);
      if (idx !== -1) { item.done = reqItems[idx].done; reqItems[idx] = item; }
    } else {
      reqItems.unshift(item);
    }

    saveReq();
    showReqForm(false);
    renderReqList();
    App.toast(editReqId ? 'Requirement updated!' : 'Requirement added!', 'success');
    editReqId = null;
  }

  function renderReqList() {
    const search  = (document.getElementById('rq-search')?.value  || '').toLowerCase();
    const prio    = document.getElementById('rq-prio')?.value     || '';
    const typeF   = document.getElementById('rq-type')?.value     || '';

    const filtered = reqItems.filter(it => {
      const matchSearch = !search || [it.brand, it.article, it.notes, it.size].some(f => String(f || '').toLowerCase().includes(search));
      const matchPrio   = !prio   || it.priority === prio;
      const matchType   = !typeF  || it.type     === typeF;
      return matchSearch && matchPrio && matchType;
    });

    const prioOrder = { '🔴 Urgent': 0, '🟡 Normal': 1, '🟢 Low': 2 };
    filtered.sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      return (prioOrder[a.priority] ?? 1) - (prioOrder[b.priority] ?? 1);
    });

    const urgent = reqItems.filter(i => !i.done && i.priority === '🔴 Urgent').length;
    const normal = reqItems.filter(i => !i.done && i.priority === '🟡 Normal').length;
    const low    = reqItems.filter(i => !i.done && i.priority === '🟢 Low').length;
    const totalQ = reqItems.filter(i => !i.done).reduce((s, i) => s + (i.qty || 0), 0);
    const setEl  = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    setEl('rs-urgent',    urgent);
    setEl('rs-normal',    normal);
    setEl('rs-low',       low);
    setEl('rs-total-qty', totalQ.toLocaleString('en-IN') + ' pairs');

    const listEl  = document.getElementById('req-list');
    const emptyEl = document.getElementById('req-empty');
    if (!listEl) return;

    if (filtered.length === 0) {
      listEl.innerHTML  = '';
      emptyEl.style.display = 'block';
      return;
    }
    emptyEl.style.display = 'none';

    const prioBg = { '🔴 Urgent': 'prio-red', '🟡 Normal': 'prio-yellow', '🟢 Low': 'prio-green' };

    listEl.innerHTML = filtered.map(it => `
      <div class="req-item ${it.done ? 'req-item-done' : ''}" id="rqi-${it.id}">
        <div class="req-item-left">
          <label class="req-check-wrap" title="Mark as ordered/done">
            <input type="checkbox" class="req-done-cb" data-id="${it.id}" ${it.done ? 'checked' : ''} />
            <span class="req-check-box"></span>
          </label>
        </div>
        <div class="req-item-body">
          <div class="req-item-top">
            <span class="req-prio-badge ${prioBg[it.priority] || 'prio-yellow'}">${it.priority}</span>
            ${it.brand    ? `<strong class="req-brand">${it.brand}</strong>` : ''}
            ${it.article  ? `<span class="req-article">${it.article}</span>` : ''}
            ${it.category ? `<span class="badge badge-blue">${it.category}</span>` : ''}
            ${it.type     ? `<span class="badge badge-orange">${it.type}</span>` : ''}
          </div>
          <div class="req-item-meta">
            ${it.size ? `<span>📏 Sizes: <strong>${it.size}</strong></span>` : ''}
            <span>📦 Qty Needed: <strong>${it.qty} pairs</strong></span>
            ${it.notes ? `<span class="req-notes-text">📝 ${it.notes}</span>` : ''}
          </div>
          <div class="req-item-date">Added ${new Date(it.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}</div>
        </div>
        <div class="req-item-actions">
          <button class="action-edit req-edit-btn" data-id="${it.id}">Edit</button>
          <button class="action-delete req-del-btn" data-id="${it.id}">Delete</button>
        </div>
      </div>
    `).join('');

    listEl.querySelectorAll('.req-done-cb').forEach(cb => {
      cb.addEventListener('change', function() { toggleReqDone(this.dataset.id, this.checked); });
    });
    listEl.querySelectorAll('.req-edit-btn').forEach(btn => {
      btn.addEventListener('click', function() { startReqEdit(this.dataset.id); });
    });
    listEl.querySelectorAll('.req-del-btn').forEach(btn => {
      btn.addEventListener('click', function() { deleteReqItem(this.dataset.id); });
    });
  }

  function toggleReqDone(id, done) {
    const it = reqItems.find(x => x.id === id);
    if (it) { it.done = done; saveReq(); renderReqList(); }
  }

  function startReqEdit(id) {
    const it = reqItems.find(x => x.id === id);
    if (!it) return;
    editReqId = id;
    showReqForm(true, it);
  }

  function deleteReqItem(id) {
    if (!confirm('Remove this requirement?')) return;
    reqItems = reqItems.filter(x => x.id !== id);
    saveReq();
    renderReqList();
    App.toast('Requirement removed.', 'info');
  }

  function clearReqFilters() {
    const s = document.getElementById('rq-search'); if (s) s.value = '';
    const p = document.getElementById('rq-prio');   if (p) p.value = '';
    const t = document.getElementById('rq-type');   if (t) t.value = '';
    renderReqList();
  }

  function printList() {
    const pending = reqItems.filter(i => !i.done);
    if (pending.length === 0) { App.toast('No pending requirements to print.', 'info'); return; }

    const rows = pending.map((it, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${it.priority}</td>
        <td>${it.brand || '—'}</td>
        <td>${it.article || '—'}</td>
        <td>${it.category || '—'} ${it.type || ''}</td>
        <td>${it.size || '—'}</td>
        <td>${it.qty} pairs</td>
        <td>${it.notes || '—'}</td>
      </tr>`).join('');

    const win = window.open('', '_blank', 'width=900,height=700');
    win.document.write(`
      <!DOCTYPE html><html><head><title>Stock Requirements — Variety Shoemart</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
        h2 { margin-bottom: 4px; }
        p.sub { color: #666; font-size: .85rem; margin-bottom: 20px; }
        table { width:100%; border-collapse: collapse; }
        th { background:#1e293b; color:#fff; padding:8px 12px; text-align:left; font-size:.8rem; }
        td { padding:7px 12px; border-bottom:1px solid #e2e8f0; font-size:.85rem; }
        tr:nth-child(even) td { background:#f8fafc; }
        @media print { button { display:none } }
      </style></head><body>
      <h2>📋 Stock Requirements — Variety Shoemart</h2>
      <p class="sub">Printed: ${new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' })} · ${pending.length} items pending</p>
      <button onclick="window.print()" style="margin-bottom:16px;padding:8px 18px;background:#6366f1;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:.9rem">🖨️ Print</button>
      <table>
        <thead><tr><th>#</th><th>Priority</th><th>Brand</th><th>Article</th><th>Cat / Type</th><th>Sizes</th><th>Qty</th><th>Notes</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      </body></html>`);
    win.document.close();
  }

  // ══════════════════════════════════════════════════════════
  // CREDIT SECTION
  // ══════════════════════════════════════════════════════════

  let editCreditId = null;

  function showCreditForm(show = true, data = null) {
    const card = document.getElementById('credit-form-card');
    const btn  = document.getElementById('credit-add-btn');
    if (!card) return;
    card.style.display = show ? 'block' : 'none';
    if (btn) btn.textContent = show ? '✕ Close Form' : '+ Add Credit';
    if (!show) { resetCreditForm(); editCreditId = null; }

    if (show && !data) {
      // New entry — prefill date
      document.getElementById('cr-date').value = getISTDateStr();
    }
    if (show && data) {
      document.getElementById('cr-date').value     = data.date     || getISTDateStr();
      document.getElementById('cr-customer').value = data.customer || '';
      document.getElementById('cr-brand').value    = data.brand    || '';
      document.getElementById('cr-article').value  = data.article  || '';
      document.getElementById('cr-size').value     = data.size     || '';
      document.getElementById('cr-category').value = data.category || '';
      document.getElementById('cr-type').value     = data.type     || '';
      document.getElementById('cr-shoestyle').value= data.shoeStyle|| '';
      document.getElementById('cr-color').value    = data.color    || '';
      document.getElementById('cr-qty').value      = data.qty      || 1;
      document.getElementById('cr-cost').value     = data.cost     || '';
      document.getElementById('cr-mrp').value      = data.mrp      || '';
      document.getElementById('cr-sell').value     = data.sell     || '';
      if (data.type === 'Shoes') document.getElementById('cr-shoestyle-group').style.display = 'flex';
      document.getElementById('credit-form-title').textContent = '✏️ Edit Credit Entry';
      document.getElementById('credit-save-btn').textContent   = '💾 Update';
      updateCreditCalc();
    }
    if (show) card.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Shoe style toggle
    document.getElementById('cr-type')?.addEventListener('change', function() {
      document.getElementById('cr-shoestyle-group').style.display = this.value === 'Shoes' ? 'flex' : 'none';
      if (this.value !== 'Shoes') document.getElementById('cr-shoestyle').value = '';
    });

    // Live calc
    ['cr-qty','cr-cost','cr-mrp','cr-sell'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', updateCreditCalc);
    });

    // Clone save/cancel to clear old listeners
    const saveBtn = document.getElementById('credit-save-btn');
    const cancelBtn = document.getElementById('credit-cancel-btn');
    if (saveBtn)   { const ns = saveBtn.cloneNode(true); saveBtn.parentNode.replaceChild(ns, saveBtn); ns.addEventListener('click', handleCreditSave); }
    if (cancelBtn) { const nc = cancelBtn.cloneNode(true); cancelBtn.parentNode.replaceChild(nc, cancelBtn); nc.addEventListener('click', () => showCreditForm(false)); }
  }

  function updateCreditCalc() {
    const qty  = Number(document.getElementById('cr-qty')?.value)  || 0;
    const cost = Number(document.getElementById('cr-cost')?.value) || 0;
    const sell = Number(document.getElementById('cr-sell')?.value) || 0;
    const totalSale   = qty * sell;
    const totalProfit = qty * (sell - cost);
    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = inr(val); };
    setEl('cr-calc-total',  totalSale);
    setEl('cr-calc-profit', totalProfit);
  }

  function resetCreditForm() {
    ['cr-customer','cr-brand','cr-article','cr-size','cr-color','cr-cost','cr-mrp','cr-sell'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    const cat = document.getElementById('cr-category'); if (cat) cat.value = '';
    const typ = document.getElementById('cr-type');     if (typ) typ.value = '';
    const sty = document.getElementById('cr-shoestyle'); if (sty) sty.value = '';
    const qty = document.getElementById('cr-qty');      if (qty) qty.value = '1';
    const sg  = document.getElementById('cr-shoestyle-group'); if (sg) sg.style.display = 'none';
    const ttl = document.getElementById('credit-form-title'); if (ttl) ttl.textContent = '💳 Add Credit Entry';
    const btn = document.getElementById('credit-save-btn');   if (btn) btn.textContent = '💳 Add to Credit';
    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setEl('cr-calc-total', '₹0'); setEl('cr-calc-profit', '₹0');
  }

  function handleCreditSave() {
    const date     = document.getElementById('cr-date')?.value.trim()     || '';
    const customer = document.getElementById('cr-customer')?.value.trim() || '';
    const brand    = document.getElementById('cr-brand')?.value.trim()    || '';
    const article  = document.getElementById('cr-article')?.value.trim()  || '';
    const size     = document.getElementById('cr-size')?.value.trim()     || '';
    const cat      = document.getElementById('cr-category')?.value        || '';
    const type     = document.getElementById('cr-type')?.value            || '';
    const shoeStyle= document.getElementById('cr-shoestyle')?.value       || '';
    const color    = document.getElementById('cr-color')?.value.trim()    || '';
    const qty      = Number(document.getElementById('cr-qty')?.value)     || 0;
    const cost     = Number(document.getElementById('cr-cost')?.value)    || 0;
    const mrp      = Number(document.getElementById('cr-mrp')?.value)     || 0;
    const sell     = Number(document.getElementById('cr-sell')?.value)    || 0;

    if (!date)    { App.toast('Please enter a date.', 'error'); return; }
    if (!brand)   { App.toast('Please enter brand.', 'error'); return; }
    if (!article) { App.toast('Please enter article/model.', 'error'); return; }
    if (!size)    { App.toast('Please enter size.', 'error'); return; }
    if (!cat)     { App.toast('Please select category.', 'error'); return; }
    if (!type)    { App.toast('Please select type.', 'error'); return; }
    if (!color)   { App.toast('Please enter color.', 'error'); return; }
    if (qty < 1)  { App.toast('Qty must be at least 1.', 'error'); return; }
    if (!cost || !mrp || !sell) { App.toast('Please enter all prices.', 'error'); return; }
    if (type === 'Shoes' && !shoeStyle) { App.toast('Please select shoe style.', 'error'); return; }
    if (sell > mrp) { App.toast('Selling price cannot exceed MRP.', 'error'); return; }

    const totalSale   = qty * sell;
    const totalCost   = qty * cost;
    const profitPair  = sell - cost;
    const totalProfit = qty * profitPair;
    const discount    = mrp - sell;

    const item = {
      id:         editCreditId || Date.now().toString(36) + Math.random().toString(36).slice(2),
      date, customer, brand, article, size: Number(size), category: cat, type,
      shoeStyle, color, qty, cost, mrp, sell,
      totalSale, totalCost, profitPair, totalProfit, discount,
      settled: false,
      createdAt: editCreditId ? (creditItems.find(x => x.id === editCreditId)?.createdAt || new Date().toISOString()) : new Date().toISOString()
    };

    if (editCreditId) {
      const idx = creditItems.findIndex(x => x.id === editCreditId);
      if (idx !== -1) { item.settled = creditItems[idx].settled; creditItems[idx] = item; }
    } else {
      creditItems.unshift(item);
    }

    saveCredit();
    showCreditForm(false);
    renderCreditList();
    App.toast(editCreditId ? 'Credit entry updated!' : 'Credit entry added!', 'success');
    editCreditId = null;
  }

  function renderCreditList() {
    const pending = creditItems.filter(c => !c.settled);
    const totalOwed = pending.reduce((s, c) => s + (c.totalSale || 0), 0);

    const setEl = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    setEl('cr-sum-count', pending.length);
    setEl('cr-sum-total', inr(totalOwed));

    // Update badge on tab
    const badge = document.getElementById('credit-badge');
    if (badge) badge.textContent = pending.length || '';

    const listEl  = document.getElementById('credit-list');
    const emptyEl = document.getElementById('credit-empty');
    if (!listEl) return;

    if (pending.length === 0) {
      listEl.innerHTML = '';
      emptyEl.style.display = 'block';
      return;
    }
    emptyEl.style.display = 'none';

    listEl.innerHTML = pending.map(it => `
      <div class="credit-item" id="cri-${it.id}">
        <div class="credit-item-body">
          <div class="credit-item-top">
            <span class="badge badge-gold">💳 Credit</span>
            <strong class="credit-item-name">${it.brand} ${it.article}</strong>
            ${it.customer ? `<span style="color:var(--text3);font-size:.82rem">👤 ${it.customer}</span>` : ''}
            <span class="badge badge-blue">${it.category}</span>
            <span class="badge badge-orange">${it.type}</span>
            ${it.shoeStyle ? `<span class="badge badge-gold">${it.shoeStyle}</span>` : ''}
          </div>
          <div class="credit-item-meta">
            <span>📏 Size: <strong>${it.size}</strong></span>
            <span>🎨 Colour: <strong>${it.color}</strong></span>
            <span>📦 Qty: <strong>${it.qty} pair${it.qty > 1 ? 's' : ''}</strong></span>
            <span>🏷️ MRP: <strong>${inr(it.mrp)}/pair</strong></span>
            <span>💸 Sell: <strong>${inr(it.sell)}/pair</strong></span>
            <span>📅 Date: <strong>${it.date}</strong></span>
          </div>
          <div class="credit-item-owed">💰 Amount Owed: ${inr(it.totalSale)}</div>
        </div>
        <div class="credit-item-actions">
          <button class="action-receive cr-receive-btn" data-id="${it.id}">✅ Received</button>
          <button class="action-edit cr-edit-btn" data-id="${it.id}">Edit</button>
          <button class="action-delete cr-del-btn" data-id="${it.id}">Delete</button>
        </div>
      </div>
    `).join('');

    listEl.querySelectorAll('.cr-receive-btn').forEach(btn => {
      btn.addEventListener('click', function() { showReceiveModal(this.dataset.id); });
    });
    listEl.querySelectorAll('.cr-edit-btn').forEach(btn => {
      btn.addEventListener('click', function() { startCreditEdit(this.dataset.id); });
    });
    listEl.querySelectorAll('.cr-del-btn').forEach(btn => {
      btn.addEventListener('click', function() { deleteCreditItem(this.dataset.id); });
    });
  }

  function startCreditEdit(id) {
    const it = creditItems.find(x => x.id === id);
    if (!it) return;
    editCreditId = id;
    // Make sure credit add btn is showing (the action bar in credit tab)
    const actionBtns = document.getElementById('req-page-action-btns');
    actionBtns.innerHTML = `<button class="btn btn-primary" id="credit-add-btn">+ Add Credit</button>`;
    document.getElementById('credit-add-btn').addEventListener('click', () => showCreditForm());
    showCreditForm(true, it);
  }

  function deleteCreditItem(id) {
    if (!confirm('Delete this credit entry?')) return;
    creditItems = creditItems.filter(x => x.id !== id);
    saveCredit();
    renderCreditList();
    App.toast('Credit entry deleted.', 'info');
  }

  // ── Receive Payment Modal ──────────────────────────────────
  function showReceiveModal(creditId) {
    const it = creditItems.find(x => x.id === creditId);
    if (!it) return;

    document.getElementById('receive-modal-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'receive-modal-overlay';
    overlay.innerHTML = `
      <div class="modal-box" id="receive-modal-box" style="max-width:440px">
        <div class="modal-header" style="background:linear-gradient(135deg,rgba(245,158,11,.1),rgba(245,158,11,.04))">
          <div class="modal-title" style="color:var(--gold)">💰 Record Payment Received</div>
          <button class="modal-close" id="recv-close">✕</button>
        </div>
        <div class="modal-body">
          <!-- Credit summary -->
          <div class="modal-stock-info" style="margin-bottom:16px">
            <div class="modal-stock-info-row"><span>Customer</span><strong>${it.customer || '—'}</strong></div>
            <div class="modal-stock-info-row"><span>Item</span><strong>${it.brand} ${it.article} (Size ${it.size})</strong></div>
            <div class="modal-stock-info-row"><span>Qty</span><strong>${it.qty} pair${it.qty > 1 ? 's' : ''}</strong></div>
            <div class="modal-stock-info-row"><span>Total Amount Owed</span><strong style="color:var(--gold)">${inr(it.totalSale)}</strong></div>
          </div>

          <div class="form-grid" style="grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
            <div class="form-group">
              <label for="recv-date">Sale Date *</label>
              <input type="date" id="recv-date" />
            </div>
            <div class="form-group">
              <label for="recv-time">Sale Time *</label>
              <input type="time" id="recv-time" />
            </div>
          </div>

          <div style="margin-bottom:14px">
            <label style="font-size:.75rem;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:8px">💳 Payment Mode</label>
            <div class="payment-toggle" id="recv-payment-toggle">
              <button type="button" class="pay-btn active" data-mode="Cash">💵 Cash</button>
              <button type="button" class="pay-btn" data-mode="UPI">📱 UPI</button>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="recv-cancel">Cancel</button>
          <button class="btn btn-primary" id="recv-confirm" style="background:linear-gradient(135deg,var(--gold),#d97706)">✅ Confirm & Move to Sales</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('recv-date').value = getISTDateStr();
    document.getElementById('recv-time').value = getISTTimeStr();

    // Payment toggle
    document.querySelectorAll('#recv-payment-toggle .pay-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        document.querySelectorAll('#recv-payment-toggle .pay-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
      });
    });

    const closeModal = () => overlay.remove();
    document.getElementById('recv-close').addEventListener('click', closeModal);
    document.getElementById('recv-cancel').addEventListener('click', closeModal);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });

    document.getElementById('recv-confirm').addEventListener('click', async () => {
      const saleDate = document.getElementById('recv-date').value.trim();
      const saleTime = document.getElementById('recv-time').value.trim();
      const payMode  = document.querySelector('#recv-payment-toggle .pay-btn.active')?.dataset.mode || 'Cash';

      if (!saleDate) { App.toast('Please enter sale date.', 'error'); return; }
      if (!saleTime) { App.toast('Please enter sale time.', 'error'); return; }

      const confirmBtn = document.getElementById('recv-confirm');
      confirmBtn.disabled = true; confirmBtn.textContent = 'Saving…';

      // Build full sale row (matching Product_sales schema + PaymentMode col)
      // 0=Date 1=Time 2=Brand 3=Article 4=Size 5=Category 6=Type 7=ShoeStyle
      // 8=Color 9=PairsTxn 10=Qty 11=Cost 12=MRP 13=Sell
      // 14=TotalSale 15=TotalCost 16=ProfitPair 17=TotalProfit 18=Discount 19=PaymentMode
      const saleRow = [
        saleDate, saleTime,
        it.brand, it.article, it.size, it.category, it.type, it.shoeStyle || '', it.color,
        1, it.qty, it.cost, it.mrp, it.sell,
        it.totalSale, it.totalCost, it.profitPair, it.totalProfit, it.discount, payMode
      ];

      try {
        await API.addSale(saleRow);
        App.addSaleRow(saleRow);

        // Mark credit as settled and remove from pending
        creditItems = creditItems.filter(x => x.id !== creditId);
        saveCredit();

        closeModal();
        renderCreditList();
        App.toast(`✅ Payment received! ${it.brand} ${it.article} moved to Sales.`, 'success');
        setTimeout(() => App.navigate('sales'), 1400);
      } catch (err) {
        App.toast('Error saving sale: ' + err.message, 'error');
        confirmBtn.disabled = false;
        confirmBtn.textContent = '✅ Confirm & Move to Sales';
      }
    });
  }

  return { render };
})();
