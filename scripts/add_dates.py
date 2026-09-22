import os, json
from PIL import Image
ROOT = os.path.expanduser('~/nana-rooms/target/open collective archive')
p = '/root/nana-rooms/public/archive-tags.json'
d = json.load(open(p))
have = 0
for k, v in d.items():
    fp = os.path.join(ROOT, k)
    date = None
    try:
        ex = Image.open(fp).getexif()
        raw = ex.get(36867) or ex.get(306)
        if raw and str(raw)[:4].isdigit():
            date = str(raw)[:10].replace(':', '-')
    except Exception:
        pass
    if date:
        v['date'] = date; have += 1
json.dump(d, open(p, 'w'), ensure_ascii=False, indent=1)
print('dates found', have, '/', len(d))
