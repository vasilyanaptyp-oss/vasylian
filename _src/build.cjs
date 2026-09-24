/* Builds the static site: one page per language from the same template.
   Run: node _src/build.cjs
   Inputs:  _src/i18n/<lang>.cjs (page copy), _src/works.cjs (projects), _src/map.json (dot map, from map.py)
   Outputs: index.html (English), lv/ lt/ ee/ pl/ de/ ua/ ru/ index.html, 404.html, sitemap.xml, robots.txt
   No dependencies; the output is plain HTML that GitHub Pages serves as is. */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const SITE = 'https://vasylian.com/';
const MAIL = 'vasilyanaptyp@gmail.com';

const LANGS = [
  { code: 'en', dir: '',    hl: 'en', og: 'en_GB', name: 'English',    short: 'EN', home: null },
  { code: 'lv', dir: 'lv/', hl: 'lv', og: 'lv_LV', name: 'Latviešu',   short: 'LV', home: 'LV' },
  { code: 'lt', dir: 'lt/', hl: 'lt', og: 'lt_LT', name: 'Lietuvių',   short: 'LT', home: 'LT' },
  { code: 'et', dir: 'ee/', hl: 'et', og: 'et_EE', name: 'Eesti',      short: 'EE', home: 'EE' },
  { code: 'pl', dir: 'pl/', hl: 'pl', og: 'pl_PL', name: 'Polski',     short: 'PL', home: 'PL' },
  { code: 'de', dir: 'de/', hl: 'de', og: 'de_DE', name: 'Deutsch',    short: 'DE', home: 'AT' },
  { code: 'uk', dir: 'ua/', hl: 'uk', og: 'uk_UA', name: 'Українська', short: 'UA', home: 'UA' },
  { code: 'ru', dir: 'ru/', hl: 'ru', og: 'ru_RU', name: 'Русский',    short: 'RU', home: null }
];
const COUNTRIES = ['LV', 'LT', 'EE', 'PL', 'UA', 'AT', 'SE'];
const TRADES = ['build', 'systems', 'interior', 'auto', 'care', 'venue'];

const T = {}; LANGS.forEach(l => { T[l.code] = require(`./i18n/${l.code}.cjs`); });
const EXTRA = require('./i18n/extra.cjs');                  // hero-only pitches: sv, fi, da, nl, fr, es
const W = require('./works.cjs');
const MAP = JSON.parse(fs.readFileSync(path.join(__dirname, 'map.json'), 'utf8'));

/* cache-busting: the file's own hash, so a returning visitor never mixes new HTML with an old stylesheet */
const ver = f => require('crypto').createHash('sha1').update(fs.readFileSync(path.join(ROOT, f))).digest('hex').slice(0, 8);
const V_CSS = ver('assets/css/style.css'), V_JS = ver('assets/js/main.js');

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fill = (s, o) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in o ? o[k] : m));
const em = s => esc(s).replace(/\*(.+?)\*/g, '<em>$1</em>');      // *accent* → <em>
const pick = (v, code) => (v && typeof v === 'object' ? (v[code] || v.en) : v);
const deep = (en, loc) => {                                     // missing keys fall back to English
  if (typeof en !== 'object' || en === null || Array.isArray(en)) return loc === undefined ? en : loc;
  const o = {}; Object.keys(en).forEach(k => { o[k] = deep(en[k], loc ? loc[k] : undefined); }); return o;
};

/* ---------- numbers shown on every page ---------- */
const PROJECTS = W.filter(w => w.kind !== 'lab');
const N = {
  sites: PROJECTS.length,
  clients: PROJECTS.filter(w => w.kind === 'live' || w.kind === 'client').length,
  live: PROJECTS.filter(w => w.kind === 'live').length,
  countries: new Set(PROJECTS.map(w => w.cc)).size,
  langs: 13
};

