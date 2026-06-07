import re

for filename in ['js/stock.js', 'js/sales.js']:
    with open(filename, 'r') as f:
        content = f.read()
    
    # Remove decimal step and placeholder
    content = content.replace('step="0.01"', 'step="1"')
    content = content.replace('placeholder="0.00"', 'placeholder="0"')
    
    # Remove any maximumFractionDigits: 2
    content = content.replace(', { maximumFractionDigits: 2 }', '')

    with open(filename, 'w') as f:
        f.write(content)

with open('apps_script/Code.gs', 'r') as f:
    content = f.read()

content = content.replace('return Math.round(cell * 100) / 100;', 'return Math.round(cell);')

with open('apps_script/Code.gs', 'w') as f:
    f.write(content)

print("Decimals fixed.")
