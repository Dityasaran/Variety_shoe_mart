// ============================================================
// js/app.js — Router, data store, toast, init
// ============================================================

const App = (() => {

  // ── Data store ────────────────────────────────────────────
  let stockRows = [];
  let salesRows = [];
  let currentView = 'dashboard';

  // ── Toast ─────────────────────────────────────────────────
  function toast(msg, type = 'info') {
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ️'}</span><span class="toast-msg">${msg}</span>`;
    container.appendChild(el);
    setTimeout(() => {
      el.classList.add('removing');
      el.addEventListener('animationend', () => el.remove());
    }, 3500);
  }

  // ── Sync status ───────────────────────────────────────────
  function setSyncStatus(state) {
    const dot   = document.getElementById('sync-dot');
    const label = document.getElementById('sync-label');
    if (!dot || !label) return;
    dot.className = 'sync-dot ' + state;
    const map = { connected: 'Connected', error: 'Error', connecting: 'Connecting…' };
    label.textContent = map[state] || state;
  }

  // ── Load data ─────────────────────────────────────────────
  async function loadData() {
    if (CONFIG.APPS_SCRIPT_URL === 'PASTE_YOUR_WEB_APP_URL_HERE') {
      setSyncStatus('error');
      document.getElementById('loading-screen').innerHTML = `
        <div style="text-align:center;max-width:480px;padding:24px">
          <div style="font-size:2.5rem;margin-bottom:16px">🔗</div>
          <h2 style="color:var(--accent);margin-bottom:12px">Setup Required</h2>
          <p style="color:var(--text2);line-height:1.6;font-size:.9rem">
            Open <strong style="color:var(--text)">js/config.js</strong> and paste your 
            Google Apps Script Web App URL.<br><br>
            Then open <strong style="color:var(--text)">README.md</strong> for step-by-step instructions.
          </p>
        </div>`;
      return false;
    }

    setSyncStatus('connecting');
    try {
      const [s, sa] = await Promise.all([API.getStock(), API.getSales()]);
      stockRows = s.rows  || [];
      salesRows = sa.rows || [];
      setSyncStatus('connected');
      return true;
    } catch (err) {
      setSyncStatus('error');
      toast('Failed to connect to Google Sheets: ' + err.message, 'error');
      document.getElementById('loading-screen').innerHTML = `
        <div style="text-align:center;max-width:420px;padding:24px">
          <div style="font-size:2.5rem;margin-bottom:16px">⚠️</div>
          <h2 style="color:var(--red);margin-bottom:12px">Connection Failed</h2>
          <p style="color:var(--text2);font-size:.875rem">${err.message}</p>
          <button class="btn btn-primary" onclick="App.refresh()" style="margin-top:16px">↻ Retry</button>
        </div>`;
      return false;
    }
  }

  // ── Navigate ──────────────────────────────────────────────
  function navigate(view) {
    currentView = view;

    // Update nav items
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.view === view);
    });

    // Update topbar title
    const titles = { dashboard: 'Dashboard', stock: 'Stock Management', sales: 'Sales Management', requirements: 'Order Requirements' };
    document.getElementById('topbar-title').textContent = titles[view] || view;

    // Render view
    if (view === 'dashboard') {
      Dashboard.render(stockRows, salesRows);
    } else if (view === 'stock') {
      Stock.render(stockRows);
    } else if (view === 'sales') {
      Sales.render(salesRows);
    } else if (view === 'requirements') {
      Requirements.render();
    }

    // Close mobile sidebar
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('open');
  }

  // ── Push a new sale row into shared store (used by Stock sell feature) ──
  function addSaleRow(row) {
    salesRows.push(row);
  }

  // ── Remove / update a stock row index in shared store ───────────
  function removeStockRow(idx) {
    stockRows.splice(idx, 1);
  }
  function updateStockRow(idx, row) {
    stockRows[idx] = row;
  }

  // ── Refresh ───────────────────────────────────────────────
  async function refresh() {
    document.getElementById('view-container').innerHTML =
      '<div class="loading-screen" id="loading-screen"><div class="spinner"></div><p>Refreshing data…</p></div>';
    const ok = await loadData();
    if (ok) {
      navigate(currentView);
      toast('Data refreshed!', 'success');
    }
  }

  // ── Set topbar date ───────────────────────────────────────
  function setDate() {
    const el = document.getElementById('topbar-date');
    if (el) {
      el.textContent = new Date().toLocaleDateString('en-IN', {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
        timeZone: 'Asia/Kolkata'
      });
    }
  }

  // ── Init ──────────────────────────────────────────────────
  async function init() {
    setDate();
    // Auto-refresh the date every 60 seconds (keeps it current at midnight)
    setInterval(setDate, 60000);

    // Mobile sidebar
    document.getElementById('hamburger').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
      document.getElementById('sidebar-overlay').classList.toggle('open');
    });
    document.getElementById('sidebar-close').addEventListener('click', () => {
      document.getElementById('sidebar').classList.remove('open');
      document.getElementById('sidebar-overlay').classList.remove('open');
    });
    document.getElementById('sidebar-overlay').addEventListener('click', () => {
      document.getElementById('sidebar').classList.remove('open');
      document.getElementById('sidebar-overlay').classList.remove('open');
    });

    // Nav links
    document.querySelectorAll('.nav-item[data-view]').forEach(el => {
      el.addEventListener('click', e => { e.preventDefault(); navigate(el.dataset.view); });
    });

    // Refresh button
    document.getElementById('btn-refresh').addEventListener('click', refresh);

    // Load & render
    const ok = await loadData();
    if (ok) navigate('dashboard');
  }

  return { init, navigate, refresh, toast, addSaleRow, removeStockRow, updateStockRow };
})();

// ── Boot ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', App.init);
