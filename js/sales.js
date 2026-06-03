// ============================================================
// js/sales.js — Sales Management Module  (multi-pair transaction)
// Columns (0-indexed) in Product_sales sheet:
//   0=Date  1=Time  2=Brand  3=Article  4=Size  5=Category
//   6=Type  7=ShoeStyle  8=Color  9=PairsInTransaction
//   10=QtySold  11=CostPrice  12=MRP  13=SellingPrice
//   14=TotalSale  15=TotalCost  16=ProfitPerPair  17=TotalProfit  18=Discount
// ============================================================

const Sales = (() => {

  let allRows   = [];
  let editIndex = null;

  const CATS        = ['Men', 'Women', 'Kids'];
  const TYPES       = ['Sandal', 'Shoe', 'Slipper', 'Sports', 'Crocs', 'Flip Flops'];
  const SHOE_STYLES = ['Lace', 'Laceless'];
  const inr         = n => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

  // ── Render page ───────────────────────────────────────────
  function render(rows) {
    allRows = rows;
    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="page-header">
        <div class="page-title">🛒 Sales <span>Management</span></div>
        <button class="btn btn-primary" id="toggle-sale-btn">+ Record Sale</button>
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
                <option value="">How many different pairs?</option>
                ${[1,2,3,4,5,6,7].map(n => `<option value="${n}">${n} pair${n > 1 ? 's' : ''}</option>`).join('')}
              </select>
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
                <div class="calc-label">Total Cost</div>
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
        <input type="date" id="ff-from" title="From date" />
        <input type="date" id="ff-to"   title="To date" />
        <input type="text" id="ff-search" placeholder="🔍 Search brand, article, color…" />
        <select id="ff-category">
          <option value="">All Categories</option>
          ${CATS.map(c => `<option>${c}</option>`).join('')}
        </select>
        <button class="btn btn-secondary btn-sm" id="ff-clear">Clear</button>
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
                <th>Pairs/Txn</th><th>Qty</th><th>Cost/pair</th><th>MRP</th>
                <th>Sell Price</th><th>Total Sale</th><th>Total Cost</th>
                <th>Profit/Pair</th><th>Total Profit</th><th>Discount</th><th>Actions</th>
              </tr>
            </thead>
            <tbody id="sales-tbody"></tbody>
            <tfoot id="sales-tfoot"></tfoot>
          </table>
        </div>
      </div>
    `;

    // Prefill date + time
    const now = new Date();
    document.getElementById('sl-date').value = now.toISOString().slice(0, 10);
    document.getElementById('sl-time').value = now.toTimeString().slice(0, 5);

    // When pairs count changes → rebuild pair sections
    document.getElementById('sl-pairs-txn').addEventListener('change', function () {
      buildPairSections(Number(this.value) || 0);
    });

    document.getElementById('toggle-sale-btn').addEventListener('click', () => { editIndex = null; showForm(true); });
    document.getElementById('sale-cancel-btn').addEventListener('click', () => showForm(false));
    document.getElementById('sale-form').addEventListener('submit', handleSubmit);

    document.getElementById('ff-search').addEventListener('input', renderTable);
    document.getElementById('ff-category').addEventListener('change', renderTable);
    document.getElementById('ff-from').addEventListener('change', renderTable);
    document.getElementById('ff-to').addEventListener('change', renderTable);
    document.getElementById('ff-clear').addEventListener('click', clearFilters);

    renderTable();
  }

  // ── Build N pair entry blocks ─────────────────────────────
  function buildPairSections(n) {
    const container = document.getElementById('pairs-container');
    const summary   = document.getElementById('txn-summary');

    if (!n) {
      container.innerHTML = '';
      summary.style.display = 'none';
      return;
    }

    container.innerHTML = Array.from({ length: n }, (_, i) => pairSectionHTML(i, n)).join('');
    summary.style.display = n > 1 ? 'block' : 'none';

    // Attach listeners for each pair
    for (let i = 0; i < n; i++) {
      // Show/hide shoe-style depending on type
      document.getElementById(`sl-type-${i}`).addEventListener('change', function () {
        const sg = document.getElementById(`sl-shoestyle-group-${i}`);
        sg.style.display = this.value === 'Shoe' ? 'flex' : 'none';
        if (this.value !== 'Shoe') document.getElementById(`sl-shoestyle-${i}`).value = '';
      });

      // Recalculate on any price/qty input
      [`sl-qty-${i}`, `sl-cost-${i}`, `sl-mrp-${i}`, `sl-sell-${i}`].forEach(id =>
        document.getElementById(id).addEventListener('input', () => { updatePairCalc(i); updateTxnSummary(n); })
      );
    }
  }

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
            <label for="sl-cost-${i}">Cost Price / pair (₹) *</label>
            <input type="number" id="sl-cost-${i}" placeholder="0.00" min="0" step="0.01" required />
          </div>
          <div class="form-group">
            <label for="sl-mrp-${i}">MRP / pair (₹) *</label>
            <input type="number" id="sl-mrp-${i}" placeholder="0.00" min="0" step="0.01" required />
          </div>
          <div class="form-group">
            <label for="sl-sell-${i}">Selling Price / pair (₹) *</label>
            <input type="number" id="sl-sell-${i}" placeholder="0.00" min="0" step="0.01" required />
          </div>
        </div>

        <!-- Per-pair auto-calculated preview -->
        <div class="calc-grid pair-calc">
          <div class="calc-item">
            <div class="calc-label">Total Sale</div>
            <div class="calc-value" id="c-total-sale-${i}">₹0</div>
          </div>
          <div class="calc-item">
            <div class="calc-label">Total Cost</div>
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
      totDiscount += mrp - sell;
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

  // ── Show / hide form ──────────────────────────────────────
  function showForm(show) {
    const card = document.getElementById('sale-form-card');
    const btn  = document.getElementById('toggle-sale-btn');
    card.style.display = show ? 'block' : 'none';
    btn.textContent = show ? '✕ Close Form' : '+ Record Sale';
    if (!show) {
      document.getElementById('sale-form').reset();
      const now = new Date();
      document.getElementById('sl-date').value = now.toISOString().slice(0, 10);
      document.getElementById('sl-time').value = now.toTimeString().slice(0, 5);
      document.getElementById('sale-form-title').textContent = '🛒 Record a Sale';
      document.getElementById('sale-submit-btn').textContent = 'Save Sale';
      document.getElementById('pairs-container').innerHTML = '';
      document.getElementById('txn-summary').style.display = 'none';
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

    if (!date || !time)   { App.toast('Please fill in Date and Time.', 'error'); return; }
    if (!pairsTxn)        { App.toast('Please select number of pairs.', 'error'); return; }

    // Validate & collect each pair's data
    const pairRows = [];
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
      if (type === 'Shoe' && !shoeStyle) { App.toast(`Shoe Style missing${label}.`, 'error'); return; }
      if (sell > mrp) { App.toast(`Selling price > MRP${label}.`, 'error'); return; }

      const totalSale   = qty * sell;
      const totalCost   = qty * cost;
      const profitPair  = sell - cost;
      const totalProfit = qty * profitPair;
      const discount    = mrp - sell;

      pairRows.push([
        date, time, brand, article, Number(size), cat, type, shoeStyle, color,
        pairsTxn, qty, cost, mrp, sell,
        totalSale, totalCost, profitPair, totalProfit, discount
      ]);
    }

    // ── Save mode: edit (single row) vs add (all pair rows) ──
    btn.disabled = true; btn.textContent = 'Saving…';
    try {
      if (editIndex !== null) {
        // Edit always updates just the one row
        await API.updateSale(editIndex, pairRows[0]);
        allRows[editIndex] = pairRows[0];
        App.toast('Sale record updated!', 'success');
      } else {
        // Add all pair rows sequentially
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
    const from   = document.getElementById('ff-from')?.value || '';
    const to     = document.getElementById('ff-to')?.value   || '';

    const filtered = allRows.filter(r => {
      const dStr    = String(r[0] || '').slice(0, 10);
      const brand   = String(r[2] || '').toLowerCase();
      const article = String(r[3] || '').toLowerCase();
      const color   = String(r[8] || '').toLowerCase();
      const matchSearch = !search || brand.includes(search) || article.includes(search) || color.includes(search);
      const matchCat    = !cat    || r[5] === cat;
      const matchFrom   = !from   || dStr >= from;
      const matchTo     = !to     || dStr <= to;
      return matchSearch && matchCat && matchFrom && matchTo;
    });

    document.getElementById('sales-count').textContent = `${filtered.length} record${filtered.length !== 1 ? 's' : ''}`;
    const tbody = document.getElementById('sales-tbody');
    const tfoot = document.getElementById('sales-tfoot');

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="21"><div class="empty-state"><div class="empty-icon">🛒</div><p>No sales records found</p></div></td></tr>`;
      tfoot.innerHTML = '';
      return;
    }

    tbody.innerHTML = filtered.map((r, fi) => {
      const origIdx = allRows.indexOf(r);
      const profit  = Number(r[17]) || 0;
      const profCol = profit >= 0 ? 'var(--green)' : 'var(--red)';
      const styleCell = r[7] ? `<span class="badge badge-gold">${r[7]}</span>` : '<span style="color:var(--text3)">—</span>';
      return `
        <tr>
          <td>${fi + 1}</td>
          <td>${r[0] || '—'}</td>
          <td style="color:var(--text3)">${r[1] || '—'}</td>
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
        <td colspan="2">—</td>
      </tr>`;
  }

  function clearFilters() {
    ['ff-search','ff-from','ff-to'].forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
    document.getElementById('ff-category').value = '';
    renderTable();
  }

  // ── Edit (always single-row mode) ─────────────────────────
  function edit(origIdx) {
    editIndex = origIdx;
    const r = allRows[origIdx];
    showForm(true);

    // Set txn header
    document.getElementById('sl-date').value      = r[0]  || '';
    document.getElementById('sl-time').value      = r[1]  || '';
    document.getElementById('sl-pairs-txn').value = r[9]  || 1;

    // Build exactly 1 pair section (editing one row at a time)
    buildPairSections(1);

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

    if (r[6] === 'Shoe') {
      document.getElementById('sl-shoestyle-group-0').style.display = 'flex';
    }

    document.getElementById('sale-form-title').textContent  = '✏️ Edit Sale Record';
    document.getElementById('sale-submit-btn').textContent  = 'Update Sale';
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

  return { render, edit, delete: del };
})();
