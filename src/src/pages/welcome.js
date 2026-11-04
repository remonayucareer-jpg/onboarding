/* 页面 0：欢迎页
 * 版式：整幅主视觉（浅灰底色带 + 右侧实拍图）+ 信息条（预计用时 / 无需考试）
 *      + 「你将体验」三步 + 主按钮。
 * 文案、配图、步骤全部来自 pages.config.js#welcome，页面里不写死文案。
 */
window.HKR = window.HKR || {};
HKR.pages = HKR.pages || {};

(function () {
  /* 信息条的细线图标：单色（跟着文字色走）、1.5px 描边。
     不用 emoji，也不用彩色插画 —— 图标在这里只帮「一眼认出这行是什么」。 */
  var FACT_ICONS = {
    clock:
      '<svg class="fact__svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="8.2" /><path d="M12 7.4V12l3.1 1.9" /></svg>',
    note:
      '<svg class="fact__svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="4.4" y="4.4" width="15.2" height="15.2" rx="3.2" /><path d="M8.6 9.6h6.8M8.6 13.2h4.4" /></svg>'
  };

  /* 主按钮里的方向箭头（「开始体验 →」）：指示「往下一步走」，不是装饰 */
  var ARROW =
    '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M3.6 10h12" /><path d="M11.2 5.6 15.6 10l-4.4 4.4" /></svg>';

  HKR.pages.welcome = {
    render: function (host, ctx) {
      var ui = ctx.ui;
      var cfg = ctx.config.welcome;
      var app = ctx.config.app;
      var state = ctx.state();
      var roleLabel = state.session.role === 'admin' ? '管理员' : state.session.role === 'frontline' ? '一线员工' : '';
      /* 首页永远从「开始体验」（第一章）讲起；上次没走完时，额外给一个显式的继续入口。
       * 入口读的是路由在进入本页前留底的「上次停留位置」（见 router.js resumeHint）。 */
      var resume = ctx.resumeHint();

      /* 主视觉配图：路径来自配置；没配就只留底色带，不会出现裂图 */
      var art = cfg.heroImage
        ? ui.raw(
            ui.html`<div class="hero__art" aria-hidden="true" style="background-image:url('${cfg.heroImage}')"></div>`
          )
        : '';

      ui.setHtml(
        host,
        ui.html`
          <section class="hero hero--welcome">
            ${art}
            <div class="hero__body">
              <p class="hero__kicker">${cfg.kicker}</p>
              <h1 class="hero__title">${ui.raw(cfg.titleLines.map(ui.escapeHtml).join('<br />'))}</h1>
              <p class="hero__subtitle">${cfg.subtitle}</p>
            </div>
          </section>

          <section class="facts">
            ${cfg.facts.map(function (fact) {
              return ui.raw(
                ui.html`
                  <div class="fact">
                    <span class="fact__icon">${ui.raw(FACT_ICONS[fact.icon] || '')}</span>
                    <div class="fact__text">
                      <p class="fact__label">${fact.label}</p>
                      <p class="fact__value">${fact.value}</p>
                    </div>
                  </div>
                `
              );
            })}
          </section>

          <section class="steps">
            <h2 class="steps__label">${cfg.stepsLabel}</h2>
            <ol class="step-list">
              ${cfg.steps.map(function (step, index) {
                return ui.raw(
                  ui.html`
                    <li class="step">
                      <span class="step__no">${index + 1}</span>
                      <p class="step__title">${step.title}</p>
                      <p class="step__desc">${step.desc}</p>
                    </li>
                  `
                );
              })}
            </ol>
          </section>

          ${roleLabel
            ? ui.raw(ui.html`
                <div class="role-context">
                  <span class="chip chip--role">当前角色：${roleLabel}</span>
                  <button class="linkbtn linkbtn--plain" type="button" data-action="switch-role">切换身份</button>
                </div>
              `)
            : ''}

          <div class="cta-row">
            <button class="btn btn--navy btn--lg" type="button" data-action="start">
              ${cfg.ctaLabel}
              <span class="btn__arrow">${ui.raw(ARROW)}</span>
            </button>
            ${resume
              ? ui.raw(ui.html`
                  <button class="linkbtn linkbtn--center linkbtn--plain" type="button" data-action="resume-progress">
                    继续上次进度：${resume.chapter} · ${resume.stepLabel}
                    <span aria-hidden="true">›</span>
                  </button>
                `)
              : ''}
          </div>

          <div class="page-notes">
            <p>${resume ? '上次没走完，进度已经保留。' : '中途退出，进度也会保留。'}</p>
            <p>${cfg.tipNote}</p>
            <p>${app.wechatTip}</p>
          </div>
        `
      );

      ui.delegate(host, '[data-action="start"]', 'click', function () {
        ctx.analytics.track('welcome_start');
        ctx.go('pain-point');
      });

      if (resume) {
        ui.delegate(host, '[data-action="resume-progress"]', 'click', function () {
          ctx.analytics.track('welcome_resume', { page_id: resume.id });
          ctx.go(resume.id);
        });
      }

      ui.delegate(host, '[data-action="switch-role"]', 'click', function () {
        ctx.go('roles');
      });
    }
  };
})();
