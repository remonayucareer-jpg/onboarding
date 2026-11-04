/* 页面 1：工作困扰单选 → 对应产品价值（用于了解关注点，不做身份判断/考核/分流）
 * 版式按设计稿（页面 2）：章节标签 + 大标题 → 三个选项卡 → 选完展开一整块浅蓝结论
 * （.value-panel：你关注的是什么 / 我们能帮上什么 / 「我们可以帮忙！」）→ 深蓝主按钮。
 * 文案全部来自 config/questions.config.js#painPoint，页面里不写死文案。 */
window.HKR = window.HKR || {};
HKR.pages = HKR.pages || {};

(function () {
  /* 主按钮里的方向箭头：和欢迎页用的是同一枚，表示「往下一步走」，不是装饰 */
  var ARROW =
    '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M3.6 10h12" /><path d="M11.2 5.6 15.6 10l-4.4 4.4" /></svg>';

  function optionHtml(option, selectedKey) {
    var selected = option.key === selectedKey;
    return HKR.core.ui.html`
      <button class="option option--rich ${selected ? 'is-selected' : ''}" type="button" role="radio"
        aria-checked="${selected ? 'true' : 'false'}" data-pain-key="${option.key}">
        <span class="option__key">${option.key}</span>
        <span class="option__content">
          <span class="option__label">${option.label}</span>
          ${option.desc
            ? HKR.core.ui.raw('<span class="option__desc">' + HKR.core.ui.escapeHtml(option.desc) + '</span>')
            : ''}
        </span>
        <span class="option__mark" aria-hidden="true">${selected ? '✓' : ''}</span>
      </button>
    `;
  }

  /* 结论块：一行说清「你关注的是哪件事」，一句结论 + 三条要点，
   * 末尾是固定前缀「我们可以帮忙！」加一句按选项给的话（配置里 helpLead + help）。
   * 这里只有这一块，不再另起「顺便说一句」的补充说明 —— 咨询 / 服务 / 管理三类的关系
   * 留给下一屏「两类需求」讲，同一屏不重复。 */
  function valueHtml(option, helpLead) {
    var ui = HKR.core.ui;
    return ui.html`
      <section class="value-panel" aria-live="polite">
        <p class="value-panel__head">
          <span class="value-panel__badge" aria-hidden="true">${option.key}</span>
          <span class="value-panel__kicker">你关注的是 <strong>${option.valueTitle}</strong></span>
        </p>
        <p class="value-panel__summary">${option.valueSummary}</p>
        <ul class="value-panel__points">
          ${option.valuePoints.map(function (point) {
            return ui.raw(ui.html`<li>${point}</li>`);
          })}
        </ul>
        <p class="value-panel__help"><strong>${helpLead}</strong> ${option.help}</p>
      </section>
    `;
  }

  HKR.pages['pain-point'] = {
    render: function (host, ctx) {
      var ui = ctx.ui;
      var cfg = ctx.config.painPoint;
      var state = ctx.state();
      var selectedKey = state.painPoint.pain_point_choice;

      function optionByKey(key) {
        return cfg.options.filter(function (item) {
          return item.key === key;
        })[0];
      }

      function paint() {
        /* 每次重画都重新判断：选项一换，下面的提示语要跟着换。
         * （原来只在 render 里算一次，选完仍然显示「先选一个……」，属于渲染层的状态残留） */
        var revealed = !!selectedKey;

        ui.setHtml(
          host,
          ui.html`
            <section class="chapter-intro">
              <p class="chapter-intro__tag">第一章 · 认识产品价值</p>
              <h1 class="page-title">${cfg.title}</h1>
              <p class="page-subtitle">${cfg.hint}</p>
            </section>

            <div class="options options--rich" role="radiogroup" aria-label="${cfg.title}">
              ${cfg.options.map(function (option) {
                return ui.raw(optionHtml(option, selectedKey));
              })}
            </div>

            <div class="value-host" data-role="value-host">
              ${selectedKey ? ui.raw(valueHtml(optionByKey(selectedKey), cfg.helpLead)) : ''}
            </div>

            <div class="cta-row">
              ${selectedKey
                ? ui.raw(ui.html`<button class="btn btn--navy btn--lg" type="button" data-action="next">
                    继续
                    <span class="btn__arrow">${ui.raw(ARROW)}</span>
                  </button>`)
                : ui.raw(ui.html`<button class="btn btn--lg is-disabled" type="button" data-action="reveal" disabled aria-disabled="true">${cfg.ctaLabel}</button>`)}
              <p class="cta-row__note">${revealed ? '随时可以换个选项看看。' : '先选一个最贴近你日常的选项。'}</p>
            </div>
          `
        );
      }

      paint();

      ui.delegate(host, '[data-pain-key]', 'click', function (event, target) {
        var key = target.getAttribute('data-pain-key');
        if (key === selectedKey) return;
        selectedKey = key;
        ctx.store.setPainPoint(key);
        ctx.analytics.track('pain_point_selected', { pain_point_choice: key });
        paint();
        var panel = ui.$('[data-role="value-host"]', host);
        if (panel) panel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        ui.toast('已记录你的关注点：' + key);
      });

      ui.delegate(host, '[data-action="reveal"]', 'click', function () {
        if (!selectedKey) ui.toast('先选一个选项');
      });

      ui.delegate(host, '[data-action="next"]', 'click', function () {
        ctx.go('need-types');
      });
    }
  };
})();

