// ============================================================
// js/stock.js — Stock Management Module
// Columns (0-indexed):
//   0=Date  1=Brand  2=Article  3=Size  4=Category
//   5=Type  6=ShoeStyle  7=Color  8=Quantity  9=CostPrice  10=MRP
// ============================================================

const Stock = (() => {

  let allRows   = [];
  let editIndex = null;

  const CATS        = ['Men', 'Women', 'Kids'];
  const TYPES       = ['Sandal', 'Shoe', 'Slipper', 'Sports', 'Crocs', 'Flip Flops', 'Socks'];
  const SHOE_STYLES = ['Lace', 'Laceless'];

  // ── IST date helper ───────────────────────────────────────
  function getISTDateStr() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  }
  function getISTTimeStr() {
    return new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false });
  }
  // ── Safe display formatters for data coming from Google Sheets ───
  function fmtTime(val) {
    if (!val) return '—';
    const s = String(val);
    if (/^\d{2}:\d{2}/.test(s)) return s.slice(0, 5);
    try {
      const d = new Date(s);
      if (d.getFullYear() < 1970) {
        return d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false });
      }
      return d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false });
    } catch { return s; }
  }

  function fmtDate(val) {
    if (!val) return '—';
    const s = String(val);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    try {
      return new Date(s).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    } catch { return s; }
  }

  // ── Render ────────────────────────────────────────────────
  function render(rows) {
    allRows = rows;
    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="page-header">
        <div class="page-title">📦 Stock <span>Management</span></div>
        <button class="btn btn-primary" id="toggle-form-btn">+ Add New Entry</button>
      </div>

      <!-- Add / Edit Form -->
      <div class="form-card" id="stock-form-card" style="display:none">
        <div class="form-card-title" id="stock-form-title">➕ Add New Stock Entry</div>
        <form id="stock-form" novalidate>

          <!-- ── Header: date + how many size entries ── -->
          <div class="txn-header-grid">
            <div class="form-group">
              <label for="s-date">Date of Entry *</label>
              <input type="date" id="s-date" required />
            </div>
            <div class="form-group">
              <label for="s-time">Time of Entry *</label>
              <input type="time" id="s-time" required />
            </div>
            <div class="form-group">
              <label for="s-entries-count">How many size entries? *</label>
              <select id="s-entries-count" required>
                <option value="">Select count</option>
                ${[1,2,3,4,5,6,7,8].map(n => `<option value="${n}">${n} size entr${n > 1 ? 'ies' : 'y'}</option>`).join('')}
              </select>
            </div>
          </div>

          <!-- ── Same/Different model question ── -->
          <div id="stock-same-model-question" style="display:none" class="same-model-box">
            <div class="same-model-title">📦 Are all entries the <span>same model &amp; colour</span>?</div>
            <div class="same-model-btns">
              <button type="button" class="same-model-btn" id="stock-btn-same-yes">
                ✅ Yes — Same Model &amp; Colour
                <span class="same-model-hint">Only Size &amp; Qty will differ per entry</span>
              </button>
              <button type="button" class="same-model-btn" id="stock-btn-same-no">
                🔀 No — Different Models / Colours
                <span class="same-model-hint">Each entry filled separately</span>
              </button>
            </div>
          </div>

          <!-- ── Dynamic entry sections ── -->
          <div id="stock-entries-container"></div>

          <div class="form-actions">
            <button type="submit" class="btn btn-primary" id="stock-submit-btn">Save Stock Entry</button>
            <button type="button" class="btn btn-secondary" id="stock-cancel-btn">Cancel</button>
          </div>
        </form>
      </div>

      <!-- Filters -->
      <div class="filter-bar">
        <div class="filter-date-group">
          <label class="filter-label">From</label>
          <input type="date" id="sf-from" />
        </div>
        <div class="filter-date-group">
          <label class="filter-label">To</label>
          <input type="date" id="sf-to" />
        </div>
        <input type="text" id="sf-search" placeholder="🔍 Search brand, article, color…" />
        <select id="sf-category">
          <option value="">All Categories</option>
          ${CATS.map(c => `<option>${c}</option>`).join('')}
        </select>
        <select id="sf-type">
          <option value="">All Types</option>
          ${TYPES.map(t => `<option>${t}</option>`).join('')}
        </select>
        <button class="btn btn-secondary btn-sm" id="sf-clear">✕ Clear</button>
      </div>

      <!-- Table -->
      <div class="table-wrapper">
        <div class="table-header">
          <div class="table-header-title">Stock Entries</div>
          <div class="table-count" id="stock-count">— items</div>
        </div>
        <div class="table-scroll">
          <table id="stock-table">
            <thead>
              <tr>
                <th>#</th><th>Date</th><th>Time</th><th>Brand</th><th>Article</th>
                <th>Size</th><th>Cat.</th><th>Type</th><th>Style</th>
                <th>Color</th><th>Qty</th>
                <th>Wholesale Rate</th><th>MRP/pair</th><th>Total Wholesale Value</th><th>Actions</th>
              </tr>
            </thead>
            <tbody id="stock-tbody"></tbody>
          </table>
        </div>
      </div>
    `;

    // Set today's date (IST)
    document.getElementById('s-date').value = getISTDateStr();
    document.getElementById('s-time').value = getISTTimeStr();

    // Entries count change
    document.getElementById('s-entries-count').addEventListener('change', function () {
      const n = Number(this.value) || 0;
      if (n === 0) {
        hideStockSameQuestion();
        clearStockEntries();
        return;
      }
      if (n === 1) {
        hideStockSameQuestion();
        buildStockEntries(1, 'different');
      } else {
        showStockSameQuestion(n);
      }
    });

    document.getElementById('toggle-form-btn').addEventListener('click', () => { editIndex = null; showForm(true); });
    document.getElementById('stock-cancel-btn').addEventListener('click', () => showForm(false));
    document.getElementById('stock-form').addEventListener('submit', handleSubmit);
    document.getElementById('sf-search').addEventListener('input', renderTable);
    document.getElementById('sf-category').addEventListener('change', renderTable);
    document.getElementById('sf-type').addEventListener('change', renderTable);
    document.getElementById('sf-from').addEventListener('change', renderTable);
    document.getElementById('sf-to').addEventListener('change', renderTable);
    document.getElementById('sf-clear').addEventListener('click', clearFilters);

    renderTable();
  }

  // ── Same/Different question ───────────────────────────────
  function showStockSameQuestion(n) {
    const q = document.getElementById('stock-same-model-question');
    q.style.display = 'block';

    const yesBtn = document.getElementById('stock-btn-same-yes');
    const noBtn  = document.getElementById('stock-btn-same-no');
    const newYes = yesBtn.cloneNode(true);
    const newNo  = noBtn.cloneNode(true);
    yesBtn.parentNode.replaceChild(newYes, yesBtn);
    noBtn.parentNode.replaceChild(newNo, noBtn);

    newYes.addEventListener('click', () => {
      newYes.classList.add('selected');
      newNo.classList.remove('selected');
      buildStockEntries(n, 'same');
    });
    newNo.addEventListener('click', () => {
      newNo.classList.add('selected');
      newYes.classList.remove('selected');
      buildStockEntries(n, 'different');
    });
  }

  function hideStockSameQuestion() {
    const q = document.getElementById('stock-same-model-question');
    if (q) {
      q.style.display = 'none';
      document.getElementById('stock-btn-same-yes')?.classList.remove('selected');
      document.getElementById('stock-btn-same-no')?.classList.remove('selected');
    }
  }

  function clearStockEntries() {
    const c = document.getElementById('stock-entries-container');
    if (c) c.innerHTML = '';
  }

  // ── Capture existing entry data before rebuild ────────────
  function captureEntryData() {
    const data = [];
    let i = 0;
    while (
      document.getElementById(`se-brand-${i}`) ||
      document.getElementById(`se-size-var-${i}`)
    ) {
      if (document.getElementById(`se-brand-${i}`)) {
        // Different mode
        data.push({
          brand:     document.getElementById(`se-brand-${i}`)?.value || '',
          article:   document.getElementById(`se-article-${i}`)?.value || '',
          size:      document.getElementById(`se-size-${i}`)?.value || '',
          category:  document.getElementById(`se-category-${i}`)?.value || '',
          type:      document.getElementById(`se-type-${i}`)?.value || '',
          shoeStyle: document.getElementById(`se-shoestyle-${i}`)?.value || '',
          color:     document.getElementById(`se-color-${i}`)?.value || '',
          qty:       document.getElementById(`se-qty-${i}`)?.value || '',
          cost:      document.getElementById(`se-cost-${i}`)?.value || '',
          mrp:       document.getElementById(`se-mrp-${i}`)?.value || '',
        });
      } else {
        // Same mode variant
        data.push({
          brand:     document.getElementById('se-shared-brand')?.value || '',
          article:   document.getElementById('se-shared-article')?.value || '',
          size:      document.getElementById(`se-size-var-${i}`)?.value || '',
          category:  document.getElementById('se-shared-category')?.value || '',
          type:      document.getElementById('se-shared-type')?.value || '',
          shoeStyle: document.getElementById('se-shared-shoestyle')?.value || '',
          color:     document.getElementById('se-shared-color')?.value || '',
          qty:       document.getElementById(`se-qty-var-${i}`)?.value || '',
          cost:      document.getElementById('se-shared-cost')?.value || '',
          mrp:       document.getElementById('se-shared-mrp')?.value || '',
        });
      }
      i++;
    }
    return data;
  }

  // ── Build entry sections ──────────────────────────────────
  function buildStockEntries(n, mode) {
    const saved = captureEntryData();
    const container = document.getElementById('stock-entries-container');

    if (mode === 'same') {
      container.innerHTML = sameModeHTML(n);
      attachSameModeListeners(n);
      if (saved.length > 0) restoreSharedFields(saved[0]);
      for (let i = 0; i < n; i++) {
        if (saved[i]) restoreSameVariant(i, saved[i]);
      }
    } else {
      container.innerHTML = Array.from({ length: n }, (_, i) => entryHTML(i, n)).join('');
      for (let i = 0; i < n; i++) {
        attachDiffListeners(i);
        if (saved[i]) restoreDiffEntry(i, saved[i]);
      }
    }
  }

  function restoreSharedFields(d) {
    const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
    set('se-shared-brand',     d.brand);
    set('se-shared-article',   d.article);
    set('se-shared-category',  d.category);
    set('se-shared-type',      d.type);
    set('se-shared-shoestyle', d.shoeStyle);
    set('se-shared-color',     d.color);
    set('se-shared-cost',      d.cost);
    set('se-shared-mrp',       d.mrp);
    if (d.type === 'Shoe') {
      const sg = document.getElementById('se-shared-shoestyle-group');
      if (sg) sg.style.display = 'flex';
    }
  }

  function restoreSameVariant(i, d) {
    const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
    set(`se-size-var-${i}`, d.size);
    set(`se-qty-var-${i}`,  d.qty);
  }

  function restoreDiffEntry(i, d) {
    const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
    set(`se-brand-${i}`,     d.brand);
    set(`se-article-${i}`,   d.article);
    set(`se-size-${i}`,      d.size);
    set(`se-category-${i}`,  d.category);
    set(`se-type-${i}`,      d.type);
    set(`se-shoestyle-${i}`, d.shoeStyle);
    set(`se-color-${i}`,     d.color);
    set(`se-qty-${i}`,       d.qty);
    set(`se-cost-${i}`,      d.cost);
    set(`se-mrp-${i}`,       d.mrp);
    if (d.type === 'Shoe') {
      const sg = document.getElementById(`se-shoestyle-group-${i}`);
      if (sg) sg.style.display = 'flex';
    }
  }

  // ── Same Mode HTML ────────────────────────────────────────
  function sameModeHTML(n) {
    return `
      <div class="same-model-shared-section">
        <div class="pair-section-header">
          <span class="pair-section-label">📋 Shared Model Details</span>
          <span class="pair-section-hint">These fields apply to all ${n} size entries</span>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label for="se-shared-brand">Brand Name *</label>
            <input type="text" id="se-shared-brand" placeholder="e.g. Bata, Sparx, Campus" required />
          </div>
          <div class="form-group">
            <label for="se-shared-article">Article / Model *</label>
            <input type="text" id="se-shared-article" placeholder="Model name" required />
          </div>
          <div class="form-group">
            <label for="se-shared-category">Category *</label>
            <select id="se-shared-category" required>
              <option value="">Select category</option>
              ${CATS.map(c => `<option>${c}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label for="se-shared-type">Type *</label>
            <select id="se-shared-type" required>
              <option value="">Select type</option>
              ${TYPES.map(t => `<option>${t}</option>`).join('')}
            </select>
          </div>
          <div class="form-group" id="se-shared-shoestyle-group" style="display:none">
            <label for="se-shared-shoestyle">Shoe Style *</label>
            <select id="se-shared-shoestyle">
              <option value="">Select style</option>
              ${SHOE_STYLES.map(s => `<option>${s}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label for="se-shared-color">Color *</label>
            <input type="text" id="se-shared-color" placeholder="e.g. Black, Navy Blue" required />
          </div>
          <div class="form-group">
            <label for="se-shared-cost">Wholesale Rate / pair (₹) *</label>
            <input type="number" id="se-shared-cost" placeholder="0.00" min="0" step="0.01" required />
          </div>
          <div class="form-group">
            <label for="se-shared-mrp">MRP / pair (₹) *</label>
            <input type="number" id="se-shared-mrp" placeholder="0.00" min="0" step="0.01" required />
          </div>
        </div>
      </div>

      <div class="same-pairs-variants">
        <div class="pair-section-header" style="margin-bottom:12px">
          <span class="pair-section-label">📏 Per-Entry: Size &amp; Quantity</span>
          <span class="pair-section-hint">Enter size and qty for each entry</span>
        </div>
        <div class="same-variants-grid">
          ${Array.from({ length: n }, (_, i) => `
            <div class="variant-card" id="stock-variant-card-${i}">
              <div class="variant-card-label">Entry ${i + 1}</div>
              <div class="form-group">
                <label for="se-size-var-${i}">Size *</label>
                <input type="number" id="se-size-var-${i}" placeholder="6–12" min="1" max="15" required />
              </div>
              <div class="form-group">
                <label for="se-qty-var-${i}">Qty (pairs) *</label>
                <input type="number" id="se-qty-var-${i}" placeholder="0" min="0" required />
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function attachSameModeListeners(n) {
    document.getElementById('se-shared-type')?.addEventListener('change', function () {
      const sg = document.getElementById('se-shared-shoestyle-group');
      sg.style.display = this.value === 'Shoe' ? 'flex' : 'none';
      if (this.value !== 'Shoe') document.getElementById('se-shared-shoestyle').value = '';
    });

    // ── Auto-propagate Entry 1's size to all other entries ──
    const sizeEl0 = document.getElementById('se-size-var-0');
    if (sizeEl0) {
      sizeEl0.addEventListener('input', function () {
        const newVal = this.value;
        for (let j = 1; j < n; j++) {
          const el = document.getElementById(`se-size-var-${j}`);
          if (el && (el.value === '' || el.dataset.synced !== 'false')) {
            el.value = newVal;
            el.dataset.synced = 'true';
          }
        }
      });
    }

    // Mark later entries as manually overridden if user edits them directly
    for (let i = 1; i < n; i++) {
      const sEl = document.getElementById(`se-size-var-${i}`);
      if (sEl) sEl.addEventListener('input', function () { this.dataset.synced = 'false'; });
    }
  }

  // ── Different Mode HTML ───────────────────────────────────
  function entryHTML(i, total) {
    const label = total > 1 ? `Entry ${i + 1} of ${total}` : 'Stock Details';
    return `
      <div class="pair-section" id="stock-entry-section-${i}">
        <div class="pair-section-header">
          <span class="pair-section-label">📦 ${label}</span>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label for="se-brand-${i}">Brand Name *</label>
            <input type="text" id="se-brand-${i}" placeholder="e.g. Bata, Sparx, Campus" required />
          </div>
          <div class="form-group">
            <label for="se-article-${i}">Article / Model *</label>
            <input type="text" id="se-article-${i}" placeholder="Model name" required />
          </div>
          <div class="form-group">
            <label for="se-size-${i}">Size *</label>
            <input type="number" id="se-size-${i}" placeholder="6–12" min="1" max="15" required />
          </div>
          <div class="form-group">
            <label for="se-category-${i}">Category *</label>
            <select id="se-category-${i}" required>
              <option value="">Select category</option>
              ${CATS.map(c => `<option>${c}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label for="se-type-${i}">Type *</label>
            <select id="se-type-${i}" required>
              <option value="">Select type</option>
              ${TYPES.map(t => `<option>${t}</option>`).join('')}
            </select>
          </div>
          <div class="form-group" id="se-shoestyle-group-${i}" style="display:none">
            <label for="se-shoestyle-${i}">Shoe Style *</label>
            <select id="se-shoestyle-${i}">
              <option value="">Select style</option>
              ${SHOE_STYLES.map(s => `<option>${s}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label for="se-color-${i}">Color *</label>
            <input type="text" id="se-color-${i}" placeholder="e.g. Black, Navy Blue" required />
          </div>
          <div class="form-group">
            <label for="se-qty-${i}">Quantity (pairs) *</label>
            <input type="number" id="se-qty-${i}" placeholder="0" min="0" required />
          </div>
          <div class="form-group">
            <label for="se-cost-${i}">Wholesale Rate / pair (₹) *</label>
            <input type="number" id="se-cost-${i}" placeholder="0.00" min="0" step="0.01" required />
          </div>
          <div class="form-group">
            <label for="se-mrp-${i}">MRP / pair (₹) *</label>
            <input type="number" id="se-mrp-${i}" placeholder="0.00" min="0" step="0.01" required />
          </div>
        </div>
      </div>
    `;
  }

  function attachDiffListeners(i) {
    document.getElementById(`se-type-${i}`)?.addEventListener('change', function () {
      const sg = document.getElementById(`se-shoestyle-group-${i}`);
      sg.style.display = this.value === 'Shoe' ? 'flex' : 'none';
      if (this.value !== 'Shoe') document.getElementById(`se-shoestyle-${i}`).value = '';
    });
  }

  // ── Detect current form mode ──────────────────────────────
  function getCurrentMode() {
    return document.getElementById('se-shared-brand') ? 'same' : 'different';
  }

  // ── Show / hide form ──────────────────────────────────────
  function showForm(show) {
    const card = document.getElementById('stock-form-card');
    const btn  = document.getElementById('toggle-form-btn');
    card.style.display = show ? 'block' : 'none';
    btn.textContent = show ? '✕ Close Form' : '+ Add New Entry';
    if (!show) {
      document.getElementById('stock-form').reset();
      document.getElementById('s-date').value = getISTDateStr();
    document.getElementById('s-time').value = getISTTimeStr();
      document.getElementById('stock-form-title').textContent = '➕ Add New Stock Entry';
      document.getElementById('stock-submit-btn').textContent = 'Save Stock Entry';
      hideStockSameQuestion();
      clearStockEntries();
      editIndex = null;
    }
    if (show) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ── Submit ────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('stock-submit-btn');

    const date  = document.getElementById('s-date').value.trim();
    const count = Number(document.getElementById('s-entries-count').value) || 0;

    if (!date)  { App.toast('Please fill in Date.', 'error'); return; }
    if (!count) { App.toast('Please select number of entries.', 'error'); return; }

    const mode = getCurrentMode();
    const entryRows = [];

    if (mode === 'same') {
      // Collect shared fields
      const brand     = document.getElementById('se-shared-brand')?.value.trim()     || '';
      const article   = document.getElementById('se-shared-article')?.value.trim()   || '';
      const cat       = document.getElementById('se-shared-category')?.value          || '';
      const type      = document.getElementById('se-shared-type')?.value              || '';
      const shoeStyle = document.getElementById('se-shared-shoestyle')?.value         || '';
      const color     = document.getElementById('se-shared-color')?.value.trim()      || '';
      const cost      = Number(document.getElementById('se-shared-cost')?.value)      || 0;
      const mrp       = Number(document.getElementById('se-shared-mrp')?.value)       || 0;

      if (!brand)   { App.toast('Brand missing (shared).', 'error'); return; }
      if (!article) { App.toast('Article missing (shared).', 'error'); return; }
      if (!cat)     { App.toast('Category missing (shared).', 'error'); return; }
      if (!type)    { App.toast('Type missing (shared).', 'error'); return; }
      if (!color)   { App.toast('Color missing (shared).', 'error'); return; }
      if (type === 'Shoe' && !shoeStyle) { App.toast('Shoe Style missing (shared).', 'error'); return; }
      if (!cost || !mrp) { App.toast('Wholesale Rate / MRP missing (shared).', 'error'); return; }
      if (mrp < cost)    { App.toast('MRP cannot be less than Wholesale Rate.', 'error'); return; }

      for (let i = 0; i < count; i++) {
        const size = document.getElementById(`se-size-var-${i}`)?.value.trim() || '';
        const qty  = Number(document.getElementById(`se-qty-var-${i}`)?.value)  || 0;
        const lbl  = ` (Entry ${i + 1})`;
        if (!size)  { App.toast(`Size missing${lbl}.`, 'error'); return; }
        if (qty < 0){ App.toast(`Qty invalid${lbl}.`, 'error'); return; }

        entryRows.push([date, time, brand, article, Number(size), cat, type, shoeStyle, color, qty, cost, mrp]);
      }

    } else {
      // Different mode — single or multiple independent entries
      for (let i = 0; i < count; i++) {
        const brand     = document.getElementById(`se-brand-${i}`)?.value.trim()     || '';
        const article   = document.getElementById(`se-article-${i}`)?.value.trim()   || '';
        const size      = document.getElementById(`se-size-${i}`)?.value.trim()       || '';
        const cat       = document.getElementById(`se-category-${i}`)?.value          || '';
        const type      = document.getElementById(`se-type-${i}`)?.value              || '';
        const shoeStyle = document.getElementById(`se-shoestyle-${i}`)?.value         || '';
        const color     = document.getElementById(`se-color-${i}`)?.value.trim()      || '';
        const qty       = Number(document.getElementById(`se-qty-${i}`)?.value)       || 0;
        const cost      = Number(document.getElementById(`se-cost-${i}`)?.value)      || 0;
        const mrp       = Number(document.getElementById(`se-mrp-${i}`)?.value)       || 0;
        const lbl       = count > 1 ? ` (Entry ${i + 1})` : '';

        if (!brand)   { App.toast(`Brand missing${lbl}.`, 'error'); return; }
        if (!article) { App.toast(`Article missing${lbl}.`, 'error'); return; }
        if (!size)    { App.toast(`Size missing${lbl}.`, 'error'); return; }
        if (!cat)     { App.toast(`Category missing${lbl}.`, 'error'); return; }
        if (!type)    { App.toast(`Type missing${lbl}.`, 'error'); return; }
        if (!color)   { App.toast(`Color missing${lbl}.`, 'error'); return; }
        if (type === 'Shoe' && !shoeStyle) { App.toast(`Shoe Style missing${lbl}.`, 'error'); return; }
        if (!cost || !mrp) { App.toast(`Prices missing${lbl}.`, 'error'); return; }
        if (mrp < cost)    { App.toast(`MRP < Wholesale Rate${lbl}.`, 'error'); return; }

        entryRows.push([date, time, brand, article, Number(size), cat, type, shoeStyle, color, qty, cost, mrp]);
      }
    }

    btn.disabled = true; btn.textContent = 'Saving…';
    try {
      if (editIndex !== null) {
        // Edit always updates a single row
        await API.updateStock(editIndex, entryRows[0]);
        allRows[editIndex] = entryRows[0];
        App.toast('Stock entry updated!', 'success');
      } else {
        for (const row of entryRows) {
          await API.addStock(row);
          allRows.push(row);
        }
        App.toast(
          entryRows.length > 1
            ? `${entryRows.length} stock entries saved successfully!`
            : 'Stock entry added successfully!',
          'success'
        );
      }
      showForm(false);
      renderTable();
    } catch (err) {
      App.toast('Error: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = editIndex !== null ? 'Update Entry' : 'Save Stock Entry';
    }
  }

  // ── Table render ──────────────────────────────────────────
  function renderTable() {
    const search = (document.getElementById('sf-search')?.value || '').toLowerCase();
    const cat    = document.getElementById('sf-category')?.value || '';
    const type   = document.getElementById('sf-type')?.value || '';
    const from   = document.getElementById('sf-from')?.value || '';
    const to     = document.getElementById('sf-to')?.value   || '';

    const filtered = allRows.filter(r => {
      const dStr    = String(r[0] || '').slice(0, 10);
      const brand   = String(r[2] || '').toLowerCase();
      const article = String(r[3] || '').toLowerCase();
      const color   = String(r[8] || '').toLowerCase();
      const matchSearch = !search || brand.includes(search) || article.includes(search) || color.includes(search);
      const matchCat    = !cat  || r[5] === cat;
      const matchType   = !type || r[6] === type;
      const matchFrom   = !from || dStr >= from;
      const matchTo     = !to   || dStr <= to;
      return matchSearch && matchCat && matchType && matchFrom && matchTo;
    });

    document.getElementById('stock-count').textContent = `${filtered.length} item${filtered.length !== 1 ? 's' : ''}`;
    const tbody = document.getElementById('stock-tbody');

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="14"><div class="empty-state"><div class="empty-icon">📦</div><p>No stock entries found</p></div></td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map((r, fi) => {
      const origIdx = allRows.indexOf(r);
      const qty  = Number(r[9]) || 0;
      const cost = Number(r[10]) || 0;
      const totalCostVal = qty * cost;
      const qtyBadge = qty <= 2
        ? `<span class="badge badge-red">${qty}</span>`
        : `<span style="color:var(--text)">${qty}</span>`;
      const styleCell = r[7] ? `<span class="badge badge-gold">${r[7]}</span>` : '<span style="color:var(--text3)">—</span>';
      return `
        <tr>
          <td>${fi + 1}</td>
          <td>${fmtDate(r[0])}</td>
          <td style="color:var(--text3)">${fmtTime(r[1])}</td>
          <td><strong style="color:var(--text)">${r[2] || '—'}</strong></td>
          <td>${r[3] || '—'}</td>
          <td>${r[4] || '—'}</td>
          <td><span class="badge badge-blue">${r[5] || '—'}</span></td>
          <td><span class="badge badge-orange">${r[6] || '—'}</span></td>
          <td>${styleCell}</td>
          <td>${r[8] || '—'}</td>
          <td>${qtyBadge}</td>
          <td>₹${Number(r[10] || 0).toLocaleString('en-IN')}</td>
          <td>₹${Number(r[11] || 0).toLocaleString('en-IN')}</td>
          <td style="color:var(--accent);font-weight:700">₹${totalCostVal.toLocaleString('en-IN')}</td>
          <td>
            <div class="action-btns">
              <button class="action-sell" onclick="Stock.sell(${origIdx})">💰 Sell</button>
              <button class="action-edit" onclick="Stock.edit(${origIdx})">Edit</button>
              <button class="action-delete" onclick="Stock.delete(${origIdx})">Delete</button>
            </div>
          </td>
        </tr>`;
    }).join('');
  }

  function clearFilters() {
    document.getElementById('sf-search').value = '';
    document.getElementById('sf-category').value = '';
    document.getElementById('sf-type').value = '';
    const sfFrom = document.getElementById('sf-from'); if (sfFrom) sfFrom.value = '';
    const sfTo   = document.getElementById('sf-to');   if (sfTo)   sfTo.value   = '';
    renderTable();
  }

  // ── Edit (single-row mode) ────────────────────────────────
  function edit(origIdx) {
    editIndex = origIdx;
    const r = allRows[origIdx];

    showForm(true);

    // Set count to 1 and use "different" mode (single entry edit)
    document.getElementById('s-entries-count').value = 1;
    hideStockSameQuestion();

    const container = document.getElementById('stock-entries-container');
    container.innerHTML = entryHTML(0, 1);
    attachDiffListeners(0);

    document.getElementById('s-date').value         = r[0] || '';
    document.getElementById('s-time').value         = r[1] || '';
    document.getElementById('se-brand-0').value     = r[2] || '';
    document.getElementById('se-article-0').value   = r[3] || '';
    document.getElementById('se-size-0').value      = r[4] || '';
    document.getElementById('se-category-0').value  = r[5] || '';
    document.getElementById('se-type-0').value      = r[6] || '';
    document.getElementById('se-shoestyle-0').value = r[7] || '';
    document.getElementById('se-color-0').value     = r[8] || '';
    document.getElementById('se-qty-0').value       = r[9] || '';
    document.getElementById('se-cost-0').value      = r[10] || '';
    document.getElementById('se-mrp-0').value       = r[11] || '';

    if (r[6] === 'Shoe') {
      document.getElementById('se-shoestyle-group-0').style.display = 'flex';
    }

    document.getElementById('stock-form-title').textContent  = '✏️ Edit Stock Entry';
    document.getElementById('stock-submit-btn').textContent  = 'Update Entry';
  }

  async function del(origIdx) {
    if (!confirm('Delete this stock entry? This cannot be undone.')) return;
    try {
      await API.deleteStock(origIdx);
      allRows.splice(origIdx, 1);
      renderTable();
      App.toast('Stock entry deleted.', 'info');
    } catch (err) {
      App.toast('Error: ' + err.message, 'error');
    }
  }

  // ── Sell: open quick-sell modal ───────────────────────────
  function sell(origIdx) {
    const r = allRows[origIdx];
    const stockQty = Number(r[9]) || 0;
    const mrp      = Number(r[11]) || 0;

    // Remove any existing modal
    document.getElementById('sell-modal-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'sell-modal-overlay';
    overlay.innerHTML = `
      <div class="modal-box" id="sell-modal-box">
        <div class="modal-header">
          <div class="modal-title">💰 Sell This Item</div>
          <button class="modal-close" id="sell-modal-close">✕</button>
        </div>
        <div class="modal-body">
          <!-- Stock item summary -->
          <div class="modal-stock-info">
            <div class="modal-stock-info-row"><span>Brand</span><strong>${r[2] || '—'}</strong></div>
            <div class="modal-stock-info-row"><span>Article</span><strong>${r[3] || '—'}</strong></div>
            <div class="modal-stock-info-row"><span>Size</span><strong>${r[4] || '—'}</strong></div>
            <div class="modal-stock-info-row"><span>Color</span><strong>${r[8] || '—'}</strong></div>
            <div class="modal-stock-info-row"><span>Category</span><strong>${r[5] || '—'}</strong></div>
            <div class="modal-stock-info-row"><span>Type</span><strong>${r[6] || '—'}</strong></div>
            <div class="modal-stock-info-row"><span>Stock Available</span><strong style="color:var(--green)">${stockQty} pairs</strong></div>
            <div class="modal-stock-info-row"><span>Wholesale Rate</span><strong>₹${(Number(r[10])||0).toLocaleString('en-IN')}</strong></div>
            <div class="modal-stock-info-row"><span>MRP / pair</span><strong>₹${(Number(r[11])||0).toLocaleString('en-IN')}</strong></div>
          </div>

          <!-- Sale details -->
          <div class="form-grid" style="grid-template-columns:1fr 1fr;gap:12px">
            <div class="form-group">
              <label for="sell-modal-date">Sale Date *</label>
              <input type="date" id="sell-modal-date" />
            </div>
            <div class="form-group">
              <label for="sell-modal-time">Sale Time *</label>
              <input type="time" id="sell-modal-time" />
            </div>
            <div class="form-group">
              <label for="sell-modal-qty">Qty to Sell * <span style="color:var(--text3);font-weight:400">(max ${stockQty})</span></label>
              <input type="number" id="sell-modal-qty" min="1" max="${stockQty}" value="1" />
            </div>
            <div class="form-group">
              <label for="sell-modal-price">Selling Price / pair (₹) *</label>
              <input type="number" id="sell-modal-price" placeholder="0.00" min="0" step="0.01" />
            </div>
          </div>

          <!-- Live calc -->
          <div class="calc-grid" style="margin-top:12px;padding:12px 14px">
            <div class="calc-item">
              <div class="calc-label">Total Sale</div>
              <div class="calc-value" id="sell-modal-total-sale">₹0</div>
            </div>
            <div class="calc-item">
              <div class="calc-label">Profit / pair</div>
              <div class="calc-value" id="sell-modal-profit-pair">₹0</div>
            </div>
            <div class="calc-item">
              <div class="calc-label">Total Profit</div>
              <div class="calc-value" id="sell-modal-total-profit">₹0</div>
            </div>
            <div class="calc-item">
              <div class="calc-label">Discount / pair</div>
              <div class="calc-value" id="sell-modal-discount">₹0</div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="sell-modal-cancel">Cancel</button>
          <button class="btn btn-primary" id="sell-modal-confirm" style="background:linear-gradient(135deg,var(--green),#059669)">✅ Confirm Sale</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Prefill date/time IST
    document.getElementById('sell-modal-date').value = getISTDateStr();
    document.getElementById('sell-modal-time').value = new Date().toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false
    });

    // Live calculation
    const calcSell = () => {
      const qty   = Number(document.getElementById('sell-modal-qty')?.value)   || 0;
      const price = Number(document.getElementById('sell-modal-price')?.value) || 0;
      const cost  = Number(r[10]) || 0;
      const inr   = n => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
      const profitPair  = price - cost;
      const totalSale   = qty * price;
      const totalProfit = qty * profitPair;
      const discount    = mrp - price;
      const setC = (id, val) => {
        const el = document.getElementById(id);
        if (el) { el.textContent = inr(val); el.style.color = val < 0 ? 'var(--red)' : 'var(--accent)'; }
      };
      setC('sell-modal-total-sale',   totalSale);
      setC('sell-modal-profit-pair',  profitPair);
      setC('sell-modal-total-profit', totalProfit);
      setC('sell-modal-discount',     discount);
    };
    document.getElementById('sell-modal-qty').addEventListener('input', calcSell);
    document.getElementById('sell-modal-price').addEventListener('input', calcSell);

    // Close handlers
    const closeModal = () => overlay.remove();
    document.getElementById('sell-modal-close').addEventListener('click', closeModal);
    document.getElementById('sell-modal-cancel').addEventListener('click', closeModal);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });

    // Confirm sale
    document.getElementById('sell-modal-confirm').addEventListener('click', async () => {
      const saleDate  = document.getElementById('sell-modal-date').value.trim();
      const saleTime  = document.getElementById('sell-modal-time').value.trim();
      const qtyToSell = Number(document.getElementById('sell-modal-qty').value) || 0;
      const sellPrice = Number(document.getElementById('sell-modal-price').value) || 0;
      const costPrice = Number(r[10]) || 0;
      const mrpPrice  = Number(r[11]) || 0;

      if (!saleDate) { App.toast('Please enter sale date.', 'error'); return; }
      if (!saleTime) { App.toast('Please enter sale time.', 'error'); return; }
      if (qtyToSell < 1)         { App.toast('Qty to sell must be at least 1.', 'error'); return; }
      if (qtyToSell > stockQty)  { App.toast(`Only ${stockQty} pairs in stock.`, 'error'); return; }
      if (!sellPrice)            { App.toast('Please enter selling price.', 'error'); return; }
      if (sellPrice > mrpPrice)  { App.toast('Selling price cannot exceed MRP.', 'error'); return; }

      const totalSale   = qtyToSell * sellPrice;
      const totalCost   = qtyToSell * costPrice;
      const profitPair  = sellPrice - costPrice;
      const totalProfit = qtyToSell * profitPair;
      const discount    = mrpPrice - sellPrice;

      // Sale row: [Date,Time,Brand,Article,Size,Cat,Type,ShoeStyle,Color,PairsTxn,Qty,Cost,MRP,Sell,TotalSale,TotalCost,ProfitPair,TotalProfit,Discount]
      const saleRow = [
        saleDate, saleTime,
        r[2], r[3], r[4], r[5], r[6], r[7] || '', r[8],
        1, qtyToSell, costPrice, mrpPrice, sellPrice,
        totalSale, totalCost, profitPair, totalProfit, discount
      ];

      const confirmBtn = document.getElementById('sell-modal-confirm');
      confirmBtn.disabled = true; confirmBtn.textContent = 'Saving…';

      try {
        // 1. Add sale record to Google Sheets
        await API.addSale(saleRow);

        // 2. Update shared App salesRows store
        App.addSaleRow(saleRow);

        // 3. Update or delete stock in Google Sheets + shared store
        const newQty = stockQty - qtyToSell;
        if (newQty <= 0) {
          await API.deleteStock(origIdx);
          allRows.splice(origIdx, 1);
          App.removeStockRow(origIdx);
        } else {
          const updatedStockRow = [...r];
          updatedStockRow[8] = newQty;
          await API.updateStock(origIdx, updatedStockRow);
          allRows[origIdx] = updatedStockRow;
          App.updateStockRow(origIdx, updatedStockRow);
        }

        closeModal();

        // 4. Show toast then navigate to Sales Management
        App.toast(
          `✅ Sold ${qtyToSell} pair${qtyToSell > 1 ? 's' : ''} of ${r[2]} ${r[3]} (Size ${r[4]}) — added to Sales!`,
          'success'
        );

        // Small delay so user sees the toast before navigating
        setTimeout(() => App.navigate('sales'), 800);

      } catch (err) {
        App.toast('Error: ' + err.message, 'error');
        confirmBtn.disabled = false; confirmBtn.textContent = '✅ Confirm Sale';
      }
    });
  }

  return { render, edit, sell, delete: del };
})();
