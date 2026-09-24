/* Screenshots of every project: desktop (1440×900) and phone (390×844 @2x), saved as PNG into _src/raw/.
   Run:  NODE_USE_ENV_PROXY=1 NODE_PATH=$(npm root -g) node _src/capture.cjs [id ...]      then: python3 _src/shots.py
   The list lives in _src/targets.json: { "<id>": "<url>" }. Ids ending in "-old" are the clients' previous sites. */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const OUT = path.join(__dirname, 'raw'); fs.mkdirSync(OUT, { recursive: true });
const all = JSON.parse(fs.readFileSync(path.join(__dirname, 'targets.json'), 'utf8'));
const only = process.argv.slice(2);
const jobs = Object.entries(all).filter(([id]) => !only.length || only.includes(id));

/* Chromium's own requests through the sandbox proxy fail at random (ERR_TOO_MANY_RETRIES),
   so every request is fetched by Node (NODE_USE_ENV_PROXY=1) with retries and handed back to the page. */
const HOP = new Set(['content-encoding', 'content-length', 'transfer-encoding', 'connection', 'keep-alive']);
async function proxied(route) {
  const req = route.request(), url = req.url();
  if (!/^https?:/.test(url)) return route.continue();
  const headers = {}; for (const [k, v] of Object.entries(req.headers())) if (!/^(host|content-length|accept-encoding)$/i.test(k)) headers[k] = v;
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(url, { method: req.method(), headers, body: req.postDataBuffer() || undefined, redirect: 'manual', signal: AbortSignal.timeout(30000) });
      const body = Buffer.from(await r.arrayBuffer()), h = {};
      r.headers.forEach((v, k) => { if (!HOP.has(k)) h[k] = v; });
      return route.fulfill({ status: r.status, headers: h, body });
    } catch (e) { await new Promise(res => setTimeout(res, 600 * (i + 1))); }
  }
  return route.abort();
}

async function shot(browser, id, url, kind) {
  const mobile = kind === 'm';
  const ctx = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile,
    ignoreHTTPSErrors: true, locale: 'en-GB', reducedMotion: 'no-preference'
  });
  await ctx.route('**/*', proxied);
  const page = await ctx.newPage();
  const file = path.join(OUT, `${id}-${kind}.png`);
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(4000);
    await page.evaluate(() => { window.scrollTo(0, 1); window.scrollTo(0, 0); });
    await page.waitForTimeout(700);
    await page.screenshot({ path: file });
    console.log('OK', id, kind);
  } catch (e) { console.log('FAIL', id, kind, String(e).slice(0, 160)); }
  finally { await ctx.close(); }
}

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const queue = [];
  jobs.forEach(([id, url]) => { queue.push([id, url, 'd'], [id, url, 'm']); });
  const workers = Array.from({ length: 4 }, async () => { while (queue.length) { const j = queue.shift(); await shot(browser, ...j); } });
  await Promise.all(workers);
  await browser.close();
})();
