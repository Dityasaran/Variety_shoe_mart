// ============================================================
// js/sales.js — Sales Management Module
// Columns (0-indexed):
//   0=Date  1=Time  2=Brand  3=Article  4=Size  5=Category
//   6=Type  7=ShoeStyle  8=Color  9=PairsInTransaction
//   10=QtySold  11=CostPrice  12=MRP  13=SellingPrice
//   14=TotalSale  15=TotalCost  16=ProfitPerPair  17=TotalProfit  18=Discount
// ============================================================

const Sales = (() => {

  let allRows   = [];
  let editIndex = null;

  const CATS       = ['Men', 'Women', 'Kids'];
  const TYPES      = ['Sandal', 'Shoe', 'Slipper', 'Sports', 'Crocs', 'Flip Flops'];
  const SHOE_STYLES = ['Lace', 'Laceless'];
  const inr        = n => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

  // ── Render ────────────────────────────────────────────────
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
          <div class="form-grid">

            <div class="form-group">
              <label for="sl-date">Date of Sale *</label>
              <input type="date" id="sl-date" required />
            </div>
            <div class="form-group">
              <label for="sl-time">Time of Sale *</label>
              <input type="time" id="sl-time" required />
            </div>
            <div class="form-group">
              <label for="sl-brand">Brand Name *</label>
              <input type="text" id="sl-brand" placeholder="e.g. Bata, Sparx, Campus" required />
            </div>
            <div class="form-group">
              <label for="sl-article">Article / Model *</label>
              <input type="text" id="sl-article" placeholder="Model name" required />
            </div>
            <div class="form-group">
              <label for="sl-size">Size *</label>
              <input type="number" id="sl-size" placeholder="6–12" min="1" max="15" required />
            </div>
            <div class="form-group">
              <label for="sl-category">Category *</label>
              <select id="sl-category" required>
                <option value="">Select category</option>
                ${CATS.map(c => `<option>${c}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label for="sl-type">Type *</label>
              <select id="sl-type" required>
                <option value="">Select type</option>
                ${TYPES.map(t => `<option>${t}</option>`).join('')}
              </select>
            </div>
            <div class="form-group" id="sl-shoestyle-group" style="display:none">
              <label for="sl-shoestyle">Shoe Style *</label>
              <select id="sl-shoestyle">
                <option value="">Select style</option>
                ${SHOE_STYLES.map(s => `<option>${s}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label for="sl-color">Color *</label>
              <input type="text" id="sl-color" placeholder="e.g. Black, Navy Blue, Red" required />
            </div>
            <div class="form-group">
              <label for="sl-pairs-txn">No. of Pairs in This Transaction *</label>
              <select id="sl-pairs-txn" required>
                <option value="">How many different pairs bought?</option>
                ${[1,2,3,4,5,6,7].map(n => `<option value="${n}">${n} pair${n > 1 ? 's' : ''}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label for="sl-qty">Qty Sold (this item) *</label>
              <input type="number" id="sl-qty" placeholder="1" min="1" required />
            </div>
            <div class="form-group">
              <label for="sl-cost">Cost Price / pair (₹) *</label>
              <input type="number" id="sl-cost" placeholder="0.00" min="0" step="0.01" required />
            </div>
            <div class="form-group">
              <label for="sl-mrp">MRP / pair (₹) *</label>
              <input type="number" id="sl-mrp" placeholder="0.00" min="0" step="0.01" required />
            </div>
            <div class="form-group">
              <label for="sl-sell">Selling Price / pair (₹) *</label>
              <input type="number" id="sl-sell" placeholder="0.00" min="0" step="0.01" required />
            </div>

          </div>

          <!-- Auto-calculated fields -->
          <div class="calc-grid">
            <div class="calc-item">
              <div class="calc-label">Total Sale Amount</div>
              <div class="calc-value" id="c-total-sale">₹0</div>
            </div>
            <div class="calc-item">
              <div class="calc-label">Total Cost</div>
              <div class="calc-value" id="c-total-cost">₹0</div>
            </div>
            <div class="calc-item">
              <div class="calc-label">Profit / Pair</div>
              <div class="calc-value" id="c-profit-pair">₹0</div>
            </div>
            <div class="calc-item">
              <div class="calc-label">Total Profit</div>
              <div class="calc-value" id="c-total-profit">₹0</div>
            </div>
            <div class="calc-item">
              <div class="calc-label">Discount Given</div>
              <div class="calc-value" id="c-discount">₹0</div>
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

    // Conditional Shoe Style
    document.getElementById('sl-type').addEventListener('change', function () {
      const sg = document.getElementById('sl-shoestyle-group');
      sg.style.display = this.value === 'Shoe' ? 'flex' : 'none';
      if (this.value !== 'Shoe') document.getElementById('sl-shoestyle').value = '';
    });

    document.getElementById('toggle-sale-btn').addEventListener('click', () => { editIndex = null; showForm(true); });
    document.getElementById('sale-cancel-btn').addEventListener('click', () => showForm(false));
    document.getElementById('sale-form').addEventListener('submit', handleSubmit);

    ['sl-qty','sl-cost','sl-mrp','sl-sell'].forEach(id =>
      document.getElementById(id).addEventListener('input', updateCalc)
    );

    document.getElementById('ff-search').addEventListener('input', renderTable);
    document.getElementById('ff-category').addEventListener('change', renderTable);
    document.getElementById('ff-from').addEventListener('change', renderTable);
    document.getElementById('ff-to').addEventListener('change', renderTable);
    document.getElementById('ff-clear').addEventListener('click', clearFilters);

    renderTable();
  }

  function updateCalc() {
    const qty  = Number(document.getElementById('sl-qty')?.value)  || 0;
    const cost = Number(document.getElementById('sl-cost')?.value) || 0;
    const mrp  = Number(document.getElementById('sl-mrp')?.value)  || 0;
    const sell = Number(document.getElementById('sl-sell')?.value) || 0;

    const totalSale   = qty * sell;
    const totalCost   = qty * cost;
    const profitPair  = sell - cost;
    const totalProfit = qty * profitPair;
    const discount    = mrp - sell;

    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) { el.textContent = inr(val); el.style.color = val < 0 ? 'var(--red)' : 'var(--accent)'; }
    };
    set('c-total-sale',   totalSale);
    set('c-total-cost',   totalCost);
    set('c-profit-pair',  profitPair);
    set('c-total-profit', totalProfit);
    set('c-discount',     discount);
  }

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
      document.getElementById('sl-shoestyle-group').style.display = 'none';
      editIndex = null;
      updateCalc();
    }
    if (show) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

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

  async function handleSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('sale-submit-btn');

    const date      = document.getElementById('sl-date').value.trim();
    const time      = document.getElementById('sl-time').value.trim();
    const brand     = document.getElementById('sl-brand').value.trim();
    const article   = document.getElementById('sl-article').value.trim();
    const size      = document.getElementById('sl-size').value.trim();
    const cat       = document.getElementById('sl-category').value;
    const type      = document.getElementById('sl-type').value;
    const shoeStyle = document.getElementById('sl-shoestyle').value;
    const color     = document.getElementById('sl-color').value.trim();
    const pairsTxn  = Number(document.getElementById('sl-pairs-txn').value) || 0;
    const qty       = Number(document.getElementById('sl-qty').value)       || 0;
    const cost      = Number(document.getElementById('sl-cost').value)      || 0;
    const mrp       = Number(document.getElementById('sl-mrp').value)       || 0;
    const sell      = Number(document.getElementById('sl-sell').value)      || 0;

    if (!date || !time || !brand || !article || !size || !cat || !type || !color || !pairsTxn || !qty || !cost || !mrp || !sell) {
      App.toast('Please fill in all required fields.', 'error'); return;
    }
    if (type === 'Shoe' && !shoeStyle) {
      App.toast('Please select Shoe Style (Lace / Laceless) for Shoe type.', 'error'); return;
    }
    if (sell > mrp)  { App.toast('Selling price cannot exceed MRP.', 'error'); return; }
    if (qty < 1)     { App.toast('Quantity must be at least 1.', 'error');     return; }

    const totalSale   = qty * sell;
    const totalCost   = qty * cost;
    const profitPair  = sell - cost;
    const totalProfit = qty * profitPair;
    const discount    = mrp - sell;

    // col order matches header definition above
    const row = [
      date, time, brand, article, Number(size), cat, type, shoeStyle, color,
      pairsTxn, qty, cost, mrp, sell,
      totalSale, totalCost, profitPair, totalProfit, discount
    ];

    btn.disabled = true; btn.textContent = 'Saving…';
    try {
      if (editIndex !== null) {
        await API.updateSale(editIndex, row);
        allRows[editIndex] = row;
        App.toast('Sale record updated!', 'success');
      } else {
        await API.addSale(row);
        allRows.push(row);
        App.toast('Sale recorded successfully!', 'success');
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

  function edit(origIdx) {
    editIndex = origIdx;
    const r = allRows[origIdx];
    document.getElementById('sl-date').value       = r[0]  || '';
    document.getElementById('sl-time').value       = r[1]  || '';
    document.getElementById('sl-brand').value      = r[2]  || '';
    document.getElementById('sl-article').value    = r[3]  || '';
    document.getElementById('sl-size').value       = r[4]  || '';
    document.getElementById('sl-category').value   = r[5]  || '';
    document.getElementById('sl-type').value       = r[6]  || '';
    document.getElementById('sl-shoestyle').value  = r[7]  || '';
    document.getElementById('sl-color').value      = r[8]  || '';
    document.getElementById('sl-pairs-txn').value  = r[9]  || '';
    document.getElementById('sl-qty').value        = r[10] || '';
    document.getElementById('sl-cost').value       = r[11] || '';
    document.getElementById('sl-mrp').value        = r[12] || '';
    document.getElementById('sl-sell').value       = r[13] || '';
    document.getElementById('sl-shoestyle-group').style.display = r[6] === 'Shoe' ? 'flex' : 'none';
    document.getElementById('sale-form-title').textContent = '✏️ Edit Sale Record';
    document.getElementById('sale-submit-btn').textContent = 'Update Sale';
    showForm(true);
    updateCalc();
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
