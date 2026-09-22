import os, re, json, base64, io, sys
from PIL import Image
import anthropic
env = open(os.path.expanduser('~/.hermes/.env')).read()
key = re.search(r'^ANTHROPIC_API_KEY=(.+)$', env, re.M).group(1).strip().strip('"')
client = anthropic.Anthropic(api_key=key)
ROOT = os.path.expanduser('~/nana-rooms/target/open collective archive')
OUT = os.path.expanduser('~/nana-rooms/public/archive-tags.json')
d = json.load(open(OUT))
PROMPT = ("This is a photo of a bedroom for an art archive. Pick exactly ONE category, answer with one word.\n"
          "pink = pink, purple, lilac or pastel girly colours dominate the room (walls, bedding, decor)\n"
          "toys = plush toys, dolls, figurines, or makeup/cosmetics/skincare are the most noticeable things\n"
          "cluttered = extremely messy: piles of clothes, trash, stuff covering floor and every surface\n"
          "tidy = everything else: an ordinary or fairly clean room, some things around but not chaos\n"
          "Rules: choose pink if pink/purple clearly dominates even if messy. Choose toys if toys/makeup stand out and the room is not pink. "
          "Use cluttered only for real chaos. Otherwise tidy.\nAnswer: pink, toys, cluttered or tidy.")
def enc(p):
    im = Image.open(p).convert('RGB'); im.thumbnail((640, 640))
    b = io.BytesIO(); im.save(b, 'JPEG', quality=78); return base64.b64encode(b.getvalue()).decode()
n = 0
for k, v in d.items():
    if v.get('cat') == 'screenshot': continue
    if v.get('cat2'): continue
    try:
        r = client.messages.create(model="claude-haiku-4-5", max_tokens=5, messages=[{"role": "user", "content": [
            {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": enc(os.path.join(ROOT, k))}},
            {"type": "text", "text": PROMPT}]}])
        w = r.content[0].text.strip().lower()
        w = next((c for c in ('pink', 'toys', 'cluttered', 'tidy') if c in w), 'tidy')
        v['cat2'] = w
    except Exception as e:
        print('ERR', k, e, file=sys.stderr); v['cat2'] = 'tidy'
    n += 1
    if n % 25 == 0: json.dump(d, open(OUT, 'w'), ensure_ascii=False, indent=1); print(n, flush=True)
for v in d.values():
    if v.get('cat') != 'screenshot' and v.get('cat2'): v['cat'] = v.pop('cat2')
json.dump(d, open(OUT, 'w'), ensure_ascii=False, indent=1)
from collections import Counter
print('DONE', Counter(v['cat'] for v in d.values()))
