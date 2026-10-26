/* ============================================================
 * ShardsBackground — 全屏漂浮玻璃碎片背景（AeroShards 风格）
 * Three.js r128，InstancedMesh 批量渲染，珍珠质感材质，
 * 流式飘动 + 鼠标排斥 + 紫色调发光，与赛博朋克主题契合。
 *
 * 用法：
 *   const sb = new ShardsBackground({ dark: true });
 *   sb.setDark(false);
 *   sb.onResize();
 *   sb.dispose();
 * ============================================================ */
(function (global) {
  'use strict';

  class ShardsBackground {
    constructor(opts = {}) {
      this.opts = Object.assign({
        pixelRatio: Math.min((global.devicePixelRatio || 1) * 0.6, 1.25),
        count: 120,
        dark: true,
      }, opts);

      this._disposed = false;
      this._dark = this.opts.dark;
      this._mouse = new THREE.Vector2(-999, -999);
      this._mouseTarget = new THREE.Vector2(-999, -999);

      this._buildCanvas();
      this._initThree();
      this._buildScene();
      this._bindEvents();
      this.onResize();
      this._startLoop();
    }

    _buildCanvas() {
      const canvas = document.createElement('canvas');
      canvas.id = 'shardsCanvas';
      canvas.setAttribute('aria-hidden', 'true');
      Object.assign(canvas.style, {
        position: 'fixed', inset: '0',
        width: '100vw', height: '100vh',
        zIndex: '-2', pointerEvents: 'none',
        display: 'block',
      });
      document.body.appendChild(canvas);
      this.canvas = canvas;
    }

    _initThree() {
      const THREE = global.THREE;
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas, alpha: true, antialias: true,
        powerPreference: 'high-performance',
      });
      this.renderer.setPixelRatio(this.opts.pixelRatio);
      this.renderer.setClearColor(0x000000, 0);
    }

    _buildScene() {
      const THREE = global.THREE;
      this.scene = new THREE.Scene();
      // 透视相机，让碎片有近大远小的纵深感
      this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
      this.camera.position.set(0, 0, 18);

      const colors = this._palette();

      // 拉长的碎片几何体（扁长条形，像玻璃碎片）
      const shardGeo = new THREE.PlaneGeometry(0.35, 1.4, 1, 1);

      this.material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      this.count = this.opts.count;
      this.mesh = new THREE.InstancedMesh(shardGeo, this.material, this.count);
      this.mesh.frustumCulled = false;
      this.scene.add(this.mesh);

      // 每个碎片的属性
      this.dummy = new THREE.Object3D();
      this.positions = new Float32Array(this.count * 3);
      this.velocities = new Float32Array(this.count * 3);
      this.rotSpeeds = new Float32Array(this.count * 3);
      this.scales = new Float32Array(this.count);
      this.colors = new Float32Array(this.count * 3);
      this.baseAlpha = new Float32Array(this.count);

      const tmpColor = new THREE.Color();
      for (let i = 0; i < this.count; i++) {
        // 随机分布在相机前方空间
        const z = -2 + Math.random() * 20;
        const spread = 14 + z * 0.4;
        this.positions[i * 3]     = (Math.random() - 0.5) * spread * 2;
        this.positions[i * 3 + 1] = (Math.random() - 0.5) * spread * 1.2;
        this.positions[i * 3 + 2] = z;

        // 流式飘动速度（以向上/斜向为主）
        this.velocities[i * 3]     = (Math.random() - 0.5) * 0.3;
        this.velocities[i * 3 + 1] = 0.4 + Math.random() * 0.9;
        this.velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.1;

        this.rotSpeeds[i * 3]     = (Math.random() - 0.5) * 0.02;
        this.rotSpeeds[i * 3 + 1] = (Math.random() - 0.5) * 0.025;
        this.rotSpeeds[i * 3 + 2] = (Math.random() - 0.5) * 0.015;

        const s = 0.5 + Math.random() * 1.6;
        this.scales[i] = s;
        this.baseAlpha[i] = 0.25 + Math.random() * 0.5;

        // 在 shardColor / accentColor / 高光白之间插值
        const t = Math.random();
        if (t < 0.5) tmpColor.set(colors.shard);
        else if (t < 0.8) tmpColor.set(colors.accent);
        else tmpColor.set(colors.highlight);
        this.colors[i * 3] = tmpColor.r;
        this.colors[i * 3 + 1] = tmpColor.g;
        this.colors[i * 3 + 2] = tmpColor.b;
      }

      // 实例颜色
      this.mesh.instanceColor = new THREE.InstancedBufferAttribute(this.colors, 3);
    }

    _palette() {
      if (this._dark) {
        return {
          shard: '#896ABD',      // 主碎片色（紫）
          accent: '#A855F7',     // 强调色（亮紫）
          highlight: '#E9D5FF',  // 高光（淡紫白）
          bg: '#120F17',
        };
      }
      return {
        shard: '#B794E8',
        accent: '#C084FC',
        highlight: '#F3E8FF',
        bg: '#F5F0FA',
      };
    }

    setDark(dark) {
      this._dark = dark;
      const colors = this._palette();
      const tmp = new THREE.Color();
      const col = this.mesh.instanceColor;
      // 用 GSAP 平滑过渡每个碎片颜色
      for (let i = 0; i < this.count; i++) {
        const t = Math.random();
        if (t < 0.5) tmp.set(colors.shard);
        else if (t < 0.8) tmp.set(colors.accent);
        else tmp.set(colors.highlight);
        col.setXYZ(i, tmp.r, tmp.g, tmp.b);
      }
      col.needsUpdate = true;
    }

    _bindEvents() {
      global.addEventListener('pointermove', e => {
        // 归一化到 -1~1，y 翻转
        this._mouseTarget.x = (e.clientX / global.innerWidth) * 2 - 1;
        this._mouseTarget.y = -(e.clientY / global.innerHeight) * 2 + 1;
      }, { passive: true });

      global.addEventListener('pointerleave', () => {
        this._mouseTarget.set(-999, -999);
      }, { passive: true });
    }

    _startLoop() {
      this._last = performance.now();
      this._elapsed = 0;
      const tick = () => {
        if (this._disposed) return;
        const now = performance.now();
        const dt = Math.min((now - this._last) / 1000, 0.05);
        this._last = now;
        this._elapsed += dt;
        this._update(dt);
        this.renderer.render(this.scene, this.camera);
        this._raf = requestAnimationFrame(tick);
      };
      this._raf = requestAnimationFrame(tick);
    }

    _update(dt) {
      const THREE = global.THREE;
      // 鼠标平滑跟随
      this._mouse.lerp(this._mouseTarget, 0.08);

      const mx = this._mouse.x * 14;
      const my = this._mouse.y * 9;
      const repelR = 4.5;
      const repelR2 = repelR * repelR;
      const t = this._elapsed;

      for (let i = 0; i < this.count; i++) {
        const ix = i * 3;
        let px = this.positions[ix];
        let py = this.positions[ix + 1];
        let pz = this.positions[ix + 2];

        // 流式飘动
        px += this.velocities[ix] * dt;
        py += this.velocities[ix + 1] * dt;
        pz += this.velocities[ix + 2] * dt;

        // 鼠标排斥
        if (this._mouse.x > -10) {
          const dx = px - mx;
          const dy = py - my;
          const d2 = dx * dx + dy * dy;
          if (d2 < repelR2) {
            const d = Math.sqrt(d2) || 0.01;
            const force = (1 - d / repelR) * 6 * dt;
            px += (dx / d) * force;
            py += (dy / d) * force;
          }
        }

        // 边界回收：飘出顶部后从底部重生（流式）
        if (py > 12) { py = -10; px = (Math.random() - 0.5) * 28; }
        if (px > 18) px = -18;
        if (px < -18) px = 18;
        if (pz > 18) pz = -2;
        if (pz < -2) pz = 18;

        this.positions[ix] = px;
        this.positions[ix + 1] = py;
        this.positions[ix + 2] = pz;

        // 应用到实例矩阵
        const s = this.scales[i];
        this.dummy.position.set(px, py, pz);
        // 旋转随时间累积
        this.dummy.rotation.set(
          this.rotSpeeds[ix] * t * 60 + i,
          this.rotSpeeds[ix + 1] * t * 60 + i * 0.5,
          this.rotSpeeds[ix + 2] * t * 60
        );
        const stretch = 0.7 + (i % 5) * 0.12; // 碎片长短不一
        this.dummy.scale.set(s * 0.5, s * stretch, s);
        this.dummy.updateMatrix();
        this.mesh.setMatrixAt(i, this.dummy.matrix);
      }
      this.mesh.instanceMatrix.needsUpdate = true;
    }

    onResize() {
      const w = global.innerWidth;
      const h = global.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h, false);
    }

    dispose() {
      this._disposed = true;
      cancelAnimationFrame(this._raf);
      this.mesh.geometry.dispose();
      this.material.dispose();
      this.renderer.dispose();
      if (this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
    }
  }

  global.ShardsBackground = ShardsBackground;
})(typeof window !== 'undefined' ? window : this);
