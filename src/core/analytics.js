/* 数据记录层
 * 第一版没有后端：所有记录都保存在本机 localStorage。
 * 后端就绪时，把 config/app.config.js 里的 api.enabled 改为 true 并填 endpoint，
 * buildPayload() 生成的结构可以直接 POST 上去，字段与需求文档第七节一一对应。
 */
window.HKR = window.HKR || {};
HKR.core = HKR.core || {};

(function () {
  var cfg = HKR.config.app;
  var store = HKR.core.store;
  var LOCAL_ONLY_NOTE = '本地记录：仅保存在当前设备的浏览器 localStorage，未提交到服务端。';

  function readEvents() {
    try {
      var rawValue = window.localStorage.getItem(cfg.eventStorageKey);
      return rawValue ? JSON.parse(rawValue) : [];
    } catch (error) {
      return [];
    }
  }

  function writeEvents(events) {
    try {
      window.localStorage.setItem(cfg.eventStorageKey, JSON.stringify(events.slice(-500)));
    } catch (error) {
      /* localStorage 不可用时丢弃事件，不影响体验 */
    }
  }

  /* 行为事件（用于排查流程卡点，与业务记录分开存放） */
  function track(eventName, payload) {
    var events = readEvents();
    events.push({
      event: eventName,
      session_id: store.getState().session.session_id,
      page_id: store.getState().session.last_page_id,
      payload: payload || null,
      created_at: store.nowIso()
    });
    writeEvents(events);
  }

  function answerToSceneInteraction(questionId, answer) {
    return {
      scene_id: answer.scene_id,
      question_id: questionId,
      selected_option: answer.selected_option,
      is_correct: answer.is_correct,
      attempts_count: answer.attempts_count,
      response_time_seconds: answer.response_time_seconds,
      feedback_category: answer.feedback_category,
      created_at: answer.created_at
    };
  }

  function buildPayload() {
    var state = store.getState();
    var interactions = Object.keys(state.answers).map(function (questionId) {
      return answerToSceneInteraction(questionId, state.answers[questionId]);
    });

    return {
      /* 0. 结构与会话信息：后端可以只靠这两块做会话级聚合、去重 */
      schema: state.schema,
      session: {
        session_id: state.session.session_id,
        campaign_id: state.session.campaign_id,
        user_id: state.session.user_id, // 暂无身份体系：null = 匿名会话
        hotel_id: state.session.hotel_id,
        role: state.session.role,
        started_at: state.session.started_at,
        completed_at: state.session.completed_at,
        completion_status: state.session.completion_status,
        duration_seconds: store.durationSeconds()
      },
      /* 1. 体验记录 */
      experience_record: {
        session_id: state.session.session_id,
        campaign_id: state.session.campaign_id,
        user_id: state.session.user_id, // 暂无身份体系：null = 匿名会话
        hotel_id: state.session.hotel_id,
        role: state.session.role,
        started_at: state.session.started_at,
        completed_at: state.session.completed_at,
        completion_status: state.session.completion_status,
        duration_seconds: store.durationSeconds(),
        page_durations: state.session.page_durations,
        visited_pages: state.session.visited_pages
      },
      /* 2. 产品价值反馈 */
      product_value_feedback: {
        pain_point_choice: state.painPoint.pain_point_choice,
        selected_at: state.painPoint.selected_at,
        /* 页面 2 点选的「日常处理的工作类型」：service（服务类）/ consult（咨询类） */
        work_type_choice: state.needType.need_type_choice,
        work_type_selected_at: state.needType.selected_at
      },
      /* 3. 场景互动记录 */
      scene_interactions: interactions,
      /* 附加：送物场景的模拟领取状态（原型内的状态，不代表真实工单） */
      simulated_scene_state: {
        delivery_ticket_status: state.sceneState.delivery_ticket_status,
        delivery_claimed_at: state.sceneState.delivery_claimed_at,
        game_act: state.sceneState.game_act,
        game_act_key: state.sceneState.game_act_key,
        game_act_max: state.sceneState.game_act_max,
        game_play_count: state.sceneState.game_play_count,
        /* 第六幕「飞爪抓取挑战」的结果（模拟领物，不代表真实工单）：
           只记「领到没有 / 抓了几次 / 抓错几次 / 是不是跳过的」，没有失败 / 扣分字段 */
        claw_status: state.sceneState.claw_status,
        claw_item: state.sceneState.claw_item,
        claw_skipped: state.sceneState.claw_skipped,
        claw_grabs: state.sceneState.claw_grabs,
        claw_wrong: state.sceneState.claw_wrong,
        /* 第七幕「走廊寻房挑战」的结果（按房号把东西送到 8011 房门口）：
           只记「送到没有 / 走了几步 / 最后停在哪个门口 / 是不是跳过的」，没有失败字段 */
        corridor_status: state.sceneState.corridor_status,
        corridor_room: state.sceneState.corridor_room,
        corridor_skipped: state.sceneState.corridor_skipped,
        corridor_steps: state.sceneState.corridor_steps
      },
      /* 4. 用户困惑反馈 */
      user_confusion_feedback: {
        feedback_clarity: state.feedback.feedback_clarity,
        learning_need_category: state.feedback.learning_need_category,
        free_text_feedback: state.feedback.free_text_feedback,
        related_scene_id: state.feedback.related_scene_id,
        created_at: state.feedback.created_at
      },
      /* 5. 公众号任务状态（第一版永远是「自我确认」，不是系统核验） */
      official_account_task: {
        official_account_status: state.officialAccount.official_account_status,
        verification_method: state.officialAccount.verification_method || cfg.officialAccount.verification.method,
        verified: false, // 硬编码为 false：没有校验接口前不声称系统已验证
        verified_at: state.officialAccount.verified_at,
        help_requested: state.officialAccount.help_requested,
        submitted_at: state.officialAccount.submitted_at,
        note: cfg.officialAccount.verification.note
      },
      meta: {
        h5_version: cfg.version,
        storage: store.isPersistent() ? 'localStorage' : 'memory-only',
        local_only: !cfg.api.enabled,
        note: LOCAL_ONLY_NOTE,
        generated_at: store.nowIso(),
        user_agent: navigator.userAgent
      }
    };
  }

  function exportJson() {
    return JSON.stringify(buildPayload(), null, 2);
  }

  /* 预留的后端出口：第一版被 api.enabled = false 挡住，永远不会真的发请求 */
  function flushToServer() {
    if (!cfg.api.enabled || !cfg.api.endpoint) {
      return Promise.resolve({ sent: false, reason: 'api_disabled', note: LOCAL_ONLY_NOTE });
    }
    var payload = buildPayload();
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', cfg.api.endpoint, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      Object.keys(cfg.api.headers || {}).forEach(function (key) {
        xhr.setRequestHeader(key, cfg.api.headers[key]);
      });
      xhr.timeout = cfg.api.timeoutMs || 8000;
      xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) resolve({ sent: true, status: xhr.status, payload: payload });
        else reject(new Error('上传失败，状态码 ' + xhr.status));
      };
      xhr.onerror = function () {
        reject(new Error('上传失败：网络错误'));
      };
      xhr.ontimeout = function () {
        reject(new Error('上传失败：超时'));
      };
      xhr.send(JSON.stringify(payload));
    });
  }

  function clearLocalRecords() {
    try {
      window.localStorage.removeItem(cfg.eventStorageKey);
    } catch (error) {
      /* 忽略 */
    }
    store.reset();
  }

  HKR.core.analytics = {
    track: track,
    buildPayload: buildPayload,
    exportJson: exportJson,
    flushToServer: flushToServer,
    clearLocalRecords: clearLocalRecords,
    localOnlyNote: LOCAL_ONLY_NOTE,
    getEvents: readEvents
  };
})();
