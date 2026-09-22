import json, sys
from collections import Counter
d = json.load(open('/root/nana-rooms/public/archive-tags.json'))
bad = [k for k, v in d.items() if not v.get('objects') and not v.get('vibe')]
print(len(d), 'tagged;', len(bad), 'empty')
print(Counter(v['color'] for v in d.values()).most_common())
if '--drop-empty' in sys.argv:
    for k in bad: del d[k]
    json.dump(d, open('/root/nana-rooms/public/archive-tags.json', 'w'), ensure_ascii=False, indent=1)
    print('dropped', len(bad))
