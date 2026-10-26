/* 课后测试：一屏一题、答完立即判对错并给一句解释；全卷答对 2 题就算通过。
 * 题干、选项、解释全在 src/config/frontline.config.js#quiz 里，这里只管出题和判分。
 */
window.HKR = window.HKR || {};
HKR.pages = HKR.pages || {};

(function () {
  var ARROW =
    '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M4 10h11.2" /><path d="m11.2 5.8 4.2 4.2-4.2 4.2" /></svg>';

  function quizConfig(ctx) {
    return (ctx.config.frontline && ctx.config.frontline.quiz) || { passCorrect: 2, questions: [] };
  }

  /* 当前这一题：题号要经过 st.order 这层洗牌，选项也要过 st.optionOrders */
  function currentQuestion(quiz, st) {
    var qi = st.order.length ? st.order[st.index] : st.index;
    var q = quiz.questions[qi];
    if (!q) return null;
    var order = st.optionOrders[qi];
    var options = order ? order.map(function (i) { return q.options[i]; }) : q.options.slice();
    return { q: q, qi: qi, options: options };
  }

  function viewOf(st, quiz) {
    if (st.passed) return 'passed';
    if (st.index >= quiz.questions.length) return 'out';
    return 'question';
  }

  function questionMarkup(ctx, quiz, st) {
    var current = currentQuestion(quiz, st);
    if (!current) return '';
    var q = current.q;
    var total = quiz.questions.length;
    var pass = quiz.passCorrect || 2;

    var optionsHtml = current.options
      .map(function (option) {
        var cls = 'fl-quiz__option';
        if (st.revealed) {
          if (option === q.answer) cls += ' is-correct';
          else if (option === st.chosen) cls += ' is-wrong';
          cls += ' is-locked';
        }
        return (
          '<button class="' +
          cls +
          '" type="button" data-quiz-option="' +
          HKR.core.ui.escapeHtml(option) +
          '"' +
          (st.revealed ? ' disabled' : '') +
          '>' +
          HKR.core.ui.escapeHtml(option) +
          '</button>'
        );
      })
      .join('');

    var feedbackHtml = '';
    if (st.revealed) {
      feedbackHtml =
        '<div class="fl-quiz__feedback ' +
        (st.lastCorrect ? 'is-ok' : 'is-bad') +
        '">' +
        '<p class="fl-quiz__verdict">' +
        (st.lastCorrect ? '答对了' : '再看看工单') +
        '</p>' +
        '<p class="fl-quiz__explain">' +
        HKR.core.ui.escapeHtml(q.explain) +
        '</p>' +
        '</div>' +
        '<div class="fl-quiz__action">' +
        '<button class="btn btn--navy btn--lg fl-quiz__next" type="button" data-quiz-next>' +
        '<span>' +
        (st.passed ? '看结果' : st.index + 1 >= total ? '看结果' : '下一题') +
        '</span>' +
        '<span class="btn__arrow" aria-hidden="true">' +
        ARROW +
        '</span>' +
        '</button>' +
        '</div>';
    }

    return (
      '<section class="fl-quiz" data-quiz-view="question">' +
      '<header class="fl-quiz__head">' +
      '<p class="fl-quiz__kicker">课后测试</p>' +
      '<p class="fl-quiz__meta">第 ' +
      (st.index + 1) +
      ' 题 · 已答对 ' +
      st.correct +
      ' 题（答对 ' +
      pass +
      ' 题就完成）</p>' +
      '</header>' +
      '<figure class="fl-quiz__figure">' +
      '<img class="fl-quiz__shot" src="' +
      HKR.core.ui.escapeHtml(q.image) +
      '" alt="工单基本信息：房间号、服务分类、服务项" decoding="async" />' +
      '</figure>' +
      '<p class="fl-quiz__prompt">' +
      HKR.core.ui.escapeHtml(q.prompt) +
      '</p>' +
      '<div class="fl-quiz__options">' +
      optionsHtml +
      '</div>' +
      feedbackHtml +
      '</section>'
    );
  }

  function passedMarkup(st, quiz) {
    return (
      '<section class="fl-quiz fl-quiz--done" data-quiz-view="passed">' +
      '<span class="fl-quiz__badge" aria-hidden="true">✓</span>' +
      '<h1 class="fl-quiz__done-title">测试完成</h1>' +
      '<p class="fl-quiz__done-desc">你答对了 ' +
      st.correct +
      ' 题（答对 ' +
      (quiz.passCorrect || 2) +
      ' 题就算完成）。照着工单去服务客人吧。</p>' +
      '<div class="fl-quiz__action">' +
      '<button class="btn btn--navy btn--lg fl-quiz__next" type="button" data-quiz-replay>' +
      '<span>再看一遍预习</span>' +
      '<span class="btn__arrow" aria-hidden="true">' +
      ARROW +
      '</span>' +
      '</button>' +
      '<button class="linkbtn" type="button" data-quiz-exit>结束</button>' +
      '</div>' +
      '</section>'
    );
  }

  function outMarkup(st, quiz) {
    return (
      '<section class="fl-quiz fl-quiz--done" data-quiz-view="out">' +
      '<h1 class="fl-quiz__done-title">这次答对 ' +
      st.correct +
      ' 题</h1>' +
      '<p class="fl-quiz__done-desc">答对 ' +
      (quiz.passCorrect || 2) +
      ' 题就算完成，再来一次吧。</p>' +
      '<div class="fl-quiz__action">' +
      '<button class="btn btn--navy btn--lg fl-quiz__next" type="button" data-quiz-retry>' +
      '<span>再试一次</span>' +
      '<span class="btn__arrow" aria-hidden="true">' +
      ARROW +
      '</span>' +
      '</button>' +
      '<button class="linkbtn" type="button" data-quiz-exit>结束</button>' +
      '</div>' +
      '</section>'
    );
  }

  HKR.pages['frontline-quiz'] = {
    render: function (host, ctx) {
      var ui = ctx.ui;
      var quiz = quizConfig(ctx);

      /* 每一轮都重新洗牌：进页面时洗一次、每次「再试一次 / 开始答题」重置后也会洗 */
      function ensureOrder() {
        var st = ctx.store.getState().frontlineQuiz;
        if (st.order.length) return;
        ctx.store.shuffleQuiz(
          quiz.questions.length,
          quiz.questions.map(function (q) {
            return q.options.length;
          })
        );
      }

      function paint() {
        ensureOrder();
        var st = ctx.store.getState().frontlineQuiz;
        var view = viewOf(st, quiz);
        if (view === 'passed') ui.setHtml(host, passedMarkup(st, quiz));
        else if (view === 'out') ui.setHtml(host, outMarkup(st, quiz));
        else ui.setHtml(host, questionMarkup(ctx, quiz, st));
      }

      paint();

      /* 选一个选项：判定 + 记分 + 立刻给反馈（同一题再点不会重复计分） */
      ui.delegate(host, '[data-quiz-option]', 'click', function (event, target) {
        var st = ctx.store.getState().frontlineQuiz;
        if (st.revealed) return;
        var current = currentQuestion(quiz, st);
        if (!current) return;
        var q = current.q;
        var value = target.getAttribute('data-quiz-option');
        var isCorrect = value === q.answer;
        ctx.store.answerQuiz(value, isCorrect);
        ctx.analytics.track('quiz_answer', {
          question_id: q.id,
          chosen: value,
          correct: isCorrect
        });
        if (isCorrect && ctx.store.getState().frontlineQuiz.passed) {
          ctx.analytics.track('quiz_passed', { correct: ctx.store.getState().frontlineQuiz.correct });
        }
        paint();
      });

      /* 下一题 / 看结果 */
      ui.delegate(host, '[data-quiz-next]', 'click', function () {
        var st = ctx.store.getState().frontlineQuiz;
        if (!st.passed && st.index + 1 < quiz.questions.length) {
          ctx.store.nextQuizQuestion();
        } else if (!st.passed) {
          ctx.store.nextQuizQuestion(); /* 题用完了：index 越界 → 渲染「再试一次」 */
        }
        paint();
      });

      ui.delegate(host, '[data-quiz-retry]', 'click', function () {
        ctx.store.resetQuiz();
        ctx.analytics.track('quiz_retry', {});
        paint();
      });

      ui.delegate(host, '[data-quiz-replay]', 'click', function () {
        ctx.store.resetQuiz();
        ctx.store.resetFrontlineTicket();
        ctx.analytics.track('frontline_replay', { from: 'quiz' });
        ctx.go(HKR.config.frontline.screens[0].id);
      });

      ui.delegate(host, '[data-quiz-exit]', 'click', function () {
        ctx.analytics.track('frontline_exit', { from: 'quiz' });
        ctx.go('roles');
      });
    }
  };
})();
