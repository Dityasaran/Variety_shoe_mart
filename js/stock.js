// ============================================================
// js/stock.js — Stock Management Module
// Columns (0-indexed):
//   0=Date  1=Brand  2=Article  3=Size  4=Category
//   5=Type  6=ShoeStyle  7=Color  8=Quantity  9=CostPrice  10=MRP
// ============================================================

const Stock = (() => {

  let allRows   = [];
  let editIndex = null;

  const CATS  = ['Men', 'Women', 'Kids'];
  const TYPES = ['Sandal', 'Shoe', 'Slipper', 'Sports', 'Crocs', 'Flip Flops', 'Socks'];
  const SHOE_STYLES = ['Lace', 'Laceless'];

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
          <div class="form-grid">
            <div class="form-group">
              <label for="s-date">Date of Entry *</label>
              <input type="date" id="s-date" required />
            </div>
            <div class="form-group">
              <label for="s-brand">Brand Name *</label>
              <input type="text" id="s-brand" placeholder="e.g. Bata, Sparx, Campus" required />
            </div>
            <div class="form-group">
              <label for="s-article">Article / Model *</label>
              <input type="text" id="s-article" placeholder="Model name" required />
            </div>
            <div class="form-group">
              <label for="s-size">Size *</label>
              <input type="number" id="s-size" placeholder="6–12" min="1" max="15" required />
            </div>
            <div class="form-group">
              <label for="s-category">Category *</label>
              <select id="s-category" required>
                <option value="">Select category</option>
                ${CATS.map(c => `<option>${c}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label for="s-type">Type *</label>
              <select id="s-type" required>
                <option value="">Select type</option>
                ${TYPES.map(t => `<option>${t}</option>`).join('')}
              </select>
            </div>
            <div class="form-group" id="s-shoestyle-group" style="display:none">
              <label for="s-shoestyle">Shoe Style *</label>
              <select id="s-shoestyle">
                <option value="">Select style</option>
                ${SHOE_STYLES.map(s => `<option>${s}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label for="s-color">Color *</label>
              <input type="text" id="s-color" placeholder="e.g. Black, Navy Blue, Red" required />
            </div>
            <div class="form-group">
              <label for="s-qty">Quantity (pairs) *</label>
              <input type="number" id="s-qty" placeholder="0" min="0" required />
            </div>
            <div class="form-group">
              <label for="s-cost">Cost Price / pair (₹) *</label>
              <input type="number" id="s-cost" placeholder="0.00" min="0" step="0.01" required />
            </div>
            <div class="form-group">
              <label for="s-mrp">MRP / pair (₹) *</label>
              <input type="number" id="s-mrp" placeholder="0.00" min="0" step="0.01" required />
            </div>
          </div>
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
                <th>#</th><th>Date</th><th>Brand</th><th>Article</th>
                <th>Size</th><th>Cat.</th><th>Type</th><th>Style</th>
                <th>Color</th><th>Qty</th>
                <th>Cost/pair</th><th>MRP/pair</th><th>Total Cost Value</th><th>Actions</th>
              </tr>
            </thead>
            <tbody id="stock-tbody"></tbody>
          </table>
        </div>
      </div>
    `;

    // Set today's date
    document.getElementById('s-date').value = new Date().toISOString().slice(0, 10);

    // Show/hide Shoe Style based on Type
    document.getElementById('s-type').addEventListener('change', function () {
      const sg = document.getElementById('s-shoestyle-group');
      sg.style.display = this.value === 'Shoe' ? 'flex' : 'none';
      if (this.value !== 'Shoe') document.getElementById('s-shoestyle').value = '';
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

  function showForm(show) {
    const card = document.getElementById('stock-form-card');
    const btn  = document.getElementById('toggle-form-btn');
    card.style.display = show ? 'block' : 'none';
    btn.textContent = show ? '✕ Close Form' : '+ Add New Entry';
    if (!show) {
      document.getElementById('stock-form').reset();
      document.getElementById('s-date').value = new Date().toISOString().slice(0, 10);
      document.getElementById('stock-form-title').textContent = '➕ Add New Stock Entry';
      document.getElementById('stock-submit-btn').textContent = 'Save Stock Entry';
      document.getElementById('s-shoestyle-group').style.display = 'none';
      editIndex = null;
    }
    if (show) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderTable() {
    const search = (document.getElementById('sf-search')?.value || '').toLowerCase();
    const cat    = document.getElementById('sf-category')?.value || '';
    const type   = document.getElementById('sf-type')?.value || '';
    const from   = document.getElementById('sf-from')?.value || '';
    const to     = document.getElementById('sf-to')?.value   || '';

    const filtered = allRows.filter(r => {
      const dStr    = String(r[0] || '').slice(0, 10);
      const brand   = String(r[1] || '').toLowerCase();
      const article = String(r[2] || '').toLowerCase();
      const color   = String(r[7] || '').toLowerCase();
      const matchSearch = !search || brand.includes(search) || article.includes(search) || color.includes(search);
      const matchCat    = !cat  || r[4] === cat;
      const matchType   = !type || r[5] === type;
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
      // col 8 = Quantity, col 9 = CostPrice, col 10 = MRP
      const qty  = Number(r[8]) || 0;
      const cost = Number(r[9]) || 0;
      const totalCostVal = qty * cost;
      const qtyBadge = qty <= 2
        ? `<span class="badge badge-red">${qty}</span>`
        : `<span style="color:var(--text)">${qty}</span>`;
      const styleCell = r[6] ? `<span class="badge badge-gold">${r[6]}</span>` : '<span style="color:var(--text3)">—</span>';
      return `
        <tr>
          <td>${fi + 1}</td>
          <td>${r[0] || '—'}</td>
          <td><strong style="color:var(--text)">${r[1] || '—'}</strong></td>
          <td>${r[2] || '—'}</td>
          <td>${r[3] || '—'}</td>
          <td><span class="badge badge-blue">${r[4] || '—'}</span></td>
          <td><span class="badge badge-orange">${r[5] || '—'}</span></td>
          <td>${styleCell}</td>
          <td>${r[7] || '—'}</td>
          <td>${qtyBadge}</td>
          <td>₹${Number(r[9] || 0).toLocaleString('en-IN')}</td>
          <td>₹${Number(r[10] || 0).toLocaleString('en-IN')}</td>
          <td style="color:var(--accent);font-weight:700">₹${totalCostVal.toLocaleString('en-IN')}</td>
          <td>
            <div class="action-btns">
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

  async function handleSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('stock-submit-btn');

    const date      = document.getElementById('s-date').value.trim();
    const brand     = document.getElementById('s-brand').value.trim();
    const article   = document.getElementById('s-article').value.trim();
    const size      = document.getElementById('s-size').value.trim();
    const cat       = document.getElementById('s-category').value;
    const type      = document.getElementById('s-type').value;
    const shoeStyle = document.getElementById('s-shoestyle').value;
    const color     = document.getElementById('s-color').value.trim();
    const qty       = document.getElementById('s-qty').value.trim();
    const cost      = document.getElementById('s-cost').value.trim();
    const mrp       = document.getElementById('s-mrp').value.trim();

    if (!date || !brand || !article || !size || !cat || !type || !color || !qty || !cost || !mrp) {
      App.toast('Please fill in all required fields.', 'error'); return;
    }
    if (type === 'Shoe' && !shoeStyle) {
      App.toast('Please select Shoe Style (Lace / Laceless) for Shoe type.', 'error'); return;
    }
    if (Number(mrp) < Number(cost)) {
      App.toast('MRP cannot be less than Cost Price.', 'error'); return;
    }

    // col order: Date Brand Article Size Category Type ShoeStyle Color Quantity CostPrice MRP
    const row = [date, brand, article, Number(size), cat, type, shoeStyle, color, Number(qty), Number(cost), Number(mrp)];

    btn.disabled = true; btn.textContent = 'Saving…';
    try {
      if (editIndex !== null) {
        await API.updateStock(editIndex, row);
        allRows[editIndex] = row;
        App.toast('Stock entry updated!', 'success');
      } else {
        await API.addStock(row);
        allRows.push(row);
        App.toast('Stock entry added successfully!', 'success');
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

  function edit(origIdx) {
    editIndex = origIdx;
    const r = allRows[origIdx];
    document.getElementById('s-date').value      = r[0] || '';
    document.getElementById('s-brand').value     = r[1] || '';
    document.getElementById('s-article').value   = r[2] || '';
    document.getElementById('s-size').value      = r[3] || '';
    document.getElementById('s-category').value  = r[4] || '';
    document.getElementById('s-type').value      = r[5] || '';
    document.getElementById('s-shoestyle').value = r[6] || '';
    document.getElementById('s-color').value     = r[7] || '';
    document.getElementById('s-qty').value       = r[8] || '';
    document.getElementById('s-cost').value      = r[9] || '';
    document.getElementById('s-mrp').value       = r[10] || '';
    // Show shoe style if applicable
    document.getElementById('s-shoestyle-group').style.display = r[5] === 'Shoe' ? 'flex' : 'none';
    document.getElementById('stock-form-title').textContent = '✏️ Edit Stock Entry';
    document.getElementById('stock-submit-btn').textContent = 'Update Entry';
    showForm(true);
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

  return { render, edit, delete: del };
})();
