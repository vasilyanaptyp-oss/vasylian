"""PNG captures in _src/raw → webp in assets/shots.
   <id>-d.png (1440×900)  → <id>-d.webp (1200w) + <id>-d-640.webp
   <id>-m.png (780×1688)  → <id>-m.webp (600w)
   Run: python3 _src/shots.py [id ...]"""
import glob, os, sys
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
RAW, OUT = os.path.join(HERE, 'raw'), os.path.join(HERE, '..', 'assets', 'shots')
os.makedirs(OUT, exist_ok=True)
only = set(sys.argv[1:])
def blank(im):
    ex = im.convert('L').resize((64, 40)).getextrema()
    return ex[1] - ex[0] < 8                    # one flat colour: the page did not render
for f in sorted(glob.glob(os.path.join(RAW, '*.png'))):
    name = os.path.basename(f)[:-4]; pid, kind = name.rsplit('-', 1)
    if only and pid not in only: continue
    im = Image.open(f).convert('RGB')
    if blank(im): print('SKIP blank', name); continue
    if kind == 'd':
        for w, suffix in ((1200, ''), (640, '-640')):
            c = im.copy(); c.thumbnail((w, w)); c.save(os.path.join(OUT, f'{pid}-d{suffix}.webp'), 'WEBP', quality=80, method=6)
    else:
        c = im.copy(); c.thumbnail((600, 1400)); c.save(os.path.join(OUT, f'{pid}-m.webp'), 'WEBP', quality=78, method=6)
    print('OK', name)
