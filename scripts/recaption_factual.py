import os, re, json, base64, io, sys
from PIL import Image
import anthropic

env = open(os.path.expanduser('~/.hermes/.env')).read()
key = re.search(r'^ANTHROPIC_API_KEY=(.+)$', env, re.M).group(1).strip().strip('"')
client = anthropic.Anthropic(api_key=key)
ROOT = os.path.expanduser('~/nana-rooms/target/open collective archive')
OUT = os.path.expanduser('~/nana-rooms/public/archive-tags.json')
d = json.load(open(OUT))

PROMPT = ("List what is physically visible in this photo of a room as a plain lowercase inventory, comma-separated, "
          "max 12 items, most prominent first. Concrete nouns only (e.g. 'unmade bed, laptop, phone charger, two plush toys, "
          "makeup bag, pink wall, clothes on chair'). No adjectives about mood, no metaphors, no sentences. "
          "If it is a phone screenshot, say what the screen shows factually. Return only the list.")

def encode(p):
    im = Image.open(p).convert('RGB'); im.thumbnail((768, 768))
    b = io.BytesIO(); im.save(b, 'JPEG', quality=80)
    return base64.b64encode(b.getvalue()).decode()

n = 0
for k, v in d.items():
    if v.get('factual'): continue
    try:
        r = client.messages.create(model="claude-haiku-4-5", max_tokens=200, messages=[{"role": "user", "content": [
            {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": encode(os.path.join(ROOT, k))}},
            {"type": "text", "text": PROMPT}]}])
        txt = r.content[0].text.strip().strip('.').lower()
        txt = re.sub(r'\s+', ' ', txt)
        if len(txt) > 3 and '\n' not in txt[:5]:
            v['caption'] = txt
            v['factual'] = True
    except Exception as e:
        print('ERR', k, e, file=sys.stderr)
    n += 1
    if n % 20 == 0:
        json.dump(d, open(OUT, 'w'), ensure_ascii=False, indent=1); print(n, flush=True)
json.dump(d, open(OUT, 'w'), ensure_ascii=False, indent=1)
print('DONE', sum(1 for v in d.values() if v.get('factual')), '/', len(d))
