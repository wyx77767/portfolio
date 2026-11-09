/* 站点文字管理后台（前端版）
   - 入口：导航栏右侧 ⚙
   - 管理员：wyx / 070607
   - 修改保存在当前浏览器 localStorage，导出 JSON 后可由管理员提交上线 */
(function () {
  'use strict';

  var USER = 'wyx';
  var PASS = '070607';
  var EDIT_KEY = 'wyx_admin_edits_v1';
  var AUTH_KEY = 'wyx_admin_auth';
  var EDIT_MODE = false;
  var dirty = false;

  var SEL = 'h1,h2,h3,h4,h5,p,li,span,a,strong,b,em,i,figcaption,td,th,blockquote,label';
  var SKIP_INSIDE = '.reading-overlay,.book-modal,nav,#adminBar,#adminModal,#adminLogin,script,style,.num-badge,.hc,.drift-wall,.dw-tile,#rubberNav';

  function loadEdits() {
    try { return JSON.parse(localStorage.getItem(EDIT_KEY) || '{}') || {}; } catch (e) { return {}; }
  }
  function saveEdits(map) {
    localStorage.setItem(EDIT_KEY, JSON.stringify(map));
  }

  /* 用 DOM 路径做稳定标识：0:DIV/2:H2/1:P */
  function eid(el) {
    var parts = [];
    var cur = el;
    while (cur && cur !== document.body && cur.parentElement) {
      var idx = Array.prototype.indexOf.call(cur.parentElement.children, cur);
      parts.unshift(idx + ':' + cur.tagName);
      cur = cur.parentElement;
    }
    return parts.join('/');
  }
  function byEid(id) {
    var segs = id.split('/');
    var cur = document.body;
    for (var i = 0; i < segs.length; i++) {
      var p = segs[i].split(':');
      var idx = parseInt(p[0], 10);
      var tag = p[1];
      if (!cur || !cur.children[idx]) return null;
      cur = cur.children[idx];
      if (cur.tagName !== tag) return null;
    }
    return cur === document.body ? null : cur;
  }

  function collect() {
    var out = [];
    var nodes = document.querySelectorAll(SEL);
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.closest(SKIP_INSIDE)) continue;
      if (!el.textContent.trim()) continue;
      if (el.querySelector('img,script,style,button')) continue;
      out.push(el);
    }
    return out;
  }

  function applyEdits() {
    var map = loadEdits();
    Object.keys(map).forEach(function (id) {
      var el = byEid(id);
      if (el && el.innerHTML !== map[id]) el.innerHTML = map[id];
    });
  }

  function persist() {
    var map = loadEdits();
    collect().forEach(function (el) {
      map[eid(el)] = el.innerHTML;
    });
    saveEdits(map);
    dirty = false;
    toast('已保存到本浏览器');
  }

  /* ---------- 样式 ---------- */
  var css = [
    '#adminEntry{width:32px;height:32px;border-radius:50%;border:1.5px solid var(--cream);',
    'background:transparent;color:var(--cream);cursor:pointer;font-size:14px;line-height:1;padding:0;transition:.2s;flex:0 0 auto}',
    '#adminEntry:hover{background:var(--pin);border-color:var(--pin);color:var(--paper);transform:rotate(-18deg)}',
    'html[data-theme="light"] #adminEntry{border-color:var(--ink);color:var(--ink)}',
    '#adminModal{position:fixed;inset:0;z-index:9998;display:none;align-items:center;justify-content:center;',
    'background:rgba(8,7,6,.72);backdrop-filter:blur(4px)}',
    '#adminModal.show{display:flex}',
    '#adminLogin{width:330px;max-width:90vw;background:var(--paper);color:var(--ink);border:1px solid #000;',
    'box-shadow:0 22px 50px rgba(0,0,0,.55);padding:26px 26px 22px;position:relative;transform:rotate(-.8deg)}',
    '#adminLogin::before{content:"";position:absolute;top:-12px;left:50%;transform:translateX(-50%) rotate(-4deg);',
    'width:96px;height:26px;background:rgba(207,32,44,.75);opacity:.85}',
    '#adminLogin h3{font-family:var(--f-cn);font-size:19px;margin:0 0 4px;font-weight:700;letter-spacing:1px}',
    '#adminLogin .tip{font-family:var(--f-mono);font-size:11px;color:var(--ink-soft);margin-bottom:16px}',
    '#adminLogin label{display:block;font-size:12px;color:var(--ink-soft);margin:10px 0 4px;letter-spacing:1px}',
    '#adminLogin input{width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid rgba(36,27,16,.45);',
    'background:var(--paper-3);color:var(--ink);font-family:var(--f-mono);font-size:14px;outline:none}',
    '#adminLogin input:focus{border-color:var(--pin)}',
    '#adminLogin .row{display:flex;gap:10px;margin-top:18px}',
    '#adminLogin button{flex:1;padding:9px 0;border:1px solid #000;cursor:pointer;font-family:var(--f-cn);font-size:14px;letter-spacing:2px}',
    '#adminLogin .ok{background:#100d09;color:#ece1c6}',
    '#adminLogin .ok:hover{background:var(--pin)}',
    '#adminLogin .no{background:var(--paper-2);color:var(--ink)}',
    '#adminLogin .err{color:var(--pin);font-size:12px;margin-top:10px;min-height:16px}',
    '#adminBar{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:9990;display:none;',
    'align-items:center;gap:8px;flex-wrap:wrap;justify-content:center;background:rgba(10,8,6,.93);color:#ece1c6;',
    'border:1px dashed rgba(236,225,198,.45);padding:10px 14px;box-shadow:0 14px 34px rgba(0,0,0,.6);max-width:94vw}',
    '#adminBar.show{display:flex}',
    '#adminBar span.hint{font-family:var(--f-mono);font-size:11px;color:rgba(236,225,198,.7)}',
    '#adminBar button{background:#ece1c6;color:#241b10;border:1px solid #000;padding:6px 12px;cursor:pointer;',
    'font-family:var(--f-cn);font-size:12.5px;letter-spacing:1px}',
    '#adminBar button:hover{background:var(--pin);color:#fff}',
    '#adminBar button.off{opacity:.55}',
    'body.admin-editing [data-admin-editable]{outline:1px dashed rgba(207,32,44,.65);outline-offset:2px;cursor:text;border-radius:2px}',
    'body.admin-editing [data-admin-editable]:hover{background:rgba(192,143,36,.16)}',
    '#adminToast{position:fixed;left:50%;bottom:86px;transform:translateX(-50%);z-index:9999;background:#100d09;',
    'color:#ece1c6;border:1px solid rgba(236,225,198,.4);padding:8px 18px;font-size:13px;display:none}',
    '#adminToast.show{display:block}'
  ].join('');
  var st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  /* ---------- 入口 ---------- */
  var navFallback = document.querySelector('.nav-fallback');
  var entry = document.createElement('button');
  entry.id = 'adminEntry';
  entry.type = 'button';
  entry.title = '文字管理';
  entry.textContent = '⚙';
  if (navFallback) navFallback.appendChild(entry);

  var modal = document.createElement('div');
  modal.id = 'adminModal';
  modal.innerHTML =
    '<div id="adminLogin">' +
    '<h3>管理后台登录</h3>' +
    '<div class="tip">ADMIN ONLY · 仅用于文字内容维护</div>' +
    '<label>账号</label><input id="adminUser" autocomplete="username" placeholder="用户名">' +
    '<label>密码</label><input id="adminPass" type="password" autocomplete="current-password" placeholder="密码">' +
    '<div class="err" id="adminErr"></div>' +
    '<div class="row"><button class="no" id="adminCancel">取消</button><button class="ok" id="adminOk">登录</button></div>' +
    '</div>';
  document.body.appendChild(modal);

  var bar = document.createElement('div');
  bar.id = 'adminBar';
  bar.innerHTML =
    '<span class="hint">已登录 · ' + USER + '</span>' +
    '<button id="adminToggleEdit">编辑模式：开</button>' +
    '<button id="adminSave">保存</button>' +
    '<button id="adminReset">撤销全部</button>' +
    '<button id="adminExport">导出</button>' +
    '<button id="adminImport">导入</button>' +
    '<button id="adminLogout">退出</button>' +
    '<input id="adminFile" type="file" accept="application/json,.json" style="display:none">';
  document.body.appendChild(bar);

  var toastEl = document.createElement('div');
  toastEl.id = 'adminToast';
  document.body.appendChild(toastEl);

  var toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 1900);
  }

  /* ---------- 登录 ---------- */
  function openLogin() {
    modal.classList.add('show');
    document.getElementById('adminErr').textContent = '';
    document.getElementById('adminUser').value = '';
    document.getElementById('adminPass').value = '';
    setTimeout(function () { document.getElementById('adminUser').focus(); }, 60);
  }
  function closeLogin() { modal.classList.remove('show'); }

  function tryLogin() {
    var u = document.getElementById('adminUser').value.trim();
    var p = document.getElementById('adminPass').value;
    if (u === USER && p === PASS) {
      sessionStorage.setItem(AUTH_KEY, '1');
      closeLogin();
      enterAdmin();
      toast('登录成功，可开始编辑文字');
    } else {
      document.getElementById('adminErr').textContent = '账号或密码不正确';
    }
  }

  /* ---------- 编辑模式 ---------- */
  function markEditables(on) {
    var list = collect();
    list.forEach(function (el) {
      if (on) {
        el.setAttribute('data-admin-editable', '1');
        el.setAttribute('contenteditable', 'true');
        el.setAttribute('spellcheck', 'false');
      } else {
        el.removeAttribute('data-admin-editable');
        el.removeAttribute('contenteditable');
        el.removeAttribute('spellcheck');
      }
    });
  }

  function setEditMode(on) {
    EDIT_MODE = on;
    document.body.classList.toggle('admin-editing', on);
    markEditables(on);
    var b = document.getElementById('adminToggleEdit');
    b.textContent = '编辑模式：' + (on ? '开' : '关');
    b.classList.toggle('off', !on);
  }

  function enterAdmin() {
    bar.classList.add('show');
    applyEdits();
    setEditMode(true);
  }
  function leaveAdmin() {
    setEditMode(false);
    bar.classList.remove('show');
  }

  /* ---------- 事件 ---------- */
  entry.addEventListener('click', function () {
    if (sessionStorage.getItem(AUTH_KEY) === '1') {
      enterAdmin();
    } else {
      openLogin();
    }
  });
  document.getElementById('adminCancel').addEventListener('click', closeLogin);
  document.getElementById('adminOk').addEventListener('click', tryLogin);
  document.getElementById('adminPass').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') tryLogin();
  });
  document.getElementById('adminUser').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') document.getElementById('adminPass').focus();
  });
  modal.addEventListener('click', function (e) {
    if (e.target === modal) closeLogin();
  });

  bar.addEventListener('input', function () { dirty = true; });
  document.addEventListener('input', function (e) {
    if (EDIT_MODE && e.target && e.target.hasAttribute && e.target.hasAttribute('data-admin-editable')) {
      dirty = true;
    }
  });

  document.getElementById('adminToggleEdit').addEventListener('click', function () {
    if (EDIT_MODE && dirty) {
      if (!confirm('有未保存的修改，确定退出编辑模式吗？')) return;
    }
    setEditMode(!EDIT_MODE);
  });

  document.getElementById('adminSave').addEventListener('click', persist);

  document.getElementById('adminReset').addEventListener('click', function () {
    if (!confirm('将清除本浏览器保存的全部文字修改并恢复原始内容，确定吗？')) return;
    localStorage.removeItem(EDIT_KEY);
    dirty = false;
    location.reload();
  });

  document.getElementById('adminExport').addEventListener('click', function () {
    var map = loadEdits();
    collect().forEach(function (el) { map[eid(el)] = el.innerHTML; });
    var blob = new Blob([JSON.stringify(map, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'portfolio-text-edits.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  var fileInput = document.getElementById('adminFile');
  document.getElementById('adminImport').addEventListener('click', function () { fileInput.click(); });
  fileInput.addEventListener('change', function () {
    var f = fileInput.files && fileInput.files[0];
    if (!f) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var incoming = JSON.parse(reader.result);
        if (!incoming || typeof incoming !== 'object') throw 0;
        var map = loadEdits();
        Object.keys(incoming).forEach(function (k) { map[k] = incoming[k]; });
        saveEdits(map);
        toast('导入成功，正在刷新');
        setTimeout(function () { location.reload(); }, 900);
      } catch (err) {
        alert('文件格式不正确');
      }
      fileInput.value = '';
    };
    reader.readAsText(f);
  });

  document.getElementById('adminLogout').addEventListener('click', function () {
    if (dirty && !confirm('有未保存的修改，确定退出吗？')) return;
    sessionStorage.removeItem(AUTH_KEY);
    leaveAdmin();
    toast('已退出管理后台');
  });

  /* 编辑模式下拦截链接跳转 */
  document.addEventListener('click', function (e) {
    if (!EDIT_MODE) return;
    var a = e.target.closest && e.target.closest('a');
    if (a) e.preventDefault();
  }, true);

  /* 快捷键：Ctrl+S 保存 */
  document.addEventListener('keydown', function (e) {
    if (EDIT_MODE && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      persist();
    }
    if (e.key === 'Escape' && modal.classList.contains('show')) closeLogin();
  });

  /* 页面脚本会动态插入内容，延迟再套一层编辑属性 */
  window.addEventListener('load', function () {
    applyEdits();
    if (EDIT_MODE) markEditables(true);
    setTimeout(function () { if (EDIT_MODE) markEditables(true); }, 1200);
  });

  if (sessionStorage.getItem(AUTH_KEY) === '1') {
    applyEdits();
  }
})();
