/* KRASKO — главная: интро, перекраска стены, «Топ продаж», расчёт краски.
   Шапка, корзина и выбранный оттенок — в js/common.js. Появление блоков и сцены по прокрутке — в js/motion.js. */
(function () {
  'use strict';

  var KR = window.KR;
  var $ = KR.$, $$ = KR.$$, money = KR.money, wa = KR.wa, esc = KR.esc, reduce = KR.reduce, tick = KR.tick;
  var SITE = KR.SITE, t = KR.t;

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
      document.dispatchEvent(new Event('intro:done'));
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

  /* ---------- стена ---------- */
  var wall = $('#wall'), base = $('#wallBase');
  var BANDS = 14;
  var bandsHtml = function () {
    var s = '';
    for (var i = 0; i < BANDS; i++) s += '<i style="--i:' + i + '"></i>';
    return s;
  };
  var state = KR.paint(); // оттенок, выбранный раньше (в том числе на странице каталога)
  var painting = null;

  var applyMeta = function () {
    KR.setPaint(state);
    $('#wallName').textContent = state.name;
    $('#wallCode').textContent = state.code;
    $('#calcName').textContent = state.name;
    $('#calcCode').textContent = state.code;
    updateCalc();
  };

  // dir: 1 — слой идёт справа (как при загрузке), -1 — слева (смахнули вправо)
  var repaint = function (color, dir) {
    if (painting) { painting.remove(); painting = null; }
    if (reduce) { base.style.setProperty('--c', color); return; }
    var coat = document.createElement('div');
    coat.className = 'wall__coat is-rolling' + (dir < 0 ? ' wall__coat--l' : '');
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

  var sws = $$('.sw');
  sws.forEach(function (x) {
    var on = x.dataset.color.toLowerCase() === state.color.toLowerCase();
    x.classList.toggle('is-on', on);
    x.setAttribute('aria-pressed', String(on));
    // название оттенка берём с образца: оно на языке страницы
    if (on) state = { color: x.dataset.color, name: x.dataset.name, code: x.dataset.code };
  });
  var chip = $('.wall__chip'), spot = $('.wall__spot');
  var pick = function (b, dir) {
    if (b.classList.contains('is-on')) return;
    wall.classList.add('is-used'); // подсказка «смахните» больше не нужна
    sws.forEach(function (x) { x.classList.remove('is-on'); x.setAttribute('aria-pressed', 'false'); });
    b.classList.add('is-on');
    b.setAttribute('aria-pressed', 'true');
    state = { color: b.dataset.color, name: b.dataset.name, code: b.dataset.code };
    repaint(state.color, dir);
    applyMeta();
    tick();
    if (!reduce && chip.animate) {
      // подпись оттенка меняется вместе с проходом валика, ведро чуть вздрагивает
      chip.animate([{ opacity: 0, transform: 'translateY(.5em)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: 160, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' });
      spot.animate([{ scale: 1 }, { scale: .94 }, { scale: 1 }], { duration: 480, easing: 'cubic-bezier(.22,1,.36,1)' });
    }
  };
  sws.forEach(function (b) { b.addEventListener('click', function () { pick(b, 1); }); });

  // по стене можно смахнуть (следующий / предыдущий оттенок) или просто нажать
  var stepColor = function (d) {
    var i = 0;
    sws.forEach(function (x, n) { if (x.classList.contains('is-on')) i = n; });
    pick(sws[(i + d + sws.length) % sws.length], d);
  };
  var press = null;
  wall.addEventListener('pointerdown', function (e) { press = { x: e.clientX, y: e.clientY }; });
  wall.addEventListener('pointercancel', function () { press = null; });
  wall.addEventListener('pointerup', function (e) {
    if (!press) return;
    var dx = e.clientX - press.x, dy = e.clientY - press.y;
    press = null;
    if (Math.abs(dx) > 36 && Math.abs(dx) > Math.abs(dy) * 1.2) stepColor(dx < 0 ? 1 : -1);
    else if (Math.abs(dx) < 8 && Math.abs(dy) < 8) stepColor(1);
  });

  /* ---------- «Топ продаж» ----------
     Те же восемь позиций, что в блоке «Топ продаж» на krasko.uz; цены и фото — из каталога (js/data.js). */
  var TOP = [
    'akrilovaya-kraska-alina-paint-uni-matovaya',
    'kraska-interernaya-polisan-perla-silikonlu-mat-matovaya-1',
    'kraska-silikonovaya-vodoemulsionnaya-marshall-siliconed-matt-matovyj-3',
    'kraska-by-mirage-1',
    'akrilovaya-kraska-polisan-q1-lux-plastik-matovaya-2',
    'kraska-silikonovaya-polisan-primera-silikonlu-mat-matovaya',
    'kraska-dlya-potolka-marshall-tavan-boyasi-matovyj',
    'gruntovka-polisan-polizolan-astar'
  ];
  var goodsEl = $('#goods');
  goodsEl.innerHTML = TOP.map(function (slug) {
    var hit = KR.bySlug[slug];
    if (!hit) return '';
    var p = hit.p, v = hit.v, off = KR.off(v);
    var title = p.n + (v[1] ? ', ' + v[1] : '');
    return '<li><article class="good" data-card>' +
      '<a class="good__pic" href="magazin/product/' + v[4] + '/" aria-label="' + esc(title) + '">' +
        '<img src="' + SITE + esc(p.i) + '" alt="" loading="lazy" width="350" height="350" referrerpolicy="no-referrer">' +
      '</a>' +
      '<div class="good__body">' +
        '<span class="good__brand">' + esc(p.b) + '</span>' +
        '<h3 class="good__name">' + esc(title) + '</h3>' +
        '<div class="good__row">' +
          '<p class="good__price"><b>' + money(v[2]) + '</b>' + (off ? '<span class="good__was"><s>' + money(v[3]) + '</s><i>−' + off + '%</i></span>' : '') + '</p>' +
          '<button class="good__add" type="button" data-add="' + v[0] + t('" aria-label="Добавить в корзину: ') + esc(title) + '">' +
            '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
            t('<span class="good__add-t" aria-hidden="true">В корзину</span>') +
          '</button>' +
        '</div>' +
      '</div>' +
    '</article></li>';
  }).join('');

  var railThumb = $('#rail i');
  goodsEl.addEventListener('scroll', function () {
    var max = goodsEl.scrollWidth - goodsEl.clientWidth;
    railThumb.style.transform = 'translateX(' + (max > 0 ? goodsEl.scrollLeft / max * 300 : 0).toFixed(1) + '%)';
  }, { passive: true });

  /* ---------- расчёт краски ---------- */
  var area = $('#area'), areaNum = $('#areaNum');
  function updateCalc() {
    var a = Math.min(300, Math.max(5, parseInt(area.value, 10) || 5));
    var layers = parseInt(($('input[name="layers"]:checked') || {}).value, 10) || 2;
    var cover = parseInt(($('input[name="surface"]:checked') || {}).value, 10) || 10; // м² на литр в один слой
    var litres = Math.ceil(a * layers / cover);
    $('#litres').textContent = litres;
    area.style.setProperty('--fill', ((a - 5) / 295 * 100) + '%');
    // чем больше литров, тем выше уровень краски в образце (не ниже половины: там подпись оттенка)
    $('#calcLvl').style.transform = 'translateY(' + (50 - 50 * Math.min(1, litres / 60)).toFixed(1) + '%)';
    var surf = cover === 10 ? t('гладкая') : t('фактурная');
    $('#calcWa').href = wa(t('Здравствуйте! Расчёт с сайта: стены ') + a + t(' м², слоёв: ') + layers + t(', поверхность ') + surf + t('. Нужно примерно ') + litres + t(' л краски. Оттенок: ') + state.name + t('. Подскажите, что выбрать?'));
    $('#calcSmeta').href = wa(t('Здравствуйте! Нужен выезд специалиста на объект для сметы. Площадь стен около ') + a + t(' м².'));
  }
  area.addEventListener('input', function () { areaNum.value = area.value; updateCalc(); });
  areaNum.addEventListener('input', function () { if (areaNum.value) { area.value = areaNum.value; updateCalc(); } });
  areaNum.addEventListener('blur', function () { areaNum.value = area.value; });
  $$('input[name="layers"], input[name="surface"]').forEach(function (r) { r.addEventListener('change', updateCalc); });

  applyMeta();
})();
