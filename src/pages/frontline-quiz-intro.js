/* 课后测试的说明页：正式出题之前，先告诉她「接下来是什么、要答几道、答对几道算过」。
 * 文案在 src/config/frontline.config.js#quizIntro 里。
 */
window.HKR = window.HKR || {};
HKR.pages = HKR.pages || {};

(function () {
  var ARROW =
    '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M4 10h11.2" /><path d="m11.2 5.8 4.2 4.2-4.2 4.2" /></svg>';

  HKR.pages['frontline-quiz-intro'] = {
    render: function (host, ctx) {
      var ui = ctx.ui;
      var cfg = ctx.config.frontline.quizIntro;
      var total = (ctx.config.frontline.quiz.questions || []).length;
      var pass = ctx.config.frontline.quiz.passCorrect || 2;
      var pointsHtml = cfg.points
        .map(function (point) {
          return '<li class="fl-intro__point">' + ui.escapeHtml(point) + '</li>';
        })
        .join('');

      ui.setHtml(
        host,
        ui.html`
          <section class="fl-intro" aria-labelledby="fl-intro-title">
            <header class="fl-intro__head">
              <p class="fl-intro__kicker">${cfg.kicker}</p>
              <h1 class="fl-intro__title" id="fl-intro-title">${cfg.title}</h1>
              <p class="fl-intro__subtitle">${cfg.subtitle}</p>
            </header>

            <ul class="fl-intro__points">
              ${ui.raw(pointsHtml)}
            </ul>

            <p class="fl-intro__highlight">答对 ${pass} 题就算完成（不用全部答对）</p>

            <p class="fl-intro__note">${cfg.note}</p>

            <div class="fl-intro__action">
              <button class="btn btn--navy btn--lg fl-intro__button" type="button" data-action="quiz-start">
                <span>${cfg.cta}</span>
                <span class="btn__arrow" aria-hidden="true">${ui.raw(ARROW)}</span>
              </button>
              <p class="fl-intro__meta">一共 ${total} 道题，慢慢答</p>
            </div>
          </section>
        `
      );

      ui.delegate(host, '[data-action="quiz-start"]', 'click', function () {
        ctx.store.resetQuiz();
        ctx.analytics.track('quiz_intro_start', { total: total, pass: pass });
        ctx.go(cfg.nextPageId);
      });
    }
  };
})();
