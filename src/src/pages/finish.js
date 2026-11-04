/* 页面 8：完成页 + 我的工单上手卡（可保存 / 可随时回来查看） */
window.HKR = window.HKR || {};
HKR.pages = HKR.pages || {};

(function () {
  var ui = HKR.core.ui;

  function cardHtml(cfg) {
    return ui.html`
      <section class="handoff-card" data-role="handoff-card">
        <header class="handoff-card__head">
          <p class="handoff-card__brand">华客 AI 智能客服 · 培训前预习</p>
          <h2 class="handoff-card__title">${cfg.title}</h2>
          <p class="handoff-card__subtitle">${cfg.subtitle}</p>
        </header>
        <ol class="handoff-card__list">
          ${cfg.items.map(function (item, index) {
            return ui.raw(
              ui.html`
                <li class="handoff-card__item">
                  <span class="handoff-card__num">${index + 1}</span>
                  <span class="handoff-card__text">${item.text}</span>
                </li>
              `
            );
          })}
        </ol>
        <p class="handoff-card__foot">${cfg.footerNote}</p>
      </section>
    `;
  }

  HKR.pages.finish = {
    render: function (host, ctx) {
      var cfg = ctx.config.handoffCard;
      var analytics = ctx.analytics;
      var state = ctx.state();

      ctx.store.completeSession();
      ctx.store.markHandoffCardViewed();
      analytics.track('session_complete', { duration_seconds: ctx.store.durationSeconds() });

      var payload = analytics.buildPayload();
      var painKey = payload.product_value_feedback.pain_point_choice;
      var painOption = painKey
        ? ctx.config.painPoint.options.filter(function (option) {
            return option.key === painKey;
          })[0]
        : null;
      var accountStatus = payload.official_account_task.official_account_status || '未提交（可稍后回到上一页补填）';
      var durationText = ui.formatDuration(payload.experience_record.duration_seconds);

      ui.setHtml(
        host,
        ui.html`
          <section class="hero hero--done">
            <p class="hero__kicker">预习完成</p>
            <h1 class="hero__title">预习完成，明天上手更轻松</h1>
            <p class="hero__subtitle">
              你已经了解 AI 能做什么，也看过需求怎么变成工单。正式培训会带你熟悉真实页面。
            </p>
            <p class="chip chip--ok">本次体验用时约 ${durationText}</p>
          </section>

          ${ui.raw(cardHtml(cfg))}

          <div class="cta-row">
            <button class="btn btn--soft btn--lg" type="button" data-action="print-card">保存 / 打印这张卡</button>
            <p class="cta-row__note">${cfg.printHint}</p>
          </div>

          <section class="card card--plain">
            <p class="card__title">你这次的选择（只保存在本机）</p>
            <ul class="plain-list">
              <li>最想改善的工作：${painOption ? painOption.key + ' · ' + painOption.label : '未选择'}</li>
              <li>工单消息准备状态：${accountStatus}（自我确认）</li>
              <li>完成状态：${payload.experience_record.completion_status === 'completed' ? '已完成' : '进行中'}</li>
            </ul>
          </section>

          ${ctx.config.app.features.showLocalRecordsPanel
            ? ui.raw(ui.html`
                <details class="details">
                  <summary class="details__summary">关于数据：本次记录存在哪里？点开查看</summary>
                  <div class="details__body">
                    <p>${analytics.localOnlyNote}</p>
                    <p>刷新不丢；清理浏览器数据或换设备会丢失。第一版没有后端，数据不会上传。</p>
                    <div class="records-actions">
                      <button class="btn btn--ghost" type="button" data-action="toggle-records">查看本次本地记录（演示用）</button>
                    </div>
                    <pre class="records" data-role="records" hidden></pre>
                  </div>
                </details>
              `)
            : ''}

          <div class="cta-row">
            <button class="btn btn--ghost btn--lg" type="button" data-action="review">重新看前面的内容</button>
            <button class="linkbtn linkbtn--center" type="button" data-action="restart">清空本地记录，重新开始</button>
          </div>
        `
      );

      ui.delegate(host, '[data-action="print-card"]', 'click', function () {
        analytics.track('handoff_card_print');
        document.body.classList.add('is-printing');
        ui.toast('可在打印页面选择「保存为 PDF」。');
        setTimeout(function () {
          window.print();
        }, 180);
      });

      window.addEventListener('afterprint', function () {
        document.body.classList.remove('is-printing');
      });

      ui.delegate(host, '[data-action="toggle-records"]', 'click', function (event, target) {
        var pre = ui.$('[data-role="records"]', host);
        if (!pre) return;
        if (pre.hidden) {
          pre.textContent = analytics.exportJson();
          pre.hidden = false;
          target.textContent = '收起本地记录';
        } else {
          pre.hidden = true;
          target.textContent = '查看本次本地记录（演示用）';
        }
      });

      ui.delegate(host, '[data-action="review"]', 'click', function () {
        ctx.go('welcome');
      });

      ui.delegate(host, '[data-action="restart"]', 'click', function (event, target) {
        if (target.getAttribute('data-confirm') !== 'yes') {
          target.setAttribute('data-confirm', 'yes');
          target.textContent = '再点一次确认：清空本机记录并重新开始';
          ui.toast('这一步会清空本机上的体验记录（演示用）');
          return;
        }
        window.setTimeout(function () {
          document.body.classList.remove('is-printing');
        }, 0);
        ctx.analytics.track('session_restart');
        ctx.restart();
      });
    }
  };
})();
