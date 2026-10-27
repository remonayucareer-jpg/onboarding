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
      (st.log.length + 1) +
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
    var answered = st.log.length;
    var accuracy = answered ? Math.round((st.correct / answered) * 100) : 100;
    return (
      '<section class="fl-quiz fl-quiz--done" data-quiz-view="passed">' +
      '<span class="fl-quiz__badge" aria-hidden="true">✓</span>' +
      '<h1 class="fl-quiz__done-title">测试完成</h1>' +
      '<p class="fl-quiz__done-desc">你答对了 ' +
      st.correct +
      ' 题（一共答了 ' +
      answered +
      ' 次，正确率 ' +
      accuracy +
      '%）。照着工单去服务客人吧。</p>' +
      '<p class="fl-quiz__done-note">这一课到这里就结束了，可以关掉页面。</p>' +
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

      /* 一轮九题答完还没通过 → 重新洗牌接着问（老数据里 index 越界的，进页面就先归零） */
      function ensureDeck() {
        var st = ctx.store.getState().frontlineQuiz;
        if (st.passed) return;
        if (st.index >= quiz.questions.length) {
          ctx.store.restartQuizDeck(
            quiz.questions.length,
            quiz.questions.map(function (q) {
              return q.options.length;
            })
          );
        }
      }

      function paint() {
        ensureOrder();
        ensureDeck();
        var st = ctx.store.getState().frontlineQuiz;
        if (viewOf(st, quiz) === 'passed') ui.setHtml(host, passedMarkup(st, quiz));
        else ui.setHtml(host, questionMarkup(ctx, quiz, st));
        sendResultOnce();
      }

      /* ---------- 交卷上报：算好成绩，一次性发给中转（飞书表格里一行） ---------- */

      /* 成绩口径（和业务方确认过）：正确率 = 答对数 ÷ 作答次数
       *   一次作答 = 点一次选项（不管对错）；通过时答对数 = 2
       *   所以 2 次答对是 100%，错 3 次才凑够的是 33%。
       * 上报只带三个指标：酒店名称、员工名称、正确率（剩下的一律不发）。 */
      function buildResult(st, identity) {
        var answered = st.log.length;
        var accuracy = answered ? st.correct / answered : 1;

        return {
          kind: 'result',
          hotel: (identity && identity.hotel) || '',
          name: (identity && identity.name) || '',
          accuracy: Math.round(accuracy * 1000) / 1000, // 0.667
          accuracy_text: Math.round(accuracy * 100) + '%' // 67%
        };
      }

      function sendResultOnce() {
        var st = ctx.store.getState().frontlineQuiz;
        if (!st.passed || st.reportedAt) return;
        var identity = ctx.store.getState().identity || {};
        var payload = buildResult(st, identity);
        ctx.store.markQuizReported();
        ctx.analytics.track('quiz_result_submit', {
          accuracy: payload.accuracy,
          answered: st.log.length,
          correct: st.correct
        });
        HKR.core.report.result(payload);
      }

      /* 测试用：把这次要发出去的成绩原样返回（不发请求） */
      HKR.pages['frontline-quiz'].buildResult = function () {
        return buildResult(ctx.store.getState().frontlineQuiz, ctx.store.getState().identity || {});
      };

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

      /* 下一题 / 看结果。
       * 九道题答完还没凑够 2 题正确 → 这一套题重新洗牌、从第 10 题接着问（不结束、不退出） */
      ui.delegate(host, '[data-quiz-next]', 'click', function () {
        var st = ctx.store.getState().frontlineQuiz;
        if (!st.passed) {
          if (st.index + 1 >= quiz.questions.length) {
            ctx.store.restartQuizDeck(
              quiz.questions.length,
              quiz.questions.map(function (q) {
                return q.options.length;
              })
            );
            ctx.analytics.track('quiz_deck_restart', { answered: st.log.length });
          } else {
            ctx.store.nextQuizQuestion();
          }
        }
        paint();
      });

      /* 测试完成后不再给「再看一遍 / 结束」这类往回走的按钮：这一课到此为止。
       * 结果保存在本机，重新打开链接会直接看到这一页。 */
    }
  };
})();
