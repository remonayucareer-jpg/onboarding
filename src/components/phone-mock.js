/* 手机端工单界面组件
 * - 未提供真实截图时，用明确标注的「模拟界面」还原真实产品的字段结构、按钮位置与状态
 * - 配置里给了截图路径且图片存在时，自动替换为真实截图（不再显示模拟标记）
 */
window.HKR = window.HKR || {};
HKR.components = HKR.components || {};

(function () {
  var ui = HKR.core.ui;

  function fieldRow(label, value, note) {
    return ui.html`
      <div class="ticket__row">
        <dt>${label}</dt>
        <dd>${value}${note ? ui.raw('<span class="ticket__note">' + ui.escapeHtml(note) + '</span>') : ''}</dd>
      </div>
    `;
  }

  function statusPill(ticket, claimed) {
    var label = claimed ? ticket.statusClaimed : ticket.statusPending;
    return ui.html`
      <span class="ticket__status ${claimed ? 'ticket__status--claimed' : 'ticket__status--pending'}">${label}</span>
    `;
  }

  function ticketBody(ticket, claimed) {
    return ui.html`
      <div class="ticket">
        <div class="ticket__head">
          <span class="ticket__cat">${ticket.category}</span>
          ${ui.raw(statusPill(ticket, claimed))}
        </div>
        <p class="ticket__demand">${ticket.demand}</p>
        <dl class="ticket__fields">
          ${ui.raw(fieldRow('工单编号', ticket.ticketNo))}
          ${ui.raw(fieldRow('房间号', ticket.room, ticket.roomNote))}
          ${ui.raw(fieldRow('需求来源', ticket.source))}
          ${ui.raw(fieldRow('生成时间', ticket.createdAt))}
          ${ui.raw(fieldRow('处理人', claimed ? ticket.assigneeClaimed : ticket.assigneePending))}
        </dl>
        <p class="ticket__footnote">${ticket.footerNote}</p>
      </div>
    `;
  }

  function notifyBody(scene, ticket) {
    return ui.html`
      <div class="msg">
        <div class="msg__top">
          <span class="msg__app">${scene.phone.notifyApp}</span>
          <span class="msg__time">${scene.phone.notifyTime}</span>
        </div>
        <p class="msg__title">${scene.phone.notifyTitle}</p>
        <p class="msg__line">${ticket.category} · ${ticket.room} 房</p>
        <p class="msg__line msg__line--strong">${ticket.demand}</p>
        <span class="msg__badge">${ticket.statusPending}</span>
        <button class="btn btn--block msg__btn" type="button" data-action="phone-open-detail">${scene.phone.agreeLabel}</button>
      </div>
      <p class="phone__tip">工单消息会推送给相关员工。</p>
    `;
  }

  function claimedBanner(scene) {
    return ui.html`
      <div class="claim-banner">
        <span class="claim-banner__icon" aria-hidden="true">✓</span>
        <p class="claim-banner__title">${scene.phone.afterClaimTitle}</p>
        <p class="claim-banner__desc">${scene.phone.afterClaimDesc}</p>
      </div>
    `;
  }

  function actionBar(scene, view, claimed, readOnly) {
    if (readOnly) {
      return ui.html`<div class="phone__actionbar phone__actionbar--ghost"><span>本场景只看不领 · 先认识工单</span></div>`;
    }
    if (view === 'notify') {
      return ui.html`<div class="phone__actionbar phone__actionbar--ghost"><span>等待你打开工单</span></div>`;
    }
    if (!claimed) {
      return ui.html`
        <div class="phone__actionbar">
          <button class="btn btn--block" type="button" data-action="phone-claim">${scene.phone.claimLabel}</button>
        </div>
      `;
    }
    var actions = scene.phone.laterActions || [];
    return ui.html`
      <div class="phone__actionbar phone__actionbar--split">
        ${actions.map(function (action, index) {
          return ui.raw(
            ui.html`<button class="btn ${index === 0 ? 'btn--ghost' : 'btn--ok'} btn--block" type="button" data-action="phone-later" data-later="${action.label}">${action.label}</button>`
          );
        })}
      </div>
    `;
  }

  /* ---------- 真实产品界面复刻版（第二章第五幕：在界面上真实点击「领取」） ----------
   * 布局对照 assets/images/phone-wo-detail-real.png：蓝色标题条 + 标签页 + 标题 + 状态徽标 +
   * 需求行 + 基本信息字段 + 底部操作栏。字段取值全部来自 scenes.config.js，不新增任何字段。
   */
  function realBody(scene, claimed) {
    var ticket = scene.ticket;
    return ui.html`
      <div class="wo">
        <p class="wo__title">${ticket.title}</p>
        <p class="wo__meta">${ticket.meta}</p>
        <span class="wo__badge ${claimed ? 'wo__badge--doing' : 'wo__badge--pending'}">
          ${claimed ? ticket.statusClaimed : ticket.statusPending}
        </span>
        <p class="wo__demand">${ticket.demand}</p>
        <p class="wo__section">基本信息</p>
        <dl class="ticket__fields ticket__fields--real">
          ${ui.raw(fieldRow('酒店', ticket.hotel))}
          ${ui.raw(fieldRow('房间号', ticket.room))}
          ${ui.raw(fieldRow('服务分类', ticket.category))}
          ${ui.raw(fieldRow('服务项', ticket.item))}
          ${ui.raw(fieldRow('工单模板', ticket.template))}
          ${ui.raw(fieldRow('当前处理人', claimed ? ticket.assigneeClaimed : ticket.assigneePending))}
        </dl>
        ${claimed ? ui.raw(claimedBanner(scene)) : ''}
      </div>
    `;
  }

  function realActionBar(scene, claimed) {
    if (!claimed) {
      return ui.html`
        <div class="phone__actionbar phone__actionbar--real">
          <button class="btn btn--block btn--real" type="button" data-action="phone-claim">${scene.phone.claimLabel}</button>
        </div>
      `;
    }
    var actions = scene.phone.laterActions || [];
    return ui.html`
      <div class="phone__actionbar phone__actionbar--split">
        ${actions.map(function (action, index) {
          return ui.raw(
            ui.html`<button class="btn ${index === 0 ? 'btn--ghost' : 'btn--real'} btn--block" type="button" data-action="phone-later" data-later="${action.label}">${action.label}</button>`
          );
        })}
      </div>
    `;
  }

  /* 真实产品界面布局的整机渲染 */
  function realPhone(scene, claimed) {
    var tabs = scene.phone.tabs || [];
    return ui.html`
      <div class="phone phone--real">
        <div class="phone__frame phone__frame--real">
          <div class="phone__appbar">
            <span class="phone__appbar-back" aria-hidden="true">‹</span>
            <span class="phone__appbar-title">${scene.phone.appTitlePrefix}${scene.ticket.ticketNo}</span>
            <span class="phone__appbar-more" aria-hidden="true">⋯</span>
          </div>
          <div class="phone__tabs">
            ${tabs.map(function (tab, index) {
              return ui.raw(ui.html`<span class="phone__tab ${index === 0 ? 'is-active' : ''}">${tab}</span>`);
            })}
          </div>
          <div class="phone__body phone__body--real" data-role="real-body">
            ${ui.raw(realBody(scene, claimed))}
          </div>
          ${ui.raw(realActionBar(scene, claimed))}
        </div>
        <p class="phone__caption">按真实产品界面复刻 · 演示数据</p>
      </div>
    `;
  }

  function markLabel(isReal) {
    return ui.html`
      <p class="phone__caption">
        ${isReal ? '真实产品截图（已就位）' : '模拟界面 · 演示数据（非真实截图）'}
      </p>
    `;
  }

  /* options: { sceneKey, view: 'notify' | 'detail' | 'real', claimed: boolean, screenshotPath } */
  function render(host, options) {
    var scene = HKR.config.scenes[options.sceneKey];
    var claimed = options.claimed === true;
    var screenshotPath = options.screenshotPath || null;

    /* 真实产品界面布局：第五幕在界面上真实点击「领取」，不做截图替换 */
    if (options.view === 'real') {
      ui.setHtml(host, realPhone(scene, claimed));
      return;
    }

    ui.setHtml(
      host,
      ui.html`
        <div class="phone" data-shot-slot>
          <div class="phone__frame">
            <div class="phone__statusbar">
              <span>${scene.phone.notifyTime}</span>
              <span class="phone__statusicons" aria-hidden="true">····</span>
            </div>
            <div class="phone__header">
              <span class="phone__back" aria-hidden="true">‹</span>
              <span class="phone__title">${scene.phone.screenTitle}</span>
              <span class="phone__more" aria-hidden="true">⋯</span>
            </div>
            <div class="phone__body">
              ${options.view === 'notify'
                ? ui.raw(notifyBody(scene, scene.ticket))
                : ui.raw((claimed ? claimedBanner(scene) : '') + ticketBody(scene.ticket, claimed) + (options.readOnlyNote ? ui.html`<p class="phone__tip">${options.readOnlyNote}</p>` : ''))}
            </div>
            ${ui.raw(actionBar(scene, options.view, claimed, options.readOnly === true))}
          </div>
          ${ui.raw(markLabel(false))}
        </div>
      `
    );

    /* 真实截图自动替换：文件存在就换成真图，不存在保持模拟界面 */
    var slot = ui.$('[data-shot-slot]', host);
    if (screenshotPath && slot) {
      var probe = new Image();
      probe.onload = function () {
        if (!slot.parentNode) return;
        ui.setHtml(
          slot,
          ui.html`
            <img class="phone__shot" src="${screenshotPath}" alt="华客手机端工单界面截图（真实产品）" />
            ${ui.raw(markLabel(true))}
          `
        );
      };
      probe.onerror = function () {
        /* 静默回退到模拟界面 */
      };
      probe.src = screenshotPath;
    }
  }

  HKR.components.phoneMock = { render: render, ticketBody: ticketBody };
})();