/* ---------- map: dot matrix + cities ---------- */
function proj(lon, lat) { return [((lon - MAP.lon0) * MAP.k * MAP.scale), ((MAP.lat1 - lat) * MAP.scale)]; }
const dots = pts => pts.map(p => `M${p[0]} ${p[1]}h0`).join('');
const LABEL_AT = { LV: [24.6, 57.0], LT: [23.6, 55.35], EE: [25.8, 58.75], PL: [19.2, 52.3], UA: [30.8, 48.9], AT: [14.4, 47.35], SE: [14.2, 58.4] };
function mapSvg(t) {
  const count = {}; PROJECTS.forEach(w => { count[w.cc] = (count[w.cc] || 0) + 1; });
  const cities = {}; PROJECTS.forEach(w => { const k = w.geo.join(','); (cities[k] = cities[k] || { geo: w.geo, names: [] }).names.push(w.city); });
  let s = `<svg viewBox="-4 -4 ${MAP.w + 8} ${MAP.h + 8}" aria-hidden="true" focusable="false">`;
  s += `<path class="land" d="${dots(MAP.land)}" stroke-width="2.3" stroke-linecap="round"/>`;
  COUNTRIES.forEach(cc => { if (MAP.hot[cc]) s += `<path class="cty" data-cc="${cc}" d="${dots(MAP.hot[cc])}" stroke-width="2.6" stroke-linecap="round"/>`; });
  Object.values(cities).forEach((c, i) => {
    const [x, y] = proj(c.geo[1], c.geo[0]);
    s += `<circle class="city-r" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.6" style="animation-delay:${(i * 0.37 % 3).toFixed(2)}s"/><circle class="city" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.6"><title>${esc([...new Set(c.names)].join(', '))}</title></circle>`;
  });
  COUNTRIES.forEach(cc => {
    const [x, y] = proj(LABEL_AT[cc][0], LABEL_AT[cc][1]);
    s += `<text class="lbl" x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle">${esc(t.countries[cc])} <tspan>${count[cc] || 0}</tspan></text>`;
  });
  return s + '</svg>';
}

/* ---------- pieces ---------- */
const shotD = (id, sizes, lazy = true, alt = '') => `<img src="${'{P}'}assets/shots/${id}-d-640.webp" srcset="${'{P}'}assets/shots/${id}-d-640.webp 640w, ${'{P}'}assets/shots/${id}-d.webp 1200w" sizes="${sizes}" width="640" height="400" alt="${esc(alt)}"${lazy ? ' loading="lazy"' : ''} decoding="async">`;
const shotM = (id, lazy = true, alt = '', cls = '') => `<img${cls ? ` class="${cls}"` : ''} src="${'{P}'}assets/shots/${id}-m.webp" width="600" height="1299" alt="${esc(alt)}"${lazy ? ' loading="lazy"' : ''} decoding="async">`;
const lockIcon = '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M3 4.5V3a2 2 0 1 1 4 0v1.5h.6c.3 0 .4.2.4.4v4.2c0 .3-.2.4-.4.4H2.4c-.3 0-.4-.2-.4-.4V4.9c0-.3.2-.4.4-.4H3Zm1-1.5v1.5h2V3a1 1 0 1 0-2 0Z"/></svg>';
const browser = (domain, img) => `<div class="browser"><div class="browser__bar"><i></i><i></i><i></i><span class="browser__url">${lockIcon}${esc(domain)}</span></div>${img}</div>`;

function orderFor(L) {
  const list = W.filter(w => w.kind === 'concept');
  if (!L.home) return list;
  return list.filter(w => w.cc === L.home).concat(list.filter(w => w.cc !== L.home));
}

