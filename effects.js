/* ============================================================
 * effects.js —— 页面交互特效
 *  1. 滚动波动：板块随滚动做轻微正弦位移动画
 *  2. 点击涟漪：全屏 canvas 在点击处绘制扩散光环
 *  3. 与雾霭背景共存，性能优先（rAF 节流）
 * ============================================================ */
(function (global) {
  'use strict';

  /* ---------- 1. 滚动波动 ---------- */
  function initScrollWave() {
    const sections = Array.from(document.querySelectorAll('.section'));
    if (!sections.length) return;

    let ticking = false;
    const vh = () => global.innerHeight || document.documentElement.clientHeight;

    function update() {
      const viewH = vh();
      sections.forEach(sec => {
        const rect = sec.getBoundingClientRect();
        // 板块中心相对视口中心的归一化位置 (-1 ~ 1)
        const center = (rect.top + rect.height / 2) / viewH - 0.5;
        const norm = Math.max(-1, Math.min(1, center * 2));
        // 正弦波动：越靠近视口中心位移越小，边缘轻微上下浮动
        const wave = Math.sin(norm * Math.PI) * 8;
        // 轻微透视倾斜，营造流动感
        const tilt = norm * 0.4;
        sec.style.transform = `translateY(${wave.toFixed(2)}px) perspective(1200px) rotateX(${tilt.toFixed(2)}deg)`;
        sec.style.transition = 'transform .15s ease-out';
      });
      ticking = false;
    }

    function onScroll() {
      if (!ticking) {
        ticking = true;
        global.requestAnimationFrame(update);
      }
    }

    global.addEventListener('scroll', onScroll, { passive: true });
    global.addEventListener('resize', onScroll);
    update();
  }

  /* ---------- 2. 点击局部故障（Glitch）效果 ---------- */
  function initGlitch() {
    const canvas = document.createElement('canvas');
    canvas.id = 'rippleCanvas';
    Object.assign(canvas.style, {
      position: 'fixed', inset: '0',
      width: '100vw', height: '100vh',
      pointerEvents: 'none', zIndex: '9999',
      display: 'block',
      mixBlendMode: 'screen',
    });
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    const dpr = Math.min(global.devicePixelRatio || 1, 2);
    let W = 0, H = 0;

    function resize() {
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    global.addEventListener('resize', resize);

    const COLORS = ['#4fc3f7', '#ff4fc3', '#b478ff']; // 青 / 品红 / 紫
    const glitches = [];

    function spawn(x, y) {
      const bands = [];
      const n = 5 + (Math.random() * 4) | 0;
      for (let i = 0; i < n; i++) {
        bands.push({
          oy: (Math.random() - 0.5) * 1.7,        // 相对半径的 y 偏移
          h: 1.5 + Math.random() * 3.5,            // 条带高度
          dx: (Math.random() - 0.5) * 36,          // 水平错位（RGB 分离感）
          color: COLORS[(Math.random() * COLORS.length) | 0],
          a: 0.45 + Math.random() * 0.4,           // 基础透明度
        });
      }
      glitches.push({ x, y, r: 95, start: performance.now(), dur: 360, bands });
    }

    let lastSpawn = 0;
    function onDown(e) {
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      const now = performance.now();
      if (now - lastSpawn < 30) return; // 去抖：pointerdown + mousedown 只触发一次
      lastSpawn = now;
      spawn(e.clientX, e.clientY);
    }
    global.addEventListener('pointerdown', onDown, { passive: true });
    global.addEventListener('mousedown', onDown, { passive: true });

    // 调试接口（正式版可移除）
    global.__glitch = { spawn, glitches, ctx };

    function loop() {
      if (glitches.length) {
        ctx.clearRect(0, 0, W, H);
        const now = performance.now();
        for (let i = glitches.length - 1; i >= 0; i--) {
          const g = glitches[i];
          const p = (now - g.start) / g.dur;
          if (p >= 1) { glitches.splice(i, 1); continue; }
          const fade = 1 - p;
          const r = g.r * (1 + p * 0.4);          // 轻微扩散
          ctx.save();
          ctx.beginPath();
          ctx.arc(g.x, g.y, r, 0, Math.PI * 2);
          ctx.clip();
          for (const b of g.bands) {
            const by = g.y + b.oy * r;
            const bx = g.x + b.dx * fade;
            ctx.globalAlpha = b.a * fade;
            ctx.fillStyle = b.color;
            ctx.fillRect(g.x - r, by - b.h / 2, r * 2, b.h);
          }
          ctx.restore();
        }
      } else {
        ctx.clearRect(0, 0, W, H);
      }
      global.requestAnimationFrame(loop);
    }
    loop();
  }

  /* ---------- 启动 ---------- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { initScrollWave(); });
  } else {
    initScrollWave();
  }
})(typeof window !== 'undefined' ? window : this);
