// ============================================================
// Variety Shoemart — Google Apps Script Backend
// Paste this entire file into script.google.com
// Deploy → New Deployment → Web App
//   Execute as: Me | Who has access: Anyone
// ============================================================

const SHEET_ID = '1UsbbXg0aYAXy3VO2xgvSa6VrpjP0VtjwiEyCAfqaq-s';

const STOCK_HEADERS = [
  'Date', 'Brand', 'Article/Model', 'Size', 'Category',
  'Type', 'Shoe Style', 'Color', 'Quantity', 'Cost Price (INR)', 'MRP (INR)'
];

const SALES_HEADERS = [
  'Date', 'Time', 'Brand', 'Article/Model', 'Size', 'Category', 'Type',
  'Shoe Style', 'Color', 'Pairs in Transaction', 'Qty Sold',
  'Cost Price (INR)', 'MRP (INR)', 'Selling Price (INR)',
  'Total Sale Amount', 'Total Cost', 'Profit/Pair', 'Total Profit', 'Discount Given'
];

// ── Helpers ──────────────────────────────────────────────────

function getOrCreateSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
  return sheet;
}

function getAllRows(sheet) {
  if (sheet.getLastRow() <= 1) return [];
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  return data;
}

function makeResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── doGet — handles all read + write actions via GET ─────────
// Using GET for everything avoids CORS preflight issues.

function doGet(e) {
  try {
    const p      = e.parameter;
    const action = p.action || '';
    const ss     = SpreadsheetApp.openById(SHEET_ID);

    // ── READ ────────────────────────────────────────────────
    if (action === 'getStock') {
      const sheet = getOrCreateSheet(ss, 'stock_reading', STOCK_HEADERS);
      return makeResponse({ success: true, rows: getAllRows(sheet) });
    }

    if (action === 'getSales') {
      const sheet = getOrCreateSheet(ss, 'Product_sales', SALES_HEADERS);
      return makeResponse({ success: true, rows: getAllRows(sheet) });
    }

    // ── WRITE ────────────────────────────────────────────────
    if (action === 'addStock') {
      const row   = JSON.parse(p.row);
      const sheet = getOrCreateSheet(ss, 'stock_reading', STOCK_HEADERS);
      sheet.appendRow(row);
      return makeResponse({ success: true });
    }

    if (action === 'addSale') {
      const row   = JSON.parse(p.row);
      const sheet = getOrCreateSheet(ss, 'Product_sales', SALES_HEADERS);
      sheet.appendRow(row);
      return makeResponse({ success: true });
    }

    if (action === 'updateStock') {
      const rowIdx = parseInt(p.rowIndex); // 0-based data row (row 2 in sheet = index 0)
      const row    = JSON.parse(p.row);
      const sheet  = getOrCreateSheet(ss, 'stock_reading', STOCK_HEADERS);
      sheet.getRange(rowIdx + 2, 1, 1, row.length).setValues([row]);
      return makeResponse({ success: true });
    }

    if (action === 'updateSale') {
      const rowIdx = parseInt(p.rowIndex);
      const row    = JSON.parse(p.row);
      const sheet  = getOrCreateSheet(ss, 'Product_sales', SALES_HEADERS);
      sheet.getRange(rowIdx + 2, 1, 1, row.length).setValues([row]);
      return makeResponse({ success: true });
    }

    if (action === 'deleteStock') {
      const rowIdx = parseInt(p.rowIndex);
      const sheet  = getOrCreateSheet(ss, 'stock_reading', STOCK_HEADERS);
      sheet.deleteRow(rowIdx + 2);
      return makeResponse({ success: true });
    }

    if (action === 'deleteSale') {
      const rowIdx = parseInt(p.rowIndex);
      const sheet  = getOrCreateSheet(ss, 'Product_sales', SALES_HEADERS);
      sheet.deleteRow(rowIdx + 2);
      return makeResponse({ success: true });
    }

    return makeResponse({ success: false, error: 'Unknown action: ' + action });

  } catch (err) {
    return makeResponse({ success: false, error: err.toString() });
  }
}
