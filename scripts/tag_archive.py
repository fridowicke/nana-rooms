import os, re, json, base64, io, sys, time
from PIL import Image
import anthropic

env = open(os.path.expanduser('~/.hermes/.env')).read()
key = re.search(r'^ANTHROPIC_API_KEY=(.+)$', env, re.M).group(1).strip().strip('"')
client = anthropic.Anthropic(api_key=key)

ROOT = os.path.expanduser('~/nana-rooms/target/open collective archive')
OUT = os.path.expanduser('~/nana-rooms/public/archive-tags.json')
tags = json.load(open(OUT)) if os.path.exists(OUT) else {}

COLORS = ["pink","white","beige","brown","black","grey","blue","green","purple","red","yellow","multicolor"]
OBJECTS = ["plush toys","makeup","cables","posters","screens","books","clothes on floor","food or drinks","mirror","plants","bed unmade","fairy lights","figurines","art supplies","shoes","bags","bottles","trash","laundry","medicine","instruments","gaming","pets"]
VIBES = ["maximalist","minimal","messy","cozy","chaotic","dreamy","dark","girly"]

PROMPT = f"""You are tagging a photo of a girl's bedroom for an art archive. Return ONLY compact JSON:
{{"color": one of {COLORS}, "objects": up to 6 items from {OBJECTS} that are clearly visible, "vibe": up to 3 from {VIBES}, "caption": one short lowercase poetic sentence (max 12 words) describing the room}}"""

files = []
for d, _, fs in os.walk(ROOT):
    for f in fs:
        if f.lower().endswith(('.jpg','.jpeg','.png')):
            files.append(os.path.join(d, f))
files.sort()

def key_for(p):
    rel = os.path.relpath(p, ROOT)
    return rel

def encode(p):
    im = Image.open(p).convert('RGB')
    im.thumbnail((768, 768))
    b = io.BytesIO(); im.save(b, 'JPEG', quality=80)
    return base64.b64encode(b.getvalue()).decode()

done = 0
for p in files:
    k = key_for(p)
    if k in tags: continue
    try:
        img = encode(p)
        r = client.messages.create(model="claude-haiku-4-5", max_tokens=300, messages=[{"role":"user","content":[
            {"type":"image","source":{"type":"base64","media_type":"image/jpeg","data":img}},
            {"type":"text","text":PROMPT}]}])
        txt = r.content[0].text
        m = re.search(r'\{.*\}', txt, re.S)
        tags[k] = json.loads(m.group(0))
    except Exception as e:
        print('ERR', k, e, file=sys.stderr)
        tags[k] = {"color":"multicolor","objects":[],"vibe":[],"caption":""}
    done += 1
    if done % 10 == 0:
        json.dump(tags, open(OUT,'w'), ensure_ascii=False, indent=1)
        print(done, len(tags), '/', len(files), flush=True)
json.dump(tags, open(OUT,'w'), ensure_ascii=False, indent=1)
print('DONE', len(tags))
