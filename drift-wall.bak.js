/* ============================================================
   DriftWall —— 3D 倾斜漂浮照片墙（原生 JS 复刻 React Bits）
   功能：多列瓦片持续向上漂流、独立无缝循环、透视 3D 倾斜、
        深度分层、鼠标视差、悬停抬升、边缘渐隐、压暗
   用法：new DriftWall(container, { items, columns, ... })
   ============================================================ */
(function (global) {
  'use strict';

  var STYLE_ID = 'drift-wall-style';

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var css = ''
      + '.dw-wall{position:relative;width:100%;height:600px;overflow:hidden;}'
      + '.dw-wall *{box-sizing:border-box;}'
      + '.dw-viewport{position:absolute;inset:0;display:flex;justify-content:center;align-items:flex-start;}'
      + '.dw-stage{position:relative;display:flex;transform-style:preserve-3d;will-change:transform;}'
      + '.dw-col{position:relative;flex:0 0 auto;transform-style:preserve-3d;}'
      + '.dw-track{transform-style:preserve-3d;will-change:transform;}'
      + '.dw-tile{display:block;position:relative;width:200px;height:132px;margin-bottom:18px;'
      +   'border-radius:10px;overflow:hidden;text-decoration:none;'
      +   'border:1px solid rgba(168,85,247,.35);'
      +   'box-shadow:0 8px 28px rgba(6,0,16,.55);'
      +   'filter:brightness(.55) saturate(.9);'
      +   'transition:transform .35s cubic-bezier(.2,.8,.2,1),filter .35s,box-shadow .35s;'
      +   'backface-visibility:hidden;}'
      + '.dw-tile img{width:100%;height:100%;object-fit:cover;display:block;pointer-events:none;}'
      + '.dw-name{position:absolute;left:0;right:0;bottom:0;margin:0;padding:22px 10px 8px;'
      +   'font-size:13px;font-weight:700;letter-spacing:1px;color:#fff;text-align:center;'
      +   'background:linear-gradient(180deg,rgba(6,0,16,0) 0%,rgba(6,0,16,.9) 100%);'
      +   'text-shadow:0 1px 6px rgba(0,0,0,.8);pointer-events:none;}'
      + '.dw-tile:hover,.dw-tile:focus-visible{'
      +   'transform:translateZ(64px) scale(1.07);'
      +   'filter:brightness(1.1) saturate(1.15);'
      +   'box-shadow:0 18px 50px rgba(168,85,247,.55),0 0 0 1px rgba(217,180,255,.7);'
      +   'outline:none;z-index:5;}'
      + '.dw-tile:hover .dw-name{color:#e9d5ff;}'
      + '.dw-overlay{position:absolute;inset:0;pointer-events:none;background:rgba(6,0,16,.22);z-index:4;}'
      + '.dw-fade{position:absolute;inset:0;pointer-events:none;z-index:6;'
      +   '-webkit-mask:linear-gradient(180deg,transparent 0%,#000 16%,#000 84%,transparent 100%);'
      +   'mask:linear-gradient(180deg,transparent 0%,#000 16%,#000 84%,transparent 100%);}'
      + '.dw-hint{position:absolute;left:0;right:0;bottom:14px;text-align:center;z-index:7;'
      +   'font-size:12px;letter-spacing:2px;color:rgba(233,213,255,.75);pointer-events:none;'
      +   'text-shadow:0 1px 8px rgba(0,0,0,.9);}';
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = css;
    document.head.appendChild(s);
  }

  function DriftWall(container, opts) {
    injectStyle();
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    this.opts = Object.assign({
      items: [],
      columns: 5,
      tileWidth: 200,
      tileHeight: 132,
      gap: 18,
      tilt: 16,        // rotateX 度
      turn: -14,       // rotateY 度
      perspective: 1200,
      depth: 120,
      speed: 42,       // px / 秒
      direction: 'up',
      variance: 0.45,  // 各列速度/相位差异
      parallax: 0.6,
      lift: 64,
      fade: 0.6,
      dim: 0.55,
      overlayColor: '#060010',
      hint: '',
    }, opts);

    this._cols = [];
    this._mouse = { x: 0, y: 0 };     // 归一化 -0.5~0.5
    this._rot = { x: this.opts.tilt, y: this.opts.turn };
    this._scale = 1;
    this._last = performance.now();
    this._running = true;

    this._build();
    this._bind();
    this._loop = this._loop.bind(this);
    global.requestAnimationFrame(this._loop);
  }

  DriftWall.prototype._build = function () {
    var o = this.opts;
    var wall = document.createElement('div');
    wall.className = 'dw-wall';

    var viewport = document.createElement('div');
    viewport.className = 'dw-viewport';
    viewport.style.perspective = o.perspective + 'px';

    var stage = document.createElement('div');
    stage.className = 'dw-stage';
    this._stage = stage;
    viewport.appendChild(stage);

    // 每列需要的瓦片数（覆盖 600px 高度 + 余量）
    var step = o.tileHeight + o.gap;
    var perSet = Math.ceil(640 / step);
    var setH = perSet * step;

    for (var c = 0; c < o.columns; c++) {
      var col = document.createElement('div');
      col.className = 'dw-col';
      col.style.width = o.tileWidth + 'px';
      col.style.marginRight = (c < o.columns - 1 ? o.gap : 0) + 'px';

      // 深度分层：中间列最近
      var norm = Math.abs(c - (o.columns - 1) / 2) / ((o.columns - 1) / 2); // 0 中 ~ 1 边
      var z = (1 - norm) * o.depth;
      col.style.transform = 'translateZ(' + z + 'px)';

      var track = document.createElement('div');
      track.className = 'dw-track';
      col.appendChild(track);

      // 两份拷贝 → 无缝循环
      for (var copy = 0; copy < 2; copy++) {
        for (var k = 0; k < perSet; k++) {
          var item = o.items[(k + c) % o.items.length];
          track.appendChild(this._makeTile(item));
        }
      }

      stage.appendChild(col);

      // variance：各列独立相位 + 轻微速度差异
      var dir = o.direction === 'down' ? -1 : 1;
      this._cols.push({
        track: track,
        y: -Math.random() * setH,
        setH: setH,
        mult: dir * (1 + (Math.random() - 0.5) * o.variance),
      });
    }

    // 叠加色
    var overlay = document.createElement('div');
    overlay.className = 'dw-overlay';
    overlay.style.background = hexToRgba(o.overlayColor, 0.22);
    wall.appendChild(viewport);
    wall.appendChild(overlay);

    // 边缘渐隐层（用一层透明遮罩元素实现 fade）
    var fadeEl = document.createElement('div');
    fadeEl.className = 'dw-fade';
    wall.appendChild(fadeEl);

    if (o.hint) {
      var hint = document.createElement('div');
      hint.className = 'dw-hint';
      hint.textContent = o.hint;
      wall.appendChild(hint);
    }

    this.container.innerHTML = '';
    this.container.appendChild(wall);
    this._wall = wall;
    this._fit();
  };

  DriftWall.prototype._makeTile = function (item) {
    var a = document.createElement('a');
    a.className = 'dw-tile';
    a.href = item.href || '#';
    if (item.target) a.target = item.target;
    a.rel = 'noopener';
    var img = document.createElement('img');
    img.src = item.image;
    img.alt = item.title;
    img.loading = 'lazy';
    a.appendChild(img);
    var name = document.createElement('span');
    name.className = 'dw-name';
    name.textContent = item.title;
    a.appendChild(name);
    return a;
  };

  DriftWall.prototype._fit = function () {
    // 小屏等比缩小，保证 5 列完整可见
    var need = this.opts.columns * this.opts.tileWidth + (this.opts.columns - 1) * this.opts.gap;
    var w = this._wall.clientWidth || need;
    this._scale = Math.min(1, w / need);
    this._stage.style.marginTop = '40px';
  };

  DriftWall.prototype._bind = function () {
    var self = this;
    this._onMove = function (e) {
      var rect = self._wall.getBoundingClientRect();
      self._mouse.x = (e.clientX - rect.left) / rect.width - 0.5;
      self._mouse.y = (e.clientY - rect.top) / rect.height - 0.5;
    };
    this._onLeave = function () {
      self._mouse.x = 0;
      self._mouse.y = 0;
    };
    this._onResize = function () { self._fit(); };
    this._wall.addEventListener('mousemove', this._onMove);
    this._wall.addEventListener('mouseleave', this._onLeave);
    global.addEventListener('resize', this._onResize);
  };

  DriftWall.prototype._loop = function (now) {
    if (!this._running) return;
    var dt = Math.min(0.05, (now - this._last) / 1000);
    this._last = now;
    var o = this.opts;

    // 各列向上漂流 + 独立无缝循环
    for (var i = 0; i < this._cols.length; i++) {
      var col = this._cols[i];
      col.y -= o.speed * col.mult * dt;
      if (col.y <= -col.setH) col.y += col.setH;
      if (col.y > 0) col.y -= col.setH;
      col.track.style.transform = 'translateY(' + col.y.toFixed(2) + 'px)';
    }

    // 鼠标视差（平滑插值）
    var targetY = o.turn + this._mouse.x * 14 * o.parallax;
    var targetX = o.tilt - this._mouse.y * 10 * o.parallax;
    this._rot.x += (targetX - this._rot.x) * 0.06;
    this._rot.y += (targetY - this._rot.y) * 0.06;

    this._stage.style.transform =
      'scale(' + this._scale + ') rotateX(' + this._rot.x.toFixed(2) + 'deg) rotateY(' + this._rot.y.toFixed(2) + 'deg)';

    global.requestAnimationFrame(this._loop);
  };

  DriftWall.prototype.destroy = function () {
    this._running = false;
    this._wall.removeEventListener('mousemove', this._onMove);
    this._wall.removeEventListener('mouseleave', this._onLeave);
    global.removeEventListener('resize', this._onResize);
    if (this._wall && this._wall.parentNode) this._wall.parentNode.removeChild(this._wall);
  };

  function hexToRgba(hex, alpha) {
    var h = (hex || '').replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + alpha + ')';
  }

  global.DriftWall = DriftWall;
})(window);
