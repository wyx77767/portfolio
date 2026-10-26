/* ============================================================
 * FogBackground — 全屏流动雾霭 + 光斑背景层
 * 独立 Three.js renderer，全屏 quad，fbm 值噪声 4 层叠加，
 * 两团雾反向流动，2~3 个正弦漂移的径向光斑，uThemeColor 统一着色，
 * 整体亮度 ×0.35，不抢前景视觉焦点。
 *
 * 用法：
 *   const fb = new FogBackground();
 *   fb.setThemeColor('#4fc3f7', 1.2);
 *   window.addEventListener('resize', () => fb.onResize());
 *   fb.dispose();
 * ============================================================ */
(function (global) {
  'use strict';

  class FogBackground {
    constructor(opts = {}) {
      this.opts = Object.assign({
        pixelRatio: Math.min((global.devicePixelRatio || 1) * 0.5, 1),
        themeColor: '#4fc3f7',
      }, opts);

      this._disposed = false;
      this._buildCanvas();
      this._initThree();
      this._buildScene();

      this.onResize();
      this._startLoop();
    }

    /* ---------- 画布 ---------- */
    _buildCanvas() {
      const canvas = document.createElement('canvas');
      canvas.id = 'fogBgCanvas';
      canvas.setAttribute('aria-hidden', 'true');
      Object.assign(canvas.style, {
        position: 'fixed',
        inset: '0',
        width: '100vw',
        height: '100vh',
        zIndex: '-2',
        pointerEvents: 'none',
        display: 'block',
      });
      document.body.appendChild(canvas);
      this.canvas = canvas;
    }

    /* ---------- Three.js ---------- */
    _initThree() {
      const THREE = global.THREE;
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        alpha: true,
        antialias: false,
        powerPreference: 'high-performance',
      });
      this.renderer.setPixelRatio(this.opts.pixelRatio);
      this.renderer.setClearColor(0x000000, 0);
    }

    _buildScene() {
      const THREE = global.THREE;

      this.scene = new THREE.Scene();
      // 正交相机，无需投影
      this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

      const theme = new THREE.Color(this.opts.themeColor);

      this.uniforms = {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uThemeColor: { value: theme },
        uMode: { value: 0.0 }, // 0=深色, 1=日光
      };

      const material = new THREE.ShaderMaterial({
        uniforms: this.uniforms,
        vertexShader: VERT,
        fragmentShader: FRAG,
        depthTest: false,
        depthWrite: false,
        transparent: true,
      });

      // 全屏 quad（正交相机下覆盖整个视口）
      const geom = new THREE.PlaneGeometry(2, 2);
      this.quad = new THREE.Mesh(geom, material);
      this.quad.frustumCulled = false;
      this.scene.add(this.quad);

      this.material = material;
      this._themeProxy = { r: theme.r, g: theme.g, b: theme.b };
      this._modeProxy = { m: this.uniforms.uMode.value };
    }

    /* ---------- 主题色（GSAP 平滑插值） ---------- */
    setThemeColor(hex, duration = 1.2) {
      const THREE = global.THREE;
      const gsap = global.gsap;
      const target = new THREE.Color(hex);

      if (!gsap || !duration) {
        this.uniforms.uThemeColor.value.copy(target);
        return;
      }
      // 杀掉上一轮 tween，避免多重动画竞争写值
      if (this._tween) this._tween.kill();
      gsap.killTweensOf(this._themeProxy);

      this._tween = gsap.to(this._themeProxy, {
        r: target.r, g: target.g, b: target.b,
        duration, ease: 'power2.inOut', overwrite: 'auto',
        onUpdate: () => {
          const c = this.uniforms.uThemeColor.value;
          c.r = this._themeProxy.r;
          c.g = this._themeProxy.g;
          c.b = this._themeProxy.b;
        },
      });
    }

    /* ---------- 日/夜模式（基础色在深蓝与浅白之间插值） ---------- */
    setMode(isDark, duration = 1.0) {
      const gsap = global.gsap;
      const target = isDark ? 0 : 1;
      if (!gsap || !duration) { this.uniforms.uMode.value = target; return; }
      if (this._modeTween) this._modeTween.kill();
      gsap.killTweensOf(this._modeProxy);
      this._modeTween = gsap.to(this._modeProxy, {
        m: target, duration, ease: 'power2.inOut', overwrite: 'auto',
        onUpdate: () => { this.uniforms.uMode.value = this._modeProxy.m; },
      });
    }

    /* ---------- 循环 ---------- */
    _startLoop() {
      this._last = performance.now();
      const tick = () => {
        if (this._disposed) return;
        const now = performance.now();
        const dt = Math.min((now - this._last) / 1000, 0.05);
        this._last = now;
        this.uniforms.uTime.value += dt;
        this.renderer.render(this.scene, this.camera);
        this._raf = requestAnimationFrame(tick);
      };
      this._raf = requestAnimationFrame(tick);
    }

    onResize() {
      const w = global.innerWidth;
      const h = global.innerHeight;
      this.renderer.setSize(w, h, false);
      this.uniforms.uResolution.value.set(w, h);
    }

    dispose() {
      this._disposed = true;
      cancelAnimationFrame(this._raf);
      if (this._tween) this._tween.kill();
      if (this._modeTween) this._modeTween.kill();
      if (global.gsap) {
        gsap.killTweensOf(this._themeProxy);
        gsap.killTweensOf(this._modeProxy);
      }
      this.quad.geometry.dispose();
      this.material.dispose();
      this.renderer.dispose();
      if (this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
    }
  }

  /* ---------- Shaders ---------- */
  const VERT = /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `;

  const FRAG = /* glsl */`
    precision highp float;
    varying vec2 vUv;
    uniform float uTime;
    uniform vec2 uResolution;
    uniform vec3 uThemeColor;
    uniform float uMode;

    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 345.45));
      p += dot(p, p + 34.345);
      return fract(p.x * p.y);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
    }

    float fbm(vec2 p) {
      float v = 0.0;
      float a = 0.5;
      for (int i = 0; i < 4; i++) {
        v += a * noise(p);
        p *= 2.02;
        a *= 0.5;
      }
      return v;
    }

    void main() {
      vec2 uv = vUv;
      vec2 p = uv * 2.0 - 1.0;
      p.x *= uResolution.x / max(uResolution.y, 1.0);

      float t = uTime * 0.08;

      // 两团雾反向流动（加快流速 + 加入小幅垂直波动）
      vec2 d1 = vec2( 1.2,  0.4 + 0.15 * sin(t * 1.3)) * t;
      vec2 d2 = vec2(-1.1, -0.3 + 0.12 * cos(t * 1.1)) * t;
      float f1 = fbm(p * 1.6 + d1);
      float f2 = fbm(p * 1.3 + d2 + 17.3);
      float fog = f1 * 0.55 + f2 * 0.45;

      // 柔和重映射，避免硬边带状伪影
      fog = smoothstep(0.2, 0.9, fog);

      // 基础色：深色模式为赛博深蓝，日光模式为浅青白
      vec3 darkBase = vec3(0.025, 0.045, 0.105);
      vec3 lightBase = vec3(0.86, 0.90, 0.97);
      vec3 base = mix(darkBase, lightBase, uMode);
      // 雾色：基础色与主题色的混合
      vec3 fogCol = mix(base, uThemeColor * 0.5, fog);

      vec3 col = fogCol * (0.4 + fog * 0.8);

      // 4 个径向光斑，圆心正弦漂移（增大幅度与亮度）
      for (int i = 0; i < 4; i++) {
        float fi = float(i);
        vec2 c = vec2(
          sin(t * 0.8 + fi * 1.9) * 0.7,
          cos(t * 0.6 + fi * 1.5) * 0.55
        );
        float d = distance(p, c);
        float spot = smoothstep(0.9, 0.0, d);
        spot *= spot; // 二次衰减，边缘更柔
        // 光斑轻微脉动
        float pulse = 0.85 + 0.15 * sin(t * 2.0 + fi * 2.5);
        col += uThemeColor * spot * 0.35 * pulse;
      }

      // 整体压暗（深色模式）/压浅（日光模式），不抢焦点
      col *= mix(0.4, 0.55, uMode);

      // 雾越浓 alpha 越高；日光模式整体更透明
      float alpha = clamp(fog * mix(0.9, 0.5, uMode) + mix(0.15, 0.06, uMode), 0.0, 1.0);

      gl_FragColor = vec4(col, alpha);
    }
  `;

  global.FogBackground = FogBackground;
})(typeof window !== 'undefined' ? window : this);