function page(L) {
  const code = L.code, t = deep(T.en, T[code]), P = L.dir ? '../' : '';
  const url = SITE + L.dir;
  const c = cc => t.countries[cc];
  const loc = w => `${w.city}, ${c(w.cc)}`;
  const kindBadge = w => w.kind === 'live' ? `<b class="badge badge--live">${esc(t.work.badgeLive)}</b>` : w.kind === 'client' ? `<b class="badge badge--live">${esc(t.work.badgeClient)}</b>` : `<b class="badge">${esc(t.work.badgeConcept)}</b>`;

  /* hero wall: three columns, each list doubled so the drift loops */
  const wallIds = ['ventsistema', 'janbra', 'krio', 'grdarbi', 'kimela', 'romian', 'tulu', 'mebtex', 'impress', 'rores', 'iguzuolaidos', 'magicroof', 'eksortus', 'pastnieka', 'vytesa', 'fineremont', 'familydent', 'klava'];
  const cols = [0, 1, 2].map(ci => {
    const ids = wallIds.filter((_, i) => i % 3 === ci);
    const cards = ids.map((id, i) => (i === 2 ? `<div class="wall__card wall__card--m">${shotM(id, ci > 0 || i > 1)}</div>` : `<div class="wall__card">${shotD(id, '22vw', ci > 0 || i > 1)}</div>`)).join('');
    return `<div class="wall__col">${cards}${cards.replace(/ loading="lazy"/g, '').replace(/<img /g, '<img loading="lazy" ')}</div>`;
  }).join('');
  const stripIds = ['ventsistema', 'grdarbi', 'kimela', 'romian', 'tulu', 'krio', 'mebtex', 'eksortus', 'janbra', 'rores', 'familydent', 'impress'];
  const strip = stripIds.map(id => `<div class="phone">${shotM(id)}</div>`).join('');

  /* clients */
  const cases = W.filter(w => w.kind === 'live' || w.kind === 'client').map(w => `
      <article class="case" data-rv>
        <div class="case__stage">${browser(w.domain, shotD(w.id, '(max-width: 899px) 92vw, 560px', true, `${w.name} — ${t.work.altDesktop}`))}<div class="phone case__phone">${shotM(w.id, true, `${w.name} — ${t.work.altPhone}`)}</div></div>
        <div class="case__body">
          <div class="case__top"><h3 class="case__name">${esc(w.name)}</h3><span class="pill${w.kind === 'client' ? ' pill--soon' : ''}">${esc(w.kind === 'live' ? t.clients.live : t.clients.soon)}</span></div>
          <p class="case__meta">${esc(loc(w))} · ${esc(pick(w.craft, code))}</p>
          <p class="case__txt">${esc(pick(w.story, code))}</p>
          <div class="case__foot">
            ${w.kind === 'live' ? `<a class="btn btn--sm" href="${esc(w.url)}" target="_blank" rel="noopener">${esc(fill(t.clients.visit, { domain: w.domain }))}</a>` : `<a class="btn btn--sm" href="${esc(w.url)}" target="_blank" rel="noopener">${esc(t.clients.preview)}</a>`}
            ${w.concept ? `<a class="link" href="${esc(w.concept)}" target="_blank" rel="noopener">${esc(t.clients.concept)}</a>` : ''}
          </div>
        </div>
      </article>`).join('');

  /* work grid (all projects: clients first, then concepts in page order) */
  const workList = W.filter(w => w.kind === 'live' || w.kind === 'client').concat(orderFor(L));
  const cards = workList.map((w, i) => `
      <article class="card${i >= 12 ? ' is-extra' : ''}" data-id="${w.id}" data-cc="${w.cc}" data-trade="${w.trade}" data-kind="${w.kind}" data-rv>
        <span class="card__shots">
          ${shotD(w.id, '(max-width: 640px) 92vw, (max-width: 1100px) 46vw, 390px', true, `${w.name} — ${t.work.altDesktop}`).replace('<img ', '<img class="card__d" ')}
          ${shotM(w.id, true, '', 'card__m')}
          ${kindBadge(w)}
        </span>
        <span class="card__meta">
          <a class="card__a" href="${esc(w.url)}" target="_blank" rel="noopener"><span class="vh">${esc(w.name)}</span></a>
          <span class="card__t">${esc(w.name)} <span class="flag">${w.cc}</span></span>
          <span class="card__s">${esc(w.city)} · ${esc(pick(w.craft, code))}</span>
          <span class="card__tag">${esc(pick(w.tag, code))}</span>
        </span>
      </article>`).join('');
  const labs = W.filter(w => w.kind === 'lab');

  const count = k => PROJECTS.filter(w => (k.cc ? w.cc === k.cc : w.trade === k.trade)).length;
  const chipsCc = `<button class="chip" type="button" data-f="cc" data-v="" aria-pressed="true">${esc(t.work.all)} <small>${N.sites}</small></button>` +
    COUNTRIES.map(cc => `<button class="chip" type="button" data-f="cc" data-v="${cc}" aria-pressed="false">${esc(c(cc))} <small>${count({ cc })}</small></button>`).join('');
  const chipsTr = `<button class="chip" type="button" data-f="trade" data-v="" aria-pressed="true">${esc(t.work.all)}</button>` +
    TRADES.map(tr => `<button class="chip" type="button" data-f="trade" data-v="${tr}" aria-pressed="false">${esc(t.trades[tr])} <small>${count({ trade: tr })}</small></button>`).join('');

  /* before / after */
  const pairs = ['ripex', 'fineremont', 'tomi', 'mebtex', 'alarm3', 'mekian', 'ards', 'woodenlays'];
  const byId = Object.fromEntries(W.map(w => [w.id, w]));
  const ba = pairs.filter(id => byId[id]).map(id => { const w = byId[id]; return `
      <figure class="cmp" data-rv>
        <div class="cmp__frame">
          ${shotM(id, true, fill(t.ba.altNew, { name: w.name }), 'cmp__new')}
          ${shotM(`${id}-old`, true, fill(t.ba.altOld, { name: w.name }), 'cmp__old')}
          <span class="cmp__handle" aria-hidden="true"></span>
          <input class="cmp__range" type="range" min="0" max="100" value="78" aria-label="${esc(fill(t.ba.aria, { name: w.name }))}">
          <span class="cmp__lbl cmp__lbl--a">${esc(t.ba.before)}</span><span class="cmp__lbl cmp__lbl--b">${esc(t.ba.after)}</span>
        </div>
        <figcaption><b>${esc(w.name)}</b><span>${esc(loc(w))}</span></figcaption>
      </figure>`; }).join('');

  /* language links */
  const langLinks = cur => LANGS.map(l => `<a href="${P}${l.dir}" hreflang="${l.hl}" lang="${l.hl}"${l.code === cur ? ' aria-current="page"' : ''}>${esc(l.name)} <span>${l.short}</span></a>`);
  const heroLangs = LANGS.map(l => `<a href="${P}${l.dir}" hreflang="${l.hl}" lang="${l.hl}" title="${esc(l.name)}"${l.code === code ? ' aria-current="page"' : ''}>${l.short}</a>`).join('') +
    `<span class="langs__sep" aria-hidden="true"></span>` + Object.keys(EXTRA).map(k => `<button type="button" data-pitch="${k}" lang="${k}" title="${esc(EXTRA[k].name)}" aria-pressed="false">${k.toUpperCase()}</button>`).join('');

  const alternates = LANGS.map(l => `<link rel="alternate" hreflang="${l.hl}" href="${SITE}${l.dir}">`).join('\n') + `\n<link rel="alternate" hreflang="x-default" href="${SITE}">`;

  const runtime = {
    lang: code, dir: L.dir, mail: MAIL,
    s: t.rt, countries: t.countries, trades: t.trades,
    works: W.map(w => ({ id: w.id, name: w.name, url: w.url, domain: w.domain, city: w.city, cc: w.cc, trade: w.trade, kind: w.kind,
      craft: pick(w.craft, code), tag: pick(w.tag, code), langs: w.langs, frame: w.frame !== false && w.kind !== 'live' })),
    pitch: EXTRA, home: { eye: t.hero.eye, h1: t.hero.h1, sub: t.hero.sub, cta1: t.hero.cta1, cta2: fill(t.hero.cta2, { n: N.sites }) },
    suggest: Object.fromEntries(LANGS.filter(l => l.code !== code).map(l => [l.code, { dir: l.dir, text: T[l.code].rt.suggest, go: T[l.code].rt.suggestGo }]))
  };

  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Person', '@id': SITE + '#artur', name: 'Artur Vasilyan', jobTitle: 'Web designer & developer', email: 'mailto:' + MAIL, url: SITE,
        address: { '@type': 'PostalAddress', addressLocality: 'Kyiv', addressCountry: 'UA' },
        knowsLanguage: ['uk', 'ru', 'en', 'lv', 'lt', 'et', 'pl', 'de', 'sv', 'fi', 'da', 'nl', 'fr'] },
      { '@type': 'ProfessionalService', '@id': SITE + '#service', name: 'Artur Vasilyan — websites for small businesses', url, email: 'mailto:' + MAIL,
        founder: { '@id': SITE + '#artur' }, areaServed: ['LV', 'LT', 'EE', 'PL', 'UA', 'AT', 'SE', 'DE'].map(x => ({ '@type': 'Country', name: x })),
        priceRange: '€300', inLanguage: L.hl,
        makesOffer: { '@type': 'Offer', price: '300', priceCurrency: 'EUR', description: t.meta.offer } }
    ]
  };

  let html = `<!DOCTYPE html>
<html lang="${L.hl}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(t.meta.title)}</title>
<meta name="description" content="${esc(fill(t.meta.desc, N))}">
<meta name="theme-color" content="#f4f1ea" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#141412" media="(prefers-color-scheme: dark)">
<meta name="color-scheme" content="light dark">
<link rel="canonical" href="${url}">
${alternates}
<meta property="og:type" content="website">
<meta property="og:site_name" content="Artur Vasilyan">
<meta property="og:locale" content="${L.og}">
<meta property="og:title" content="${esc(t.meta.title)}">
<meta property="og:description" content="${esc(t.meta.og)}">
<meta property="og:image" content="${SITE}assets/og/${code}.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="${url}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${P}assets/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,500;1,600&family=Inter:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="${P}assets/css/style.css?v=${V_CSS}">
<script>(function(d){d.classList.add('js');try{var t=localStorage.getItem('theme');if(t)d.setAttribute('data-theme',t)}catch(e){}if(!matchMedia('(prefers-reduced-motion: reduce)').matches){d.classList.add('js-anim');setTimeout(function(){d.classList.remove('js-anim')},2500)}})(document.documentElement)</script>
<script type="application/ld+json">${JSON.stringify(ld)}</script>
</head>
<body>

<a class="skip" href="#work">${esc(t.nav.skip)}</a>

<header class="hdr" id="hdr">
  <a class="brand" href="${P}${L.dir}#top" aria-label="Artur Vasilyan — ${esc(t.nav.home)}">Artur Vasilyan<span class="brand__dot" aria-hidden="true"></span></a>
  <nav class="nav" aria-label="${esc(t.nav.label)}">
    <a href="#work">${esc(t.nav.work)}</a>
    <a href="#clients">${esc(t.nav.clients)}</a>
    <a href="#process">${esc(t.nav.process)}</a>
    <a href="#price">${esc(t.nav.price)}</a>
    <a href="#faq">${esc(t.nav.faq)}</a>
  </nav>
  <div class="hdr__act">
    <details class="lang" id="langMenu">
      <summary aria-label="${esc(t.nav.lang)}: ${esc(L.name)}"><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.2"/><path d="M1.8 8h12.4M8 1.8c1.8 1.9 2.6 4 2.6 6.2S9.8 12.3 8 14.2C6.2 12.3 5.4 10.2 5.4 8S6.2 3.7 8 1.8Z"/></svg>${L.short}</summary>
      <ul>${langLinks(code).map(a => `<li>${a}</li>`).join('')}</ul>
    </details>
    <button class="icon-btn theme" id="themeBtn" type="button" aria-label="${esc(t.nav.theme)}" aria-pressed="false" title="${esc(t.nav.theme)}">
      <svg class="theme__sun" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/></svg>
      <svg class="theme__moon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"/></svg>
    </button>
    <a class="btn btn--sm" href="#start">${esc(t.nav.cta)}</a>
  </div>
</header>

<main id="top">

<!-- ===== HERO ===== -->
<section class="hero" aria-labelledby="h1">
  <div class="hero__copy">
    <div class="hi" id="hi" hidden></div>
    <p class="eyebrow" id="eye">${esc(t.hero.eye)}</p>
    <h1 class="hero__h" id="h1">${em(t.hero.h1)}</h1>
    <p class="hero__sub" id="pitch">${t.hero.sub}</p>
    <div class="langs" id="langs" aria-label="${esc(t.hero.readIn)}"><span class="langs__l">${esc(t.hero.readIn)}</span>${heroLangs}</div>
    <div class="hero__cta">
      <a class="btn btn--acc" id="cta1" href="#start">${esc(t.hero.cta1)}</a>
      <a class="link" id="cta2" href="#work">${esc(fill(t.hero.cta2, { n: N.sites }))}</a>
    </div>
    <ul class="facts" aria-label="${esc(t.hero.factsLabel)}">
      <li><b data-count="${N.sites}">${N.sites}</b><span>${esc(t.hero.fSites)}</span></li>
      <li><b data-count="${N.clients}">${N.clients}</b><span>${esc(t.hero.fClients)}</span></li>
      <li><b data-count="${N.countries}">${N.countries}</b><span>${esc(t.hero.fCountries)}</span></li>
      <li><b>300&nbsp;€</b><span>${esc(t.hero.fPrice)}</span></li>
    </ul>
    <div class="strip" aria-hidden="true"><div class="strip__track">${strip}${strip.replace(/<img /g, '<img aria-hidden="true" ')}</div></div>
  </div>
  <div class="wall" id="wall" aria-hidden="true"><div class="wall__plane" id="wallPlane">${cols}</div></div>
</section>

<!-- ===== OFFER IN ONE LINE ===== -->
<section class="offer" aria-label="${esc(t.offer.label)}">
  <div class="wrap offer__in">
    <p><b class="n">1</b><span>${t.offer.s1}</span></p>
    <p><b class="n">2</b><span>${t.offer.s2}</span></p>
    <p><b class="n">3</b><span>${t.offer.s3}</span></p>
  </div>
</section>

<!-- ===== CLIENTS ===== -->
<section class="clients sec" id="clients">
  <div class="wrap">
    <div class="sec__head sec__head--row">
      <div><p class="eyebrow">${esc(t.clients.eye)}</p><h2>${em(t.clients.h2)}</h2></div>
      <p class="lead">${esc(t.clients.lead)}</p>
    </div>
    <div class="cases">${cases}
    </div>
  </div>
</section>

<!-- ===== WORK ===== -->
<section class="work sec" id="work">
  <div class="wrap">
    <div class="work__head">
      <div>
        <p class="eyebrow">${esc(t.work.eye)}</p>
        <h2>${em(fill(t.work.h2, N))}</h2>
        <p class="lead">${esc(t.work.lead)}</p>
        <div class="filters" id="filters">
          <div class="chips" role="group" aria-label="${esc(t.work.byCountry)}"><span class="chips__l">${esc(t.work.byCountry)}</span>${chipsCc}</div>
          <div class="chips" role="group" aria-label="${esc(t.work.byTrade)}"><span class="chips__l">${esc(t.work.byTrade)}</span>${chipsTr}</div>
        </div>
      </div>
      <div class="map" id="map">${mapSvg(t)}<p class="map__cap">${esc(t.work.mapCap)}</p></div>
    </div>
    <div class="grid is-collapsed" id="grid">${cards}
      <p class="empty" id="empty" hidden>${esc(t.work.empty)}</p>
    </div>
    <div class="more" id="more"><button class="btn btn--ghost" type="button" id="moreBtn">${esc(fill(t.work.more, { n: workList.length }))}</button></div>
    ${labs.length ? `<div class="labs"><h3 class="labs__h">${esc(t.work.labs)}</h3><div class="labs__grid">${labs.map(w => `<a class="lab" href="${esc(w.url)}" target="_blank" rel="noopener" data-rv>${shotD(w.id, '(max-width: 640px) 40vw, 180px')}<span><b>${esc(w.name)} ↗</b><small>${esc(pick(w.tag, code))}</small></span></a>`).join('')}</div></div>` : ''}
  </div>
</section>

<!-- ===== BEFORE / AFTER ===== -->
<section class="ba sec" id="before">
  <div class="wrap">
    <div class="sec__head sec__head--row">
      <div><p class="eyebrow">${esc(t.ba.eye)}</p><h2>${em(t.ba.h2)}</h2></div>
      <p class="lead">${esc(t.ba.lead)}</p>
    </div>
    <div class="ba__grid" id="ba">${ba}
    </div>
  </div>
</section>

<!-- ===== PROCESS ===== -->
<section class="proc sec" id="process">
  <div class="wrap">
    <div class="sec__head sec__head--row">
      <div><p class="eyebrow">${esc(t.proc.eye)}</p><h2>${em(t.proc.h2)}</h2></div>
      <p class="lead">${esc(t.proc.lead)}</p>
    </div>
    <ol class="steps" id="steps">
${t.proc.steps.map((s, i) => `      <li data-rv><span>0${i + 1}</span><h3>${esc(s[0])}</h3><p>${esc(s[1])}</p><em>${esc(s[2])}</em></li>`).join('\n')}
    </ol>
  </div>
</section>

<!-- ===== PRICE ===== -->
<section class="price sec" id="price">
  <div class="wrap price__grid">
    <div>
      <p class="eyebrow">${esc(t.price.eye)}</p>
      <h2>${em(t.price.h2)}</h2>
      <p class="lead">${t.price.lead}</p>
      <ul class="incl">${t.price.incl.map(s => `<li>${esc(s)}</li>`).join('')}</ul>
      <div class="hero__cta"><a class="btn btn--acc" href="#start">${esc(t.price.cta)}</a></div>
    </div>
    <div class="receipt" data-rv>
      <div class="receipt__h"><span>vasylian.com</span><span>${esc(t.price.rcptTitle)}</span></div>
      <ul>
${t.price.rows.map(r => `        <li${r[1] === '0 €' ? ' class="z"' : ''}><span>${esc(r[0])}</span><i></i><b>${esc(r[1]).replace(' ', '&nbsp;')}</b></li>`).join('\n')}
      </ul>
      <div class="receipt__tot"><span>${esc(t.price.total)}</span><b>300&nbsp;€</b></div>
      <p class="receipt__note">${esc(t.price.note)}</p>
      <span class="receipt__stamp" aria-hidden="true">${esc(t.price.stamp)}</span>
    </div>
  </div>
</section>

<!-- ===== FAQ ===== -->
<section class="faq sec" id="faq">
  <div class="wrap">
    <div class="sec__head"><p class="eyebrow">${esc(t.faq.eye)}</p><h2>${em(t.faq.h2)}</h2></div>
    <div class="faq__list">
${t.faq.items.map((q, i) => `      <details data-rv${i === 0 ? ' open' : ''}><summary>${esc(q[0])}</summary><p>${esc(q[1])}</p></details>`).join('\n')}
    </div>
  </div>
</section>

<!-- ===== ABOUT ===== -->
<section class="about sec" id="about">
  <div class="wrap about__grid">
    <div>
      <p class="eyebrow">${esc(t.about.eye)}</p>
      <h2>Artur Vasilyan.</h2>
      <p class="lead">${esc(t.about.lead)}</p>
      <p class="lead">${esc(t.about.lead2)}</p>
      <div class="hello" aria-label="${esc(t.about.helloLabel)}">${['Labdien', 'Laba diena', 'Tere', 'Dzień dobry', 'Guten Tag', 'Hej', 'Hyvää päivää', 'Goddag', 'Goedendag', 'Bonjour', 'Hello', 'Добрий день', 'Добрый день'].map(h => `<span>${h}</span>`).join('')}</div>
    </div>
    <div class="about__facts">
      <div data-rv><b>${N.sites}</b><span>${esc(t.about.f1)}</span></div>
      <div data-rv><b>${N.langs}</b><span>${esc(t.about.f2)}</span></div>
      <div data-rv><b>1–2</b><span>${esc(t.about.f3)}</span></div>
      <div data-rv><b>0&nbsp;€</b><span>${esc(t.about.f4)}</span></div>
    </div>
  </div>
</section>

<!-- ===== START ===== -->
<section class="start sec" id="start">
  <div class="wrap start__grid">
    <div>
      <p class="eyebrow">${esc(t.start.eye)}</p>
      <h2>${em(t.start.h2)}</h2>
      <p class="lead">${esc(t.start.lead)}</p>
      <div class="contact">
        <a class="contact__mail" href="mailto:${MAIL}?subject=${encodeURIComponent(t.start.subjectPlain)}">${MAIL}</a>
        <div class="contact__row">
          <button class="btn btn--sm" type="button" id="copyMail">${esc(t.start.copy)}</button>
          <span class="contact__note" id="copyNote">${esc(t.start.answer)}</span>
        </div>
        <div class="contact__foot">
          <p class="clock" id="clock" aria-live="off"></p>
          <div class="qr"><div class="qr__box" id="qr" role="img" aria-label="${esc(t.start.qrAria)}"></div><span>${esc(t.start.qr)}</span></div>
        </div>
      </div>
    </div>
    <form class="form" id="form" action="mailto:${MAIL}" method="get" enctype="text/plain">
      <label class="full">${esc(t.start.fBiz)}<input name="biz" autocomplete="organization" required placeholder="${esc(t.start.pBiz)}"></label>
      <label>${esc(t.start.fLink)}<input name="link" inputmode="url" placeholder="${esc(t.start.pLink)}"></label>
      <label>${esc(t.start.fCity)}<input name="city" autocomplete="address-level2" placeholder="${esc(t.start.pCity)}"></label>
      <label class="full">${esc(t.start.fNote)}<textarea name="note" rows="3" placeholder="${esc(t.start.pNote)}"></textarea></label>
      <div class="form__act"><button class="btn btn--acc" type="submit">${esc(t.start.send)}</button><p>${esc(t.start.sendNote)}</p></div>
    </form>
  </div>
</section>

</main>

<dialog class="sheet" id="sheet" aria-labelledby="sheetTitle">
  <div class="sheet__bar">
    <span class="sheet__count" id="sheetCount"></span>
    <button class="icon-btn" type="button" id="sheetPrev" aria-label="${esc(t.rt.prev)}">←</button>
    <button class="icon-btn" type="button" id="sheetNext" aria-label="${esc(t.rt.next)}">→</button>
    <button class="icon-btn" type="button" id="sheetClose" aria-label="${esc(t.rt.close)}">×</button>
  </div>
  <div class="sheet__body">
    <div class="sheet__stage"><div class="browser"><div class="browser__bar"><i></i><i></i><i></i><span class="browser__url">${lockIcon}<span id="sheetDomain"></span></span></div><img id="sheetD" alt="" width="1200" height="750"></div><div class="phone sheet__phone"><img id="sheetM" alt="" width="600" height="1299"></div></div>
    <div class="sheet__info">
      <p class="eyebrow" id="sheetKind"></p>
      <h3 id="sheetTitle"></h3>
      <p class="sheet__idea" id="sheetIdea"></p>
      <dl class="sheet__dl">
        <dt>${esc(t.rt.where)}</dt><dd id="sheetWhere"></dd>
        <dt>${esc(t.rt.trade)}</dt><dd id="sheetTrade"></dd>
        <dt>${esc(t.rt.language)}</dt><dd id="sheetLang"></dd>
      </dl>
      <div class="sheet__act">
        <a class="btn" id="sheetOpen" href="#" target="_blank" rel="noopener">${esc(t.rt.open)}</a>
        <button class="btn btn--ghost" type="button" id="sheetTry">${esc(t.rt.tryPhone)}</button>
      </div>
      <p class="sheet__note" id="sheetNote"></p>
    </div>
  </div>
  <div class="sheet__live">
    <div class="phone"><div class="phone__screen"><iframe id="sheetFrame" title="${esc(t.rt.frameTitle)}" referrerpolicy="no-referrer" loading="lazy"></iframe></div></div>
    <p>${esc(t.rt.frameHint)}</p>
    <button class="btn btn--ghost btn--sm" type="button" id="sheetBack">${esc(t.rt.back)}</button>
  </div>
</dialog>

<div class="toast" id="toast" hidden></div>

<nav class="bar" id="bar" aria-label="${esc(t.bar.label)}">
  <a href="#price">${esc(t.bar.price)}</a>
  <a class="btn" href="#start">${esc(t.bar.cta)}</a>
</nav>

<footer class="ftr">
  <div class="greet" aria-hidden="true"><div class="greet__track">${(() => { const g = ['Labdien', 'Laba diena', 'Tere', 'Dzień dobry', 'Guten Tag', 'Hello', 'Добрий день', 'Hej', 'Bonjour', 'Goedendag']; const s = g.map(x => `<span>${x}</span>`).join(''); return s + s; })()}</div></div>
  <div class="wrap ftr__in">
    <span>© 2026 Artur Vasilyan · ${esc(t.foot.city)}</span>
    <nav class="ftr__langs" aria-label="${esc(t.nav.lang)}">${langLinks(code).join('')}</nav>
    <p>${esc(t.foot.note)}</p>
  </div>
</footer>

<script id="data" type="application/json">${JSON.stringify(runtime).replace(/</g, '\\u003c')}</script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js" integrity="sha384-g4NTh/Iv5PPU4xPyhEWqPcwtNXOvdaDI8LLnyYfyNZOjKJeYQyjzQ9X5275eBjpt" crossorigin="anonymous" defer></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js" integrity="sha384-Z3REaz79l2IaAZqJsSABtTbhjgOUYyV3p90XNnAPCSHg3EMTz1fouunq9WZRtj3d" crossorigin="anonymous" defer></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js" integrity="sha384-3zSEDfvllQohrq0PHL1fOXJuC/jSOO34H46t6UQfobFOmxE5BpjjaIJY5F2/bMnU" crossorigin="anonymous" defer></script>
<script src="${P}assets/js/main.js?v=${V_JS}" defer></script>
</body>
</html>
`;
  return html.replace(/\{P\}/g, P);
}

