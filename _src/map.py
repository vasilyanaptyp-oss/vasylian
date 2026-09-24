"""Dot-matrix map of the part of Europe where the work is. Writes _src/map.json, which build.cjs inlines as SVG.
   Source: world-atlas@2 countries-50m (Natural Earth), downloaded once into _src/cache/.
   Run: python3 _src/map.py"""
import json, math, os, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, 'cache', 'countries-50m.json')
if not os.path.exists(CACHE):
    os.makedirs(os.path.dirname(CACHE), exist_ok=True)
    urllib.request.urlretrieve('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json', CACHE)
topo = json.load(open(CACHE))

# frame: lon 1..40 E, lat 44..62.5 N, equirectangular squeezed by cos(52°)
LON0, LON1, LAT0, LAT1 = 1.0, 40.0, 44.0, 62.5
K = math.cos(math.radians(52))
SCALE = 10                                  # 1 degree of latitude = 10 units
STEP = 3.6                                  # dot pitch in units
def proj(lon, lat): return ((lon - LON0) * K * SCALE, (LAT1 - lat) * SCALE)
W, H = proj(LON1, LAT0)

# --- decode topojson arcs
sx, sy = topo['transform']['scale']; tx, ty = topo['transform']['translate']
arcs = []
for arc in topo['arcs']:
    x = y = 0; pts = []
    for dx, dy in arc:
        x += dx; y += dy; pts.append((x * sx + tx, y * sy + ty))
    arcs.append(pts)
def ring(idx):
    out = []
    for i in idx:
        pts = arcs[i] if i >= 0 else arcs[~i][::-1]
        out.extend(pts if not out else pts[1:])
    return out
def polys(geom):
    t = geom.get('type')
    if t == 'Polygon': return [[ring(r) for r in geom['arcs']]]
    if t == 'MultiPolygon': return [[ring(r) for r in p] for p in geom['arcs']]
    return []
def inside(pt, rings):
    x, y = pt; c = False
    for r in rings:
        n = len(r); j = n - 1
        for i in range(n):
            xi, yi = r[i]; xj, yj = r[j]
            if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi + 1e-12) + xi: c = not c
            j = i
    return c

HOT = {'428': 'LV', '440': 'LT', '233': 'EE', '616': 'PL', '804': 'UA', '040': 'AT', '752': 'SE'}
shapes = []
for g in topo['objects']['countries']['geometries']:
    for p in polys(g):
        xs = [q[0] for q in p[0]]; ys = [q[1] for q in p[0]]
        if max(xs) < LON0 - 2 or min(xs) > LON1 + 2 or max(ys) < LAT0 - 2 or min(ys) > LAT1 + 2: continue
        shapes.append((HOT.get(g.get('id')), (min(xs), min(ys), max(xs), max(ys)), p))

land, hot = [], {}
rows = int(H // STEP) + 1
for r in range(rows):
    y = STEP / 2 + r * STEP
    off = STEP / 2 if r % 2 else 0            # hex offset
    c = 0
    while True:
        x = STEP / 2 + off + c * STEP; c += 1
        if x > W: break
        lon = x / (K * SCALE) + LON0; lat = LAT1 - y / SCALE
        for code, (a, b, cc, d), p in shapes:
            if a <= lon <= cc and b <= lat <= d and inside((lon, lat), p):
                (hot.setdefault(code, []) if code else land).append((round(x, 1), round(y, 1)))
                break

json.dump({'w': round(W, 1), 'h': round(H, 1), 'step': STEP, 'lon0': LON0, 'lat1': LAT1, 'k': K, 'scale': SCALE,
           'land': land, 'hot': hot}, open(os.path.join(HERE, 'map.json'), 'w'), separators=(',', ':'))
print('W×H', round(W), round(H), 'land', len(land), {k: len(v) for k, v in hot.items()})
