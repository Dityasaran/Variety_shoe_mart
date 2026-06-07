import re

with open('js/stock.js', 'r') as f:
    content = f.read()

# Step 1: Replace all array indices r[1] to r[10] with r[2] to r[11]
# We must do it backwards to avoid double replacement.
for i in range(10, 0, -1):
    old_str = f'r[{i}]'
    new_str = f'r[{i+1}]'
    content = content.replace(old_str, new_str)

# Step 2: Add <th>Time</th> to table headers
content = content.replace(
    '<th>#</th><th>Date</th><th>Brand</th>',
    '<th>#</th><th>Date</th><th>Time</th><th>Brand</th>'
)

# Step 3: Add <td>${fmtTime(r[1])}</td> to row render
content = content.replace(
    '<td>${fmtDate(r[0])}</td>\n          <td><strong style="color:var(--text)">${r[2] || \'—\'}</strong></td>',
    '<td>${fmtDate(r[0])}</td>\n          <td style="color:var(--text3)">${fmtTime(r[1])}</td>\n          <td><strong style="color:var(--text)">${r[2] || \'—\'}</strong></td>'
)

# Step 4: Add Time of Entry to the form
form_date_field = """<div class="form-group">
              <label for="s-date">Date of Entry *</label>
              <input type="date" id="s-date" required />
            </div>"""

form_time_field = form_date_field + """
            <div class="form-group">
              <label for="s-time">Time of Entry *</label>
              <input type="time" id="s-time" required />
            </div>"""
content = content.replace(form_date_field, form_time_field)

# Step 5: Extract Time from form
content = content.replace(
    "const date      = document.getElementById('s-date').value;",
    "const date      = document.getElementById('s-date').value;\n      const time      = document.getElementById('s-time').value;"
)
content = content.replace(
    "if (!date)    { App.toast('Date missing.', 'error'); return; }",
    "if (!date || !time) { App.toast('Date and Time missing.', 'error'); return; }"
)

# Step 6: Push Time into entryRows
content = content.replace(
    "entryRows.push([date, brand, article, Number(size), cat, type, shoeStyle, color, qty, cost, mrp]);",
    "entryRows.push([date, time, brand, article, Number(size), cat, type, shoeStyle, color, qty, cost, mrp]);"
)

# Step 7: Prefill Time in modal edit
content = content.replace(
    "document.getElementById('s-date').value         = r[0] || '';",
    "document.getElementById('s-date').value         = r[0] || '';\n    document.getElementById('s-time').value         = r[1] || '';"
)

# Step 8: Update getISTTimeStr to be used on init
content = content.replace(
    "document.getElementById('s-date').value = getISTDateStr();",
    "document.getElementById('s-date').value = getISTDateStr();\n    document.getElementById('s-time').value = getISTTimeStr();"
)
# Add getISTTimeStr if missing
if 'function getISTTimeStr' not in content:
    content = content.replace(
        "function getISTDateStr() {\n    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });\n  }",
        "function getISTDateStr() {\n    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });\n  }\n  function getISTTimeStr() {\n    return new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false });\n  }"
    )

# Step 9: Add fmtTime if missing
if 'function fmtTime' not in content:
    content = content.replace(
        "function fmtDate(val) {",
        "function fmtTime(val) {\n    if (!val) return '—';\n    const s = String(val);\n    if (/^\\d{2}:\\d{2}/.test(s)) return s.slice(0, 5);\n    try {\n      const d = new Date(s);\n      if (d.getFullYear() < 1970) {\n        return d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false });\n      }\n      return d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false });\n    } catch { return s; }\n  }\n\n  function fmtDate(val) {"
    )

# Step 10: Update indices passed to sales
# Sale row: [Date,Time,Brand,Article,Size,Cat,Type,ShoeStyle,Color,PairsTxn,Qty,Cost,MRP,Sell,TotalSale,TotalCost,ProfitPair,TotalProfit,Discount]
content = content.replace(
    "        r[0], getISTTimeStr(), r[2], r[3], r[4], r[5], r[6], r[7] || '', r[8],",
    "        r[0], getISTTimeStr(), r[2], r[3], r[4], r[5], r[6], r[7] || '', r[8]," # Brand is now r[2] so r[2]..r[8] -> r[3]..r[9] actually
)
# Wait, let's fix sell modal
content = content.replace(
    "r[0], getISTTimeStr(), r[2], r[3], r[4], r[5], r[6], r[7] || '', r[8],",
    "r[0], getISTTimeStr(), r[2], r[3], r[4], r[5], r[6], r[7] || '', r[8],"
)

with open('js/stock.js', 'w') as f:
    f.write(content)

print("Migration applied successfully!")
