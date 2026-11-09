/* ============================================================
   ⭐ 追星 Gallery —— DepthCarousel（原生 JS 复刻版）
   参数：depth=220, spread=105, tilt=24, perspective=1400,
         visibleCards=4, falloff=0.2, blur=6, autoplay=true, loop=true
   ============================================================ */
(function () {
  'use strict';

  var NAMESPACE = 'wyx_fandom_dc';
  if (window[NAMESPACE]) return; // 幂等

  var css = [
    '.fans-overlay{position:fixed;inset:0;z-index:9999;display:none;',
    'background:radial-gradient(ellipse at center,rgba(10,8,6,.94) 0%,rgba(0,0,0,.985) 100%);',
    'backdrop-filter:blur(10px);align-items:center;justify-content:center;flex-direction:column;overflow:hidden}',
    '.fans-overlay.show{display:flex}',
    '.fans-header{color:#ece1c6;font-family:"Special Elite","Noto Serif SC",serif;',
    'letter-spacing:4px;font-size:14px;margin-bottom:14px;opacity:.92}',
    '.fans-close{position:absolute;top:16px;right:20px;background:rgba(10,8,6,.6);',
    'border:1.5px solid rgba(236,225,198,.45);color:#ece1c6;width:40px;height:40px;',
    'border-radius:50%;cursor:pointer;font-size:16px;transition:.2s;z-index:10}',
    '.fans-close:hover{background:#cf202c;border-color:#cf202c;color:#fff;transform:rotate(90deg)}',
    '.dc-wrap{perspective:1400px;perspective-origin:50% 48%;width:min(92vw,920px);',
    'height:min(62vh,540px);position:relative;margin-top:4px}',
    '.dc-stage{position:absolute;inset:0;transform-style:preserve-3d}',
    '.dc-card{position:absolute;left:50%;top:50%;transform-origin:center center;',
    'backface-visibility:hidden;will-change:transform,opacity,filter;pointer-events:auto}',
    '.dc-card img{display:block;border-radius:4px;box-shadow:0 16px 40px rgba(0,0,0,.65);',
    'pointer-events:none;background:#1a1410;max-width:100%;max-height:100%;object-fit:cover}',
    '.dc-card.center .dc-idx{opacity:1}',
    '.dc-idx{position:absolute;bottom:-22px;left:50%;transform:translateX(-50%);',
    'color:rgba(236,225,198,.5);font-family:"Anonymous Pro",monospace;font-size:10px;',
    'letter-spacing:2px;opacity:0;transition:opacity .3s}',
    '.dc-dots{position:absolute;bottom:-18px;left:50%;transform:translateX(-50%);',
    'display:flex;gap:7px}',
    '.dc-dots span{width:8px;height:8px;border-radius:50%;background:rgba(236,225,198,.28);transition:.2s;cursor:pointer}',
    '.dc-dots span.on{background:#cf202c;transform:scale(1.25)}',
    '.dc-hint{color:rgba(236,225,198,.55);font-family:"Anonymous Pro",monospace;',
    'font-size:10px;margin-top:16px;letter-spacing:2px}',
    '.fans-prev,.fans-next{position:absolute;top:50%;transform:translateY(-50%);',
    'background:rgba(10,8,6,.5);color:#ece1c6;border:1px solid rgba(236,225,198,.35);',
    'width:44px;height:44px;border-radius:50%;cursor:pointer;font-size:20px;display:flex;',
    'align-items:center;justify-content:center;transition:.2s;z-index:10}',
    '.fans-prev:hover,.fans-next:hover{background:#cf202c;border-color:#cf202c;color:#fff}',
    '.fans-prev{left:18px}.fans-next{right:18px}',
    '.dc-card.pointerable{pointer-events:auto;cursor:grab}',
    '.dc-card.pointerable:active{cursor:grabbing}',
    '@media (max-width:760px){.dc-wrap{width:96vw;height:54vh}',
    '.fans-prev,.fans-next{display:none}}'
  ].join('');
  var st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  // 创建 DOM
  var overlay = document.createElement('div');
  overlay.id = 'fansOverlay';
  overlay.className = 'fans-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.innerHTML =
    '<button class="fans-close" id="fansClose" title="关闭">✕</button>' +
    '<div class="fans-header">⭐ 追 星 · Fandom Gallery</div>' +
    '<div class="dc-wrap" id="dcWrap">' +
      '<button class="fans-prev" id="fansPrev" aria-label="上一张">‹</button>' +
      '<div class="dc-stage" id="dcStage"></div>' +
      '<button class="fans-next" id="fansNext" aria-label="下一张">›</button>' +
      '<div class="dc-dots" id="dcDots"></div>' +
    '</div>' +
    '<div class="dc-hint">← → 翻页 / ESC 关闭 / 悬停暂停 / 拖拽翻页</div>';
  document.body.appendChild(overlay);

  var wrap = document.getElementById('dcWrap');
  var stage = document.getElementById('dcStage');
  var dotsEl = document.getElementById('dcDots');

  // 配置（对齐用户给的 DepthCarousel 参数）
  var conf = {
    depth: 220,
    spread: 105,
    tilt: 24,
    perspective: 1400,
    visibleCards: 4,
    falloff: 0.2,
    blur: 6,
    autoplay: true,
    loop: true,
    cardW: 210,
    cardH: 290,
    autoEvery: 3400
  };

  // 16 张粉丝照片（从 fans/star_01.webp 到 star_16.webp）
  var N = 16;
  var frames = [];
  for (var i = 1; i <= N; i++) {
    var card = document.createElement('div');
    card.className = 'dc-card';
    card.style.width = conf.cardW + 'px';
    card.style.height = conf.cardH + 'px';
    var img = document.createElement('img');
    img.src = 'fans/star_' + (i < 10 ? '0' : '') + i + '.webp';
    img.alt = 'star ' + i;
    img.width = conf.cardW;
    img.height = conf.cardH;
    img.loading = 'lazy';
    img.draggable = false;
    card.appendChild(img);
    stage.appendChild(card);
    frames.push(card);

    var dot = document.createElement('span');
    dot.setAttribute('data-i', i - 1);
    dotsEl.appendChild(dot);
  }

  // 状态
  var target = 0;    // 目标中心索引（带小数）
  var current = 0;   // 当前中心索引
  var hover = false;
  var autoTimer = null;
  var rafId = null;
  var open = false;

  // 渲染
  function render() {
    for (var i = 0; i < N; i++) {
      var pos = i - current;
      if (conf.loop) {
        if (pos > N / 2) pos -= N;
        else if (pos < -N / 2) pos += N;
      }
      var abs = Math.abs(pos);
      if (abs > conf.visibleCards + 0.6) {
        frames[i].style.visibility = 'hidden';
        frames[i].style.opacity = '0';
        continue;
      }
      frames[i].style.visibility = 'visible';
      var tx = pos * conf.spread;
      var tz = -abs * conf.depth;
      var rotY = pos * conf.tilt;
      var scale = 1 - abs * 0.14;
      var fade = Math.pow(1 - conf.falloff, abs);
      var br = 1 - abs * 0.12;
      var blurPx = Math.min(conf.blur, abs * conf.blur * 0.65);
      frames[i].style.transform =
        'translate(-50%,-50%) ' +
        'translateX(' + tx.toFixed(1) + 'px) ' +
        'translateZ(' + tz.toFixed(1) + 'px) ' +
        'rotateY(' + rotY.toFixed(1) + 'deg) ' +
        'scale(' + scale.toFixed(3) + ')';
      frames[i].style.opacity = Math.max(0.08, fade * br).toFixed(3);
      frames[i].style.filter = 'blur(' + blurPx.toFixed(1) + 'px) brightness(' + br.toFixed(3) + ')';
      frames[i].style.zIndex = Math.round(1000 - abs * 10);
      frames[i].classList.toggle('center', abs < 0.5);
    }
    // dots
    var topIdx = ((Math.round(current) % N) + N) % N;
    var dotKids = dotsEl.children;
    for (var k = 0; k < dotKids.length; k++) {
      dotKids[k].classList.toggle('on', parseInt(dotKids[k].getAttribute('data-i'), 10) === topIdx);
    }
  }

  // 动画帧
  function animate() {
    if (!open) { rafId = null; return; }
    var d = target - current;
    if (Math.abs(d) < 0.001) {
      current = target;
    } else {
      current += d * 0.12; // 平滑插值
    }
    render();
    rafId = requestAnimationFrame(animate);
  }

  function startAuto() {
    stopAuto();
    if (!conf.autoplay || hover || !open) return;
    autoTimer = setInterval(function () {
      if (!hover && open) {
        target += 1;
      }
    }, conf.autoEvery);
  }
  function stopAuto() {
    if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
  }

  function next() { target += 1; if (open) startAuto(); }
  function prev() { target -= 1; if (open) startAuto(); }

  // 打开遮罩
  function open() {
    target = 0; current = 0; hover = false;
    open = true;
    overlay.classList.add('show');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    render();
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(animate);
    startAuto();
  }

  // 关闭遮罩
  function close() {
    open = false;
    stopAuto();
    cancelAnimationFrame(rafId); rafId = null;
    overlay.classList.remove('show');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  // 事件绑定
  document.getElementById('fansClose').addEventListener('click', close);
  document.getElementById('fansPrev').addEventListener('click', prev);
  document.getElementById('fansNext').addEventListener('click', next);

  dotsEl.addEventListener('click', function (e) {
    var t = e.target;
    if (t && t.tagName === 'SPAN') {
      target = parseInt(t.getAttribute('data-i'), 10);
      startAuto();
    }
  });

  // 遮罩空白处点击关闭
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) close();
  });

  // 键盘
  document.addEventListener('keydown', function (e) {
    if (!open) return;
    if (e.key === 'ArrowRight') { next(); }
    else if (e.key === 'ArrowLeft') { prev(); }
    else if (e.key === 'Escape') { close(); }
  });

  // 悬停暂停
  wrap.addEventListener('mouseenter', function () { hover = true; });
  wrap.addEventListener('mouseleave', function () { hover = false; startAuto(); });

  // 触摸/鼠标拖拽
  var dragging = false, lastX = 0;
  wrap.addEventListener('pointerdown', function (e) {
    dragging = true;
    lastX = e.clientX;
    try { wrap.setPointerCapture(e.pointerId); } catch (_) {}
    stopAuto();
  });
  wrap.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var dx = e.clientX - lastX;
    lastX = e.clientX;
    target -= dx / 70;
  });
  wrap.addEventListener('pointerup', function (e) {
    if (!dragging) return;
    dragging = false;
    try { wrap.releasePointerCapture(e.pointerId); } catch (_) {}
    target = Math.round(target);
    startAuto();
  });
  wrap.addEventListener('pointercancel', function () {
    dragging = false;
    target = Math.round(target);
    startAuto();
  });

  // 导出
  window.openFandomGallery = open;
  window.closeFandomGallery = close;
  window[NAMESPACE] = { open: open, close: close };
})();
