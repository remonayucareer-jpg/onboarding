/* 一线员工课件里的「手机端工单界面」（实际操作的那几屏）
 * ---------------------------------------------------------------
 * 四种画面，全部由 src/config/frontline.config.js 的 stage 决定：
 *   notify  屏 3：公众号推来一条工单消息，点开进详情
 *   detail  屏 4：工单详情，房间号 / 服务分类 / 服务项可点开，三个都看完才能领取
 *   claim   屏 5：点「领取」→ 状态变处理中，再往下走
 *   solve   屏 9：点「解决」→ 进操作成功页
 *   solved  屏 11：只读的「已解决」状态
 *
 * 版式复用 css/phone.css 与 game.css 里「按真实产品截图复刻」的那套样式
 * （.phone__appbar / .wo__* / .ticket__fields--real / .btn--real），
 * 不另外造一套手机界面 —— 管理员版第五幕与这一版看到的是同一个产品。
 */
window.HKR = window.HKR || {};
HKR.components = HKR.components || {};

(function () {
  var ui = HKR.core.ui;

  function ticket() {
    return HKR.config.frontline.ticket;
  }

  function taskState(ctx) {
    return ctx.store.getState().frontline || {};
  }

  function seesAll(ctx, screen) {
    if (!screen.fields || !screen.fields.length) return true;
    var seen = taskState(ctx).fields_seen || [];
    return screen.fields.every(function (field) {
      return seen.indexOf(field.key) !== -1;
    });
  }

  function badge(status) {
    var cls = 'wo__badge--doing';
    if (status === ticket().statusSolved) cls = 'wo__badge--solved';
    if (status === ticket().statusPending) cls = 'wo__badge--pending';
    return ui.html`<span class="wo__badge ${ui.raw(cls)}">${status}</span>`;
  }

  function row(label, value) {
    return ui.html`<div class="ticket__row"><dt>${label}</dt><dd>${value}</dd></div>`;
  }

  function claimBanner(after) {
    return ui.html`
      <div class="claim-banner">
        <span class="claim-banner__icon" aria-hidden="true">✓</span>
        <p class="claim-banner__title">${after.title}</p>
        <p class="claim-banner__desc">${after.desc}</p>
      </div>
    `;
  }

  /* 设备框 + 蓝色标题栏 + 标签页 + 内容区 + 底部操作栏 */
  function frame(bodyHtml, actionBarHtml) {
    return ui.html`
      <div class="phone phone--real fl-phone">
        <div class="phone__frame phone__frame--real">
          <div class="phone__appbar">
            <span class="phone__appbar-back" aria-hidden="true">‹</span>
            <span class="phone__appbar-title">工单详情</span>
            <span class="phone__appbar-more" aria-hidden="true">⋯</span>
          </div>
          <div class="phone__tabs">
            <span class="phone__tab is-active">工单详情</span>
            <span class="phone__tab">通话记录</span>
          </div>
          <div class="phone__body phone__body--real" data-role="fl-body">${ui.raw(bodyHtml)}</div>
          ${ui.raw(actionBarHtml)}
        </div>
        <p class="phone__caption">按真实产品界面复刻 · 演示数据</p>
      </div>
    `;
  }

  function detailBody(ctx, screen, opts) {
    var t = ticket();
    var st = taskState(ctx);
    var status = opts.solved ? t.statusSolved : opts.claimed ? t.statusClaimed : t.statusPending;
    var rows;

    if (screen.fields && screen.fields.length && !opts.claimed && !opts.solved) {
      /* 可点的三个字段：点开一个给一句解释，右侧小圆点先给序号、看过变勾 */
      rows = screen.fields
        .map(function (field, index) {
          var seen = (st.fields_seen || []).indexOf(field.key) !== -1;
          return ui.html`
            <div class="ticket__row fl-field${ui.raw(seen ? ' is-seen' : '')}" data-fl-field="${field.key}"
              role="button" tabindex="0" aria-label="查看${field.label}">
              <dt>${field.label}<span class="fl-field__chip" aria-hidden="true">${seen ? '✓' : String(index + 1)}</span></dt>
              <dd>${t[field.key]}${seen
                ? ui.raw('<span class="fl-field__hint">' + ui.escapeHtml(field.hint) + '</span>')
                : ''}</dd>
            </div>
          `;
        })
        .join('');
    } else {
      /* 只留这一课要看的四项：手机上每多一行，下面那句说明和「继续」就被顶出屏幕 */
      rows = [
        row('房间号', t.room),
        row('服务分类', t.category),
        row('服务项', t.item),
        row('当前处理人', opts.claimed || opts.solved ? t.assigneeClaimed : t.assigneePending)
      ].join('');
    }

    return ui.html`
      <div class="wo">
        <p class="wo__title">${t.title}</p>
        <p class="wo__meta">${t.meta}</p>
        ${ui.raw(badge(status))}
        <p class="wo__section">基本信息</p>
        <dl class="ticket__fields ticket__fields--real">${ui.raw(rows)}</dl>
        ${opts.showBanner && screen.afterClaim ? ui.raw(claimBanner(screen.afterClaim)) : ''}
      </div>
    `;
  }

  function actionBar(ctx, screen, claimed, solved) {
    /* 已解决的工单在真实产品里没有操作栏：这一屏不再画「这张工单已解决」——
       标题、徽标、说明已经说了三遍，同一屏不重复第四遍 */
    if (solved || screen.stage === 'solved') return '';

    if (screen.stage === 'detail') {
      var ready = seesAll(ctx, screen);
      return ui.html`
        <div class="phone__actionbar phone__actionbar--real">
          <button class="btn btn--block btn--real" type="button" data-action="fl-claim"
            ${ui.raw(ready ? '' : 'disabled aria-disabled="true"')}>领取</button>
          <p class="fl-gate-hint">${ready ? '三个信息都看完了，点「领取」接着走。' : screen.lockedHint}</p>
        </div>
      `;
    }

    if (screen.stage === 'claim') {
      if (!claimed) {
        return ui.html`
          <div class="phone__actionbar phone__actionbar--real">
            <button class="btn btn--block btn--real" type="button" data-action="fl-claim">${screen.claimLabel}</button>
          </div>
        `;
      }
      return ui.html`
        <div class="phone__actionbar phone__actionbar--real">
          <button class="btn btn--block btn--real" type="button" data-action="fl-continue">${screen.afterClaim.cta}</button>
        </div>
      `;
    }

    if (screen.stage === 'solve') {
      return ui.html`
        <div class="phone__actionbar phone__actionbar--real">
          <button class="btn btn--block btn--real" type="button" data-action="fl-solve">${screen.solveLabel}</button>
          <p class="fl-gate-hint">${screen.solveHint}</p>
        </div>
      `;
    }

    return '';
  }

  /* 屏 3：手机上收到的公众号工单消息 */
  function notifyMarkup(screen) {
    var t = ticket();
    return ui.html`
      <div class="phone fl-phone">
        <div class="phone__frame">
          <div class="phone__statusbar">
            <span>${t.notifyTime}</span>
            <span class="phone__statusicons" aria-hidden="true">····</span>
          </div>
          <div class="phone__header">
            <span class="phone__back" aria-hidden="true">‹</span>
            <span class="phone__title">工单提醒</span>
            <span class="phone__more" aria-hidden="true">⋯</span>
          </div>
          <div class="phone__body">
            <div class="msg">
              <div class="msg__top">
                <span class="msg__app">${t.notifyApp}</span>
                <span class="msg__time">${t.notifyTime}</span>
              </div>
              <p class="msg__title">${t.notifyTitle}</p>
              <p class="msg__line">${t.notifyLine}</p>
              <p class="msg__line msg__line--strong">${t.notifyDemand}</p>
              <span class="msg__badge">${t.statusPending}</span>
              <button class="btn btn--block btn--real msg__btn" type="button" data-action="fl-open">${screen.ctaLabel}</button>
            </div>
            <p class="phone__tip">点开这条消息，就进到工单里。</p>
          </div>
          <div class="phone__actionbar phone__actionbar--ghost"><span>等待你打开工单</span></div>
        </div>
        <p class="phone__caption">按真实产品界面复刻 · 演示数据</p>
      </div>
    `;
  }

  function markup(ctx, screen) {
    if (screen.stage === 'notify') return notifyMarkup(screen);

    var st = taskState(ctx);
    /* 屏 9 / 屏 11 的「处理中」「已解决」是这一屏本身的语义：
       直接刷新到这一屏（或从地址栏进来）也要显示对的状态，不能退回「待处理」 */
    var solved = !!st.solved || screen.stage === 'solved';
    var claimed = !!st.claimed || solved || screen.stage === 'solve';
    return frame(
      detailBody(ctx, screen, {
        claimed: claimed,
        solved: solved,
        showBanner: claimed && screen.stage === 'claim'
      }),
      actionBar(ctx, screen, claimed, solved)
    );
  }

  /* 事件只绑一次（绑在 host 上），重绘只换 innerHTML，所以委托不会重复挂 */
  function bind(host, ctx, screen, repaint) {
    function tapField(target) {
      var key = target.getAttribute('data-fl-field');
      if (!key) return;
      var before = seesAll(ctx, screen);
      ctx.store.seeFrontlineField(key);
      ctx.analytics.track('frontline_field_seen', { page_id: screen.id, field: key });
      repaint();
      if (!before && seesAll(ctx, screen)) {
        ui.toast('三个信息都看完了，可以领取了。', { variant: 'ok', duration: 2400 });
      }
    }

    ui.delegate(host, '[data-fl-field]', 'click', function (event, target) {
      tapField(target);
    });

    ui.delegate(host, '[data-fl-field]', 'keydown', function (event, target) {
      if (event.key === 'Enter' || event.key === ' ' || event.keyCode === 13 || event.keyCode === 32) {
        event.preventDefault();
        tapField(target);
      }
    });

    /* 屏 3：点开工单 */
    ui.delegate(host, '[data-action="fl-open"]', 'click', function () {
      ctx.store.openFrontlineTicket();
      ctx.analytics.track('frontline_ticket_opened', { page_id: screen.id });
      ctx.go(screen.nextPageId);
    });

    /* 屏 4 / 屏 5 的「领取」 */
    ui.delegate(host, '[data-action="fl-claim"]', 'click', function () {
      if (screen.stage === 'detail') {
        if (!seesAll(ctx, screen)) {
          ui.toast(screen.lockedHint, { variant: 'note', duration: 2400 });
          return;
        }
        ctx.analytics.track('frontline_claim_intent', { page_id: screen.id });
        ctx.go(screen.nextPageId);
        return;
      }
      ctx.store.claimFrontlineTicket();
      ctx.analytics.track('frontline_ticket_claimed', { page_id: screen.id });
      repaint();
      ui.toast('领取成功，这张工单归你处理。', { variant: 'ok', duration: 2400 });
    });

    /* 屏 9：点「解决」 */
    ui.delegate(host, '[data-action="fl-solve"]', 'click', function () {
      ctx.store.solveFrontlineTicket();
      ctx.analytics.track('frontline_ticket_solved', { page_id: screen.id });
      ctx.go(screen.nextPageId);
    });

    /* 屏 5 领取后的「继续」 */
    ui.delegate(host, '[data-action="fl-continue"]', 'click', function () {
      ctx.analytics.track('frontline_scene_next', { page_id: screen.id });
      ctx.go(screen.nextPageId);
    });
  }

  HKR.components.frontlinePhone = {
    render: function (host, ctx, screen) {
      var repaint = function () {
        ui.setHtml(host, markup(ctx, screen));
      };
      repaint();
      bind(host, ctx, screen, repaint);
    }
  };
})();
