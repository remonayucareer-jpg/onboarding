/* 页面 6：学习反馈（了解困惑类别，不是考试，不影响通关） */
window.HKR = window.HKR || {};
HKR.pages = HKR.pages || {};

(function () {
  var ui = HKR.core.ui;

  function plainOptions(options, selectedKey, attr) {
    return options
      .map(function (option) {
        var selected = option.key === selectedKey;
        return ui.html`
          <button class="option option--compact ${selected ? 'is-selected' : ''}" type="button" role="radio"
            aria-checked="${selected ? 'true' : 'false'}" ${attr}="${option.key}">
            <span class="option__content">
              <span class="option__label">${option.label}</span>
            </span>
            <span class="option__mark" aria-hidden="true">${selected ? '✓' : ''}</span>
          </button>
        `;
      })
      .join('');
  }

  function labelOf(options, key) {
    var found = options.filter(function (item) {
      return item.key === key;
    })[0];
    return found ? found.label : '';
  }

  HKR.pages.feedback = {
    render: function (host, ctx) {
      var cfg = ctx.config.feedback;
      var stored = ctx.state().feedback;
      var clarityKey = stored.feedback_clarity;
      var needKey = stored.learning_need_category;
      var freeText = stored.free_text_feedback || '';
      var submitted = !!stored.created_at;
      var isOtherSelected = needKey === 'other';

      function ready() {
        return !!clarityKey && !!needKey;
      }

      function paint() {
        var needLabel = needKey ? labelOf(cfg.learningNeed.options, needKey) : '';
        ui.setHtml(
          host,
          ui.html`
            <section class="chapter-intro">
              <p class="chapter-intro__tag">第二章 · 学习反馈</p>
              <h1 class="page-title">${cfg.title}</h1>
              <p class="page-subtitle">${cfg.subtitle}</p>
            </section>

            <section class="card card--plain">
              <p class="card__title">${cfg.clarity.question}</p>
              <div class="options options--compact" role="radiogroup" aria-label="${cfg.clarity.question}">
                ${ui.raw(plainOptions(cfg.clarity.options, clarityKey, 'data-clarity-key'))}
              </div>
            </section>

            <section class="card card--plain">
              <p class="card__title">${cfg.learningNeed.question}</p>
              <div class="options options--compact" role="radiogroup" aria-label="${cfg.learningNeed.question}">
                ${ui.raw(plainOptions(cfg.learningNeed.options, needKey, 'data-need-key'))}
              </div>
              <div class="freetext ${isOtherSelected ? '' : 'is-hidden'}">
                <label class="freetext__label" for="feedback-freetext">想补充一句话吗？</label>
                <textarea id="feedback-freetext" class="freetext__input" rows="3" maxlength="200"
                  placeholder="${cfg.learningNeed.freeTextPlaceholder}" data-role="freetext-input">${freeText}</textarea>
              </div>
            </section>

            <div class="feedback-result" data-role="result">
              ${submitted
                ? ui.raw(ui.html`
                    <section class="card card--ok" role="status" aria-live="polite">
                      <p class="card__title">反馈已记录（保存在本机浏览器）</p>
                      <p class="card__desc">流程清晰度：${labelOf(cfg.clarity.options, clarityKey) || '未填写'}；
                        最想听的内容：${needLabel || '未填写'}${isOtherSelected && freeText ? '（补充：' + freeText + '）' : ''}。</p>
                    </section>
                  `)
                : ''}
            </div>

            <section class="callout callout--soft">
              <p class="callout__title">这些反馈会怎么用？</p>
              <p>只用来调整正式培训的讲法，不会公开个人选择，也不影响任何结果。</p>
            </section>

            <div class="cta-row">
              <button class="btn btn--lg ${ready() ? '' : 'is-disabled'}" type="button" data-action="submit"
                ${ready() ? '' : 'disabled aria-disabled="true"'}>
                ${submitted ? '更新我的反馈' : '提交，继续'}
              </button>
              <button class="linkbtn linkbtn--center" type="button" data-action="skip">先跳过，直接进入下一步</button>
            </div>
          `
        );
      }

      paint();

      function collectAndSave(goNextAfterSave) {
        ctx.store.saveFeedback({
          feedback_clarity: clarityKey,
          learning_need_category: needKey,
          free_text_feedback: isOtherSelected ? freeText : '',
          related_scene_id: 'scene_delivery'
        });
        ctx.analytics.track('feedback_submitted', {
          feedback_clarity: clarityKey,
          learning_need_category: needKey,
          has_free_text: !!(freeText && isOtherSelected)
        });
        submitted = true;
        paint();
        if (goNextAfterSave) {
          ui.toast('收到，谢谢！', { variant: 'ok' });
          ctx.go('official-account');
        } else {
          ui.toast('已更新你的反馈', { variant: 'ok' });
        }
      }

      ui.delegate(host, '[data-clarity-key]', 'click', function (event, target) {
        clarityKey = target.getAttribute('data-clarity-key');
        paint();
      });

      ui.delegate(host, '[data-need-key]', 'click', function (event, target) {
        needKey = target.getAttribute('data-need-key');
        isOtherSelected = needKey === 'other';
        paint();
        var input = ui.$('[data-role="freetext-input"]', host);
        if (input && isOtherSelected) input.focus();
      });

      ui.delegate(host, 'textarea[data-role="freetext-input"]', 'input', function (event, target) {
        freeText = target.value.slice(0, 200);
      });

      ui.delegate(host, '[data-action="submit"]', 'click', function () {
        if (!ready()) {
          ui.toast('两题各选一项就能提交');
          return;
        }
        var wasSubmitted = submitted;
        collectAndSave(!wasSubmitted);
      });

      ui.delegate(host, '[data-action="skip"]', 'click', function () {
        ctx.analytics.track('feedback_skipped');
        ui.toast('随时可以回来补填');
        ctx.go('official-account');
      });
    }
  };
})();
