/* ============================================================
   课外也喜欢 —— 3D 圆柱轮播（原生 JS 复刻 CircularCarousel 的 cylinder 预设）
   卡片沿圆周均分排布，整体缓慢自转；进入视口才启动，悬停暂停，
   按卡片实际朝向动态压暗背面，形成真实的圆柱纵深。
   ============================================================ */
(function () {
  'use strict';

  var root = document.getElementById('hobbyCarousel');
  if (!root) return;

  var ITEMS = [
    { emoji: '📖', title: '阅读', sub: 'Reading' },
    { emoji: '✈️', title: '旅游', sub: 'Travel' },
    { emoji: '⭐', title: '追星', sub: 'Fandom' },
    { emoji: '🧩', title: 'Puzzle', sub: 'Jigsaw' },
    { emoji: '🎬', title: '观影', sub: 'Cinema' },
    { emoji: '💻', title: '敲代码', sub: 'Coding' }
  ];

  var CARD = 220;          // 卡片边长
  var GAP = 26;            // 相邻卡片弧面留白
  var SPEED = 14;          // 自转速度（度/秒）
  var N = ITEMS.length;
  var STEP = 360 / N;
  // 圆柱半径：让相邻卡片中心弧距 = 卡片宽度 + 间距
  var RADIUS = Math.round((CARD + GAP) / (2 * Math.sin(Math.PI / N)));

  var angle = 0;
  var cards = [];
  var running = false;
  var lastTime = 0;

  /* 拖拽状态 */
  var dragging = false;
  var dragStartX = 0;
  var dragStartAngle = 0;
  var prevX = 0;
  var prevTime = 0;
  var lastVx = 0;          // px / ms
  var inertia = 0;         // 松手后的惯性角速度（度/秒）
  var dragMoved = 0;       // 本次拖拽的位移量，用于区分点击
  var downCard = null;     // 按下时命中的卡片
  var downFacing = 180;    // 按下时该卡片与正面的夹角（度）
  var SENSITIVITY = 0.32;  // 每像素拖动对应的旋转角度

  var rise = document.createElement('div');
  rise.className = 'hc-rise pre';

  var viewport = document.createElement('div');
  viewport.className = 'hc-viewport';

  var stage = document.createElement('div');
  stage.className = 'hc-stage';

  for (var i = 0; i < N; i++) {
    var item = ITEMS[i];
    var card = document.createElement('div');
    card.className = 'hc-card';
    card.setAttribute('data-title', item.title);
    card.style.transform = 'rotateY(' + (i * STEP) + 'deg) translateZ(' + RADIUS + 'px)';
    card.innerHTML =
      '<div class="hc-inner">' +
        '<div class="hc-emoji">' + item.emoji + '</div>' +
        '<div class="hc-title">' + item.title + '</div>' +
        '<div class="hc-sub">' + item.sub + '</div>' +
      '</div>';
    stage.appendChild(card);
    cards.push(card);
  }

  viewport.appendChild(stage);
  rise.appendChild(viewport);
  root.appendChild(rise);

  /* 依据卡片当前朝向计算明暗：0° 正面最亮，180° 背面最暗 */
  function paint() {
    stage.style.transform = 'rotateY(' + angle.toFixed(2) + 'deg)';
    for (var i = 0; i < cards.length; i++) {
      var a = (((angle + i * STEP) % 360) + 360) % 360;
      var d = a > 180 ? 360 - a : a;
      var t = d / 180;
      /* 只有朝向正面的卡片可点击：避免背向卡片与卡片间的空白区域误触 */
      cards[i].style.pointerEvents = d < 90 ? 'auto' : 'none';
      if (t > 0.42) {
        var k = (t - 0.42) / 0.58;          // 0 边缘 → 1 正背面
        cards[i].style.filter = 'brightness(' + (1 - k * 0.55).toFixed(2) + ') blur(' + (k * 1.4).toFixed(2) + 'px)';
        cards[i].style.opacity = (1 - k * 0.45).toFixed(2);
      } else {
        cards[i].style.filter = 'none';
        cards[i].style.opacity = '1';
      }
    }
  }

  function loop(now) {
    if (!running) return;
    if (!lastTime) lastTime = now;
    var dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;

    if (dragging) {
      /* 拖拽中由 pointermove 直接改写 angle */
    } else if (inertia) {
      angle += inertia * dt;
      inertia *= Math.pow(0.9, dt * 60);
      if (Math.abs(inertia) < 6) inertia = 0;
    } else {
      angle -= SPEED * dt;
    }

    paint();
    requestAnimationFrame(loop);
  }

  function start() {
    if (running) return;
    running = true;
    lastTime = 0;
    requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
  }

  /* 窄屏等比缩放整个舞台，保证圆柱完整落在容器内 */
  function fit() {
    var need = RADIUS * 2 + CARD;
    var s = Math.min(1, root.clientWidth / need);
    viewport.style.transform = s < 0.99 ? 'scale(' + s.toFixed(3) + ')' : 'none';
  }

  window.addEventListener('resize', fit);

  /* 卡片与正面的夹角（0 = 正对屏幕，180 = 完全背向） */
  function facingOf(i) {
    var a = (((angle + i * STEP) % 360) + 360) % 360;
    return a > 180 ? 360 - a : a;
  }

  /* ---------- 鼠标 / 触屏拖拽旋转 ---------- */
  function onPointerDown(e) {
    if (e.button !== undefined && e.button !== 0) return;
    dragging = true;
    dragStartX = e.clientX;
    dragStartAngle = angle;
    prevX = e.clientX;
    prevTime = e.timeStamp;
    lastVx = 0;
    inertia = 0;
    dragMoved = 0;
    downCard = e.target && e.target.closest ? e.target.closest('.hc-card') : null;
    downFacing = downCard ? facingOf(cards.indexOf(downCard)) : 180;
    root.style.cursor = 'grabbing';
    start();
    try { root.setPointerCapture(e.pointerId); } catch (err) { /* 忽略不支持捕获的环境 */ }
  }

  function onPointerMove(e) {
    if (!dragging) return;
    var dx = e.clientX - dragStartX;
    dragMoved = Math.abs(dx);
    angle = dragStartAngle + dx * SENSITIVITY;
    var span = e.timeStamp - prevTime;
    if (span > 0) lastVx = (e.clientX - prevX) / span;
    prevX = e.clientX;
    prevTime = e.timeStamp;
    paint();
  }

  function onPointerUp(e) {
    if (!dragging) return;
    dragging = false;
    root.style.cursor = 'grab';
    /* px/ms → 度/秒，作为松手后的惯性 */
    inertia = lastVx * SENSITIVITY * 1000;
    if (Math.abs(inertia) < 8) inertia = 0;
    /* 未拖动、且点中的是正朝向的「阅读」卡片，才视为点击 */
    if (dragMoved < 6 && downCard && downFacing < 90 &&
        downCard.getAttribute('data-title') === '阅读') {
      if (typeof window.openReadingGallery === 'function') window.openReadingGallery();
    }
    downCard = null;
    try { root.releasePointerCapture(e.pointerId); } catch (err) { /* 忽略 */ }
  }

  /* 触屏滚动等导致的取消手势，不应当成点击 */
  function onPointerCancel(e) {
    if (!dragging) return;
    dragging = false;
    root.style.cursor = 'grab';
    inertia = 0;
    downCard = null;
    try { root.releasePointerCapture(e.pointerId); } catch (err) { /* 忽略 */ }
  }

  root.addEventListener('pointerdown', onPointerDown);
  root.addEventListener('pointermove', onPointerMove);
  root.addEventListener('pointerup', onPointerUp);
  root.addEventListener('pointercancel', onPointerCancel);

  fit();
  paint();

  var io = new IntersectionObserver(function (entries) {
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].isIntersecting) {
        rise.classList.remove('pre');
        start();
      } else {
        stop();
      }
    }
  }, { threshold: 0.2 });
  io.observe(root);
})();
