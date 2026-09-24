/* Social preview images (1200×630), one per language: the page's own headline next to three real screenshots.
   Needs the site served locally:  npx http-server -p 8080 .   then
   NODE_USE_ENV_PROXY=1 NODE_PATH=$(npm root -g) node _src/og.cjs      → assets/og/<lang>.jpg */
'use strict';
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const ROOT = path.join(__dirname, '..');
const LANGS = ['en', 'lv', 'lt', 'et', 'pl', 'de', 'uk', 'ru'];
const W = require('./works.cjs');
const N = W.filter(w => w.kind !== 'lab').length;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function html(t) {
  const h1 = esc(t.hero.h1).replace(/\*(.+?)\*/g, '<em>$1</em>');
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;1,500&family=Inter:wght@500;600&display=swap">
<style>
*{box-sizing:border-box}body{margin:0;width:1200px;height:630px;background:#f4f1ea;color:#141412;font-family:Inter,sans-serif;overflow:hidden;position:relative}
.copy{position:absolute;left:64px;top:64px;width:600px}
.brand{font:600 26px 'Playfair Display',serif;display:flex;align-items:center;gap:10px}
.brand i{width:12px;height:12px;border-radius:50%;background:#ff4d00}
h1{font:600 64px/1.02 'Playfair Display',serif;letter-spacing:-.02em;margin:44px 0 0}
h1 em{font-style:italic;font-weight:500;color:#c93c00}
.row{position:absolute;left:64px;bottom:60px;display:flex;gap:14px;align-items:center}
.pill{font:600 22px Inter;padding:14px 22px;border-radius:999px;background:#ff4d00;color:#141412}
.pill.d{background:#141412;color:#f4f1ea}
.url{font:500 22px Inter;color:#5f5e58;margin-left:8px}
.shots{position:absolute;right:-60px;top:40px;width:560px;height:620px;transform:rotate(-8deg)}
.shot{position:absolute;border-radius:14px;overflow:hidden;box-shadow:0 30px 60px -20px rgba(20,20,18,.45);border:1px solid rgba(20,20,18,.1);background:#fff}
.shot img{display:block;width:100%}
.a{width:420px;left:120px;top:0}.b{width:420px;left:40px;top:250px}.c{width:170px;left:0;top:70px;border:6px solid #0b0b0a;border-radius:24px}
</style></head><body>
<div class="copy"><div class="brand">Artur Vasilyan<i></i></div><h1>${h1}</h1></div>
<div class="row"><span class="pill">300 €</span><span class="pill d">${N} ${esc(t.hero.fSites.split(' ')[0])}</span><span class="url">vasylian.com</span></div>
<div class="shots"><div class="shot a"><img src="/assets/shots/ventsistema-d-640.webp"></div><div class="shot b"><img src="/assets/shots/janbra-d-640.webp"></div><div class="shot c"><img src="/assets/shots/grdarbi-m.webp"></div></div>
</body></html>`;
}

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1200, height: 630 } });
  await ctx.route('**/*', async route => {
    const req = route.request(), url = req.url();
    if (/localhost/.test(url)) return route.continue();
    const r = await fetch(url, { headers: req.headers() }); const body = Buffer.from(await r.arrayBuffer()), h = {};
    r.headers.forEach((v, k) => { if (!/content-encoding|content-length|transfer-encoding/.test(k)) h[k] = v; });
    return route.fulfill({ status: r.status, headers: h, body });
  });
  for (const code of LANGS) {
    const t = Object.assign({}, require('./i18n/en.cjs'), require(`./i18n/${code}.cjs`));
    const tmp = path.join(ROOT, '_og-tmp.html'); fs.writeFileSync(tmp, html(t));
    const p = await ctx.newPage();
    await p.goto('http://localhost:8080/_og-tmp.html', { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
    await p.screenshot({ path: path.join(ROOT, 'assets', 'og', code + '.jpg'), type: 'jpeg', quality: 86 });
    await p.close(); fs.unlinkSync(tmp); console.log('og', code);
  }
  await b.close();
})();
