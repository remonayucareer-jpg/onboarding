/* 通用 UI 工具：模板转义、DOM 选择、事件绑定、轻量提示、时长格式化 */
window.HKR = window.HKR || {};
HKR.core = HKR.core || {};

(function () {
  var ESCAPE_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(/[&<>"']/g, function (ch) {
      return ESCAPE_MAP[ch];
    });
  }

  /* 标记为「可信 HTML」，不转义（仅用于我们自己拼好的结构片段） */
  function raw(markup) {
    return { __raw: true, value: String(markup) };
  }

  function stringify(value) {
    if (value === null || value === undefined || value === false) return '';
    if (Array.isArray(value)) return value.map(stringify).join('');
    if (value && value.__raw) return value.value;
    return escapeHtml(value);
  }

  /* 模板字符串标签：html`<p>${content}</p>`，默认对插值转义 */
  function html(strings) {
    var values = Array.prototype.slice.call(arguments, 1);
    var out = '';
    for (var i = 0; i < strings.length; i++) {
      out += strings[i];
      if (i < values.length) out += stringify(values[i]);
    }
    return out;
  }

  function $(selector, root) {
    return (root || document).querySelector(selector);
  }

  function $$(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  /* 事件委托：容器只绑定一次，按钮重绘后依然有效 */
  function delegate(root, selector, type, handler) {
    if (!root) return;
    root.addEventListener(type, function (event) {
      var target = event.target;
      while (target && target !== root) {
        if (target.matches && target.matches(selector)) {
          handler.call(target, event, target);
          return;
        }
        target = target.parentNode;
      }
    });
  }

  function setHtml(container, markup) {
    container.innerHTML = markup;
    return container;
  }

  /* 轻量提示条（不阻塞操作） */
  var toastTimer = null;
  function toast(message, options) {
    var opts = options || {};
    var box = $('#toast');
    if (!box) {
      box = document.createElement('div');
      box.id = 'toast';
      box.className = 'toast';
      box.setAttribute('role', 'status');
      box.setAttribute('aria-live', 'polite');
      document.body.appendChild(box);
    }
    box.textContent = message;
    box.className = 'toast is-visible' + (opts.variant ? ' toast--' + opts.variant : '');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      box.className = 'toast';
    }, opts.duration || 2200);
  }

  /* 一次性点击保护，避免快速重复点击造成状态错乱 */
  function onceClick(button, handler, options) {
    var opts = options || {};
    var locked = false;
    button.addEventListener('click', function (event) {
      if (locked) return;
      locked = true;
      button.classList.add('is-pressed');
      try {
        handler(event, button);
      } finally {
        if (!opts.keepLocked) {
          setTimeout(function () {
            locked = false;
            button.classList.remove('is-pressed');
          }, opts.unlockAfter || 320);
        }
      }
    });
  }

  function formatDuration(seconds) {
    var s = Math.max(0, Math.round(seconds || 0));
    var m = Math.floor(s / 60);
    var rest = s % 60;
    if (m <= 0) return rest + ' 秒';
    return m + ' 分 ' + rest + ' 秒';
  }

  function formatClock(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    function pad(n) {
      return n < 10 ? '0' + n : String(n);
    }
    return (
      d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes())
    );
  }

  HKR.core.ui = {
    escapeHtml: escapeHtml,
    raw: raw,
    html: html,
    $: $,
    $$: $$,
    delegate: delegate,
    setHtml: setHtml,
    toast: toast,
    onceClick: onceClick,
    formatDuration: formatDuration,
    formatClock: formatClock
  };
})();
