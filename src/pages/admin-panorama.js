/* 管理版 · 第 1 屏「AI 能做 / 不能做」
 * 视觉按设计稿 1:1 还原：衬线大标题、右侧灯绳、编号列表、底部结论 + 继续。
 * 交互：进屏是「暗」的（字发灰、AI 解法不显示但占位）→ 拉灯绳 → 变亮、解法逐条出现。
 */
window.HKR = window.HKR || {};
HKR.pages = HKR.pages || {};

(function () {
  var ARROW =
    '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M4 10h11.2" /><path d="m11.2 5.8 4.2 4.2-4.2 4.2" /></svg>';

  function esc(value) {
    return HKR.core.ui.escapeHtml(value == null ? '' : String(value));
  }

  HKR.pages['admin-panorama'] = {
    render: function (host, ctx) {
      var ui = ctx.ui;
      var cfg = (ctx.config.admin && ctx.config.admin.panorama) || {};
      var items = cfg.items || [];

      var rowsHtml = items
        .map(function (item, index) {
          return (
            '<li class="ad-row">' +
            '<span class="ad-row__no">' + esc(item.no || (index + 1 < 10 ? '0' : '') + (index + 1)) + '</span>' +
            '<div class="ad-row__body">' +
            '<p class="ad-row__pain">' + esc(item.pain) + '</p>' +
            '<p class="ad-row__solve">' +
            '<span class="ad-row__chip">AI</span>' +
            '<span class="ad-row__solve-text">' + esc(item.solve) + '</span>' +
            '</p>' +
            '</div>' +
            '</li>'
          );
        })
        .join('');

      ui.setHtml(
        host,
        ui.html`
          <section class="ad-panorama" data-lit="false" aria-labelledby="ad-panorama-title">
            <header class="ad-panorama__head">
              <p class="ad-panorama__kicker">
                <span class="ad-panorama__rule" aria-hidden="true"></span>
                <span class="ad-panorama__kicker-text">没有 AI 的时候</span>
              </p>
              <h1 class="ad-panorama__title" id="ad-panorama-title">
                ${cfg.title || 'AI 能做'}<br />
                <span class="ad-panorama__title-dim">${cfg.titleDim || '/ 不能做'}</span>
              </h1>
            </header>

            <div class="ad-cord" role="button" tabindex="0" aria-label="拉一下灯绳，看看有 AI 之后">
              <span class="ad-cord__rail" aria-hidden="true"></span>
              <span class="ad-cord__rope" aria-hidden="true"></span>
              <span class="ad-cord__ball" aria-hidden="true"></span>
              <span class="ad-cord__hint">拉一下</span>
            </div>

            <ol class="ad-panorama__list">
              ${ui.raw(rowsHtml)}
            </ol>

            <p class="ad-panorama__summary">${esc(cfg.summary || '人机协同，服务不断档')}</p>

            <div class="ad-panorama__action">
              <button class="ad-panorama__next" type="button" data-action="admin-next">
                <span>${esc(cfg.nextLabel || '继续')}</span>
                <span class="ad-panorama__arrow" aria-hidden="true">${ui.raw(ARROW)}</span>
              </button>
            </div>
          </section>
        `
      );

      var root = host.querySelector('.ad-panorama');
      var cord = host.querySelector('.ad-cord');
      var kickerText = host.querySelector('.ad-panorama__kicker-text');
      var hint = host.querySelector('.ad-cord__hint');
      var lit = false;

      function apply(nextLit) {
        lit = nextLit;
        root.setAttribute('data-lit', lit ? 'true' : 'false');
        kickerText.textContent = lit ? '有了 AI 之后' : '没有 AI 的时候';
        hint.textContent = lit ? '拉回去看看' : '拉一下';
        ctx.analytics.track('admin_panorama_light', { lit: lit });
      }

      /* 点绳子 / 点屏幕任意位置 / 向下滑 ≥10px 都算拉 */
      function pull() {
        cord.classList.add('is-pulled');
        window.setTimeout(function () {
          cord.classList.remove('is-pulled');
          apply(!lit);
        }, 120);
      }

      cord.addEventListener('click', function (event) {
        event.stopPropagation();
        pull();
      });

      host.addEventListener('click', function (event) {
        if (event.target.closest('[data-action="admin-next"]')) return;
        pull();
      });

      cord.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ' || event.keyCode === 13 || event.keyCode === 32) {
          event.preventDefault();
          pull();
        }
      });

      var startY = null;
      cord.addEventListener('pointerdown', function (event) {
        startY = event.clientY;
      });
      cord.addEventListener('pointermove', function (event) {
        if (startY === null) return;
        if (event.clientY - startY > 10) {
          startY = null;
          pull();
        }
      });
      cord.addEventListener('pointerup', function () {
        startY = null;
      });

      ui.delegate(host, '[data-action="admin-next"]', 'click', function () {
        ctx.analytics.track('admin_panorama_next', { lit: lit });
        if (!lit) {
          ui.toast('先把灯拉亮，看完整这一屏。', { variant: 'note', duration: 2000 });
          return;
        }
        if (cfg.nextPageId) ctx.go(cfg.nextPageId);
        else ui.toast('下一屏还在制作中。', { variant: 'note', duration: 2000 });
      });
    }
  };
})();
