// ============================================================
// js/api.js — All Google Sheets API calls via Apps Script GET
// ============================================================

const API = (() => {

  function buildUrl(params) {
    if (!CONFIG.APPS_SCRIPT_URL || CONFIG.APPS_SCRIPT_URL === 'PASTE_YOUR_WEB_APP_URL_HERE') {
      throw new Error('Apps Script URL not configured. Open js/config.js and paste your Web App URL.');
    }
    const url = new URL(CONFIG.APPS_SCRIPT_URL);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    return url.toString();
  }

  async function call(params) {
    const url = buildUrl(params);
    const res = await fetch(url, { redirect: 'follow' });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Unknown error from server');
    return json;
  }

  return {
    getStock:     ()              => call({ action: 'getStock' }),
    getSales:     ()              => call({ action: 'getSales' }),
    addStock:     (row)           => call({ action: 'addStock',     row: JSON.stringify(row) }),
    addSale:      (row)           => call({ action: 'addSale',      row: JSON.stringify(row) }),
    updateStock:  (idx, row)      => call({ action: 'updateStock',  rowIndex: idx, row: JSON.stringify(row) }),
    updateSale:   (idx, row)      => call({ action: 'updateSale',   rowIndex: idx, row: JSON.stringify(row) }),
    deleteStock:  (idx)           => call({ action: 'deleteStock',  rowIndex: idx }),
    deleteSale:   (idx)           => call({ action: 'deleteSale',   rowIndex: idx }),
  };
})();
