/* 时间线组件：把「客人提出需求 → AI 识别 → 生成工单 → 员工接手」分步骤亮起来
 * 内容始终全部可见（只是高亮节奏不同），避免出现「看不到信息」的焦虑。
 */
window.HKR = window.HKR || {};
HKR.components = HKR.components || {};

(function () {
  var ui = HKR.core.ui;

  function render(host, options) {
    var steps = options.steps || [];
    var stepMs = options.stepMs || 620;
    var reduced =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    ui.setHtml(
      host,
      ui.html`
        <div class="timeline" data-timeline>
          <div class="timeline__head">
            <p class="timeline__title">${options.title}</p>
            ${options.hint ? ui.raw('<p class="timeline__hint">' + ui.escapeHtml(options.hint) + '</p>') : ''}
          </div>
          <ol class="timeline__list">
            ${steps.map(function (step, index) {
              return ui.raw(
                ui.html`
                  <li class="timeline__item" data-step="${index + 1}">
                    <span class="timeline__dot">${index + 1}</span>
                    <div class="timeline__content">
                      <p class="timeline__step-title">${step.title}</p>
                      <p class="timeline__step-desc">${step.desc}</p>
                    </div>
                  </li>
                `
              );
            })}
          </ol>
          <div class="timeline__foot">
            <span class="timeline__counter" data-role="counter">0 / ${steps.length}</span>
            ${reduced ? '' : ui.raw('<button class="linkbtn" type="button" data-action="skip-timeline">跳过动画</button>')}
          </div>
        </div>
      `
    );

    var hostEl = host.querySelector('[data-timeline]');
    var items = Array.prototype.slice.call(host.querySelectorAll('.timeline__item'));
    var counter = host.querySelector('[data-role="counter"]');
    var timer = null;
    var index = 0;

    function alive() {
      return document.body.contains(hostEl);
    }

    function light(count) {
      items.forEach(function (item, i) {
        item.classList.toggle('is-lit', i < count);
      });
      if (counter) counter.textContent = Math.min(count, items.length) + ' / ' + items.length;
    }

    function finish() {
      if (timer) clearInterval(timer);
      timer = null;
      light(items.length);
      hostEl.classList.add('is-complete');
    }

    function tick() {
      if (!alive()) {
        if (timer) clearInterval(timer);
        return;
      }
      index += 1;
      light(index);
      if (index >= items.length) finish();
    }

    if (reduced) {
      finish();
    } else {
      light(0);
      timer = setInterval(tick, stepMs);
      setTimeout(tick, 260);
    }

    ui.delegate(host, '[data-action="skip-timeline"]', 'click', function () {
      finish();
      ui.toast('已显示全部步骤');
    });

    return { finish: finish };
  }

  HKR.components.timeline = { render: render };
})();
