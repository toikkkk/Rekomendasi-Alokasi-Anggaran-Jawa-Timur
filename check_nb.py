import json, sys
sys.stdout.reconfigure(encoding='utf-8')
with open('notebooks/eda_dan_model.ipynb', encoding='utf-8') as f:
    nb = json.load(f)
cells = nb['cells']
print(f'Total sel: {len(cells)}\n')
for i, cell in enumerate(cells):
    src = cell['source']
    text = (src if isinstance(src, str) else ''.join(src))
    preview = text[:60].replace('\n',' ')
    cid = cell.get('id', f'idx-{i}')
    ct = cell['cell_type']
    print(f'[{i:2d}] {cid[:14]:14s} {ct:8s} | {preview[:58]}')
