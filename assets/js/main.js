/* Portfolio — Artur Vasilyan. One script for every language page; the page's strings and project list
   come from <script id="data">. Everything degrades: without JS the cards are links and the sliders are inputs,
   without GSAP nothing is hidden and nothing animates. */
(function () {
  'use strict';
  var doc = document.documentElement;
  var D = {}; try { D = JSON.parse(document.getElementById('data').textContent); } catch (e) {}
  var S = D.s || {}, WORKS = D.works || [], P = D.dir ? '../' : '';
  var byId = {}; WORKS.forEach(function (w) { byId[w.id] = w; });
  var rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fill = function (s, o) { return String(s || '').replace(/\{(\w+)\}/g, function (m, k) { return k in o ? o[k] : m; }); };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  var params = new URLSearchParams(location.search);
  var hasGsap = function () { return typeof window.gsap !== 'undefined' && !rm; };

  /* ---------- header: solid after scroll, current section underlined ---------- */
  var hdr = $('#hdr'), bar = $('#bar');
  var onScroll = function () { hdr.classList.toggle('is-scrolled', window.scrollY > 20); };
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  if ('IntersectionObserver' in window) {
    var navLinks = $$('.nav a');
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        navLinks.forEach(function (a) { a.classList.toggle('is-on', a.getAttribute('href') === '#' + e.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['clients', 'work', 'before', 'process', 'price', 'faq', 'about', 'start'].forEach(function (id) { var s = document.getElementById(id); if (s) io.observe(s); });
    var start = $('#start');
    if (bar && start) new IntersectionObserver(function (es) { bar.classList.toggle('is-hidden', es[0].isIntersecting); }, { threshold: 0.15 }).observe(start);
  }

  /* ---------- theme: follows the system until chosen ---------- */
  var themeBtn = $('#themeBtn');
  if (themeBtn) {
    var sysDark = window.matchMedia('(prefers-color-scheme: dark)');
    var cur = function () { return doc.getAttribute('data-theme') || (sysDark.matches ? 'dark' : 'light'); };
    var sync = function () { themeBtn.setAttribute('aria-pressed', cur() === 'dark' ? 'true' : 'false'); };
    themeBtn.addEventListener('click', function () {
      var next = cur() === 'dark' ? 'light' : 'dark';
      doc.setAttribute('data-theme', next); store.set('theme', next); sync();
    });
    sync();
  }

  /* ---------- language menu: closes on outside click / Esc, remembers the choice ---------- */
  var langMenu = $('#langMenu');
  if (langMenu) {
    document.addEventListener('click', function (e) { if (langMenu.open && !langMenu.contains(e.target)) langMenu.open = false; });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') langMenu.open = false; });
  }
  $$('a[hreflang]').forEach(function (a) {
    a.addEventListener('click', function () { store.set('lang', a.getAttribute('hreflang')); });
    if (location.search) a.href = a.getAttribute('href') + location.search;          // keep ?c=… when switching language
  });

  /* ---------- first screen in a language without its own page (sv, fi, da, nl, fr, es) ---------- */
  var PITCH = D.pitch || {}, HOME = D.home || {};
  var nSites = WORKS.filter(function (w) { return w.kind !== 'lab'; }).length;
  var applyHero = function (d, code) {
    $('#eye').textContent = d.eye;
    var h = $('#h1'); h.innerHTML = esc(d.h1).replace(/\*(.+?)\*/g, '<em>$1</em>'); h.setAttribute('lang', code);
    var p = $('#pitch'); p.innerHTML = d.sub; p.setAttribute('lang', code);
    $('#cta1').textContent = d.cta1; $('#cta2').textContent = fill(d.cta2, { n: nSites });
    splitWords(h);
  };
  $$('#langs button[data-pitch]').forEach(function (b) {
    b.addEventListener('click', function () {
      var k = b.dataset.pitch, on = b.getAttribute('aria-pressed') !== 'true';
      $$('#langs button[data-pitch]').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
      var swap = function () { if (on) { applyHero(PITCH[k], k); b.setAttribute('aria-pressed', 'true'); } else applyHero(HOME, D.lang); };
      if (hasGsap()) gsap.to('.hero__copy > :not(.langs):not(.hi)', { opacity: 0, y: 6, duration: .16, onComplete: function () { swap(); gsap.to('.hero__copy > :not(.langs):not(.hi)', { opacity: 1, y: 0, duration: .45, ease: 'expo.out' }); gsap.from('.hero__h .w', { yPercent: 40, opacity: 0, duration: .6, stagger: .03, ease: 'expo.out' }); } });
      else swap();
    });
  });

  /* ---------- "this page is also in …" (once, never on top of a choice already made) ---------- */
  var toast = $('#toast');
  (function suggest() {
    if (!toast || D.lang !== 'en' || store.get('lang') || store.get('langHint')) return;   // language pages are reached on purpose
    var SUG = D.suggest || {}, wanted = (navigator.languages || [navigator.language || '']).map(function (l) { return String(l).slice(0, 2).toLowerCase(); });
    var code = null;
    for (var i = 0; i < wanted.length; i++) { if (wanted[i] === D.lang) return; if (SUG[wanted[i]]) { code = wanted[i]; break; } }
    if (!code) return;
    var s = SUG[code];
    toast.innerHTML = '<span lang="' + code + '">' + esc(s.text) + '</span><a href="' + P + s.dir + location.search + '" hreflang="' + code + '" lang="' + code + '">' + esc(s.go) + ' →</a><button type="button" aria-label="×">×</button>';
    toast.hidden = false;
    toast.querySelector('a').addEventListener('click', function () { store.set('lang', code); });
    toast.querySelector('button').addEventListener('click', function () { toast.hidden = true; store.set('langHint', '1'); });
  })();

  /* ---------- personal link: ?c=<project> greets the owner and pins their concept ---------- */
  var grid = $('#grid'), you = byId[params.get('c') || params.get('for') || ''];
  if (you && you.kind !== 'lab') {
    var hi = $('#hi');
    hi.innerHTML = '<img src="' + P + 'assets/shots/' + you.id + '-d-640.webp" alt="" width="84" height="56">' +
      '<p><b>' + esc(fill(S.hiTitle, { name: you.name })) + '</b>' + esc(S.hiText) + '<br><a class="link" href="' + esc(you.url) + '" target="_blank" rel="noopener">' + esc(S.hiOpen) + '</a></p>';
    hi.hidden = false;
    var yc = grid && grid.querySelector('.card[data-id="' + you.id + '"]');
    if (yc) {
      yc.classList.add('is-you'); yc.classList.remove('is-extra');
      yc.querySelector('.card__shots').insertAdjacentHTML('beforeend', '<b class="badge badge--you">' + esc(S.you) + '</b>');
      grid.insertBefore(yc, grid.firstChild);
    }
  }

  /* ---------- work: filters (chips + map), "show all" ---------- */
  var cards = grid ? $$('.card', grid) : [];
  var state = { cc: (params.get('cc') || '').toUpperCase(), trade: params.get('t') || '' };
  var expanded = false, moreWrap = $('#more'), moreBtn = $('#moreBtn'), empty = $('#empty'), map = $('#map');
  var visible = function () { return cards.filter(function (c) { return !c.hidden && !(grid.classList.contains('is-collapsed') && c.classList.contains('is-extra')); }); };
  function applyFilter(animate) {
    var shown = 0;
    cards.forEach(function (c) {
      var ok = (!state.cc || c.dataset.cc === state.cc) && (!state.trade || c.dataset.trade === state.trade);
      c.hidden = !ok; if (ok) shown++;
    });
    var filtering = !!(state.cc || state.trade);
    grid.classList.toggle('is-collapsed', !filtering && !expanded);
    if (moreWrap) moreWrap.hidden = filtering || expanded;
    if (empty) empty.hidden = shown > 0;
    $$('.chip[data-f]').forEach(function (b) {
      b.setAttribute('aria-pressed', String((state[b.dataset.f] || '') === b.dataset.v));
      var other = b.dataset.f === 'cc' ? 'trade' : 'cc', n = 0;                  // counts follow the other filter
      cards.forEach(function (c) { if ((!state[other] || c.dataset[other] === state[other]) && (!b.dataset.v || c.dataset[b.dataset.f] === b.dataset.v)) n++; });
      var sm = b.querySelector('small'); if (sm) sm.textContent = n;
      b.disabled = n === 0 && !!b.dataset.v;
    });
    if (map) {
      map.classList.toggle('has-sel', !!state.cc);
      $$('.cty', map).forEach(function (p) { p.classList.toggle('is-on', p.dataset.cc === state.cc); });
    }
    var q = new URLSearchParams(location.search);
    state.cc ? q.set('cc', state.cc) : q.delete('cc'); state.trade ? q.set('t', state.trade) : q.delete('t');
    var qs = q.toString(); history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
    if (animate && hasGsap()) gsap.fromTo(visible(), { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: .55, stagger: .035, ease: 'expo.out', overwrite: true });
    if (animate && window.ScrollTrigger) ScrollTrigger.refresh();
  }
  if (grid) {
    $$('.chip[data-f]').forEach(function (b) {
      b.addEventListener('click', function () { var f = b.dataset.f; state[f] = state[f] === b.dataset.v ? '' : b.dataset.v; applyFilter(true); });
    });
    if (map) $$('.cty', map).forEach(function (p) {
      p.addEventListener('click', function () { state.cc = state.cc === p.dataset.cc ? '' : p.dataset.cc; applyFilter(true); grid.scrollIntoView({ behavior: rm ? 'auto' : 'smooth', block: 'start' }); });
    });
    if (moreBtn) moreBtn.addEventListener('click', function () {
      var before = visible().length; expanded = true; applyFilter(false);
      var fresh = visible().slice(before);
      if (hasGsap()) gsap.fromTo(fresh, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: .7, stagger: .04, ease: 'expo.out' });
      if (fresh[0]) { var a = fresh[0].querySelector('.card__a'); if (a) a.focus({ preventScroll: true }); }
    });
    applyFilter(false);
  }

  /* ---------- project sheet: screenshots, facts, the real page inside a phone ---------- */
  var sheet = $('#sheet'), list = [], idx = 0;
  var names = (function () { try { return new Intl.DisplayNames([D.lang], { type: 'language' }); } catch (e) { return null; } })();
  var langName = function (c) { var n = names ? names.of(c) : c; return n ? n.charAt(0).toUpperCase() + n.slice(1) : c; };
  function fillSheet(w) {
    var kind = { live: S.kindLive, client: S.kindClient, concept: S.kindConcept, lab: S.kindLab }[w.kind];
    $('#sheetKind').textContent = kind;
    $('#sheetTitle').textContent = w.name;
    $('#sheetIdea').textContent = w.tag || '';
    $('#sheetWhere').textContent = (w.city ? w.city + ', ' : '') + ((D.countries || {})[w.cc] || w.cc);
    $('#sheetTrade').textContent = w.craft || '';
    $('#sheetLang').textContent = (w.langs || []).map(langName).join(', ');
    $('#sheetDomain').textContent = w.domain;
    var d = $('#sheetD'), m = $('#sheetM');
    d.src = P + 'assets/shots/' + w.id + '-d.webp'; d.alt = w.name;
    m.src = P + 'assets/shots/' + w.id + '-m.webp'; m.alt = '';
    $('#sheetOpen').href = w.url;
    $('#sheetTry').hidden = !w.frame;
    $('#sheetNote').textContent = { live: S.noteLive, client: S.noteClient, concept: S.noteConcept, lab: '' }[w.kind] || '';
    $('#sheetCount').textContent = list.length > 1 ? fill(S.count, { i: idx + 1, n: list.length }) : '';
    $('#sheetPrev').hidden = $('#sheetNext').hidden = list.length < 2;
    var body = $('.sheet__body', sheet);
    if (hasGsap()) gsap.fromTo(body.children, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .45, stagger: .06, ease: 'expo.out' });
  }
  function live(on) {
    var f = $('#sheetFrame');
    sheet.classList.toggle('is-live', on);
    if (on) {
      var w = list[idx]; f.src = w.url;
      var fit = function () { var box = f.parentNode.getBoundingClientRect(); f.style.setProperty('--s', (box.width / 390).toFixed(4)); };
      fit(); requestAnimationFrame(fit);
    } else f.src = 'about:blank';
  }
  function go(step) { if (!list.length) return; live(false); idx = (idx + step + list.length) % list.length; fillSheet(list[idx]); }
  if (sheet && typeof sheet.showModal === 'function') {
    var openSheet = function (id) {
      list = cards.filter(function (c) { return !c.hidden; }).map(function (c) { return byId[c.dataset.id]; }).filter(Boolean);   // every match, collapsed or not
      idx = Math.max(0, list.findIndex(function (w) { return w.id === id; }));
      if (!list.length) list = [byId[id]];
      fillSheet(list[idx]); sheet.showModal(); document.body.style.overflow = 'hidden';
    };
    cards.forEach(function (c) {
      var a = c.querySelector('.card__a');
      a.addEventListener('click', function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;      // new-tab clicks keep working
        e.preventDefault(); openSheet(c.dataset.id);
      });
    });
    sheet.addEventListener('close', function () { live(false); document.body.style.overflow = ''; });
    sheet.addEventListener('click', function (e) { if (e.target === sheet) sheet.close(); });
    sheet.addEventListener('keydown', function (e) {
      if (e.target.closest && e.target.closest('iframe')) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    });
    $('#sheetClose').addEventListener('click', function () { sheet.close(); });
    $('#sheetPrev').addEventListener('click', function () { go(-1); });
    $('#sheetNext').addEventListener('click', function () { go(1); });
    $('#sheetTry').addEventListener('click', function () { live(true); });
    $('#sheetBack').addEventListener('click', function () { live(false); });
    window.addEventListener('resize', function () { if (sheet.classList.contains('is-live')) { var f = $('#sheetFrame'); f.style.setProperty('--s', (f.parentNode.getBoundingClientRect().width / 390).toFixed(4)); } });
  }

  /* ---------- before / after ---------- */
  var DEFAULT_P = 78;
  $$('.cmp').forEach(function (f) {
    var frame = $('.cmp__frame', f), range = $('.cmp__range', f);
    range.addEventListener('input', function () { frame.style.setProperty('--p', range.value + '%'); f.dataset.touched = '1'; });
    $('.cmp__old', f).addEventListener('error', function () { f.remove(); });
  });

  /* ---------- contact: copy, compose, clock, QR ---------- */
  var MAIL = D.mail || '';
  var copy = $('#copyMail'), note = $('#copyNote');
  if (copy) copy.addEventListener('click', function () {
    var done = function () { note.textContent = fill(S.copied, { mail: MAIL }); setTimeout(function () { note.textContent = S.answer; }, 2600); };
    if (navigator.clipboard) navigator.clipboard.writeText(MAIL).then(done, done); else done();
  });
  var form = $('#form');
  if (form) form.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = function (n) { return (form.elements[n].value || '').trim(); };
    var biz = v('biz'), body = [S.mailHello, '', S.mailAsk, '', S.mailBiz + ': ' + biz];
    if (v('link')) body.push(S.mailLink + ': ' + v('link'));
    if (v('city')) body.push(S.mailCity + ': ' + v('city'));
    if (v('note')) body.push('', v('note'));
    location.href = 'mailto:' + MAIL + '?subject=' + encodeURIComponent(fill(S.mailSubject, { biz: biz })) + '&body=' + encodeURIComponent(body.join('\n'));
  });
  var clock = $('#clock');
  if (clock) {
    var fmt; try { fmt = new Intl.DateTimeFormat(D.lang === 'en' ? 'en-GB' : D.lang, { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Kyiv', hourCycle: 'h23' }); } catch (e) { fmt = null; }
    var tick = function () {
      if (!fmt) return;
      var parts = fmt.formatToParts(new Date()), h = +(parts.find(function (p) { return p.type === 'hour'; }) || { value: 12 }).value;
      var on = h >= 9 && h < 21;
      clock.textContent = fill(on ? S.clockOn : S.clockOff, { t: fmt.format(new Date()) });
      clock.style.setProperty('--c', on ? '#6fe0a0' : '#ffae80');
    };
    tick(); setInterval(tick, 30000);
  }
  var qrReady = function () {
    var qr = $('#qr'); if (!qr) return;
    if (typeof QRCode === 'undefined') { qr.parentNode.remove(); return; }
    var canon = ($('link[rel=canonical]') || {}).href || location.href;
    try { new QRCode(qr, { text: canon, width: 176, height: 176, colorDark: '#141412', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M }); } catch (e) { qr.parentNode.remove(); }
  };

  /* ---------- hero headline split into words (for the entrance) ---------- */
  function splitWords(el) {
    var walk = function (node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(part));
            else { var s = document.createElement('span'); s.className = 'w'; s.textContent = part; frag.appendChild(s); }
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(el);
  }

  /* ---------- motion (GSAP is deferred; everything above works without it) ---------- */
  function motion() {
    qrReady();
    if (!hasGsap()) { doc.classList.add('rm'); doc.classList.remove('js-anim'); return; }
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });
    var mobile = window.matchMedia('(max-width: 899px)').matches;

    /* hero */
    splitWords($('#h1'));
    var intro = gsap.timeline({ defaults: { ease: 'expo.out' } });
    intro.from('#eye', { y: 10, opacity: 0, duration: .7 }, 0.05)
         .from('.hero__h .w', { yPercent: 55, opacity: 0, duration: 1, stagger: .045 }, 0.1)
         .from('#pitch, .langs, .hero__cta', { y: 16, opacity: 0, duration: .9, stagger: .08 }, 0.45)
         .from('.facts li', { y: 12, opacity: 0, duration: .7, stagger: .06 }, 0.7)
         .from('.strip', { opacity: 0, y: 30, duration: 1.2 }, 0.6);
    if ($('#hi') && !$('#hi').hidden) intro.from('#hi', { y: -10, opacity: 0, duration: .8 }, 0);
    doc.classList.remove('js-anim');                                   // the tweens above now hold the start state
    $$('.facts b[data-count]').forEach(function (b) {
      var o = { v: 0 }, n = +b.dataset.count;
      gsap.to(o, { v: n, duration: 1.6, ease: 'power3.out', delay: .8, onUpdate: function () { b.textContent = Math.round(o.v); } });
    });

    /* wall: 3D plane, follows the pointer a little */
    var plane = $('#wallPlane');
    if (plane && !mobile) {
      gsap.set(plane, { rotationX: 52, rotationZ: -14, transformPerspective: 1500 });
      intro.from(plane, { y: 140, opacity: 0, duration: 1.8 }, 0.15);
      var mx = 0, my = 0, raf = 0;
      var tilt = function () { raf = 0; gsap.to(plane, { rotationZ: -14 + mx * 6, rotationX: 52 - my * 8, duration: 1.2, ease: 'power3.out', overwrite: 'auto' }); };
      window.addEventListener('pointermove', function (e) {
        if (e.pointerType === 'touch') return;
        mx = e.clientX / window.innerWidth - .5; my = e.clientY / window.innerHeight - .5;
        if (!raf) raf = requestAnimationFrame(tilt);
      }, { passive: true });
      gsap.to(plane, { y: -160, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: .6 } });
      ScrollTrigger.create({ trigger: '.hero', start: 'top top', end: 'bottom top', onLeave: function () { $$('.wall__col').forEach(function (c) { c.style.animationPlayState = 'paused'; }); }, onEnterBack: function () { $$('.wall__col').forEach(function (c) { c.style.animationPlayState = ''; }); } });
    }

    /* section heads */
    $$('.sec__head, .work__head > div:first-child').forEach(function (el) {
      gsap.from(el.querySelectorAll('.eyebrow, h2, .lead'), { y: 24, opacity: 0, duration: 1, stagger: .1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
    });
    if (map) {
      var land = $('.land', map), ctys = $$('.cty', map), cities = $$('.city, .city-r', map), lbls = $$('.lbl', map);
      var mt = gsap.timeline({ scrollTrigger: { trigger: map, start: 'top 80%', once: true } });
      mt.from(land, { opacity: 0, duration: 1.2, ease: 'power2.out' })
        .from(ctys, { opacity: 0, duration: .8, stagger: .08, ease: 'power2.out' }, .3)
        .from(cities, { scale: 0, transformOrigin: '50% 50%', duration: .5, stagger: .02, ease: 'back.out(3)' }, .6)
        .from(lbls, { opacity: 0, y: 4, duration: .5, stagger: .05 }, .9);
    }

    /* anything marked data-rv rises in once */
    var rv = $$('[data-rv]').filter(function (el) { return !el.closest('.grid.is-collapsed') || !el.classList.contains('is-extra'); });
    gsap.set(rv, { opacity: 0, y: 32 });
    ScrollTrigger.batch(rv, { start: 'top 90%', once: true, onEnter: function (b) { gsap.to(b, { opacity: 1, y: 0, duration: .9, stagger: .08, ease: 'expo.out', overwrite: true }); } });
    $$('.card.is-extra').forEach(function (c) { gsap.set(c, { opacity: 1, y: 0 }); });

    /* case phones drift up with scroll */
    $$('.case').forEach(function (c) {
      var ph = $('.case__phone', c); if (!ph || mobile) return;
      gsap.fromTo(ph, { yPercent: 12 }, { yPercent: -10, ease: 'none', scrollTrigger: { trigger: c, start: 'top bottom', end: 'bottom top', scrub: .8 } });
    });

    /* process line fills as you read */
    var steps = $('#steps');
    if (steps) gsap.fromTo(steps, { '--prog': '0%' }, { '--prog': '100%', ease: 'none', scrollTrigger: { trigger: steps, start: 'top 75%', end: 'bottom 60%', scrub: .5 } });

    /* before/after: one sweep each, only after both images are decoded */
    $$('.cmp').forEach(function (el, i) {
      ScrollTrigger.create({ trigger: el, start: 'top 75%', once: true, onEnter: function () {
        var imgs = [$('.cmp__old', el), $('.cmp__new', el)], frame = $('.cmp__frame', el), range = $('.cmp__range', el);
        Promise.all(imgs.map(function (im) { return im && im.decode ? im.decode().catch(function () {}) : Promise.resolve(); })).then(function () {
          if (el.dataset.touched) return;
          var o = { p: DEFAULT_P }, set = function () { if (el.dataset.touched) return; frame.style.setProperty('--p', o.p + '%'); range.value = o.p; };
          gsap.timeline({ delay: .2 + (i % 4) * .15 }).to(o, { p: 26, duration: 1.1, ease: 'power2.inOut', onUpdate: set }).to(o, { p: DEFAULT_P, duration: 1.1, ease: 'power2.inOut', onUpdate: set }, '+=.4');
        });
      } });
    });

    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
    window.addEventListener('beforeprint', function () { gsap.set('[data-rv], .hero__copy *, .card', { clearProps: 'opacity,transform' }); });
  }
  motion();
})();
