/* ===========================================================
   Tournament gallery: one section per event, event filters,
   per-section "show all", and a lightbox (arrows, keys, swipe)
   that steps through the photos of the section you opened.
=========================================================== */
(function () {
  var groups = Array.prototype.slice.call(document.querySelectorAll('.gallery-group'));
  if (!groups.length) return;
  var LIMIT = 8;

  groups.forEach(function (g) {
    var tiles = g.querySelectorAll('.g-item');
    var more = g.querySelector('.gallery-more');
    if (tiles.length <= LIMIT) { if (more) more.hidden = true; return; }
    for (var i = LIMIT; i < tiles.length; i++) tiles[i].hidden = true;
    more.addEventListener('click', function () {
      tiles.forEach(function (t) { t.hidden = false; });
      more.hidden = true;
    });
  });

  document.querySelectorAll('.gallery-filters .chip-btn').forEach(function (c, _, all) {
    c.addEventListener('click', function () {
      var f = c.dataset.filter;
      all.forEach(function (x) { x.setAttribute('aria-pressed', x === c); });
      groups.forEach(function (g) { g.hidden = f !== 'all' && g.dataset.event !== f; });
    });
  });

  // ---- lightbox
  var lb = document.createElement('div');
  lb.className = 'lightbox';
  lb.hidden = true;
  lb.setAttribute('role', 'dialog');
  lb.setAttribute('aria-modal', 'true');
  lb.setAttribute('aria-label', 'Photo viewer');
  var ic = function (d) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>'; };
  lb.innerHTML =
    '<button class="lb-btn lb-close" type="button" aria-label="Close">' + ic('<path d="M6 6l12 12M18 6L6 18"/>') + '</button>' +
    '<button class="lb-btn lb-prev" type="button" aria-label="Previous photo">' + ic('<path d="M15 6l-6 6 6 6"/>') + '</button>' +
    '<figure class="lb-stage"><img alt=""><figcaption><span class="lb-cap"></span><span class="lb-count"></span></figcaption></figure>' +
    '<button class="lb-btn lb-next" type="button" aria-label="Next photo">' + ic('<path d="M9 6l6 6-6 6"/>') + '</button>';
  document.body.appendChild(lb);
  var img = lb.querySelector('img'), cap = lb.querySelector('.lb-cap'), count = lb.querySelector('.lb-count');
  var list = [], idx = 0, lastFocus;

  function show(i) {
    idx = (i + list.length) % list.length;
    var t = list[idx], thumb = t.querySelector('img');
    img.classList.remove('in');
    img.onload = function () { img.classList.add('in'); };
    img.src = thumb.getAttribute('src');
    img.alt = thumb.alt;
    cap.textContent = t.dataset.caption || thumb.alt;
    count.textContent = (idx + 1) + ' / ' + list.length;
  }
  function open(t) {
    lastFocus = document.activeElement;
    // browse every photo of this tournament, including ones still collapsed
    list = Array.prototype.slice.call(t.closest('.gallery-group').querySelectorAll('.g-item'));
    lb.hidden = false;
    document.documentElement.classList.add('reader-open');
    requestAnimationFrame(function () { lb.classList.add('is-open'); });
    show(list.indexOf(t));
    lb.querySelector('.lb-close').focus();
  }
  function close() {
    lb.classList.remove('is-open');
    document.documentElement.classList.remove('reader-open');
    setTimeout(function () { lb.hidden = true; }, 180);
    if (lastFocus) lastFocus.focus();
  }

  document.querySelectorAll('.g-item').forEach(function (t) {
    t.addEventListener('click', function (e) { e.preventDefault(); open(t); });
  });
  lb.querySelector('.lb-close').addEventListener('click', close);
  lb.querySelector('.lb-prev').addEventListener('click', function () { show(idx - 1); });
  lb.querySelector('.lb-next').addEventListener('click', function () { show(idx + 1); });
  lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
  document.addEventListener('keydown', function (e) {
    if (lb.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(idx - 1);
    if (e.key === 'ArrowRight') show(idx + 1);
  });
  var x0 = null;
  lb.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', function (e) {
    if (x0 === null) return;
    var dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 40) show(idx + (dx < 0 ? 1 : -1));
    x0 = null;
  });
})();
