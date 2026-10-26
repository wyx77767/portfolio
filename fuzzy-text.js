/* ============================================================
 * FuzzyText — 模糊失真文字启动页
 * 文字 "Welcome to my world" 两个词一组蹦出，每组配：
 *   1) Web Audio 合成的机械音效（咔哒+嗡鸣）
 *   2) Web Speech API 朗读该组词
 * 文字带持续模糊失真（baseIntensity），鼠标悬停增强（hoverIntensity）。
 * ============================================================ */
(function (global) {
  'use strict';

  class FuzzyText {
    constructor(opts = {}) {
      this.opts = Object.assign({
        text: 'Welcome to my world',
        baseIntensity: 0.35,
        hoverIntensity: 1.0,
        enableHover: true,
        backgroundColor: '#080706',
        textColor: '#ece1c6',
        wordsPerGroup: 2,      // 两个词一组蹦出
        groupDelay: 800,        // 每组间隔 ms（快速显示）
        autoFinishAfter: 1000,  // 全部显示完后自动关闭等待时间
        maxShowMs: 5000,        // 兜底：最长显示 5 秒强制关闭
        onFinish: null,
      }, opts);

      this._disposed = false;
      this._finished = false;
      this._mouse = { x: -9999, y: -9999, active: false };
      this._revealedGroups = 0;  // 已显示的词组数
      this._intensity = this.opts.baseIntensity;
      this._voices = [];         // 缓存语音列表
      this._voicesReady = false;

      this._buildCanvas();
      this._bindEvents();
      this._preloadVoices();
      this._startLoop();
      // 开始逐组蹦出文字
      this._startReveal();
      // 兜底：最长显示 maxShowMs 后强制关闭（即使文字还没播完）
      if (this.opts.maxShowMs > 0) {
        this._maxTimer = setTimeout(() => {
          if (!this._finished) this._finish();
        }, this.opts.maxShowMs);
      }
    }

    _buildCanvas() {
      this.canvas = document.createElement('canvas');
      this.canvas.id = 'fuzzyTextCanvas';
      Object.assign(this.canvas.style, {
        position: 'fixed', inset: '0',
        width: '100vw', height: '100vh',
        zIndex: '99999',
        display: 'block',
        background: this.opts.backgroundColor,
        cursor: 'crosshair',
      });
      document.body.appendChild(this.canvas);
      this.ctx = this.canvas.getContext('2d');
      this.onResize();
    }

    onResize() {
      const dpr = Math.min(global.devicePixelRatio || 1, 1.5);
      this.W = global.innerWidth;
      this.H = global.innerHeight;
      this.canvas.width = this.W * dpr;
      this.canvas.height = this.H * dpr;
      this.canvas.style.width = this.W + 'px';
      this.canvas.style.height = this.H + 'px';
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    _bindEvents() {
      this._onMove = e => {
        this._mouse.x = e.clientX;
        this._mouse.y = e.clientY;
        this._mouse.active = true;
      };
      this._onLeave = () => { this._mouse.active = false; };
      this._onClick = () => { if (!this._finished) this._finish(); };
      this._onResize = () => { this.onResize(); };

      global.addEventListener('mousemove', this._onMove, { passive: true });
      global.addEventListener('mouseleave', this._onLeave);
      this.canvas.addEventListener('click', this._onClick);
      global.addEventListener('resize', this._onResize);
    }

    /* ---------- 逐组蹦出文字 ---------- */
    _startReveal() {
      const words = this.opts.text.split(/\s+/);
      const groups = [];
      for (let i = 0; i < words.length; i += this.opts.wordsPerGroup) {
        groups.push(words.slice(i, i + this.opts.wordsPerGroup).join(' '));
      }
      this._groups = groups;
      this._revealedGroups = 0;

      // 等语音列表就绪后再开始（确保第一组也能朗读），最多等 1.5s
      const start = () => this._revealNext();
      if (this._voicesReady) {
        start();
      } else {
        let waited = 0;
        const wait = setInterval(() => {
          waited += 100;
          if (this._voicesReady || waited > 1500) {
            clearInterval(wait);
            start();
          }
        }, 100);
      }
    }

    _revealNext() {
      if (this._revealedGroups >= this._groups.length) {
        // 全部显示完后 autoFinishAfter 毫秒自动关闭，用户点击也能立即关闭
        if (!this._autoFinishTimer) {
          this._autoFinishTimer = setTimeout(() => {
            if (!this._finished) this._finish();
          }, this.opts.autoFinishAfter);
        }
        return;
      }
      this._revealedGroups++;

      // 播放机械音效
      this._playMechanicalSound();

      // 只在第一组显示时，把所有单词一次性排队朗读（避免多组 speakNext 交错）
      if (this._revealedGroups === 1) {
        const allWords = this.opts.text.split(/\s+/);
        this._speakWords(allWords);
      }

      // 下一组
      if (this._revealedGroups < this._groups.length) {
        setTimeout(() => this._revealNext(), this.opts.groupDelay);
      }
      // 最后一组不设自动淡出，等用户点击
    }

    /* ---------- 预加载语音列表（解决 getVoices 异步加载问题） ---------- */
    _preloadVoices() {
      try {
        if (!global.speechSynthesis) return;
        const load = () => {
          this._voices = global.speechSynthesis.getVoices();
          if (this._voices.length) this._voicesReady = true;
        };
        load();
        global.speechSynthesis.onvoiceschanged = load;
        // 兜底：某些浏览器 voiceschanged 不触发，定时重试
        let tries = 0;
        const retry = setInterval(() => {
          load();
          if (this._voicesReady || tries++ > 10) clearInterval(retry);
        }, 200);
      } catch (e) { /* 静默 */ }
    }

    /* ---------- 机械音效（Web Audio 合成） ---------- */
    _playMechanicalSound() {
      try {
        const AC = global.AudioContext || global.webkitAudioContext;
        if (!AC) return;
        const ctx = new AC();
        const now = ctx.currentTime;
        const master = ctx.createGain();
        master.gain.value = 0.2;
        master.connect(ctx.destination);

        // 低频机械咔哒（锯齿 + 低通）
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(80, now);
        osc.frequency.exponentialRampToValueAtTime(160, now + 0.08);
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 500;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.5, now + 0.005);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(lp).connect(g).connect(master);
        osc.start(now);
        osc.stop(now + 0.15);

        // 高频金属 click
        const osc2 = ctx.createOscillator();
        osc2.type = 'square';
        osc2.frequency.value = 2200 + Math.random() * 800;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 2800;
        bp.Q.value = 10;
        const g2 = ctx.createGain();
        g2.gain.setValueAtTime(0, now);
        g2.gain.linearRampToValueAtTime(0.25, now + 0.002);
        g2.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc2.connect(bp).connect(g2).connect(master);
        osc2.start(now);
        osc2.stop(now + 0.06);

        setTimeout(() => ctx.close(), 400);
      } catch (e) { /* 静默 */ }
    }

    /* ---------- 逐个朗读单词（Web Speech API，顺序衔接） ---------- */
    _speakWords(words) {
      this._doSpeakWords(words);
    }

    _doSpeakWords(words) {
      try {
        if (!global.speechSynthesis) return;
        // 不调用 cancel，让多组单词自然排队（Welcome→to→my→world 顺序朗读）

        const voices = this._voices.length ? this._voices : global.speechSynthesis.getVoices();
        const enVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Microsoft'))) || voices.find(v => v.lang.startsWith('en'));

        let idx = 0;
        const speakNext = () => {
          if (idx >= words.length) return;
          const word = words[idx++];
          const u = new SpeechSynthesisUtterance(word);
          u.lang = 'en-US';
          u.rate = 1.3;
          u.pitch = 1.1;
          u.volume = 0.85;
          if (enVoice) u.voice = enVoice;
          u.onend = () => {
            // 单词之间短暂停顿，再读下一个
            setTimeout(speakNext, 10);
          };
          u.onerror = () => {
            // 出错也继续下一个，避免卡死
            setTimeout(speakNext, 25);
          };
          global.speechSynthesis.speak(u);
        };
        speakNext();
      } catch (e) { /* 静默 */ }
    }

    _startLoop() {
      const tick = () => {
        if (this._disposed) return;
        this._update();
        this._render();
        this._raf = requestAnimationFrame(tick);
      };
      this._raf = requestAnimationFrame(tick);
    }

    _update() {
      // 模糊强度：基础 + 鼠标悬停增强
      const target = this.opts.baseIntensity + (this._mouse.active ? this.opts.hoverIntensity : 0);
      this._intensity += (target - this._intensity) * 0.1;
    }

    _render() {
      const ctx = this.ctx;
      // 纯黑背景填充（不用 clearRect，避免露出底层页面）
      ctx.fillStyle = '#080706';
      ctx.fillRect(0, 0, this.W, this.H);

      if (this._revealedGroups === 0) return;

      // 拼出当前已显示的文字
      const shownText = this._groups.slice(0, this._revealedGroups).join(' ');

      // 字号自适应：先按屏幕宽度估算，再用 measureText 检测，超宽则缩小
      let fontSize = Math.min(this.W * 0.12, 150);
      ctx.font = `400 ${fontSize}px "Special Elite", "Courier New", "Noto Serif SC", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const maxW = this.W * 0.88;
      let textW = ctx.measureText(shownText).width;
      while (textW > maxW && fontSize > 20) {
        fontSize *= 0.92;
        ctx.font = `400 ${fontSize}px "Special Elite", "Courier New", "Noto Serif SC", monospace`;
        textW = ctx.measureText(shownText).width;
      }

      const cx = this.W / 2;
      const cy = this.H / 2;

      // 模糊失真：用多份偏移副本叠加 + 横向扫描位移
      const intensity = this._intensity;
      const copies = 3 + Math.floor(intensity * 4);

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      for (let i = 0; i < copies; i++) {
        const t = i / copies;
        const offsetX = (Math.random() - 0.5) * intensity * 24;
        const offsetY = (Math.random() - 0.5) * intensity * 8;
        const alpha = (1 - t) * 0.6 / copies + 0.15;

        // 油墨错位（奶油 / 图钉红重影）
        if (i % 2 === 0) {
          ctx.fillStyle = `rgba(236, 225, 198, ${alpha})`;
        } else {
          ctx.fillStyle = `rgba(207, 32, 44, ${alpha})`;
        }
        ctx.fillText(shownText, cx + offsetX, cy + offsetY);
      }

      // 主文字（白色，抖动偏移）
      ctx.fillStyle = this.opts.textColor;
      ctx.globalAlpha = 0.85;
      ctx.fillText(shownText, cx + (Math.random() - 0.5) * intensity * 4, cy + (Math.random() - 0.5) * intensity * 2);

      // 扫描线干扰（水平条带）
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      const scanCount = Math.floor(intensity * 10);
      for (let i = 0; i < scanCount; i++) {
        const sy = cy + (Math.random() - 0.5) * fontSize * 1.2;
        const sh = 1 + Math.random() * 3;
        ctx.fillStyle = `rgba(236,225,198,${0.05 + Math.random() * 0.12})`;
        ctx.fillRect(cx - fontSize * 3, sy, fontSize * 6, sh);
      }

      ctx.restore();

      // 全部显示完后：闪烁光标 + "点击进入" 提示
      if (this._revealedGroups >= this._groups.length) {
        const blink = Math.sin(performance.now() / 300) > 0;
        if (blink) {
          ctx.fillStyle = 'rgba(207,32,44,0.75)';
          const metrics = ctx.measureText(shownText);
          ctx.fillRect(cx + metrics.width / 2 + 8, cy - fontSize * 0.4, 4, fontSize * 0.8);
        }
        // "点击进入" 提示
        const hintSize = Math.max(14, fontSize * 0.18);
        ctx.font = `400 ${hintSize}px "Special Elite", "Courier New", monospace`;
        ctx.fillStyle = `rgba(217,201,163,${0.55 + 0.3 * Math.sin(performance.now() / 500)})`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('点击任意位置进入', cx, cy + fontSize * 1.1);
      }
    }

    _finish() {
      if (this._finished) return;
      this._finished = true;
      if (global.speechSynthesis) global.speechSynthesis.cancel();
      this.canvas.style.transition = 'opacity 0.6s ease-out';
      this.canvas.style.opacity = '0';
      setTimeout(() => {
        if (this.opts.onFinish) this.opts.onFinish();
        this.dispose();
      }, 650);
    }

    dispose() {
      this._disposed = true;
      cancelAnimationFrame(this._raf);
      if (this._finishTimer) clearTimeout(this._finishTimer);
      if (this._autoFinishTimer) clearTimeout(this._autoFinishTimer);
      if (this._maxTimer) clearTimeout(this._maxTimer);
      global.removeEventListener('mousemove', this._onMove);
      global.removeEventListener('mouseleave', this._onLeave);
      global.removeEventListener('resize', this._onResize);
      if (this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
    }
  }

  global.FuzzyText = FuzzyText;
})(typeof window !== 'undefined' ? window : this);
