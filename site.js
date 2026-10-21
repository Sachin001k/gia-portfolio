/* ===========================================================
   Site header: compact-on-scroll + mobile menu toggle
=========================================================== */
(function () {
  var header = document.querySelector('.site-header');
  if (!header) return;
  var toggle = header.querySelector('.menu-toggle');
  var nav = header.querySelector('.site-nav');

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      header.classList.toggle('scrolled', window.scrollY > 8);
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  function setOpen(open) {
    toggle.setAttribute('aria-expanded', open);
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    nav.classList.toggle('open', open);
  }
  toggle.addEventListener('click', function () {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('open')) { setOpen(false); toggle.focus(); }
  });
  document.addEventListener('click', function (e) {
    if (nav.classList.contains('open') && !header.contains(e.target)) setOpen(false);
  });
  // close the dropdown if the window grows back to desktop width
  window.matchMedia('(min-width: 901px)').addEventListener('change', function (m) { if (m.matches) setOpen(false); });
})();
