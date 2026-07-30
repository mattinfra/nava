(function () {
  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------------------------------------------------------------------
  // Theme toggle (stesso pattern di docs/site) — la mappa canvas rilegge i
  // colori a ogni redraw, quindi il cambio tema si riflette anche lì.
  // ---------------------------------------------------------------------
  var themeToggle = document.getElementById('themeToggle');
  var mql = window.matchMedia('(prefers-color-scheme: dark)');
  function applyThemeLabel() {
    var explicit = root.getAttribute('data-theme');
    themeToggle.textContent = 'TEMA · ' + (explicit ? explicit.toUpperCase() : 'AUTO');
  }
  themeToggle.addEventListener('click', function () {
    var current = root.getAttribute('data-theme');
    if (!current) root.setAttribute('data-theme', mql.matches ? 'light' : 'dark');
    else if (current === 'dark') root.setAttribute('data-theme', 'light');
    else root.removeAttribute('data-theme');
    applyThemeLabel();
    drawMap();
  });
  applyThemeLabel();

  // ---------------------------------------------------------------------
  // App state
  // ---------------------------------------------------------------------
  var state = {
    locationGranted: null, // null = not asked yet, true/false after gate
    activeFilter: 'all',
    searchQuery: '',
    degraded: false,
    activeVpId: null,
    layerMode: 'standard', // 'standard' | 'satellite'
    tilt3d: false,
    sheetExpanded: false,
    mapMode: 'points', // 'points' | 'boats'
    activeBoatId: null,
    liveTab: 'diretta',
    view: { scale: 1, tx: 0, ty: 0 }
  };
  var VIEW_MIN_SCALE = 0.7, VIEW_MAX_SCALE = 2.6;

  var YOU_POS = { x: 52, y: 68 };

  var VANTAGE_POINTS = [
    {
      id: 'castel-ovo', name: "Castel dell'Ovo", x: 42, y: 74, distanceM: 750,
      crowd: 'low', tags: ['view', 'quiet', 'near'], current: true,
      factors: { rotta: 92, vista: 96, affollamento: 94 },
      transport: 'Parcheggio più vicino a ~400 m · info aggiornate a breve'
    },
    {
      id: 'posillipo', name: 'Posillipo — Belvedere', x: 20, y: 52, distanceM: 2400,
      crowd: 'high', tags: ['view'], current: false,
      factors: { rotta: 88, vista: 94, affollamento: 58 },
      transport: 'Fermata bus più vicina a ~250 m'
    },
    {
      id: 'pizzofalcone', name: 'Pizzofalcone', x: 66, y: 60, distanceM: 900,
      crowd: 'low', tags: ['quiet', 'near'], current: false,
      factors: { rotta: 74, vista: 80, affollamento: 90 },
      transport: 'Accesso pedonale da via Egiziaca'
    },
    {
      id: 'mergellina', name: 'Mergellina', x: 30, y: 66, distanceM: 3100,
      crowd: 'low', tags: ['quiet'], current: false,
      factors: { rotta: 60, vista: 68, affollamento: 88 },
      transport: 'Metro Mergellina a ~150 m'
    },
    {
      id: 'lungomare', name: 'Lungomare Caracciolo', x: 48, y: 78, distanceM: 1500,
      crowd: 'high', tags: ['near'], current: false,
      factors: { rotta: 82, vista: 76, affollamento: 44 },
      transport: 'Zona pedonale, molta capienza ma affollata'
    }
  ];

  // Geometria del campo di regata in coordinate percentuali (stesso spazio
  // 0-100 dei vantage point) — acqua aperta in alto, costa in basso, come
  // nel coastline qui sotto.
  var COURSE = {
    startPin: { x: 44, y: 34 },
    startBoat: { x: 60, y: 31 },
    windwardMark: { x: 53, y: 11 },
    gateLeft: { x: 47, y: 22 },
    gateRight: { x: 58, y: 22 },
    boundary: [{ x: 26, y: 38 }, { x: 32, y: 6 }, { x: 76, y: 4 }, { x: 82, y: 40 }]
  };
  var WIND_DEG = 315; // da Nord-Ovest
  var WIND_KN = 14;
  var CURRENT_DEG = 250;
  var CURRENT_KN = 0.6;

  // Dati dimostrativi per la dashboard e la sezione Live (design M2, non
  // integrazione con dati ufficiali/proprietari dei team — vedi PLAN.md).
  var FIXTURES = [
    { time: '16:40', name: 'Regata 4 · Flotta A', meta: 'Costiera, Posillipo → Castel dell\'Ovo', status: 'live' },
    { time: '18:10', name: 'Regata 5 · Flotta A', meta: 'Bolina/poppa, campo al largo', status: 'upcoming' },
    { time: '14:05', name: 'Regata 3 · Flotta A', meta: 'Vinta da GBR 3', status: 'done' }
  ];

  var NEWS = [
    { tag: 'Regata', time: '12 min fa', title: 'ITA 1 passa in testa alla prima boa', snippet: 'Virata pulita all\'ingresso del layline: guadagnati due lunghezze su GBR 3.' },
    { tag: 'Meteo', time: '48 min fa', title: 'Vento in rotazione a Nord-Ovest nel pomeriggio', snippet: 'Previsto un rinforzo fino a 16 nodi entro le 18:00, possibile ritardo per la Regata 5.' },
    { tag: 'Percorso', time: 'Ieri', title: 'Confermato il campo di regata costiero', snippet: 'Linea di partenza davanti al Lungomare Caracciolo, percorso verso Castel dell\'Ovo.' }
  ];

  var STANDINGS = [
    { name: 'ITA 1', gap: 'In testa', trend: 'up' },
    { name: 'GBR 3', gap: '+4s', trend: 'down' },
    { name: 'NZL 2', gap: '+11s', trend: 'up' },
    { name: 'USA 4', gap: '+18s', trend: 'flat' },
    { name: 'FRA 5', gap: '+26s', trend: 'down' },
    { name: 'SUI 6', gap: '+31s', trend: 'flat' }
  ];

  var GAME_QUESTION = { text: 'Chi vira per primo verso la Boa 2?', options: ['ITA 1', 'GBR 3', 'NZL 2'], points: 50, closesInSec: 48 };

  var GAME_STATS = { score: 1240, rank: 4, streak: 3 };

  var GAME_LEADERBOARD = [
    { name: 'Marco V.', points: 1810 },
    { name: 'Giulia R.', points: 1620 },
    { name: 'Luca P.', points: 1455 },
    { name: 'Tu', points: 1240, you: true },
    { name: 'Sara D.', points: 1190 },
    { name: 'Andrea F.', points: 980 }
  ];

  var GAME_HISTORY = [
    { time: '16:53', text: 'In testa alla Boa 1: hai previsto ITA 1', correct: true, points: '+40' },
    { time: '16:40', text: 'Chi vira per primo: hai previsto GBR 3', correct: false, points: '+0' },
    { time: 'Ieri', text: 'In testa al traguardo: hai previsto NZL 2', correct: true, points: '+60' }
  ];

  function initials(name) {
    return name.split(' ').map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase();
  }

  var LIVE_TIMELINE = [
    { time: '16:40', text: 'Partenza: flotta al completo, linea pulita.', highlight: false },
    { time: '16:47', text: 'ITA 1 e GBR 3 si separano sui due lati del campo.', highlight: false },
    { time: '16:53', text: 'ITA 1 vira per prima e passa in testa alla boa 1.', highlight: true },
    { time: '16:58', text: 'NZL 2 recupera terreno nel lato sinistro del campo.', highlight: false }
  ];

  // Percorso ad anello per la modalità "Naviga vele": stessi waypoint del
  // campo di regata (COURSE), ripercorso partenza → boa 1 → cancello → partenza.
  var BOAT_LOOP = [
    { x: 60, y: 31 }, { x: 55, y: 24 }, { x: 53, y: 11 }, { x: 49, y: 18 },
    { x: 47, y: 22 }, { x: 58, y: 22 }, { x: 60, y: 31 }
  ];
  function loopLength() {
    var len = 0;
    for (var i = 0; i < BOAT_LOOP.length - 1; i++) {
      var a = BOAT_LOOP[i], b = BOAT_LOOP[i + 1];
      len += Math.hypot(b.x - a.x, b.y - a.y);
    }
    return len;
  }
  var BOAT_LOOP_LEN = loopLength();
  function pointOnLoop(t, lateralOffset) {
    // t in [0,1) percorre l'anello in ordine; lateralOffset sposta la barca
    // leggermente a lato della rotta ideale così le barche non si sovrappongono.
    var target = ((t % 1) + 1) % 1 * BOAT_LOOP_LEN;
    var acc = 0;
    for (var i = 0; i < BOAT_LOOP.length - 1; i++) {
      var a = BOAT_LOOP[i], b = BOAT_LOOP[i + 1];
      var segLen = Math.hypot(b.x - a.x, b.y - a.y);
      if (acc + segLen >= target || i === BOAT_LOOP.length - 2) {
        var segT = segLen === 0 ? 0 : (target - acc) / segLen;
        var dx = b.x - a.x, dy = b.y - a.y;
        var heading = Math.atan2(dx, -dy) * 180 / Math.PI;
        var nx = -dy / (segLen || 1), ny = dx / (segLen || 1);
        return {
          x: a.x + dx * segT + nx * lateralOffset,
          y: a.y + dy * segT + ny * lateralOffset,
          heading: (heading + 360) % 360
        };
      }
      acc += segLen;
    }
    return { x: BOAT_LOOP[0].x, y: BOAT_LOOP[0].y, heading: 0 };
  }

  var BOATS = [
    { id: 'ita1', name: 'ITA 1', color: '#4f8fe0', speed: 0.052, offset: -1.6, progress: 0.30, speedKn: 9.4 },
    { id: 'gbr3', name: 'GBR 3', color: '#c1473b', speed: 0.049, offset: 1.4, progress: 0.24, speedKn: 9.1 },
    { id: 'nzl2', name: 'NZL 2', color: '#5fb87c', speed: 0.050, offset: -0.4, progress: 0.18, speedKn: 9.2 },
    { id: 'usa4', name: 'USA 4', color: '#e0a83c', speed: 0.046, offset: 2.6, progress: 0.12, speedKn: 8.8 },
    { id: 'fra5', name: 'FRA 5', color: '#8fa8a6', speed: 0.045, offset: -2.6, progress: 0.06, speedKn: 8.7 }
  ];

  function scoreOf(vp) {
    var f = vp.factors;
    return Math.round(f.rotta * 0.4 + f.vista * 0.35 + f.affollamento * 0.25);
  }
  function crowdLabel(c) {
    return c === 'high' ? 'alta affluenza' : c === 'medium' ? 'media affluenza' : 'bassa affluenza';
  }
  function formatDistance(m) {
    return m >= 1000 ? (m / 1000).toFixed(1) + ' km' : m + ' m';
  }
  function bearingLabel(deg) {
    var dirs = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
    return dirs[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
  }

  // ---------------------------------------------------------------------
  // Screen / tab navigation
  // ---------------------------------------------------------------------
  var screens = Array.prototype.slice.call(document.querySelectorAll('.screen'));
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.app-tab'));

  function showScreen(name) {
    screens.forEach(function (s) { s.classList.toggle('active', s.getAttribute('data-screen') === name); });
  }

  function goToTab(panel) {
    tabs.forEach(function (t) { t.classList.toggle('active', t.getAttribute('data-panel') === panel); });
    if (panel === 'home') showScreen('home');
    else if (panel === 'map') {
      showScreen('map');
      renderVpfList();
      // Il pannello mappa può passare da display:none a visibile: il
      // canvas misura le proprie dimensioni da getBoundingClientRect(),
      // che a display:none riporta 0x0 — un resize forzato dopo averlo
      // reso visibile gli fa prendere le dimensioni vere.
      window.dispatchEvent(new Event('resize'));
    }
    else if (panel === 'live') { showScreen('live'); }
    else if (panel === 'game') { showScreen('game'); }
  }

  tabs.forEach(function (t) {
    t.addEventListener('click', function () { goToTab(t.getAttribute('data-panel')); });
  });

  document.addEventListener('click', function (e) {
    var goto = e.target.closest ? e.target.closest('[data-goto]') : null;
    if (!goto) return;
    var target = goto.getAttribute('data-goto');
    goToTab(target);
    var openId = goto.getAttribute('data-open-detail');
    if (openId) openDetail(openId);
    var mode = goto.getAttribute('data-vpf-mode');
    if (mode) setMapMode(mode);
  });

  // ---------------------------------------------------------------------
  // Permission gate
  // ---------------------------------------------------------------------
  function setLocationGranted(granted) {
    state.locationGranted = granted;
    document.getElementById('savedPointSection').hidden = !granted;
    document.getElementById('noLocationNote').hidden = granted;
    document.getElementById('geoBanner').hidden = granted;
    drawMap();
    renderVpfList();
  }
  function completeGate(granted) {
    setLocationGranted(granted);
    showScreen('home');
  }
  document.getElementById('grantLocationBtn').addEventListener('click', function () { completeGate(true); });
  document.getElementById('skipLocationBtn').addEventListener('click', function () { completeGate(false); });
  // Attivata dalla mappa: aggiorna lo stato sul posto, non riporta a Home.
  document.getElementById('geoBannerBtn').addEventListener('click', function () { setLocationGranted(true); });

  // =======================================================================
  // Vantage Point Finder — mappa canvas stile Apple/Google Maps con overlay
  // nautico (partenza, boe, layline, confine campo, rotta prevista) e una
  // modalità 3D (tilt CSS del canvas, coerente con l'approccio "canvas 2D
  // per tutto" già usato in docs/site — niente motore WebGL da mantenere).
  // =======================================================================
  var mapStage = document.getElementById('mapStage');
  var mapCanvas = document.getElementById('mapCanvas');
  var mapCanvasWrap = document.getElementById('mapCanvasWrap');
  var mctx = mapCanvas.getContext('2d');
  var mDpr = Math.min(window.devicePixelRatio || 1, 2);
  var mw = 0, mh = 0;

  var vpfList = document.getElementById('vpfList');
  var vpfCount = document.getElementById('vpfCount');
  var vpfChips = document.getElementById('vpfChips');
  var vpfSearch = document.getElementById('vpfSearch');
  var vpfSearchClear = document.getElementById('vpfSearchClear');
  var degradedBanner = document.getElementById('degradedBanner');
  var vpfSimulateBtn = document.getElementById('vpfSimulateBtn');
  var vpfModeChips = document.getElementById('vpfModeChips');
  var boatList = document.getElementById('boatList');
  var mapCompass = document.getElementById('mapCompass');
  var leaderChip = document.getElementById('leaderChip');
  var leaderLabel = document.getElementById('leaderLabel');

  function mapResize() {
    var rect = mapStage.getBoundingClientRect();
    mw = rect.width; mh = rect.height;
    if (mw === 0 || mh === 0) return;
    mapCanvas.width = mw * mDpr; mapCanvas.height = mh * mDpr;
    mctx.setTransform(mDpr, 0, 0, mDpr, 0, 0);
    drawMap();
  }
  window.addEventListener('resize', mapResize);

  // Silhouette stilizzata del golfo — stessa geometria di riferimento usata
  // in docs/site, qui ridisegnata con palette Apple Maps invece che carta
  // nautica vintage.
  var COAST_POINTS = [
    [-5, 64], [10, 70], [22, 50], [32, 72], [42, 62], [54, 74],
    [66, 58], [80, 76], [94, 66], [105, 72]
  ];
  function coastY(xPct) {
    var pts = COAST_POINTS;
    for (var i = 0; i < pts.length - 1; i++) {
      if (xPct >= pts[i][0] && xPct <= pts[i + 1][0]) {
        var t = (xPct - pts[i][0]) / (pts[i + 1][0] - pts[i][0]);
        return pts[i][1] + t * (pts[i + 1][1] - pts[i][1]);
      }
    }
    return pts[pts.length - 1][1];
  }
  // La mappa è navigabile: pan (drag) e zoom (rotellina/pulsanti) sono un
  // offset/scala applicati qui, così pin, rotta e hit-test restano allineati
  // senza dover ridisegnare la geometria in un sistema di coordinate diverso.
  function px(pct) { return (pct / 100) * mw * state.view.scale + state.view.tx; }
  function py(pct) { return (pct / 100) * mh * state.view.scale + state.view.ty; }
  function worldXY(canvasX, canvasY) {
    return {
      x: ((canvasX - state.view.tx) / state.view.scale / mw) * 100,
      y: ((canvasY - state.view.ty) / state.view.scale / mh) * 100
    };
  }
  function clampView() {
    var v = state.view;
    v.scale = Math.min(VIEW_MAX_SCALE, Math.max(VIEW_MIN_SCALE, v.scale));
    var maxPan = Math.max(mw, mh) * 0.7;
    v.tx = Math.min(maxPan, Math.max(-maxPan, v.tx));
    v.ty = Math.min(maxPan, Math.max(-maxPan, v.ty));
  }
  function zoomBy(factor, cx, cy) {
    if (cx === undefined) { cx = mw / 2; cy = mh / 2; }
    var before = worldXY(cx, cy);
    state.view.scale *= factor;
    clampView();
    var afterPx = px(before.x), afterPy = py(before.y);
    state.view.tx += cx - afterPx;
    state.view.ty += cy - afterPy;
    clampView();
    drawMap();
  }

  function cssVar(name) {
    return getComputedStyle(root).getPropertyValue(name).trim();
  }

  function drawPin(x, y, color, size, selected) {
    var r = size;
    mctx.save();
    // Ombra morbida sotto il pin — leggibile in piano, ancora più "premium"
    // sotto il tilt 3D dove si comporta come un'ombra proiettata a terra.
    mctx.beginPath();
    mctx.ellipse(x, y + 2, r * 0.7, r * 0.28, 0, 0, Math.PI * 2);
    mctx.fillStyle = 'rgba(0,0,0,0.22)';
    mctx.fill();

    mctx.translate(x, y - r * 1.15);
    mctx.beginPath();
    mctx.moveTo(0, r * 1.15);
    mctx.bezierCurveTo(-r, r * 0.3, -r, -r * 0.5, 0, -r);
    mctx.bezierCurveTo(r, -r * 0.5, r, r * 0.3, 0, r * 1.15);
    mctx.closePath();
    mctx.fillStyle = color;
    mctx.fill();
    if (selected) {
      mctx.lineWidth = 2;
      mctx.strokeStyle = '#ffffff';
      mctx.stroke();
    }
    mctx.beginPath();
    mctx.arc(0, -r * 0.18, r * 0.4, 0, Math.PI * 2);
    mctx.fillStyle = 'rgba(255,255,255,0.92)';
    mctx.fill();
    mctx.restore();
  }

  function drawCourse(waterTop) {
    var goldA = 'rgba(200,155,60,0.85)';
    var goldDash = 'rgba(200,155,60,0.55)';
    var laylineColor = 'rgba(143,168,166,0.55)';
    var boundaryColor = 'rgba(193,71,59,0.45)';

    // Confine del campo di regata.
    mctx.save();
    mctx.beginPath();
    COURSE.boundary.forEach(function (p, i) {
      var x = px(p.x), y = py(p.y);
      if (i === 0) mctx.moveTo(x, y); else mctx.lineTo(x, y);
    });
    mctx.closePath();
    mctx.setLineDash([1.5, 5]);
    mctx.strokeStyle = boundaryColor;
    mctx.lineWidth = 1.2;
    mctx.stroke();
    mctx.setLineDash([]);
    mctx.restore();

    // Linea di partenza (barca comitato + boa).
    var p1 = { x: px(COURSE.startPin.x), y: py(COURSE.startPin.y) };
    var p2 = { x: px(COURSE.startBoat.x), y: py(COURSE.startBoat.y) };
    mctx.beginPath();
    mctx.moveTo(p1.x, p1.y);
    mctx.lineTo(p2.x, p2.y);
    mctx.strokeStyle = goldA;
    mctx.lineWidth = 1.6;
    mctx.stroke();
    [p1, p2].forEach(function (p) { drawBuoy(p.x, p.y, '#c89b3c'); });

    // Boa di bolina (windward mark).
    var wm = { x: px(COURSE.windwardMark.x), y: py(COURSE.windwardMark.y) };
    drawBuoy(wm.x, wm.y, '#e0654f');
    mctx.font = '600 9px -apple-system, sans-serif';
    mctx.fillStyle = cssVar('--text-strong') || '#111';
    mctx.textAlign = 'center';
    mctx.fillText('Boa 1', wm.x, wm.y - 12);

    // Cancello sottovento (leeward gate).
    var gl = { x: px(COURSE.gateLeft.x), y: py(COURSE.gateLeft.y) };
    var gr = { x: px(COURSE.gateRight.x), y: py(COURSE.gateRight.y) };
    [gl, gr].forEach(function (p) { drawBuoy(p.x, p.y, '#4f8fe0'); });
    mctx.fillText('Boa 2', (gl.x + gr.x) / 2, gl.y + 16);

    // Layline: corridoio di bolina stimato verso la boa 1, aperto a ~90°
    // (45° per lato) rispetto alla direzione del vento — dettaglio tipico
    // delle grafiche di regata (es. virtual eye / SAP Sailing Analytics).
    var windRad = (WIND_DEG * Math.PI) / 180;
    var laylineLen = Math.min(mw, mh) * 0.34;
    [windRad - Math.PI / 4, windRad + Math.PI / 4].forEach(function (ang) {
      mctx.beginPath();
      mctx.moveTo(wm.x, wm.y);
      mctx.lineTo(wm.x + Math.sin(ang) * laylineLen, wm.y + Math.cos(ang) * laylineLen * 0.6);
      mctx.setLineDash([2, 5]);
      mctx.strokeStyle = laylineColor;
      mctx.lineWidth = 1;
      mctx.stroke();
      mctx.setLineDash([]);
    });

    // Corrente stimata: piccola freccia in acqua aperta.
    var curX = px(70), curY = py(16);
    var curRad = (CURRENT_DEG * Math.PI) / 180;
    mctx.save();
    mctx.translate(curX, curY);
    mctx.rotate(curRad);
    mctx.beginPath();
    mctx.moveTo(0, 9); mctx.lineTo(0, -9);
    mctx.moveTo(-4, -4); mctx.lineTo(0, -9); mctx.lineTo(4, -4);
    mctx.strokeStyle = 'rgba(79,143,224,0.8)';
    mctx.lineWidth = 1.6;
    mctx.stroke();
    mctx.restore();
  }

  function drawBuoy(x, y, color) {
    mctx.save();
    mctx.translate(x, y);
    mctx.rotate(Math.PI / 4);
    mctx.fillStyle = color;
    mctx.fillRect(-3.4, -3.4, 6.8, 6.8);
    mctx.restore();
    mctx.beginPath();
    mctx.ellipse(x, y + 3, 4, 1.4, 0, 0, Math.PI * 2);
    mctx.fillStyle = 'rgba(0,0,0,0.18)';
    mctx.fill();
  }

  // Modalità "Naviga vele": ogni barca è un triangolo orientato secondo la
  // propria prua (heading), con una piccola scia che ne mostra la rotta
  // recente — l'equivalente semplificato di un plotter di regata reale.
  function drawBoatMarker(x, y, headingDeg, color, selected) {
    mctx.save();
    mctx.translate(x, y);
    mctx.rotate((headingDeg * Math.PI) / 180);
    mctx.beginPath();
    mctx.ellipse(0, 5.5, 3.2, 1.3, 0, 0, Math.PI * 2);
    mctx.fillStyle = 'rgba(0,0,0,0.2)';
    mctx.fill();
    mctx.beginPath();
    mctx.moveTo(0, -8);
    mctx.lineTo(4.4, 7);
    mctx.lineTo(0, 4);
    mctx.lineTo(-4.4, 7);
    mctx.closePath();
    mctx.fillStyle = color;
    mctx.fill();
    if (selected) { mctx.lineWidth = 1.6; mctx.strokeStyle = '#ffffff'; mctx.stroke(); }
    mctx.restore();
  }

  function drawBoats() {
    BOATS.forEach(function (b) {
      var pos = pointOnLoop(b.progress, b.offset);
      // Scia: 4 punti indietro lungo l'anello, sempre più tenui.
      for (var i = 3; i >= 1; i--) {
        var wake = pointOnLoop(b.progress - i * 0.012, b.offset);
        mctx.beginPath();
        mctx.arc(px(wake.x), py(wake.y), 1.6, 0, Math.PI * 2);
        mctx.fillStyle = color2alpha(b.color, 0.28 - i * 0.06);
        mctx.fill();
      }
      drawBoatMarker(px(pos.x), py(pos.y), pos.heading, b.color, state.activeBoatId === b.id);
    });
  }
  function color2alpha(hex, alpha) {
    var r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), bl = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + bl + ',' + Math.max(0, alpha) + ')';
  }

  // Rotta prevista: nastro tratteggiato dal punto selezionato (o dal tuo
  // punto salvato) verso la linea di partenza — la stessa idea del fattore
  // "Rotta prevista" nel punteggio, resa visibile sulla mappa.
  function drawPredictedRoute() {
    var focus = state.activeVpId
      ? VANTAGE_POINTS.filter(function (v) { return v.id === state.activeVpId; })[0]
      : VANTAGE_POINTS.filter(function (v) { return v.current; })[0];
    if (!focus) return;
    var from = { x: px(focus.x), y: py(focus.y) };
    var to = { x: px(COURSE.startPin.x), y: py(COURSE.startPin.y) };
    var ctrl = { x: (from.x + to.x) / 2 + 14, y: (from.y + to.y) / 2 - 10 };
    mctx.beginPath();
    mctx.moveTo(from.x, from.y);
    mctx.quadraticCurveTo(ctrl.x, ctrl.y, to.x, to.y);
    mctx.setLineDash([2, 6]);
    mctx.strokeStyle = 'rgba(200,155,60,0.6)';
    mctx.lineWidth = 1.4;
    mctx.stroke();
    mctx.setLineDash([]);
  }

  // "Edifici" stilizzati sul lungomare, disegnati solo in modalità 3D — col
  // canvas inclinato via CSS (perspective + rotateX) diventano un piccolo
  // skyline in prospettiva, nello spirito degli edifici estrusi di Apple Maps.
  function drawBuildings3D() {
    var baseY = coastY(50) / 100 * mh;
    for (var i = 0; i < 10; i++) {
      var bx = mw * (0.08 + i * 0.09);
      var byTop = baseY - (10 + (i % 4) * 7);
      var w = 7, h = baseY - byTop;
      mctx.fillStyle = 'rgba(10,10,10,0.22)';
      mctx.fillRect(bx, byTop, w, h);
      mctx.fillStyle = 'rgba(255,255,255,0.10)';
      mctx.fillRect(bx, byTop, w, 2.4);
    }
  }

  function drawMap() {
    if (mw === 0 || mh === 0) return;
    mctx.clearRect(0, 0, mw, mh);

    var isDark = !!(root.getAttribute('data-theme') === 'dark' ||
      (!root.getAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches));

    var waterTop = isDark ? '#0b2333' : '#a9d6ef';
    var waterBottom = isDark ? '#061520' : '#8fc4e6';
    var landFill = state.layerMode === 'satellite'
      ? (isDark ? '#1c2414' : '#3c4a2e')
      : (isDark ? '#17181a' : '#f1efe9');
    var landStroke = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.14)';

    var grad = mctx.createLinearGradient(0, 0, 0, mh);
    grad.addColorStop(0, waterTop);
    grad.addColorStop(1, waterBottom);
    mctx.fillStyle = grad;
    mctx.fillRect(0, 0, mw, mh);

    // Land mass.
    var landPath = new Path2D();
    for (var xi = -5; xi <= 105; xi += 2) {
      var yi = py(coastY(xi));
      var xpix = px(xi);
      if (xi === -5) landPath.moveTo(xpix, yi); else landPath.lineTo(xpix, yi);
    }
    landPath.lineTo(px(105), mh + 20);
    landPath.lineTo(px(-5), mh + 20);
    landPath.closePath();
    mctx.fillStyle = landFill;
    mctx.fill(landPath);
    mctx.strokeStyle = landStroke;
    mctx.lineWidth = 1;
    mctx.stroke(landPath);

    // Griglia stradale leggera + un paio di strade principali, solo in
    // modalità standard (in satellite darebbe fastidio sopra la texture).
    if (state.layerMode === 'standard') {
      mctx.save();
      mctx.clip(landPath);
      mctx.strokeStyle = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
      mctx.lineWidth = 1;
      for (var gx = 0; gx <= mw; gx += 16) { mctx.beginPath(); mctx.moveTo(gx, py(coastY(50)) - mh); mctx.lineTo(gx, mh); mctx.stroke(); }
      for (var gy = py(coastY(50)) - mh; gy <= mh; gy += 16) { mctx.beginPath(); mctx.moveTo(0, gy); mctx.lineTo(mw, gy); mctx.stroke(); }
      mctx.strokeStyle = isDark ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.9)';
      mctx.lineWidth = 3;
      mctx.beginPath();
      for (var xg = -5; xg <= 105; xg += 2) {
        var ygp = py(coastY(xg)) - 3;
        var xgp = px(xg);
        if (xg === -5) mctx.moveTo(xgp, ygp); else mctx.lineTo(xgp, ygp);
      }
      mctx.stroke();
      mctx.strokeStyle = isDark ? 'rgba(224,189,109,0.4)' : 'rgba(200,155,60,0.5)';
      mctx.lineWidth = 1;
      mctx.stroke();
      if (state.tilt3d) drawBuildings3D();
      mctx.restore();

      mctx.font = '600 9px -apple-system, sans-serif';
      mctx.fillStyle = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)';
      mctx.textAlign = 'center';
      mctx.fillText('Posillipo', px(20), py(coastY(20)) - 14);
      mctx.fillText('Lungomare Caracciolo', px(52), py(coastY(52)) - 10);
    }

    drawCourse(waterTop);

    if (state.mapMode === 'boats') {
      drawBoats();
    } else {
      drawPredictedRoute();
      VANTAGE_POINTS.forEach(function (vp) {
        var color = vp.current ? '#e0bd6d' : vp.crowd === 'high' ? '#c1473b' : vp.crowd === 'medium' ? '#e0a83c' : '#5fb87c';
        drawPin(px(vp.x), py(vp.y), color, 9, state.activeVpId === vp.id);
      });
    }

    if (state.locationGranted) {
      var yx = px(YOU_POS.x), yy = py(YOU_POS.y);
      mctx.beginPath();
      mctx.arc(yx, yy, 11, 0, Math.PI * 2);
      mctx.fillStyle = 'rgba(79,143,224,0.22)';
      mctx.fill();
      mctx.beginPath();
      mctx.arc(yx, yy, 5.5, 0, Math.PI * 2);
      mctx.fillStyle = '#4f8fe0';
      mctx.fill();
      mctx.lineWidth = 2;
      mctx.strokeStyle = '#fff';
      mctx.stroke();
    }

    mctx.textAlign = 'left';
  }

  function hitTestVp(px2, py2) {
    var world = worldXY(px2, py2);
    var tol = 6 / state.view.scale;
    for (var i = 0; i < VANTAGE_POINTS.length; i++) {
      var vp = VANTAGE_POINTS[i];
      var dx = vp.x - world.x, dyv = vp.y - world.y;
      // Il pin è disegnato con la punta sull'ancora ma il "corpo" sopra: una
      // tolleranza generosa in percentuale rende comunque il tap affidabile.
      if (Math.sqrt(dx * dx + dyv * dyv) < tol) return vp.id;
    }
    return null;
  }
  function hitTestBoat(px2, py2) {
    var world = worldXY(px2, py2);
    var tol = 6 / state.view.scale;
    for (var i = 0; i < BOATS.length; i++) {
      var b = BOATS[i];
      var pos = pointOnLoop(b.progress, b.offset);
      var dx = pos.x - world.x, dyv = pos.y - world.y;
      if (Math.sqrt(dx * dx + dyv * dyv) < tol) return b.id;
    }
    return null;
  }

  // ---- Pan (drag) + zoom (rotellina / pulsanti): mappa davvero navigabile ----
  var dragState = null;
  mapCanvas.classList.add('pannable');
  mapCanvas.addEventListener('pointerdown', function (e) {
    dragState = { startX: e.clientX, startY: e.clientY, tx0: state.view.tx, ty0: state.view.ty, moved: false };
    mapCanvas.setPointerCapture(e.pointerId);
  });
  mapCanvas.addEventListener('pointermove', function (e) {
    if (!dragState) return;
    var dx = e.clientX - dragState.startX, dy = e.clientY - dragState.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      dragState.moved = true;
      mapCanvas.classList.add('panning');
    }
    if (dragState.moved) {
      state.view.tx = dragState.tx0 + dx;
      state.view.ty = dragState.ty0 + dy;
      clampView();
      drawMap();
    }
  });
  function endDrag(e) {
    if (!dragState) return;
    var wasMoved = dragState.moved;
    dragState = null;
    mapCanvas.classList.remove('panning');
    if (!wasMoved) {
      var rect = mapCanvas.getBoundingClientRect();
      var cx = e.clientX - rect.left, cy = e.clientY - rect.top;
      if (state.mapMode === 'boats') {
        var bid = hitTestBoat(cx, cy);
        if (bid) openBoatDetail(bid);
      } else {
        var id = hitTestVp(cx, cy);
        if (id) openDetail(id);
      }
    }
  }
  mapCanvas.addEventListener('pointerup', endDrag);
  mapCanvas.addEventListener('pointercancel', function () { dragState = null; mapCanvas.classList.remove('panning'); });
  mapCanvas.addEventListener('wheel', function (e) {
    e.preventDefault();
    var rect = mapCanvas.getBoundingClientRect();
    zoomBy(e.deltaY < 0 ? 1.12 : 0.89, e.clientX - rect.left, e.clientY - rect.top);
  }, { passive: false });
  document.getElementById('zoomInBtn').addEventListener('click', function () { zoomBy(1.25); });
  document.getElementById('zoomOutBtn').addEventListener('click', function () { zoomBy(0.8); });

  // ---- FAB: layer, 3D, locate, simula interruzione ----
  var layerToggle = document.getElementById('layerToggle');
  layerToggle.addEventListener('click', function () {
    state.layerMode = state.layerMode === 'standard' ? 'satellite' : 'standard';
    layerToggle.classList.toggle('active', state.layerMode === 'satellite');
    drawMap();
  });

  var tilt3dToggle = document.getElementById('tilt3dToggle');
  tilt3dToggle.addEventListener('click', function () {
    state.tilt3d = !state.tilt3d;
    tilt3dToggle.classList.toggle('active', state.tilt3d);
    mapCanvasWrap.classList.toggle('tilt-3d', state.tilt3d && !reduceMotion);
    drawMap();
  });

  var locateBtn = document.getElementById('locateBtn');
  locateBtn.addEventListener('click', function () {
    if (!state.locationGranted) { setLocationGranted(true); return; }
    mapCanvas.animate(
      [{ filter: 'brightness(1)' }, { filter: 'brightness(1.25)' }, { filter: 'brightness(1)' }],
      { duration: 420, easing: 'ease' }
    );
  });

  vpfSimulateBtn.addEventListener('click', function () {
    state.degraded = !state.degraded;
    degradedBanner.hidden = !state.degraded;
    vpfSimulateBtn.classList.toggle('active', state.degraded);
    vpfSimulateBtn.setAttribute('title', state.degraded ? 'Ripristina feed live' : 'Simula interruzione feed');
  });

  // Il campo di regata (dove vivono le barche) sta nella parte "al largo"
  // della mappa, in alto — la stessa zona coperta dal pannello di ricerca
  // e dai filtri. In modalità punti panoramici va bene (i pin interessanti
  // sono verso costa), ma per "Naviga vele" bisogna inquadrare il campo
  // nello spazio realmente visibile sotto l'overlay, altrimenti le barche
  // restano nascoste dietro ricerca/chip.
  function boatLoopBBox() {
    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    BOAT_LOOP.forEach(function (p) {
      minX = Math.min(minX, p.x - 4); maxX = Math.max(maxX, p.x + 4);
      minY = Math.min(minY, p.y - 4); maxY = Math.max(maxY, p.y + 4);
    });
    return { minX: minX, maxX: maxX, minY: minY, maxY: maxY };
  }
  function fitCourseIntoView() {
    if (mw === 0 || mh === 0) return;
    var overlayEl = document.querySelector('.map-overlay-top');
    var overlayRect = overlayEl.getBoundingClientRect();
    var stageRect = mapStage.getBoundingClientRect();
    var topInset = Math.max(0, overlayRect.bottom - stageRect.top) + 14;
    var bottomInset = 40;
    var availH = Math.max(60, mh - topInset - bottomInset);
    var box = boatLoopBBox();
    var boxWpx = ((box.maxX - box.minX) / 100) * mw;
    var boxHpx = ((box.maxY - box.minY) / 100) * mh;
    var scale = Math.min((mw * 0.82) / boxWpx, availH / boxHpx, VIEW_MAX_SCALE);
    scale = Math.max(scale, VIEW_MIN_SCALE);
    state.view.scale = scale;
    var cxWorld = (box.minX + box.maxX) / 2, cyWorld = (box.minY + box.maxY) / 2;
    state.view.tx = mw / 2 - (cxWorld / 100) * mw * scale;
    state.view.ty = (topInset + availH / 2) - (cyWorld / 100) * mh * scale;
    clampView();
  }
  function resetView() {
    state.view.scale = 1; state.view.tx = 0; state.view.ty = 0;
  }

  // ---- Modalità mappa: punti panoramici vs. carta di navigazione live ----
  function setMapMode(mode) {
    state.mapMode = mode;
    Array.prototype.slice.call(vpfModeChips.querySelectorAll('.chip')).forEach(function (c) {
      c.classList.toggle('active', c.getAttribute('data-mode') === mode);
    });
    var isBoats = mode === 'boats';
    document.getElementById('vpfChips').hidden = isBoats;
    vpfList.hidden = isBoats;
    boatList.hidden = !isBoats;
    mapCompass.hidden = !isBoats;
    leaderChip.hidden = !isBoats;
    closeDetail();
    if (isBoats) { fitCourseIntoView(); renderBoatList(); } else { resetView(); renderVpfList(); }
    drawMap();
  }
  vpfModeChips.addEventListener('click', function (e) {
    var chip = e.target.closest ? e.target.closest('.chip') : null;
    if (!chip) return;
    setMapMode(chip.getAttribute('data-mode'));
  });

  function renderBoatList() {
    var ranked = BOATS.slice().sort(function (a, b) { return b.progress - a.progress; });
    boatList.innerHTML = ranked.map(function (b, i) {
      var pos = pointOnLoop(b.progress, 0);
      return (
        '<button class="boat-card' + (i === 0 ? ' leader' : '') + '" type="button" data-boat-id="' + b.id + '">' +
          '<span class="boat-pos">' + (i + 1) + '</span>' +
          '<span class="boat-card-body">' +
            '<span class="boat-card-name">' + b.name + '</span>' +
            '<span class="boat-card-meta">Rotta ' + bearingLabel(pos.heading) + (i === 0 ? ' · in testa' : ' · +' + (i * 6 + 3) + 's') + '</span>' +
          '</span>' +
          '<span class="boat-card-speed">' + b.speedKn.toFixed(1) + ' kn<span>velocità</span></span>' +
        '</button>'
      );
    }).join('');
    Array.prototype.slice.call(boatList.querySelectorAll('.boat-card')).forEach(function (card) {
      card.addEventListener('click', function () { openBoatDetail(card.getAttribute('data-boat-id')); });
    });
    var leaderName = ranked[0] ? ranked[0].name : '';
    leaderLabel.textContent = leaderName + ' in testa';
    document.getElementById('vpfCount').textContent = BOATS.length + ' barche in regata';
  }

  function openBoatDetail(id) {
    var b = BOATS.filter(function (x) { return x.id === id; })[0];
    if (!b) return;
    state.activeBoatId = id;
    drawMap();
    var pos = pointOnLoop(b.progress, 0);
    var ranked = BOATS.slice().sort(function (a2, b2) { return b2.progress - a2.progress; });
    var place = ranked.indexOf(b) + 1;
    vpfDetailSheet.innerHTML =
      '<div class="sheet-grabber"></div>' +
      '<div class="vpf-detail-head">' +
        '<span class="boat-pos" style="width:44px;height:44px;font-size:1.02rem;background:' + color2alpha(b.color, 0.18) + ';color:' + b.color + ';">' + place + '</span>' +
        '<span>' +
          '<h2>' + b.name + '</h2>' +
          '<span class="meta">' + (place === 1 ? 'In testa alla flotta' : place + 'ª posizione') + '</span>' +
        '</span>' +
        '<button class="vpf-detail-close" type="button" aria-label="Chiudi dettaglio"><svg class="icon"><use href="#icon-close"/></svg></button>' +
      '</div>' +
      '<div class="detail-section">' +
        '<h4>Telemetria live (simulata)</h4>' +
        '<div class="telemetry-row" style="grid-template-columns:repeat(3,1fr);">' +
          '<div class="telemetry-tile"><span class="label">Velocità</span><span class="value">' + b.speedKn.toFixed(1) + ' kn</span></div>' +
          '<div class="telemetry-tile"><span class="label">Rotta</span><span class="value">' + bearingLabel(pos.heading) + '</span></div>' +
          '<div class="telemetry-tile"><span class="label">Vento</span><span class="value">' + WIND_KN + ' kn</span></div>' +
        '</div>' +
      '</div>' +
      '<p class="route-note">Posizione e velocità sono simulate a scopo di design — l\'ingestion reale delle posizioni barche è nello scope M1/M2 (vedi PLAN.md).</p>';
    vpfDetailSheet.querySelector('.vpf-detail-close').addEventListener('click', closeDetail);
    vpfDetailOverlay.hidden = false;
  }

  // Animazione delle barche lungo l'anello di regata — un semplice
  // setInterval è sufficiente per un mockup e costa meno da mantenere di un
  // motore fisico; il ranking si aggiorna un po' meno spesso del redraw.
  var boatTickCount = 0;
  setInterval(function () {
    if (state.mapMode !== 'boats' || mapStage.offsetParent === null) return;
    BOATS.forEach(function (b) { b.progress += b.speed * 0.06; });
    drawMap();
    boatTickCount++;
    if (boatTickCount % 8 === 0) renderBoatList();
  }, 120);

  // ---- Legenda percorso di regata ----
  var mapLegendBtn = document.getElementById('mapLegendBtn');
  var mapLegendPopover = document.getElementById('mapLegendPopover');
  mapLegendBtn.addEventListener('click', function () { mapLegendPopover.hidden = !mapLegendPopover.hidden; });
  document.addEventListener('click', function (e) {
    if (!mapLegendPopover.hidden && e.target !== mapLegendBtn && !mapLegendBtn.contains(e.target) && !mapLegendPopover.contains(e.target)) {
      mapLegendPopover.hidden = true;
    }
  });

  // ---- Sheet: peek / espanso ----
  var vpfSheet = document.getElementById('vpfSheet');
  var vpfExpandLabel = document.getElementById('vpfExpandLabel');
  function setSheetExpanded(expanded) {
    state.sheetExpanded = expanded;
    vpfSheet.classList.toggle('expanded', expanded);
    mapStage.classList.toggle('sheet-expanded', expanded);
    vpfExpandLabel.textContent = expanded ? 'Mostra meno' : 'Mostra tutti';
    if (mapLegendPopover) mapLegendPopover.hidden = true;
  }
  document.getElementById('sheetGrabberRow').addEventListener('click', function () { setSheetExpanded(!state.sheetExpanded); });
  vpfExpandLabel.addEventListener('click', function () { setSheetExpanded(!state.sheetExpanded); });

  // ---------------------------------------------------------------------
  // Lista ranking (dock inferiore)
  // ---------------------------------------------------------------------
  function filteredPoints() {
    var q = state.searchQuery.trim().toLowerCase();
    return VANTAGE_POINTS.filter(function (vp) {
      var matchesFilter = state.activeFilter === 'all' || vp.tags.indexOf(state.activeFilter) !== -1;
      var matchesQuery = !q || vp.name.toLowerCase().indexOf(q) !== -1;
      return matchesFilter && matchesQuery;
    }).sort(function (a, b) { return scoreOf(b) - scoreOf(a); });
  }

  function scoreFactorRow(label, value) {
    return (
      '<div class="score-factor">' +
        '<span class="label">' + label + '</span>' +
        '<span class="track"><span class="fill" style="width:' + value + '%"></span></span>' +
        '<span class="val mono">' + value + '</span>' +
      '</div>'
    );
  }

  function renderVpfList() {
    var points = filteredPoints();
    vpfCount.textContent = points.length + (points.length === 1 ? ' punto' : ' punti') + (state.locationGranted ? '' : ' · posizione non attiva');

    if (points.length === 0) {
      vpfList.innerHTML =
        '<div class="empty-state">' +
        '<div class="icon-wrap"><svg class="icon"><use href="#icon-search-empty"/></svg></div>' +
        '<h3>Nessun punto trovato</h3>' +
        '<p>Nessun risultato per il filtro o la ricerca attuale. Prova a rimuoverli.</p>' +
        '<button class="btn-ghost" id="vpfEmptyReset" type="button">Azzera filtri</button>' +
        '</div>';
      var resetBtn = document.getElementById('vpfEmptyReset');
      if (resetBtn) resetBtn.addEventListener('click', resetFilters);
      return;
    }

    vpfList.innerHTML = points.map(function (vp) {
      var score = scoreOf(vp);
      var distText = state.locationGranted ? formatDistance(vp.distanceM) : 'attiva la posizione per la distanza';
      return (
        '<button class="vp-card' + (vp.current ? ' current' : '') + '" type="button" data-vp-id="' + vp.id + '">' +
          '<div class="vp-card-top">' +
            '<span class="vp-score-ring" style="--pct:' + score + '"><span>' + score + '</span></span>' +
            '<span class="vp-card-body">' +
              '<span class="vp-card-name">' + vp.name + '</span>' +
              '<span class="vp-card-meta"><span class="crowd-dot ' + vp.crowd + '"></span>' + distText + ' · ' + crowdLabel(vp.crowd) + '</span>' +
            '</span>' +
          '</div>' +
          '<div class="score-breakdown">' +
            scoreFactorRow('Rotta prevista', vp.factors.rotta) +
            scoreFactorRow('Linea di vista', vp.factors.vista) +
            scoreFactorRow('Affollamento', vp.factors.affollamento) +
          '</div>' +
        '</button>'
      );
    }).join('');

    Array.prototype.slice.call(vpfList.querySelectorAll('.vp-card')).forEach(function (card) {
      card.addEventListener('click', function () { openDetail(card.getAttribute('data-vp-id')); });
    });
  }

  function resetFilters() {
    state.activeFilter = 'all';
    state.searchQuery = '';
    vpfSearch.value = '';
    vpfSearchClear.hidden = true;
    Array.prototype.slice.call(vpfChips.querySelectorAll('.chip')).forEach(function (c) {
      c.classList.toggle('active', c.getAttribute('data-filter') === 'all');
    });
    renderVpfList();
  }

  vpfChips.addEventListener('click', function (e) {
    var chip = e.target.closest ? e.target.closest('.chip') : null;
    if (!chip) return;
    var filter = chip.getAttribute('data-filter');
    if (filter === 'near' && !state.locationGranted) {
      // Filtro non applicabile senza posizione: chiediamola invece di mostrare una lista silenziosamente sbagliata.
      setLocationGranted(true);
    }
    state.activeFilter = filter;
    Array.prototype.slice.call(vpfChips.querySelectorAll('.chip')).forEach(function (c) { c.classList.toggle('active', c === chip); });
    renderVpfList();
  });

  vpfSearch.addEventListener('input', function () {
    state.searchQuery = vpfSearch.value;
    vpfSearchClear.hidden = vpfSearch.value.length === 0;
    renderVpfList();
  });
  vpfSearchClear.addEventListener('click', function () {
    vpfSearch.value = '';
    state.searchQuery = '';
    vpfSearchClear.hidden = true;
    vpfSearch.focus();
    renderVpfList();
  });

  // ---------------------------------------------------------------------
  // Detail sheet: breakdown, rotta stimata, segnalazione affollamento
  // ---------------------------------------------------------------------
  var vpfDetailOverlay = document.getElementById('vpfDetailOverlay');
  var vpfDetailSheet = document.getElementById('vpfDetailSheet');

  function openDetail(id) {
    var vp = VANTAGE_POINTS.filter(function (v) { return v.id === id; })[0];
    if (!vp) return;
    state.activeVpId = id;
    drawMap();
    var score = scoreOf(vp);
    var distText = state.locationGranted ? formatDistance(vp.distanceM) + ' da te' : 'posizione non attiva';

    var dx = vp.x - COURSE.startPin.x, dyv = COURSE.startPin.y - vp.y;
    var bearingDeg = (Math.atan2(dx, dyv) * 180 / Math.PI + 360) % 360;

    vpfDetailSheet.innerHTML =
      '<div class="sheet-grabber"></div>' +
      '<div class="vpf-detail-head">' +
        '<span class="vp-score-ring" style="--pct:' + score + '"><span>' + score + '</span></span>' +
        '<span>' +
          '<h2>' + vp.name + '</h2>' +
          '<span class="meta">' + distText + ' · ' + crowdLabel(vp.crowd) + '</span>' +
        '</span>' +
        '<button class="vpf-detail-close" type="button" aria-label="Chiudi dettaglio"><svg class="icon"><use href="#icon-close"/></svg></button>' +
      '</div>' +
      '<div class="detail-section">' +
        '<h4>Perché questo punteggio</h4>' +
        '<div class="score-breakdown">' +
          scoreFactorRow('Rotta prevista', vp.factors.rotta) +
          scoreFactorRow('Linea di vista', vp.factors.vista) +
          scoreFactorRow('Affollamento', vp.factors.affollamento) +
        '</div>' +
      '</div>' +
      '<div class="detail-section">' +
        '<h4>Vista sul campo di regata</h4>' +
        '<div class="route-preview">' +
          '<span class="bearing-badge"><svg class="icon" style="transform:rotate(' + bearingDeg + 'deg)"><use href="#icon-locate"/></svg></span>' +
          '<span class="text"><b>Boa 1 verso ' + bearingLabel(bearingDeg) + '</b><span>Linea di partenza a vista, vento ' + WIND_KN + ' kn da ' + bearingLabel(WIND_DEG) + '</span></span>' +
        '</div>' +
      '</div>' +
      '<div class="detail-section">' +
        '<h4>Segnala quanto è affollato adesso</h4>' +
        '<div class="crowd-report-row">' +
          '<button class="crowd-report-btn" data-crowd="low" type="button">Poco</button>' +
          '<button class="crowd-report-btn" data-crowd="medium" type="button">Nella media</button>' +
          '<button class="crowd-report-btn" data-crowd="high" type="button">Molto</button>' +
        '</div>' +
        '<span class="crowd-report-confirm" id="crowdReportConfirm" hidden></span>' +
      '</div>' +
      '<div class="detail-section">' +
        '<h4>Come arrivare</h4>' +
        '<p style="font-size:0.82rem; color:var(--text-dim);">' + vp.transport + '</p>' +
        '<div class="detail-actions">' +
          '<button class="btn-secondary" type="button" disabled title="In roadmap — vedi PLAN.md, backlog di visione">Apri percorso</button>' +
          '<button class="btn-primary" type="button" id="saveVpBtn">' + (vp.current ? 'Punto salvato' : 'Salva come mio punto') + '</button>' +
        '</div>' +
        '<p class="route-note">Il routing verso il punto è nel backlog di visione (PLAN.md) — non ancora nello scope M1.</p>' +
      '</div>';

    vpfDetailSheet.querySelector('.vpf-detail-close').addEventListener('click', closeDetail);
    Array.prototype.slice.call(vpfDetailSheet.querySelectorAll('.crowd-report-btn')).forEach(function (btn) {
      btn.addEventListener('click', function () {
        Array.prototype.slice.call(vpfDetailSheet.querySelectorAll('.crowd-report-btn')).forEach(function (b) { b.classList.remove('selected'); });
        btn.classList.add('selected');
        vp.crowd = btn.getAttribute('data-crowd');
        var confirm = document.getElementById('crowdReportConfirm');
        confirm.hidden = false;
        confirm.textContent = 'Grazie — aggiornato per gli altri spettatori.';
        renderVpfList();
        drawMap();
      });
    });

    vpfDetailOverlay.hidden = false;
  }

  function closeDetail() {
    vpfDetailOverlay.hidden = true;
    state.activeVpId = null;
    state.activeBoatId = null;
    drawMap();
  }
  vpfDetailOverlay.addEventListener('click', function (e) {
    if (e.target === vpfDetailOverlay) closeDetail();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !vpfDetailOverlay.hidden) closeDetail();
  });

  // ---------------------------------------------------------------------
  // Dashboard (Home) — stile diretta.it: programma di oggi + news
  // ---------------------------------------------------------------------
  function renderFixtures() {
    var el = document.getElementById('fixtureList');
    el.innerHTML = FIXTURES.map(function (f) {
      var statusLabel = f.status === 'live' ? 'Live' : f.status === 'upcoming' ? 'A seguire' : 'Finita';
      return (
        '<div class="fixture-item">' +
          '<span class="fixture-time mono">' + f.time + '</span>' +
          '<span class="fixture-body">' +
            '<span class="fixture-name">' + f.name + '</span>' +
            '<span class="fixture-meta">' + f.meta + '</span>' +
          '</span>' +
          '<span class="fixture-status ' + f.status + '">' + statusLabel + '</span>' +
        '</div>'
      );
    }).join('');
  }

  function newsCardHtml(n) {
    return (
      '<div class="news-card">' +
        '<span class="news-top"><span class="news-tag">' + n.tag + '</span><span class="news-time">' + n.time + '</span></span>' +
        '<span class="news-title">' + n.title + '</span>' +
        '<span class="news-snippet">' + n.snippet + '</span>' +
      '</div>'
    );
  }
  function renderNews() {
    var html = NEWS.map(newsCardHtml).join('');
    document.getElementById('newsListHome').innerHTML = html;
    document.getElementById('newsListLive').innerHTML = html;
  }

  // ---------------------------------------------------------------------
  // Live — sotto-tab Diretta / Classifica / News (stile DAZN/Sky/ESPN)
  // ---------------------------------------------------------------------
  var liveSubnav = document.getElementById('liveSubnav');
  var livePanels = Array.prototype.slice.call(document.querySelectorAll('.live-panel'));
  liveSubnav.addEventListener('click', function (e) {
    var chip = e.target.closest ? e.target.closest('.chip') : null;
    if (!chip) return;
    var tab = chip.getAttribute('data-live-tab');
    state.liveTab = tab;
    Array.prototype.slice.call(liveSubnav.querySelectorAll('.chip')).forEach(function (c) { c.classList.toggle('active', c === chip); });
    livePanels.forEach(function (p) { p.hidden = p.getAttribute('data-live-panel') !== tab; });
  });

  function renderLiveTimeline() {
    document.getElementById('liveTimeline').innerHTML = LIVE_TIMELINE.map(function (item) {
      return (
        '<div class="timeline-item' + (item.highlight ? ' highlight' : '') + '">' +
          '<span class="timeline-dot"></span>' +
          '<span class="timeline-body">' +
            '<span class="timeline-time mono">' + item.time + '</span>' +
            '<span class="timeline-text">' + item.text + '</span>' +
          '</span>' +
        '</div>'
      );
    }).join('');
  }

  function renderStandings() {
    var trendIcon = { up: 'icon-trend-up', down: 'icon-trend-down', flat: 'icon-trend-flat' };
    document.getElementById('standingsList').innerHTML = STANDINGS.map(function (s, i) {
      return (
        '<div class="standing-row' + (i === 0 ? ' leader' : '') + '">' +
          '<span class="standing-pos mono">' + (i + 1) + '</span>' +
          '<span class="standing-name">' + s.name + '</span>' +
          '<span class="standing-gap mono">' + s.gap + '</span>' +
          '<svg class="icon standing-trend ' + s.trend + '"><use href="#' + trendIcon[s.trend] + '"/></svg>' +
        '</div>'
      );
    }).join('');
  }

  // ---------------------------------------------------------------------
  // Prediction Game — anteprima di design (M2): domanda attiva, classifica
  // giocatori, storico previsioni. Nessuna validazione reale: è interfaccia
  // statica, l'anti-cheat server-side resta un requisito per il prototipo
  // funzionante (CLAUDE.md §6), non per questo mockup.
  // ---------------------------------------------------------------------
  var predictOptionsEl = document.getElementById('predictOptions');
  var predictConfirmEl = document.getElementById('predictConfirm');
  var predictTimerEl = document.getElementById('predictTimer');
  var predictLocked = false;
  var predictSecondsLeft = GAME_QUESTION.closesInSec;

  function renderPredictCard() {
    document.getElementById('predictQuestion').textContent = GAME_QUESTION.text;
    document.getElementById('predictPoints').textContent = GAME_QUESTION.points;
    predictOptionsEl.innerHTML = GAME_QUESTION.options.map(function (opt) {
      return '<button class="predict-option" type="button" data-option="' + opt + '">' + opt + '</button>';
    }).join('');
    Array.prototype.slice.call(predictOptionsEl.querySelectorAll('.predict-option')).forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (predictLocked) return;
        predictLocked = true;
        predictOptionsEl.classList.add('locked');
        Array.prototype.slice.call(predictOptionsEl.querySelectorAll('.predict-option')).forEach(function (b) {
          b.classList.toggle('selected', b === btn);
        });
        predictConfirmEl.hidden = false;
      });
    });
  }
  function tickPredictTimer() {
    if (predictSecondsLeft <= 0 || predictLocked) return;
    predictSecondsLeft--;
    var m = Math.floor(predictSecondsLeft / 60), s = predictSecondsLeft % 60;
    predictTimerEl.textContent = m + ':' + (s < 10 ? '0' : '') + s;
    if (predictSecondsLeft === 0) {
      predictLocked = true;
      predictOptionsEl.classList.add('locked');
      predictTimerEl.textContent = 'Chiusa';
    }
  }
  setInterval(tickPredictTimer, 1000);

  function renderGameLeaderboard() {
    document.getElementById('gameScore').textContent = GAME_STATS.score.toLocaleString('it-IT');
    document.getElementById('gameRank').textContent = GAME_STATS.rank;
    document.getElementById('gameLeaderboard').innerHTML = GAME_LEADERBOARD.map(function (p, i) {
      return (
        '<div class="standing-row' + (p.you ? ' you' : '') + '">' +
          '<span class="standing-pos mono">' + (i + 1) + '</span>' +
          '<span class="standing-avatar">' + initials(p.name) + '</span>' +
          '<span class="standing-name">' + p.name + '</span>' +
          '<span class="standing-gap mono">' + p.points.toLocaleString('it-IT') + '</span>' +
        '</div>'
      );
    }).join('');
  }

  function renderGameHistory() {
    document.getElementById('gameHistory').innerHTML = GAME_HISTORY.map(function (item) {
      return (
        '<div class="timeline-item">' +
          '<span class="timeline-dot ' + (item.correct ? 'correct' : 'wrong') + '"></span>' +
          '<span class="timeline-body">' +
            '<span class="timeline-time mono">' + item.time + '</span>' +
            '<span class="timeline-text">' + item.text + '</span>' +
          '</span>' +
          '<span class="timeline-points ' + (item.correct ? 'correct' : 'wrong') + '">' + item.points + '</span>' +
        '</div>'
      );
    }).join('');
  }

  // ---------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------
  document.getElementById('windLabel').textContent = WIND_KN + ' kn · ' + bearingLabel(WIND_DEG);
  document.getElementById('currentLabel').textContent = CURRENT_KN.toFixed(1) + ' kn';
  renderVpfList();
  renderFixtures();
  renderNews();
  renderLiveTimeline();
  renderStandings();
  renderPredictCard();
  renderGameLeaderboard();
  renderGameHistory();
  mapResize();
})();
