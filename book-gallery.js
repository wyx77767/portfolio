/* ============================================================
   最近在读 —— CircularGallery 弧形书廊（原生 JS 复刻 React Bits）
   四本书沿弧线排布：中间放大居中、两侧透视倾斜收缩；
   支持拖拽、横向滚轮、键盘方向键切换，点击封面弹出书籍简介。
   ============================================================ */
(function () {
  'use strict';

  var root = document.getElementById('bookGallery');
  if (!root) return;

  var BOOKS = [
    {
      img: 'book1.jpg',
      title: '永恒的终结',
      en: 'The End of Eternity',
      author: '艾萨克·阿西莫夫',
      year: '1955',
      desc: '27 世纪，人类发明了时间旅行，建立起跨越数十万年的组织「永恒」。技师哈伦负责在历史长河中做「最小必要变革」，让人类免于灾难——直到他在一次任务中遇见来自 4821 世纪的女孩诺伊。他开始怀疑：被安排好的安稳未来，是否也意味着人类永远失去了星辰。这是一部把自由意志与宿命写到极致的科幻经典。'
    },
    {
      img: 'book2.jpg',
      title: '树上的男爵',
      en: 'Il barone rampante',
      author: '伊塔洛·卡尔维诺',
      year: '1957',
      desc: '1767 年，贵族少年科西莫因为拒绝吃一盘蜗牛，愤而爬上树，从此再也不肯下地。他在树上读书、打猎、恋爱、参与革命，与整个十八世纪的思想浪潮一同成长。卡尔维诺用一个「上树」的寓言告诉我们：真正的参与，也许恰恰需要先离开地面。'
    },
    {
      img: 'book3.jpg',
      title: '品三国',
      en: 'On Three Kingdoms',
      author: '易中天',
      year: '2006',
      desc: '从《三国志》到《三国演义》，易中天用「历史形象」与「文学形象」两条线索重讲三国：曹操究竟是奸雄还是英雄，刘备的仁义是真是假，诸葛亮的智慧从何而来。既讲权谋，也讲人性，把一段人人都熟悉的历史讲出了陌生的味道。'
    },
    {
      img: 'book4.jpg',
      title: '边城',
      en: 'Border Town',
      author: '沈从文',
      year: '1934',
      desc: '湘西小城茶峒，摆渡老人的孙女翠翠，与船总之子天保、傩送兄弟之间，发生了一段始终没能说出口的爱情。沈从文用清澈舒缓的笔调写水、写人、写命运，把中国乡土文学里最温柔也最怅惘的一页留给了读者。'
    }
  ];

  var CARD_W = 170;
  var CARD_H = 236;
  var SPREAD = 182;       // 相邻卡片的水平间距
  var target = 0;
  var current = 0;
  var dragging = false;
  var startX = 0;
  var startOffset = 0;
  var moved = 0;
  var downIndex = -1;

  /* ---------- 结构 ---------- */
  var track = document.createElement('div');
  track.className = 'bg-track';

  var cards = [];
  for (var i = 0; i < BOOKS.length; i++) {
    var card = document.createElement('div');
    card.className = 'bg-card';
    card.setAttribute('data-index', i);
    card.innerHTML = '<img src="' + BOOKS[i].img + '" alt="' + BOOKS[i].title + '" loading="lazy">';
    track.appendChild(card);
    cards.push(card);
  }
  root.appendChild(track);

  var caption = document.createElement('div');
  caption.className = 'bg-caption';
  caption.innerHTML = '<span class="bg-t"></span><span class="bg-a"></span>';
  root.appendChild(caption);
  var capTitle = caption.querySelector('.bg-t');
  var capAuthor = caption.querySelector('.bg-a');

  var hint = document.createElement('div');
  hint.className = 'bg-hint';
  hint.textContent = '拖动 · 滚轮 · 点击封面查看简介';
  root.appendChild(hint);

  /* ---------- 布局计算 ---------- */
  function layout() {
    var active = Math.round(current);
    for (var i = 0; i < cards.length; i++) {
      var d = i - current;
      var ad = Math.abs(d);
      var x = d * SPREAD;
      var ry = Math.max(-58, Math.min(58, -d * 22));
      var z = -ad * 78;
      var s = 1 - ad * 0.1;
      var op = ad < 0.45 ? 1 : Math.max(0, 1 - (ad - 0.45) * 0.62);
      cards[i].style.transform =
        'translateX(' + x.toFixed(1) + 'px) translateZ(' + z.toFixed(1) + 'px) ' +
        'rotateY(' + ry.toFixed(1) + 'deg) scale(' + s.toFixed(3) + ')';
      cards[i].style.opacity = op.toFixed(2);
      cards[i].style.zIndex = String(200 - Math.round(ad * 20));
      cards[i].style.pointerEvents = ad > 2.1 ? 'none' : 'auto';
    }
    if (capTitle) {
      var b = BOOKS[Math.max(0, Math.min(BOOKS.length - 1, active))];
      capTitle.textContent = '《' + b.title + '》';
      capAuthor.textContent = b.author + ' · ' + b.year;
    }
  }

  function tick() {
    current += (target - current) * 0.14;
    if (Math.abs(target - current) < 0.001) current = target;
    layout();
    requestAnimationFrame(tick);
  }

  /* ---------- 书籍简介弹层 ---------- */
  var modal = document.createElement('div');
  modal.className = 'book-modal';
  modal.innerHTML =
    '<div class="bm-card">' +
      '<div class="bm-cover"><img alt=""></div>' +
      '<div class="bm-info">' +
        '<div class="bm-title"></div>' +
        '<div class="bm-meta"></div>' +
        '<div class="bm-desc"></div>' +
        '<button class="bm-close" type="button">关闭</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(modal);

  var mCover = modal.querySelector('.bm-cover img');
  var mTitle = modal.querySelector('.bm-title');
  var mMeta = modal.querySelector('.bm-meta');
  var mDesc = modal.querySelector('.bm-desc');

  function openBook(idx) {
    var b = BOOKS[idx];
    if (!b) return;
    mCover.src = b.img;
    mCover.alt = b.title;
    mTitle.textContent = b.title;
    mMeta.textContent = b.author + ' · ' + b.year + ' · ' + b.en;
    mDesc.textContent = b.desc;
    modal.classList.add('open');
  }
  function closeBook() { modal.classList.remove('open'); }

  modal.addEventListener('click', function (e) {
    if (e.target === modal || e.target.classList.contains('bm-close')) closeBook();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeBook();
  });

  /* ---------- 拖拽 ---------- */
  function clamp(v) { return Math.max(0, Math.min(BOOKS.length - 1, v)); }

  root.addEventListener('pointerdown', function (e) {
    if (e.button !== undefined && e.button !== 0) return;
    dragging = true;
    startX = e.clientX;
    startOffset = target;
    moved = 0;
    downIndex = -1;
    var card = e.target.closest ? e.target.closest('.bg-card') : null;
    if (card) downIndex = parseInt(card.getAttribute('data-index'), 10);
    root.style.cursor = 'grabbing';
    try { root.setPointerCapture(e.pointerId); } catch (err) { /* 忽略 */ }
  });

  root.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var dx = e.clientX - startX;
    moved = Math.abs(dx);
    target = clamp(startOffset - dx / SPREAD);
    current = target;          // 拖拽时跟手，不做缓动
    layout();
  });

  root.addEventListener('pointerup', function (e) {
    if (!dragging) return;
    dragging = false;
    root.style.cursor = 'grab';
    try { root.releasePointerCapture(e.pointerId); } catch (err) { /* 忽略 */ }
    var rounded = Math.round(target);
    if (moved < 6) {
      /* 视为点击：非居中卡片先居中，居中卡片打开简介 */
      if (downIndex >= 0 && Math.abs(downIndex - rounded) <= 1) {
        if (downIndex === rounded) openBook(downIndex);
        else target = downIndex;
      } else {
        target = clamp(rounded);
      }
    } else {
      target = clamp(rounded);
    }
  });

  root.addEventListener('pointercancel', function () {
    dragging = false;
    target = clamp(Math.round(target));
  });

  /* 横向滚轮切换；纵向滚轮保留页面滚动 */
  root.addEventListener('wheel', function (e) {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    target = clamp(target + e.deltaX / 320);
  }, { passive: false });

  /* 键盘 */
  document.addEventListener('keydown', function (e) {
    if (!root.contains(document.activeElement) && document.activeElement !== document.body) return;
    if (e.key === 'ArrowRight') target = clamp(Math.round(target) + 1);
    if (e.key === 'ArrowLeft') target = clamp(Math.round(target) - 1);
  });

  layout();
  requestAnimationFrame(tick);
})();
