/* 第六幕「飞爪抓取挑战」：一个真能玩的互动小游戏（不是静态插画）
 *
 * 教学目标：客人提出服务需求后，员工要按工单内容准备并领取「正确的物品」。
 * 本关：客人要纯净水 × 1，台面上还摆着拖鞋和毛巾；玩家操纵顶部的飞爪去抓纯净水。
 *
 * 三条设计红线（动判定之前先读一遍）：
 *  1. 只考「选对物品」，不考操作精度：判定不是像素碰撞，而是「释放方向 + 宽容区 + 自动吸附」。
 *  2. 不允许无意义的失败：落在宽容区外时按最近的物品兜底，不会出现「爪子对准了却抓空」。
 *  3. 连续抓错到 assist.afterWrong 次（默认 2）后直接帮玩家对准正确物品，不让任何人卡关；
 *     抓错也不扣分、不计时、不写失败——只累计次数。
 *
 * 坐标：全部在 320 × 250 的 viewBox 里（下面 VIEW / ITEMS）。绘制、判定、动画共用这一套坐标，
 * 页面只需要给它一块「宽度自适应」的容器：360 / 390 / 430 屏上判定区域不会偏移，
 * 也不存在任何写死的屏幕像素坐标。
 *
 * 生命周期：render() 返回 { destroy, getState }。rAF 只在「节点还挂在页面上」时继续跑，
 * 换幕 / 离开页面时节点被换掉，循环自己停掉；destroy() 也会显式停掉，不残留定时器与监听器。
 * 帧源：优先 rAF；若这个环境不产帧（低端 webview 节流 / 无头回归），看门狗会自动改用定时器接着跑。

 */
window.HKR = window.HKR || {};
HKR.components = HKR.components || {};

