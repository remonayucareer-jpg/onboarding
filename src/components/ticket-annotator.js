/* 真实工单截图 + 红框标注组件（第四幕教学的核心）
 * - 用真实产品截图（assets/images/phone-wo-detail-real.png），红框坐标按截图实际布局配置（百分比）
 * - 每次只渲染「当前这一步」的红框：红框靠动画出现／切换，不是把三个红框静态摆上去
 * - 截图缺失时明确提示缺素材，并回退到与真实产品一致的字段清单，不假装已经 1:1 还原
 */
window.HKR = window.HKR || {};
HKR.components = HKR.components || {};

(function () {
  var ui = HKR.core.ui;

  /* 手机状态栏（设计稿页面 5 给真机截图补的一条）：9:41 + 信号 / Wi-Fi / 电池。
     三段图标全部内联 SVG，不引外部素材、不额外发请求；颜色跟着 CSS 的 currentColor 走。 */
  var STATUS_ICONS =
    '<svg class="shot__status-icons" viewBox="0 0 62 10" aria-hidden="true" focusable="false">' +
    '<rect x="0" y="6" width="2.6" height="4" rx="0.9" />' +
    '<rect x="3.8" y="4.4" width="2.6" height="5.6" rx="0.9" />' +
    '<rect x="7.6" y="2.8" width="2.6" height="7.2" rx="0.9" />' +
    '<rect x="11.4" y="1.2" width="2.6" height="8.8" rx="0.9" />' +
    '<path d="M18.4 4.5c3.3-2.6 8-2.6 11.2 0" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />' +
    '<path d="M21.2 7.3c1.8-1.4 4.6-1.4 6.4 0" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />' +
    '<circle cx="24.4" cy="9.4" r="1.1" />' +
    '<rect x="35" y="1.4" width="23" height="7.2" rx="2.2" fill="none" stroke="currentColor" stroke-width="1.1" />' +
    '<rect x="37" y="3.4" width="15" height="3.2" rx="1.2" />' +
    '<path d="M59.4 4.1v1.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />' +
    '</svg>';

  /* 默认宽高比（截图裁切后的原始比例 664 × 924），用于撑开容器避免加载时跳动 */
  var DEFAULT_RATIO = 924 / 664;

  var missingShot = {};

  function boxMarkup(step, index, total) {
    var box = step.box || {};
    var tagRight = step.tagSide === 'right';
    return ui.html`
      <div class="shot__box is-active ${tagRight ? 'shot__box--tag-right' : ''}" data-step-key="${step.key}"
        style="left:${box.left}%;top:${box.top}%;width:${box.width}%;height:${box.height}%">
        <span class="shot__tag">${step.field}</span>
        <span class="shot__step">${index + 1}/${total}</span>
      </div>
    `;
  }

  function fallbackMarkup(options) {
    var rows = options.fallbackRows || [];
    var activeField = options.step ? options.step.field : null;
    return ui.html`
      <div class="shot shot--missing" data-role="shot-fallback">
        <section class="card card--warn">
          <p class="card__title">缺少真实工单截图</p>
          <p class="card__desc">
            没有找到 ${options.screenshotPath}。请把真实产品截图放到该路径；在此之前，这里用与真实产品一致的字段清单代替，
            不把它当作真实界面截图。
          </p>
        </section>
        <dl class="ticket__fields shot__fallback-fields">
          ${rows.map(function (row) {
            var hit = activeField && row.label === activeField;
            return ui.raw(
              ui.html`
                <div class="ticket__row ${hit ? 'is-annotated' : ''}" data-field="${row.label}">
                  <dt>${row.label}</dt>
                  <dd>${row.value}</dd>
                </div>
              `
            );
          })}
        </dl>
      </div>
    `;
  }

  /* 设备框（设计稿页面 5）：白卡 + 手机状态栏 + 截图 + 底部 home 条。
     截图素材本身只有 App 界面（没有状态栏、没有 home 条），这两条是设计稿给「这是一台手机」补的。 */
  function deviceMarkup(options, inner) {
    return ui.html`
      <div class="shot__device">
        <div class="shot__status" aria-hidden="true">
          <span class="shot__status-time">${options.statusTime || '9:41'}</span>
          ${ui.raw(STATUS_ICONS)}
        </div>
        <div class="shot__screen">${ui.raw(inner)}</div>
        <div class="shot__home" aria-hidden="true"><span class="shot__home-bar"></span></div>
      </div>
    `;
  }

  function shotMarkup(options) {
    var ratio = options.ratio || DEFAULT_RATIO;
    /* 高度交给图片自己撑（width:100% + height:auto），百分比红框就与截图像素一一对应。
     * 额外的 aspect-ratio 只是给支持它的浏览器预留位置，避免图片加载时跳动（不支持也不影响布局）。 */
    var inner = ui.html`
      <div class="shot__inner" style="aspect-ratio:${(1 / ratio).toFixed(4)}">
        <img class="shot__img" data-role="shot-img" src="${options.screenshotPath}"
          alt="真实产品手机端工单详情截图（${options.alt || '待处理状态'}）" />
        <div class="shot__boxes">
          ${options.step ? ui.raw(boxMarkup(options.step, options.stepIndex || 0, options.stepTotal || 1)) : ''}
        </div>
      </div>
    `;
    var frame = options.device
      ? deviceMarkup(options, inner)
      : ui.html`<div class="shot__frame">${ui.raw(inner)}</div>`;
    return ui.html`
      <div class="shot ${options.device ? 'shot--device' : ''}" data-role="shot">
        ${ui.raw(frame)}
        <p class="phone__caption">真实产品截图 · 工单详情（${options.step ? '红框为本页教学标注' : '未做任何标注'}）</p>
      </div>
    `;
  }

  /* options: {
   *   screenshotPath, alt, ratio,
   *   device: true 时把截图套进手机设备框（第三幕，设计稿页面 5）,
   *   statusTime: 设备框状态栏的时间（默认 9:41）,
   *   step: { key, field, box: { left, top, width, height } } | null,
   *   stepIndex, stepTotal, fallbackRows: [{ label, value }]
   * } */
  function render(host, options) {
    var path = options.screenshotPath;
    if (!path || missingShot[path]) {
      ui.setHtml(host, fallbackMarkup(options));
      return;
    }

    ui.setHtml(host, shotMarkup(options));

    var img = ui.$('[data-role="shot-img"]', host);
    if (img) {
      img.addEventListener('error', function () {
        missingShot[path] = true;
        if (host.isConnected === false) return;
        ui.setHtml(host, fallbackMarkup(options));
      });
    }
  }

  HKR.components.ticketAnnotator = {
    render: render,
    /* 只借这台「手机」：给一线员工课件的第 3 屏套一张真截图用（红框标注不参与） */
    device: function (options) {
      var opts = options || {};
      return deviceMarkup(
        { statusTime: opts.statusTime || '9:41' },
        ui.html`<img class="shot__img" src="${opts.src}" alt="${opts.alt || '真实产品手机截图'}" />`
      );
    },
    /* 状态栏那排图标（信号 / Wi-Fi / 电池）：别的组件想拼状态栏时复用，别画第二套 */
    statusIcons: STATUS_ICONS,
    isMissing: function (path) {
      return missingShot[path] === true;
    }
  };
})();
