// ============================================================
// js/sales.js — Sales Management Module  (multi-pair transaction)
// Columns (0-indexed) in Product_sales sheet:
//   0=Date  1=Time  2=Brand  3=Article  4=Size  5=Category
//   6=Type  7=ShoeStyle  8=Color  9=PairsInTransaction
//   10=QtySold  11=WholesaleRate  12=MRP  13=SellingPrice
//   14=TotalSale  15=TotalCost  16=ProfitPerPair  17=TotalProfit  18=Discount
// ============================================================

const Sales = (() => {

  let allRows   = [];
  let editIndex = null;

  const CATS        = ['Men', 'Women', 'Kids'];
  const TYPES       = ['Sandal', 'Shoes', 'Slipper', 'Crocs', 'Flip Flops', 'Socks'];
  const SHOE_STYLES = ['Lace', 'Velcro', 'Buckle', 'Loafer', 'Sports', 'Formal Lace', 'Formal Laceless', 'Safety Shoe', 'Water Shoe', 'Laceless'];
  const inr         = n => '₹' + Number(n || 0).toLocaleString('en-IN');

  // ── IST helpers ──────────────────────────────────────────
  function getISTDateStr() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD
  }
  function getISTTimeStr() {
    return new Date().toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false
    });
  }

  // ── Safe display formatters for data coming from Google Sheets ───
  // Handles both clean strings ('2026-06-03') and ISO timestamps
  // ('2026-06-02T18:30:00.000Z') that Sheets sometimes returns.
  function fmtDate(val) {
    if (!val) return '—';
    const s = String(val);
    // Already a plain YYYY-MM-DD string
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    // ISO timestamp — convert to IST date
    try {
      return new Date(s).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    } catch { return s; }
  }

  function fmtTime(val) {
    if (!val) return '—';
    const s = String(val);
    // Already HH:MM format
    if (/^\d{2}:\d{2}/.test(s)) return s.slice(0, 5);
    // ISO timestamp from Sheets (1899-12-30T13:04:50.000Z for time-only cells)
    try {
      const d = new Date(s);
      // Time-only serial (year 1899/1900) — extract HH:MM in IST
      if (d.getFullYear() < 1970) {
        return new Date(s).toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false
        });
      }
      // Full ISO datetime — extract time in IST
      return new Date(s).toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false
      });
    } catch { return s; }
  }

  // ── Render page ───────────────────────────────────────────────────────────
  function render(rows) {
    allRows = rows;
    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="page-header">
        <div class="page-title">🛒 Sales <span>Management</span></div>
        <div style="display:flex;gap:10px;align-items:center">
          <button class="btn btn-secondary" id="quick-entry-btn">⚡ Quick Entry</button>
          <button class="btn btn-primary" id="toggle-sale-btn">+ Record Sale</button>
        </div>
      </div>

      <!-- Record Sale Form -->
      <div class="form-card" id="sale-form-card" style="display:none">
        <div class="form-card-title" id="sale-form-title">🛒 Record a Sale</div>
        <form id="sale-form" novalidate>

          <!-- ── Transaction-level header ── -->
          <div class="txn-header-grid">
            <div class="form-group">
              <label for="sl-date">Date of Sale *</label>
              <input type="date" id="sl-date" required />
            </div>
            <div class="form-group">
              <label for="sl-time">Time of Sale *</label>
              <input type="time" id="sl-time" required />
            </div>
            <div class="form-group">
              <label for="sl-pairs-txn">No. of Pairs in This Transaction *</label>
              <select id="sl-pairs-txn" required>
                <option value="">How many pairs sold?</option>
                ${[1,2,3,4,5,6,7].map(n => `<option value="${n}">${n} pair${n > 1 ? 's' : ''}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label style="font-size:.8rem;color:var(--text2);font-weight:600;display:block;margin-bottom:8px">💳 Payment Mode</label>
              <div class="payment-toggle" id="sl-payment-toggle">
                <button type="button" class="pay-btn active" data-mode="Cash" id="sl-pay-cash">💵 Cash</button>
                <button type="button" class="pay-btn" data-mode="UPI" id="sl-pay-upi">📱 UPI</button>
              </div>
            </div>
          </div>

          <!-- ── Same/Different model question ── -->
          <div id="same-model-question" style="display:none" class="same-model-box">
            <div class="same-model-title">📦 Are all pairs the <span>same model</span>?</div>
            <div class="same-model-btns">
              <button type="button" class="same-model-btn" id="btn-same-yes">
                ✅ Yes — Same Model
                <span class="same-model-hint">Only Size & Color will differ</span>
              </button>
              <button type="button" class="same-model-btn" id="btn-same-no">
                🔀 No — Different Models
                <span class="same-model-hint">Each pair entered separately</span>
              </button>
            </div>
          </div>

          <!-- ── Dynamic pair sections injected here ── -->
          <div id="pairs-container"></div>

          <!-- ── Transaction total summary ── -->
          <div class="txn-summary" id="txn-summary" style="display:none">
            <div class="txn-summary-title">📊 Transaction Summary</div>
            <div class="calc-grid">
              <div class="calc-item">
                <div class="calc-label">Total Sale Amount</div>
                <div class="calc-value" id="txn-total-sale">₹0</div>
              </div>
              <div class="calc-item">
                <div class="calc-label">Total Wholesale Value</div>
                <div class="calc-value" id="txn-total-cost">₹0</div>
              </div>
              <div class="calc-item">
                <div class="calc-label">Total Profit</div>
                <div class="calc-value" id="txn-total-profit">₹0</div>
              </div>
              <div class="calc-item">
                <div class="calc-label">Total Discount Given</div>
                <div class="calc-value" id="txn-total-discount">₹0</div>
              </div>
            </div>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn btn-primary" id="sale-submit-btn">Save Sale</button>
            <button type="button" class="btn btn-secondary" id="sale-cancel-btn">Cancel</button>
          </div>
        </form>
      </div>

      <!-- Filters -->
      <div class="filter-bar">
        <div class="filter-date-group">
          <label class="filter-label">From</label>
          <input type="date" id="ff-from" title="From date" />
        </div>
        <div class="filter-date-group">
          <label class="filter-label">To</label>
          <input type="date" id="ff-to" title="To date" />
        </div>
        <input type="text" id="ff-search" placeholder="🔍 Search brand, article, color…" />
        <select id="ff-category">
          <option value="">All Categories</option>
          ${CATS.map(c => `<option>${c}</option>`).join('')}
        </select>
        <select id="ff-type">
          <option value="">All Types</option>
          ${TYPES.map(t => `<option>${t}</option>`).join('')}
        </select>
        <button class="btn btn-secondary btn-sm" id="ff-clear">✕ Clear</button>
      </div>

      <!-- Table -->
      <div class="table-wrapper">
        <div class="table-header">
          <div class="table-header-title">Sales History</div>
          <div class="table-count" id="sales-count">— records</div>
        </div>
        <div class="table-scroll">
          <table id="sales-table">
            <thead>
              <tr>
                <th>#</th><th>Date</th><th>Time</th><th>Brand</th><th>Article</th>
                <th>Size</th><th>Cat.</th><th>Type</th><th>Style</th><th>Color</th>
                <th>Pairs/Txn</th><th>Qty</th><th>Wholesale Rate</th><th>MRP</th>
                <th>Sell Price</th><th>Total Sale</th><th>Total Wholesale Value</th>
                <th>Profit/Pair</th><th>Total Profit</th><th>Discount</th><th>Payment</th><th>Actions</th>
              </tr>
            </thead>
            <tbody id="sales-tbody"></tbody>
            <tfoot id="sales-tfoot"></tfoot>
          </table>
        </div>
      </div>
    `;

    // Prefill date + time using IST
    document.getElementById('sl-date').value = getISTDateStr();
    document.getElementById('sl-time').value = getISTTimeStr();

    // When pairs count changes
    document.getElementById('sl-pairs-txn').addEventListener('change', function () {
      const n = Number(this.value) || 0;
      if (n === 0) {
        hideSameModelQuestion();
        clearPairsContainer();
        return;
      }
      if (n === 1) {
        // Single pair — no need to ask same/different
        hideSameModelQuestion();
        buildPairSections(1, 'different', 1);
      } else {
        showSameModelQuestion(n);
      }
    });

    document.getElementById('toggle-sale-btn').addEventListener('click', () => { editIndex = null; showForm(true); });
    document.getElementById('sale-cancel-btn').addEventListener('click', () => showForm(false));
    document.getElementById('sale-form').addEventListener('submit', handleSubmit);
    document.getElementById('quick-entry-btn').addEventListener('click', showQuickEntryModal);

    // Payment toggle in sale form
    document.getElementById('sl-payment-toggle')?.querySelectorAll('.pay-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        document.querySelectorAll('#sl-payment-toggle .pay-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
      });
    });

    document.getElementById('ff-search').addEventListener('input', renderTable);
    document.getElementById('ff-category').addEventListener('change', renderTable);
    document.getElementById('ff-type').addEventListener('change', renderTable);
    document.getElementById('ff-from').addEventListener('change', renderTable);
    document.getElementById('ff-to').addEventListener('change', renderTable);
    document.getElementById('ff-clear').addEventListener('click', clearFilters);

    renderTable();
  }

  // ── Same/Different model question ─────────────────────────
  function showSameModelQuestion(n) {
    const q = document.getElementById('same-model-question');
    q.style.display = 'block';
    // Remove previous listeners by cloning
    const yesBtn = document.getElementById('btn-same-yes');
    const noBtn  = document.getElementById('btn-same-no');
    const newYes = yesBtn.cloneNode(true);
    const newNo  = noBtn.cloneNode(true);
    yesBtn.parentNode.replaceChild(newYes, yesBtn);
    noBtn.parentNode.replaceChild(newNo, noBtn);

    newYes.addEventListener('click', () => {
      newYes.classList.add('selected');
      newNo.classList.remove('selected');
      buildPairSections(n, 'same', n);
    });
    newNo.addEventListener('click', () => {
      newNo.classList.add('selected');
      newYes.classList.remove('selected');
      buildPairSections(n, 'different', n);
    });
  }

  function hideSameModelQuestion() {
    const q = document.getElementById('same-model-question');
    if (q) {
      q.style.display = 'none';
      // Reset selection
      document.getElementById('btn-same-yes')?.classList.remove('selected');
      document.getElementById('btn-same-no')?.classList.remove('selected');
    }
  }

  function clearPairsContainer() {
    document.getElementById('pairs-container').innerHTML = '';
    document.getElementById('txn-summary').style.display = 'none';
  }

  // ── Build N pair entry blocks ─────────────────────────────
  // mode: 'same' = shared model, only size+color per pair
  //       'different' = full independent form per pair
  // prevCount: how many pair sections already existed (for preservation)
  function buildPairSections(n, mode, totalPairs) {
    const container = document.getElementById('pairs-container');
    const summary   = document.getElementById('txn-summary');

    // Capture existing data before rebuild (preservation on count increase)
    const savedData = capturePairData();

    if (!n) {
      container.innerHTML = '';
      summary.style.display = 'none';
      return;
    }

    if (mode === 'same') {
      container.innerHTML = sameModeHTML(n);
      summary.style.display = n > 1 ? 'block' : 'none';
      attachSameModeListeners(n);
      // Restore shared fields if we had prior data
      if (savedData.length > 0) restoreSameSharedFields(savedData[0]);
      for (let i = 0; i < n; i++) {
        if (savedData[i]) restoreSameVariantFields(i, savedData[i]);
      }
      updateSameModeCalc(n);
    } else {
      // Different mode — rebuild, preserving existing pair data
      container.innerHTML = Array.from({ length: n }, (_, i) => pairSectionHTML(i, n)).join('');
      summary.style.display = n > 1 ? 'block' : 'none';
      for (let i = 0; i < n; i++) {
        attachDifferentModeListeners(i, n);
        if (savedData[i]) restoreDifferentPairData(i, savedData[i]);
      }
      updateTxnSummary(n);
    }
  }

  // ── Capture existing pair form values ─────────────────────
  function capturePairData() {
    const data = [];
    let i = 0;
    while (document.getElementById(`sl-brand-${i}`) || document.getElementById(`sl-size-var-${i}`)) {
      if (document.getElementById(`sl-brand-${i}`)) {
        // Different mode
        data.push({
          brand:     document.getElementById(`sl-brand-${i}`)?.value || '',
          article:   document.getElementById(`sl-article-${i}`)?.value || '',
          size:      document.getElementById(`sl-size-${i}`)?.value || '',
          category:  document.getElementById(`sl-category-${i}`)?.value || '',
          type:      document.getElementById(`sl-type-${i}`)?.value || '',
          shoeStyle: document.getElementById(`sl-shoestyle-${i}`)?.value || '',
          color:     document.getElementById(`sl-color-${i}`)?.value || '',
          qty:       document.getElementById(`sl-qty-${i}`)?.value || '1',
          cost:      document.getElementById(`sl-cost-${i}`)?.value || '',
          mrp:       document.getElementById(`sl-mrp-${i}`)?.value || '',
          sell:      document.getElementById(`sl-sell-${i}`)?.value || '',
        });
      } else {
        // Same mode variant
        data.push({
          brand:     document.getElementById('sl-shared-brand')?.value || '',
          article:   document.getElementById('sl-shared-article')?.value || '',
          size:      document.getElementById(`sl-size-var-${i}`)?.value || '',
          category:  document.getElementById('sl-shared-category')?.value || '',
          type:      document.getElementById('sl-shared-type')?.value || '',
          shoeStyle: document.getElementById('sl-shared-shoestyle')?.value || '',
          color:     document.getElementById(`sl-color-var-${i}`)?.value || '',
          qty:       document.getElementById(`sl-qty-var-${i}`)?.value || '1',
          cost:      document.getElementById('sl-shared-cost')?.value || '',
          mrp:       document.getElementById('sl-shared-mrp')?.value || '',
          sell:      document.getElementById('sl-shared-sell')?.value || '',
        });
      }
      i++;
    }
    return data;
  }

  function restoreDifferentPairData(i, d) {
    const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
    set(`sl-brand-${i}`,    d.brand);
    set(`sl-article-${i}`,  d.article);
    set(`sl-size-${i}`,     d.size);
    set(`sl-category-${i}`, d.category);
    set(`sl-type-${i}`,     d.type);
    set(`sl-shoestyle-${i}`,d.shoeStyle);
    set(`sl-color-${i}`,    d.color);
    set(`sl-qty-${i}`,      d.qty);
    set(`sl-cost-${i}`,     d.cost);
    set(`sl-mrp-${i}`,      d.mrp);
    set(`sl-sell-${i}`,     d.sell);
    if (d.type === 'Shoes') {
      const sg = document.getElementById(`sl-shoestyle-group-${i}`);
      if (sg) sg.style.display = 'flex';
    }
    updatePairCalc(i);
  }

  function restoreSameSharedFields(d) {
    const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
    set('sl-shared-brand',    d.brand);
    set('sl-shared-article',  d.article);
    set('sl-shared-category', d.category);
    set('sl-shared-type',     d.type);
    set('sl-shared-shoestyle',d.shoeStyle);
    set('sl-shared-cost',     d.cost);
    set('sl-shared-mrp',      d.mrp);
    set('sl-shared-sell',     d.sell);
    if (d.type === 'Shoes') {
      const sg = document.getElementById('sl-shared-shoestyle-group');
      if (sg) sg.style.display = 'flex';
    }
  }

  function restoreSameVariantFields(i, d) {
    const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
    set(`sl-size-var-${i}`,  d.size);
    set(`sl-color-var-${i}`, d.color);
    set(`sl-qty-var-${i}`,   d.qty);
  }

  // ── Same Model HTML ───────────────────────────────────────
  function sameModeHTML(n) {
    return `
      <div class="same-model-shared-section">
        <div class="pair-section-header">
          <span class="pair-section-label">📋 Shared Model Details</span>
          <span class="pair-section-hint">These fields apply to all ${n} pairs</span>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label for="sl-shared-brand">Brand Name *</label>
            <input type="text" id="sl-shared-brand" placeholder="e.g. Bata, Sparx" required />
          </div>
          <div class="form-group">
            <label for="sl-shared-article">Article / Model *</label>
            <input type="text" id="sl-shared-article" placeholder="Model name" required />
          </div>
          <div class="form-group">
            <label for="sl-shared-category">Category *</label>
            <select id="sl-shared-category" required>
              <option value="">Select category</option>
              ${CATS.map(c => `<option>${c}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label for="sl-shared-type">Type *</label>
            <select id="sl-shared-type" required>
              <option value="">Select type</option>
              ${TYPES.map(t => `<option>${t}</option>`).join('')}
            </select>
          </div>
          <div class="form-group" id="sl-shared-shoestyle-group" style="display:none">
            <label for="sl-shared-shoestyle">Shoe Style *</label>
            <select id="sl-shared-shoestyle">
              <option value="">Select style</option>
              ${SHOE_STYLES.map(s => `<option>${s}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label for="sl-shared-cost">Wholesale Rate / pair (₹) *</label>
            <input type="number" id="sl-shared-cost" placeholder="0" min="0" step="1" required />
          </div>
          <div class="form-group">
            <label for="sl-shared-mrp">MRP / pair (₹) *</label>
            <input type="number" id="sl-shared-mrp" placeholder="0" min="0" step="1" required />
          </div>
          <div class="form-group">
            <label for="sl-shared-sell">Selling Price / pair (₹) *</label>
            <input type="number" id="sl-shared-sell" placeholder="0" min="0" step="1" required />
          </div>
        </div>
      </div>

      <div class="same-pairs-variants">
        <div class="pair-section-header" style="margin-bottom:12px">
          <span class="pair-section-label">👟 Per-Pair: Size &amp; Color</span>
          <span class="pair-section-hint">Enter size and colour for each pair</span>
        </div>
        <div class="same-variants-grid">
          ${Array.from({ length: n }, (_, i) => `
            <div class="variant-card" id="variant-card-${i}">
              <div class="variant-card-label">Pair ${i + 1}</div>
              <div class="form-group">
                <label for="sl-size-var-${i}">Size *</label>
                <input type="number" id="sl-size-var-${i}" placeholder="6–12" min="1" max="15" required />
              </div>
              <div class="form-group">
                <label for="sl-color-var-${i}">Color *</label>
                <input type="text" id="sl-color-var-${i}" placeholder="e.g. Black" required />
              </div>
              <div class="form-group">
                <label for="sl-qty-var-${i}">Qty *</label>
                <input type="number" id="sl-qty-var-${i}" value="1" min="1" required />
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Per-pair summary preview for same mode -->
      <div class="calc-grid pair-calc" id="same-mode-calc" style="margin-top:16px">
        <div class="calc-item">
          <div class="calc-label">Profit / Pair</div>
          <div class="calc-value" id="sm-profit-pair">₹0</div>
        </div>
        <div class="calc-item">
          <div class="calc-label">Discount / Pair</div>
          <div class="calc-value" id="sm-discount-pair">₹0</div>
        </div>
        <div class="calc-item">
          <div class="calc-label">Estimated Total Sale</div>
          <div class="calc-value" id="sm-total-sale">₹0</div>
        </div>
        <div class="calc-item">
          <div class="calc-label">Estimated Total Profit</div>
          <div class="calc-value" id="sm-total-profit">₹0</div>
        </div>
      </div>
    `;
  }

  function attachSameModeListeners(n) {
    // Show/hide shoe style
    document.getElementById('sl-shared-type')?.addEventListener('change', function () {
      const sg = document.getElementById('sl-shared-shoestyle-group');
      sg.style.display = this.value === 'Shoes' ? 'flex' : 'none';
      if (this.value !== 'Shoes') document.getElementById('sl-shared-shoestyle').value = '';
      updateSameModeCalc(n);
    });

    ['sl-shared-cost', 'sl-shared-mrp', 'sl-shared-sell'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', () => updateSameModeCalc(n));
    });

    // ── Auto-propagate Pair 1's size & color to all other pairs ──
    // When Pair 1 is typed, copy value to pairs that are still empty OR
    // still have the same value as Pair 1 (i.e. were auto-filled, not manually changed)
    const sizeEl0  = document.getElementById('sl-size-var-0');
    const colorEl0 = document.getElementById('sl-color-var-0');

    if (sizeEl0) {
      sizeEl0.addEventListener('input', function () {
        const newVal = this.value;
        for (let j = 1; j < n; j++) {
          const el = document.getElementById(`sl-size-var-${j}`);
          if (el && (el.value === '' || el.dataset.synced !== 'false')) {
            el.value = newVal;
            el.dataset.synced = 'true';
          }
        }
        updateSameModeCalc(n);
      });
    }

    if (colorEl0) {
      colorEl0.addEventListener('input', function () {
        const newVal = this.value;
        for (let j = 1; j < n; j++) {
          const el = document.getElementById(`sl-color-var-${j}`);
          if (el && (el.value === '' || el.dataset.synced !== 'false')) {
            el.value = newVal;
            el.dataset.synced = 'true';
          }
        }
      });
    }

    // Mark a pair as manually overridden when user directly edits it (not Pair 1)
    for (let i = 1; i < n; i++) {
      const sEl = document.getElementById(`sl-size-var-${i}`);
      const cEl = document.getElementById(`sl-color-var-${i}`);
      if (sEl) sEl.addEventListener('input', function () { this.dataset.synced = 'false'; updateSameModeCalc(n); });
      if (cEl) cEl.addEventListener('input', function () { this.dataset.synced = 'false'; });
    }

    for (let i = 0; i < n; i++) {
      document.getElementById(`sl-qty-var-${i}`)?.addEventListener('input', () => updateSameModeCalc(n));
    }
  }

  function updateSameModeCalc(n) {
    const cost = Number(document.getElementById('sl-shared-cost')?.value) || 0;
    const mrp  = Number(document.getElementById('sl-shared-mrp')?.value)  || 0;
    const sell = Number(document.getElementById('sl-shared-sell')?.value) || 0;

    const profitPair  = sell - cost;
    const discount    = mrp - sell;

    let totalQty = 0;
    for (let i = 0; i < n; i++) {
      totalQty += Number(document.getElementById(`sl-qty-var-${i}`)?.value) || 0;
    }

    const totalSale   = totalQty * sell;
    const totalProfit = totalQty * profitPair;

    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) { el.textContent = inr(val); el.style.color = val < 0 ? 'var(--red)' : 'var(--accent)'; }
    };
    set('sm-profit-pair',  profitPair);
    set('sm-discount-pair',discount);
    set('sm-total-sale',   totalSale);
    set('sm-total-profit', totalProfit);

    // Also update txn summary
    const setS = (id, val) => {
      const el = document.getElementById(id);
      if (el) { el.textContent = inr(val); el.style.color = val < 0 ? 'var(--red)' : 'var(--accent)'; }
    };
    setS('txn-total-sale',    totalSale);
    setS('txn-total-cost',    totalQty * cost);
    setS('txn-total-profit',  totalProfit);
    setS('txn-total-discount',discount * totalQty);
  }

  // ── Different Mode HTML ───────────────────────────────────
  function pairSectionHTML(i, total) {
    const label = total > 1 ? `Pair ${i + 1} of ${total}` : 'Pair Details';
    return `
      <div class="pair-section" id="pair-section-${i}">
        <div class="pair-section-header">
          <span class="pair-section-label">👟 ${label}</span>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label for="sl-brand-${i}">Brand Name *</label>
            <input type="text" id="sl-brand-${i}" placeholder="e.g. Bata, Sparx" required />
          </div>
          <div class="form-group">
            <label for="sl-article-${i}">Article / Model *</label>
            <input type="text" id="sl-article-${i}" placeholder="Model name" required />
          </div>
          <div class="form-group">
            <label for="sl-size-${i}">Size *</label>
            <input type="number" id="sl-size-${i}" placeholder="6–12" min="1" max="15" required />
          </div>
          <div class="form-group">
            <label for="sl-category-${i}">Category *</label>
            <select id="sl-category-${i}" required>
              <option value="">Select category</option>
              ${CATS.map(c => `<option>${c}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label for="sl-type-${i}">Type *</label>
            <select id="sl-type-${i}" required>
              <option value="">Select type</option>
              ${TYPES.map(t => `<option>${t}</option>`).join('')}
            </select>
          </div>
          <div class="form-group" id="sl-shoestyle-group-${i}" style="display:none">
            <label for="sl-shoestyle-${i}">Shoe Style *</label>
            <select id="sl-shoestyle-${i}">
              <option value="">Select style</option>
              ${SHOE_STYLES.map(s => `<option>${s}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label for="sl-color-${i}">Color *</label>
            <input type="text" id="sl-color-${i}" placeholder="e.g. Black, Red" required />
          </div>
          <div class="form-group">
            <label for="sl-qty-${i}">Qty Sold *</label>
            <input type="number" id="sl-qty-${i}" placeholder="1" min="1" value="1" required />
          </div>
          <div class="form-group">
            <label for="sl-cost-${i}">Wholesale Rate / pair (₹) *</label>
            <input type="number" id="sl-cost-${i}" placeholder="0" min="0" step="1" required />
          </div>
          <div class="form-group">
            <label for="sl-mrp-${i}">MRP / pair (₹) *</label>
            <input type="number" id="sl-mrp-${i}" placeholder="0" min="0" step="1" required />
          </div>
          <div class="form-group">
            <label for="sl-sell-${i}">Selling Price / pair (₹) *</label>
            <input type="number" id="sl-sell-${i}" placeholder="0" min="0" step="1" required />
          </div>
        </div>

        <!-- Per-pair auto-calculated preview -->
        <div class="calc-grid pair-calc">
          <div class="calc-item">
            <div class="calc-label">Total Sale</div>
            <div class="calc-value" id="c-total-sale-${i}">₹0</div>
          </div>
          <div class="calc-item">
            <div class="calc-label">Total Wholesale Value</div>
            <div class="calc-value" id="c-total-cost-${i}">₹0</div>
          </div>
          <div class="calc-item">
            <div class="calc-label">Profit / Pair</div>
            <div class="calc-value" id="c-profit-pair-${i}">₹0</div>
          </div>
          <div class="calc-item">
            <div class="calc-label">Total Profit</div>
            <div class="calc-value" id="c-total-profit-${i}">₹0</div>
          </div>
          <div class="calc-item">
            <div class="calc-label">Discount</div>
            <div class="calc-value" id="c-discount-${i}">₹0</div>
          </div>
        </div>
      </div>
    `;
  }

  function attachDifferentModeListeners(i, n) {
    document.getElementById(`sl-type-${i}`)?.addEventListener('change', function () {
      const sg = document.getElementById(`sl-shoestyle-group-${i}`);
      sg.style.display = this.value === 'Shoes' ? 'flex' : 'none';
      if (this.value !== 'Shoes') document.getElementById(`sl-shoestyle-${i}`).value = '';
    });

    [`sl-qty-${i}`, `sl-cost-${i}`, `sl-mrp-${i}`, `sl-sell-${i}`].forEach(id =>
      document.getElementById(id)?.addEventListener('input', () => { updatePairCalc(i); updateTxnSummary(n); })
    );
  }

  function updatePairCalc(i) {
    const qty  = Number(document.getElementById(`sl-qty-${i}`)?.value)  || 0;
    const cost = Number(document.getElementById(`sl-cost-${i}`)?.value) || 0;
    const mrp  = Number(document.getElementById(`sl-mrp-${i}`)?.value)  || 0;
    const sell = Number(document.getElementById(`sl-sell-${i}`)?.value) || 0;

    const totalSale   = qty * sell;
    const totalCost   = qty * cost;
    const profitPair  = sell - cost;
    const totalProfit = qty * profitPair;
    const discount    = mrp - sell;

    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) { el.textContent = inr(val); el.style.color = val < 0 ? 'var(--red)' : 'var(--accent)'; }
    };
    set(`c-total-sale-${i}`,   totalSale);
    set(`c-total-cost-${i}`,   totalCost);
    set(`c-profit-pair-${i}`,  profitPair);
    set(`c-total-profit-${i}`, totalProfit);
    set(`c-discount-${i}`,     discount);
  }

  function updateTxnSummary(n) {
    let totSale = 0, totCost = 0, totProfit = 0, totDiscount = 0;
    for (let i = 0; i < n; i++) {
      const qty  = Number(document.getElementById(`sl-qty-${i}`)?.value)  || 0;
      const cost = Number(document.getElementById(`sl-cost-${i}`)?.value) || 0;
      const mrp  = Number(document.getElementById(`sl-mrp-${i}`)?.value)  || 0;
      const sell = Number(document.getElementById(`sl-sell-${i}`)?.value) || 0;
      totSale    += qty * sell;
      totCost    += qty * cost;
      totProfit  += qty * (sell - cost);
      totDiscount += (mrp - sell) * qty;
    }
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) { el.textContent = inr(val); el.style.color = val < 0 ? 'var(--red)' : 'var(--accent)'; }
    };
    set('txn-total-sale',    totSale);
    set('txn-total-cost',    totCost);
    set('txn-total-profit',  totProfit);
    set('txn-total-discount',totDiscount);
  }

  // ── Detect current mode ───────────────────────────────────
  function getCurrentMode() {
    // Check if same-mode shared fields exist
    if (document.getElementById('sl-shared-brand')) return 'same';
    return 'different';
  }

  // ── Show / hide form ──────────────────────────────────────
  function showForm(show) {
    const card = document.getElementById('sale-form-card');
    const btn  = document.getElementById('toggle-sale-btn');
    card.style.display = show ? 'block' : 'none';
    btn.textContent = show ? '✕ Close Form' : '+ Record Sale';
    if (!show) {
      document.getElementById('sale-form').reset();
      document.getElementById('sl-date').value = getISTDateStr();
      document.getElementById('sl-time').value = getISTTimeStr();
      document.getElementById('sale-form-title').textContent = '🛒 Record a Sale';
      document.getElementById('sale-submit-btn').textContent = 'Save Sale';
      document.getElementById('pairs-container').innerHTML = '';
      document.getElementById('txn-summary').style.display = 'none';
      hideSameModelQuestion();
      editIndex = null;
    }
    if (show) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ── Submit: save one row per pair ─────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('sale-submit-btn');

    const date     = document.getElementById('sl-date').value.trim();
    const time     = document.getElementById('sl-time').value.trim();
    const pairsTxn = Number(document.getElementById('sl-pairs-txn').value) || 0;
    const payMode  = document.querySelector('#sl-payment-toggle .pay-btn.active')?.dataset.mode || 'Cash';

    if (!date || !time)   { App.toast('Please fill in Date and Time.', 'error'); return; }
    if (!pairsTxn)        { App.toast('Please select number of pairs.', 'error'); return; }

    const mode = getCurrentMode();
    const pairRows = [];

    if (mode === 'same') {
      // Collect shared fields
      const brand     = document.getElementById('sl-shared-brand')?.value.trim()    || '';
      const article   = document.getElementById('sl-shared-article')?.value.trim()  || '';
      const cat       = document.getElementById('sl-shared-category')?.value        || '';
      const type      = document.getElementById('sl-shared-type')?.value            || '';
      const shoeStyle = document.getElementById('sl-shared-shoestyle')?.value       || '';
      const cost      = Number(document.getElementById('sl-shared-cost')?.value)    || 0;
      const mrp       = Number(document.getElementById('sl-shared-mrp')?.value)     || 0;
      const sell      = Number(document.getElementById('sl-shared-sell')?.value)    || 0;

      if (!brand)   { App.toast('Brand missing (shared).', 'error'); return; }
      if (!article) { App.toast('Article missing (shared).', 'error'); return; }
      if (!cat)     { App.toast('Category missing (shared).', 'error'); return; }
      if (!type)    { App.toast('Type missing (shared).', 'error'); return; }
      if (type === 'Shoes' && !shoeStyle) { App.toast('Shoe Style missing (shared).', 'error'); return; }
      if (!cost || !mrp || !sell) { App.toast('Prices missing (shared).', 'error'); return; }
      if (sell > mrp) { App.toast('Selling price > MRP (shared).', 'error'); return; }

      for (let i = 0; i < pairsTxn; i++) {
        const size  = document.getElementById(`sl-size-var-${i}`)?.value.trim()  || '';
        const color = document.getElementById(`sl-color-var-${i}`)?.value.trim() || '';
        const qty   = Number(document.getElementById(`sl-qty-var-${i}`)?.value)  || 0;
        const label = ` (Pair ${i + 1})`;
        if (!size)  { App.toast(`Size missing${label}.`, 'error'); return; }
        if (!color) { App.toast(`Color missing${label}.`, 'error'); return; }
        if (qty < 1){ App.toast(`Qty must be ≥ 1${label}.`, 'error'); return; }

        const totalSale   = qty * sell;
        const totalCost   = qty * cost;
        const profitPair  = sell - cost;
        const totalProfit = qty * profitPair;
        const discount    = mrp - sell;

        pairRows.push([
          date, time, brand, article, Number(size), cat, type, shoeStyle, color,
          pairsTxn, qty, cost, mrp, sell,
          totalSale, totalCost, profitPair, totalProfit, discount, payMode
        ]);
      }
    } else {
      // Different mode
      for (let i = 0; i < pairsTxn; i++) {
        const brand     = document.getElementById(`sl-brand-${i}`)?.value.trim()    || '';
        const article   = document.getElementById(`sl-article-${i}`)?.value.trim()  || '';
        const size      = document.getElementById(`sl-size-${i}`)?.value.trim()     || '';
        const cat       = document.getElementById(`sl-category-${i}`)?.value        || '';
        const type      = document.getElementById(`sl-type-${i}`)?.value            || '';
        const shoeStyle = document.getElementById(`sl-shoestyle-${i}`)?.value       || '';
        const color     = document.getElementById(`sl-color-${i}`)?.value.trim()    || '';
        const qty       = Number(document.getElementById(`sl-qty-${i}`)?.value)     || 0;
        const cost      = Number(document.getElementById(`sl-cost-${i}`)?.value)    || 0;
        const mrp       = Number(document.getElementById(`sl-mrp-${i}`)?.value)     || 0;
        const sell      = Number(document.getElementById(`sl-sell-${i}`)?.value)    || 0;

        const label = pairsTxn > 1 ? ` (Pair ${i + 1})` : '';
        if (!brand)   { App.toast(`Brand missing${label}.`,   'error'); return; }
        if (!article) { App.toast(`Article missing${label}.`, 'error'); return; }
        if (!size)    { App.toast(`Size missing${label}.`,    'error'); return; }
        if (!cat)     { App.toast(`Category missing${label}.`,'error'); return; }
        if (!type)    { App.toast(`Type missing${label}.`,    'error'); return; }
        if (!color)   { App.toast(`Color missing${label}.`,   'error'); return; }
        if (qty < 1)  { App.toast(`Qty must be ≥ 1${label}.`,'error'); return; }
        if (!cost || !mrp || !sell) { App.toast(`Prices missing${label}.`, 'error'); return; }
        if (type === 'Shoes' && !shoeStyle) { App.toast(`Shoe Style missing${label}.`, 'error'); return; }
        if (sell > mrp) { App.toast(`Selling price > MRP${label}.`, 'error'); return; }

        const totalSale   = qty * sell;
        const totalCost   = qty * cost;
        const profitPair  = sell - cost;
        const totalProfit = qty * profitPair;
        const discount    = mrp - sell;

        pairRows.push([
          date, time, brand, article, Number(size), cat, type, shoeStyle, color,
          pairsTxn, qty, cost, mrp, sell,
          totalSale, totalCost, profitPair, totalProfit, discount, payMode
        ]);
      }
    }

    // ── Save ──
    btn.disabled = true; btn.textContent = 'Saving…';
    try {
      if (editIndex !== null) {
        await API.updateSale(editIndex, pairRows[0]);
        allRows[editIndex] = pairRows[0];
        App.toast('Sale record updated!', 'success');
      } else {
        for (const row of pairRows) {
          await API.addSale(row);
          allRows.push(row);
        }
        App.toast(
          pairRows.length > 1
            ? `${pairRows.length} sale records saved successfully!`
            : 'Sale recorded successfully!',
          'success'
        );
      }
      showForm(false);
      renderTable();
    } catch (err) {
      App.toast('Error: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = editIndex !== null ? 'Update Sale' : 'Save Sale';
    }
  }

  // ── Table render ──────────────────────────────────────────
  function renderTable() {
    const search = (document.getElementById('ff-search')?.value || '').toLowerCase();
    const cat    = document.getElementById('ff-category')?.value || '';
    const type   = document.getElementById('ff-type')?.value    || '';
    const from   = document.getElementById('ff-from')?.value || '';
    const to     = document.getElementById('ff-to')?.value   || '';

    const filtered = allRows.filter(r => {
      const dStr    = String(r[0] || '').slice(0, 10);
      const brand   = String(r[2] || '').toLowerCase();
      const article = String(r[3] || '').toLowerCase();
      const color   = String(r[8] || '').toLowerCase();
      const matchSearch = !search || brand.includes(search) || article.includes(search) || color.includes(search);
      const matchCat    = !cat    || r[5] === cat;
      const matchType   = !type   || r[6] === type;
      const matchFrom   = !from   || dStr >= from;
      const matchTo     = !to     || dStr <= to;
      return matchSearch && matchCat && matchType && matchFrom && matchTo;
    });

    document.getElementById('sales-count').textContent = `${filtered.length} record${filtered.length !== 1 ? 's' : ''}`;
    const tbody = document.getElementById('sales-tbody');
    const tfoot = document.getElementById('sales-tfoot');

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="22"><div class="empty-state"><div class="empty-icon">🛒</div><p>No sales records found</p></div></td></tr>`;
      tfoot.innerHTML = '';
      return;
    }

    tbody.innerHTML = filtered.map((r, fi) => {
      const origIdx = allRows.indexOf(r);
      const profit  = Number(r[17]) || 0;
      const profCol = profit >= 0 ? 'var(--green)' : 'var(--red)';
      const styleCell = r[7] ? `<span class="badge badge-gold">${r[7]}</span>` : '<span style="color:var(--text3)">—</span>';
      const payMode = r[19] || 'Cash';
      const payBadge = payMode === 'UPI'
        ? `<span class="badge" style="background:rgba(99,102,241,.18);color:#818cf8">📱 UPI</span>`
        : `<span class="badge" style="background:rgba(16,185,129,.15);color:#10b981">💵 Cash</span>`;
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
          <td style="text-align:center"><span class="badge badge-green">${r[9] || 1}</span></td>
          <td>${r[10] || 0}</td>
          <td>₹${Number(r[11]||0).toLocaleString('en-IN')}</td>
          <td>₹${Number(r[12]||0).toLocaleString('en-IN')}</td>
          <td>₹${Number(r[13]||0).toLocaleString('en-IN')}</td>
          <td style="color:var(--text);font-weight:600">₹${Number(r[14]||0).toLocaleString('en-IN')}</td>
          <td>₹${Number(r[15]||0).toLocaleString('en-IN')}</td>
          <td>₹${Number(r[16]||0).toLocaleString('en-IN')}</td>
          <td style="color:${profCol};font-weight:700">₹${profit.toLocaleString('en-IN')}</td>
          <td>₹${Number(r[18]||0).toLocaleString('en-IN')}</td>
          <td>${payBadge}</td>
          <td>
            <div class="action-btns">
              <button class="action-edit" onclick="Sales.edit(${origIdx})">Edit</button>
              <button class="action-delete" onclick="Sales.delete(${origIdx})">Delete</button>
            </div>
          </td>
        </tr>`;
    }).join('');

    // Summary footer
    const totSale   = filtered.reduce((s, r) => s + (Number(r[14]) || 0), 0);
    const totCost   = filtered.reduce((s, r) => s + (Number(r[15]) || 0), 0);
    const totProfit = filtered.reduce((s, r) => s + (Number(r[17]) || 0), 0);
    tfoot.innerHTML = `
      <tr class="tfoot-summary">
        <td colspan="15" style="text-align:right;color:var(--text2)">TOTAL (${filtered.length} records):</td>
        <td>${inr(totSale)}</td>
        <td>${inr(totCost)}</td>
        <td>—</td>
        <td>${inr(totProfit)}</td>
        <td colspan="3">—</td>
      </tr>`;
  }

  function clearFilters() {
    ['ff-search','ff-from','ff-to'].forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
    document.getElementById('ff-category').value = '';
    document.getElementById('ff-type').value = '';
    renderTable();
  }

  // ── Edit (always single-row mode) ─────────────────────────
  function edit(origIdx) {
    editIndex = origIdx;
    const r = allRows[origIdx];
    showForm(true);

    document.getElementById('sl-date').value      = r[0]  || '';
    document.getElementById('sl-time').value      = r[1]  || '';
    document.getElementById('sl-pairs-txn').value = r[9]  || 1;

    // Edit always uses "different" mode with 1 pair section
    hideSameModelQuestion();
    const container = document.getElementById('pairs-container');
    container.innerHTML = pairSectionHTML(0, 1);
    attachDifferentModeListeners(0, 1);

    document.getElementById('sl-brand-0').value     = r[2]  || '';
    document.getElementById('sl-article-0').value   = r[3]  || '';
    document.getElementById('sl-size-0').value       = r[4]  || '';
    document.getElementById('sl-category-0').value  = r[5]  || '';
    document.getElementById('sl-type-0').value       = r[6]  || '';
    document.getElementById('sl-shoestyle-0').value = r[7]  || '';
    document.getElementById('sl-color-0').value     = r[8]  || '';
    document.getElementById('sl-qty-0').value        = r[10] || '';
    document.getElementById('sl-cost-0').value       = r[11] || '';
    document.getElementById('sl-mrp-0').value        = r[12] || '';
    document.getElementById('sl-sell-0').value       = r[13] || '';

    if (r[6] === 'Shoes') {
      document.getElementById('sl-shoestyle-group-0').style.display = 'flex';
    }

    document.getElementById('sale-form-title').textContent  = '✏️ Edit Sale Record';
    document.getElementById('sale-submit-btn').textContent  = 'Update Sale';
    document.getElementById('txn-summary').style.display = 'none';
    updatePairCalc(0);
  }

  async function del(origIdx) {
    if (!confirm('Delete this sale record? This cannot be undone.')) return;
    try {
      await API.deleteSale(origIdx);
      allRows.splice(origIdx, 1);
      renderTable();
      App.toast('Sale record deleted.', 'info');
    } catch (err) {
      App.toast('Error: ' + err.message, 'error');
    }
  }


  // ── Quick Entry Modal ─────────────────────────────────────
  // Allows directly entering total sale amount + profit for one or more
  // dates without needing to enter brand/model/size details.
  function showQuickEntryModal() {
    document.getElementById('quick-entry-modal-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'quick-entry-modal-overlay';
    overlay.innerHTML = `
      <div class="modal-box" id="quick-entry-modal-box" style="max-width:520px">
        <div class="modal-header">
          <div class="modal-title">⚡ Quick Sales Entry</div>
          <button class="modal-close" id="qe-close">✕</button>
        </div>
        <div class="modal-body" style="max-height:70vh;overflow-y:auto">
          <p style="color:var(--text2);font-size:.85rem;margin-bottom:16px;line-height:1.5">
            Directly enter the total <strong>Sale Amount</strong> and <strong>Profit</strong> for each date — no shoe details needed.
          </p>
          <div id="qe-rows-container"></div>
          <button type="button" class="btn btn-secondary btn-sm" id="qe-add-row" style="margin-top:4px;width:100%">
            + Add Another Date
          </button>
          <div class="form-actions" style="margin-top:20px">
            <button type="button" class="btn btn-primary" id="qe-save">💾 Save Entries</button>
            <button type="button" class="btn btn-secondary" id="qe-cancel">Cancel</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const container = document.getElementById('qe-rows-container');
    let nextId = 0;

    // ── Event delegation: handles delete for ALL rows (initial + added) ──
    container.addEventListener('click', function (e) {
      const btn = e.target.closest('.qe-delete-btn');
      if (btn) {
        const rowId = btn.getAttribute('data-row-id');
        document.getElementById(rowId)?.remove();
      }
    });

    function addRow(defaultDate) {
      const rowId = `qe-row-${nextId++}`;
      const div = document.createElement('div');
      div.id = rowId;
      div.className = 'qe-entry-row';
      div.style.cssText = 'display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid var(--border)';
      div.innerHTML = `
        <div class="form-group" style="margin:0;flex:1;min-width:110px">
          <label style="font-size:.75rem;margin-bottom:4px;display:block">Date *</label>
          <input type="date" class="qe-date" value="${defaultDate}" style="width:100%" />
        </div>
        <div class="form-group" style="margin:0;flex:1;min-width:110px">
          <label style="font-size:.75rem;margin-bottom:4px;display:block">Total Sale (₹) *</label>
          <input type="number" class="qe-sale" placeholder="0" min="0" step="1" style="width:100%" />
        </div>
        <div class="form-group" style="margin:0;flex:1;min-width:110px">
          <label style="font-size:.75rem;margin-bottom:4px;display:block">Total Profit (₹) *</label>
          <input type="number" class="qe-profit" placeholder="0" step="1" style="width:100%" />
        </div>
        <button type="button"
          class="qe-delete-btn"
          data-row-id="${rowId}"
          style="flex-shrink:0;background:#ef4444;color:#fff;border:none;border-radius:8px;padding:8px 14px;cursor:pointer;font-size:.9rem;font-weight:700;line-height:1;align-self:flex-end;margin-bottom:1px"
          title="Remove this row">✕</button>
      `;
      container.appendChild(div);
    }

    // Pre-fill Jun 1, 2, 3
    ['2026-06-01', '2026-06-02', '2026-06-03'].forEach(d => addRow(d));

    document.getElementById('qe-add-row').addEventListener('click', () => addRow(getISTDateStr()));

    const closeModal = () => overlay.remove();
    document.getElementById('qe-close').addEventListener('click', closeModal);
    document.getElementById('qe-cancel').addEventListener('click', closeModal);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });

    document.getElementById('qe-save').addEventListener('click', () => saveQuickEntries(container, closeModal));
  }

  async function saveQuickEntries(container, closeModal) {
    const saveBtn = document.getElementById('qe-save');
    const entries = [];

    // Query ALL currently-visible entry rows (handles deleted rows correctly)
    const rows = container.querySelectorAll('.qe-entry-row');
    if (rows.length === 0) { App.toast('No entries to save.', 'error'); return; }

    let rowNum = 0;
    for (const rowEl of rows) {
      rowNum++;
      const date   = rowEl.querySelector('.qe-date')?.value?.trim()    || '';
      const sale   = Number(rowEl.querySelector('.qe-sale')?.value)    || 0;
      const profit = Number(rowEl.querySelector('.qe-profit')?.value)  || 0;

      if (!date)     { App.toast(`Date missing on row ${rowNum}.`, 'error'); return; }
      if (sale <= 0) { App.toast(`Sale amount must be > 0 on row ${rowNum}.`, 'error'); return; }

      const time = getISTTimeStr();
      // Build a full sales row — blanks for shoe-detail columns
      // 0=Date  1=Time  2=Brand  3=Article  4=Size  5=Category
      // 6=Type  7=ShoeStyle  8=Color  9=PairsInTransaction
      // 10=QtySold  11=WholesaleRate  12=MRP  13=SellingPrice
      // 14=TotalSale  15=TotalCost  16=ProfitPerPair  17=TotalProfit  18=Discount
      const totalCost = sale - profit;
      entries.push([
        date, time,
        'Quick Entry', '—', '', '',
        '', '', '', 1,
        1, 0, 0, sale,
        sale, totalCost, profit, profit, 0
      ]);
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';
    try {
      for (const row of entries) {
        await API.addSale(row);
        allRows.push(row);
      }
      App.toast(
        entries.length > 1
          ? `${entries.length} quick entries saved successfully!`
          : 'Quick entry saved!',
        'success'
      );
      closeModal();
      renderTable();
    } catch (err) {
      App.toast('Error: ' + err.message, 'error');
    } finally {
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '💾 Save Entries'; }
    }
  }

  return { render, edit, delete: del };
})();
