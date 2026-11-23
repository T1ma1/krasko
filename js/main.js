/* KRASKO — набросок главной: перекраска стены, товары, корзина → WhatsApp, расчёт краски. */
(function () {
  'use strict';

  var WA = '998979700642';
  var SITE = 'https://krasko.uz';
  var FREE_FROM = 500000; // бесплатная доставка по Ташкенту, сум
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* Товары «Топ продаж»: названия, цены и фото с krasko.uz (22.11.2026) */
  var GOODS = [
    { id: 'alina-uni', brand: 'Alina Paint', name: 'Акриловая краска UNI, матовая', price: 34500, old: 37500, img: '/thumb/2/JdZ8oi4zt9GmnELyVjxeDw/350r350/d/kraska_akrilovaya_dlya_interera_alina_25_kg.png', url: '/magazin/product/akrilovaya-kraska-alina-paint-uni-matovaya' },
    { id: 'polisan-perla', brand: 'Polisan', name: 'Краска интерьерная Perla Silikonlu Mat', price: 69966, old: 77740, img: '/thumb/2/0D24wWtEAmi5RVNx-qQTTg/350r350/d/polisan_kraska_interernaya.png', url: '/magazin/product/kraska-interernaya-polisan-perla-silikonlu-mat-matovaya-1' },
    { id: 'marshall-sil', brand: 'Marshall', name: 'Краска интерьерная Siliconed Matt', price: 107640, old: 117000, img: '/thumb/2/ivdJ6doYcnklbEbvQZdmjA/350r350/d/kraska_silikonovaya_dlya_interera_marshall.png', url: '/magazin/product/kraska-silikonovaya-vodoemulsionnaya-marshall-siliconed-matt-matovyj-3' },
    { id: 'mirage', brand: 'By Mirage', name: 'Краска акриловая, белая', price: 24960, old: 26000, img: '/thumb/2/Sz505vW0cF5e43rXiNClOg/350r350/d/akrilovaya_kraska_dlya_fasada.png', url: '/magazin/product/kraska-by-mirage-1' },
    { id: 'polisan-q1', brand: 'Polisan', name: 'Акриловая краска Q1 Lux Plastik, матовая', price: 78000, old: 117000, img: '/thumb/2/BtUkRhmXEb3bt517Fmvu7A/350r350/d/kraska_akrilovaya_dlya_interera_polisan_q1.png', url: '/magazin/product/akrilovaya-kraska-polisan-q1-lux-plastik-matovaya-2' },
    { id: 'polisan-primera', brand: 'Polisan', name: 'Краска силиконовая Primera Silikonlu Mat', price: 119600, old: 143000, img: '/thumb/2/Pl76p1ffREHmuAdPhH-ykA/350r350/d/kraska_milikonovaya_dlya_interera_polisan_sil.png', url: '/magazin/product/kraska-silikonovaya-polisan-primera-silikonlu-mat-matovaya' },
    { id: 'marshall-tavan', brand: 'Marshall', name: 'Краска для потолка Tavan Boyasi, матовая', price: 167440, old: 182000, img: '/thumb/2/OjpWlYU1SWponk7JxfiXQQ/350r350/d/kraska_dlya_potolkov_marshall.png', url: '/magazin/product/kraska-dlya-potolka-marshall-tavan-boyasi-matovyj' },
    { id: 'polisan-astar', brand: 'Polisan', name: 'Грунтовка Polizolan Astar', price: 99970, old: 0, img: '/thumb/2/1BvxBqARrUnGe81o2vf1LQ/350r350/d/gruntovka_glubokogo_proniknoveniya.png', url: '/magazin/product/gruntovka-polisan-polizolan-astar' }
  ];
  var byId = {};
  GOODS.forEach(function (g) { byId[g.id] = g; });

  var money = function (n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' сум'; };
  var wa = function (text) { return 'https://wa.me/' + WA + '?text=' + encodeURIComponent(text); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  /* ---------- интро ----------
     Фазы идут по окончанию анимаций, а не по таймеру: во вкладке в фоне интро ждёт,
     пока её откроют. Клик или клавиша — пропуск. */
  (function () {
    var root = document.documentElement;
    var intro = $('#intro');
    if (!intro) return;
    var done = false;
    var finish = function () {
      if (done) return;
      done = true;
      root.classList.remove('has-intro', 'intro-on');
      intro.parentNode.removeChild(intro);
      document.removeEventListener('pointerdown', finish);
      document.removeEventListener('keydown', finish);
    };
    if (!root.classList.contains('has-intro')) { finish(); return; }

    var order = [0, 6, 2, 10, 4, 12, 1, 8, 13, 3, 9, 5, 11, 7];
    var bands = $$('.intro__coat i', intro);
    bands.forEach(function (b, i) { b.style.setProperty('--d', order[i]); });

    var ended = 0;
    intro.addEventListener('animationend', function (e) {
      // паузы между фазами заданы задержками анимаций в CSS, таймеров здесь нет
      if (e.animationName === 'introWord') {
        intro.dataset.phase = 'cover';
      } else if (e.animationName === 'introIn' && ++ended === bands.length) {
        ended = 0;
        intro.dataset.phase = 'reveal';
        root.classList.remove('intro-on'); // первый экран начинает краситься под уходящей заливкой
      } else if (e.animationName === 'introOut' && ++ended === bands.length) {
        finish();
      }
    });
    document.addEventListener('pointerdown', finish);
    document.addEventListener('keydown', finish);

    var logo = $('.intro__word', intro);
    var go = function () { if (!done) intro.dataset.phase = 'logo'; };
    if (logo.complete && logo.naturalWidth) go();
    else { logo.addEventListener('load', go); logo.addEventListener('error', finish); }

    // страховка: считаем только время, когда вкладка реально рисуется
    var shown = 0, last = 0;
    var watch = function (ts) {
      if (done) return;
      if (last) shown += Math.min(ts - last, 100);
      last = ts;
      if (shown > 5000) finish(); else requestAnimationFrame(watch);
    };
    requestAnimationFrame(watch);
  })();

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

  /* ---------- стена ---------- */
  var wall = $('#wall'), base = $('#wallBase');
  var BANDS = 14;
  var bandsHtml = function () {
    var s = '';
    for (var i = 0; i < BANDS; i++) s += '<i style="--i:' + i + '"></i>';
    return s;
  };
  var inkFor = function (hex) {
    var n = parseInt(hex.slice(1), 16);
    var r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#17171B' : '#FFFFFF';
  };
  var state = { color: '#E3A72F', name: 'Шафран', code: 'K-1012' };
  var painting = null;

  var applyMeta = function () {
    var root = document.documentElement.style;
    root.setProperty('--paint', state.color);
    root.setProperty('--paint-ink', inkFor(state.color));
    $('#wallName').textContent = state.name;
    $('#wallCode').textContent = state.code;
    $('#calcName').textContent = state.name;
    $('#calcCode').textContent = state.code;
    updateCalc();
  };

  var repaint = function (color) {
    if (painting) { painting.remove(); painting = null; }
    if (reduce) { base.style.setProperty('--c', color); return; }
    var coat = document.createElement('div');
    coat.className = 'wall__coat is-rolling';
    coat.style.setProperty('--c', color);
    coat.innerHTML = bandsHtml();
    wall.insertBefore(coat, base.nextSibling);
    painting = coat;
    coat.lastElementChild.addEventListener('animationend', function () {
      base.style.setProperty('--c', color);
      if (painting === coat) painting = null;
      coat.remove();
    });
  };

  base.innerHTML = bandsHtml();
  base.style.setProperty('--c', state.color);
  if (!reduce) base.classList.add('is-rolling'); // первый слой при загрузке

  $$('.sw').forEach(function (b) {
    b.addEventListener('click', function () {
      if (b.classList.contains('is-on')) return;
      $$('.sw').forEach(function (x) { x.classList.remove('is-on'); x.setAttribute('aria-pressed', 'false'); });
      b.classList.add('is-on');
      b.setAttribute('aria-pressed', 'true');
      state = { color: b.dataset.color, name: b.dataset.name, code: b.dataset.code };
      repaint(state.color);
      applyMeta();
    });
  });

  /* ---------- товары ---------- */
  var goodsEl = $('#goods');
  goodsEl.innerHTML = GOODS.map(function (g) {
    var off = g.old ? Math.round((1 - g.price / g.old) * 100) : 0;
    return '<li><article class="good">' +
      '<a class="good__pic" href="' + SITE + g.url + '" aria-label="' + esc(g.brand + ' ' + g.name) + '">' +
        '<img src="' + SITE + g.img + '" alt="" loading="lazy" width="350" height="350" referrerpolicy="no-referrer">' +
      '</a>' +
      '<div class="good__body">' +
        '<span class="good__brand">' + esc(g.brand) + '</span>' +
        '<h3 class="good__name">' + esc(g.name) + '</h3>' +
        '<div class="good__row">' +
          '<p class="good__price"><b>' + money(g.price) + '</b>' + (g.old ? '<span class="good__was"><s>' + money(g.old) + '</s><i>−' + off + '%</i></span>' : '') + '</p>' +
          '<button class="good__add" type="button" data-add="' + g.id + '" aria-label="Добавить в корзину: ' + esc(g.name) + '">' +
            '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
            '<span class="good__add-t" aria-hidden="true">В корзину</span>' +
          '</button>' +
        '</div>' +
      '</div>' +
    '</article></li>';
  }).join('');

  /* ---------- корзина ---------- */
  var KEY = 'krasko-cart';
  var cart = {};
  try { cart = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { cart = {}; }
  Object.keys(cart).forEach(function (id) { if (!byId[id]) delete cart[id]; });
  var save = function () { try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch (e) { /* без хранилища корзина живёт до перезагрузки */ } };

  var drawer = $('#drawer'), listEl = $('#cartList');
  var lastFocus = null;

  var renderCart = function (bump) {
    var ids = Object.keys(cart), count = 0, sum = 0;
    ids.forEach(function (id) { count += cart[id]; sum += cart[id] * byId[id].price; });
    $$('[data-cart-count]').forEach(function (el) {
      el.textContent = count;
      el.hidden = !count;
      if (bump && el.classList.contains('cartbtn__n')) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
    });
    listEl.innerHTML = ids.map(function (id) {
      var g = byId[id];
      return '<li class="ci">' +
        '<img src="' + SITE + g.img + '" alt="" width="64" height="64" referrerpolicy="no-referrer">' +
        '<div><p class="ci__n">' + esc(g.brand + ' · ' + g.name) + '</p><p class="ci__p">' + money(g.price) + '</p></div>' +
        '<div class="qty"><button type="button" data-dec="' + id + '" aria-label="Меньше">−</button><span>' + cart[id] + '</span><button type="button" data-inc="' + id + '" aria-label="Больше">+</button></div>' +
      '</li>';
    }).join('');
    $('#cartEmpty').hidden = !!ids.length;
    $('#cartFoot').hidden = !ids.length;
    $('#cartSum').textContent = money(sum);
    $('#cartFree').textContent = sum >= FREE_FROM
      ? 'Доставка по Ташкенту бесплатно.'
      : 'До бесплатной доставки по Ташкенту осталось ' + money(FREE_FROM - sum) + '.';
    var lines = ids.map(function (id, i) { var g = byId[id]; return (i + 1) + '. ' + g.brand + ' ' + g.name + ' — ' + cart[id] + ' шт. × ' + money(g.price); });
    $('#cartSend').href = wa('Здравствуйте! Хочу заказать:\n' + lines.join('\n') + '\nИтого: ' + money(sum));
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

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-add],[data-inc],[data-dec],[data-cart-open],[data-cart-close]');
    if (!t) return;
    if (t.dataset.add) {
      cart[t.dataset.add] = (cart[t.dataset.add] || 0) + 1;
      t.classList.add('is-added');
      setTimeout(function () { t.classList.remove('is-added'); }, 700);
      save(); renderCart(true);
    } else if (t.dataset.inc) {
      cart[t.dataset.inc]++; save(); renderCart();
    } else if (t.dataset.dec) {
      if (--cart[t.dataset.dec] <= 0) delete cart[t.dataset.dec];
      save(); renderCart();
    } else if (t.hasAttribute('data-cart-open')) {
      setNav(false); openCart();
    } else {
      closeCart();
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!drawer.hidden) closeCart();
    else if (nav.classList.contains('is-open')) setNav(false);
  });

  /* ---------- расчёт краски ---------- */
  var area = $('#area'), areaNum = $('#areaNum');
  function updateCalc() {
    var a = Math.min(300, Math.max(5, parseInt(area.value, 10) || 5));
    var layers = parseInt(($('input[name="layers"]:checked') || {}).value, 10) || 2;
    var cover = parseInt(($('input[name="surface"]:checked') || {}).value, 10) || 10; // м² на литр в один слой
    var litres = Math.ceil(a * layers / cover);
    $('#litres').textContent = litres;
    area.style.setProperty('--fill', ((a - 5) / 295 * 100) + '%');
    var surf = cover === 10 ? 'гладкая' : 'фактурная';
    $('#calcWa').href = wa('Здравствуйте! Расчёт с сайта: стены ' + a + ' м², слоёв: ' + layers + ', поверхность ' + surf + '. Нужно примерно ' + litres + ' л краски. Оттенок: ' + state.name + '. Подскажите, что выбрать?');
    $('#calcSmeta').href = wa('Здравствуйте! Нужен выезд специалиста на объект для сметы. Площадь стен около ' + a + ' м².');
  }
  area.addEventListener('input', function () { areaNum.value = area.value; updateCalc(); });
  areaNum.addEventListener('input', function () { if (areaNum.value) { area.value = areaNum.value; updateCalc(); } });
  areaNum.addEventListener('blur', function () { areaNum.value = area.value; });
  $$('input[name="layers"], input[name="surface"]').forEach(function (r) { r.addEventListener('change', updateCalc); });

  /* ---------- карта выезжает один раз ---------- */
  var card = $('.club__card');
  if (!reduce && 'IntersectionObserver' in window) {
    card.style.opacity = '0';
    new IntersectionObserver(function (en, io) {
      if (!en[0].isIntersecting) return;
      card.style.opacity = '';
      card.classList.add('is-in');
      io.disconnect();
    }, { threshold: .35 }).observe(card);
  }

  applyMeta();
  renderCart();
})();
