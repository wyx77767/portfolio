/* ============================================================
   gsap-anim.js — 基于 GSAP + ScrollTrigger 的复古拼贴动效
   · Hero 入场（胶带标题 / 拍立得 / 拼贴素材依次"贴"上来）
   · 滚动批次浮现（.reveal → 撕纸标题、纸卡、技能条）
   · 首屏拼贴视差（scrub）
   · 顶部红黑斜纹阅读进度条
   · 边角拼贴装饰微动
   · prefers-reduced-motion 降级 / GSAP 缺失时回退旧 reveal 逻辑
   ============================================================ */
(function () {
  'use strict';

  var reduce = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 技能条填充 ---------- */
  function fillBars(scope, animate) {
    scope.querySelectorAll('.fill').forEach(function (f, i) {
      var w = f.dataset.w + '%';
      if (!animate) { f.style.width = w; return; }
      requestAnimationFrame(function () {
        /* 兜底：个别环境下百分比未解析时按轨道像素写死 */
        if (f.getBoundingClientRect().width < 1 && f.parentElement.clientWidth > 0) {
          f.style.width = Math.round(f.parentElement.clientWidth * f.dataset.w / 100) + 'px';
          return;
        }
        gsap.fromTo(f, { width: '0%' },
          { width: w, duration: 1.1, delay: 0.15 + i * 0.09, ease: 'power2.out', overwrite: true });
      });
    });
  }

  /* ---------- 兜底：GSAP 未加载时沿用旧浮现逻辑 ---------- */
  function legacyReveal() {
    var reveals = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
    function activate(el) {
      if (el.classList.contains('visible')) return;
      el.classList.add('visible');
      fillBars(el, false);
    }
    function check() {
      var vh = window.innerHeight || document.documentElement.clientHeight;
      reveals.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < vh * 0.92 && r.bottom > 0) activate(el);
      });
    }
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { check(); ticking = false; });
    }, { passive: true });
    window.addEventListener('resize', check);
    check();
    setTimeout(check, 300);
    setTimeout(check, 1200);
  }

  if (!window.gsap || !window.ScrollTrigger) { legacyReveal(); return; }
  gsap.registerPlugin(ScrollTrigger);

  /* .reveal 的 CSS transition 与 GSAP 冲突，注入覆盖 */
  var css = document.createElement('style');
  css.textContent =
    '.reveal{transition:none!important}' +
    '.gsap-progress{position:fixed;top:0;left:0;right:0;height:5px;z-index:101;pointer-events:none;' +
    'background:#8a8599;transform-origin:left center;transform:scaleX(0);box-shadow:0 1px 0 rgba(0,0,0,.4)}';
  document.head.appendChild(css);

  /* ---------- reduced-motion：全部直接呈现 ---------- */
  if (reduce) {
    document.querySelectorAll('.reveal').forEach(function (el) {
      el.classList.add('visible');
      fillBars(el, false);
    });
    return;
  }

  /* ---------- Hero 入场：等启动页（#fuzzyTextCanvas）消失后播放 ---------- */
  function heroIntro() {
    var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.from('.hero .hello', { y: 18, opacity: 0, duration: 0.5 })
      .from('.hero h1 .bar .l1', { x: -70, opacity: 0, rotation: -2.5, duration: 0.55 }, '-=0.25')
      .from('.hero h1 .bar.alt .l2', { x: 70, opacity: 0, rotation: 2, duration: 0.55 }, '-=0.35')
      .from('.hero .type-line', { opacity: 0, y: 10, duration: 0.4 }, '-=0.2')
      .from('.hero .btns .btn', { y: 22, opacity: 0, duration: 0.45, stagger: 0.12 }, '-=0.15')
      .from('.avatar-wrap',
        { scale: 0.78, opacity: 0, rotation: 7, duration: 0.7, ease: 'back.out(1.6)' }, 0.25)
      .from('.hero-collage .hc',
        { scale: 0, opacity: 0, duration: 0.6, ease: 'back.out(1.7)',
          stagger: { each: 0.05, from: 'random' } }, 0.35);
  }
  var splash = document.getElementById('fuzzyTextCanvas');
  var introPlayed = false;
  function playIntroOnce() {
    if (introPlayed) return;
    introPlayed = true;
    requestAnimationFrame(function () { setTimeout(heroIntro, 120); });
  }
  if (splash && splash.parentNode) {
    var mo = new MutationObserver(function () {
      if (!document.getElementById('fuzzyTextCanvas')) {
        mo.disconnect();
        playIntroOnce();
      }
    });
    mo.observe(document.body, { childList: true });
    setTimeout(function () { mo.disconnect(); playIntroOnce(); }, 6000); /* 兜底 */
  } else {
    playIntroOnce();
  }

  /* ---------- 滚动批次浮现 + 技能条（每次划过都重播） ---------- */
  function playReveal(batch) {
    batch.forEach(function (el) { el.classList.add('visible'); });
    gsap.to(batch, {
      opacity: 1, y: 0, duration: 0.75,
      stagger: 0.09, ease: 'power3.out', overwrite: true,
    });
    batch.forEach(function (el) { fillBars(el, true); });
  }
  function hideReveal(batch) {
    batch.forEach(function (el) { el.classList.remove('visible'); });
    gsap.to(batch, {
      opacity: 0, y: 28, duration: 0.35,
      stagger: 0.04, ease: 'power2.in', overwrite: true,
    });
  }
  ScrollTrigger.batch('.reveal', {
    start: 'top 88%',
    onEnter: playReveal,
    onEnterBack: playReveal,
    onLeave: hideReveal,
    onLeaveBack: hideReveal,
  });

  /* ---------- 章节编号徽章弹出（每次划过都重播） ---------- */
  gsap.utils.toArray('.num-badge').forEach(function (badge) {
    gsap.from(badge, {
      scale: 0.4, opacity: 0, rotation: -16, duration: 0.6, ease: 'back.out(2)',
      scrollTrigger: {
        trigger: badge, start: 'top 88%',
        toggleActions: 'restart none none reverse',
      },
    });
  });

  /* ---------- 首屏拼贴视差（scrub） ---------- */
  var depths = {
    'hc-moon': -16, 'hc-balloon': -10, 'hc-zeppelin': -13, 'hc-statue': 9,
    'hc-mirror': 12, 'hc-lips': 8, 'hc-typewriter': 14, 'hc-letter': -8,
    'hc-writer': 11, 'hc-book': 5, 'hc-fwhite': -7, 'hc-fyellow': -6,
    'hc-p1': 13, 'hc-p2': -12, 'hc-p3': 15,
  };
  gsap.utils.toArray('.hero-collage .hc').forEach(function (el) {
    var cls = Array.prototype.slice.call(el.classList).find(function (c) { return depths[c] != null; });
    if (!cls) return;
    gsap.to(el, {
      yPercent: depths[cls], ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.6 },
    });
  });

  /* ---------- 顶部红黑斜纹阅读进度条 ---------- */
  var bar = document.createElement('div');
  bar.className = 'gsap-progress';
  document.body.appendChild(bar);
  gsap.to(bar, {
    scaleX: 1, ease: 'none',
    scrollTrigger: { start: 0, end: 'max', scrub: 0.3 },
  });

  /* ---------- 边角拼贴装饰微动（相对当前角度做摆动，避免覆盖静置旋转） ---------- */
  ['.df-moth', '.df-flower', '.df-butter'].forEach(function (sel, i) {
    var el = document.querySelector(sel);
    if (!el) return;
    gsap.to(el, {
      rotation: '+=' + (i % 2 ? 7 : -7), y: '+=' + (i % 2 ? -9 : 9),
      duration: 3.4 + i * 0.7,
      ease: 'sine.inOut', yoyo: true, repeat: -1, transformOrigin: 'center center',
    });
  });

  window.__gsapAnimsReady = true;
})();