(function () {
  var ui = HKR.core.ui;

  /* ==================== 一、布局（viewBox 坐标，绘制与判定共用） ==================== */
  var VIEW = { w: 320, h: 250 };
  var RAIL_Y = 30; /* 横梁：飞爪在上面左右走 */
  var REST_Y = 52; /* 飞爪待机高度 */
  var COUNTER_Y = 176; /* 台面：三件物品都放在这条线上 */
  var MID_X = VIEW.w / 2;
  var AMPLITUDE = 118; /* 摆动范围 42 ~ 278：三件物品的中心都落在里面 */
  var GRAB_GAP = 26; /* 爪尖停在物品顶上方多少：留一点缝隙，看起来才是「抓住」 */
  var OPEN_ANGLE = 24; /* 爪子张开 / 合拢的角度 */
  var DIR_WEIGHT = 30; /* 释放方向的权重：落在两件物品宽容区的重叠带时，按方向定物品 */
  var ASSIST_AFTER_WRONG = 2;
  var DEFAULT_SWING_PERIOD = 4800;

  /* 三件物品：x 是中心，zone 是「宽容区」半宽 —— 比图像本身大得多，只要落在宽容区里就算对准。
   * 拖鞋 / 毛巾各 62，纯净水给到 78（本关正确物品的宽容区最大）：
   * 三个区在 320 宽的画面里首尾相接，台面上没有任何「抓不到」的位置。 */
  var ITEMS = [
    { key: 'slippers', x: 52, zone: 62, height: 8, art: 'slippers', opts: {} },
    { key: 'water', x: 160, zone: 78, height: 40, art: 'bottle', opts: { shadow: false } },
    { key: 'towels', x: 268, zone: 62, height: 18, art: 'towel-stack', opts: { width: 46 } }
  ];

  function clamp(value, min, max) {
    return value < min ? min : value > max ? max : value;
  }

  function lerp(from, to, p) {
    return from + (to - from) * p;
  }

  function easeOut(p) {
    return 1 - (1 - p) * (1 - p);
  }

  function easeIn(p) {
    return p * p;
  }

  function easeInOut(p) {
    return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
  }

  function round2(value) {
    return Math.round(value * 100) / 100;
  }

  function itemByKey(key) {
    for (var i = 0; i < ITEMS.length; i++) {
      if (ITEMS[i].key === key) return ITEMS[i];
    }
    return ITEMS[1];
  }

  /* ==================== 二、纯函数：摆动位置 / 方向 / 宽容判定（自测直接调这几个） ==================== */

  /* 摆动位置：正弦来回，速度适中、转向平滑（不会出现突然跳跃）。
   * elapsedMs 从进入这一幕算起，periodMs 是一个完整来回（默认 4.8s）。 */
  function positionAt(elapsedMs, periodMs) {
    var period = periodMs || DEFAULT_SWING_PERIOD;
    return MID_X + AMPLITUDE * Math.sin((2 * Math.PI * elapsedMs) / period);
  }

  /* 摆动方向：+1 向右、-1 向左（判定用的是「释放那一刻的方向」） */
  function directionAt(elapsedMs, periodMs) {
    var period = periodMs || DEFAULT_SWING_PERIOD;
    return Math.cos((2 * Math.PI * elapsedMs) / period) >= 0 ? 1 : -1;
  }

  /* 自测用：飞爪摆到 x 上的时刻（取下摆那一次，此时方向为「向左」）。
   * tests/smoke.js 用它制造一次「抓错拖鞋」的真实点击。 */
  function timeAtX(x, periodMs) {
    var period = periodMs || DEFAULT_SWING_PERIOD;
    var ratio = clamp((x - MID_X) / AMPLITUDE, -1, 1);
    var theta = Math.PI - Math.asin(ratio);
    return (theta / (2 * Math.PI)) * period;
  }

  /* 宽容判定（本关的核心）：
   *  1. 落在某件物品的宽容区里 → 候选；区外按最近的物品兜底，绝不抓空；
   *  2. 相邻两件物品的宽容区有重叠 → 与释放方向一致的那件加权重，再看谁更近
   *     （所以「爪子向左摆时松手」偏向左边那件，「向右摆时松手」偏向右边那件）；
   *  3. 连续抓错到 assistAfterWrong 次 → 直接把目标定成正确物品（assisted: true）。
   * 返回的 x 就是物品中心：动画会把爪子吸附过去，玩家不需要自己对准。 */
  function judge(clawX, direction, options) {
    var opts = options || {};
    var x = clamp(typeof clawX === 'number' ? clawX : MID_X, 0, VIEW.w);
    var dir = direction > 0 ? 1 : direction < 0 ? -1 : 0;
    var answer = itemByKey(opts.answer || 'water');
    var dirWeight = opts.dirWeight === undefined ? DIR_WEIGHT : opts.dirWeight;
    var assistAfter = opts.assistAfterWrong === undefined ? ASSIST_AFTER_WRONG : opts.assistAfterWrong;
    var wrongStreak = opts.wrongStreak || 0;

    if (wrongStreak >= assistAfter) {
      return { key: answer.key, x: answer.x, distance: Math.abs(x - answer.x), direction: dir, assisted: true };
    }

    var best = null;
    for (var i = 0; i < ITEMS.length; i++) {
      var item = ITEMS[i];
      var distance = Math.abs(x - item.x);
      if (distance > item.zone) continue;
      var toward = dir !== 0 && (item.x - x) * dir > 0;
      var score = item.zone - distance + (toward ? dirWeight : 0);
      if (!best || score > best.score) best = { item: item, score: score, distance: distance };
    }
    if (!best) best = { item: nearestItem(x), score: 0, distance: 0 };
    return { key: best.item.key, x: best.item.x, distance: best.distance, direction: dir, assisted: false };
  }

  function nearestItem(x) {
    var nearest = ITEMS[0];
    var bestDistance = Math.abs(x - nearest.x);
    for (var i = 1; i < ITEMS.length; i++) {
      var distance = Math.abs(x - ITEMS[i].x);
      if (distance < bestDistance) {
        bestDistance = distance;
        nearest = ITEMS[i];
      }
    }
    return nearest;
  }

  /* 爪尖该停的高度：物品顶再往上留 GRAB_GAP，三件物品都够得着 */
  function dropYFor(key) {
    return COUNTER_Y - itemByKey(key).height - GRAB_GAP;
  }

  /* ==================== 三、绘制（复用 illustration.js 的色板 / 原语 / 道具） ==================== */

  /* 面板 / 道具都从 illustration 拿：同一章里不会出现「两个样子的纯净水」 */
  function ensureArt() {
    var illustration = HKR.components.illustration;
    return { C: illustration.palette, S: illustration.svg, prop: illustration.prop };
  }

  function backdropMarkup() {
    var A = ensureArt();
    var r = A.S.r, c = A.S.c;
    return (
      r(0, 0, VIEW.w, VIEW.h, 0, '#f7f9fc') +
      r(0, 60, VIEW.w, COUNTER_Y - 60, 0, '#fbfcfe') +
      r(0, 58, VIEW.w, 2, 0, '#e8edf4') +
      /* 服务间的条形台：所有物品都「放在台面上」，不是浮在画面里 */
      r(0, COUNTER_Y, VIEW.w, 3, 0, '#d8c7ae') +
      r(0, COUNTER_Y + 3, VIEW.w, VIEW.h - COUNTER_Y - 3, 0, '#efe7db') +
      r(0, VIEW.h - 12, VIEW.w, 12, 0, '#e6dccb') +
      /* 飞爪的轨道 */
      r(24, RAIL_Y - 5, VIEW.w - 48, 6, 3, '#dbe3ec') +
      c(24, RAIL_Y - 2, 4, '#c6d2e0') +
      c(VIEW.w - 24, RAIL_Y - 2, 4, '#c6d2e0')
    );
  }

  function itemShadowMarkup(item) {
    var A = ensureArt();
    var rx = item.key === 'water' ? 10 : 22;
    return A.S.at(item.x, COUNTER_Y + 1, A.S.e(0, 0, rx, 3, A.C.shadowSoft));
  }

  /* 每件物品都带一份「放在台面上」的接触阴影，阴影不跟着爪子走 */
  function itemsMarkup() {
    var A = ensureArt();
    return ITEMS.map(function (item) {
      return (
        itemShadowMarkup(item) +
        '<g data-role="item" data-item="' + item.key + '" transform="translate(' + item.x + ' ' + COUNTER_Y + ')">' +
        A.prop(item.art, item.opts || {}) +
        '</g>'
      );
    }).join('');
  }

  function rigMarkup() {
    var A = ensureArt();
    var r = A.S.r, c = A.S.c, p = A.S.p;
    return (
      '<g class="claw__rig" data-role="rig" transform="translate(' + MID_X + ' 0)">' +
      /* 小车（在横梁上滑） */
      r(-15, RAIL_Y - 13, 30, 13, 3.5, '#54697f') +
      c(-8, RAIL_Y + 1, 2.6, '#8fa6bc') +
      c(8, RAIL_Y + 1, 2.6, '#8fa6bc') +
      /* 缆绳：高度每帧写一次（跟着爪子升降） */
      r(-1.1, RAIL_Y + 2, 2.2, 6, 1.1, '#9fb4c8', 'data-role="cable"') +
      '<g data-role="head" transform="translate(0 ' + REST_Y + ')">' +
      r(-13, -16, 26, 13, 4, '#4b5d73') +
      r(-3.4, -19, 6.8, 4, 2, '#3d4753') +
      '<g data-role="prong-left" transform="rotate(' + OPEN_ANGLE + ' -11 -3)">' +
      p('M-11,-3 L-4,-3 L-5,6 L-1,20 L-6,22 L-9,8 Z', '#5a6c80') +
      '</g>' +
      '<g data-role="prong-right" transform="rotate(' + -OPEN_ANGLE + ' 11 -3)">' +
      p('M11,-3 L4,-3 L5,6 L1,20 L6,22 L9,8 Z', '#5a6c80') +
      '</g>' +
      '</g>' +
      '</g>'
    );
  }

  function labelOf(key, labels) {
    for (var i = 0; i < labels.length; i++) {
      if (labels[i].key === key) return labels[i].label;
    }
    return key;
  }

  /* 一幕的骨架：任务提示（画面右上方）→ 游戏区 → 物品名（和画面左→右同序）→ 提示行 → 「抓取」按钮。
   * 任务提示是独立的一行，不压在游戏区里 —— 它不会挡住飞爪的摆动范围和台面上的物品。 */
  function shellMarkup(cfg) {
    var labels = cfg.items || [];
    var legend = ITEMS.map(function (item) {
      return ui.html`<li class="claw__legend-item" data-legend="${item.key}">${labelOf(item.key, labels)}</li>`;
    });
    /* 「跳过游戏」是低强调入口：不占主按钮位置、不用红色，一次点击就能过。
       点击由页面（data-action 委托）处理：直接把「纯净水 × 1」记为已领取，失败 / 扣分都不存在。 */
    var skip = cfg.skip || {};
    var skipMarkup = skip.label
      ? ui.html`<button class="linkbtn linkbtn--center claw__skip" type="button" data-action="claw-skip" aria-label="${skip.ariaLabel || skip.label}">${skip.label}</button>`
      : '';
    var noteMarkup = cfg.playNote ? ui.html`<p class="claw__note">${cfg.playNote}</p>` : '';
    return ui.html`
      <div class="claw" data-role="claw" data-phase="swing">
        <div class="claw__task">
          <p class="claw__task-line">${cfg.taskLine}</p>
          <p class="claw__task-item">${cfg.taskItem}<span class="claw__task-count">${cfg.taskCount}</span></p>
        </div>
        <div class="claw__board" data-role="claw-board" role="img" aria-label="${cfg.boardLabel}">
          <svg class="claw__svg" viewBox="0 0 ${VIEW.w} ${VIEW.h}" xmlns="http://www.w3.org/2000/svg" focusable="false" aria-hidden="true">
            ${ui.raw(backdropMarkup() + itemsMarkup() + rigMarkup())}
          </svg>
          <p class="claw__flash" data-role="claw-flash" aria-hidden="true"></p>
        </div>
        <ul class="claw__legend" aria-label="${cfg.legendLabel}">${ui.raw(legend.join(''))}</ul>
        <p class="claw__hint" data-role="claw-hint" role="status" aria-live="polite"></p>
        <button class="btn btn--navy btn--lg claw__release" type="button" data-action="claw-release">${cfg.releaseLabel}</button>
        <p class="claw__tip">${cfg.tip}</p>
        ${ui.raw(skipMarkup)}
        ${ui.raw(noteMarkup)}
      </div>
    `;
  }

  /* ==================== 四、装配：动画 + 交互 ==================== */
  function render(host, options) {
    var opts = options || {};
    var cfg = opts.config || {};
    var timing = cfg.timing || {};
    var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    /* 尊重系统偏好：摆动放慢一倍、各段动画缩短（玩法不变，只是更温和） */
    var period = (timing.swingPeriodMs || DEFAULT_SWING_PERIOD) * (reduceMotion ? 2 : 1);
    var snapMs = reduceMotion ? 120 : timing.snapMs || 180;
    var dropMs = reduceMotion ? 280 : timing.dropMs || 520;
    var gripMs = reduceMotion ? 90 : timing.gripMs || 140;
    var liftMs = reduceMotion ? 320 : timing.liftMs || 620;
    var settleMs = reduceMotion ? 160 : timing.settleMs || 320;
    var answerKey = cfg.answer || 'water';
    var assistAfter = (cfg.assist && cfg.assist.afterWrong) || ASSIST_AFTER_WRONG;
    var wrongHint = cfg.wrongHint || '';
    var assistHint = cfg.assistHint || '';
    var successTitle = (cfg.success && cfg.success.title) || '';
    var successNote = (cfg.success && cfg.success.note) || '';
    var flashMs = timing.successHoldMs || 2000; /* 成功提示停留多久：跟页面切换「已完成」卡片的节奏一致 */

    ui.setHtml(host, shellMarkup(cfg));
    var root = host.firstElementChild;
    var board = ui.$('[data-role="claw-board"]', root);
    var release = ui.$('[data-action="claw-release"]', root);
    var hintBox = ui.$('[data-role="claw-hint"]', root);
    var flash = ui.$('[data-role="claw-flash"]', root);
    var rig = ui.$('[data-role="rig"]', root);
    var cable = ui.$('[data-role="cable"]', root);
    var head = ui.$('[data-role="head"]', root);
    var prongLeft = ui.$('[data-role="prong-left"]', root);
    var prongRight = ui.$('[data-role="prong-right"]', root);
    var itemNodes = {};
    var legendNodes = {};
    ITEMS.forEach(function (item) {
      itemNodes[item.key] = ui.$('[data-item="' + item.key + '"]', root);
      legendNodes[item.key] = ui.$('[data-legend="' + item.key + '"]', root);
    });

    var wrongStreak = opts.wrongStreak || 0;
    var alive = true;
    var lastTs = 0;
    /* 帧源：优先 rAF；rAF 不来时（见 scheduleFrame 的看门狗）改用定时器 */
    var FRAME_MS = 16; /* 目标帧间隔：约 60fps */
    var WATCHDOG_MS = 80; /* 调度 rAF 后多久没等到帧就判定「这个环境不产帧」 */
    var rafId = 0;
    var timerId = 0;
    var watchdogId = 0;
    var useTimers = false;
    var state = {
      phase: 'swing',
      swingClock: 0 /* 摆动自己的时钟：抓取过程中继续走，回到摆动时不会跳 */,
      phaseClock: 0,
      clawX: MID_X,
      headY: REST_Y,
      grip: 0,
      carry: 0,
      releaseX: MID_X,
      targetKey: null,
      targetX: MID_X,
      targetDropY: REST_Y,
      correct: false,
      assisted: false
    };

    function setHint(text) {
      hintBox.textContent = text || '';
    }

    function markLegend(key, on) {
      var node = legendNodes[key];
      if (node) node.className = 'claw__legend-item' + (on ? ' is-hit' : '');
    }

    function clearLegend() {
      ITEMS.forEach(function (item) {
        markLegend(item.key, false);
      });
    }

    /* 把这一帧的位置写进 SVG：只改属性、不重建 DOM，手机上跑得动 */
    function paintRig() {
      rig.setAttribute('transform', 'translate(' + round2(state.clawX) + ' 0)');
      cable.setAttribute('height', Math.max(2, round2(state.headY - RAIL_Y - 17)));
      head.setAttribute('transform', 'translate(0 ' + round2(state.headY) + ')');
      var open = round2(OPEN_ANGLE * (1 - state.grip));
      prongLeft.setAttribute('transform', 'rotate(' + open + ' -11 -3)');
      prongRight.setAttribute('transform', 'rotate(' + -open + ' 11 -3)');
      ITEMS.forEach(function (item) {
        var node = itemNodes[item.key];
        if (!node) return;
        var carried = state.carry > 0 && state.targetKey === item.key ? state.carry : 0;
        node.setAttribute('transform', 'translate(' + item.x + ' ' + round2(COUNTER_Y - carried) + ')');
      });
    }

    /* 放爪：定目标 → 下落 → 合爪 → 回收。抓取过程里 release 一直是 disabled 的，
       避免连点把动画状态打乱；抓错后回到 swing 才重新可用。 */
    function startGrab() {
      if (state.phase !== 'swing' || release.disabled) return;
      var decision = judge(state.clawX, directionAt(state.swingClock, period), {
        answer: answerKey,
        wrongStreak: wrongStreak,
        assistAfterWrong: assistAfter
      });
      state.releaseX = state.clawX;
      state.targetKey = decision.key;
      state.targetX = decision.x; /* 自动吸附：动画把爪子贴到这个 x 上，玩家不用自己对准 */
      state.targetDropY = dropYFor(decision.key);
      state.assisted = decision.assisted;
      state.correct = false;
      state.phase = 'drop';
      state.phaseClock = 0;
      release.disabled = true;
      root.setAttribute('data-phase', 'drop');
      board.setAttribute('data-target', decision.key);
      flash.textContent = '';
      flash.className = 'claw__flash';
      clearLegend();
      /* 说明只在需要时出现一次，不反复弹同一句话 */
      setHint(decision.assisted ? assistHint : '');
      if (typeof opts.onRelease === 'function') {
        opts.onRelease({
          key: decision.key,
          assisted: decision.assisted,
          distance: decision.distance,
          direction: decision.direction
        });
      }
    }

    function resolveGrab() {
      state.correct = state.targetKey === answerKey;
      markLegend(state.targetKey, true);
      if (state.correct) {
        root.setAttribute('data-phase', 'done');
        flash.textContent = successTitle;
        flash.style.animationDuration = flashMs + 'ms'; /* 停留时长跟着 timing 配置走 */
        flash.className = 'claw__flash is-on';
        setHint(successNote); /* 成功之后在提示行里说明「接下来做什么」 */
      } else {
        wrongStreak += 1;
        root.setAttribute('data-phase', 'retry');
        setHint(wrongHint);
      }
      if (typeof opts.onResult === 'function') {
        opts.onResult({
          key: state.targetKey,
          correct: state.correct,
          assisted: state.assisted,
          wrongStreak: wrongStreak
        });
      }
    }

    function advance(dt) {
      state.swingClock += dt;
      if (state.phase === 'swing') {
        state.clawX = positionAt(state.swingClock, period);
        state.headY = REST_Y;
        state.grip = 0;
        state.carry = 0;
      } else if (state.phase === 'drop') {
        state.phaseClock += dt;
        state.clawX = lerp(state.releaseX, state.targetX, easeOut(clamp(state.phaseClock / snapMs, 0, 1)));
        state.headY = lerp(REST_Y, state.targetDropY, easeIn(clamp(state.phaseClock / dropMs, 0, 1)));
        state.grip = 0;
        if (state.phaseClock >= dropMs) {
          state.phase = 'grip';
          state.phaseClock = 0;
        }
      } else if (state.phase === 'grip') {
        state.phaseClock += dt;
        state.grip = clamp(state.phaseClock / gripMs, 0, 1);
        if (state.phaseClock >= gripMs) {
          state.phase = 'lift';
          state.phaseClock = 0;
        }
      } else if (state.phase === 'lift') {
        state.phaseClock += dt;
        var up = clamp(state.phaseClock / liftMs, 0, 1);
        state.clawX = lerp(state.targetX, positionAt(state.swingClock, period), easeInOut(up));
        state.headY = lerp(state.targetDropY, REST_Y, easeInOut(up));
        var lifted = state.targetDropY - state.headY;
        if (state.targetKey === answerKey) {
          state.grip = 1;
          state.carry = lifted; /* 正确物品：一路带回顶部 */
        } else {
          /* 抓错的物品：举到一半就松手放回台面，画面上看得懂「没拿住，重来」 */
          state.grip = 1 - clamp((up - 0.35) / 0.3, 0, 1);
          state.carry = lifted * (up <= 0.35 ? up / 0.35 : Math.max(0, 1 - (up - 0.35) / 0.45));
        }
        if (up >= 1) {
          state.phase = 'resolve';
          state.phaseClock = 0;
          resolveGrab();
        }
      } else if (state.phase === 'resolve') {
        state.phaseClock += dt;
        if (state.targetKey !== answerKey && state.phaseClock >= settleMs) {
          state.carry = 0;
          state.grip = 0;
          state.phase = 'swing';
          state.phaseClock = 0;
          release.disabled = false; /* 回到可继续操作的状态：不扣分、不计时，随时再抓一次 */
          root.setAttribute('data-phase', 'swing');
        }
      }
      paintRig();
    }

    function loop(ts) {
      if (!alive || !root || !document.body.contains(root)) {
        destroy(); /* 换幕 / 离开页面：节点被换掉，循环自己停 */
        return;
      }
      if (!lastTs) lastTs = ts;
      advance(Math.min(48, ts - lastTs)); /* 切后台再回来不要让画面跳一大步 */
      lastTs = ts;
    }

    function nowMs() {
      return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
    }

    function clearFrames() {
      if (rafId) window.cancelAnimationFrame(rafId);
      if (timerId) window.clearTimeout(timerId);
      if (watchdogId) window.clearTimeout(watchdogId);
      rafId = 0;
      timerId = 0;
      watchdogId = 0;
    }

    /* 一帧 = 先走状态（节点没了 loop 会自己 destroy），再排下一帧 */
    function frame(ts) {
      loop(ts);
      scheduleFrame();
    }

    /* 帧源：默认 rAF（手机上最省电，切后台会自动停）。
       看门狗：调度 rAF 之后 WATCHDOG_MS 还没等到帧，就认为这个环境不产帧
       （低端安卓 webview 会节流 / 内嵌浏览器可能不给帧 / 无头回归也不产帧），
       改用定时器接着跑 —— 否则飞爪一动不动，游戏直接不可玩。 */
    function scheduleFrame() {
      if (!alive) return;
      clearFrames();
      if (!useTimers) {
        rafId = window.requestAnimationFrame(function (ts) {
          clearFrames();
          frame(ts);
        });
        watchdogId = window.setTimeout(function () {
          watchdogId = 0;
          rafId = 0;
          useTimers = true;
          frame(nowMs());
        }, WATCHDOG_MS);
        return;
      }
      timerId = window.setTimeout(function () {
        timerId = 0;
        frame(nowMs());
      }, FRAME_MS);
    }

    /* 回到前台再试一次 rAF（能用就用更省电的那个） */
    function onVisibility() {
      if (!document.hidden) useTimers = false;
    }

    function destroy() {
      if (!alive) return;
      alive = false;
      clearFrames();
      document.removeEventListener('visibilitychange', onVisibility);
      /* 事件委托绑在 root 上，root 随容器一起被换掉，不需要手动解绑；这里只停掉动画循环 */
    }

    ui.delegate(root, '[data-action="claw-release"]', 'click', function () {
      startGrab();
    });

    paintRig();
    document.addEventListener('visibilitychange', onVisibility);
    scheduleFrame();

    return {
      destroy: destroy,
      getState: function () {
        return {
          phase: state.phase,
          clawX: round2(state.clawX),
          headY: round2(state.headY),
          grip: round2(state.grip),
          targetKey: state.targetKey,
          wrongStreak: wrongStreak,
          assistAfterWrong: assistAfter
        };
      }
    };
  }

  HKR.components.clawGame = {
    render: render,
    /* 判定与摆动都是纯函数：自测直接调，不用起动画 */
    judge: judge,
    positionAt: positionAt,
    directionAt: directionAt,
    timeAtX: timeAtX,
    dropYFor: dropYFor,
    view: VIEW,
    layout: ITEMS,
    dirWeight: DIR_WEIGHT,
    assistAfterWrong: ASSIST_AFTER_WRONG
  };
})();
