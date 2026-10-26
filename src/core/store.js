/* 体验状态仓库：统一管理 session / 答案 / 工单模拟状态 / 反馈，并持久化到 localStorage
 * 重要说明：所有数据仅保存在本机浏览器（localStorage），清除浏览器数据或换设备会丢失。
 * 本地演示默认在每次打开 index 时清空；关闭该配置后，页面内刷新会保留当前进度。
 */
window.HKR = window.HKR || {};
HKR.core = HKR.core || {};

(function () {
  var cfg = HKR.config.app;

  /* 第七幕「走廊寻房挑战」要送到的房间号：与 scenes.config.js#delivery.game.corridor.targetRoom 保持一致。
     判定放在 store 里，页面没加载配置时也不会把「有没有送到」记错；改房号时两处一起改，
     冒烟测试会拦住不一致（测试直接比对配置与 store 的判定）。 */
  var CORRIDOR_TARGET_ROOM = '8011';

  function uid() {
    return 'sess_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function blankOfficialAccount() {
    return {
      official_account_status: null,
      verification_method: null,
      verified_at: null,
      help_requested: null,
      selected_key: null,
      submitted_at: null
    };
  }

  function defaultState() {
    return {
      schema: 1,
      session: {
        session_id: uid(),
        campaign_id: cfg.campaignId,
        user_id: null, // 尚未接入身份体系：先记录匿名会话
        hotel_id: null,
        role: 'unassigned', // frontline | admin | unassigned（选择关注点时不做身份判断）
        started_at: nowIso(),
        completed_at: null,
        completion_status: 'in_progress', // in_progress | completed
        last_page_id: 'welcome',
        visited_pages: [],
        page_durations: {},
        page_enter_at: null
      },
      answers: {}, // question_id -> 结构化作答记录
      painPoint: { pain_point_choice: null, selected_at: null },
      /* 页面 2「酒店工作类型」的点选记录（设计稿要求「请点击选择」）：只记类型标识
         （service / consult），不做身份判断，也不改变后面任何页面的内容 */
      needType: { need_type_choice: null, selected_at: null },
      sceneState: {
        delivery_ticket_status: 'pending',
        delivery_claimed_at: null,
        /* 第二章接单小游戏：看到第几幕（0 起算），退出后回来可以接着看 */
        game_act: 0,
        game_act_key: null,
        /* 已经看到过的最后一幕（0 起算）：幕进度点只能点回这一幕及之前，不能跳过没看过的幕 */
        game_act_max: 0,
        /* 点过几次「再看一遍」（0 = 第一遍）：演示重放时用来区分同一道题的多次作答 */
        game_play_count: 0,
        /* 「再看一遍」时，上一遍的作答先挪到这里留档，不丢历史数据 */
        game_quiz_history: [],
        /* 第六幕「飞爪抓取挑战」（模拟领物，不创建真实工单、不发通知）：
           - claw_status：本环节有没有完成（idle 还没领到 / collected 纯净水 × 1 已到手）
           - claw_item：最后一次放爪抓到的物品（water / slippers / towels），用于如实留档
           - claw_skipped：是不是点「跳过游戏」完成的（跳过也算完成，不是失败）
           - claw_grabs / claw_wrong：放了几次爪、抓错几次（抓错只累计次数，不扣分、不写失败） */
        claw_status: 'idle',
        claw_item: null,
        claw_collected_at: null,
        claw_skipped: false,
        claw_grabs: 0,
        claw_wrong: 0,
        /* 第七幕「走廊寻房挑战」（把东西按房号送到房门口那一步）：
           - corridor_status：这一环节有没有走完（idle 还在走廊里 / delivered 已送到 8011 房门口）
           - corridor_room：最后停在谁的房门口（8012 / 8011…），如实留档
           - corridor_skipped：是不是点「跳过走位，直接送达」完成的（跳过也算完成，不是失败）
           - corridor_steps / corridor_cell：走了几步、停在哪一格（只用于自查，不评优劣）
             这里同样没有失败 / 扣分字段：走错门、撞墙都只提示一句，随时能接着走 */
        corridor_status: 'idle',
        corridor_room: null,
        corridor_delivered_at: null,
        corridor_skipped: false,
        corridor_steps: 0,
        corridor_cell: null
      },
      /* 一线员工课件（11 屏）的演示状态：工单从「待处理」走到「已解决」。
         只记录学员在这一版里点到哪一步 —— 不创建真实工单、不发通知、不改管理员版任何字段 */
      frontline: {
        ticket_opened: false,
        fields_seen: [],
        claimed: false,
        claimed_at: null,
        solved: false,
        solved_at: null
      },
      /* 一线员工登记：酒店 + 姓名。只存本机，交卷时随记录一起上报 */
      identity: {
        hotel: '',
        name: '',
        savedAt: null
      },
      /* 课后测试：一屏一题、答完立即判对错；全卷答对 passCorrect 题就算通过 */
      frontlineQuiz: {
        index: 0, // 当前第几题（0 起，指 order 里的位置）
        order: [], // 九道题的出场顺序（每次开始测试重新洗牌）
        optionOrders: [], // 每道题的选项顺序（一起洗，免得背「第二个」）
        correct: 0, // 已答对几题
        revealed: false, // 当前这题是不是已经作答
        chosen: null, // 她选的那一项
        lastCorrect: false,
        log: [], // 每题一条：{ id, chosen, correct }
        passed: false
      },
      feedback: {
        feedback_clarity: null,
        learning_need_category: null,
        free_text_feedback: '',
        related_scene_id: 'scene_delivery',
        created_at: null
      },
      officialAccount: blankOfficialAccount(),
      handoffCardViewed: 0
    };
  }

  function deepMerge(target, source) {
    if (!source || typeof source !== 'object') return target;
    Object.keys(source).forEach(function (key) {
      var value = source[key];
      var targetValue = target[key];
      if (
        value &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        targetValue &&
        typeof targetValue === 'object' &&
        !Array.isArray(targetValue)
      ) {
        deepMerge(targetValue, value);
      } else {
        target[key] = value;
      }
    });
    return target;
  }

  var persistent = true;
  var state = loadState();
  var listeners = [];

  function loadState() {
    var base = defaultState();
    try {
      var rawValue = window.localStorage.getItem(cfg.storageKey);
      if (rawValue) {
        var parsed = JSON.parse(rawValue);
        deepMerge(base, parsed);
        if (!base.session || !base.session.session_id) base.session.session_id = uid();
      }
    } catch (error) {
      persistent = false;
    }
    return base;
  }

  function save() {
    if (!persistent) return;
    try {
      window.localStorage.setItem(cfg.storageKey, JSON.stringify(state));
    } catch (error) {
      persistent = false;
    }
  }

  function notify() {
    listeners.forEach(function (fn) {
      try {
        fn(state);
      } catch (error) {
        /* 单个订阅者出错不影响主流程 */
      }
    });
  }

  function commit() {
    save();
    notify();
  }

  function getState() {
    return state;
  }

  function update(mutator) {
    if (typeof mutator === 'function') mutator(state);
    commit();
    return state;
  }

  function subscribe(fn) {
    listeners.push(fn);
    return function unsubscribe() {
      listeners = listeners.filter(function (item) {
        return item !== fn;
      });
    };
  }

  /* ---------- 会话相关 ---------- */

  function setRole(role) {
    update(function (s) {
      s.session.role = role || s.session.role;
    });
  }

  function enterPage(pageId) {
    update(function (s) {
      s.session.last_page_id = pageId;
      if (s.session.visited_pages.indexOf(pageId) === -1) s.session.visited_pages.push(pageId);
      s.session.page_enter_at = nowIso();
    });
  }

  function leavePage(pageId) {
    var s = state;
    var enteredAt = s.session.page_enter_at ? new Date(s.session.page_enter_at).getTime() : null;
    if (!enteredAt) return 0;
    var seconds = Math.max(0, (Date.now() - enteredAt) / 1000);
    update(function (st) {
      if (!st.session.page_durations[pageId]) st.session.page_durations[pageId] = 0;
      st.session.page_durations[pageId] = Math.round((st.session.page_durations[pageId] + seconds) * 10) / 10;
    });
    return seconds;
  }

  function durationSeconds() {
    var s = state.session;
    var start = new Date(s.started_at).getTime();
    var end = s.completed_at ? new Date(s.completed_at).getTime() : Date.now();
    return Math.max(0, Math.round((end - start) / 1000));
  }

  function completeSession() {
    update(function (s) {
      if (s.session.completion_status === 'completed') return;
      s.session.completed_at = nowIso();
      s.session.completion_status = 'completed';
      s.session.duration_seconds = durationSeconds();
    });
  }

  /* ---------- 作答与业务写入 ---------- */

  function saveAnswer(questionId, payload) {
    var existing = state.answers[questionId];
    var attempts = existing && existing.attempts_count ? existing.attempts_count + 1 : 1;
    var record = {
      question_id: questionId,
      selected_option: payload.selected_option,
      is_correct: payload.is_correct === true,
      attempts_count: attempts,
      response_time_seconds: Math.round(payload.response_time_seconds || 0),
      feedback_category: payload.feedback_category || null,
      scene_id: payload.scene_id || null,
      created_at: nowIso(),
      first_answered_at: existing ? existing.first_answered_at : nowIso()
    };
    update(function (s) {
      s.answers[questionId] = record;
    });
    return record;
  }

  function getAnswer(questionId) {
    return state.answers[questionId] || null;
  }

  function setPainPoint(key) {
    update(function (s) {
      s.painPoint.pain_point_choice = key;
      s.painPoint.selected_at = nowIso();
    });
  }

  /* 页面 2：记下「日常处理的工作类型」（service / consult），用于了解大家面对的是哪一类 */
  function setNeedType(choice) {
    update(function (s) {
      s.needType.need_type_choice = choice;
      s.needType.selected_at = nowIso();
    });
  }

  function claimTicket() {
    update(function (s) {
      if (s.sceneState.delivery_ticket_status === 'claimed') return;
      s.sceneState.delivery_ticket_status = 'claimed';
      s.sceneState.delivery_claimed_at = nowIso();
    });
  }

  /* 记录接单小游戏看到第几幕（本地演示状态，不代表真实系统的任何字段） */
  function setGameAct(index, actKey) {
    update(function (s) {
      var next = typeof index === 'number' ? index : 0;
      s.sceneState.game_act = next;
      s.sceneState.game_act_key = actKey || null;
      /* 只记「走到过的最远一幕」：用来判断哪几个幕进度点已经可以回看 */
      s.sceneState.game_act_max = Math.max(s.sceneState.game_act_max || 0, next);
    });
  }

  /* 第六幕「飞爪抓取挑战」：把这一环节清回「还没领到」。
   * 只动小游戏自己的字段，不碰工单状态与其它页面记录 */
  function resetClawState(s) {
    s.claw_status = 'idle';
    s.claw_item = null;
    s.claw_collected_at = null;
    s.claw_skipped = false;
    s.claw_grabs = 0;
    s.claw_wrong = 0;
  }

  /* 第六幕：放一次爪的结果。
   * payload: { item: 'water' | 'slippers' | 'towels', correct: boolean, viaSkip: boolean }
   * 幂等：抓到纯净水（或跳过）只会在第一次写「已领取」——重复抓取 / 重复点击不会重复记时间，
   * 也不会重复累计完成次数；抓错只累加 claw_wrong（用来决定什么时候帮玩家对准），
   * 不写任何「失败 / 扣分」字段。
   * 返回值给页面用：newly = 这一次才真正记上「已领取」（避免重复吐司、重复推进）
   */
  function recordClawGrab(payload) {
    var input = payload || {};
    var result = { newly: false, status: 'idle', grabs: 0, wrong: 0 };
    update(function (s) {
      var claw = s.sceneState; /* 小游戏字段都记在 sceneState 里（见 defaultState），不往根节点写 */
      if (!input.viaSkip) {
        claw.claw_grabs = (claw.claw_grabs || 0) + 1;
        claw.claw_item = input.item || null;
      }
      if (!input.correct) {
        claw.claw_wrong = (claw.claw_wrong || 0) + 1;
      } else if (claw.claw_status !== 'collected') {
        claw.claw_status = 'collected';
        claw.claw_item = input.item || 'water';
        claw.claw_collected_at = nowIso();
        if (input.viaSkip) claw.claw_skipped = true;
        result.newly = true;
      }
      result.status = claw.claw_status;
      result.grabs = claw.claw_grabs || 0;
      result.wrong = claw.claw_wrong || 0;
    });
    return result;
  }

  /* 「跳过游戏」：直接把「纯净水 × 1」记为已领取，不经过游戏操作。
   * 跳过只代表员工不用玩，不代表没完成这一环节（教学记录里这一环节照样完成） */
  function skipClawGame() {
    return recordClawGrab({ item: 'water', correct: true, viaSkip: true });
  }

  /* 第七幕「走廊寻房挑战」：把这一环节清回「还在走廊里」。
   * 只动小游戏自己的字段，不碰工单状态与其它页面记录 */
  function resetCorridorState(s) {
    s.corridor_status = 'idle';
    s.corridor_room = null;
    s.corridor_delivered_at = null;
    s.corridor_skipped = false;
    s.corridor_steps = 0;
    s.corridor_cell = null;
  }

  /* 第七幕：走完（或跳过）一次「按房号送达」。
   * payload: { room: '8011', steps: number, cell: { col, row }, viaSkip: boolean }
   * 幂等：送到目标房门口（或跳过）只会在第一次写「已送达」——重复走、重复点不会重复记时间，
   * 也不重复累计步数；没送到目标房门口只是如实记「最后停在哪个门口」，不写失败 / 扣分字段。
   * 返回值给页面用：newly = 这一次才真正记上「已送达」（避免重复吐司、重复推进）。
   */
  function deliverToRoom(payload) {
    var input = payload || {};
    var result = { newly: false, status: 'idle', room: null, steps: 0, skipped: false };
    update(function (s) {
      var corridor = s.sceneState; /* 小游戏字段都记在 sceneState 里（见 defaultState），不往根节点写 */
      var arrived = input.room === CORRIDOR_TARGET_ROOM;
      if (arrived) {
        corridor.corridor_room = input.room;
        if (typeof input.steps === 'number') corridor.corridor_steps = input.steps;
        if (input.cell) corridor.corridor_cell = { col: input.cell.col, row: input.cell.row };
      } else if (input.room) {
        /* 只是路过别的房门口：记下「最后停在谁的门口」，不算送达 */
        corridor.corridor_room = input.room;
      }
      if (arrived && corridor.corridor_status !== 'delivered') {
        corridor.corridor_status = 'delivered';
        corridor.corridor_delivered_at = nowIso();
        if (input.viaSkip) corridor.corridor_skipped = true;
        result.newly = true;
      }
      result.status = corridor.corridor_status;
      result.room = corridor.corridor_room;
      result.steps = corridor.corridor_steps || 0;
      result.skipped = !!corridor.corridor_skipped;
    });
    return result;
  }

  /* 「跳过走位，直接送达」：不经过走位，直接把「已送到 8011 房门口」记为完成。
   * 跳过只代表员工不用走这一段，不代表没完成这一环节（教学记录里这一环节照样完成） */
  function skipCorridorRoute() {
    return deliverToRoom({ room: CORRIDOR_TARGET_ROOM, viaSkip: true });
  }

  /* 送到之后再点「再走一次」：只把这一环节清回可玩状态，不动章节进度 */
  function restartCorridorRoute() {
    update(function (s) {
      resetCorridorState(s.sceneState);
    });
    return state.sceneState.corridor_status;
  }

  /* 完成后再点「再抓一次」：只把这一环节清回可玩状态，不动章节进度 */
  function restartClawGame() {
    update(function (s) {
      resetClawState(s.sceneState);
    });
    return state.sceneState.claw_status;
  }

  /* 第二章小游戏「再看一遍」（同一场培训里重放用）：
   * - 幕进度回到第 1 幕，可回看范围也清零（没看过的幕仍然点不动，保持教学顺序）
   * - 工单状态回到「待处理」，第五幕的「领取」按钮重新出现
   * - 第三幕的作答先挪进 game_quiz_history 留档再清掉，让题目可以重新作答
   *   （作答过程另有 quiz_answer 行为事件留档，见 core/analytics.js#track）
   * - 第六幕的飞爪抓取、第七幕的走廊寻房一起清回起点，重放整章时小游戏可以重新玩
   */
  function restartDeliveryGame(questionId) {
    update(function (s) {
      s.sceneState.game_act = 0;
      s.sceneState.game_act_key = null;
      s.sceneState.game_act_max = 0;
      s.sceneState.game_play_count = (s.sceneState.game_play_count || 0) + 1;
      s.sceneState.delivery_ticket_status = 'pending';
      s.sceneState.delivery_claimed_at = null;
      resetClawState(s.sceneState);
      /* 第七幕的走廊寻房一起清回起点：重放整章时这一段可以重新走 */
      resetCorridorState(s.sceneState);
      if (questionId && s.answers[questionId]) {
        if (!s.sceneState.game_quiz_history) s.sceneState.game_quiz_history = [];
        s.sceneState.game_quiz_history.push(s.answers[questionId]);
        delete s.answers[questionId];
      }
    });
    return state.sceneState.game_play_count;
  }

  /* ---------- 一线员工课件（11 屏）：工单从待处理走到已解决 ----------
   * 只写本机演示状态；没有失败 / 扣分字段，走错了重走一遍就行。
   */

  /* 屏 3：点开手机上的工单消息 */
  function openFrontlineTicket() {
    update(function (s) {
      s.frontline.ticket_opened = true;
    });
  }

  /* 屏 4：看清一个字段（房间号 / 服务分类 / 服务项），重复点不重复记 */
  function seeFrontlineField(key) {
    if (!key) return;
    update(function (s) {
      if (s.frontline.fields_seen.indexOf(key) === -1) s.frontline.fields_seen.push(key);
    });
  }

  /* 屏 5：领取。幂等：重复点不会重复记时间 */
  function claimFrontlineTicket() {
    update(function (s) {
      s.frontline.ticket_opened = true;
      if (s.frontline.claimed) return;
      s.frontline.claimed = true;
      s.frontline.claimed_at = nowIso();
    });
    return state.frontline.claimed;
  }

  /* 屏 9：解决。只有领取过的工单才谈得上解决，没领取时也允许点，但会先补记领取 */
  function solveFrontlineTicket() {
    update(function (s) {
      s.frontline.ticket_opened = true;
      s.frontline.claimed = true;
      if (!s.frontline.claimed_at) s.frontline.claimed_at = nowIso();
      if (s.frontline.solved) return;
      s.frontline.solved = true;
      s.frontline.solved_at = nowIso();
    });
    return state.frontline.solved;
  }

  /* 「再看一遍」：把这一版演示工单清回「待处理」，不动其它任何记录 */
  function resetFrontlineTicket() {
    update(function (s) {
      s.frontline = {
        ticket_opened: false,
        fields_seen: [],
        claimed: false,
        claimed_at: null,
        solved: false,
        solved_at: null
      };
    });
    return state.frontline;
  }

  /* ---------- 一线员工登记 ---------- */

  function saveIdentity(hotel, name) {
    update(function (s) {
      s.identity = {
        hotel: String(hotel || '').trim(),
        name: String(name || '').trim(),
        savedAt: Date.now()
      };
    });
    return state.identity;
  }

  /* ---------- 课后测试 ---------- */

  function quizPassTarget() {
    var quiz = HKR.config.frontline && HKR.config.frontline.quiz;
    return (quiz && quiz.passCorrect) || 2;
  }

  /* 选了一个选项：记下来、判对错；答对够数就把 passed 置上 */
  function answerQuiz(optionValue, isCorrect) {
    update(function (s) {
      var q = s.frontlineQuiz;
      if (q.revealed) return; // 同一题不重复计分
      q.revealed = true;
      q.chosen = optionValue;
      q.lastCorrect = isCorrect === true;
      if (q.lastCorrect) q.correct += 1;
      q.log.push({ index: q.index, chosen: optionValue, correct: q.lastCorrect });
      if (q.correct >= quizPassTarget()) q.passed = true;
    });
    return state.frontlineQuiz;
  }

  /* 下一题：清掉作答态，题号 +1 */
  function nextQuizQuestion() {
    update(function (s) {
      var q = s.frontlineQuiz;
      q.index += 1;
      q.revealed = false;
      q.chosen = null;
      q.lastCorrect = false;
    });
    return state.frontlineQuiz;
  }

  /* 洗牌：Fisher–Yates，就地打乱一个新数组 */
  function shuffled(count) {
    var arr = [];
    for (var i = 0; i < count; i += 1) arr.push(i);
    for (var j = arr.length - 1; j > 0; j -= 1) {
      var k = Math.floor(Math.random() * (j + 1));
      var tmp = arr[j];
      arr[j] = arr[k];
      arr[k] = tmp;
    }
    return arr;
  }

  /* 开始一轮测试：题目顺序和每题选项顺序都重新洗一遍（同一轮里不会再变） */
  function shuffleQuiz(total, optionCounts) {
    update(function (s) {
      s.frontlineQuiz.order = shuffled(total || 0);
      s.frontlineQuiz.optionOrders = (optionCounts || []).map(function (n) {
        return shuffled(n);
      });
    });
    return state.frontlineQuiz;
  }

  function resetQuiz() {
    update(function (s) {
      s.frontlineQuiz = {
        index: 0,
        order: [],
        optionOrders: [],
        correct: 0,
        revealed: false,
        chosen: null,
        lastCorrect: false,
        log: [],
        passed: false
      };
    });
    return state.frontlineQuiz;
  }

  function saveFeedback(payload) {
    update(function (s) {
      s.feedback.feedback_clarity = payload.feedback_clarity;
      s.feedback.learning_need_category = payload.learning_need_category;
      s.feedback.free_text_feedback = payload.free_text_feedback || '';
      s.feedback.related_scene_id = payload.related_scene_id || s.feedback.related_scene_id;
      s.feedback.created_at = nowIso();
    });
  }

  function saveOfficialAccount(selection) {
    update(function (s) {
      s.officialAccount.official_account_status = selection.record.official_account_status;
      s.officialAccount.verification_method = selection.record.verification_method;
      // 第一版没有关注/绑定校验接口：verified_at 始终为 null，绝不写入 verified = true
      s.officialAccount.verified_at = selection.record.verified_at;
      s.officialAccount.help_requested = selection.record.help_requested;
      s.officialAccount.selected_key = selection.key;
      s.officialAccount.submitted_at = nowIso();
    });
  }

  function markHandoffCardViewed() {
    update(function (s) {
      s.handoffCardViewed += 1;
    });
  }

  function reset() {
    state = defaultState();
    try {
      window.localStorage.removeItem(cfg.storageKey);
    } catch (error) {
      /* 忽略：无 localStorage 时仅内存重置 */
    }
    /* 写入动作正常靠 commit 持久化；重置本身只移除记录并通知界面，不再把空状态写回 */
    notify();
    return state;
  }

  HKR.core.store = {
    getState: getState,
    update: update,
    subscribe: subscribe,
    setRole: setRole,
    enterPage: enterPage,
    leavePage: leavePage,
    completeSession: completeSession,
    durationSeconds: durationSeconds,
    saveAnswer: saveAnswer,
    getAnswer: getAnswer,
    setPainPoint: setPainPoint,
    setNeedType: setNeedType,
    claimTicket: claimTicket,
    setGameAct: setGameAct,
    recordClawGrab: recordClawGrab,
    skipClawGame: skipClawGame,
    restartClawGame: restartClawGame,
    deliverToRoom: deliverToRoom,
    skipCorridorRoute: skipCorridorRoute,
    restartCorridorRoute: restartCorridorRoute,
    restartDeliveryGame: restartDeliveryGame,
    openFrontlineTicket: openFrontlineTicket,
    seeFrontlineField: seeFrontlineField,
    claimFrontlineTicket: claimFrontlineTicket,
    solveFrontlineTicket: solveFrontlineTicket,
    resetFrontlineTicket: resetFrontlineTicket,
    answerQuiz: answerQuiz,
    saveIdentity: saveIdentity,
    nextQuizQuestion: nextQuizQuestion,
    resetQuiz: resetQuiz,
    shuffleQuiz: shuffleQuiz,
    saveFeedback: saveFeedback,
    saveOfficialAccount: saveOfficialAccount,
    markHandoffCardViewed: markHandoffCardViewed,
    reset: reset,
    isPersistent: function () {
      return persistent;
    },
    nowIso: nowIso,
    uid: uid
  };
})();
