// Class Action Games: the site's only script. No trackers, no cookies, nothing loaded from elsewhere.
// 1) the light/dark switch (remembered in this browser only), 2) the looping clips (Pause/Play buttons,
// played only while on screen, never by themselves for people who asked for reduced motion),
// 3) the copy buttons in the press kits. Without the script the page still works: the switch and the copy
// buttons stay hidden and the clips keep their native controls.
(function () {
  var root = document.documentElement;
  var KEY = 'cag-theme';
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  // One polite status line for screen readers ("Copied: tagline").
  var live = document.createElement('p');
  live.className = 'sr-only';
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  document.body.appendChild(live);
  function announce(text) {
    live.textContent = '';
    setTimeout(function () { live.textContent = text; }, 60);
  }

  function current() {
    var t = root.getAttribute('data-theme');
    if (t === 'light' || t === 'dark') return t;
    return mq && mq.matches ? 'dark' : 'light';
  }
  function label(btn) {
    var next = current() === 'dark' ? 'light' : 'dark';
    btn.setAttribute('aria-label', 'Switch to ' + next + ' mode');
    btn.setAttribute('title', 'Switch to ' + next + ' mode');
  }
  var toggle = document.querySelector('.theme-toggle');
  if (toggle) {
    toggle.hidden = false;
    label(toggle);
    toggle.addEventListener('click', function () {
      var next = current() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem(KEY, next); } catch (e) { /* private window: the switch still works for this page */ }
      label(toggle);
    });
    if (mq && mq.addEventListener) mq.addEventListener('change', function () { label(toggle); });
  }

  // Looping clips. The HTML ships them with native controls and preload="none"; here the controls give way
  // to a visible Pause/Play button. A clip plays while at least a quarter of it is on screen, unless its
  // button paused it or the visitor asked for reduced motion (then it waits for Play).
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var clips = [];
  document.querySelectorAll('video.clip-video').forEach(function (v) {
    var box = v.parentElement;
    var btn = box && box.querySelector('.clip-toggle');
    if (!btn) return;
    var t = btn.querySelector('.t');
    var c = { v: v, held: reduce, seen: false };
    function sync() {
      var playing = !v.paused;
      t.textContent = playing ? 'Pause' : 'Play';
      btn.setAttribute('data-state', playing ? 'playing' : 'paused');
    }
    c.go = function () {
      if (c.held || !c.seen) { v.pause(); return; }
      var p = v.play();
      if (p && p.catch) p.catch(function () { /* blocked or not loaded yet: the button still offers Play */ sync(); });
    };
    v.controls = false;
    btn.hidden = false;
    v.addEventListener('play', sync);
    v.addEventListener('pause', sync);
    btn.addEventListener('click', function () {
      if (v.paused) { c.held = false; c.seen = true; c.go(); } else { c.held = true; v.pause(); }
    });
    sync();
    clips.push(c);
  });
  if (clips.length) {
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          for (var i = 0; i < clips.length; i++) {
            if (clips[i].v === e.target) { clips[i].seen = e.isIntersecting; clips[i].go(); }
          }
        });
      }, { threshold: 0.25 });
      clips.forEach(function (c) { io.observe(c.v); });
    } else {
      clips.forEach(function (c) { c.seen = true; c.go(); });
    }
  }

  // Copy buttons: data-copy names the element whose text is copied.
  document.querySelectorAll('[data-copy]').forEach(function (b) {
    b.hidden = false;
    b.addEventListener('click', function () {
      var el = document.getElementById(b.getAttribute('data-copy'));
      if (!el) return;
      var text = el.innerText.replace(/\n{3,}/g, '\n\n').trim();
      var label = b.querySelector('.t');
      var what = (b.getAttribute('aria-label') || '').replace(/^Copy /, '');
      var done = function (ok) {
        announce(ok ? 'Copied: ' + what : 'Could not copy. Select the text and copy it instead.');
        if (!label) return;
        label.textContent = ok ? 'Copied' : 'Select and copy';
        b.setAttribute('data-done', '');
        clearTimeout(b._t);
        b._t = setTimeout(function () { label.textContent = 'Copy'; b.removeAttribute('data-done'); }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
      } else {
        done(false);
      }
    });
  });
})();
