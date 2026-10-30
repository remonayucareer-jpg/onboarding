/* 一线版 · 首页（开屏页）
 * 直接整页显示设计稿那张图（780×1688 = 390×844 @2x），整页可点，
 * 点一下进开场漫画（有进度就接着上次那一屏）。
 * 图路径在 config/frontline.config.js#cover.poster，换图只改这一行。
 */
window.HKR = window.HKR || {};
HKR.pages = HKR.pages || {};

(function () {
  function esc(value) {
    return HKR.core.ui.escapeHtml(value == null ? '' : String(value));
  }

  HKR.pages['frontline-cover'] = {
    render: function (host, ctx) {
      var ui = ctx.ui;
      var cfg = (ctx.config.frontline && ctx.config.frontline.cover) || {};

      ui.setHtml(
        host,
        ui.html`
          <section class="fl-cover" aria-label="一线员工预习材料">
            <button class="fl-cover__tap" type="button" data-action="cover-start" aria-label="开始预习">
              <img
                class="fl-cover__poster"
                src="${esc(cfg.poster || 'assets/images/start-page/开始页-一线员工预习-浅色版.png')}"
                alt="${esc(cfg.posterAlt || '一线员工预习材料：10 个学习画面，6 分钟看完，答对 2 题就能通过。')}"
              />
            </button>
          </section>
        `
      );

      ui.delegate(host, '[data-action="cover-start"]', 'click', function () {
        ctx.analytics.track('frontline_cover_start', {});
        /* 有进度就接着上次那一屏走，没有就从开场漫画开始 */
        var resumable = ctx.resumeTarget ? ctx.resumeTarget() : null;
        ctx.go((resumable && resumable.id) || cfg.nextPageId || 'frontline-comic');
      });
    }
  };
})();
