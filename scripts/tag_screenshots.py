import json, re
p = '/root/nana-rooms/public/archive-tags.json'
d = json.load(open(p))
pat = re.compile(r'screen ?time|screenshot|phone screen|ios|iphone|app usage|settings page|status bar|notification|instagram|tiktok|home screen|lock screen|battery', re.I)
n = 0
for k, v in d.items():
    cap = v.get('caption', '')
    is_shot = 'screenshot' in v.get('vibe', []) or bool(pat.search(cap))
    if is_shot:
        objs = [o for o in v.get('objects', []) if o not in ('screens',)]
        v['objects'] = ['screen time screenshot'] + objs
        v['vibe'] = ['screenshot']
        if not v.get('color') or v['color'] == 'multicolor':
            v['color'] = 'black'
        n += 1
json.dump(d, open(p, 'w'), ensure_ascii=False, indent=1)
print('screenshots tagged', n)
for k, v in d.items():
    if 'screen time screenshot' in v['objects']:
        print(' -', v['caption'][:90])
