import re
p = '/root/nana-rooms/public/patchy-studies.html'
s = open(p, encoding='utf-8').read()
FONT = '"Helvetica Neue",Helvetica,Arial,sans-serif'

# --- palette ---
s = s.replace("palette={book:'#198b48',essay:'#e5524e',work:'#7857a7'}",
              "palette={book:'#39ff14',essay:'#ffb3d9',work:'#7ff5e0'}")
s = s.replace('style="background:#198b48"', 'style="background:#39ff14"')
s = s.replace('style="background:#e5524e"', 'style="background:#ffb3d9"')
s = s.replace('style="background:#7857a7"', 'style="background:#7ff5e0"')
# node label colour: light nodes -> black text, normal weight
s = s.replace("ctx.fillStyle='#fff';ctx.textAlign='center'", "ctx.fillStyle='#111';ctx.textAlign='center'")
s = s.replace("ctx.font=`${n.type==='essay'?'600':'500'} 11px Arial`", "ctx.font=`400 11px ${'\"Helvetica Neue\",Helvetica,Arial,sans-serif'}`")

# --- backgrounds: beige -> white ---
s = s.replace('html,body{width:100%;height:100%;overflow:hidden;background:#f2f1ec}', 'html,body{width:100%;height:100%;overflow:hidden;background:#fff}')
s = s.replace('.graph-stage{position:fixed;inset:0;overflow:hidden;background:#f2f1ec}', '.graph-stage{position:fixed;inset:0;overflow:hidden;background:#fff}')
s = s.replace('background:rgba(238,236,232,.94)', 'background:rgba(255,255,255,.96)')
s = s.replace('background:rgba(245,244,240,.96)', 'background:rgba(255,255,255,.98)')
s = s.replace('background:rgba(245,244,240,.88)', 'background:rgba(255,255,255,.9)')
s = s.replace('background:rgba(242,241,236,.8)', 'background:rgba(255,255,255,.85)')
s = s.replace('--paper:#f4f2ed', '--paper:#ffffff')
s = s.replace('background:rgba(244,242,237,.95)', 'background:rgba(255,255,255,.95)')
# brand badge: neutral
s = s.replace('.brand{position:fixed;z-index:20;bottom:16px;left:16px;background:#38d40a;color:#071b00;',
              '.brand{position:fixed;z-index:20;bottom:16px;left:16px;background:#fff;color:#111;border:1px solid #111;')
# focus switch colour
s = s.replace('.switch.on{background:#2923cf}', '.switch.on{background:#111}')
s = s.replace('border-color:#2923cf;box-shadow:0 0 0 2px rgba(41,35,207,.15)', 'border-color:#111;box-shadow:0 0 0 2px rgba(0,0,0,.08)')

# --- typography: site font, weight 300/400, no italics, no Georgia ---
s = s.replace("body{font-family:Arial,Helvetica,sans-serif}", "body{font-family:%s;font-weight:300}" % FONT)
s = s.replace("font:16px/1.35 Arial,Helvetica,sans-serif", "font:300 16px/1.35 %s" % FONT)
s = re.sub(r'Georgia,serif', FONT, s)
s = s.replace('font-style:italic;', '')
s = re.sub(r'font:italic ', 'font:300 ', s)
s = s.replace('.panel h1{font-size:1rem;line-height:1;text-transform:none;letter-spacing:0;margin:0}',
              '.panel h1{font-size:1rem;line-height:1;text-transform:none;letter-spacing:0;margin:0;font-weight:400}')
s = s.replace('.mode-word{font-weight:700}', '.mode-word{font-weight:400}')
s = s.replace('.label{display:block;font-size:.72rem;font-weight:700;', '.label{display:block;font-size:.72rem;font-weight:400;')
s = s.replace('.visibility-title{font-size:.72rem;font-weight:700;', '.visibility-title{font-size:.72rem;font-weight:400;')
s = s.replace('.detail-type{font-size:.65rem;text-transform:uppercase;letter-spacing:.08em;font-weight:700}',
              '.detail-type{font-size:.65rem;text-transform:uppercase;letter-spacing:.08em;font-weight:400;color:#111!important}')
s = s.replace('.detail h2{font-size:1.15rem;line-height:1.05;margin:7px 24px 3px}',
              '.detail h2{font-size:1.15rem;line-height:1.15;margin:7px 24px 3px;font-weight:400;font-family:%s}' % FONT)
s = s.replace('.detail-author{font:.85rem ', '.detail-author{font:300 .85rem ')
s = s.replace('h2{font:700 1.08rem/1.02 Arial,sans-serif;', 'h2{font:400 1.08rem/1.15 %s;' % FONT)
s = s.replace(".detail-links{margin-top:10px;padding-top:9px;border-top:1px solid rgba(0,0,0,.16);font-size:.7rem;line-height:1.35}",
              ".detail-links{margin-top:10px;padding-top:9px;border-top:1px solid rgba(0,0,0,.16);font-size:.7rem;line-height:1.35}.detail-links b{font-weight:400}")
s = s.replace("document.querySelector('#detailType').style.color=palette[n.type];", "")
open(p, 'w', encoding='utf-8').write(s)
print('italic left:', s.count('italic'), '| georgia left:', s.count('Georgia'), '| 700 left:', s.count('700'))
