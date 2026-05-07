(function () {
  'use strict';

  // ── intro overlay ──
  const intro = document.getElementById('intro');
  if (intro) {
    intro.addEventListener('click', () => {
      intro.classList.add('gone');
      setTimeout(() => intro.remove(), 1300);
    });
  }

  // ── live clock in status bar ──
  function tick() {
    const d = new Date();
    const h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, '0');
    const el = document.getElementById('clock');
    if (el) el.textContent = h + ':' + m;
  }
  tick();
  setInterval(tick, 30000);

  // ── slides ──
  const slides = document.querySelectorAll('.slide');
  const total = slides.length;
  let idx = 0;
  let auto = null;

  // build progress segments
  const prog = document.getElementById('progress');
  for (let i = 0; i < total; i++) {
    const s = document.createElement('div');
    s.className = 'seg';
    prog.appendChild(s);
  }
  const segs = prog.querySelectorAll('.seg');

  function show(n, fromAuto) {
    if (n < 0) n = total - 1;
    if (n >= total) n = 0;
    idx = n;

    slides.forEach((s, i) => {
      s.classList.remove('active', 'prev');
      if (i === idx) s.classList.add('active');
      else if (i < idx) s.classList.add('prev');
    });

    segs.forEach((s, i) => {
      s.classList.remove('done', 'current');
      if (i < idx) s.classList.add('done');
      if (i === idx && auto) s.classList.add('current');
    });

    const cur = document.getElementById('cur');
    if (cur) cur.textContent = idx + 1;

    if (!fromAuto) {
      const h = document.getElementById('handHint');
      if (h && !h.classList.contains('hidden')) h.classList.add('hidden');
      const sw = document.getElementById('swipeHint');
      if (sw) {
        if (idx > 1) sw.classList.add('fade');
        else sw.classList.remove('fade');
      }
    }
  }

  // ── controls ──
  document.getElementById('prevBtn').addEventListener('click', () => {
    stopAuto();
    show(idx - 1);
  });
  document.getElementById('nextBtn').addEventListener('click', () => {
    stopAuto();
    show(idx + 1);
  });
  document.getElementById('resetBtn').addEventListener('click', () => {
    stopAuto();
    show(0);
  });

  // ── tap zones with ripple effect ──
  function ripple(x, y, zone) {
    const r = document.createElement('span');
    r.className = 'ripple';
    const rect = zone.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    r.style.width = r.style.height = size + 'px';
    r.style.left = (x - rect.left - size / 2) + 'px';
    r.style.top = (y - rect.top - size / 2) + 'px';
    zone.appendChild(r);
    setTimeout(() => r.remove(), 650);
  }

  const tl = document.getElementById('tapLeft');
  const tr = document.getElementById('tapRight');

  // On iOS, tapping is faster and feels more responsive when handled
  // synchronously. We track touchstart->touchend pairs and only treat
  // them as "taps" if the finger didn't move much (otherwise it's a swipe).
  function bindTap(zone, dir) {
    let tStartX = 0, tStartY = 0, tHandled = false;

    zone.addEventListener('touchstart', (e) => {
      tHandled = false;
      tStartX = e.touches[0].clientX;
      tStartY = e.touches[0].clientY;
    }, { passive: true });

    zone.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - tStartX;
      const dy = e.changedTouches[0].clientY - tStartY;
      if (Math.abs(dx) < 12 && Math.abs(dy) < 12) {
        tHandled = true;
        e.preventDefault();
        ripple(e.changedTouches[0].clientX, e.changedTouches[0].clientY, zone);
        stopAuto();
        show(idx + dir);
      }
    });

    zone.addEventListener('click', (e) => {
      if (tHandled) { tHandled = false; return; }   // touch already handled it
      ripple(e.clientX, e.clientY, zone);
      stopAuto();
      show(idx + dir);
    });
  }
  bindTap(tl, -1);
  bindTap(tr, +1);

  // ── keyboard ──
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === ' ') {
      e.preventDefault();
      stopAuto();
      show(idx + 1);
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      stopAuto();
      show(idx - 1);
    }
    if (e.key === 'Home') {
      stopAuto();
      show(0);
    }
  });

  // ── swipe ──
  const screen = document.getElementById('screen');
  let sx = 0, sy = 0;
  screen.addEventListener('touchstart', (e) => {
    sx = e.touches[0].clientX;
    sy = e.touches[0].clientY;
  }, { passive: true });

  screen.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - sx;
    const dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      stopAuto();
      if (dx < 0) show(idx + 1);
      else show(idx - 1);
    }
  }, { passive: true });

  // ── auto-play ──
  const autoBtn = document.getElementById('autoBtn');
  const autoLabel = document.getElementById('autoLabel');

  function stopAuto() {
    if (auto) {
      clearInterval(auto);
      auto = null;
      autoLabel.textContent = 'play';
      segs.forEach((s) => s.classList.remove('current'));
    }
  }

  function startAuto() {
    if (idx >= total - 1) show(0, true);
    segs.forEach((s, i) => {
      if (i === idx) s.classList.add('current');
    });
    auto = setInterval(() => {
      if (idx >= total - 1) {
        stopAuto();
        return;
      }
      show(idx + 1, true);
      segs.forEach((s, i) => {
        if (i === idx) s.classList.add('current');
      });
    }, 4000);
    autoLabel.textContent = 'pause';
  }

  autoBtn.addEventListener('click', () => {
    if (auto) stopAuto();
    else startAuto();
  });

  // ── petals (page-wide and inside-screen) ──
  const colors = ['#85b7eb', '#b5d4f4', '#378add', '#afa9ec', '#cecbf6', '#9bb8e0'];

  function makePetal(parent, sizeRange) {
    const svgNS = 'http://www.w3.org/2000/svg';
    const s = document.createElementNS(svgNS, 'svg');
    s.setAttribute('viewBox', '0 0 40 40');
    const c = colors[Math.floor(Math.random() * colors.length)];
    s.innerHTML =
      '<g transform="translate(20 20)">' +
      '<ellipse cx="0" cy="-9" rx="5" ry="9" fill="' + c + '" opacity="0.85"/>' +
      '<ellipse cx="0" cy="-9" rx="5" ry="9" fill="' + c + '" opacity="0.85" transform="rotate(72)"/>' +
      '<ellipse cx="0" cy="-9" rx="5" ry="9" fill="' + c + '" opacity="0.85" transform="rotate(144)"/>' +
      '<ellipse cx="0" cy="-9" rx="5" ry="9" fill="' + c + '" opacity="0.85" transform="rotate(216)"/>' +
      '<ellipse cx="0" cy="-9" rx="5" ry="9" fill="' + c + '" opacity="0.85" transform="rotate(288)"/>' +
      '<circle r="3" fill="#fff"/>' +
      '</g>';
    const sz = sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]);
    s.style.width = sz + 'px';
    s.style.height = sz + 'px';
    s.style.left = (Math.random() * 98) + '%';
    s.style.animationDuration = (8 + Math.random() * 10) + 's';
    s.style.animationDelay = (Math.random() * 10) + 's';
    parent.appendChild(s);
  }

  const ambient = document.getElementById('ambientPetals');
  for (let i = 0; i < 20; i++) makePetal(ambient, [14, 30]);

  const sp = document.getElementById('screenPetals');
  for (let i = 0; i < 10; i++) makePetal(sp, [10, 20]);

})();
