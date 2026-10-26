/* 交互题目组件：单选 + 立即解释（不扣分、不惩罚、可反复修改答案）
 * 每次改动作答都会记录 attempts_count，用于分析「哪些题最容易让人犹豫」。
 */
window.HKR = window.HKR || {};
HKR.components = HKR.components || {};

(function () {
  var ui = HKR.core.ui;
  var store = HKR.core.store;
  var analytics = HKR.core.analytics;

  function optionHtml(option, selectedKey, answered) {
    var selected = selectedKey === option.key;
    var classes = ['option'];
    if (selected) classes.push('is-selected');
    if (answered && selected && option.isCorrect) classes.push('is-correct');
    return ui.html`
      <button class="${classes.join(' ')}" type="button" role="radio" aria-checked="${selected ? 'true' : 'false'}"
        data-option-key="${option.key}">
        <span class="option__key">${option.key}</span>
        <span class="option__content">
          <span class="option__label">${option.label}</span>
          ${option.desc ? ui.raw('<span class="option__desc">' + ui.escapeHtml(option.desc) + '</span>') : ''}
        </span>
        <span class="option__mark" aria-hidden="true">${selected ? '✓' : ''}</span>
      </button>
    `;
  }

  function explainHtml(option, question) {
    var title = option.isCorrect ? '就是这个意思 👍' : '这里容易误会，不过没关系';
    return ui.html`
      <div class="explain ${option.isCorrect ? 'explain--ok' : 'explain--note'}" role="status" aria-live="polite">
        <p class="explain__title">${title}</p>
        <p class="explain__text">${option.explain}</p>
        <p class="explain__logic"><strong>正确的理解：</strong>${question.correctLogic}</p>
        <p class="explain__foot">答错不影响通关，也不扣分。</p>
      </div>
    `;
  }

  /* options: { question, sceneId, ctaLabel, initialAnswer, keepExplanationsOnChange, onAnswered(option, record), onContinue() } */
  function render(host, options) {
    var question = options.question;
    var startedAt = Date.now();
    var answer = options.initialAnswer || null;
    var selectedKey = answer ? answer.selected_option : null;

    function optionByKey(key) {
      return question.options.filter(function (item) {
        return item.key === key;
      })[0];
    }

    function paint() {
      var answered = !!selectedKey;
      ui.setHtml(
        host,
        ui.html`
          <div class="quiz" data-question-id="${question.id}">
            <p class="quiz__question">${question.text}</p>
            <div class="options" role="radiogroup" aria-label="${question.text}">
              ${question.options.map(function (option) {
                return ui.raw(optionHtml(option, selectedKey, answered));
              })}
            </div>
            <div class="quiz__feedback" data-role="feedback">
              ${selectedKey ? ui.raw(explainHtml(optionByKey(selectedKey), question)) : ''}
            </div>
            <div class="quiz__hint ${answered ? 'is-hidden' : ''}" data-role="hint">
              选一个就行，选完马上给解释。
            </div>
            <button class="btn ${answered ? '' : 'is-disabled'}" type="button" data-action="continue" ${answered ? '' : 'disabled aria-disabled="true"'}>
              ${options.ctaLabel || '继续'}
            </button>
          </div>
        `
      );
    }

    paint();

    ui.delegate(host, '[data-option-key]', 'click', function (event, target) {
      var key = target.getAttribute('data-option-key');
      if (key === selectedKey) return;
      var option = optionByKey(key);
      selectedKey = key;
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
      if (feedback) feedback.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      if (typeof options.onAnswered === 'function') options.onAnswered(option, record);
    });

    ui.delegate(host, '[data-action="continue"]', 'click', function () {
      if (!selectedKey) {
        ui.toast('先选一个答案，就能继续了');
        return;
      }
      if (typeof options.onContinue === 'function') options.onContinue();
    });
  }

  HKR.components.quiz = { render: render };
})();
