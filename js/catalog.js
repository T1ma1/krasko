/* KRASKO — страница каталога: разделы, поиск, фильтры, сортировка, окно товара.
   Состояние живёт в адресе: catalog.html?cat=…&q=…&b=…&sale=1&sort=…#p=<номер товара>. */
(function () {
  'use strict';

  var KR = window.KR, D = KR.DATA;
  var $ = KR.$, $$ = KR.$$, money = KR.money, esc = KR.esc, wa = KR.wa, SITE = KR.SITE, t = KR.t;
  var PAGE = 24;
  // При смене раздела адрес страницы меняется без перезагрузки, поэтому корень сайта берём абсолютным путём,
  // а относительные ссылки в шапке и подвале сразу превращаем в полные.
  var ROOT = KR.ROOT;
  $$('a[href]').forEach(function (a) { if (!/^(#|[a-z]+:)/i.test(a.getAttribute('href'))) a.setAttribute('href', a.href); });
  var purl = function (v) { return ROOT + 'magazin/product/' + v[4] + '/'; }; // отдельная страница фасовки, её видят поисковики

  /* ---------- разделы ---------- */
  var cats = D.cats.map(function (c, i) { return { i: i, slug: c[0], name: c[1], parent: c[2], n: c[3], kids: [] }; });
  var catBy = {};
  cats.forEach(function (c) { catBy[c.slug] = c; });
  cats.forEach(function (c) { if (c.parent && catBy[c.parent]) catBy[c.parent].kids.push(c); });
  var tops = cats.filter(function (c) { return !c.parent; });
  var pathOf = function (c) { var out = []; while (c) { out.unshift(c); c = catBy[c.parent]; } return out; };

  /* ---------- товары: заранее считаем строку поиска, цену и скидку ---------- */
  var norm = function (s) { return String(s).toLowerCase().replace(/ё/g, 'е'); };
  var items = D.items.map(function (p, n) {
    var priced = p.v.filter(function (v) { return v[2] > 0; });
    var min = priced.length ? Math.min.apply(null, priced.map(function (v) { return v[2]; })) : 0;
    return {
      p: p, n: n, min: min,
      sale: Math.max.apply(null, p.v.map(KR.off)),
      hay: norm(p.n + ' ' + p.b + ' ' + p.c.map(function (i) { return cats[i].name; }).join(' '))
    };
  });
  var byId = {};
  items.forEach(function (it) { byId[it.p.id] = it; });

  /* ---------- состояние ---------- */
  var st = { cat: '', q: '', brands: [], sale: false, sort: 'def' };
  var shown = PAGE, allBrands = false;
  var readUrl = function () {
    var u = new URLSearchParams(location.search);
    st.cat = catBy[u.get('cat')] ? u.get('cat') : catBy[window.KR_CAT] ? window.KR_CAT : ''; // KR_CAT задаёт страница раздела
    st.q = (u.get('q') || '').slice(0, 80);
    st.brands = (u.get('b') || '').split('|').filter(Boolean);
    st.sale = u.get('sale') === '1';
    st.sort = ['cheap', 'dear', 'sale', 'name'].indexOf(u.get('sort')) >= 0 ? u.get('sort') : 'def';
  };
  var writeUrl = function () {
    var u = new URLSearchParams();
    if (st.cat) u.set('cat', st.cat);
    if (st.q) u.set('q', st.q);
    if (st.brands.length) u.set('b', st.brands.join('|'));
    if (st.sale) u.set('sale', '1');
    if (st.sort !== 'def') u.set('sort', st.sort);
    // раздел живёт в адресе страницы (/magazin/folder/<раздел>/), остальное — в параметрах
    u.delete('cat');
    var s = u.toString();
    history.replaceState(null, '', ROOT + (st.cat ? 'magazin/folder/' + st.cat + '/' : 'catalog.html') + (s ? '?' + s : '') + location.hash);
  };

  // ignore: какой фильтр не учитывать (чтобы посчитать, сколько товаров даст каждый бренд)
  var match = function (ignore) {
    var ci = st.cat ? catBy[st.cat].i : -1;
    var words = norm(st.q).split(/\s+/).filter(Boolean);
    return items.filter(function (it) {
      if (ci >= 0 && it.p.c.indexOf(ci) < 0) return false;
      if (st.sale && !it.sale) return false;
      if (ignore !== 'brand' && st.brands.length && st.brands.indexOf(it.p.b) < 0) return false;
      for (var i = 0; i < words.length; i++) if (it.hay.indexOf(words[i]) < 0) return false;
      return true;
    });
  };
  var sorted = function (list) {
    var by = {
      cheap: function (a, b) { return (a.min || 1e12) - (b.min || 1e12); },
      dear: function (a, b) { return b.min - a.min; },
      sale: function (a, b) { return b.sale - a.sale || a.n - b.n; },
      name: function (a, b) { return a.p.n.localeCompare(b.p.n, 'ru'); }
    }[st.sort];
    return by ? list.slice().sort(by) : list;
  };

  /* ---------- карточка ---------- */
  var chosen = {}; // выбранная фасовка по товарам
  var varOf = function (p) {
    var k = chosen[p.id];
    for (var i = 0; i < p.v.length; i++) if (p.v[i][0] === k) return p.v[i];
    return p.v.filter(function (v) { return v[2] > 0; })[0] || p.v[0];
  };
  var plus = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  var label = function (v, i) { return v[1] || t('Вариант ') + (i + 1); };
  var packsHtml = function (p, cur, limit) {
    if (p.v.length < 2) return '';
    var list = p.v.map(function (v, i) { return { v: v, i: i }; });
    var cut = limit && list.length > limit ? list.slice(0, limit - 1) : list;
    if (cut.length < list.length && !cut.some(function (x) { return x.v === cur; })) cut[cut.length - 1] = list.filter(function (x) { return x.v === cur; })[0];
    return t('<div class="packs" role="group" aria-label="Фасовка">') + cut.map(function (x) {
      return '<button type="button" class="pack' + (x.v === cur ? ' is-on' : '') + '" data-pack="' + x.v[0] + '" aria-pressed="' + (x.v === cur) + '">' + esc(label(x.v, x.i)) + '</button>';
    }).join('') + (cut.length < list.length ? '<a class="pack pack--more" href="' + purl(cur) + '" data-open="' + p.id + '">' + t('ещё {0}').replace('{0}', list.length - cut.length) + '</a>' : '') + '</div>';
  };
  var priceHtml = function (v) {
    if (!v[2]) return t('<span class="pcard__ask">Цена по запросу</span>');
    return '<b>' + money(v[2]) + '</b>' + (v[3] > v[2] ? '<s>' + money(v[3]) + '</s>' : '');
  };
  var cardHtml = function (it) {
    var p = it.p, v = varOf(p), off = KR.off(v), inCart = KR.inCart(v[0]);
    return '<article class="pcard" data-card data-id="' + p.id + '">' +
      '<a class="pcard__pic" href="' + purl(v) + '" data-open="' + p.id + '" tabindex="-1" aria-hidden="true">' +
        (off ? '<span class="pcard__flag">−' + off + '%</span>' : '') +
        '<img src="' + SITE + esc(p.i) + '" alt="" loading="lazy" width="350" height="350" referrerpolicy="no-referrer">' +
      '</a>' +
      '<div class="pcard__body">' +
        '<span class="pcard__brand">' + esc(p.b) + '</span>' +
        '<h3 class="pcard__name"><a href="' + purl(v) + '" data-open="' + p.id + '">' + esc(p.n) + '</a></h3>' +
        packsHtml(p, v, 4) +
        '<div class="pcard__row">' +
          '<p class="pcard__price">' + priceHtml(v) + '</p>' +
          (v[2]
            ? '<button class="padd" type="button" data-add="' + v[0] + t('" aria-label="Добавить в корзину: ') + esc(p.n) + '">' + plus + '<span class="padd__n"' + (inCart ? '' : ' hidden') + '>' + inCart + '</span></button>'
            : '<a class="padd" href="' + wa(t('Здравствуйте! Подскажите цену: ') + p.n + (v[1] ? ', ' + v[1] : '') + '.') + t('" target="_blank" rel="noopener" aria-label="Спросить цену в WhatsApp">?</a>')) +
        '</div>' +
      '</div>' +
    '</article>';
  };

  /* ---------- отрисовка ---------- */
  var grid = $('#grid'), list = [];
  var plural = function (n, a, b, c) { var m = n % 100, k = n % 10; return m > 10 && m < 20 ? c : k === 1 ? a : k > 1 && k < 5 ? b : c; };

  var drawGrid = function (from) {
    var part = list.slice(from, shown);
    var html = part.map(function (it, i) { return '<li class="is-new" style="--n:' + Math.min(i, 14) + '">' + cardHtml(it) + '</li>'; }).join('');
    if (from) grid.insertAdjacentHTML('beforeend', html); else grid.innerHTML = html;
    $('#more').hidden = shown >= list.length;
    if (!$('#more').hidden) $('#more').textContent = t('Показать ещё {0}').replace('{0}', Math.min(PAGE, list.length - shown));
  };

  var treeHtml = function (nodes, open) {
    return nodes.map(function (c) {
      var on = c.slug === st.cat, inPath = open.indexOf(c) >= 0;
      return '<li><button type="button" data-cat="' + c.slug + '" class="' + (on ? 'is-on' : inPath ? 'is-path' : '') + '"' + (on ? ' aria-current="true"' : '') + '><span>' + esc(c.name) + '</span><i>' + c.n + '</i></button>' +
        (inPath && c.kids.length ? '<ul>' + treeHtml(c.kids, open) + '</ul>' : '') + '</li>';
    }).join('');
  };

  var render = function (keepShown) {
    if (!keepShown) shown = PAGE;
    list = sorted(match());
    var cur = st.cat ? catBy[st.cat] : null, path = cur ? pathOf(cur) : [];

    // заголовок и «хлебные крошки»
    $('#cataTitle').textContent = st.q ? t('Поиск: ') + st.q : cur ? cur.name : t('Каталог');
    document.title = (cur ? cur.name + ' — ' : '') + t('каталог KRASKO, Ташкент');
    $('#cataCount').textContent = list.length + ' ' + plural(list.length, t('товар'), t('товара'), t('товаров'));
    $('#crumbs').innerHTML = '<a href="' + ROOT + t('index.html">Главная</a><span aria-hidden="true">/</span>') +
      (cur ? '<a href="' + ROOT + t('catalog.html" data-cat="">Каталог</a>') + path.slice(0, -1).map(function (c) { return '<span aria-hidden="true">/</span><a href="' + ROOT + 'magazin/folder/' + c.slug + '/" data-cat="' + c.slug + '">' + esc(c.name) + '</a>'; }).join('') : t('<span>Каталог</span>'));

    // дерево разделов (компьютер) и ленты (телефон)
    $('#tree').innerHTML = '<li><button type="button" data-cat="" class="' + (st.cat ? '' : 'is-on') + t('"><span>Все товары</span><i>') + items.length + '</i></button></li>' + treeHtml(tops, path);
    var top = path[0];
    $('#chips').innerHTML = '<button type="button" class="chip' + (st.cat ? '' : ' is-on') + t('" data-cat="">Все</button>') +
      tops.map(function (c) { return '<button type="button" class="chip' + (top === c ? ' is-on' : '') + '" data-cat="' + c.slug + '">' + esc(c.name) + '</button>'; }).join('');
    var sub = $('#chipsSub');
    sub.hidden = !(top && top.kids.length);
    if (!sub.hidden) sub.innerHTML = top.kids.map(function (c) { return '<button type="button" class="chip' + (path.indexOf(c) >= 0 ? ' is-on' : '') + '" data-cat="' + c.slug + '">' + esc(c.name) + '</button>'; }).join('');
    var onChip = $('#chips .is-on');
    if (onChip && onChip.scrollIntoView && KR.isSheet.matches) $('#chips').scrollTo({ left: Math.max(0, onChip.offsetLeft - 16), behavior: KR.reduce ? 'auto' : 'smooth' });

    // бренды: считаем по текущему разделу и поиску
    var counts = {};
    match('brand').forEach(function (it) { if (it.p.b) counts[it.p.b] = (counts[it.p.b] || 0) + 1; });
    var names = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a] || a.localeCompare(b, 'ru'); });
    st.brands.forEach(function (b) { if (names.indexOf(b) < 0) names.unshift(b); });
    var vis = allBrands ? names : names.slice(0, 10);
    $('#brands').innerHTML = vis.map(function (b) {
      return '<li><label class="check"><input type="checkbox" data-brand="' + esc(b) + '"' + (st.brands.indexOf(b) >= 0 ? ' checked' : '') + '><span>' + esc(b) + '</span><i>' + (counts[b] || 0) + '</i></label></li>';
    }).join('') || t('<li class="pv__wait">Брендов нет</li>');
    $('#brandsMore').hidden = allBrands || names.length <= 10;
    $('#brandsMore').textContent = t('Все бренды (') + names.length + ')';
    $('#sale').checked = st.sale;
    $('#sort').value = st.sort;

    // активные фильтры
    var tags = [];
    if (st.q) tags.push('<button type="button" class="tag" data-drop="q">«' + esc(st.q) + '»</button>');
    st.brands.forEach(function (b) { tags.push('<button type="button" class="tag" data-drop="brand" data-v="' + esc(b) + '">' + esc(b) + '</button>'); });
    if (st.sale) tags.push(t('<button type="button" class="tag" data-drop="sale">Со скидкой</button>'));
    $('#tags').innerHTML = tags.join('');
    var nf = st.brands.length + (st.sale ? 1 : 0);
    $('#filtN').hidden = !nf; $('#filtN').textContent = nf;
    $('#reset').hidden = !(nf || st.q || st.cat);
    $('#filtApply').textContent = t('Показать {0}').replace('{0}', list.length + ' ' + plural(list.length, t('товар'), t('товара'), t('товаров')));
    $('#q').value = st.q; $('#qx').hidden = !st.q;

    $('#none').hidden = !!list.length;
    $('#noneWa').href = wa(t('Здравствуйте! Ищу товар') + (st.q ? ': ' + st.q : '') + t('. Подскажите, есть ли в наличии?'));
    drawGrid(0);
    writeUrl();
  };

  var setCat = function (slug) { st.cat = slug; st.brands = []; render(); };
  var resetAll = function () { st = { cat: '', q: '', brands: [], sale: false, sort: st.sort }; render(); };

  /* ---------- события ---------- */
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-open],[data-cat],[data-pack],[data-drop],[data-filt-close],[data-pv-close]');
    if (!t) return;
    if (t.dataset.open) {
      // обычный клик открывает окно товара; «открыть в новой вкладке» ведёт на страницу товара
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
      e.preventDefault();
      location.hash = 'p=' + t.dataset.open;
    } else if (t.hasAttribute('data-cat')) {
      e.preventDefault();
      setCat(t.dataset.cat);
      if (!t.closest('.rails')) window.scrollTo({ top: 0, behavior: KR.reduce ? 'auto' : 'smooth' });
    } else if (t.dataset.pack) {
      var hit = KR.byKind[t.dataset.pack];
      if (!hit) return;
      chosen[hit.p.id] = t.dataset.pack;
      KR.tick();
      var card = $('.pcard[data-id="' + hit.p.id + '"]');
      if (card) card.parentNode.innerHTML = cardHtml(byId[hit.p.id]);
      if (pvId === hit.p.id) drawPv();
    } else if (t.dataset.drop) {
      if (t.dataset.drop === 'q') st.q = '';
      else if (t.dataset.drop === 'sale') st.sale = false;
      else st.brands = st.brands.filter(function (b) { return b !== t.dataset.v; });
      render();
    } else if (t.hasAttribute('data-filt-close')) {
      setFilt(false);
    } else {
      closePv();
    }
  });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.dataset && t.dataset.brand) {
      st.brands = t.checked ? st.brands.concat(t.dataset.brand) : st.brands.filter(function (b) { return b !== t.dataset.brand; });
      render();
    } else if (t.id === 'sale') { st.sale = t.checked; render(); }
    else if (t.id === 'sort') { st.sort = t.value; render(); }
  });
  var qTimer = 0, q = $('#q');
  q.addEventListener('input', function () {
    clearTimeout(qTimer);
    qTimer = setTimeout(function () { st.q = q.value.trim(); render(); q.focus(); }, 160);
  });
  $('#search').addEventListener('submit', function (e) { e.preventDefault(); q.blur(); });
  $('#qx').addEventListener('click', function () { st.q = ''; render(); q.focus(); });
  $('#more').addEventListener('click', function () { var from = shown; shown += PAGE; drawGrid(from); });
  $('#brandsMore').addEventListener('click', function () { allBrands = true; render(true); });
  $('#reset').addEventListener('click', resetAll);
  $('#noneReset').addEventListener('click', resetAll);
  // счётчик на кнопке «в корзину» обновляется вместе с корзиной
  document.addEventListener('cart:change', function () {
    $$('.padd[data-add]').forEach(function (b) {
      var n = KR.inCart(b.dataset.add), el = $('.padd__n', b);
      if (el) { el.textContent = n; el.hidden = !n; }
    });
  });

  /* ---------- фильтры на телефоне ---------- */
  var filt = $('#filt');
  var setFilt = function (open) {
    filt.classList.toggle('is-open', open);
    document.documentElement.style.overflow = open ? 'hidden' : '';
  };
  $('#filtOpen').addEventListener('click', function () { setFilt(true); });
  KR.sheetDrag($('.filt__head'), $('.filt__panel'), $('.filt__shade'), function () { setFilt(false); });

  /* ---------- окно товара ---------- */
  var pv = $('#pv'), pvBody = $('#pvBody'), pvId = null, pvQty = 1, pvInfo = {}, pvImg = 0, pvFocus = null;
  var drawPv = function () {
    var it = byId[pvId];
    if (!it) return;
    var p = it.p, v = varOf(p), off = KR.off(v), info = pvInfo[p.id];
    var gal = info && info.g && info.g.length ? info.g : [[p.i, p.i]];
    if (pvImg >= gal.length) pvImg = 0;
    var home = p.h >= 0 ? cats[p.h] : null;
    var ask = wa(t('Здравствуйте! Вопрос по товару: ') + p.n + (v[1] ? ', ' + v[1] : '') + '.');
    pvBody.innerHTML =
      '<div class="pv__grid">' +
        '<div class="pv__media">' +
          '<div class="pv__main"><img src="' + SITE + esc(gal[pvImg][0]) + '" alt="' + esc(p.n) + '" referrerpolicy="no-referrer"></div>' +
          (gal.length > 1 ? '<div class="pv__thumbs">' + gal.map(function (g, i) { return '<button type="button" data-img="' + i + '" class="' + (i === pvImg ? 'is-on' : '') + t('" aria-label="Фото ') + (i + 1) + '"><img src="' + SITE + esc(g[0]) + '" alt="" loading="lazy" referrerpolicy="no-referrer"></button>'; }).join('') + '</div>' : '') +
        '</div>' +
        '<div class="pv__info">' +
          '<span class="pv__brand">' + esc(p.b) + '</span>' +
          '<h2 class="pv__name" id="pvName">' + esc(p.n) + '</h2>' +
          (p.v.length > 1 ? t('<p class="pv__label">Фасовка</p>') + packsHtml(p, v, 0) : '') +
          '<p class="pv__price">' + (v[2] ? '<b>' + money(v[2] * pvQty) + '</b>' + (off ? '<s>' + money(v[3] * pvQty) + '</s><i>−' + off + '%</i>' : '') : t('<b>Цена по запросу</b>')) + '</p>' +
          (v[2]
            ? t('<div class="pv__buy"><div class="qty"><button type="button" data-q="-1" aria-label="Меньше">−</button><span>') + pvQty + t('</span><button type="button" data-q="1" aria-label="Больше">+</button></div>') +
              '<button type="button" class="btn btn--main" data-add="' + v[0] + '" data-qty="' + pvQty + t('">В корзину</button></div>')
            : '<div class="pv__buy"><a class="btn btn--main" href="' + ask + t('" target="_blank" rel="noopener">Узнать цену в WhatsApp</a></div>')) +
          '<a class="pv__wa" href="' + ask + t('" target="_blank" rel="noopener">Задать вопрос в WhatsApp</a>') +
          '<a class="pv__wa pv__page" href="' + purl(v) + t('">Открыть страницу товара</a>') +
        '</div>' +
      '</div>' +
      '<div class="pv__more">' +
        (info
          ? (info.d.length ? t('<div class="pv__desc"><h3>Описание</h3>') + descHtml(info.d) + '</div>' : '') +
            (info.p.length || v[1] ? t('<div><h3>Характеристики</h3><dl class="pv__params">') +
              (v[1] && p.v.length > 1 ? t('<div><dt>Фасовка</dt><dd>') + esc(v[1]) + '</dd></div>' : '') +
              info.p.map(function (x) { return '<div><dt>' + esc(x[0]) + '</dt><dd>' + esc(x[1]) + '</dd></div>'; }).join('') +
              (home ? t('<div><dt>Раздел</dt><dd><a href="') + ROOT + 'magazin/folder/' + home.slug + '/" data-cat="' + home.slug + '" data-pv-close style="text-decoration:underline">' + esc(home.name) + '</a></dd></div>' : '') +
            '</dl></div>' : '')
          : '<p class="pv__wait">' + (info === null ? t('Описание не загрузилось. Спросите в WhatsApp, расскажем подробно.') : t('Загружаем описание…')) + '</p>') +
      '</div>';
  };
  var descHtml = function (d) {
    var out = '', inList = false;
    d.forEach(function (b) {
      if (b[0] === 'li') { if (!inList) { out += '<ul>'; inList = true; } out += '<li>' + esc(b[1]) + '</li>'; return; }
      if (inList) { out += '</ul>'; inList = false; }
      out += b[0] === 'h' ? '<h4>' + esc(b[1]) + '</h4>' : '<p>' + esc(b[1]) + '</p>';
    });
    return out + (inList ? '</ul>' : '');
  };
  pvBody.addEventListener('click', function (e) {
    var t = e.target.closest('[data-q],[data-img]');
    if (!t) return;
    if (t.dataset.q) pvQty = Math.max(1, Math.min(99, pvQty + parseInt(t.dataset.q, 10)));
    else pvImg = parseInt(t.dataset.img, 10) || 0;
    drawPv();
  });

  var openPv = function (id) {
    if (!byId[id]) return;
    var fresh = pv.hidden;
    pvId = id; pvQty = 1; pvImg = 0;
    if (fresh) pvFocus = document.activeElement;
    drawPv();
    pv.hidden = false;
    void pv.offsetWidth;
    pv.classList.add('is-open');
    document.documentElement.style.overflow = 'hidden';
    pvBody.scrollTop = 0;
    if (fresh) $('.pv__bar button').focus();
    if (pvInfo[id] === undefined) {
      fetch(KR.ASSET + (KR.LANG === 'uz' ? 'data/p-uz/' : 'data/p/') + id + '.json').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function (j) { pvInfo[id] = j; }, function () { pvInfo[id] = null; })
        .then(function () { if (pvId === id && !pv.hidden) drawPv(); });
    }
  };
  var hidePv = function () {
    if (pv.hidden || !pv.classList.contains('is-open')) return;
    pv.classList.remove('is-open');
    document.documentElement.style.overflow = '';
    pvId = null;
    setTimeout(function () { if (!pv.classList.contains('is-open')) pv.hidden = true; }, KR.reduce ? 0 : 400);
    if (pvFocus && pvFocus.focus) pvFocus.focus();
  };
  // закрытие убирает #p из адреса; «назад» в браузере тоже закрывает товар
  var closePv = function () {
    if (/^#p=/.test(location.hash)) history.replaceState(null, '', location.pathname + location.search);
    hidePv();
  };
  var fromHash = function () {
    var m = location.hash.match(/^#p=(\d+)/);
    if (m) openPv(m[1]); else hidePv();
  };
  window.addEventListener('hashchange', fromHash);
  KR.sheetDrag($('.pv__bar'), $('.pv__panel'), $('.pv__shade'), closePv);
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!pv.hidden) { e.preventDefault(); closePv(); }
    else if (filt.classList.contains('is-open')) { e.preventDefault(); setFilt(false); }
  }, true);

  readUrl();
  render();
  fromHash();
})();
