// ============================================================
// js/dashboard.js — Dashboard rendering with full analytics
// ============================================================

const Dashboard = (() => {

  function fmt(n) {
    return '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  }

  // ── IST date string: YYYY-MM-DD ──────────────────────────
  function getISTDateStr() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  }

  // ── Get IST year-month: YYYY-MM ──────────────────────────
  function getISTYearMonth() {
    return getISTDateStr().slice(0, 7);
  }

  // ── Get IST year: YYYY ───────────────────────────────────
  function getISTYear() {
    return getISTDateStr().slice(0, 4);
  }

  // ── Normalize a row's date to YYYY-MM-DD string ──────────
  function rowDate(r) {
    return String(r[0] || '').slice(0, 10);
  }

  // ── Week number within month (1–4/5) ─────────────────────
  function weekOfMonth(dateStr) {
    if (!dateStr) return 0;
    const day = parseInt(dateStr.slice(8, 10), 10);
    return Math.ceil(day / 7);
  }

  // ── Analytics helpers ────────────────────────────────────
  function filterByDate(salesRows, from, to) {
    return salesRows.filter(r => {
      const d = rowDate(r);
      return (!from || d >= from) && (!to || d <= to);
    });
  }

  function sumSales(rows)  { return rows.reduce((s, r) => s + (Number(r[14]) || 0), 0); }
  function sumProfit(rows) { return rows.reduce((s, r) => s + (Number(r[17]) || 0), 0); }
  function countPairs(rows){ return rows.reduce((s, r) => s + (Number(r[10]) || 0), 0); }

  // ── Monthly week breakdown ────────────────────────────────
  function getWeeklyBreakdown(salesRows, yearMonth) {
    const monthRows = salesRows.filter(r => rowDate(r).slice(0, 7) === yearMonth);
    const weeks = [[], [], [], [], []]; // weeks[0]=week1 ... weeks[4]=week5
    monthRows.forEach(r => {
      const w = weekOfMonth(rowDate(r));
      if (w >= 1 && w <= 5) weeks[w - 1].push(r);
    });
    return weeks;
  }

  // ── Yearly monthly breakdown ──────────────────────────────
  function getMonthlyBreakdown(salesRows, year) {
    const months = {};
    salesRows.forEach(r => {
      const d = rowDate(r);
      if (d.startsWith(year)) {
        const ym = d.slice(0, 7);
        if (!months[ym]) months[ym] = [];
        months[ym].push(r);
      }
    });
    return months;
  }

  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  // ── Render ────────────────────────────────────────────────
  function render(stockRows, salesRows) {
    const container = document.getElementById('view-container');

    const today  = getISTDateStr();
    const thisYM = getISTYearMonth();
    const thisY  = getISTYear();

    // Today
    const todayRows    = salesRows.filter(r => rowDate(r) === today);
    const todaySale    = sumSales(todayRows);
    const todayProfit  = sumProfit(todayRows);
    const todayPairs   = countPairs(todayRows);

    // This month
    const monthRows   = salesRows.filter(r => rowDate(r).slice(0, 7) === thisYM);
    const monthSale   = sumSales(monthRows);
    const monthProfit = sumProfit(monthRows);

    // All time
    const totalRevenue = sumSales(salesRows);
    const totalProfit  = sumProfit(salesRows);

    // Top selling brand
    const brandMap = {};
    salesRows.forEach(r => {
      const brand = r[2] || 'Unknown';
      brandMap[brand] = (brandMap[brand] || 0) + (Number(r[10]) || 0);
    });
    const topBrand = Object.keys(brandMap).sort((a, b) => brandMap[b] - brandMap[a])[0] || '—';

    // Low stock
    const lowStock = stockRows.filter(r => Number(r[8]) <= 2);

    // Stock total items
    const totalStockItems = stockRows.length;

    container.innerHTML = `
      <!-- Hero -->
      <div class="dash-hero">
        <div>
          <div class="dash-hero-title">Welcome to <span>Variety Shoemart</span></div>
          <div class="dash-hero-sub">Store Management Dashboard • ${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata' })}</div>
        </div>
        <div class="dash-hero-emoji">👟</div>
      </div>

      <!-- KPI Cards -->
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
          <div class="stat-value">${todayPairs} pairs</div>
          <div class="stat-meta">Revenue: ${fmt(todaySale)}</div>
        </div>
        <div class="stat-card gold">
          <div class="stat-icon gold">💵</div>
          <div class="stat-label">Today's Profit</div>
          <div class="stat-value">${fmt(todayProfit)}</div>
          <div class="stat-meta">${todayRows.length} transaction${todayRows.length !== 1 ? 's' : ''} today</div>
        </div>
        <div class="stat-card blue">
          <div class="stat-icon blue">💰</div>
          <div class="stat-label">This Month</div>
          <div class="stat-value">${fmt(monthSale)}</div>
          <div class="stat-meta">Profit: ${fmt(monthProfit)}</div>
        </div>
      </div>

      <!-- Analytics Section -->
      <div class="analytics-card">
        <div class="analytics-header">
          <div class="analytics-title">📊 Sales Analytics</div>
          <div class="analytics-tabs" id="analytics-tabs">
            <button class="tab-btn active" data-tab="daily">Today</button>
            <button class="tab-btn" data-tab="monthly">Monthly</button>
            <button class="tab-btn" data-tab="yearly">Yearly</button>
            <button class="tab-btn" data-tab="range">Date Range</button>
          </div>
        </div>
        <div class="analytics-body" id="analytics-body">
          <!-- Filled by tab switch -->
        </div>
      </div>

      <!-- Bottom Row -->
      <div class="section-row">
        <div class="info-card">
          <div class="info-card-title">🏆 Top Selling Brand</div>
          <div style="font-size:1.6rem;font-weight:800;color:var(--gold)">${topBrand}</div>
          ${topBrand !== '—'
            ? `<div style="font-size:.8rem;color:var(--text3);margin-top:4px">${brandMap[topBrand] || 0} pairs sold all time</div>`
            : '<div style="font-size:.8rem;color:var(--text3);margin-top:4px">No sales recorded yet</div>'}
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

    // Attach tab listeners
    const tabs = document.getElementById('analytics-tabs');
    tabs.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        tabs.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderAnalyticsTab(btn.dataset.tab, salesRows, today, thisYM, thisY);
      });
    });

    // Default tab: today
    renderAnalyticsTab('daily', salesRows, today, thisYM, thisY);
  }

  // ── Render analytics tab content ─────────────────────────
  function renderAnalyticsTab(tab, salesRows, today, thisYM, thisY) {
    const body = document.getElementById('analytics-body');

    if (tab === 'daily') {
      const todayRows   = salesRows.filter(r => rowDate(r) === today);
      const todaySale   = sumSales(todayRows);
      const todayProfit = sumProfit(todayRows);
      const todayPairs  = countPairs(todayRows);
      const todayCost   = todayRows.reduce((s, r) => s + (Number(r[15]) || 0), 0);

      body.innerHTML = `
        <div class="analytics-period-title">📅 Today — ${new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', timeZone:'Asia/Kolkata' })}</div>
        <div class="analytics-kpi-row">
          <div class="akpi">
            <div class="akpi-label">Pairs Sold</div>
            <div class="akpi-value">${todayPairs}</div>
          </div>
          <div class="akpi">
            <div class="akpi-label">Revenue</div>
            <div class="akpi-value green">${fmt(todaySale)}</div>
          </div>
          <div class="akpi">
            <div class="akpi-label">Wholesale Cost</div>
            <div class="akpi-value">${fmt(todayCost)}</div>
          </div>
          <div class="akpi">
            <div class="akpi-label">Profit</div>
            <div class="akpi-value gold">${fmt(todayProfit)}</div>
          </div>
          <div class="akpi">
            <div class="akpi-label">Transactions</div>
            <div class="akpi-value">${todayRows.length}</div>
          </div>
        </div>
        ${todayRows.length === 0
          ? '<div class="analytics-empty">No sales recorded today yet.</div>'
          : `<div class="analytics-table-wrap">${salesMiniTable(todayRows)}</div>`}
      `;

    } else if (tab === 'monthly') {
      const weeks = getWeeklyBreakdown(salesRows, thisYM);
      const weekLabels = ['Week 1 (1–7)', 'Week 2 (8–14)', 'Week 3 (15–21)', 'Week 4 (22–28)', 'Week 5 (29–31)'];
      const monthName = MONTH_NAMES[parseInt(thisYM.slice(5, 7), 10) - 1] + ' ' + thisYM.slice(0, 4);

      body.innerHTML = `
        <div class="analytics-period-title">🗓️ Monthly Breakdown — ${monthName}</div>
        <div class="week-grid">
          ${weeks.map((wRows, wi) => {
            const ws = sumSales(wRows);
            const wp = sumProfit(wRows);
            const wc = countPairs(wRows);
            const hasData = wRows.length > 0;
            return `
              <div class="week-card ${hasData ? 'has-data' : 'no-data'}">
                <div class="week-card-label">${weekLabels[wi]}</div>
                <div class="week-card-pairs">${wc} pairs</div>
                <div class="week-card-revenue">${fmt(ws)}</div>
                <div class="week-card-profit">Profit: ${fmt(wp)}</div>
                <div class="week-card-txn">${wRows.length} txn${wRows.length !== 1 ? 's' : ''}</div>
              </div>`;
          }).join('')}
        </div>
        <div class="analytics-month-total">
          <span>Month Total:</span>
          <span class="amt-sale">${fmt(sumSales(salesRows.filter(r => rowDate(r).slice(0,7) === thisYM)))}</span>
          <span class="amt-sep">|</span>
          <span class="amt-profit">Profit: ${fmt(sumProfit(salesRows.filter(r => rowDate(r).slice(0,7) === thisYM)))}</span>
        </div>
      `;

    } else if (tab === 'yearly') {
      const monthData = getMonthlyBreakdown(salesRows, thisY);
      const sortedMonths = Object.keys(monthData).sort();

      if (sortedMonths.length === 0) {
        body.innerHTML = `<div class="analytics-empty">No sales data for ${thisY} yet.</div>`;
        return;
      }

      body.innerHTML = `
        <div class="analytics-period-title">📆 Yearly Breakdown — ${thisY}</div>
        <div class="monthly-breakdown-table">
          <table class="breakdown-table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Pairs Sold</th>
                <th>Revenue</th>
                <th>Wholesale Cost</th>
                <th>Profit</th>
                <th>Transactions</th>
              </tr>
            </thead>
            <tbody>
              ${sortedMonths.map(ym => {
                const rows = monthData[ym];
                const mn = MONTH_NAMES[parseInt(ym.slice(5,7),10)-1] + ' ' + ym.slice(0,4);
                const cost = rows.reduce((s,r) => s + (Number(r[15])||0), 0);
                return `<tr>
                  <td><strong>${mn}</strong></td>
                  <td>${countPairs(rows)}</td>
                  <td style="color:var(--accent);font-weight:600">${fmt(sumSales(rows))}</td>
                  <td>${fmt(cost)}</td>
                  <td style="color:var(--green);font-weight:700">${fmt(sumProfit(rows))}</td>
                  <td>${rows.length}</td>
                </tr>`;
              }).join('')}
            </tbody>
            <tfoot>
              <tr class="tfoot-summary">
                <td><strong>Total ${thisY}</strong></td>
                <td>${countPairs(salesRows.filter(r => rowDate(r).startsWith(thisY)))}</td>
                <td>${fmt(sumSales(salesRows.filter(r => rowDate(r).startsWith(thisY))))}</td>
                <td>${fmt(salesRows.filter(r => rowDate(r).startsWith(thisY)).reduce((s,r) => s+(Number(r[15])||0),0))}</td>
                <td>${fmt(sumProfit(salesRows.filter(r => rowDate(r).startsWith(thisY))))}</td>
                <td>${salesRows.filter(r => rowDate(r).startsWith(thisY)).length}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      `;

    } else if (tab === 'range') {
      body.innerHTML = `
        <div class="analytics-period-title">📋 Custom Date Range</div>
        <div class="range-picker-row">
          <div class="filter-date-group">
            <label class="filter-label">From Date</label>
            <input type="date" id="dash-from" />
          </div>
          <div class="filter-date-group">
            <label class="filter-label">To Date</label>
            <input type="date" id="dash-to" />
          </div>
          <button class="btn btn-primary btn-sm" id="dash-range-apply">Apply</button>
          <button class="btn btn-secondary btn-sm" id="dash-range-clear">Clear</button>
        </div>
        <div id="dash-range-results" class="analytics-range-results">
          <div class="analytics-empty">Select a date range above and click Apply.</div>
        </div>
      `;

      document.getElementById('dash-range-apply').addEventListener('click', () => {
        const from = document.getElementById('dash-from').value;
        const to   = document.getElementById('dash-to').value;
        const res  = document.getElementById('dash-range-results');

        if (!from && !to) { res.innerHTML = '<div class="analytics-empty">Please select at least one date.</div>'; return; }

        const rows = filterByDate(salesRows, from, to);
        const cost = rows.reduce((s,r) => s + (Number(r[15])||0), 0);
        const label = from && to ? `${from} → ${to}` : from ? `From ${from}` : `Up to ${to}`;

        res.innerHTML = `
          <div class="analytics-period-title" style="margin-top:0">Results: ${label}</div>
          <div class="analytics-kpi-row">
            <div class="akpi"><div class="akpi-label">Pairs Sold</div><div class="akpi-value">${countPairs(rows)}</div></div>
            <div class="akpi"><div class="akpi-label">Revenue</div><div class="akpi-value green">${fmt(sumSales(rows))}</div></div>
            <div class="akpi"><div class="akpi-label">Wholesale Cost</div><div class="akpi-value">${fmt(cost)}</div></div>
            <div class="akpi"><div class="akpi-label">Profit</div><div class="akpi-value gold">${fmt(sumProfit(rows))}</div></div>
            <div class="akpi"><div class="akpi-label">Transactions</div><div class="akpi-value">${rows.length}</div></div>
          </div>
          ${rows.length === 0
            ? '<div class="analytics-empty">No sales in this range.</div>'
            : `<div class="analytics-table-wrap">${salesMiniTable(rows)}</div>`}
        `;
      });

      document.getElementById('dash-range-clear').addEventListener('click', () => {
        document.getElementById('dash-from').value = '';
        document.getElementById('dash-to').value = '';
        document.getElementById('dash-range-results').innerHTML = '<div class="analytics-empty">Select a date range above and click Apply.</div>';
      });
    }
  }

  // ── Mini sales table for daily / range tabs ───────────────
  function salesMiniTable(rows) {
    if (!rows.length) return '';
    return `
      <table class="breakdown-table">
        <thead>
          <tr>
            <th>#</th><th>Date</th><th>Time</th><th>Brand</th><th>Article</th>
            <th>Size</th><th>Color</th><th>Qty</th><th>Revenue</th><th>Profit</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((r,i) => `
            <tr>
              <td>${i+1}</td>
              <td>${r[0]||'—'}</td>
              <td style="color:var(--text3)">${r[1]||'—'}</td>
              <td><strong>${r[2]||'—'}</strong></td>
              <td>${r[3]||'—'}</td>
              <td>${r[4]||'—'}</td>
              <td>${r[8]||'—'}</td>
              <td>${r[10]||0}</td>
              <td style="color:var(--accent);font-weight:600">₹${Number(r[14]||0).toLocaleString('en-IN')}</td>
              <td style="color:var(--green);font-weight:700">₹${Number(r[17]||0).toLocaleString('en-IN')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  return { render };
})();
