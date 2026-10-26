/* ============================================================
   RubberSegment — 橡皮筋弹性分段导航（原生 JS 复刻 ReactBits 效果）
   黑色胶带轨道 + 奶油纸滑块：可点击、可拖拽，拖动时滑块像橡皮筋
   一样拉伸变薄，松手后带回弹地吸附到最近的栏目。
   ============================================================ */
(function () {
  'use strict';

  /* ---------- 样式注入 ---------- */
  var CSS = `
  .rs-track{
    position:relative; display:flex; align-items:stretch;
    height:40px; padding:3px; border-radius:8px;
    background:#27272a; border:1px solid #000;
    box-shadow:0 4px 0 rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.06);
    width:600px;
    touch-action:none; user-select:none; -webkit-user-select:none;
    cursor:grab;
  }
  .rs-thumb{
    position:absolute; top:3px; left:0; height:34px; width:70px;
    background:#efe5cd; border:1px solid #000; border-radius:8px;
    box-shadow:0 2px 6px rgba(0,0,0,.45);
    will-change:transform; pointer-events:none; z-index:0;
  }
  .rs-item{
    position:relative; z-index:1; flex:1 1 0; min-width:0;
    display:flex; align-items:center; justify-content:center;
    font-family:var(--f-type,'Special Elite'),monospace;
    font-size:13.5px; letter-spacing:1.5px;
    color:rgba(239,229,205,.85); background:transparent; border:0;
    padding:0 6px; cursor:pointer; -webkit-tap-highlight-color:transparent;
    transition:color .25s;
  }
  .rs-item.active{ color:#18181b; }
  .rs-item:focus-visible{ outline:1.5px dashed #cf202c; outline-offset:-4px; }
  @media (max-width:1020px){
    .rs-track{ width:min(520px, calc(100vw - 320px)); }
  }
  @media (max-width:760px){
    .rs-track{ width:min(92vw, 350px); height:34px; padding:2px; }
    .rs-thumb{ height:30px; top:2px; }
    .rs-item{ font-size:11px; letter-spacing:.5px; padding:0 2px; }
  }`;

  function injectCSS() {
    var s = document.createElement('style');
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ---------- 组件 ---------- */
  function RubberSegment(mount, opts) {
    opts = opts || {};
    var items      = opts.items || [];
    var onChange   = opts.onChange || function () {};
    var stretch    = (opts.stretch == null ? 100 : opts.stretch) / 100;  // 拉伸幅度
    var squash     = (opts.squash  == null ? 3   : opts.squash)  / 10;   // 压扁幅度
    var speed      = (opts.speed   == null ? 1   : opts.speed);
    var glide      = (opts.glide   == null ? 75  : opts.glide) / 100;   // 拖拽跟随弹性
    var draggable  = opts.draggable !== false;
    var inset      = 3;

    var track = document.createElement('div');
    track.className = 'rs-track';
    track.setAttribute('role', 'tablist');

    var thumb = document.createElement('div');
    thumb.className = 'rs-thumb';
    track.appendChild(thumb);

    /* items 支持字符串或 {label, target} 两种形式 */
    var labels = items.map(function (it) {
      return typeof it === 'string' ? it : (it.label || '');
    });
    var targets = items.map(function (it) {
      return typeof it === 'string' ? '' : (it.target || '');
    });

    var btns = labels.map(function (label, i) {
      var b = document.createElement('button');
      b.className = 'rs-item';
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.textContent = label;
      b.addEventListener('click', function () { setActive(i, true); });
      track.appendChild(b);
      return b;
    });
    mount.appendChild(track);

    var active = 0, slots = [], x = 0, v = 0, target = 0;
    var dragging = false, raf = null, lastT = 0;
    var lockUntil = 0; // 点击滚动期间暂停 scroll-spy

    function measure() {
      slots = btns.map(function (b) {
        return { pos: b.offsetLeft - inset, w: b.offsetWidth };
      });
      thumb.style.width = (slots[active] ? slots[active].w : 70) + 'px';
    }

    function applyTransform() {
      /* 橡皮筋形变：速度越快拉得越长、越薄 */
      var amt = Math.min(Math.abs(v) / 2200, 1);
      var sx = 1 + amt * stretch * 0.55;
      var sy = 1 - amt * squash * 0.28;
      if (dragging) {
        var lag = (target - x);
        var l = Math.min(Math.abs(lag) / 260, 1) * glide;
        sx = Math.max(sx, 1 + l * stretch * 0.45);
        sy = Math.min(sy, 1 - l * squash * 0.22);
      }
      thumb.style.transform =
        'translateX(' + x + 'px) scaleX(' + sx.toFixed(3) + ') scaleY(' + sy.toFixed(3) + ')';
    }

    function tick(t) {
      var dt = Math.min((t - lastT) / 1000, 1 / 30) || 0.016;
      lastT = t;
      if (dragging) {
        /* 拖拽：带弹性的跟随（glide 越大越"黏"） */
        var follow = 1 - Math.exp(-dt * (26 - glide * 14));
        x += (target - x) * follow;
        v = (target - x) * 6;
      } else {
        /* 释放：欠阻尼弹簧回弹吸附 */
        var k = 220 * speed, c = 2 * 0.55 * Math.sqrt(k);
        v += (-k * (x - target) - c * v) * dt;
        x += v * dt;
        if (Math.abs(v) < 6 && Math.abs(x - target) < 0.4) {
          x = target; v = 0; applyTransform(); raf = null; return;
        }
      }
      applyTransform();
      raf = requestAnimationFrame(tick);
    }

    function wake() {
      if (raf == null) { lastT = performance.now(); raf = requestAnimationFrame(tick); }
    }

    function nearestIndex() {
      var cx = x + (slots[active] ? slots[active].w / 2 : 0), best = 0, bd = 1e9;
      slots.forEach(function (s, i) {
        var d = Math.abs(s.pos + s.w / 2 - cx);
        if (d < bd) { bd = d; best = i; }
      });
      return best;
    }

    function setActive(i, scroll) {
      if (i === active && !scroll) return;
      active = i;
      btns.forEach(function (b, j) { b.classList.toggle('active', j === i); });
      b0(); // aria
      measure();
      target = slots[i].pos;
      wake();
      onChange(labels[i], i);
      if (scroll) {
        lockUntil = Date.now() + 1000;
        var el = targets[i] ? document.querySelector(targets[i]) : null;
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }

    function b0() {
      btns.forEach(function (b, j) { b.setAttribute('aria-selected', j === active ? 'true' : 'false'); });
    }

    /* ---------- 拖拽 ---------- */
    function px(e) {
      var r = track.getBoundingClientRect();
      return e.clientX - r.left - inset;
    }
    track.addEventListener('pointerdown', function (e) {
      if (!draggable) return;
      dragging = true;
      track.setPointerCapture(e.pointerId);
      track.style.cursor = 'grabbing';
      target = Math.max(0, Math.min(px(e), track.clientWidth - inset * 2 - slots[active].w));
      wake();
    });
    track.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      target = Math.max(0, Math.min(px(e), track.clientWidth - inset * 2 - slots[active].w));
    });
    function endDrag() {
      if (!dragging) return;
      dragging = false;
      track.style.cursor = 'grab';
      var i = nearestIndex();
      if (i !== active) {
        active = i;
        btns.forEach(function (b, j) { b.classList.toggle('active', j === i); });
        b0();
        onChange(labels[i], i);
        lockUntil = Date.now() + 1000;
        var el = targets[i] ? document.querySelector(targets[i]) : null;
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      measure();
      target = slots[active].pos;
      wake();
    }
    track.addEventListener('pointerup', endDrag);
    track.addEventListener('pointercancel', endDrag);

    window.addEventListener('resize', function () {
      measure();
      target = slots[active].pos;
      wake();
    });

    /* ---------- scroll-spy：滚动时滑块跟随所在板块 ---------- */
    if ('IntersectionObserver' in window) {
      var spy = new IntersectionObserver(function (entries) {
        if (Date.now() < lockUntil || dragging) return;
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          var i = targets.indexOf('#' + en.target.id);
          if (i > -1 && i !== active) {
            active = i;
            btns.forEach(function (b, j) { b.classList.toggle('active', j === i); });
            b0();
            measure();
            target = slots[i].pos;
            wake();
          }
        });
      }, { rootMargin: '-45% 0px -45% 0px' });
      targets.forEach(function (sel) {
        var el = sel ? document.querySelector(sel) : null;
        if (el) spy.observe(el);
      });
    }

    injectCSS();
    /* 初始化：同步执行，避免后台标签页 rAF 冻结导致滑块无位置 */
    function initPos() {
      measure();
      if (!slots[0] || !slots[0].w) return false; /* 布局未就绪，稍后重试 */
      x = target = slots[0].pos;
      thumb.style.width = slots[0].w + 'px';
      btns[0].classList.add('active');
      b0();
      applyTransform();
      return true;
    }
    if (!initPos()) requestAnimationFrame(initPos);

    this.setActive = setActive;
    this.track = track;
  }

  window.RubberSegment = RubberSegment;
})();
