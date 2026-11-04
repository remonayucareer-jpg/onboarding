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

  /* ---------- 测试统计（分域正确率 / 错题类型 / 一次通过） ----------
   * 全部从答题记录现算，不额外存状态——log 里每题一条：
   *   { index, question_id, group, chosen, correct }
   *   A 组 = 读工单（房间号、送什么几个）
   *   B 组 = 流程顺序与闭环
   *   C 组 = 前置条件（公众号）
   * 飞书那边按「一行一人」接这些字段即可，和姓名、酒店同一行。
   */
  var QUIZ_GROUPS = ['A', 'B', 'C'];

  function round3(n) {
    return Math.round(n * 1000) / 1000;
  }

  function pctText(rate) {
    return rate === null || typeof rate === 'undefined' ? '' : Math.round(rate * 100) + '%';
  }

  /* 分域统计：每组答了几题、对了几题、错了几题、正确率 */
  function computeStats(st, labels) {
    var log = (st && st.log) || [];
    var by = {};
    QUIZ_GROUPS.forEach(function (group) {
      by[group] = { attempted: 0, correct: 0, wrong: 0, rate: null };
    });

    log.forEach(function (row) {
      var group = row && row.group;
      if (!group || !by[group]) return; // 老版本的作答记录没有 group，跳过
      by[group].attempted += 1;
      if (row.correct) by[group].correct += 1;
      else by[group].wrong += 1;
    });

    QUIZ_GROUPS.forEach(function (group) {
      by[group].rate = by[group].attempted ? round3(by[group].correct / by[group].attempted) : null;
    });

    var wrongTotal = log.filter(function (row) {
      return !row.correct;
    }).length;

    /* 错得最多的那一组：并列时按 A → B → C 取第一个；一道没错则为空 */
    var worstGroup = '';
    var worstWrong = 0;
    QUIZ_GROUPS.forEach(function (group) {
      if (by[group].wrong > worstWrong) {
        worstWrong = by[group].wrong;
        worstGroup = group;
      }
    });

    return {
      answered: st && typeof st.answered === 'number' ? st.answered : log.length,
      correct: (st && st.correct) || 0,
      wrongTotal: wrongTotal,
      /* 一次通过 = 从头到尾一道没错（错一道就会补题，所以也等价于「答 4 题全对」） */
      onePass: !!(st && st.passed) && wrongTotal === 0,
      by: by,
      worstGroup: worstGroup,
      worstGroupLabel: worstGroup ? (labels && labels[worstGroup]) || worstGroup : '',
      worstWrong: worstWrong
    };
  }

  /* 拍平成一行：一列一个字段，飞书表格可以直接接 */
  function statsFields(st, labels) {
    var stats = computeStats(st, labels);
    return {
      answered: stats.answered,
      correct_total: stats.correct,
      wrong_total: stats.wrongTotal,
      /* 一次通过率：这一条是 1 就代表「一次看懂」，飞书里求平均即可 */
      one_pass: stats.onePass ? 1 : 0,
      one_pass_text: stats.onePass ? '一次通过' : '补题后通过',
      /* 错题类型：三组各错几题 + 错得最多的那一组 */
      wrong_a: stats.by.A.wrong,
      wrong_b: stats.by.B.wrong,
      wrong_c: stats.by.C.wrong,
      wrong_group: stats.worstGroup,
      wrong_group_text: stats.worstGroup
        ? stats.worstGroupLabel + '（错 ' + stats.worstWrong + ' 题）'
        : '没有答错',
      /* 分域正确率：每组 答对 ÷ 作答（没答过为 null） */
      acc_a: stats.by.A.rate,
      acc_b: stats.by.B.rate,
      acc_c: stats.by.C.rate,
      acc_a_text: pctText(stats.by.A.rate),
      acc_b_text: pctText(stats.by.B.rate),
      acc_c_text: pctText(stats.by.C.rate),
      /* 逐题明细（按作答顺序）：A11 表示 A1 答对、B10 表示 B1 答错，用来事后算选项分布 */
      answers_text: (st && st.log ? st.log : [])
        .map(function (row) {
          return (row.question_id || '?') + (row.correct ? '1' : '0');
        })
        .join(' ')
    };
  }

  HKR.core = HKR.core || {};
  HKR.core.quizStats = {
    groups: QUIZ_GROUPS,
    compute: computeStats,
    fields: statsFields
  };

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
       * 上报内容：酒店、姓名、正确率，外加三块统计（都由 statsFields 算好）——
       *   一次通过（one_pass）、错题类型（wrong_a/b/c、wrong_group）、分域正确率（acc_a/b/c）。 */
      function buildResult(st, identity) {
        var answered = st.answered || (st.log ? st.log.length : 0);
        var accuracy = answered ? st.correct / answered : 1;
        var quizNow = quizConfig(ctx) || {};

        var payload = {
          kind: 'result',
          hotel: (identity && identity.hotel) || '',
          name: (identity && identity.name) || '',
          accuracy: Math.round(accuracy * 1000) / 1000, // 0.667
          accuracy_text: Math.round(accuracy * 100) + '%' // 67%
        };

        /* 分域正确率 / 错题类型 / 一次通过：一列一个字段，跟姓名、酒店一起进飞书 */
        var stats = statsFields(st, quizNow.groupLabels || {});
        Object.keys(stats).forEach(function (key) {
          payload[key] = stats[key];
        });
        return payload;
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
        /* B：答完把解析滚进视野（底部按钮已经固定，这里只要让「对不对 + 解析」露出来） */
        var fb = ui.$('.fl-quiz__feedback', host);
        if (fb && fb.scrollIntoView) {
          fb.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      });

      /* 下一题：答错时同组补的题已经接在队尾，这里只往后走一格 */
      ui.delegate(host, '[data-quiz-next]', 'click', function () {
        ctx.store.nextQuizQuestion();
        paint();
        /* 换题回到顶部，新题从头看 */
        if (window.scrollTo) window.scrollTo({ top: 0, behavior: 'smooth' });
      });

      /* 测试完成后不再给「再看一遍 / 结束」这类往回走的按钮：这一课到此为止。
       * 结果保存在本机，重新打开链接会直接看到这一页。 */
    }
  };
})();
