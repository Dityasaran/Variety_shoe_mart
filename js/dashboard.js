// ============================================================
// js/dashboard.js — Dashboard rendering
// ============================================================

const Dashboard = (() => {

  function fmt(n) {
    return '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  }

  function todayStr() {
    return new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
  }

  // stock rows = array-of-arrays (no header)
  // sales rows = array-of-arrays (no header)
  function render(stockRows, salesRows) {
    const container = document.getElementById('view-container');

    // ── Metrics ───────────────────────────────────────────
    const today = new Date().toISOString().slice(0, 10);
    const totalStockItems = stockRows.length;

    // Today's sales — col 0=date, col 1=time, col 14=totalSale, col 17=totalProfit
    const todaySales = salesRows.filter(r => {
      const d = r[0] ? String(r[0]).slice(0, 10) : '';
      return d === today;
    });
    const todayRevenue = todaySales.reduce((s, r) => s + (Number(r[14]) || 0), 0);

    // This month
    const ym = today.slice(0, 7);
    const monthProfit = salesRows
      .filter(r => String(r[0]).slice(0, 7) === ym)
      .reduce((s, r) => s + (Number(r[17]) || 0), 0);

    // Total revenue & profit all time
    const totalRevenue = salesRows.reduce((s, r) => s + (Number(r[14]) || 0), 0);
    const totalProfit  = salesRows.reduce((s, r) => s + (Number(r[17]) || 0), 0);

    // Top selling brand
    const brandMap = {};
    salesRows.forEach(r => {
      const brand = r[2] || 'Unknown';  // col 2 = Brand in new schema
      brandMap[brand] = (brandMap[brand] || 0) + (Number(r[10]) || 0); // col 10 = Qty Sold
    });
    const topBrand = Object.keys(brandMap).sort((a, b) => brandMap[b] - brandMap[a])[0] || '—';

    // Low stock — col 8 = Quantity in new schema
    const lowStock = stockRows.filter(r => Number(r[8]) <= 2);

    // ── HTML ──────────────────────────────────────────────
    container.innerHTML = `
      <div class="dash-hero">
        <div>
          <div class="dash-hero-title">Welcome to <span>Variety Shoemart</span></div>
          <div class="dash-hero-sub">Store Management Dashboard • ${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
        <div class="dash-hero-emoji">👟</div>
      </div>

      <div class="stat-grid">
        <div class="stat-card orange">
          <div class="stat-icon orange">📦</div>
          <div class="stat-label">Total Stock Items</div>
          <div class="stat-value">${totalStockItems}</div>
          <div class="stat-meta">Unique stock entries</div>
        </div>
        <div class="stat-card green">
          <div class="stat-icon green">🛒</div>
          <div class="stat-label">Today's Sales</div>
          <div class="stat-value">${todaySales.length}</div>
          <div class="stat-meta">Revenue: ${fmt(todayRevenue)}</div>
        </div>
        <div class="stat-card blue">
          <div class="stat-icon blue">💰</div>
          <div class="stat-label">Total Revenue</div>
          <div class="stat-value">${fmt(totalRevenue)}</div>
          <div class="stat-meta">All time</div>
        </div>
        <div class="stat-card gold">
          <div class="stat-icon gold">📈</div>
          <div class="stat-label">Total Profit</div>
          <div class="stat-value">${fmt(totalProfit)}</div>
          <div class="stat-meta">This month: ${fmt(monthProfit)}</div>
        </div>
      </div>

      <div class="section-row">
        <div class="info-card">
          <div class="info-card-title">🏆 Top Selling Brand</div>
          <div style="font-size:1.6rem;font-weight:800;color:var(--gold)">${topBrand}</div>
          ${topBrand !== '—' ? `<div style="font-size:.8rem;color:var(--text3);margin-top:4px">${brandMap[topBrand] || 0} pairs sold</div>` : '<div style="font-size:.8rem;color:var(--text3);margin-top:4px">No sales recorded yet</div>'}
        </div>
        <div class="info-card">
          <div class="info-card-title">⚠️ Low Stock Alerts <span class="badge ${lowStock.length ? 'badge-red' : 'badge-green'}">${lowStock.length}</span></div>
          ${lowStock.length === 0
            ? '<div style="color:var(--green);font-size:.875rem">✅ All items are well stocked</div>'
            : lowStock.slice(0, 5).map(r =>
                `<div class="alert-item">
                  <span class="alert-name">${r[1]} — ${r[2]} (Size ${r[3]})</span>
                  <span class="alert-qty">${r[8]} left</span>
                </div>`
              ).join('')
          }
          ${lowStock.length > 5 ? `<div style="font-size:.75rem;color:var(--text3);margin-top:6px">+${lowStock.length - 5} more items low</div>` : ''}
        </div>
      </div>
    `;
  }

  return { render };
})();
