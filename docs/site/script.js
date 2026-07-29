(function () {
  var root = document.documentElement;
  var toggle = document.getElementById('themeToggle');
  var mql = window.matchMedia('(prefers-color-scheme: dark)');

  function applyLabel() {
    var explicit = root.getAttribute('data-theme');
    toggle.textContent = 'TEMA · ' + (explicit ? explicit.toUpperCase() : 'AUTO');
  }
  function toggleTheme() {
    var current = root.getAttribute('data-theme');
    if (!current) {
      root.setAttribute('data-theme', mql.matches ? 'light' : 'dark');
    } else if (current === 'dark') {
      root.setAttribute('data-theme', 'light');
    } else {
      root.removeAttribute('data-theme');
    }
    applyLabel();
  }
  toggle.addEventListener('click', toggleTheme);
  toggle.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleTheme(); }
  });
  applyLabel();

  var navButtons = Array.prototype.slice.call(document.querySelectorAll('.voyage-nav button'));
  navButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var target = document.getElementById(btn.getAttribute('data-target'));
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  var sections = navButtons
    .map(function (btn) { return document.getElementById(btn.getAttribute('data-target')); })
    .filter(Boolean);

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      var id = entry.target.id;
      navButtons.forEach(function (btn) {
        btn.classList.toggle('active', btn.getAttribute('data-target') === id);
      });
    });
  }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });
  sections.forEach(function (s) { io.observe(s); });

  var fadeEls = Array.prototype.slice.call(document.querySelectorAll('.fade-in'));
  var fadeIo = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        fadeIo.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  fadeEls.forEach(function (el) { fadeIo.observe(el); });

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- Hero canvas: abstract gulf coastline + boat + wind vector ----
  function makeGulfRenderer(canvas, opts) {
    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w, h;
    var showContours = opts && opts.contours !== false;
    var showWind = opts && opts.wind !== false;

    function resize() {
      var rect = canvas.parentElement.getBoundingClientRect();
      w = rect.width || canvas.clientWidth || 300;
      h = canvas.clientHeight || rect.height || 120;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    window.addEventListener('resize', resize);
    resize();

    var coastPoints = [
      [-0.05, 0.62], [0.08, 0.58], [0.18, 0.66], [0.30, 0.60],
      [0.42, 0.70], [0.55, 0.62], [0.68, 0.72], [0.80, 0.64],
      [0.92, 0.70], [1.05, 0.60]
    ];

    function coastY(xNorm) {
      var pts = coastPoints;
      var x = xNorm;
      for (var i = 0; i < pts.length - 1; i++) {
        if (x >= pts[i][0] && x <= pts[i + 1][0]) {
          var t = (x - pts[i][0]) / (pts[i + 1][0] - pts[i][0]);
          return pts[i][1] + t * (pts[i + 1][1] - pts[i][1]);
        }
      }
      return pts[pts.length - 1][1];
    }

    function draw(time) {
      ctx.clearRect(0, 0, w, h);

      var grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, 'rgba(10,20,23,0)');
      grad.addColorStop(1, 'rgba(10,20,23,0.55)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      if (showContours) {
        var contourCount = 5;
        for (var c = 0; c < contourCount; c++) {
          var offset = c * (h * 0.05);
          ctx.beginPath();
          for (var x = -0.05 * w; x <= 1.05 * w; x += 6) {
            var xn = x / w;
            var y = coastY(xn) * h - offset - c * 4;
            if (x === -0.05 * w) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.strokeStyle = 'rgba(60,110,118,' + (0.5 - c * 0.08) + ')';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      ctx.beginPath();
      for (var xi = -0.05 * w; xi <= 1.05 * w; xi += 6) {
        var xni = xi / w;
        var yi = coastY(xni) * h;
        if (xi === -0.05 * w) ctx.moveTo(xi, yi); else ctx.lineTo(xi, yi);
      }
      ctx.lineTo(1.05 * w, h + 20);
      ctx.lineTo(-0.05 * w, h + 20);
      ctx.closePath();
      ctx.fillStyle = 'rgba(18,34,40,0.9)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(200,155,60,0.5)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (var xj = -0.05 * w; xj <= 1.05 * w; xj += 6) {
        var xnj = xj / w;
        var yj = coastY(xnj) * h;
        if (xj === -0.05 * w) ctx.moveTo(xj, yj); else ctx.lineTo(xj, yj);
      }
      ctx.stroke();

      // Regatta course as a closed loop (real windward-leeward courses are
      // loops) so the boat travels continuously in one direction — no
      // back-and-forth "slider" motion.
      var loopCx = w * 0.5, loopCy = h * 0.30, loopRx = w * 0.34, loopRy = h * 0.15;
      var angle = reduceMotion ? 0.9 : ((time / 9000) % 1) * Math.PI * 2;
      var bx = loopCx + loopRx * Math.cos(angle);
      var by = loopCy + loopRy * Math.sin(angle);

      ctx.beginPath();
      ctx.ellipse(loopCx, loopCy, loopRx, loopRy, 0, 0, Math.PI * 2);
      ctx.setLineDash([2, 6]);
      ctx.strokeStyle = 'rgba(220,190,120,0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.arc(bx, by, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#e0bd6d';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(bx, by, 9, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(224,189,109,0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();

      if (showWind) {
        var wx = w * 0.86, wy = h * 0.16;
        var windAngle = reduceMotion ? -0.5 : -0.5 + 0.1 * Math.sin(time / 4000);
        var len = 34;
        ctx.save();
        ctx.translate(wx, wy);
        ctx.rotate(windAngle);
        ctx.beginPath();
        ctx.moveTo(-len / 2, 0);
        ctx.lineTo(len / 2, 0);
        ctx.moveTo(len / 2, 0);
        ctx.lineTo(len / 2 - 8, -5);
        ctx.moveTo(len / 2, 0);
        ctx.lineTo(len / 2 - 8, 5);
        ctx.strokeStyle = 'rgba(140,180,180,0.6)';
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.restore();
      }

      if (!reduceMotion) requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
    if (reduceMotion) draw(0);
  }

  makeGulfRenderer(document.getElementById('chart-canvas'), { contours: true, wind: true });

  // ---- Ambient race strip (Live tab): closed-loop course, decorative ----
  var raceCanvas = document.getElementById('raceCanvas');
  if (raceCanvas) {
    var rctx = raceCanvas.getContext('2d');
    var rDpr = Math.min(window.devicePixelRatio || 1, 2);
    var rw, rh;
    function raceResize() {
      var rect = raceCanvas.parentElement.getBoundingClientRect();
      rw = rect.width; rh = rect.height;
      raceCanvas.width = rw * rDpr; raceCanvas.height = rh * rDpr;
      rctx.setTransform(rDpr, 0, 0, rDpr, 0, 0);
    }
    window.addEventListener('resize', raceResize);
    raceResize();

    function drawRace(time) {
      rctx.clearRect(0, 0, rw, rh);
      var grad = rctx.createLinearGradient(0, 0, 0, rh);
      grad.addColorStop(0, '#0d1c20');
      grad.addColorStop(1, '#132a30');
      rctx.fillStyle = grad;
      rctx.fillRect(0, 0, rw, rh);

      var loopCx = rw * 0.5, loopCy = rh * 0.55, loopRx = rw * 0.42, loopRy = rh * 0.32;
      rctx.beginPath();
      rctx.ellipse(loopCx, loopCy, loopRx, loopRy, 0, 0, Math.PI * 2);
      rctx.setLineDash([2, 6]);
      rctx.strokeStyle = 'rgba(220,190,120,0.4)';
      rctx.lineWidth = 1;
      rctx.stroke();
      rctx.setLineDash([]);

      var angle = reduceMotion ? 1.4 : ((time / 7000) % 1) * Math.PI * 2;
      var bx = loopCx + loopRx * Math.cos(angle);
      var by = loopCy + loopRy * Math.sin(angle);

      rctx.beginPath();
      rctx.arc(bx, by, 9, 0, Math.PI * 2);
      rctx.fillStyle = 'rgba(224,189,109,0.16)';
      rctx.fill();
      rctx.beginPath();
      rctx.arc(bx, by, 4.5, 0, Math.PI * 2);
      rctx.fillStyle = '#e0bd6d';
      rctx.fill();

      if (!reduceMotion) requestAnimationFrame(drawRace);
    }
    requestAnimationFrame(drawRace);
    if (reduceMotion) drawRace(0);
  }

  // ---- Map canvas (Mappa tab): stylized Gulf of Naples chart with pinned
  // markers for viewpoints and race buoys, in chart or satellite style ----
  var mapCanvas = document.getElementById('mapCanvas');
  var mapPanel = document.getElementById('mapPanel');
  if (mapCanvas && mapPanel) {
    var mctx = mapCanvas.getContext('2d');
    var mDpr = Math.min(window.devicePixelRatio || 1, 2);
    var mw, mh;
    var layerMode = 'chart';
    var satTexture = null, satTexW = 0, satTexH = 0;
    var lastFrameTime = 0;

    function mapResize() {
      var rect = mapPanel.getBoundingClientRect();
      mw = rect.width; mh = rect.height;
      mapCanvas.width = mw * mDpr; mapCanvas.height = mh * mDpr;
      mctx.setTransform(mDpr, 0, 0, mDpr, 0, 0);
    }
    window.addEventListener('resize', mapResize);
    mapResize();

    // Stylized outline of the Naples shoreline: Posillipo cape reaching into
    // the bay, the city crescent, then rising toward Vesuvius — not
    // GPS-accurate, but recognizable, in the spirit of a hand-drawn chart.
    var coastPoints = [
      [-0.05, 0.64], [0.10, 0.70], [0.22, 0.50], [0.32, 0.72],
      [0.42, 0.62], [0.54, 0.74], [0.66, 0.58], [0.80, 0.76],
      [0.94, 0.66], [1.05, 0.72]
    ];
    function coastY(xNorm) {
      var pts = coastPoints;
      for (var i = 0; i < pts.length - 1; i++) {
        if (xNorm >= pts[i][0] && xNorm <= pts[i + 1][0]) {
          var t = (xNorm - pts[i][0]) / (pts[i + 1][0] - pts[i][0]);
          return pts[i][1] + t * (pts[i + 1][1] - pts[i][1]);
        }
      }
      return pts[pts.length - 1][1];
    }

    var VANTAGE_POINTS = [
      { id: 'castel-ovo', x: 0.42, drop: 0.07 },
      { id: 'pizzofalcone', x: 0.66, drop: 0.05 },
      { id: 'posillipo', x: 0.22, drop: 0.09 },
      { id: 'mergellina', x: 0.32, drop: 0.06 }
    ];
    var BUOY_ANGLES = [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3];
    var activeMarkerId = null;
    var visibleIds = null; // null = all visible

    function markerAnchor(vp) {
      return { x: mw * vp.x, y: mh * (coastY(vp.x) + vp.drop) };
    }

    function drawPin(ctx, x, y, headR, color) {
      var headCy = y - 9;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - headR * 0.55, headCy + headR * 0.3);
      ctx.lineTo(x + headR * 0.55, headCy + headR * 0.3);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, headCy, headR, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = 'rgba(10,20,23,0.85)';
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, headCy, headR * 0.36, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(10,20,23,0.9)';
      ctx.fill();
      return headCy;
    }

    function ensureSatTexture(w, h) {
      var rw2 = Math.round(w), rh2 = Math.round(h);
      if (satTexture && satTexW === rw2 && satTexH === rh2) return satTexture;
      var off = document.createElement('canvas');
      off.width = rw2; off.height = rh2;
      var octx = off.getContext('2d');
      octx.fillStyle = '#1c2414';
      octx.fillRect(0, 0, rw2, rh2);
      var seed = 42;
      function rand() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
      var tones = ['rgba(70,95,45,0.35)', 'rgba(95,110,60,0.3)', 'rgba(125,100,55,0.25)', 'rgba(45,75,40,0.3)'];
      for (var i = 0; i < 36; i++) {
        var bx = rand() * rw2, by = rand() * rh2, r = 8 + rand() * 24;
        octx.fillStyle = tones[Math.floor(rand() * tones.length)];
        octx.beginPath(); octx.arc(bx, by, r, 0, Math.PI * 2); octx.fill();
      }
      satTexture = off; satTexW = rw2; satTexH = rh2;
      return off;
    }

    function drawMap(time) {
      lastFrameTime = time;
      if (layerAnimStart !== null) {
        var animT = Math.min(1, (time - layerAnimStart) / LAYER_ANIM_MS);
        layerMix = layerAnimFrom + (layerAnimTo - layerAnimFrom) * animT;
        if (animT >= 1) layerAnimStart = null;
      }
      var chartAlpha = 1 - layerMix, satAlpha = layerMix;

      mctx.clearRect(0, 0, mw, mh);

      var waterTop = lerpColor('#0d2126', '#0e1a1f', layerMix);
      var waterBottom = lerpColor('#153138', '#132a30', layerMix);
      var coastStroke = lerpColor('#c89b3c', '#b4be96', layerMix);
      var contourStroke = '60,110,118';

      var grad = mctx.createLinearGradient(0, 0, 0, mh);
      grad.addColorStop(0, waterTop);
      grad.addColorStop(1, waterBottom);
      mctx.fillStyle = grad;
      mctx.fillRect(0, 0, mw, mh);

      if (chartAlpha > 0.01) {
        mctx.save();
        mctx.globalAlpha = chartAlpha;
        for (var c = 0; c < 4; c++) {
          mctx.beginPath();
          for (var x = -0.05 * mw; x <= 1.05 * mw; x += 8) {
            var xn = x / mw;
            var y = coastY(xn) * mh - (c + 1) * (mh * 0.055);
            if (x === -0.05 * mw) mctx.moveTo(x, y); else mctx.lineTo(x, y);
          }
          mctx.strokeStyle = 'rgba(' + contourStroke + ',' + (0.4 - c * 0.08) + ')';
          mctx.lineWidth = 1;
          mctx.stroke();
        }
        mctx.font = '9px -apple-system, sans-serif';
        mctx.fillStyle = 'rgba(150,195,195,0.5)';
        mctx.fillText('-8 m', mw * 0.18, coastY(0.18) * mh - mh * 0.11);
        mctx.fillText('-22 m', mw * 0.62, coastY(0.62) * mh - mh * 0.16);
        mctx.restore();
      }

      // Vesuvius, hazy, across the bay — same in both layer modes.
      mctx.save();
      mctx.globalAlpha = 0.28;
      mctx.fillStyle = lerpColor('#5b6a6c', '#3c4a3a', layerMix);
      mctx.beginPath();
      mctx.moveTo(mw * 0.86, mh * 0.30);
      mctx.lineTo(mw * 0.90, mh * 0.16);
      mctx.lineTo(mw * 0.925, mh * 0.20);
      mctx.lineTo(mw * 0.96, mh * 0.30);
      mctx.closePath();
      mctx.fill();
      mctx.restore();

      // Land mass + coastline, crossfaded between flat chart fill and
      // satellite-style texture rather than swapped instantly.
      var landPath = new Path2D();
      for (var xi = -0.05 * mw; xi <= 1.05 * mw; xi += 8) {
        var xni = xi / mw;
        var yi = coastY(xni) * mh;
        if (xi === -0.05 * mw) landPath.moveTo(xi, yi); else landPath.lineTo(xi, yi);
      }
      landPath.lineTo(1.05 * mw, mh + 20);
      landPath.lineTo(-0.05 * mw, mh + 20);
      landPath.closePath();

      if (chartAlpha > 0.01) {
        mctx.save();
        mctx.globalAlpha = chartAlpha;
        mctx.fillStyle = 'rgba(22,40,46,0.95)';
        mctx.fill(landPath);
        mctx.restore();
      }
      if (satAlpha > 0.01) {
        mctx.save();
        mctx.globalAlpha = satAlpha;
        mctx.clip(landPath);
        mctx.drawImage(ensureSatTexture(mw, mh), 0, 0, mw, mh);
        mctx.restore();
      }
      mctx.strokeStyle = coastStroke;
      mctx.lineWidth = 1.3;
      mctx.stroke(landPath);

      // Regatta course: closed loop with buoys, boat circling continuously.
      var loopCx = mw * 0.56, loopCy = mh * 0.30, loopRx = mw * 0.30, loopRy = mh * 0.13;
      mctx.beginPath();
      mctx.ellipse(loopCx, loopCy, loopRx, loopRy, 0, 0, Math.PI * 2);
      mctx.setLineDash([2, 5]);
      mctx.strokeStyle = 'rgba(220,190,120,0.4)';
      mctx.lineWidth = 1;
      mctx.stroke();
      mctx.setLineDash([]);

      BUOY_ANGLES.forEach(function (a) {
        var bx = loopCx + loopRx * Math.cos(a);
        var by = loopCy + loopRy * Math.sin(a);
        mctx.save();
        mctx.translate(bx, by);
        mctx.rotate(Math.PI / 4);
        mctx.fillStyle = 'rgba(224,150,60,0.95)';
        mctx.fillRect(-3.5, -3.5, 7, 7);
        mctx.restore();
      });

      var angle = reduceMotion ? 0.6 : ((time / 9000) % 1) * Math.PI * 2;
      var boatX = loopCx + loopRx * Math.cos(angle);
      var boatY = loopCy + loopRy * Math.sin(angle);
      mctx.beginPath();
      mctx.arc(boatX, boatY, 4, 0, Math.PI * 2);
      mctx.fillStyle = '#e0bd6d';
      mctx.fill();

      // Vantage point pins.
      VANTAGE_POINTS.forEach(function (vp) {
        var anchor = markerAnchor(vp);
        var isActive = vp.id === activeMarkerId;
        var isVisible = !visibleIds || visibleIds.indexOf(vp.id) !== -1;
        mctx.globalAlpha = isVisible ? 1 : 0.25;

        if (isActive) {
          mctx.beginPath();
          mctx.arc(anchor.x, anchor.y - 9, 15, 0, Math.PI * 2);
          mctx.fillStyle = 'rgba(200,155,60,0.25)';
          mctx.fill();
        }
        drawPin(mctx, anchor.x, anchor.y, isActive ? 8 : 6, isActive ? '#e0bd6d' : '#c89b3c');
        mctx.globalAlpha = 1;
      });

      requestAnimationFrame(drawMap);
    }
    requestAnimationFrame(drawMap);

    function hitTestMarker(px, py) {
      for (var i = 0; i < VANTAGE_POINTS.length; i++) {
        var anchor = markerAnchor(VANTAGE_POINTS[i]);
        var dx = anchor.x - px, dy = (anchor.y - 9) - py;
        if (Math.sqrt(dx * dx + dy * dy) <= 15) return VANTAGE_POINTS[i].id;
      }
      return null;
    }

    var sheetList = document.getElementById('sheetList');
    var mapSheet = document.getElementById('mapSheet');

    function selectMarker(id) {
      activeMarkerId = id;
      if (sheetList) {
        Array.prototype.slice.call(sheetList.querySelectorAll('.vp-row-i')).forEach(function (row) {
          row.classList.toggle('active', row.getAttribute('data-id') === id);
        });
        var target = sheetList.querySelector('.vp-row-i[data-id="' + id + '"]');
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          if (mapSheet) mapSheet.classList.add('expanded');
        }
      }
    }

    mapCanvas.addEventListener('click', function (e) {
      var rect = mapCanvas.getBoundingClientRect();
      var id = hitTestMarker(e.clientX - rect.left, e.clientY - rect.top);
      if (id) selectMarker(id);
    });

    if (sheetList) {
      sheetList.addEventListener('click', function (e) {
        var row = e.target.closest ? e.target.closest('.vp-row-i') : null;
        if (row) selectMarker(row.getAttribute('data-id'));
      });
    }

    // ---- Filter chips + search ----
    var mapChips = document.getElementById('mapChips');
    var mapSearch = document.getElementById('mapSearch');
    var sheetCount = document.getElementById('sheetCount');

    function applyFilters() {
      var activeChip = mapChips ? mapChips.querySelector('.chip.active') : null;
      var filter = activeChip ? activeChip.getAttribute('data-filter') : 'all';
      var query = mapSearch ? mapSearch.value.trim().toLowerCase() : '';
      var rows = sheetList ? Array.prototype.slice.call(sheetList.querySelectorAll('.vp-row-i')) : [];
      var visible = [];

      rows.forEach(function (row) {
        var tags = (row.getAttribute('data-tags') || '').split(/\s+/);
        var name = row.querySelector('.name').textContent.toLowerCase();
        var matchesFilter = filter === 'all' || tags.indexOf(filter) !== -1;
        var matchesQuery = !query || name.indexOf(query) !== -1;
        var show = matchesFilter && matchesQuery;
        row.classList.toggle('hidden-by-filter', !show);
        if (show) visible.push(row.getAttribute('data-id'));
      });

      visibleIds = (filter === 'all' && !query) ? null : visible;
      if (sheetCount) sheetCount.textContent = visible.length + (visible.length === 1 ? ' vicino a te' : ' vicini a te');
      if (query && visible.length) selectMarker(visible[0]);
    }

    var chipIndicator = document.getElementById('chipIndicator');
    if (mapChips) {
      var chipButtons = Array.prototype.slice.call(mapChips.querySelectorAll('.chip'));
      mapChips.addEventListener('click', function (e) {
        var chip = e.target.closest ? e.target.closest('.chip') : null;
        if (!chip) return;
        var index = chipButtons.indexOf(chip);
        chipButtons.forEach(function (c) { c.classList.toggle('active', c === chip); });
        if (chipIndicator && index >= 0) chipIndicator.style.transform = 'translateX(' + (index * 100) + '%)';
        applyFilters();
      });
    }

    var mapSearchClear = document.getElementById('mapSearchClear');
    if (mapSearch) {
      mapSearch.addEventListener('input', function () {
        if (mapSearchClear) mapSearchClear.hidden = mapSearch.value.length === 0;
        applyFilters();
      });
    }
    if (mapSearchClear) {
      mapSearchClear.addEventListener('click', function () {
        mapSearch.value = '';
        mapSearchClear.hidden = true;
        mapSearch.focus();
        applyFilters();
      });
    }

    // ---- Layer toggle (nautical chart / satellite-style), crossfaded ----
    var LAYER_ANIM_MS = 340;
    var layerMix = 0; // 0 = chart, 1 = satellite
    var layerAnimFrom = 0, layerAnimTo = 0, layerAnimStart = null;
    var layerToggle = document.getElementById('layerToggle');
    if (layerToggle) {
      layerToggle.addEventListener('click', function () {
        layerMode = layerMode === 'chart' ? 'satellite' : 'chart';
        layerAnimFrom = layerMix;
        layerAnimTo = layerMode === 'chart' ? 0 : 1;
        layerAnimStart = lastFrameTime;
        layerToggle.classList.toggle('active', layerMode === 'satellite');
      });
    }
    function lerpChannel(a, b, t) { return Math.round(a + (b - a) * t); }
    function lerpColor(hexA, hexB, t) {
      var ra = parseInt(hexA.slice(1, 3), 16), ga = parseInt(hexA.slice(3, 5), 16), ba = parseInt(hexA.slice(5, 7), 16);
      var rb = parseInt(hexB.slice(1, 3), 16), gb = parseInt(hexB.slice(3, 5), 16), bb = parseInt(hexB.slice(5, 7), 16);
      return 'rgb(' + lerpChannel(ra, rb, t) + ',' + lerpChannel(ga, gb, t) + ',' + lerpChannel(ba, bb, t) + ')';
    }

    // ---- Compass FAB: orient-to-north pulse ----
    var compassFab = document.getElementById('compassFab');
    if (compassFab) {
      compassFab.addEventListener('click', function () {
        compassFab.animate(
          [{ transform: 'scale(1)' }, { transform: 'scale(0.85)' }, { transform: 'scale(1)' }],
          { duration: 320, easing: 'ease' }
        );
      });
    }

    // ---- AR teaser tooltip ----
    var arTeaser = document.getElementById('arTeaser');
    var arTooltip = document.getElementById('arTooltip');
    if (arTeaser && arTooltip) {
      arTeaser.addEventListener('click', function () {
        arTooltip.hidden = !arTooltip.hidden;
      });
      document.addEventListener('click', function (e) {
        if (!arTooltip.hidden && e.target !== arTeaser && !arTeaser.contains(e.target) && e.target !== arTooltip) {
          arTooltip.hidden = true;
        }
      });
    }

    // ---- Bottom sheet: draggable between peek and expanded ----
    var sheetHandle = document.getElementById('sheetHandle');
    if (mapSheet && sheetHandle) {
      var COLLAPSED_Y = 280;
      var EXPANDED_Y = 30;
      var dragStartY = 0;
      var dragStartTranslate = COLLAPSED_Y;
      var dragging = false;

      function currentTranslate() {
        return mapSheet.classList.contains('expanded') ? EXPANDED_Y : COLLAPSED_Y;
      }

      function onPointerDown(e) {
        dragging = true;
        dragStartY = e.clientY;
        dragStartTranslate = currentTranslate();
        mapSheet.classList.add('dragging');
        sheetHandle.setPointerCapture(e.pointerId);
      }
      function onPointerMove(e) {
        if (!dragging) return;
        var delta = e.clientY - dragStartY;
        var next = Math.min(COLLAPSED_Y, Math.max(EXPANDED_Y, dragStartTranslate + delta));
        mapSheet.style.transform = 'translateY(' + next + 'px)';
      }
      function onPointerUp(e) {
        if (!dragging) return;
        dragging = false;
        mapSheet.classList.remove('dragging');
        var moved = Math.abs(e.clientY - dragStartY);
        mapSheet.style.transform = '';
        if (moved < 6) {
          mapSheet.classList.toggle('expanded');
        } else {
          var rect = mapSheet.getBoundingClientRect();
          var midpoint = (COLLAPSED_Y + EXPANDED_Y) / 2;
          var current = dragStartTranslate + (e.clientY - dragStartY);
          mapSheet.classList.toggle('expanded', current < midpoint);
        }
        sheetHandle.setAttribute('aria-expanded', mapSheet.classList.contains('expanded') ? 'true' : 'false');
      }

      sheetHandle.addEventListener('pointerdown', onPointerDown);
      sheetHandle.addEventListener('pointermove', onPointerMove);
      sheetHandle.addEventListener('pointerup', onPointerUp);
      sheetHandle.addEventListener('pointercancel', onPointerUp);
    }

    // ---- "Naviga" buttons inside the list ----
    if (sheetList) {
      Array.prototype.slice.call(sheetList.querySelectorAll('.nav-btn')).forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          btn.animate(
            [{ transform: 'scale(1)' }, { transform: 'scale(0.8)' }, { transform: 'scale(1)' }],
            { duration: 260, easing: 'ease' }
          );
        });
      });
    }
  }

  // ---- Phone demo: tab switching ----
  var phone = document.getElementById('phone');
  if (phone) {
    var tabs = Array.prototype.slice.call(phone.querySelectorAll('.app-tab'));
    var panels = Array.prototype.slice.call(phone.querySelectorAll('.app-panel'));
    function goToTab(name) {
      var tab = tabs.filter(function (t) { return t.getAttribute('data-panel') === name; })[0];
      if (!tab) return;
      tabs.forEach(function (t) { t.classList.toggle('active', t === tab); });
      panels.forEach(function (p) { p.classList.toggle('active', p.getAttribute('data-panel') === name); });
    }
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () { goToTab(tab.getAttribute('data-panel')); });
    });

    // ---- Live panel: link-cards jump straight into the module they surface ----
    Array.prototype.slice.call(phone.querySelectorAll('.live-link-card')).forEach(function (card) {
      card.addEventListener('click', function () { goToTab(card.getAttribute('data-goto')); });
    });
  }

  // ---- Live panel: simulated connection loss / fallback ----
  var simulateBtn = document.getElementById('simulateLoss');
  var fallbackBanner = document.getElementById('fallbackBanner');
  var livePill = document.getElementById('livePill');
  var liveFeed = document.getElementById('liveFeed');
  var liveAge = document.getElementById('liveAge');
  if (simulateBtn && fallbackBanner && livePill) {
    var signalLost = false;
    simulateBtn.addEventListener('click', function () {
      signalLost = !signalLost;
      fallbackBanner.hidden = !signalLost;
      liveFeed.classList.toggle('stale', signalLost);
      livePill.classList.toggle('stale', signalLost);
      livePill.textContent = signalLost ? 'ultimo stato noto' : 'regata in corso';
      liveAge.textContent = signalLost ? '48 secondi fa' : '3 secondi fa';
      simulateBtn.textContent = signalLost ? 'Ripristina segnale' : 'Simula interruzione segnale';
    });
  }

  // ---- Game panel: prediction selection ----
  var choiceRow = document.getElementById('choiceRow');
  var gameConfirm = document.getElementById('gameConfirm');
  if (choiceRow && gameConfirm) {
    var choiceButtons = Array.prototype.slice.call(choiceRow.querySelectorAll('.choice-btn'));
    choiceButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        choiceButtons.forEach(function (b) { b.classList.toggle('selected', b === btn); });
        gameConfirm.hidden = false;
        gameConfirm.textContent = 'Previsione inviata: ' + btn.getAttribute('data-choice') + ' — in palio ' + btn.querySelector('.odds').textContent.replace('x', '') + ' punti se corretta.';
      });
    });
  }
})();
