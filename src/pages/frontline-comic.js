/* 一线版 · 开场漫画（落地首屏）
 *
 * 一页四格：① 三头六臂接电话（大） ② 抱着东西跑（小） ③ 门口送错（小） ④ 晕头转向（宽）
 * 节奏：空画框先出现 → 逐格从下往上填入 → 每格跟一句拟声词 → 定格等她点。
 * 时间点、文案、拟声词位置全部在 config 里，改字改节奏不用动这里。
 */
window.HKR = window.HKR || {};
HKR.pages = HKR.pages || {};

(function () {
  var ARROW =
    '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M4 10h11.2" /><path d="m11.2 5.8 4.2 4.2-4.2 4.2" /></svg>';

  function esc(value) {
    return HKR.core.ui.escapeHtml(value == null ? '' : String(value));
  }

  HKR.pages['frontline-comic'] = {
    render: function (host, ctx) {
      var ui = ctx.ui;
      var cfg = (ctx.config.frontline && ctx.config.frontline.comic) || {};
      var panels = cfg.panels || [];
      var timeline = cfg.timeline || {};
      var start = timeline.start == null ? 500 : timeline.start;
      var step = timeline.step == null ? 850 : timeline.step;

      var panelsHtml = panels
        .map(function (panel, index) {
          var onomaStyle =
            'left:' + (panel.x || 10) + '%;top:' + (panel.y || 10) + '%;--rot:' + (panel.rot || 0) + 'deg;';
          var extra = panel.extra
            ? '<span class="fl-comic__onoma fl-comic__onoma--sub" style="left:' +
              (panel.extra.x || 60) +
              '%;top:' +
              (panel.extra.y || 40) +
              '%;--rot:' +
              (panel.extra.rot || 0) +
              'deg;">' +
              esc(panel.extra.text) +
              '</span>'
            : '';
          return (
            '<li class="fl-comic__panel fl-comic__panel--' +
            (panel.shape || 'small') +
            '" data-slot="' +
            (index + 1) +
            '">' +
            '<img class="fl-comic__img" src="' +
            esc(panel.src) +
            '" alt="' +
            esc(panel.alt) +
            '" />' +
            '<span class="fl-comic__onoma fl-comic__onoma--' +
            (panel.size || 'md') +
            '" style="' +
            onomaStyle +
            '">' +
            esc(panel.onoma) +
            '</span>' +
            extra +
            '</li>'
          );
        })
        .join('');

      ui.setHtml(
        host,
        ui.html`
          <section class="fl-comic" data-done="false" aria-label="开场漫画">
            <div class="fl-comic__meta">
              <span>${esc(cfg.stepLabel || '场景')}</span>
              <span>${esc(cfg.countLabel || '约 5 秒')}</span>
            </div>
            <p class="fl-comic__subtitle">${esc(cfg.subtitle || '')}</p>
            <ol class="fl-comic__page">
              ${ui.raw(panelsHtml)}
            </ol>
            <div class="fl-comic__end">
              <p class="fl-comic__endline">${esc(cfg.endline || '')}</p>
              <button class="btn btn--navy btn--lg fl-comic__cta" type="button" data-action="comic-next">
                <span>${esc(cfg.nextLabel || '继续')}</span>
                <span class="btn__arrow" aria-hidden="true">${ui.raw(ARROW)}</span>
              </button>
            </div>
          </section>
        `
      );

      var root = host.querySelector('.fl-comic');
      var timers = [];
      var done = false;

      /* 换页后定时器可能还在跑：确认页面还在、还是这一屏，才继续动 */
      function alive() {
        if (!document.body.contains(root)) return false;
        if (ctx.currentPageId && ctx.currentPageId() !== 'frontline-comic') return false;
        return true;
      }

      function playSfx(src) {
        if (!src) return;
        if (ctx.config.app && ctx.config.app.features && ctx.config.app.features.comicSfx === false) return;
        try {
          var el = new Audio(src);
          el.volume = 0.85;
          var played = el.play();
          /* 落地首屏没有手势，iOS/微信会拦：被拦就静默跳过，不打扰她 */
          if (played && played.catch) played.catch(function () {});
        } catch (error) {
          /* 忽略 */
        }
      }

      function fill(index) {
        if (!alive()) return;
        var panel = root.querySelector('[data-slot="' + (index + 1) + '"]');
        if (panel) panel.classList.add('is-filled');
        var sfx = (cfg.sfx || []).filter(function (item) {
          return item.panel === index + 1;
        })[0];
        if (sfx) playSfx(sfx.src);
      }

      function finish() {
        if (done || !alive()) return;
        done = true;
        root.setAttribute('data-done', 'true');
        ctx.analytics.track('frontline_comic_done', { panels: panels.length });
      }

      panels.forEach(function (panel, index) {
        timers.push(
          window.setTimeout(function () {
            fill(index);
          }, start + index * step)
        );
      });
      timers.push(
        window.setTimeout(finish, start + panels.length * step + 150)
      );

      function goNext() {
        if (!done || !alive()) return;
        ctx.analytics.track('frontline_comic_next', {});
        if (cfg.nextPageId) ctx.go(cfg.nextPageId);
      }

      ui.delegate(host, '[data-action="comic-next"]', 'click', function (event) {
        event.stopPropagation();
        goNext();
      });
      host.addEventListener('click', function () {
        goNext();
      });
    }
  };
})();
