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

  // ---- Live race broadcast (Live tab): aerial Gulf-of-Naples "stadium
  // course" with two tacking boats, wake trails, and a sports-broadcast
  // score-bug — modelled after America's Cup live-coverage graphics
  // rather than the abstract loop-strip used elsewhere on the page. ----
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

    // Stylised Posillipo headland (left) curving into the Naples waterfront,
    // with Vesuvius rising hazy on the far shore — recognisable silhouette
    // of the Gulf as seen from a broadcast drone over the course, not a
    // literal chart.
    function drawShore(t) {
      var baseY = rh * 0.90;
      rctx.save();
      rctx.beginPath();
      rctx.moveTo(-4, rh + 4);
      rctx.lineTo(-4, baseY + rh * 0.05);
      rctx.bezierCurveTo(rw * 0.08, baseY - rh * 0.10, rw * 0.14, baseY + rh * 0.06, rw * 0.22, baseY - rh * 0.02);
      rctx.bezierCurveTo(rw * 0.34, baseY - rh * 0.09, rw * 0.46, baseY + rh * 0.04, rw * 0.60, baseY + rh * 0.02);
      rctx.bezierCurveTo(rw * 0.74, baseY, rw * 0.86, baseY + rh * 0.05, rw + 4, baseY - rh * 0.01);
      rctx.lineTo(rw + 4, rh + 4);
      rctx.closePath();
      var shoreGrad = rctx.createLinearGradient(0, baseY - rh * 0.1, 0, rh);
      shoreGrad.addColorStop(0, '#1c2f22');
      shoreGrad.addColorStop(1, '#0e1a14');
      rctx.fillStyle = shoreGrad;
      rctx.fill();
      rctx.strokeStyle = 'rgba(200,155,60,0.35)';
      rctx.lineWidth = 1;
      rctx.stroke();

      // A handful of tiny waterfront-building silhouettes for texture.
      rctx.fillStyle = 'rgba(10,18,14,0.9)';
      for (var i = 0; i < 9; i++) {
        var bx = rw * (0.06 + i * 0.1) + Math.sin(i * 2.1) * 4;
        var by = baseY - rh * 0.02 + Math.sin(i * 1.3) * rh * 0.02;
        var bwd = 5 + (i % 3) * 2, bht = 4 + (i % 4) * 2.4;
        rctx.fillRect(bx, by - bht, bwd, bht);
      }
      rctx.restore();

      // Vesuvius: hazy double-peak silhouette across the bay.
      rctx.save();
      rctx.globalAlpha = 0.32;
      rctx.fillStyle = '#3a4a44';
      rctx.beginPath();
      rctx.moveTo(rw * 0.78, baseY - rh * 0.02);
      rctx.lineTo(rw * 0.835, rh * 0.30);
      rctx.lineTo(rw * 0.855, rh * 0.36);
      rctx.lineTo(rw * 0.90, rh * 0.20);
      rctx.lineTo(rw * 0.95, baseY - rh * 0.02);
      rctx.closePath();
      rctx.fill();
      rctx.restore();
    }

    // Soft moving glints on the water surface for a "live aerial video"
    // feel instead of a flat fill — cheap and reduced-motion safe.
    function drawWaterGlints(time) {
      rctx.save();
      rctx.globalCompositeOperation = 'lighter';
      var n = 5;
      for (var i = 0; i < n; i++) {
        var seedT = reduceMotion ? 0 : time;
        var gx = ((i * 137 + seedT * 0.012) % (rw + 160)) - 80;
        var gy = rh * (0.12 + (i * 0.61 % 1) * 0.55);
        var glintGrad = rctx.createRadialGradient(gx, gy, 0, gx, gy, 46);
        glintGrad.addColorStop(0, 'rgba(140,200,200,0.10)');
        glintGrad.addColorStop(1, 'rgba(140,200,200,0)');
        rctx.fillStyle = glintGrad;
        rctx.beginPath();
        rctx.ellipse(gx, gy, 46, 14, -0.25, 0, Math.PI * 2);
        rctx.fill();
      }
      rctx.restore();
    }

    // ---- Course geometry: a modern "stadium racing" box — start/finish
    // line near the shore, a leeward gate mid-course, a single windward
    // mark, boundary lines either side. ----
    function courseGeo() {
      return {
        startX1: rw * 0.30, startX2: rw * 0.62, startY: rh * 0.80,
        gateX1: rw * 0.40, gateX2: rw * 0.54, gateY: rh * 0.50,
        markX: rw * 0.50, markY: rh * 0.16,
        boundaryTopL: rw * 0.14, boundaryTopR: rw * 0.86,
        boundaryBotL: rw * 0.02, boundaryBotR: rw * 0.98
      };
    }

    function drawCourse(geo) {
      rctx.save();
      // Boundary lines (course limits), lightly bowed for perspective.
      rctx.setLineDash([1, 5]);
      rctx.strokeStyle = 'rgba(224,189,109,0.28)';
      rctx.lineWidth = 1;
      rctx.beginPath();
      rctx.moveTo(geo.boundaryBotL, rh * 0.92);
      rctx.quadraticCurveTo(rw * 0.06, rh * 0.5, geo.boundaryTopL, rh * 0.08);
      rctx.stroke();
      rctx.beginPath();
      rctx.moveTo(geo.boundaryBotR, rh * 0.92);
      rctx.quadraticCurveTo(rw * 0.94, rh * 0.5, geo.boundaryTopR, rh * 0.08);
      rctx.stroke();
      rctx.setLineDash([]);

      // Start / finish line.
      rctx.strokeStyle = 'rgba(224,189,109,0.55)';
      rctx.lineWidth = 1.2;
      rctx.beginPath();
      rctx.moveTo(geo.startX1, geo.startY);
      rctx.lineTo(geo.startX2, geo.startY);
      rctx.stroke();
      drawMark(geo.startX1, geo.startY, '#e0bd6d');
      drawMark(geo.startX2, geo.startY, '#e0bd6d');

      // Leeward gate.
      drawMark(geo.gateX1, geo.gateY, '#7fb2b8');
      drawMark(geo.gateX2, geo.gateY, '#7fb2b8');

      // Windward mark.
      rctx.save();
      rctx.translate(geo.markX, geo.markY);
      rctx.rotate(Math.PI / 4);
      rctx.fillStyle = '#e0654f';
      rctx.fillRect(-4, -4, 8, 8);
      rctx.restore();

      rctx.font = '600 8px -apple-system, sans-serif';
      rctx.fillStyle = 'rgba(234,243,241,0.55)';
      rctx.textAlign = 'center';
      rctx.fillText('BOA 3', geo.markX, geo.markY - 10);
      rctx.textAlign = 'left';
      rctx.restore();
    }

    function drawMark(x, y, color) {
      rctx.beginPath();
      rctx.arc(x, y, 3, 0, Math.PI * 2);
      rctx.fillStyle = color;
      rctx.fill();
    }

    // ---- Boats: parametric progress around the stadium course with a
    // tacking zig-zag on the upwind leg and a gybing zig-zag downwind,
    // so the motion reads as sailing rather than circling. ----
    var LOOP_MS = 15000;
    var boatDefs = [
      { id: 'A', color: '#e0654f', tacks: 5, amp: 0.115, phase: 0, speedBase: 18.4, speedSwing: 1.1 },
      { id: 'B', color: '#4f8fe0', tacks: 4, amp: 0.10, phase: 0.5, speedBase: 17.6, speedSwing: 0.9 }
    ];
    var trails = { A: [], B: [] };
    var latestStats = { leaderId: 'A', speedA: 18.4, speedB: 17.6, gapSeconds: 4.2 };

    function triangleWave(u) {
      var f = u - Math.floor(u);
      return 2 * Math.abs(2 * (f - Math.floor(f + 0.5))) - 1;
    }

    function boatPosition(geo, def, tRace) {
      // tRace in [0,1): 0..0.5 upwind (start -> mark), 0.5..1 downwind (mark -> gate -> start).
      var upwind = tRace < 0.5;
      var legT = upwind ? (tRace / 0.5) : ((tRace - 0.5) / 0.5);
      var fromX = upwind ? (geo.startX1 + geo.startX2) / 2 : geo.markX;
      var fromY = upwind ? geo.startY : geo.markY;
      var toX = upwind ? geo.markX : (geo.startX1 + geo.startX2) / 2;
      var toY = upwind ? geo.markY : geo.startY;

      var baseX = fromX + (toX - fromX) * legT;
      var baseY = fromY + (toY - fromY) * legT;

      var tackCount = upwind ? def.tacks : def.tacks - 1;
      var zig = triangleWave(legT * tackCount + def.phase);
      // Fade the zig-zag amplitude in/out at each leg's ends so boats don't
      // snap sideways right at the marks.
      var edgeFade = Math.min(1, legT * 5) * Math.min(1, (1 - legT) * 5);
      var lateral = zig * rw * def.amp * edgeFade;

      var x = baseX + lateral;
      var y = baseY;
      return { x: x, y: y, legT: legT, upwind: upwind };
    }

    function drawBoat(pos, prevPos, color, isLeader) {
      var heading = Math.atan2(pos.y - prevPos.y, pos.x - prevPos.x);
      rctx.save();
      rctx.translate(pos.x, pos.y);
      rctx.rotate(heading + Math.PI / 2);

      // Wake wash.
      rctx.beginPath();
      rctx.moveTo(0, 3);
      rctx.lineTo(-3.4, 11);
      rctx.lineTo(3.4, 11);
      rctx.closePath();
      rctx.fillStyle = 'rgba(220,235,235,0.22)';
      rctx.fill();

      // Hull.
      rctx.beginPath();
      rctx.moveTo(0, -7.5);
      rctx.lineTo(-2.6, 6.5);
      rctx.lineTo(2.6, 6.5);
      rctx.closePath();
      rctx.fillStyle = color;
      rctx.fill();

      // Wingsail.
      rctx.beginPath();
      rctx.moveTo(0, -9);
      rctx.lineTo(0, 4);
      rctx.lineTo(4.6, 1.5);
      rctx.closePath();
      rctx.fillStyle = 'rgba(255,255,255,0.88)';
      rctx.fill();

      rctx.restore();

      if (isLeader) {
        rctx.save();
        rctx.beginPath();
        rctx.arc(pos.x, pos.y, 12, 0, Math.PI * 2);
        rctx.strokeStyle = 'rgba(224,189,109,0.5)';
        rctx.lineWidth = 1;
        rctx.stroke();
        rctx.restore();
      }
    }

    function drawWake(points, color) {
      if (points.length < 2) return;
      rctx.save();
      for (var i = 1; i < points.length; i++) {
        var a = points[i - 1], b = points[i];
        var alpha = (i / points.length) * 0.35;
        rctx.beginPath();
        rctx.moveTo(a.x, a.y);
        rctx.lineTo(b.x, b.y);
        rctx.strokeStyle = color;
        rctx.globalAlpha = alpha;
        rctx.lineWidth = 1.6 * (i / points.length);
        rctx.stroke();
      }
      rctx.restore();
    }

    function updateHud() {
      var boatASpeedEl = document.getElementById('boatASpeed');
      var boatBSpeedEl = document.getElementById('boatBSpeed');
      var boatGapEl = document.getElementById('boatGap');
      var rowA = document.getElementById('boatRowA');
      var rowB = document.getElementById('boatRowB');
      if (boatASpeedEl) boatASpeedEl.innerHTML = latestStats.speedA.toFixed(1) + ' <small>kn</small>';
      if (boatBSpeedEl) boatBSpeedEl.innerHTML = latestStats.speedB.toFixed(1) + ' <small>kn</small>';
      if (boatGapEl) boatGapEl.textContent = '+' + latestStats.gapSeconds.toFixed(1) + 's';
      if (rowA && rowB) {
        var aLeads = latestStats.leaderId === 'A';
        rowA.classList.toggle('leader', aLeads);
        rowB.classList.toggle('leader', !aLeads);
        rowA.querySelector('.team-badge').textContent = aLeads ? '1°' : '2°';
        rowB.querySelector('.team-badge').textContent = aLeads ? '2°' : '1°';
        rowA.querySelector('.team-gap').textContent = aLeads ? 'Leader' : ('+' + latestStats.gapSeconds.toFixed(1) + 's');
        rowB.querySelector('.team-gap').textContent = !aLeads ? 'Leader' : ('+' + latestStats.gapSeconds.toFixed(1) + 's');
      }
    }
    var hudTimer = setInterval(updateHud, 450);

    var windArrowEl = document.getElementById('windArrow');
    var windSpeedEl = document.getElementById('windSpeed');

    function drawRace(time) {
      var geo = courseGeo();
      rctx.clearRect(0, 0, rw, rh);

      var waterGrad = rctx.createLinearGradient(0, 0, 0, rh);
      waterGrad.addColorStop(0, '#123840');
      waterGrad.addColorStop(0.55, '#0e2a30');
      waterGrad.addColorStop(1, '#0a1c20');
      rctx.fillStyle = waterGrad;
      rctx.fillRect(0, 0, rw, rh);

      drawWaterGlints(time);
      drawShore(time);
      drawCourse(geo);

      var tGlobal = reduceMotion ? 0.3 : (time / LOOP_MS) % 1;

      boatDefs.forEach(function (def) {
        var tBoat = (tGlobal + def.phase * 0.02) % 1;
        var pos = boatPosition(geo, def, tBoat);
        var prevT = (tBoat - 0.008 + 1) % 1;
        var prevPos = boatPosition(geo, def, prevT);

        var list = trails[def.id];
        list.push({ x: pos.x, y: pos.y });
        if (list.length > 16) list.shift();

        var speed = def.speedBase + Math.sin(time / 2600 + def.phase * 6) * def.speedSwing;
        if (def.id === 'A') latestStats.speedA = speed; else latestStats.speedB = speed;
      });

      // Leader = whichever boat is further along the combined leg progress.
      var tA = (tGlobal + boatDefs[0].phase * 0.02) % 1;
      var tB = (tGlobal + boatDefs[1].phase * 0.02) % 1;
      latestStats.leaderId = tA >= tB ? 'A' : 'B';
      latestStats.gapSeconds = 2.4 + Math.abs(Math.sin(time / 5200)) * 5.2;

      boatDefs.forEach(function (def) {
        drawWake(trails[def.id], def.color);
      });

      boatDefs.forEach(function (def) {
        var tBoat = (tGlobal + def.phase * 0.02) % 1;
        var pos = boatPosition(geo, def, tBoat);
        var prevT = (tBoat - 0.02 + 1) % 1;
        var prevPos = boatPosition(geo, def, prevT);
        drawBoat(pos, prevPos, def.color, latestStats.leaderId === def.id);
      });

      if (windArrowEl && !reduceMotion) {
        windArrowEl.style.transform = 'rotate(' + (18 + Math.sin(time / 4200) * 8) + 'deg)';
      }
      if (windSpeedEl) {
        var windKn = 13.5 + Math.sin(time / 6000) * 1.4;
        windSpeedEl.textContent = windKn.toFixed(0) + ' kn';
      }

      if (!reduceMotion) requestAnimationFrame(drawRace);
    }
    requestAnimationFrame(drawRace);
    if (reduceMotion) { drawRace(300); updateHud(); }
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
      var COLLAPSED_Y = 260;
      var EXPANDED_Y = 10;
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
