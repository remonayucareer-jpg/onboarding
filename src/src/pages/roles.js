/* 角色入口：一个手机屏只做一个决定，按工作身份进入独立学习路线。 */
window.HKR = window.HKR || {};
HKR.pages = HKR.pages || {};

(function () {
  var ICONS = {
    admin:
      '<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">' +
      '<rect x="5" y="6" width="8" height="7" rx="2" />' +
      '<rect x="19" y="6" width="8" height="7" rx="2" />' +
      '<rect x="5" y="19" width="8" height="7" rx="2" />' +
      '<rect x="19" y="19" width="8" height="7" rx="2" />' +
      '<path d="M13 9.5h6M13 22.5h6M9 13v6M23 13v6" />' +
      '</svg>',
    frontline:
      '<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">' +
      '<rect x="9" y="4.5" width="14" height="23" rx="3.2" />' +
      '<path d="M13.5 8h5" />' +
      '<path d="M16 20.2v-5.4M13.4 17.4 16 14.8l2.6 2.6" />' +
      '</svg>'
  };

  var ARROW =
    '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M4 10h11.2" /><path d="m11.2 5.8 4.2 4.2-4.2 4.2" /></svg>';

  function roleCardHtml(card) {
    var ui = HKR.core.ui;
    var disabled = card.disabled === true;
    return ui.html`
      <button class="role-card role-card--${card.key}${disabled ? ' is-disabled' : ''}" type="button"
        data-role-choice="${card.key}" ${ui.raw(disabled ? 'aria-disabled="true" data-role-disabled="1"' : '')}
        aria-label="${card.cta}">
        <span class="role-card__icon" aria-hidden="true">${ui.raw(ICONS[card.key] || '')}</span>
        <span class="role-card__body">
          <span class="role-card__eyebrow">${card.eyebrow}</span>
          <span class="role-card__title">${card.title}${ui.raw(
            disabled ? '<span class="role-card__badge">' + ui.escapeHtml(card.disabledBadge || '暂未开放') + '</span>' : ''
          )}</span>
          <span class="role-card__desc">${card.desc}</span>
          <span class="role-card__detail">${card.detail}</span>
        </span>
        <span class="role-card__arrow" aria-hidden="true">${ui.raw(ARROW)}</span>
      </button>
    `;
  }

  HKR.pages.roles = {
    render: function (host, ctx) {
      var ui = ctx.ui;
      var cfg = ctx.config.roleSelection;

      ui.setHtml(
        host,
        ui.html`
          <section class="role-selection">
            <header class="role-selection__head">
              <p class="role-selection__kicker">${cfg.kicker}</p>
              <h1 class="role-selection__title">${ui.raw(cfg.titleLines.map(ui.escapeHtml).join('<br />'))}</h1>
              <p class="role-selection__subtitle">${cfg.subtitle}</p>
            </header>

            <div class="role-selection__options" aria-label="选择查看身份">
              ${cfg.cards.map(function (card) {
                return ui.raw(roleCardHtml(card));
              })}
            </div>

            <p class="role-selection__helper">${cfg.helper}</p>
          </section>
        `
      );

      ui.delegate(host, '[data-role-choice]', 'click', function (event, target) {
        var role = target.getAttribute('data-role-choice');

        /* 按住的身份：只提示，不进去 */
        if (target.getAttribute('data-role-disabled') === '1') {
          ui.toast('管理员版还在准备中，先看一线员工的。', { variant: 'info', duration: 2600 });
          return;
        }

        ctx.store.setRole(role);
        ctx.analytics.track('role_selected', { role: role });
        /* 一线员工：先进登记页填酒店 + 姓名，再进准备页 */
        ctx.go(role === 'frontline' ? 'frontline-identity' : 'welcome');
      });
    }
  };
})();
