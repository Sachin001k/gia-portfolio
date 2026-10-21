/* ===========================================================
   In-site document reader.
   Any element with data-reader opens it:
     data-src       local PDF, rendered page-by-page with PDF.js
     data-embed     URL shown in an iframe instead (e.g. Drive preview)
     data-title     heading shown in the reader bar
     data-meta      small line under the heading
     data-original  "open original" link (journal / Drive page)
   The element's id becomes a shareable #hash (e.g. /research-work#read-paper1).
=========================================================== */
(function () {
  var PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
  var WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  var svg = function (d) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  };
  var I = {
    close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
    minus: svg('<path d="M5 12h14"/>'),
    plus: svg('<path d="M12 5v14M5 12h14"/>'),
    out: svg('<path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>'),
    down: svg('<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>')
  };

  var el = document.createElement('div');
  el.className = 'reader';
  el.hidden = true;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', 'reader-title');
  el.innerHTML =
    '<div class="reader-panel">' +
      '<div class="reader-bar">' +
        '<div class="reader-heading"><div class="reader-title" id="reader-title"></div><div class="reader-meta"></div></div>' +
        '<div class="reader-tools">' +
          '<span class="reader-page" aria-live="polite"></span>' +
          '<span class="reader-zoom">' +
            '<button type="button" class="reader-btn" data-act="out" aria-label="Zoom out">' + I.minus + '</button>' +
            '<span class="reader-pct">100%</span>' +
            '<button type="button" class="reader-btn" data-act="in" aria-label="Zoom in">' + I.plus + '</button>' +
          '</span>' +
          '<a class="reader-btn reader-dl" download aria-label="Download PDF" title="Download">' + I.down + '</a>' +
          '<a class="reader-btn reader-orig" target="_blank" rel="noopener" aria-label="Open original" title="Open original">' + I.out + '</a>' +
          '<button type="button" class="reader-btn reader-close" data-act="close" aria-label="Close reader">' + I.close + '</button>' +
        '</div>' +
        '<div class="reader-progress"><span></span></div>' +
      '</div>' +
      '<div class="reader-body" tabindex="0"></div>' +
    '</div>';
  document.body.appendChild(el);

  var body = el.querySelector('.reader-body');
  var bar = el.querySelector('.reader-progress span');
  var pageLabel = el.querySelector('.reader-page');
  var pct = el.querySelector('.reader-pct');
  var zoomBox = el.querySelector('.reader-zoom');
  var dl = el.querySelector('.reader-dl');
  var orig = el.querySelector('.reader-orig');

  var pdfLib, doc, scale = 1, observer, renderToken = 0, lastFocus, openedHash, pushed;

  function loadPdfJs() {
    if (pdfLib) return Promise.resolve(pdfLib);
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = PDFJS;
      s.onload = function () {
        pdfLib = window.pdfjsLib;
        pdfLib.GlobalWorkerOptions.workerSrc = WORKER;
        res(pdfLib);
      };
      s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  function setProgress(f) {
    bar.parentNode.hidden = f >= 1;
    bar.style.width = Math.round(Math.max(.04, f) * 100) + '%';
  }

  function open(trigger, fromHash) {
    lastFocus = document.activeElement;
    var d = trigger.dataset;
    el.querySelector('.reader-title').textContent = d.title || 'Document';
    el.querySelector('.reader-meta').textContent = d.meta || '';
    orig.hidden = !d.original;
    if (d.original) orig.href = d.original;
    dl.hidden = !d.src;
    if (d.src) dl.href = d.src;
    zoomBox.hidden = !d.src;
    pageLabel.textContent = '';
    body.innerHTML = '';
    el.hidden = false;
    document.documentElement.classList.add('reader-open');
    requestAnimationFrame(function () { el.classList.add('is-open'); });
    el.querySelector('.reader-close').focus();

    pushed = false;
    if (trigger.id && !fromHash) {
      openedHash = '#' + trigger.id;
      history.pushState({ reader: true }, '', openedHash);
      pushed = true;
    }

    if (d.embed) {
      setProgress(.3);
      var f = document.createElement('iframe');
      f.className = 'reader-frame';
      f.src = d.embed;
      f.title = d.title || 'Document';
      f.allow = 'autoplay';
      f.onload = function () { setProgress(1); };
      body.appendChild(f);
      return;
    }
    renderPdf(d.src);
  }

  function renderPdf(src) {
    var token = ++renderToken;
    setProgress(.04);
    loadPdfJs().then(function (lib) {
      var task = lib.getDocument({ url: src, disableAutoFetch: false });
      task.onProgress = function (p) { if (p.total) setProgress(p.loaded / p.total * .9); };
      return task.promise;
    }).then(function (pdf) {
      if (token !== renderToken) return;
      doc = pdf;
      return pdf.getPage(1).then(function (first) {
        var base = first.getViewport({ scale: 1 });
        // fit the page to the reading column
        var avail = Math.min(body.clientWidth - 32, 900);
        scale = Math.max(.5, avail / base.width);
        buildPages(base);
        setProgress(1);
      });
    }).catch(function () {
      if (token !== renderToken) return;
      setProgress(1);
      body.innerHTML = '<div class="reader-fallback"><p>This document couldn&rsquo;t be displayed here.</p>' +
        '<a class="btn" href="' + src + '" target="_blank" rel="noopener">Open the PDF</a></div>';
    });
  }

  function buildPages(base) {
    body.innerHTML = '';
    if (observer) observer.disconnect();
    pct.textContent = Math.round(scale * 100) + '%';
    pageLabel.textContent = '1 / ' + doc.numPages;
    observer = new IntersectionObserver(onVisible, { root: body, rootMargin: '600px 0px' });
    var current = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) pageLabel.textContent = e.target.dataset.page + ' / ' + doc.numPages;
      });
    }, { root: body, threshold: .5 });
    for (var n = 1; n <= doc.numPages; n++) {
      var p = document.createElement('div');
      p.className = 'reader-page-sheet';
      p.dataset.page = n;
      p.style.width = Math.floor(base.width * scale) + 'px';
      p.style.aspectRatio = base.width + ' / ' + base.height;
      body.appendChild(p);
      observer.observe(p);
      current.observe(p);
    }
  }

  function onVisible(entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting || e.target.dataset.done) return;
      var sheet = e.target;
      sheet.dataset.done = '1';
      var token = renderToken;
      doc.getPage(+sheet.dataset.page).then(function (page) {
        if (token !== renderToken) return;
        var ratio = window.devicePixelRatio || 1;
        var vp = page.getViewport({ scale: scale * ratio });
        var c = document.createElement('canvas');
        c.width = vp.width; c.height = vp.height;
        sheet.appendChild(c);
        return page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
      }).then(function () { sheet.classList.add('is-rendered'); });
    });
  }

  function zoom(step) {
    if (!doc) return;
    var top = body.scrollTop / (body.scrollHeight || 1);
    scale = Math.min(3, Math.max(.5, scale + step));
    renderToken++;
    doc.getPage(1).then(function (first) {
      buildPages(first.getViewport({ scale: 1 }));
      body.scrollTop = top * body.scrollHeight;
    });
  }

  function close(fromPop) {
    if (el.hidden) return;
    renderToken++;
    el.classList.remove('is-open');
    document.documentElement.classList.remove('reader-open');
    setTimeout(function () { el.hidden = true; body.innerHTML = ''; }, 200);
    doc = null;
    if (!fromPop && openedHash && location.hash === openedHash) {
      // opened by our own click: step back; arrived via a shared link: just drop the hash
      if (pushed) history.back();
      else history.replaceState(null, '', location.pathname + location.search);
    }
    openedHash = null;
    if (lastFocus) lastFocus.focus();
  }

  el.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]');
    if (e.target === el) return close();
    if (!b) return;
    if (b.dataset.act === 'close') close();
    if (b.dataset.act === 'in') zoom(.2);
    if (b.dataset.act === 'out') zoom(-.2);
  });
  document.addEventListener('keydown', function (e) {
    if (el.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') {
      var f = el.querySelectorAll('button:not([hidden]), a:not([hidden]), [tabindex="0"]');
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  window.addEventListener('popstate', function () {
    if (!el.hidden) close(true);
    else openFromHash();
  });

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-reader]');
    if (!t || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    open(t);
  });

  function openFromHash() {
    if (!location.hash) return;
    var t = document.getElementById(location.hash.slice(1));
    if (t && t.hasAttribute('data-reader')) { openedHash = location.hash; open(t, true); }
  }
  openFromHash();
})();
