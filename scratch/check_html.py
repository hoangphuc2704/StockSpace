import sys
import re

sys.stdout.reconfigure(encoding='utf-8')
with open(r'D:\Ky9\Capstone\StockSpace\docs\all_project_functions_matrix.html', 'r', encoding='utf-8') as f:
    content = f.read()

terms = ['Booking', 'booking', 'Change Password', 'changePassword']
for t in terms:
    matches = len(re.findall(re.escape(t), content))
    print(f'Count of "{t}": {matches}')

# Check total functions in rawFunctions
m = re.search(r'const rawFunctions\s*=\s*(\[.*?\]);\s*const rawModules', content, re.DOTALL)
if m:
    import json
    fns = json.loads(m.group(1))
    print(f'Total functions in HTML: {len(fns)}')
    for f in fns[:10]:
        print(f"{f['no']}: {f['name']} [{f['sheet']}]")
