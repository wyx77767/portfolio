/* ============================================================
   Particles — 全站背景飘浮微粒（原生 Canvas，复刻 ReactBits 效果）
   白色微尘缓慢漂移 + 轻微轨道旋转，鼠标悬停时被轻轻推开；
   黑板模式下白尘、牛皮纸模式下墨点。置于颗粒纹理之上、暗角之下。
   ============================================================ */
(function () {
  'use strict';

  var CFG = {
    colors: ['#ffffff'],
    count: 200,        // particleCount
    spread: 10,        // particleSpread
    speed: 0.1,        // speed
    baseSize: 100,     // particleBaseSize（内部缩放为 1~3.5px 尘埃）
    hoverForce: true,  // moveParticlesOnHover
    rotation: true,    // disableRotation:false → 开启轨道旋转
  };

  var canvas = document.createElement('canvas');
  canvas.id = 'bg-particles';
  canvas.setAttribute('aria-hidden', 'true');
  var css = document.createElement('style');
  css.textContent =
    '#bg-particles{position:fixed;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none;opacity:.75;transition:opacity .6s}' +
    'html[data-theme="light"] #bg-particles{opacity:.5}';
  document.head.appendChild(css);

  function mount() {
    document.body.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    var W = 0, H = 0, DPR = 1;
    var parts = [];
    var mouse = { x: -9999, y: -9999 };
    var running = true, raf = null, t = 0;

    function resize() {
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = W * DPR; canvas.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      seed();
    }

    function seed() {
      var n = W < 760 ? Math.round(CFG.count * 0.6) : CFG.count;
      parts.length = 0;
      for (var i = 0; i < n; i++) {
        parts.push({
          ax: Math.random() * W,            /* 锚点 */
          ay: Math.random() * H,
          x: 0, y: 0,
          dx: (Math.random() - 0.5) * 2,    /* 漂移扰动 */
          dy: (Math.random() - 0.5) * 2,
          r: 0.6 + Math.random() * (CFG.baseSize / 100) * 2.9, /* 0.6~3.5px */
          a: 0.25 + Math.random() * 0.65,   /* 亮度层次 */
          orbR: 4 + Math.random() * 18,     /* 轨道半径 */
          orbA: Math.random() * Math.PI * 2,
          orbS: (0.0012 + Math.random() * 0.0025) * (Math.random() < 0.5 ? -1 : 1),
          fx: 0, fy: 0,                     /* 鼠标推力 */
        });
        parts[i].x = parts[i].ax; parts[i].y = parts[i].ay;
      }
    }

    function themeColors() {
      var light = document.documentElement.getAttribute('data-theme') === 'light';
      return light ? ['#3a2c17'] : CFG.colors;
    }

    function step() {
      if (!running) { raf = null; return; }
      t += 1;
      ctx.clearRect(0, 0, W, H);
      var colors = themeColors();
      var sp = CFG.speed;
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        /* 锚点缓慢漂移（speed 0.1 → 很慢） */
        p.ax += p.dx * sp * 0.35;
        p.ay += p.dy * sp * 0.35;
        /* 出界回绕 */
        if (p.ax < -30) p.ax = W + 30; else if (p.ax > W + 30) p.ax = -30;
        if (p.ay < -30) p.ay = H + 30; else if (p.ay > H + 30) p.ay = -30;

        /* 轨道旋转（disableRotation=false） */
        if (CFG.rotation) {
          p.orbA += p.orbS;
        }
        var tx = p.ax + Math.cos(p.orbA) * p.orbR;
        var ty = p.ay + Math.sin(p.orbA) * p.orbR;

        /* 鼠标悬停轻推 */
        if (CFG.hoverForce) {
          var ddx = p.x - mouse.x, ddy = p.y - mouse.y;
          var d2 = ddx * ddx + ddy * ddy;
          if (d2 < 14400 && d2 > 0.01) {          /* 120px 半径 */
            var f = (14400 - d2) / 14400 * 2.2;
            var d = Math.sqrt(d2);
            p.fx += (ddx / d) * f; p.fy += (ddy / d) * f;
          }
        }
        p.fx *= 0.9; p.fy *= 0.9;
        p.x += (tx - p.x) * 0.04 + p.fx;
        p.y += (ty - p.y) * 0.04 + p.fy;

        ctx.globalAlpha = p.a;
        ctx.fillStyle = colors[i % colors.length];
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(step);
    }

    function wake() {
      if (raf == null) raf = requestAnimationFrame(step);
    }

    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', function (e) {
      mouse.x = e.clientX; mouse.y = e.clientY;
    }, { passive: true });
    window.addEventListener('pointerleave', function () {
      mouse.x = -9999; mouse.y = -9999;
    });
    document.addEventListener('visibilitychange', function () {
      running = !document.hidden;
      if (running) wake();
    });

    resize();
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      /* 减弱动效偏好：只画一帧静态 */
      running = false;
      ctx.clearRect(0, 0, W, H);
      var colors = themeColors();
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        ctx.globalAlpha = p.a * 0.7;
        ctx.fillStyle = colors[i % colors.length];
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else {
      wake();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
