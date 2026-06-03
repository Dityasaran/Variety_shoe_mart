# Variety Shoemart — Store Management System

A complete web-based store management app backed by Google Sheets.

---

## ⚡ One-Time Setup (5 minutes)

### Step 1 — Deploy the Apps Script Backend

1. Go to **[script.google.com](https://script.google.com)** and sign in with the Google account that owns the Sheet.
2. Click **"New Project"**.
3. Delete all existing code in the editor.
4. Open the file `apps_script/Code.gs` from this project and **copy all its contents**.
5. Paste it into the Apps Script editor.
6. Click **Save** (Ctrl+S / Cmd+S). Name the project `Shoemart Backend`.
7. Click **Deploy → New Deployment**.
8. Click the ⚙️ gear icon next to "Select type" → choose **Web App**.
9. Set:
   - **Description**: `Shoemart API`
   - **Execute as**: `Me`
   - **Who has access**: `Anyone`
10. Click **Deploy**. Authorize when prompted.
11. Copy the **Web App URL** (it looks like `https://script.google.com/macros/s/XXXX/exec`).

---

### Step 2 — Paste the URL into config.js

Open `js/config.js` and replace `PASTE_YOUR_WEB_APP_URL_HERE` with the URL you copied:

```js
const CONFIG = {
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/YOUR_ID_HERE/exec',
  SHEET_ID: '1UsbbXg0aYAXy3VO2xgvSa6VrpjP0VtjwiEyCAfqaq-s'
};
```

---

### Step 3 — Verify Your Google Sheet

Open your Google Sheet and make sure it has two tabs named **exactly**:
- `stock_reading`
- `Product_sales`

> The Apps Script will automatically create header rows the first time data is fetched.

---

### Step 4 — Open the App

Simply open `index.html` in your browser (double-click or drag it into Chrome/Firefox/Edge).

> No server needed! The app runs entirely in the browser.

---

## 📁 Project Structure

```
shoemart_project/
├── index.html              # Main app
├── css/
│   └── style.css           # Dark navy + orange design system
├── js/
│   ├── config.js           # ← Paste your Web App URL here
│   ├── api.js              # Google Sheets API calls
│   ├── dashboard.js        # Dashboard summary cards
│   ├── stock.js            # Stock management module
│   ├── sales.js            # Sales management module
│   └── app.js              # Router + navigation + toasts
├── apps_script/
│   └── Code.gs             # Paste into script.google.com
└── README.md
```

---

## 📊 Data Columns

### `stock_reading` sheet
| A | B | C | D | E | F | G | H | I |
|---|---|---|---|---|---|---|---|---|
| Date | Brand | Article/Model | Size | Category | Type | Quantity | Cost Price | MRP |

### `Product_sales` sheet
| A | B | C | D | E | F | G | H | I | J | K | L | M | N | O |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Date | Brand | Article | Size | Category | Type | Qty Sold | Cost Price | MRP | Selling Price | Total Sale | Total Cost | Profit/Pair | Total Profit | Discount |

---

## 🛠️ Re-deploying After Changes

If you modify `Code.gs` in the Apps Script editor:
1. Click **Deploy → Manage Deployments**
2. Click the pencil icon ✏️ on your existing deployment
3. Change version to **"New Version"**
4. Click **Deploy**

The URL stays the same — no need to update `config.js`.

---

## ✅ Features

- 📊 **Dashboard** — Live summary cards: Total Stock, Today's Sales, Revenue, Profit, Top Brand, Low Stock Alerts
- 📦 **Stock Management** — Add, edit, delete stock entries with search + filter; auto Total Cost Value column
- 🛒 **Sales Management** — Record sales with live auto-calculated fields; date-range + brand/category filters; summary footer
- 📱 **Responsive** — Mobile-friendly with collapsible sidebar
- 🔔 **Toast Notifications** — Success/error/info messages on every action
- 💾 **Google Sheets backend** — Every action syncs directly to your Sheet in real time
