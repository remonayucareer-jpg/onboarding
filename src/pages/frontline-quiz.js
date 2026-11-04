/* 课后测试：每次 1 张工单的 2 道题（同票连问）+ 1 道流程 + 1 道前置条件；
 * 某组答错就从同组补一道新题，凑够 2 道工单 + 1 道流程 + 1 道前置条件就通过。
 * 题干、选项、答案、解释全在 src/config/frontline.config.js#quiz 里，这里只管出题和判分。
 */
window.HKR = window.HKR || {};
HKR.pages = HKR.pages || {};

(function () {
  var ARROW =
    '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M4 10h11.2" /><path d="m11.2 5.8 4.2 4.2-4.2 4.2" /></svg>';

  function quizConfig(ctx) {
    return (ctx.config.frontline && ctx.config.frontline.quiz) || { passCorrect: 4, questions: [] };
  }

  /* 通过要答对几题：按 passGroups 加总（现在是 2 + 1 + 1 = 4） */
  function passTotal(quiz) {
    var needs = quiz.passGroups || {};
    var total = Object.keys(needs).reduce(function (sum, key) {
      return sum + needs[key];
    }, 0);
    return total || quiz.passCorrect || 4;
  }

  function currentItem(st) {
    return (st && st.queue && st.queue[st.index]) || null;
  }

  function questionMarkup(ctx, quiz, st) {
    var ui = ctx.ui;
    var item = currentItem(st);
    if (!item) return '';

    var label = (quiz.groupLabels && quiz.groupLabels[item.group]) || '';
    var need = passTotal(quiz);
    var isTicket = item.group === 'A';

    var optionsHtml = item.options
      .map(function (option) {
        var cls = 'fl-quiz__option';
        if (st.revealed) {
          if (option === item.answer) cls += ' is-correct';
          else if (option === st.chosen) cls += ' is-wrong';
          cls += ' is-locked';
        }
        return (
          '<button class="' +
          cls +
          '" type="button" data-quiz-option="' +
          ui.escapeHtml(option) +
          '"' +
          (st.revealed ? ' disabled' : '') +
          '>' +
          ui.escapeHtml(option) +
          '</button>'
        );
      })
      .join('');

    /* A 组题配工单截图；B / C 组是纯文字题，不显示截图区域 */
    var figureHtml = item.image
      ? '<figure class="fl-quiz__figure">' +
        '<img class="fl-quiz__shot" src="' +
        ui.escapeHtml(item.image) +
        '" alt="工单基本信息：房间号、服务分类、服务项" decoding="async" />' +
        '</figure>'
      : '';

    var feedbackHtml = '';
    if (st.revealed) {
      feedbackHtml =
        '<div class="fl-quiz__feedback ' +
        (st.lastCorrect ? 'is-ok' : 'is-bad') +
        '">' +
        '<p class="fl-quiz__verdict">' +
        (st.lastCorrect ? '答对了' : isTicket ? '再看看工单' : '再想一下') +
        '</p>' +
        '<p class="fl-quiz__explain">' +
        ui.escapeHtml(item.explain) +
        '</p>' +
        '</div>' +
        '<div class="fl-quiz__action">' +
        '<button class="btn btn--navy btn--lg fl-quiz__next" type="button" data-quiz-next>' +
        '<span>下一题</span>' +
        '<span class="btn__arrow" aria-hidden="true">' +
        ARROW +
        '</span>' +
        '</button>' +
        '</div>';
    }

    return (
      '<section class="fl-quiz' +
      (item.image ? '' : ' fl-quiz--plain') +
      '" data-quiz-view="question">' +
      '<header class="fl-quiz__head">' +
      '<p class="fl-quiz__kicker">课后测试' +
      (label ? ' · ' + ui.escapeHtml(label) : '') +
      '</p>' +
      '<p class="fl-quiz__meta">第 ' +
      (st.index + 1) +
      ' 题 · 已答对 ' +
      st.correct +
      ' / ' +
      need +
      '</p>' +
      '</header>' +
      figureHtml +
      '<p class="fl-quiz__prompt">' +
      ui.escapeHtml(item.prompt) +
      '</p>' +
      '<div class="fl-quiz__options">' +
      optionsHtml +
      '</div>' +
      feedbackHtml +
      '</section>'
    );
  }

  function passedMarkup() {
    return (
      '<section class="fl-quiz fl-quiz--done" data-quiz-view="passed">' +
      '<span class="fl-quiz__badge" aria-hidden="true">✓</span>' +
      '<h1 class="fl-quiz__done-title">您已通过测试！</h1>' +
      '<p class="fl-quiz__done-desc">很棒，希望华客 AI 能在你的工作中更好地配合你。</p>' +
      '<p class="fl-quiz__done-note">这一课到这里就结束了，可以关掉页面。</p>' +
      '</section>'
    );
  }

  HKR.pages['frontline-quiz'] = {
    render: function (host, ctx) {
      var ui = ctx.ui;
      var quiz = quizConfig(ctx);

      /* 进页面时还没有卷子（刚点「开始答题」/ 旧版本状态）：现场组一份 */
      function ensurePaper() {
        var st = ctx.store.getState().frontlineQuiz;
        if (!st || st.paperVersion !== 2 || !st.queue || !st.queue.length) {
          if (st && st.passed) return; // 旧状态里已经通过的，继续显示通过页
          ctx.store.startQuizPaper();
        }
      }

      /* ---------- 交卷上报：算好成绩，一次性发给中转（飞书表格里一行） ---------- */

      /* 成绩口径（和业务方确认过）：正确率 = 答对数 ÷ 作答次数
       *   一次作答 = 点一次选项（不管对错）；通过时答对数 = 4
       *   所以 4 次答对是 100%，6 次才凑够是 67%。
       * 上报只带三个指标：酒店名称、员工名称、正确率（剩下的一律不发）。 */
      function buildResult(st, identity) {
        var answered = st.answered || (st.log ? st.log.length : 0);
        var accuracy = answered ? st.correct / answered : 1;

        return {
          kind: 'result',
          hotel: (identity && identity.hotel) || '',
          name: (identity && identity.name) || '',
          accuracy: Math.round(accuracy * 1000) / 1000, // 0.667
          accuracy_text: Math.round(accuracy * 100) + '%' // 67%
        };
      }

      function sendResultOnce(st) {
        if (!st.passed || st.reportedAt) return;
        var identity = ctx.store.getState().identity || {};
        var payload = buildResult(st, identity);
        ctx.store.markQuizReported();
        ctx.analytics.track('quiz_result_submit', {
          accuracy: payload.accuracy,
          answered: st.answered,
          correct: st.correct
        });
        HKR.core.report.result(payload);
      }

      /* 测试用：把这次要发出去的成绩原样返回（不发请求） */
      HKR.pages['frontline-quiz'].buildResult = function () {
        return buildResult(ctx.store.getState().frontlineQuiz, ctx.store.getState().identity || {});
      };

      function paint() {
        var st = ctx.store.getState().frontlineQuiz;
        if (!st || !st.passed) ensurePaper();
        st = ctx.store.getState().frontlineQuiz;

        if (st.passed) {
          ui.setHtml(host, passedMarkup());
          sendResultOnce(st);
          return;
        }
        if (!currentItem(st)) {
          ctx.store.startQuizPaper();
          st = ctx.store.getState().frontlineQuiz;
        }
        ui.setHtml(host, questionMarkup(ctx, quiz, st));
      }

      paint();

      /* 选一个选项：判定 + 记分 + 立刻给反馈（同一题再点不会重复计分） */
      ui.delegate(host, '[data-quiz-option]', 'click', function (event, target) {
        var st = ctx.store.getState().frontlineQuiz;
        if (!st || st.revealed) return;
        var item = currentItem(st);
        if (!item) return;
        var value = target.getAttribute('data-quiz-option');
        var isCorrect = value === item.answer;

        ctx.store.answerQuiz(value, isCorrect);
        ctx.analytics.track('quiz_answer', {
          question_id: item.id,
          group: item.group,
          chosen: value,
          correct: isCorrect
        });
        if (isCorrect && ctx.store.getState().frontlineQuiz.passed) {
          ctx.analytics.track('quiz_passed', {
            correct: ctx.store.getState().frontlineQuiz.correct,
            answered: ctx.store.getState().frontlineQuiz.answered
          });
        }
        paint();
      });

      /* 下一题：答错时同组补的题已经接在队尾，这里只往后走一格 */
      ui.delegate(host, '[data-quiz-next]', 'click', function () {
        ctx.store.nextQuizQuestion();
        paint();
      });

      /* 测试完成后不再给「再看一遍 / 结束」这类往回走的按钮：这一课到此为止。
       * 结果保存在本机，重新打开链接会直接看到这一页。 */
    }
  };
})();
