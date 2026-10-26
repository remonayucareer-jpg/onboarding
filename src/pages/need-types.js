/* 页面 2：酒店工作类型（两类需求：服务类 / 咨询类）
 * 版式按设计稿（页面 3）：章节标签 + 大标题 + 一行说明
 *   → 两张卡片（图标块 + 类别名 + 一句说明 +「>」），卡内是一块浅蓝底的客人原话，
 *     下面一句「AI 怎么处理」
 *   → ⓘ 提示块（请点击选择…）→ 深蓝主按钮。
 * 文案全部来自 config/questions.config.js#needTypes，页面里不写死文案。 */
window.HKR = window.HKR || {};
HKR.pages = HKR.pages || {};

(function () {
  /* 卡片图标：细线单色（跟着文字色走）、1.5px 描边。
     服务类＝「有人接手去做」，咨询类＝「问一句、答一句」。
     图标只帮一眼认出这是哪一类，不做彩色插画，也不引外部图标库。 */
  var ICONS = {
    hand:
      '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M10.6 9.4V4.3a1.3 1.3 0 0 1 2.6 0v4.6" /><path d="M13.2 8.6V5.4a1.3 1.3 0 0 1 2.6 0v6.1c0 3-1.9 4.9-4.7 4.9-1.4 0-2.5-.5-3.4-1.5l-2.3-2.6a1.3 1.3 0 0 1 1.9-1.7l1.3 1.3" /></svg>',
    chat:
      '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M10 5.6c3.2 0 5.8 1.5 5.8 3.4S13.2 12.4 10 12.4c-.8 0-1.6-.1-2.3-.3l-3 1.3.8-2.3c-.8-.6-1.3-1.3-1.3-2.1 0-1.9 2.6-3.4 5.8-3.4z" /></svg>'
  };

  /* 未选中是「>」，选中是「✓」：和第一章选项的选中态同一套语言（深蓝 + 勾） */
  var CHEVRON =
    '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M7.8 4.6 13.2 10l-5.4 5.4" /></svg>';
  var CHECK =
    '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M4.8 10.4l3.4 3.4 7-7" /></svg>';

  /* 主按钮里的方向箭头：和欢迎页 / 第一章用的是同一枚，表示「往下一步走」，不是装饰 */
  var ARROW =
    '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M3.6 10h12" /><path d="M11.2 5.6 15.6 10l-4.4 4.4" /></svg>';

  /* 提示块前的「ⓘ」：细线圆圈 + 一竖一点 */
  var INFO =
    '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><circle cx="10" cy="10" r="7.2" /><path d="M10 9.4v4.2" /><path d="M10 6.6h.01" /></svg>';

  /* 一张卡片：头部是「选择这一类型」的可点入口（打点 + 选中态），
     下面是客人原话和一句「AI 怎么处理」—— 两者不属于选择入口，保持纯展示 */
  function cardHtml(card, selectedKey) {
    var ui = HKR.core.ui;
    var selected = card.style === selectedKey;
    return ui.html`
      <section class="need-card need-card--${card.style} ${selected ? 'is-selected' : ''}">
        <button class="need-card__head" type="button" role="radio" aria-checked="${selected ? 'true' : 'false'}"
          data-need-key="${card.style}">
          <span class="need-card__icon" aria-hidden="true">${ui.raw(ICONS[card.icon] || '')}</span>
          <span class="need-card__text">
            <span class="need-card__name">${card.name}</span>
            <span class="need-card__hint">${card.hint}</span>
          </span>
          <span class="need-card__mark" aria-hidden="true">${ui.raw(selected ? CHECK : CHEVRON)}</span>
        </button>
        <ul class="need-card__examples">
          ${card.examples.map(function (example) {
            return ui.raw(ui.html`<li class="bubble">${example}</li>`);
          })}
        </ul>
        <p class="need-card__desc">${card.desc}</p>
      </section>
    `;
  }

  HKR.pages['need-types'] = {
    render: function (host, ctx) {
      var ui = ctx.ui;
      var cfg = ctx.config.needTypes;
      var state = ctx.state();
      var selectedKey = (state.needType || {}).need_type_choice || null;

      function paint() {
        ui.setHtml(
          host,
          ui.html`
            <section class="chapter-intro">
              <p class="chapter-intro__tag">第一章 · 认识产品价值</p>
              <h1 class="page-title">${cfg.title}</h1>
              <p class="page-subtitle">${cfg.subtitle}</p>
            </section>

            <div class="need-cards" role="radiogroup" aria-label="${cfg.title}">
              ${cfg.cards.map(function (card) {
                return ui.raw(cardHtml(card, selectedKey));
              })}
            </div>

            <section class="note-block">
              <span class="note-block__icon" aria-hidden="true">${ui.raw(INFO)}</span>
              <p class="note-block__text">${cfg.note}</p>
            </section>

            <div class="cta-row">
              <button class="btn btn--navy btn--lg" type="button" data-action="next">
                ${cfg.ctaLabel}
                <span class="btn__arrow">${ui.raw(ARROW)}</span>
              </button>
            </div>
          `
        );
      }

      paint();

      /* 设计稿写着「请点击选择你在日常处理的工作类型」：整张卡都是选择入口。
         选完只记一条本地记录（need_type_choice）+ 一个行为事件，
         不改变后面任何页面的内容，也不做身份判断。 */
      ui.delegate(host, '[data-need-key]', 'click', function (event, target) {
        var key = target.getAttribute('data-need-key');
        if (key === selectedKey) return;
        selectedKey = key;
        ctx.store.setNeedType(key);
        ctx.analytics.track('need_type_selected', { need_type_choice: key });
        paint();
      });

      ui.delegate(host, '[data-action="next"]', 'click', function () {
        ctx.go('scene-delivery');
      });
    }
  };
})();

