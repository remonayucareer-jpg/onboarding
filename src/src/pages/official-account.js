/* 页面 7：第三章 · 打通工单消息通道（公众号准备任务）
 * 规则：结果只记录为「自我确认」，第一版没有关注/绑定校验接口，绝不声称系统已验证。
 */
window.HKR = window.HKR || {};
HKR.pages = HKR.pages || {};

(function () {
  var ui = HKR.core.ui;

  function optionHtml(option, selectedKey) {
    var selected = option.key === selectedKey;
    return ui.html`
      <button class="option option--rich ${selected ? 'is-selected' : ''}" type="button" role="radio"
        aria-checked="${selected ? 'true' : 'false'}" data-account-key="${option.key}">
        <span class="option__key">${option.key}</span>
        <span class="option__content">
          <span class="option__label">${option.label}</span>
          <span class="option__desc">${option.desc}</span>
        </span>
        <span class="option__mark" aria-hidden="true">${selected ? '✓' : ''}</span>
      </button>
    `;
  }

  HKR.pages['official-account'] = {
    render: function (host, ctx) {
      var cfg = ctx.config;
      var app = cfg.app;
      var account = app.officialAccount;
      var accounts = app.officialAccounts || [account];
      var options = cfg.officialAccountOptions;
      var stored = ctx.state().officialAccount;
      var selectedKey = stored.selected_key;
      var submitted = !!stored.submitted_at;

      function optionByKey(key) {
        return options.filter(function (item) {
          return item.key === key;
        })[0];
      }

      function paint() {
        var selection = selectedKey ? optionByKey(selectedKey) : null;
        ui.setHtml(
          host,
          ui.html`
            <section class="chapter-intro">
              <p class="chapter-intro__tag">第三章 · 公众号准备任务</p>
              <h1 class="page-title">最后一步：让工单消息找到你</h1>
              <p class="page-subtitle">请扫码关注下面两个公众号，并按要求完成必要设置。</p>
            </section>

            <section class="account-cards">
              ${accounts.map(function (account) {
                return ui.raw(ui.html`
                  <section class="account-card">
                    <div class="account-card__qr ${account.qrIsPlaceholder ? 'is-placeholder' : ''}">
                      <img class="account-card__img" src="${account.qrImage}"
                        alt="${account.alt || '公众号「' + account.name + '」二维码'}" />
                      ${account.qrIsPlaceholder
                        ? ui.raw(ui.html`<span class="account-card__qr-badge">占位素材 · 非真实二维码</span>`)
                        : ''}
                    </div>
                    <div class="account-card__info">
                      <p class="account-card__label">${account.label || '公司官方微信公众号'}</p>
                      <p class="account-card__name">${account.name}</p>
                      <p class="account-card__desc">${account.desc || '请扫码关注。'}</p>
                      ${account.setupSteps && account.setupSteps.length
                        ? ui.raw(ui.html`
                            <ol class="plain-list plain-list--ordered">
                              ${account.setupSteps.map(function (step) {
                                return ui.raw(ui.html`<li>${step}</li>`);
                              })}
                            </ol>
                          `)
                        : ''}
                    </div>
                  </section>
                `);
              })}
            </section>

            <details class="details">
              <summary class="details__summary">扫不出来 / 不确定怎么设置？点这里看兜底办法</summary>
              <div class="details__body">
                ${accounts.map(function (account) {
                  return ui.raw(ui.html`
                    <p><strong>${account.name}：</strong>${account.searchHint}</p>
                    <p>${account.helpHint}</p>
                  `);
                })}
              </div>
            </details>

            <section class="card card--plain">
              <p class="card__title">你现在的状态是？</p>
              <div class="options options--rich" role="radiogroup" aria-label="公众号准备状态">
                ${options.map(function (option) {
                  return ui.raw(optionHtml(option, selectedKey));
                })}
              </div>
              <p class="badge badge--warn">当前版本无法自动核验：结果只代表「自我确认」，不是系统核验结果</p>
            </section>

            <div class="account-result" data-role="result">
              ${submitted && selection
                ? ui.raw(ui.html`
                    <section class="card ${selection.key === 'A' ? 'card--ok' : selection.key === 'B' ? 'card--warn' : 'card--note'}"
                      role="status" aria-live="polite">
                      <p class="card__title">已记录：${selection.record.official_account_status}（自我确认）</p>
                      <p class="card__desc">${selection.response}</p>
                      <details class="details">
                        <summary class="details__summary">这条记录写了什么？点开查看</summary>
                        <div class="details__body">
                          <ul class="plain-list">
                            <li>verification_method：${selection.record.verification_method}</li>
                            <li>verified：false（没有校验接口，因此不标记为系统已验证）</li>
                            <li>help_requested：${selection.record.help_requested ? 'true（需要协助）' : 'false'}</li>
                          </ul>
                        </div>
                      </details>
                    </section>
                  `)
                : ''}
            </div>

            <section class="callout callout--soft">
              <p class="callout__title">完不成也没关系</p>
              <p>这一步不拦你完成预习：选 C 会被记录下来，培训人员会来帮你处理。</p>
            </section>

            <div class="cta-row">
              <button class="btn btn--lg ${selectedKey ? '' : 'is-disabled'}" type="button" data-action="submit"
                ${selectedKey ? '' : 'disabled aria-disabled="true"'}>
                ${submitted ? '更新我的状态' : '提交我的状态'}
              </button>
              ${submitted
                ? ui.raw(ui.html`<button class="btn btn--soft btn--lg" type="button" data-action="next">继续：看我的上手卡</button>`)
                : ui.raw(ui.html`<button class="linkbtn linkbtn--center" type="button" data-action="next">先跳过，直接去完成页</button>`)}
            </div>
          `
        );
      }

      paint();

      ui.delegate(host, '[data-account-key]', 'click', function (event, target) {
        selectedKey = target.getAttribute('data-account-key');
        paint();
      });

      ui.delegate(host, '[data-action="submit"]', 'click', function () {
        if (!selectedKey) {
          ui.toast('先选一个最接近你情况的状态');
          return;
        }
        var selection = optionByKey(selectedKey);
        var wasSubmitted = submitted;
        ctx.store.saveOfficialAccount(selection);
        ctx.analytics.track('official_account_submitted', {
          official_account_status: selection.record.official_account_status,
          help_requested: selection.record.help_requested
        });
        submitted = true;
        paint();
        ui.toast(wasSubmitted ? '已更新你的状态' : '已记录为自我确认（不是系统核验）', {
          variant: selection.key === 'A' ? 'ok' : 'note'
        });
      });

      ui.delegate(host, '[data-action="next"]', 'click', function () {
        if (!submitted) ctx.analytics.track('official_account_skipped');
        ctx.go('finish');
      });
    }
  };
})();
