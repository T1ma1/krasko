/* KRASKO — страница товара: листание фото и количество. Корзина — в js/common.js. */
(function () {
  'use strict';
  var KR = window.KR, $ = KR.$, $$ = KR.$$;
  var main = $('#ppMain');
  $$('.pv__thumbs button').forEach(function (b) {
    b.addEventListener('click', function () {
      $$('.pv__thumbs button').forEach(function (x) { x.classList.toggle('is-on', x === b); });
      main.src = b.dataset.src;
    });
  });
  var add = $('#ppAdd'), qty = $('#ppQty'), sum = $('#ppSum'), n = 1;
  if (!add) return;
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-q]');
    if (!t || t.closest('.drawer')) return;
    n = Math.max(1, Math.min(99, n + parseInt(t.dataset.q, 10)));
    qty.textContent = n;
    add.dataset.qty = n;
    sum.textContent = KR.money(parseInt(sum.dataset.price, 10) * n);
  });
})();
