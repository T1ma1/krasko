/* KRASKO — общее для главной и каталога: шапка и меню, выбранный оттенок, корзина → WhatsApp.
   Товары берутся из js/data.js (window.KR_DATA, его собирает tools/build.mjs). */
(function () {
  'use strict';

  var WA = '998979700642';
  var SITE = 'https://krasko.uz'; // фото пока грузятся с действующего сайта клиента
  var FREE_FROM = 500000; // бесплатная доставка по Ташкенту, сум
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- язык ----------
     Русский — основной. На узбекских страницах (<html lang="uz">) подключён js/ui.uz.js со словарём KR_UI:
     t() заменяет в строке все русские фразы из словаря, начиная с самых длинных. */
  var LANG = document.documentElement.lang === 'uz' ? 'uz' : 'ru';
  var UI = (LANG === 'uz' && window.KR_UI) || null;
  var uiKeys = UI ? Object.keys(UI).sort(function (a, b) { return b.length - a.length; }) : [];
  var tCache = {};
  var t = function (s) {
    if (!UI) return s;
    if (tCache[s] !== undefined) return tCache[s];
    var out = s;
    uiKeys.forEach(function (k) { if (out.indexOf(k) >= 0) out = out.split(k).join(UI[k]); });
    return (tCache[s] = out);
  };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var money = function (n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + t(' сум'); };
  var wa = function (text) { return 'https://wa.me/' + WA + '?text=' + encodeURIComponent(text); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var store = {
    get: function (k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* без хранилища всё живёт до перезагрузки */ } }
  };
  // лёгкий отклик вибрацией на Android; только после настоящего касания, иначе браузер ругается в консоль
  var tick = function () { if (navigator.vibrate && navigator.userActivation && navigator.userActivation.isActive) { try { navigator.vibrate(8); } catch (e) { /* не везде разрешено */ } } };

  /* ---------- каталог: поиск товара и фасовки по номеру фасовки ---------- */
  var DATA = window.KR_DATA || { cats: [], items: [] };
  // пути: ROOT — корень языковой версии (ссылки на страницы), ASSET — корень сайта (данные)
  var ROOT = new URL(window.KR_ROOT || '.', location.href).pathname;
  var ASSET = new URL(window.KR_ASSET || window.KR_ROOT || '.', location.href).pathname;

  // переключатель языка ведёт на ту же страницу в другой версии
  document.addEventListener('click', function (e) {
    var a = e.target.closest('.lang');
    if (!a) return;
    e.preventDefault();
    var rest = location.pathname.indexOf(ROOT) === 0 ? location.pathname.slice(ROOT.length) : '';
    location.href = ASSET + (LANG === 'uz' ? '' : 'uz/') + rest + location.search + location.hash;
  });
  var byKind = {}, bySlug = {};
  DATA.items.forEach(function (p) {
    p.v.forEach(function (v) { byKind[v[0]] = { p: p, v: v }; bySlug[v[4]] = { p: p, v: v }; });
  });
  var off = function (v) { return v[3] > v[2] ? Math.round((1 - v[2] / v[3]) * 100) : 0; };

  /* ---------- выбранный оттенок: один на весь сайт ---------- */
  var inkFor = function (hex) {
    var n = parseInt(hex.slice(1), 16);
    var r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#17171B' : '#FFFFFF';
  };
  var paint = store.get('krasko-paint', null);
  if (!paint || !/^#[0-9A-F]{6}$/i.test(paint.color || '')) paint = { color: '#E3A72F', name: t('Шафран'), code: 'K-1012' };
  var setPaint = function (p) {
    paint = p;
    var root = document.documentElement.style;
    root.setProperty('--paint', p.color);
    root.setProperty('--paint-ink', inkFor(p.color));
    store.set('krasko-paint', p);
  };
  setPaint(paint);

  /* ---------- шапка и меню ---------- */
  var head = $('#head');
  var onScroll = function () { head.classList.toggle('is-stuck', window.scrollY > 8); };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var burger = $('#burger'), nav = $('#nav');
  var setNav = function (open) {
    nav.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    document.documentElement.style.overflow = open ? 'hidden' : '';
  };
  burger.addEventListener('click', function () { setNav(!nav.classList.contains('is-open')); });
  nav.addEventListener('click', function (e) { if (e.target.closest('a')) setNav(false); });

  /* ---------- корзина ----------
     Ключ — номер фасовки. Рядом храним снимок (название, цена, фото): корзина покажется, даже если каталог обновится. */
  var KEY = 'krasko-cart-2';
  var cart = store.get(KEY, {});
  Object.keys(cart).forEach(function (k) {
    var it = cart[k], hit = byKind[k];
    if (!it || !(it.q > 0)) { delete cart[k]; return; }
    if (hit) { it.p = hit.v[2]; } // цена — всегда свежая из каталога
  });
  var save = function () { store.set(KEY, cart); };

  var drawer = $('#drawer'), listEl = $('#cartList');
  var lastFocus = null;

  var renderCart = function (bump) {
    var ids = Object.keys(cart), count = 0, sum = 0;
    ids.forEach(function (id) { count += cart[id].q; sum += cart[id].q * cart[id].p; });
    $$('[data-cart-count]').forEach(function (el) {
      el.textContent = count;
      el.hidden = !count;
      if (bump && el.classList.contains('cartbtn__n')) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
    });
    listEl.innerHTML = ids.map(function (id) {
      var g = cart[id];
      return '<li class="ci">' +
        '<img src="' + SITE + esc(g.i) + '" alt="" width="64" height="64" loading="lazy" referrerpolicy="no-referrer">' +
        '<div><p class="ci__n">' + esc(g.n) + '</p><p class="ci__p">' + (g.k ? esc(g.k) + ' · ' : '') + money(g.p) + '</p></div>' +
        '<div class="qty"><button type="button" data-dec="' + id + t('" aria-label="Меньше">−</button><span>') + g.q + '</span><button type="button" data-inc="' + id + t('" aria-label="Больше">+</button></div>') +
      '</li>';
    }).join('');
    $('#cartEmpty').hidden = !!ids.length;
    $('#cartFoot').hidden = !ids.length;
    $('#cartSum').textContent = money(sum);
    $('#cartFree').textContent = sum >= FREE_FROM
      ? t('Доставка по Ташкенту бесплатно.')
      : t('До бесплатной доставки по Ташкенту осталось {0}.').replace('{0}', money(FREE_FROM - sum));
    var lines = ids.map(function (id, i) { var g = cart[id]; return (i + 1) + '. ' + g.n + (g.k ? ', ' + g.k : '') + ' — ' + g.q + t(' шт. × ') + money(g.p); });
    $('#cartSend').href = wa(t('Здравствуйте! Хочу заказать:\n') + lines.join('\n') + t('\nИтого: ') + money(sum));
    document.dispatchEvent(new Event('cart:change'));
  };

  var openCart = function () {
    lastFocus = document.activeElement;
    drawer.hidden = false;
    void drawer.offsetWidth;
    drawer.classList.add('is-open');
    document.documentElement.style.overflow = 'hidden';
    $('.drawer__x').focus();
  };
  var closeCart = function () {
    drawer.classList.remove('is-open');
    document.documentElement.style.overflow = '';
    setTimeout(function () { drawer.hidden = true; }, reduce ? 0 : 400);
    if (lastFocus) lastFocus.focus();
  };

  // фото товара летит в корзину: в шапку на компьютере, в нижнюю панель на телефоне
  var fly = function (btn) {
    if (reduce || !btn.animate) return;
    var box = btn.closest('[data-card]');
    var img = box && $('img', box);
    var target = $$('[data-cart-open]').filter(function (el) { return el.getClientRects().length; })[0];
    if (!img || !target) return;
    var a = img.getBoundingClientRect(), b = target.getBoundingClientRect();
    if (!a.width) return;
    var ghost = document.createElement('img');
    ghost.src = img.currentSrc || img.src;
    ghost.referrerPolicy = 'no-referrer';
    ghost.alt = '';
    ghost.className = 'fly';
    ghost.style.cssText = 'left:' + a.left + 'px;top:' + a.top + 'px;width:' + a.width + 'px;height:' + a.height + 'px';
    document.body.appendChild(ghost);
    var dx = b.left + b.width / 2 - (a.left + a.width / 2);
    var dy = b.top + b.height / 2 - (a.top + a.height / 2);
    var lift = dy < 0 ? 40 : -70; // дуга: вверх летим с подъёмом, вниз — с подскоком
    var anim = ghost.animate([
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: 'translate(' + dx * .45 + 'px,' + (dy * .35 + lift) + 'px) scale(.55)', opacity: 1, offset: .5 },
      { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + (30 / a.width).toFixed(3) + ')', opacity: .25 }
    ], { duration: 700, easing: 'cubic-bezier(.65,0,.35,1)' });
    anim.onfinish = anim.oncancel = function () {
      if (ghost.parentNode) ghost.parentNode.removeChild(ghost);
      target.animate([{ scale: 1 }, { scale: 1.14 }, { scale: 1 }], { duration: 320, easing: 'cubic-bezier(.22,1,.36,1)' });
    };
  };

  // snap — данные с самой кнопки: на странице товара каталог (js/data.js) не грузится
  var add = function (kind, qty, snap) {
    var hit = byKind[kind];
    var item = hit ? { n: (hit.p.b ? hit.p.b + ' · ' : '') + hit.p.n, k: hit.v[1], p: hit.v[2], i: hit.p.i }
      : snap && snap.name && +snap.price > 0 ? { n: snap.name, k: snap.pack || '', p: +snap.price, i: snap.img || '' } : null;
    if (!item) return false;
    if (cart[kind]) cart[kind].q += qty || 1;
    else { item.q = qty || 1; cart[kind] = item; }
    save(); renderCart(true);
    return true;
  };

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-add],[data-inc],[data-dec],[data-cart-open],[data-cart-close]');
    if (!t) return;
    if (t.dataset.add) {
      if (!add(t.dataset.add, parseInt(t.dataset.qty, 10) || 1, t.dataset)) return;
      fly(t); tick();
      t.classList.add('is-added');
      setTimeout(function () { t.classList.remove('is-added'); }, 700);
    } else if (t.dataset.inc) {
      cart[t.dataset.inc].q++; save(); renderCart();
    } else if (t.dataset.dec) {
      if (--cart[t.dataset.dec].q <= 0) delete cart[t.dataset.dec];
      save(); renderCart();
    } else if (t.hasAttribute('data-cart-open')) {
      setNav(false); openCart();
    } else {
      closeCart();
    }
  });

  // на телефоне корзина — шторка снизу: тянем за шапку вниз, чтобы закрыть
  var isSheet = window.matchMedia('(max-width: 860px)');
  var sheetDrag = function (handle, panel, shade, close) {
    var pull = null;
    handle.addEventListener('pointerdown', function (e) {
      if (!isSheet.matches || e.target.closest('button, a, input')) return;
      pull = { y: e.clientY, t: e.timeStamp, dy: 0 };
      handle.setPointerCapture(e.pointerId);
      panel.style.transition = 'none';
      shade.style.transition = 'none';
    });
    handle.addEventListener('pointermove', function (e) {
      if (!pull) return;
      pull.dy = Math.max(0, e.clientY - pull.y);
      panel.style.transform = 'translateY(' + pull.dy + 'px)';
      shade.style.opacity = String(1 - Math.min(1, pull.dy / panel.offsetHeight));
    });
    var end = function (e) {
      if (!pull) return;
      var speed = pull.dy / Math.max(1, e.timeStamp - pull.t);
      var shut = pull.dy > 110 || (speed > .5 && pull.dy > 30);
      pull = null;
      void panel.offsetWidth; // фиксируем положение под пальцем, дальше доведёт переход
      panel.style.transition = ''; shade.style.transition = '';
      panel.style.transform = ''; shade.style.opacity = '';
      if (shut) close();
    };
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  };
  sheetDrag($('.drawer__head'), $('.drawer__panel'), $('.drawer__shade'), closeCart);

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || e.defaultPrevented) return;
    if (!drawer.hidden) closeCart();
    else if (nav.classList.contains('is-open')) setNav(false);
  });

  renderCart();

  window.KR = {
    WA: WA, SITE: SITE, DATA: DATA, ROOT: ROOT, ASSET: ASSET, LANG: LANG, t: t, // ROOT — путь к корню сайта с вложенных страниц
    reduce: reduce, isSheet: isSheet,
    $: $, $$: $$, money: money, wa: wa, esc: esc, off: off, tick: tick, store: store,
    byKind: byKind, bySlug: bySlug,
    paint: function () { return paint; }, setPaint: setPaint,
    setNav: setNav, sheetDrag: sheetDrag,
    inCart: function (kind) { return cart[kind] ? cart[kind].q : 0; }
  };
})();
