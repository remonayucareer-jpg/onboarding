/* 一线员工预习准备页：先确认音量，再由用户主动开始后续语音课件。 */
window.HKR = window.HKR || {};
HKR.pages = HKR.pages || {};

(function () {
  var SOUND_PHONE =
    '<svg viewBox="0 0 152 152" aria-hidden="true" focusable="false">' +
    '<rect class="frontline-ready__phone" x="46" y="24" width="60" height="104" rx="13" />' +
    '<path class="frontline-ready__phone-line" d="M67 34h18" />' +
    '<path class="frontline-ready__speaker" d="M64 76h12l13-11v34l-13-11H64z" />' +
    '<path class="frontline-ready__wave" d="M96 69c8 6 8 20 0 26" />' +
    '<path class="frontline-ready__wave frontline-ready__wave--far" d="M106 61c14 11 14 35 0 46" />' +
    '<path class="frontline-ready__volume-line" d="M36 116h52" />' +
    '<circle class="frontline-ready__volume-dot" cx="88" cy="116" r="7" />' +
    '</svg>';

  var SPEAKER_ICON =
    '<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">' +
    '<path d="M6.5 13h5l6-5v16l-6-5h-5z" />' +
    '<path d="M22 12c2.4 2.2 2.4 5.8 0 8" />' +
    '<path d="M25.5 9c4.3 4 4.3 10 0 14" />' +
    '</svg>';

  var REPLAY_ICON =
    '<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">' +
    '<path d="M9 12H5V8" />' +
    '<path d="M6 12a11 11 0 1 1-1 9" />' +
    '<path d="M13 12l4 4-4 4" />' +
    '</svg>';

  var ARROW =
    '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M4 10h11.2" /><path d="m11.2 5.8 4.2 4.2-4.2 4.2" /></svg>';

  function pageExists(ctx, pageId) {
    return (ctx.config.pages || []).some(function (page) {
      return page.id === pageId;
    });
  }

  HKR.pages.frontline = {
    render: function (host, ctx) {
      var ui = ctx.ui;
      var cfg = ctx.config.frontlinePrepare;

      ui.setHtml(
        host,
        ui.html`
          <section class="frontline-ready" aria-labelledby="frontline-ready-title">
            <header class="frontline-ready__head">
              <p class="frontline-ready__kicker">${cfg.kicker}</p>
              <h1 class="frontline-ready__title" id="frontline-ready-title">${ui.raw(cfg.titleLines.map(ui.escapeHtml).join('<br />'))}</h1>
            </header>

            <div class="frontline-ready__visual" aria-hidden="true">
              <span class="frontline-ready__halo"></span>
              <span class="frontline-ready__art">${ui.raw(SOUND_PHONE)}</span>
            </div>

            <div class="frontline-ready__tips" aria-label="声音提示">
              <aside class="frontline-ready__tip">
                <span class="frontline-ready__tip-icon" aria-hidden="true">${ui.raw(SPEAKER_ICON)}</span>
                <span class="frontline-ready__volume-title">${ui.raw(cfg.volumeTitle)}</span>
              </aside>
              <aside class="frontline-ready__tip">
                <span class="frontline-ready__tip-icon" aria-hidden="true">${ui.raw(REPLAY_ICON)}</span>
                <span class="frontline-ready__volume-note">${cfg.volumeNote}</span>
              </aside>
            </div>

            <div class="frontline-ready__action">
              <button class="btn btn--navy btn--lg frontline-ready__button" type="button" data-action="frontline-ready">
                <span>${cfg.ctaLabel}</span>
                <span class="btn__arrow" aria-hidden="true">${ui.raw(ARROW)}</span>
              </button>
            </div>
          </section>
        `
      );

      ui.delegate(host, '[data-action="frontline-ready"]', 'click', function (event, target) {
        ctx.analytics.track('frontline_ready');
        if (pageExists(ctx, cfg.startPageId)) {
          ctx.go(cfg.startPageId);
          return;
        }
        /* 九个学习画面尚未接入时，保留可点击反馈，避免按钮成为无效入口。 */
        ui.toast('准备页已完成，第一画面待接入。', { variant: 'note', duration: 2600 });
      });
    }
  };
})();
