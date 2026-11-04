/* 一次性选择组件：选完立即反馈并锁定
 * 用于第二章第三幕「先判断需求」（设计稿页面 5）：
 * - 答对 → 一句正向反馈；答错 → 直接说明当前选择不正确，不要求反复尝试
 * - 只记录第一次作答（attempts_count 仍由 store 统一累加），反馈里不把账细讲完，讲解留给第四幕
 * - 主按钮是深蓝实底「具体讲解 →」：和第一、二章「主流程往前走」的按钮同一档（--btn-h-lg）
 */
window.HKR = window.HKR || {};
HKR.components = HKR.components || {};

(function () {
  var ui = HKR.core.ui;
  var store = HKR.core.store;
  var analytics = HKR.core.analytics;

  /* 主按钮里的方向箭头：和欢迎页 / 第一章用的是同一枚，表示「往下一步走」，不是装饰 */
  var ARROW =
    '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M3.6 10h12" /><path d="M11.2 5.6 15.6 10l-4.4 4.4" /></svg>';

  function optionHtml(option, answeredKey) {
    var selected = answeredKey === option.key;
    var classes = ['option'];
    if (selected) classes.push('is-selected', option.isCorrect ? 'is-correct' : 'is-wrong');
    return ui.html`
      <button class="${classes.join(' ')}" type="button" role="radio" aria-checked="${selected ? 'true' : 'false'}"
        data-option-key="${option.key}" ${answeredKey ? 'disabled' : ''}>
        <span class="option__key">${option.key}</span>
        <span class="option__content">
          <span class="option__label">${option.label}</span>
        </span>
        <span class="option__mark" aria-hidden="true">${selected ? (option.isCorrect ? '✓' : '×') : ''}</span>
      </button>
    `;
  }

  function feedbackHtml(option) {
    return ui.html`
      <div class="explain ${option.isCorrect ? 'explain--ok' : 'explain--note'}" role="status" aria-live="polite">
        <p class="explain__title">${option.isCorrect ? '答对了！' : '这个选择不正确'}</p>
        <p class="explain__text">${option.feedback || ''}</p>
      </div>
    `;
  }

  /* options: { question, sceneId, ctaLabel, initialAnswer, onAnswered(option, record), onContinue(option) } */
  function render(host, options) {
    var question = options.question;
    var startedAt = Date.now();
    var answeredKey = (options.initialAnswer && options.initialAnswer.selected_option) || null;

    function optionByKey(key) {
      return question.options.filter(function (item) {
        return item.key === key;
      })[0];
    }

    function paint() {
      var option = answeredKey ? optionByKey(answeredKey) : null;
      ui.setHtml(
        host,
        ui.html`
          <div class="quiz choice" data-question-id="${question.id}">
            <p class="quiz__question">${question.text}</p>
            <div class="options" role="radiogroup" aria-label="${question.text}">
              ${question.options.map(function (item) {
                return ui.raw(optionHtml(item, answeredKey));
              })}
            </div>
            <div class="quiz__feedback" data-role="feedback">
              ${option ? ui.raw(feedbackHtml(option)) : ''}
            </div>
            <button class="btn btn--navy btn--lg ${option ? '' : 'is-hidden'}" type="button" data-action="choice-continue">
              ${options.ctaLabel || '下一步'}
              ${options.ctaArrow === false ? '' : ui.raw('<span class="btn__arrow">' + ARROW + '</span>')}
            </button>
          </div>
        `
      );
    }

    paint();

    ui.delegate(host, '[data-option-key]', 'click', function (event, target) {
      if (answeredKey) return;
      var key = target.getAttribute('data-option-key');
      var option = optionByKey(key);
      if (!option) return;
      answeredKey = key;
      var record = store.saveAnswer(question.id, {
        selected_option: key,
        is_correct: option.isCorrect === true,
        response_time_seconds: (Date.now() - startedAt) / 1000,
        feedback_category: question.feedbackCategory,
        scene_id: options.sceneId
      });
      analytics.track('quiz_answer', {
        question_id: question.id,
        selected_option: key,
        is_correct: option.isCorrect === true,
        attempts_count: record.attempts_count
      });
      paint();
      var feedback = ui.$('[data-role="feedback"]', host);
      if (feedback && feedback.scrollIntoView) feedback.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      if (typeof options.onAnswered === 'function') options.onAnswered(option, record);
    });

    ui.delegate(host, '[data-action="choice-continue"]', 'click', function () {
      if (!answeredKey) {
        ui.toast('先选一个答案');
        return;
      }
      if (typeof options.onContinue === 'function') options.onContinue(optionByKey(answeredKey));
    });
  }

  HKR.components.singleChoice = { render: render };
})();
