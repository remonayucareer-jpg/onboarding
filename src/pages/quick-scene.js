/* 页面 4 / 页面 5：主场景二（客房报修）、主场景三（客房打扫）
 * 两个场景结构相同：3 步时间线 + 一张工单卡片 + 一道互动题（不重复领取流程），
 * 因此用同一个工厂函数生成，场景差异全部来自 src/config/scenes.config.js。
 */
window.HKR = window.HKR || {};
HKR.pages = HKR.pages || {};

(function () {
  function createPage(sceneKey, nextPageId, ctaLabel) {
    return {
      render: function (host, ctx) {
        var ui = ctx.ui;
        var scene = ctx.config.scenes[sceneKey];
        var question = scene.question;

        ui.setHtml(
          host,
          ui.html`
            <section class="chapter-intro">
              <p class="chapter-intro__tag">${scene.chapterLabel} · ${scene.kindLabel}</p>
              <h1 class="page-title">${scene.title}</h1>
              <p class="page-subtitle">${scene.intro}</p>
            </section>

            <p class="guest-line">${scene.guestLine}</p>

            <div class="timeline-host" data-role="timeline-host"></div>

            <section class="stage-block">
              <p class="stage-block__title">手机端收到的工单</p>
              <p class="stage-block__hint">看清「类型」和「需求」两项就够。</p>
              <div class="phone-host" data-role="phone-host"></div>
            </section>

            <div class="quiz-host" data-role="quiz-host"></div>
          `
        );

        HKR.components.timeline.render(ui.$('[data-role="timeline-host"]', host), {
          title: scene.timelineTitle,
          hint: scene.timelineHint,
          steps: scene.steps
        });

        HKR.components.phoneMock.render(ui.$('[data-role="phone-host"]', host), {
          sceneKey: sceneKey,
          view: 'detail',
          claimed: false,
          readOnly: true,
          readOnlyNote: scene.phone.readOnlyNote,
          screenshotPath: scene.screenshots.detail
        });

        HKR.components.quiz.render(ui.$('[data-role="quiz-host"]', host), {
          question: question,
          sceneId: scene.id,
          ctaLabel: ctaLabel,
          initialAnswer: ctx.store.getAnswer(question.id),
          onContinue: function () {
            ctx.go(nextPageId);
          }
        });
      }
    };
  }

  HKR.pages['scene-repair'] = createPage('repair', 'scene-cleaning', '继续，看最后一个场景');
  HKR.pages['scene-cleaning'] = createPage('cleaning', 'feedback', '继续，说说你的想法');
})();
