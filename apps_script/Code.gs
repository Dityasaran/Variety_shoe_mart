// ============================================================
// Variety Shoemart — Google Apps Script Backend
// Paste this entire file into script.google.com
// Deploy → New Deployment → Web App
//   Execute as: Me | Who has access: Anyone
// ============================================================

const SHEET_ID = '1UsbbXg0aYAXy3VO2xgvSa6VrpjP0VtjwiEyCAfqaq-s';

const STOCK_HEADERS = [
  'Date', 'Time', 'Brand', 'Article/Model', 'Size', 'Category',
  'Type', 'Shoe Style', 'Color', 'Quantity', 'Wholesale Rate (INR)', 'MRP (INR)'
];

const SALES_HEADERS = [
  'Date', 'Time', 'Brand', 'Article/Model', 'Size', 'Category', 'Type',
  'Shoe Style', 'Color', 'Pairs in Transaction', 'Qty Sold',
  'Cost Price (INR)', 'MRP (INR)', 'Selling Price (INR)',
  'Total Sale Amount', 'Total Cost', 'Profit/Pair', 'Total Profit', 'Discount Given'
];

// ── Format any cell value returned by getValues() into a clean type ─
// Google Sheets returns date/time cells as JS Date objects, and can
// return numbers with floating-point noise.
function formatCell(cell) {
  // Handle Date objects
  if (cell instanceof Date && !isNaN(cell.getTime())) {
    const year = cell.getFullYear();
    if (year < 1970) {
      // Time-only value (Sheets stores time relative to 1899-12-30)
      const h = String(cell.getHours()).padStart(2, '0');
      const m = String(cell.getMinutes()).padStart(2, '0');
      return h + ':' + m;
    }
    // Regular date — return YYYY-MM-DD in spreadsheet local timezone
    const y  = String(cell.getFullYear());
    const mo = String(cell.getMonth() + 1).padStart(2, '0');
    const d  = String(cell.getDate()).padStart(2, '0');
    return y + '-' + mo + '-' + d;
  }
  // Round numbers to eliminate decimals entirely (e.g., 399.00 -> 399)
  if (typeof cell === 'number' && isFinite(cell)) {
    return Math.round(cell);
  }
  return cell;
}

// ── Helpers ──────────────────────────────────────────────────

function getOrCreateSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  } else {
    const lastCol = sheet.getLastColumn();
    const firstRow = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
    if (firstRow.length === 0 || firstRow[0] === '') {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    }
  }
  return sheet;
}

// ── Run this ONCE to fix headers on BOTH sheets ──────────────
// In Apps Script editor: select fixAllHeaders → click ▶ Run
function fixAllHeaders() {
  const ss = SpreadsheetApp.openById(SHEET_ID);

  let stock = ss.getSheetByName('stock_reading');
  if (stock) {
    const firstRow = stock.getLastColumn() > 0 ? stock.getRange(1, 1, 1, stock.getLastColumn()).getValues()[0] : [];
    if (firstRow.length > 1 && firstRow[1] !== 'Time') {
      stock.insertColumnAfter(1); // Inserts blank column B for 'Time' to protect existing data
    }
  } else {
    stock = ss.insertSheet('stock_reading');
  }
  stock.getRange(1, 1, 1, STOCK_HEADERS.length).setValues([STOCK_HEADERS]);
  stock.getRange(1, 1, 1, STOCK_HEADERS.length).setFontWeight('bold');
  Logger.log('✅ stock_reading headers fixed: ' + STOCK_HEADERS.join(', '));

  let sales = ss.getSheetByName('Product_sales') || ss.insertSheet('Product_sales');
  sales.getRange(1, 1, 1, SALES_HEADERS.length).setValues([SALES_HEADERS]);
  sales.getRange(1, 1, 1, SALES_HEADERS.length).setFontWeight('bold');
  Logger.log('✅ Product_sales headers fixed: ' + SALES_HEADERS.join(', '));
}

function getAllRows(sheet) {
  if (sheet.getLastRow() <= 1) return [];
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  // Convert any Date objects to clean strings before JSON serialisation
  return data.map(function(row) {
    return row.map(formatCell);
  });
}

function makeResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── doGet — handles all read + write actions via GET ─────────

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
      const rowIdx = parseInt(p.rowIndex);
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
