// ============================================================
// js/requirements.js — Stock Requirements / Order List
// Stores dealer order requirements locally (localStorage)
// ============================================================

const Requirements = (() => {

  const STORAGE_KEY = 'vsm_requirements_v1';
  const TYPES = ['Sandal', 'Shoe', 'Safety Shoe', 'Water Shoe', 'Laceless', 'Slipper', 'Sports', 'Crocs', 'Flip Flops', 'Socks'];
  const CATS  = ['Men', 'Women', 'Boys', 'Girls', 'Kids'];
  const PRIO  = ['🔴 Urgent', '🟡 Normal', '🟢 Low'];

  let items = [];

  // ── Persistence ──────────────────────────────────────────
  function load() {
    try { items = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { items = []; }
  }
  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  // ── Render ────────────────────────────────────────────────
  function render() {
    load();
    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="page-header">
        <div class="page-title">📋 Stock <span>Requirements</span></div>
        <button class="btn btn-primary" id="req-add-btn">+ Add Requirement</button>
      </div>

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

      <!-- Empty state placeholder -->
      <div id="req-empty" style="display:none">
        <div class="empty-state" style="margin-top:40px">
          <div class="empty-icon">📋</div>
          <p>No requirements added yet.<br><span style="color:var(--text3);font-size:.85rem">Click "+ Add Requirement" to note down items you need to order.</span></p>
        </div>
      </div>
    `;

    // Attach listeners
    document.getElementById('req-add-btn').addEventListener('click', () => showForm());
    document.getElementById('req-cancel-btn').addEventListener('click', () => showForm(false));
    document.getElementById('req-save-btn').addEventListener('click', handleSave);
    document.getElementById('rq-search').addEventListener('input', renderList);
    document.getElementById('rq-prio').addEventListener('change', renderList);
    document.getElementById('rq-type').addEventListener('change', renderList);
    document.getElementById('rq-clear').addEventListener('click', clearFilters);
    document.getElementById('rq-print').addEventListener('click', printList);

    renderList();
  }

  // ── Form show/hide ────────────────────────────────────────
  let editId = null;
  function showForm(show = true, data = null) {
    const card = document.getElementById('req-form-card');
    const btn  = document.getElementById('req-add-btn');
    card.style.display = show ? 'block' : 'none';
    btn.textContent = show ? '✕ Close Form' : '+ Add Requirement';
    if (!show) {
      resetForm();
      editId = null;
    }
    if (show && data) {
      // Populate for edit
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
  }

  function resetForm() {
    ['req-brand','req-article','req-size','req-qty','req-notes'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    const cat = document.getElementById('req-category'); if (cat) cat.value = '';
    const typ = document.getElementById('req-type');     if (typ) typ.value = '';
    const pri = document.getElementById('req-priority'); if (pri) pri.value = PRIO[1];
    const ttl = document.getElementById('req-form-title'); if (ttl) ttl.textContent = '📝 Add Requirement';
    const btn = document.getElementById('req-save-btn');   if (btn) btn.textContent = '💾 Save';
  }

  // ── Save ──────────────────────────────────────────────────
  function handleSave() {
    const qty = Number(document.getElementById('req-qty')?.value) || 0;
    if (qty < 1) { App.toast('Please enter quantity needed (min 1).', 'error'); return; }

    const item = {
      id:       editId || Date.now().toString(36) + Math.random().toString(36).slice(2),
      brand:    document.getElementById('req-brand')?.value.trim()    || '',
      article:  document.getElementById('req-article')?.value.trim()  || '',
      category: document.getElementById('req-category')?.value        || '',
      type:     document.getElementById('req-type')?.value            || '',
      size:     document.getElementById('req-size')?.value.trim()     || '',
      qty,
      priority: document.getElementById('req-priority')?.value        || PRIO[1],
      notes:    document.getElementById('req-notes')?.value.trim()    || '',
      createdAt: editId ? (items.find(x => x.id === editId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
      done: false
    };

    if (editId) {
      const idx = items.findIndex(x => x.id === editId);
      if (idx !== -1) { item.done = items[idx].done; items[idx] = item; }
    } else {
      items.unshift(item);
    }

    save();
    showForm(false);
    renderList();
    App.toast(editId ? 'Requirement updated!' : 'Requirement added!', 'success');
  }

  // ── Render list ───────────────────────────────────────────
  function renderList() {
    const search  = (document.getElementById('rq-search')?.value  || '').toLowerCase();
    const prio    = document.getElementById('rq-prio')?.value     || '';
    const typeF   = document.getElementById('rq-type')?.value     || '';

    const filtered = items.filter(it => {
      const matchSearch = !search || [it.brand, it.article, it.notes, it.size].some(f => String(f || '').toLowerCase().includes(search));
      const matchPrio   = !prio   || it.priority === prio;
      const matchType   = !typeF  || it.type     === typeF;
      return matchSearch && matchPrio && matchType;
    });

    // Sort: Urgent first, then Normal, then Low; done items last
    const prioOrder = { '🔴 Urgent': 0, '🟡 Normal': 1, '🟢 Low': 2 };
    filtered.sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      return (prioOrder[a.priority] ?? 1) - (prioOrder[b.priority] ?? 1);
    });

    // Update summary bar
    const urgent = items.filter(i => !i.done && i.priority === '🔴 Urgent').length;
    const normal = items.filter(i => !i.done && i.priority === '🟡 Normal').length;
    const low    = items.filter(i => !i.done && i.priority === '🟢 Low').length;
    const totalQ = items.filter(i => !i.done).reduce((s, i) => s + (i.qty || 0), 0);
    const setEl  = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    setEl('rs-urgent',    urgent);
    setEl('rs-normal',    normal);
    setEl('rs-low',       low);
    setEl('rs-total-qty', totalQ.toLocaleString('en-IN') + ' pairs');

    const listEl  = document.getElementById('req-list');
    const emptyEl = document.getElementById('req-empty');

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

    // Attach events via delegation
    listEl.querySelectorAll('.req-done-cb').forEach(cb => {
      cb.addEventListener('change', function() { toggleDone(this.dataset.id, this.checked); });
    });
    listEl.querySelectorAll('.req-edit-btn').forEach(btn => {
      btn.addEventListener('click', function() { startEdit(this.dataset.id); });
    });
    listEl.querySelectorAll('.req-del-btn').forEach(btn => {
      btn.addEventListener('click', function() { deleteItem(this.dataset.id); });
    });
  }

  function toggleDone(id, done) {
    const it = items.find(x => x.id === id);
    if (it) { it.done = done; save(); renderList(); }
  }

  function startEdit(id) {
    const it = items.find(x => x.id === id);
    if (!it) return;
    editId = id;
    showForm(true, it);
  }

  function deleteItem(id) {
    if (!confirm('Remove this requirement?')) return;
    items = items.filter(x => x.id !== id);
    save();
    renderList();
    App.toast('Requirement removed.', 'info');
  }

  function clearFilters() {
    const s = document.getElementById('rq-search'); if (s) s.value = '';
    const p = document.getElementById('rq-prio');   if (p) p.value = '';
    const t = document.getElementById('rq-type');   if (t) t.value = '';
    renderList();
  }

  // ── Print list ────────────────────────────────────────────
  function printList() {
    const pending = items.filter(i => !i.done);
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

  return { render };
})();
