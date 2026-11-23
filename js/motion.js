/* KRASKO — движение: появление блоков и сцены, привязанные к прокрутке. Стили — css/motion.css.
   Появление считается по прокрутке (а не IntersectionObserver): так оно не зависит от clip-path и фоновых вкладок. */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v) { return Math.max(0, Math.min(1, v)); };
  var raf = window.requestAnimationFrame;

  /* ---------- заголовки: режем на слова и буквы, текст для читалок остаётся в aria-label ---------- */
  var split = function (h) {
    var mode = h.dataset.h;
    var label = h.textContent.replace(/\s+/g, ' ').trim();
    var inner = document.createElement('span');
    inner.className = 'h-in';
    inner.setAttribute('aria-hidden', 'true');
    if (mode === 'roll') {
      inner.textContent = label;
    } else {
      var n = 0;
      label.split(' ').forEach(function (word, w) {
        if (w) inner.appendChild(document.createTextNode(' '));
        var wd = document.createElement('span');
        wd.className = 'wd';
        if (mode === 'drip') {
          Array.prototype.forEach.call(word, function (c) {
            var ch = document.createElement('span');
            ch.className = 'ch';
            ch.textContent = c;
            ch.style.setProperty('--k', (n * 7 + (n % 3) * 5) % 17);
            n++;
            wd.appendChild(ch);
          });
        } else {
          var wi = document.createElement('span');
          wi.className = 'wi';
          wi.textContent = word;
          wi.style.setProperty('--i', w);
          wd.appendChild(wi);
        }
        inner.appendChild(wd);
      });
    }
    h.textContent = '';
    h.appendChild(inner);
    h.setAttribute('aria-label', label);
  };
  $$('.h2[data-h]').forEach(split);

  /* ---------- счётчики ---------- */
  var fmt = function (n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); };
  var count = function () {
    $$('[data-count]').forEach(function (el) {
      var to = +el.dataset.count, t0 = 0;
      var step = function (t) {
        if (!t0) t0 = t;
        var k = Math.min(1, (t - t0) / 1500);
        el.textContent = fmt(Math.round(to * (1 - Math.pow(1 - k, 4))));
        if (k < 1) raf(step);
      };
      raf(step);
    });
  };

  /* ---------- появление блоков ---------- */
  var pending = $$('.h2[data-h], .facts__grid, .cat__grid li, .mq, .goods li, .club__card, .calc__out, .dlist > div, .cont__act');
  var show = function (el, n) {
    el.style.setProperty('--n', n);
    if (el.dataset.h === 'roll') el.style.setProperty('--w', el.firstChild.offsetWidth + 'px');
    el.classList.add('is-in');
    if (el.classList.contains('facts__grid') && !reduce) count();
  };
  var check = function () {
    if (!pending.length || root.classList.contains('has-intro')) return;
    var vh = window.innerHeight;
    var atEnd = window.scrollY + vh >= root.scrollHeight - 4;
    var order = [], groups = [];
    pending = pending.filter(function (el) {
      // внутри красного блока ждём, пока до элемента дойдёт валик
      var lim = el.closest('#club') ? .64 : .88;
      if (el.getBoundingClientRect().top > vh * lim && !atEnd) return true;
      var g = groups.indexOf(el.parentNode);
      if (g < 0) { g = groups.push(el.parentNode) - 1; order[g] = 0; }
      show(el, order[g]++);
      return false;
    });
  };

  if (reduce) {
    pending.forEach(function (el) { show(el, 0); });
    pending = [];
  }

  /* ---------- сцены по прокрутке ---------- */
  var prog = $('#prog');
  var hero = $('.hero'), spot = $('.wall__spot');
  var club = $('#club'), roller = $('#roller');
  var card = $('.club__card'), glare = $('.card__glare');
  var big = $('#footBig'), bigFill = $('.foot__big-f');

  // слово в подвале растягиваем ровно по ширине колонки
  var fitBig = function () {
    if (!big) return;
    big.style.fontSize = '100px';
    var w = big.firstChild.getBoundingClientRect().width;
    var span = document.createElement('span');
    span.style.cssText = 'display:inline-block;visibility:hidden;position:absolute';
    span.textContent = 'KRASKO';
    big.appendChild(span);
    var tw = span.getBoundingClientRect().width;
    big.removeChild(span);
    big.style.fontSize = tw ? (w / tw * 100).toFixed(2) + 'px' : '';
  };
  fitBig();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitBig);
  window.addEventListener('resize', fitBig);

  // наклон карты: цель задают курсор или прокрутка, значение догоняет её плавно
  var tilt = { rx: 0, ry: 0, gx: -140 }, aim = { rx: 0, ry: 0, gx: -140 }, tilting = false;
  var tiltStep = function () {
    tilt.rx += (aim.rx - tilt.rx) * .12;
    tilt.ry += (aim.ry - tilt.ry) * .12;
    tilt.gx += (aim.gx - tilt.gx) * .12;
    card.style.transform = 'rotateX(' + tilt.rx.toFixed(2) + 'deg) rotateY(' + tilt.ry.toFixed(2) + 'deg)';
    glare.style.transform = 'translateX(' + tilt.gx.toFixed(1) + '%) skewX(-12deg)';
    if (Math.abs(aim.rx - tilt.rx) + Math.abs(aim.ry - tilt.ry) + Math.abs(aim.gx - tilt.gx) > .05) raf(tiltStep);
    else tilting = false;
  };
  var setTilt = function (rx, ry, gx) {
    aim.rx = rx; aim.ry = ry; aim.gx = gx;
    if (!tilting) { tilting = true; raf(tiltStep); }
  };

  var scenes = function () {
    var vh = window.innerHeight, y = window.scrollY;
    var max = root.scrollHeight - vh;
    prog.style.transform = 'scaleX(' + (max > 0 ? clamp(y / max) : 0).toFixed(4) + ')';
    if (reduce) return;

    // ведро на первом экране отстаёт от прокрутки
    if (y < hero.offsetHeight + 200) spot.style.translate = '0 ' + (y * .1).toFixed(1) + 'px';

    // валик красит блок клубной карты: край краски держится на ~78% высоты экрана
    var r = club.getBoundingClientRect();
    var p = clamp((vh * .78 - r.top) / r.height);
    if (p >= .997) {
      club.style.clipPath = '';
      roller.classList.remove('is-on');
    } else {
      // сверху запас: ручка валика выступает над блоком, пока он только начал краситься
      club.style.clipPath = 'inset(-320px 0 ' + ((1 - p) * 100).toFixed(3) + '% 0)';
      roller.style.transform = 'translate3d(0,' + (p * r.height).toFixed(1) + 'px,0)';
      roller.classList.toggle('is-on', p > .003);
    }

    // на телефоне карту наклоняет прокрутка
    if (!fine && card.classList.contains('is-in')) {
      var c = card.getBoundingClientRect();
      if (c.bottom > 0 && c.top < vh) {
        var q = clamp((vh - c.top) / (vh + c.height)) - .5;
        setTilt(q * 16, q * -30, -140 + (q + .5) * 420);
      }
    }

    // слово в подвале докрашивается слева направо
    var b = big.getBoundingClientRect();
    // 0 — слово показалось снизу, 1 — страница докручена до конца
    if (b.top < vh) bigFill.style.clipPath = 'inset(0 ' + ((1 - clamp((vh - b.top) / Math.max(1, vh - b.top + max - y))) * 100).toFixed(2) + '% 0 0)';
  };

  var queued = false;
  var frame = function () { queued = false; check(); scenes(); };
  var kick = function () { if (!queued) { queued = true; raf(frame); } };
  window.addEventListener('scroll', kick, { passive: true });
  window.addEventListener('resize', kick);
  window.addEventListener('load', kick);
  document.addEventListener('intro:done', kick);
  kick();

  if (reduce || !fine) return;

  /* ---------- только мышь ---------- */
  // карта наклоняется за курсором
  club.addEventListener('pointermove', function (e) {
    var c = card.getBoundingClientRect();
    var x = clamp((e.clientX - c.left + c.width * .5) / (c.width * 2)) - .5;
    var yy = clamp((e.clientY - c.top + c.height * .5) / (c.height * 2)) - .5;
    setTilt(yy * -18, x * 24, -140 + (x + .5) * 420);
  });
  club.addEventListener('pointerleave', function () { setTilt(0, 0, -140); });

  // проходы валика на стене подаются к курсору
  var wall = $('#wall'), base = $('#wallBase'), moving = false, py = 0;
  var bulge = function () {
    moving = false;
    var bands = base.children, r = wall.getBoundingClientRect();
    var at = (py - r.top) / r.height * bands.length;
    for (var i = 0; i < bands.length; i++) {
      var k = Math.max(0, 1 - Math.abs(i + .5 - at) / 3.2);
      bands[i].style.translate = (-k * k * 22).toFixed(1) + 'px 0';
    }
  };
  wall.addEventListener('pointermove', function (e) { py = e.clientY; if (!moving) { moving = true; raf(bulge); } });
  wall.addEventListener('pointerleave', function () {
    for (var i = 0; i < base.children.length; i++) base.children[i].style.translate = '';
  });
})();
