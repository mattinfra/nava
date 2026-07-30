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
      // With prefers-reduced-motion the render loop isn't continuously
      // running, so a resize (e.g. switching to this tab) needs to force
      // one fresh frame at the newly-measured size.
      if (reduceMotion && rw > 0 && rh > 0) requestAnimationFrame(drawRace);
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

    var prevLeaderId = null;

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

        // A change of lead is the one moment worth calling out visually —
        // a brief gold wash on the row that just took over, not a silent
        // badge swap.
        if (prevLeaderId !== null && prevLeaderId !== latestStats.leaderId) {
          var newLeaderRow = aLeads ? rowA : rowB;
          [rowA, rowB].forEach(function (row) { row.classList.remove('lead-change'); });
          void newLeaderRow.offsetWidth;
          newLeaderRow.classList.add('lead-change');
          setTimeout(function () { newLeaderRow.classList.remove('lead-change'); }, 900);
        }
        prevLeaderId = latestStats.leaderId;
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
  var mapStage = document.getElementById('mapStage');
  if (mapCanvas && mapStage) {
    var mctx = mapCanvas.getContext('2d');
    var mDpr = Math.min(window.devicePixelRatio || 1, 2);
    var mw, mh;
    var layerMode = 'chart';
    var satTexture = null, satTexW = 0, satTexH = 0;
    var lastFrameTime = 0;

    function mapResize() {
      var rect = mapStage.getBoundingClientRect();
      mw = rect.width; mh = rect.height;
      mapCanvas.width = mw * mDpr; mapCanvas.height = mh * mDpr;
      mctx.setTransform(mDpr, 0, 0, mDpr, 0, 0);
      if (reduceMotion && mw > 0 && mh > 0) requestAnimationFrame(drawMap);
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
      { id: 'castel-ovo', x: 0.42, drop: 0.07, crowd: 'low', strategic: true },
      { id: 'pizzofalcone', x: 0.66, drop: 0.05, crowd: 'low' },
      { id: 'posillipo', x: 0.22, drop: 0.09, crowd: 'high' },
      { id: 'mergellina', x: 0.32, drop: 0.06, crowd: 'low' }
    ];
    var CROWD_COLORS = { low: '#5fb87c', medium: '#e0a83c', high: '#c1473b' };
    var BUOY_ANGLES = [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3];
    var activeMarkerId = null;
    var visibleIds = null; // null = all visible

    // Camera: eases toward whichever vantage point is selected so tapping a
    // pin (canvas or list) visibly pans/zooms the map there, Apple-Maps
    // style, instead of only changing a highlight.
    var camX = 0, camY = 0, camZoom = 1, cameraPrimed = false;

    function markerAnchor(vp) {
      return { x: mw * vp.x, y: mh * (coastY(vp.x) + vp.drop) };
    }

    var CURRENT_COLOR = '#e0bd6d';

    function drawVantagePin(vp, anchor, isActive, isHovered, time) {
      var isVisible = !visibleIds || visibleIds.indexOf(vp.id) !== -1;
      mctx.globalAlpha = isVisible ? 1 : 0.28;

      var headCy = anchor.y - 9;

      // A live crowd-level change just landed on this pin — ping it with
      // an expanding ring instead of silently recolouring.
      var pulseStart = pinPulses[vp.id];
      if (pulseStart !== undefined) {
        var pulseT = (time - pulseStart) / 900;
        if (pulseT >= 1) {
          delete pinPulses[vp.id];
        } else {
          mctx.beginPath();
          mctx.arc(anchor.x, headCy, 7 + pulseT * 16, 0, Math.PI * 2);
          mctx.lineWidth = 2;
          mctx.strokeStyle = 'rgba(224,189,109,' + (0.55 * (1 - pulseT)) + ')';
          mctx.stroke();
        }
      }

      // Ambient halo marking this as your current saved vantage point —
      // present regardless of selection, so it always reads as "yours".
      if (vp.strategic) {
        mctx.beginPath();
        mctx.arc(anchor.x, headCy, 14, 0, Math.PI * 2);
        mctx.fillStyle = 'rgba(224,189,109,0.16)';
        mctx.fill();
      }

      var headR = isActive ? 8.2 : 6.4;
      // Colour encodes status: gold = your current point, otherwise green
      // (poco affollato / migliore visuale), amber (nella media) or red
      // (affollato) — the same read as the crowd dot in the list below.
      var color = vp.strategic ? CURRENT_COLOR : (CROWD_COLORS[vp.crowd] || CROWD_COLORS.low);

      mctx.beginPath();
      mctx.moveTo(anchor.x, anchor.y);
      mctx.lineTo(anchor.x - headR * 0.55, headCy + headR * 0.3);
      mctx.lineTo(anchor.x + headR * 0.55, headCy + headR * 0.3);
      mctx.closePath();
      mctx.fillStyle = color;
      mctx.fill();
      mctx.beginPath();
      mctx.arc(anchor.x, headCy, headR, 0, Math.PI * 2);
      mctx.fillStyle = color;
      mctx.fill();
      mctx.lineWidth = 1.2;
      mctx.strokeStyle = 'rgba(10,20,23,0.85)';
      mctx.stroke();
      mctx.beginPath();
      mctx.arc(anchor.x, headCy, headR * 0.36, 0, Math.PI * 2);
      mctx.fillStyle = 'rgba(10,20,23,0.9)';
      mctx.fill();

      // Selection ring — whichever pin was just tapped, independent of its
      // status colour.
      if (isActive) {
        mctx.beginPath();
        mctx.arc(anchor.x, headCy, headR + 3.4, 0, Math.PI * 2);
        mctx.lineWidth = 1.6;
        mctx.strokeStyle = 'rgba(255,255,255,0.8)';
        mctx.stroke();
      } else if (isHovered) {
        // Lighter preview ring for a hovered-but-not-selected pin, synced
        // with the corresponding card in the dock below.
        mctx.beginPath();
        mctx.arc(anchor.x, headCy, headR + 3, 0, Math.PI * 2);
        mctx.lineWidth = 1.4;
        mctx.strokeStyle = 'rgba(255,255,255,0.45)';
        mctx.stroke();
      }

      mctx.globalAlpha = 1;
    }

    // Translucent wedge from a vantage point toward the race course — the
    // product's core claim made visible: this spot has a clear line of
    // sight to where the action is happening right now.
    function drawSightlineCone(vp, target) {
      var anchor = markerAnchor(vp);
      var originX = anchor.x, originY = anchor.y - 9;
      var dx = target.x - originX, dy = target.y - originY;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var angle = Math.atan2(dy, dx);
      var spread = 0.20;
      var coneGrad = mctx.createLinearGradient(originX, originY, target.x, target.y);
      coneGrad.addColorStop(0, 'rgba(224,189,109,0.30)');
      coneGrad.addColorStop(1, 'rgba(224,189,109,0)');
      mctx.beginPath();
      mctx.moveTo(originX, originY);
      mctx.lineTo(originX + Math.cos(angle - spread) * dist, originY + Math.sin(angle - spread) * dist);
      mctx.lineTo(originX + Math.cos(angle + spread) * dist, originY + Math.sin(angle + spread) * dist);
      mctx.closePath();
      mctx.fillStyle = coneGrad;
      mctx.fill();
    }

    // "La tua posizione" — a pulsing location dot in the Apple/Google Maps
    // blue-dot convention, kept visually distinct from the amber vantage pins.
    function drawUserLocation(time) {
      var ux = mw * 0.52, uy = mh * (coastY(0.52) + 0.115);
      var pulse = reduceMotion ? 0.5 : (0.5 + 0.5 * Math.sin(time / 750));
      mctx.beginPath();
      mctx.arc(ux, uy, 13 + pulse * 6, 0, Math.PI * 2);
      mctx.fillStyle = 'rgba(79,143,224,' + (0.22 - pulse * 0.08) + ')';
      mctx.fill();
      mctx.beginPath();
      mctx.arc(ux, uy, 6, 0, Math.PI * 2);
      mctx.fillStyle = '#4f8fe0';
      mctx.fill();
      mctx.lineWidth = 2;
      mctx.strokeStyle = 'rgba(255,255,255,0.9)';
      mctx.stroke();
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

      // Camera: ease toward the selected vantage point (or the resting
      // centre when none is selected) so tapping a pin visibly pans/zooms
      // the map there rather than only swapping a highlight colour.
      if (mw > 0 && mh > 0) {
        var camTargetX = mw / 2, camTargetY = mh * 0.42, camTargetZoom = 1;
        var focusVp = activeMarkerId
          ? VANTAGE_POINTS.filter(function (v) { return v.id === activeMarkerId; })[0]
          : null;
        if (focusVp) {
          var focusAnchor = markerAnchor(focusVp);
          camTargetX = focusAnchor.x;
          camTargetY = focusAnchor.y - 9;
          camTargetZoom = 1.5;
        }
        if (!cameraPrimed) {
          camX = camTargetX; camY = camTargetY; camZoom = camTargetZoom;
          cameraPrimed = true;
        } else {
          camX += (camTargetX - camX) * 0.09;
          camY += (camTargetY - camY) * 0.09;
          camZoom += (camTargetZoom - camZoom) * 0.09;
        }
      }
      mctx.save();
      mctx.translate(mw / 2, mh / 2);
      mctx.scale(camZoom, camZoom);
      mctx.translate(-camX, -camY);

      var waterTop = lerpColor('#123039', '#0e1a1f', layerMix);
      var waterBottom = lerpColor('#0a1f26', '#132a30', layerMix);
      var coastStroke = lerpColor('#c89b3c', '#b4be96', layerMix);

      var grad = mctx.createLinearGradient(0, 0, 0, mh);
      grad.addColorStop(0, waterTop);
      grad.addColorStop(1, waterBottom);
      mctx.fillStyle = grad;
      // Oversized on purpose: once the camera pans/zooms toward an
      // edge vantage point, the visible world window can extend past the
      // nominal (0,0,mw,mh) map extent — this keeps water under it instead
      // of exposing empty canvas.
      mctx.fillRect(-mw, -mh, mw * 3, mh * 3);

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
        mctx.fillStyle = 'rgba(32,31,27,0.96)';
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

      // Vector street-map detail: city block grid, the coastal avenue, a
      // park patch and place labels — a real navigation-map read, not a
      // hand-drawn chart. Fades out under the satellite layer.
      if (chartAlpha > 0.01) {
        mctx.save();
        mctx.globalAlpha = chartAlpha;
        mctx.clip(landPath);

        mctx.save();
        mctx.globalAlpha *= 0.55;
        mctx.translate(mw * 0.5, coastY(0.5) * mh + mh * 0.08);
        mctx.rotate(-0.1);
        mctx.strokeStyle = 'rgba(255,255,255,0.07)';
        mctx.lineWidth = 1;
        var gridSize = 15;
        for (var gx = -mw * 1.3; gx <= mw * 1.3; gx += gridSize) {
          mctx.beginPath(); mctx.moveTo(gx, -mh); mctx.lineTo(gx, mh * 1.3); mctx.stroke();
        }
        for (var gy = -mh * 0.3; gy <= mh * 1.3; gy += gridSize) {
          mctx.beginPath(); mctx.moveTo(-mw * 1.3, gy); mctx.lineTo(mw * 1.3, gy); mctx.stroke();
        }
        mctx.restore();

        mctx.strokeStyle = 'rgba(240,225,190,0.42)';
        mctx.lineWidth = 2.2;
        mctx.beginPath();
        for (var xg = -0.05 * mw; xg <= 1.05 * mw; xg += 8) {
          var xgn = xg / mw;
          var yg = coastY(xgn) * mh - mh * 0.018;
          if (xg === -0.05 * mw) mctx.moveTo(xg, yg); else mctx.lineTo(xg, yg);
        }
        mctx.stroke();

        mctx.fillStyle = 'rgba(88,128,86,0.55)';
        mctx.beginPath();
        mctx.ellipse(mw * 0.46, coastY(0.46) * mh - mh * 0.05, mw * 0.05, mh * 0.022, -0.12, 0, Math.PI * 2);
        mctx.fill();

        mctx.restore();

        mctx.font = '600 8.5px -apple-system, sans-serif';
        mctx.fillStyle = 'rgba(234,243,241,' + (0.78 * chartAlpha) + ')';
        mctx.textAlign = 'center';
        mctx.fillText('Posillipo', mw * 0.20, coastY(0.20) * mh - mh * 0.125);
        mctx.fillText('Lungomare Caracciolo', mw * 0.5, coastY(0.5) * mh - mh * 0.085);
        mctx.font = '600 8px -apple-system, sans-serif';
        mctx.fillStyle = 'rgba(234,243,241,' + (0.55 * chartAlpha) + ')';
        mctx.fillText('Vesuvio', mw * 0.885, mh * 0.34);
        mctx.textAlign = 'left';
      }

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

      // Line of sight from the selected (or top-ranked) vantage point to
      // where the race actually is right now.
      var coneVp = activeMarkerId
        ? VANTAGE_POINTS.filter(function (v) { return v.id === activeMarkerId; })[0]
        : null;
      if (!coneVp) coneVp = VANTAGE_POINTS.filter(function (v) { return v.strategic; })[0];
      if (coneVp) drawSightlineCone(coneVp, { x: boatX, y: boatY });

      // Vantage point pins, each with a live crowd-level badge.
      VANTAGE_POINTS.forEach(function (vp) {
        var anchor = markerAnchor(vp);
        drawVantagePin(vp, anchor, vp.id === activeMarkerId, vp.id === hoverMarkerId, time);
      });

      drawUserLocation(time);

      mctx.restore();

      // Keep the hover tooltip glued to its pin while the camera eases
      // toward a selection.
      if (hoverMarkerId) updateTooltip();

      requestAnimationFrame(drawMap);
    }
    requestAnimationFrame(drawMap);

    function hitTestMarker(px, py) {
      // Pins are drawn in world space under the camera's pan/zoom
      // transform, so a raw screen click has to be converted back to world
      // coordinates the same way before comparing against pin positions.
      var worldX = (px - mw / 2) / camZoom + camX;
      var worldY = (py - mh / 2) / camZoom + camY;
      for (var i = 0; i < VANTAGE_POINTS.length; i++) {
        var anchor = markerAnchor(VANTAGE_POINTS[i]);
        var dx = anchor.x - worldX, dy = (anchor.y - 9) - worldY;
        if (Math.sqrt(dx * dx + dy * dy) <= 15) return VANTAGE_POINTS[i].id;
      }
      return null;
    }

    var mapCarousel = document.getElementById('mapCarousel');
    var mapTooltip = document.getElementById('mapTooltip');
    var hoverMarkerId = null;

    function selectMarker(id) {
      activeMarkerId = id;
      if (mapCarousel) {
        Array.prototype.slice.call(mapCarousel.querySelectorAll('.vp-card')).forEach(function (card) {
          card.classList.toggle('active', card.getAttribute('data-id') === id);
        });
        var target = mapCarousel.querySelector('.vp-card[data-id="' + id + '"]');
        if (target) target.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }

    function updateCardHoverClasses() {
      if (!mapCarousel) return;
      Array.prototype.slice.call(mapCarousel.querySelectorAll('.vp-card')).forEach(function (card) {
        card.classList.toggle('hovered', card.getAttribute('data-id') === hoverMarkerId);
      });
    }

    function updateTooltip() {
      if (!mapTooltip) return;
      var vp = hoverMarkerId ? VANTAGE_POINTS.filter(function (v) { return v.id === hoverMarkerId; })[0] : null;
      if (!vp) { mapTooltip.hidden = true; return; }
      var anchor = markerAnchor(vp);
      var screenX = mw / 2 + (anchor.x - camX) * camZoom;
      var screenY = mh / 2 + ((anchor.y - 9) - camY) * camZoom - 12;
      var crowdLabel = vp.crowd === 'high' ? 'alta affluenza' : vp.crowd === 'medium' ? 'media affluenza' : 'bassa affluenza';
      var name = vp.strategic ? 'Il tuo punto' : (vp.crowd === 'low' ? 'Consigliato' : vp.crowd === 'high' ? 'Affollato' : 'Nella media');
      var card = mapCarousel ? mapCarousel.querySelector('.vp-card[data-id="' + vp.id + '"]') : null;
      var displayName = card ? card.querySelector('.vp-card-name').textContent : vp.id;
      mapTooltip.innerHTML = '<span class="tt-name">' + displayName + '</span>' +
        '<span class="tt-meta"><span class="tt-dot" style="background:' + (vp.strategic ? CURRENT_COLOR : CROWD_COLORS[vp.crowd]) + '"></span>' + name + ' · ' + crowdLabel + '</span>';
      mapTooltip.style.left = screenX + 'px';
      mapTooltip.style.top = screenY + 'px';
      mapTooltip.hidden = false;
    }

    function setHover(id) {
      if (id === hoverMarkerId) return;
      hoverMarkerId = id;
      updateCardHoverClasses();
      updateTooltip();
    }

    mapCanvas.addEventListener('click', function (e) {
      var rect = mapCanvas.getBoundingClientRect();
      var id = hitTestMarker(e.clientX - rect.left, e.clientY - rect.top);
      if (id) selectMarker(id);
    });
    mapCanvas.addEventListener('mousemove', function (e) {
      var rect = mapCanvas.getBoundingClientRect();
      setHover(hitTestMarker(e.clientX - rect.left, e.clientY - rect.top));
    });
    mapCanvas.addEventListener('mouseleave', function () { setHover(null); });

    if (mapCarousel) {
      mapCarousel.addEventListener('click', function (e) {
        var card = e.target.closest ? e.target.closest('.vp-card') : null;
        if (card) selectMarker(card.getAttribute('data-id'));
      });
      Array.prototype.slice.call(mapCarousel.querySelectorAll('.vp-card')).forEach(function (card) {
        var id = card.getAttribute('data-id');
        card.addEventListener('mouseenter', function () { setHover(id); });
        card.addEventListener('mouseleave', function () { if (hoverMarkerId === id) setHover(null); });
        card.addEventListener('focus', function () { setHover(id); });
        card.addEventListener('blur', function () { if (hoverMarkerId === id) setHover(null); });
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
      var cards = mapCarousel ? Array.prototype.slice.call(mapCarousel.querySelectorAll('.vp-card')) : [];
      var visible = [];

      cards.forEach(function (card) {
        var tags = (card.getAttribute('data-tags') || '').split(/\s+/);
        var name = card.querySelector('.vp-card-name').textContent.toLowerCase();
        var matchesFilter = filter === 'all' || tags.indexOf(filter) !== -1;
        var matchesQuery = !query || name.indexOf(query) !== -1;
        var show = matchesFilter && matchesQuery;
        card.classList.toggle('hidden-by-filter', !show);
        if (show) visible.push(card.getAttribute('data-id'));
      });

      visibleIds = (filter === 'all' && !query) ? null : visible;
      if (sheetCount) sheetCount.textContent = visible.length + (visible.length === 1 ? ' vicino a te' : ' vicini a te');
      if (query && visible.length) selectMarker(visible[0]);
    }

    // ---- Live crowd-level ticks: simulated crowdsourced updates every
    // few seconds, reflected with a small flash on both the pin and its
    // carousel card rather than a silent value swap. ----
    var CROWD_CYCLE = { low: 'medium', medium: 'high', high: 'low' };
    var CROWD_LABEL = { low: 'bassa affluenza', medium: 'media affluenza', high: 'alta affluenza' };
    var pinPulses = {};

    function tickCrowdLevels() {
      var candidates = VANTAGE_POINTS.filter(function (v) { return !v.strategic; });
      var vp = candidates[Math.floor(Math.random() * candidates.length)];
      if (!vp) return;
      vp.crowd = CROWD_CYCLE[vp.crowd] || 'low';
      pinPulses[vp.id] = performance.now();

      var card = mapCarousel ? mapCarousel.querySelector('.vp-card[data-id="' + vp.id + '"]') : null;
      if (card) {
        var dot = card.querySelector('.vp-card-crowd');
        var text = card.querySelector('.vp-card-crowd-text');
        if (dot) {
          dot.classList.remove('low', 'medium', 'high', 'pulse');
          void dot.offsetWidth; // restart the pulse animation
          dot.classList.add(vp.crowd, 'pulse');
        }
        if (text) text.textContent = CROWD_LABEL[vp.crowd];
      }
      updateTooltip();
    }
    var crowdTickTimer = setInterval(tickCrowdLevels, 6500);

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
      // The race and map canvases size themselves from their panel's
      // getBoundingClientRect() on window 'resize'. A panel hidden behind
      // display:none at that first measurement reports a 0x0 rect and never
      // gets a second chance — so re-fire 'resize' once its tab becomes
      // visible to force both canvases to pick up their real dimensions.
      window.dispatchEvent(new Event('resize'));
    }
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () { goToTab(tab.getAttribute('data-panel')); });
    });

    // ---- Live-link / event cards jump straight into the module they surface ----
    Array.prototype.slice.call(phone.querySelectorAll('.live-link-card, .event-card')).forEach(function (card) {
      card.addEventListener('click', function () { goToTab(card.getAttribute('data-goto')); });
    });
  }

  // ---- AR demo overlay: pannable "viewfinder" mockup reached from the map
  // panel's "Visualizza in AR" button. Explicitly labelled as a concept demo
  // (not a live camera feed) — this mirrors the same simulated-data spirit
  // as the other phone panels, for pitch purposes only; the real AR module
  // stays Fase 4 per the roadmap. Boat/mark bearings and the coastline are
  // panned by dragging, so it reads as "looking around" the gulf. ----
  var arOverlay = document.getElementById('arOverlay');
  var arTeaserBtn = document.getElementById('arTeaser');
  if (arOverlay && arTeaserBtn) {
    var arCanvas = document.getElementById('arCanvas');
    var arCtx = arCanvas.getContext('2d');
    var arDpr = Math.min(window.devicePixelRatio || 1, 2);
    var aw = 0, ah = 0;
    var arRafId = null;

    var FOV = 68; // degrees of horizontal field of view rendered on screen
    var heading = 6; // 0 = facing the start line; positive = panned right
    var dragging = false;
    var dragStartX = 0, dragStartHeading = 0;

    // Bearings are relative to a fixed "north" for this scene, independent
    // of real compass data — purely to make panning feel spatially
    // consistent (drag right, the world slides the correct direction and
    // stays put when you drag back).
    var SCENE = {
      mark: { bearing: 4, label: 'Boa 3' },
      vesuvius: { bearing: 52 },
      posillipo: { bearing: -66 }
    };
    var boatState = { aBearing: -13, bBearing: 10 };

    function normDeg(d) {
      var r = d % 360;
      if (r > 180) r -= 360;
      if (r < -180) r += 360;
      return r;
    }
    function bearingToX(bearingDeg) {
      var rel = normDeg(bearingDeg - heading);
      return aw / 2 + (rel / (FOV / 2)) * (aw / 2);
    }
    function bearingVisible(bearingDeg, margin) {
      var rel = Math.abs(normDeg(bearingDeg - heading));
      return rel <= (FOV / 2) * (margin || 1);
    }

    function arResize() {
      var rect = arOverlay.getBoundingClientRect();
      aw = rect.width; ah = rect.height;
      if (aw === 0 || ah === 0) return;
      arCanvas.width = aw * arDpr; arCanvas.height = ah * arDpr;
      arCtx.setTransform(arDpr, 0, 0, arDpr, 0, 0);
      if (!arRafId) drawAr(performance.now());
    }
    window.addEventListener('resize', arResize);

    function fmtHeading(deg) {
      var d = Math.round(((deg % 360) + 360) % 360);
      return (d < 100 ? (d < 10 ? '00' : '0') : '') + d + '°';
    }

    // ---- Mini-radar: a heading-up "you are here" compass rose, Google
    // Maps' look-around direction-cone convention applied to the whole
    // scene — same bearings the horizon view uses, so it never disagrees
    // with what's on screen; panning the horizon visibly rotates the cone. ----
    function drawMiniMap(aBearing, bBearing) {
      var size = 76, pad = 14, topOffset = 52;
      var mmX = aw - pad - size, mmY = topOffset;
      if (aw < 220 || ah < 220) return;
      var cx = mmX + size / 2, cy = mmY + size / 2;
      var r = size / 2 - 6;

      arCtx.save();
      arCtx.beginPath();
      arCtx.arc(cx, cy, r + 3, 0, Math.PI * 2);
      arCtx.clip();

      var bg = arCtx.createRadialGradient(cx, cy, 4, cx, cy, r + 3);
      bg.addColorStop(0, 'rgba(20,48,55,0.95)');
      bg.addColorStop(1, 'rgba(7,18,22,0.95)');
      arCtx.fillStyle = bg;
      arCtx.fillRect(mmX, mmY, size, size);

      arCtx.strokeStyle = 'rgba(255,255,255,0.08)';
      arCtx.lineWidth = 1;
      [0.5, 0.85].forEach(function (f) {
        arCtx.beginPath();
        arCtx.arc(cx, cy, r * f, 0, Math.PI * 2);
        arCtx.stroke();
      });

      // Heading-up field-of-view wedge, exactly the FOV rendered below.
      arCtx.save();
      arCtx.translate(cx, cy);
      var halfFov = (FOV / 2) * Math.PI / 180;
      arCtx.beginPath();
      arCtx.moveTo(0, 0);
      arCtx.arc(0, 0, r, -Math.PI / 2 - halfFov, -Math.PI / 2 + halfFov);
      arCtx.closePath();
      var wedge = arCtx.createRadialGradient(0, 0, 0, 0, 0, r);
      wedge.addColorStop(0, 'rgba(79,143,224,0.32)');
      wedge.addColorStop(1, 'rgba(79,143,224,0)');
      arCtx.fillStyle = wedge;
      arCtx.fill();
      arCtx.restore();

      function plot(bearingDeg, color, radius) {
        var rel = normDeg(bearingDeg - heading);
        var rad = (rel - 90) * Math.PI / 180;
        var px = cx + Math.cos(rad) * r * 0.78;
        var py = cy + Math.sin(rad) * r * 0.78;
        arCtx.beginPath();
        arCtx.arc(px, py, radius, 0, Math.PI * 2);
        arCtx.fillStyle = color;
        arCtx.fill();
      }
      plot(SCENE.mark.bearing, '#e0bd6d', 3.2);
      plot(aBearing, '#e0654f', 2.6);
      plot(bBearing, '#4f8fe0', 2.6);

      // North indicator, rotates opposite the pan so it stays truthful to
      // the (fictional but internally consistent) scene bearings.
      var nRad = (normDeg(0 - heading) - 90) * Math.PI / 180;
      arCtx.beginPath();
      arCtx.arc(cx + Math.cos(nRad) * (r - 3), cy + Math.sin(nRad) * (r - 3), 1.6, 0, Math.PI * 2);
      arCtx.fillStyle = 'rgba(255,255,255,0.7)';
      arCtx.fill();

      arCtx.restore();

      // "You are here" dot, center, drawn outside the clip so its ring reads crisp.
      arCtx.beginPath();
      arCtx.arc(cx, cy, 3.2, 0, Math.PI * 2);
      arCtx.fillStyle = '#eaf3f1';
      arCtx.fill();
      arCtx.lineWidth = 1;
      arCtx.strokeStyle = 'rgba(10,20,23,0.9)';
      arCtx.stroke();

      arCtx.beginPath();
      arCtx.arc(cx, cy, r + 3, 0, Math.PI * 2);
      arCtx.strokeStyle = 'rgba(255,255,255,0.22)';
      arCtx.lineWidth = 1;
      arCtx.stroke();

      arCtx.font = '700 8px ui-monospace, monospace';
      arCtx.fillStyle = 'rgba(255,255,255,0.55)';
      arCtx.textAlign = 'center';
      arCtx.fillText('N', cx + Math.cos(nRad) * (r - 3), cy + Math.sin(nRad) * (r - 3) - 5);
      arCtx.textAlign = 'left';
    }

    // Coastline height profile as a function of bearing: a gently varying
    // shoreline with two named landmarks bumped up out of the noise.
    function coastHeight(bearing) {
      var base = 0.10 + 0.03 * Math.sin(bearing * 0.11) + 0.02 * Math.sin(bearing * 0.4 + 1.4);
      var vesBump = Math.max(0, 1 - Math.abs(normDeg(bearing - SCENE.vesuvius.bearing)) / 9) * 0.22;
      var posBump = Math.max(0, 1 - Math.abs(normDeg(bearing - SCENE.posillipo.bearing)) / 14) * 0.14;
      return base + vesBump + posBump;
    }

    function drawAr(time) {
      if (aw === 0 || ah === 0) { arRafId = null; return; }
      var horizonY = ah * 0.56;

      var sky = arCtx.createLinearGradient(0, 0, 0, horizonY);
      sky.addColorStop(0, '#0d2026');
      sky.addColorStop(1, '#1b3238');
      arCtx.fillStyle = sky;
      arCtx.fillRect(0, 0, aw, horizonY);

      var sea = arCtx.createLinearGradient(0, horizonY, 0, ah);
      sea.addColorStop(0, '#123840');
      sea.addColorStop(1, '#081418');
      arCtx.fillStyle = sea;
      arCtx.fillRect(0, horizonY, aw, ah - horizonY);

      // Soft sun glare near the mark's bearing, low on the horizon.
      var glareX = bearingToX(SCENE.mark.bearing - 8);
      var glareGrad = arCtx.createRadialGradient(glareX, horizonY, 0, glareX, horizonY, aw * 0.35);
      glareGrad.addColorStop(0, 'rgba(224,189,109,0.16)');
      glareGrad.addColorStop(1, 'rgba(224,189,109,0)');
      arCtx.fillStyle = glareGrad;
      arCtx.fillRect(0, horizonY - ah * 0.2, aw, ah * 0.4);

      // Coastline silhouette, sampled across a wider bearing range than the
      // visible FOV so it can pan continuously without popping in at edges.
      arCtx.beginPath();
      var startB = heading - FOV * 0.85, endB = heading + FOV * 0.85;
      for (var b = startB; b <= endB; b += 1.4) {
        var x = bearingToX(b);
        var y = horizonY - coastHeight(b) * ah;
        if (b === startB) arCtx.moveTo(x, y); else arCtx.lineTo(x, y);
      }
      arCtx.lineTo(bearingToX(endB), ah);
      arCtx.lineTo(bearingToX(startB), ah);
      arCtx.closePath();
      arCtx.fillStyle = 'rgba(14,24,20,0.92)';
      arCtx.fill();
      arCtx.strokeStyle = 'rgba(200,155,60,0.4)';
      arCtx.lineWidth = 1;
      arCtx.stroke();

      // Water glints for a "live feed" feel.
      arCtx.save();
      arCtx.globalCompositeOperation = 'lighter';
      for (var i = 0; i < 4; i++) {
        var gx = ((i * 151 + (reduceMotion ? 0 : time * 0.01)) % (aw + 120)) - 60;
        var gy = horizonY + ah * (0.1 + (i * 0.53 % 1) * 0.55);
        var gg = arCtx.createRadialGradient(gx, gy, 0, gx, gy, 40);
        gg.addColorStop(0, 'rgba(150,205,205,0.10)');
        gg.addColorStop(1, 'rgba(150,205,205,0)');
        arCtx.fillStyle = gg;
        arCtx.beginPath();
        arCtx.ellipse(gx, gy, 40, 12, -0.2, 0, Math.PI * 2);
        arCtx.fill();
      }
      arCtx.restore();

      // Start/course guide line rising from the mark's bearing — the
      // product's core claim rendered as an AR wayfinding cue.
      if (bearingVisible(SCENE.mark.bearing, 1.3)) {
        var mx = bearingToX(SCENE.mark.bearing);
        arCtx.save();
        arCtx.setLineDash([2, 6]);
        arCtx.strokeStyle = 'rgba(224,189,109,0.5)';
        arCtx.lineWidth = 1.4;
        arCtx.beginPath();
        arCtx.moveTo(mx, horizonY - coastHeight(SCENE.mark.bearing) * ah * 0.3);
        arCtx.lineTo(mx, horizonY + ah * 0.06);
        arCtx.stroke();
        arCtx.restore();
      }

      // Boats: gentle bearing drift for liveliness, drawn as small hulls
      // with a wake, sitting just below the horizon.
      var tSec = reduceMotion ? 0 : time / 1000;
      var aBearing = boatState.aBearing + Math.sin(tSec / 6) * 3.2;
      var bBearing = boatState.bBearing + Math.sin(tSec / 5 + 1.1) * 2.6;
      [
        { bearing: aBearing, color: '#e0654f' },
        { bearing: bBearing, color: '#4f8fe0' }
      ].forEach(function (boat) {
        if (!bearingVisible(boat.bearing, 1.15)) return;
        var x = bearingToX(boat.bearing);
        var y = horizonY + ah * 0.045;
        arCtx.save();
        arCtx.translate(x, y);
        arCtx.beginPath();
        arCtx.moveTo(0, -6);
        arCtx.lineTo(-2.2, 5.4);
        arCtx.lineTo(2.2, 5.4);
        arCtx.closePath();
        arCtx.fillStyle = boat.color;
        arCtx.fill();
        arCtx.beginPath();
        arCtx.moveTo(0, -7.4);
        arCtx.lineTo(0, 3.4);
        arCtx.lineTo(3.6, 1.2);
        arCtx.closePath();
        arCtx.fillStyle = 'rgba(255,255,255,0.88)';
        arCtx.fill();
        arCtx.restore();
      });

      // Sync HTML tag chips + edge-arrow wayfinding to the same bearings.
      positionArTag(document.getElementById('arTagMark'), SCENE.mark.bearing, horizonY - coastHeight(SCENE.mark.bearing) * ah * 0.3 - 2);
      positionArTag(document.getElementById('arTagA'), aBearing, horizonY + ah * 0.045 - 10);
      positionArTag(document.getElementById('arTagB'), bBearing, horizonY + ah * 0.045 - 10);

      var edgeLeft = document.getElementById('arEdgeLeft');
      var edgeRight = document.getElementById('arEdgeRight');
      var markRel = normDeg(SCENE.mark.bearing - heading);
      var markOffscreen = Math.abs(markRel) > (FOV / 2) * 1.3;
      if (edgeLeft) edgeLeft.hidden = !(markOffscreen && markRel < 0);
      if (edgeRight) edgeRight.hidden = !(markOffscreen && markRel > 0);

      // ---- Live telemetry: same speed/gap formulas as the Live tab's
      // broadcast bar (race-canvas boatDefs: speedBase/speedSwing, phase
      // 0 and 0.5, period 2600ms), driven by the same rAF clock — so the
      // numbers never contradict what's shown on the Live or Home screens.
      var speedA = 18.4 + Math.sin(time / 2600) * 1.1;
      var speedB = 17.6 + Math.sin(time / 2600 + 3) * 0.9;
      var gapSeconds = 2.4 + Math.abs(Math.sin(time / 5200)) * 5.2;
      // Compass headings are a property of the boat, not of where the
      // viewer is looking — kept independent of aBearing/bBearing so
      // panning around never makes a boat's own heading jump.
      var headingA = 38 + Math.sin(tSec / 7) * 4;
      var headingB = 46 + Math.sin(tSec / 6 + 2) * 4;
      var tagAMeta = document.getElementById('arTagAMeta');
      var tagBMeta = document.getElementById('arTagBMeta');
      if (tagAMeta) tagAMeta.textContent = speedA.toFixed(1) + ' kn · ' + fmtHeading(headingA);
      if (tagBMeta) tagBMeta.textContent = speedB.toFixed(1) + ' kn · ' + fmtHeading(headingB);
      var tickerASpeed = document.getElementById('arTickerASpeed');
      var tickerGap = document.getElementById('arTickerGap');
      if (tickerASpeed) tickerASpeed.textContent = speedA.toFixed(1) + ' kn';
      if (tickerGap) tickerGap.textContent = '+' + gapSeconds.toFixed(1) + 's';

      drawMiniMap(aBearing, bBearing);

      if (!reduceMotion || dragging) {
        arRafId = requestAnimationFrame(drawAr);
      } else {
        arRafId = null;
      }
    }

    function positionArTag(el, bearingDeg, y) {
      if (!el) return;
      var visible = bearingVisible(bearingDeg, 1.02);
      if (!visible) { el.style.opacity = '0'; el.style.pointerEvents = 'none'; return; }
      el.style.opacity = '1';
      el.style.transform = 'translate(-50%, -100%)';
      el.style.left = bearingToX(bearingDeg) + 'px';
      el.style.top = y + 'px';
    }

    function startAr() {
      if (arRafId) return;
      arRafId = requestAnimationFrame(drawAr);
    }

    function openArOverlay() {
      arOverlay.hidden = false;
      arResize();
      startAr();
      var hint = document.getElementById('arHint');
      if (hint) {
        hint.classList.remove('faded');
        clearTimeout(hint._fadeTimer);
        hint._fadeTimer = setTimeout(function () { hint.classList.add('faded'); }, 3200);
      }
    }
    function closeArOverlay() {
      arOverlay.hidden = true;
      if (arRafId) { cancelAnimationFrame(arRafId); arRafId = null; }
    }

    arTeaserBtn.addEventListener('click', openArOverlay);
    var arCloseBtn = document.getElementById('arClose');
    if (arCloseBtn) arCloseBtn.addEventListener('click', closeArOverlay);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !arOverlay.hidden) closeArOverlay();
    });

    // ---- Honesty toggle: explicit disclosure of what's simulated vs.
    // real, one tap away rather than a permanent wall of caption text. ----
    var arInfoBtn = document.getElementById('arInfoBtn');
    var arInfoTooltip = document.getElementById('arInfoTooltip');
    if (arInfoBtn && arInfoTooltip) {
      arInfoBtn.addEventListener('click', function () {
        var open = arInfoTooltip.hidden;
        arInfoTooltip.hidden = !open;
        arInfoBtn.setAttribute('aria-expanded', String(open));
      });
    }

    // Drag-to-look-around: pointer delta maps to a heading change scaled by
    // the field of view, so a full-width drag pans roughly one FOV.
    arOverlay.addEventListener('pointerdown', function (e) {
      if (e.target.closest('.ar-topbar')) return;
      dragging = true;
      dragStartX = e.clientX;
      dragStartHeading = heading;
      arOverlay.setPointerCapture(e.pointerId);
      startAr();
    });
    arOverlay.addEventListener('pointermove', function (e) {
      if (!dragging || aw === 0) return;
      var dx = e.clientX - dragStartX;
      heading = dragStartHeading - (dx / aw) * FOV;
    });
    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      try { arOverlay.releasePointerCapture(e.pointerId); } catch (err) {}
    }
    arOverlay.addEventListener('pointerup', endDrag);
    arOverlay.addEventListener('pointercancel', endDrag);
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