/* ---------- write ---------- */
LANGS.forEach(L => {
  const dir = path.join(ROOT, L.dir);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), page(L));
  console.log('wrote', (L.dir || '') + 'index.html');
});
const today = new Date().toISOString().slice(0, 10);
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${LANGS.map(L => `  <url><loc>${SITE}${L.dir}</loc><lastmod>${today}</lastmod>
${LANGS.map(A => `    <xhtml:link rel="alternate" hreflang="${A.hl}" href="${SITE}${A.dir}"/>`).join('\n')}
  </url>`).join('\n')}
</urlset>
`);
fs.writeFileSync(path.join(ROOT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE}sitemap.xml\n`);
fs.writeFileSync(path.join(ROOT, '404.html'), `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Not found — Artur Vasilyan</title><meta name="robots" content="noindex"><link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f4f1ea;color:#141412;font:17px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;padding:24px;text-align:center}h1{font:600 clamp(2rem,6vw,3.5rem)/1.05 Georgia,serif;letter-spacing:-.02em;margin:0 0 .6rem}a{display:inline-block;margin-top:1.2rem;padding:.8rem 1.4rem;border-radius:999px;background:#141412;color:#f4f1ea;text-decoration:none;font-weight:600}@media (prefers-color-scheme:dark){body{background:#141412;color:#f4f1ea}a{background:#ff5a14;color:#141412}}</style></head><body><main><h1>This page is not here.</h1><p>The portfolio and all ${N.sites} sites are one click away.</p><a href="/">vasylian.com</a></main></body></html>\n`);
console.log('numbers', N);
