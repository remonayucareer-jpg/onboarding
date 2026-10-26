/* 页面 3：第二章「酒店服务接单小游戏」（十幕互动剧情）
 *
 * 业务前提（后续修改请不要破坏）：
 *  - 一线员工不会接听、也不会旁听客人与 AI 的电话，员工能掌握的信息以工单为准
 *  - 前两幕只交代工单是怎么来的：不需要员工操作，也不透露客人的具体需求
 *  - 第三幕起才是员工要做的判断与操作：判断需求 → 用红框学会看工单 → 真实点击「领取」
 *    → 第六幕「飞爪抓取挑战」按需求把物品领到手 → 第七幕「走廊寻房挑战」按房号送到 8011 房门口 → 完成服务
 *  - 领取 ≠ 完成：领取后状态是「处理中」，服务做完还要按酒店流程处理工单（例如「解决」）
 *
 * 每一幕的文案、题目、红框坐标都在 src/config/scenes.config.js 的 delivery.game 里配置；
 * 第六幕「飞爪抓取挑战」与第七幕「走廊寻房挑战」的本体分别在 src/components/claw-game.js
 * 与 src/components/corridor-game.js，这一页只负责挂载 / 卸下它们和推进幕。
 */
window.HKR = window.HKR || {};
HKR.pages = HKR.pages || {};

(function () {
  var NEXT_PAGE_ID = 'scene-repair'; /* 章节二后面还有报修 / 打扫两张工单，顺序沿用 pages.config.js */
  var PUSH_PHASE_AT = 2400; /* 第二幕：AI 处理 → 工单卡片出现的切换时间点（毫秒） */

  function clamp(value, min, max) {
    var n = typeof value === 'number' ? value : parseInt(value, 10);
    if (isNaN(n)) n = min;
    return Math.max(min, Math.min(max, n));
  }

  HKR.pages['scene-delivery'] = {
    render: function (host, ctx) {
      var ui = ctx.ui;
      var illustration = HKR.components.illustration;
      var phoneMock = HKR.components.phoneMock;
      var singleChoice = HKR.components.singleChoice;
      var ticketAnnotator = HKR.components.ticketAnnotator;
      var clawGame = HKR.components.clawGame;
      var corridorGame = HKR.components.corridorGame;

      var scene = ctx.config.scenes.delivery;
      var game = scene.game;
      var ticket = scene.ticket;
      var acts = game.acts;
      var total = acts.length;
      var claw = game.claw || {};
      var corridor = game.corridor || {};

      var actIndex = clamp(ctx.state().sceneState.game_act, 0, total - 1);
      var phase = 0;
      /* 开场封面是否已经点过「开始」（只在本页内有效：刷新或重新进页面会重新看一次封面） */
      var started = false;
      var annotateIndex = 0;
      var timers = [];
      var quizAnswer = ctx.store.getAnswer(game.quiz.id);
      var restartCopy = game.restart || {};
      /* 两个小游戏的实例：换幕 / 重画之前先 destroy，避免动画循环和监听器越堆越多 */
      var clawInstance = null;
      var corridorInstance = null;

      /* ---------- 计时器：页面被换掉以后必须停下来，避免自动推进到已经不存在的页面 ---------- */
      function alive() {
        return document.body.contains(host) && ctx.currentPageId() === 'scene-delivery';
      }

      function clearTimers() {
        timers.forEach(function (id) {
          clearTimeout(id);
        });
        timers = [];
      }

      function schedule(fn, ms) {
        var id = setTimeout(function () {
          var pos = timers.indexOf(id);
          if (pos >= 0) timers.splice(pos, 1);
          if (!alive()) return;
          fn();
        }, ms);
        timers.push(id);
      }

      function act() {
        return acts[actIndex];
      }

      function claimed() {
        return ctx.state().sceneState.delivery_ticket_status === 'claimed';
      }

      /* 第六幕：是否已经拿到「纯净水 × 1」（正常抓到 or 跳过游戏都算拿到，二者只记一次） */
      function clawCollected() {
        return ctx.state().sceneState.claw_status === 'collected';
      }

      /* 第七幕：是否已经把水送到 8011 房门口（自己走到 or 跳过走位都算送到，二者只记一次） */
      function corridorDelivered() {
        return ctx.state().sceneState.corridor_status === 'delivered';
      }

      function fieldRows() {
        return [
          { label: '房间号', value: ticket.room },
          { label: '服务分类', value: ticket.category },
          { label: '服务项', value: ticket.item }
        ];
      }

      /* ---------- 骨架（换幕时才整页重画） ---------- */

      /* 已经看到过的最后一幕（0 起算）：进度点只允许点回这一幕及之前，不能跳过没看过的幕 */
      function maxSeen() {
        return clamp(ctx.state().sceneState.game_act_max, 0, total - 1);
      }

      /* 幕进度点：已经看过的幕可以点回去回看（同一场培训里常要回放某一段） */
      function dotsMarkup() {
        var seenUpTo = maxSeen();
        return ui.raw(
          acts
            .map(function (item, index) {
              var classes = ['act-progress__dot'];
              if (index === actIndex) classes.push('is-on');
              else if (index < actIndex) classes.push('is-done');
              if (index > seenUpTo) classes.push('is-locked');
              var note = index > seenUpTo ? restartCopy.lockedNote || '（还没看到）' : restartCopy.jumpNote || '（点击回看）';
              var label = '第 ' + (index + 1) + ' 幕 · ' + item.label + note;
              return ui.html`<button class="${classes.join(' ')}" type="button" data-act-goto="${index}" aria-label="${label}" title="${label}"></button>`;
            })
            .join('')
        );
      }

      /* ---------- 开场封面（设计稿页面 4）----------
       * 每次进这一章都先把「要看什么」讲清楚：三个看点 + 一句话，点「开始」才继续往下走。
       * 封面不算一幕：10 个进度点照常渲染，当前那一幕是亮着的（没有记录时就是第 1 幕）。
       */

      /* 封面是「这一章的门」：每次进入这一页（第一章结束点进来、带着记录恢复、刷新）都先看它。
         点过「开始」以后不再出现，点「开始」会接着记录里的那一幕往下走（没记录就是第 1 幕）；
         点进度点回看、点「再看一遍」重放也不弹（用户已经在章节里了）。
         配置里没有 cover 时按老样子直接进当前幕（不会因为少一段配置就打不开页面） */
      function coverVisible() {
        return !started && !!game.cover;
      }

      function coverMarkup() {
        var cover = game.cover || {};
        var chips = cover.chips || [];
        return ui.html`
          <section class="cover" data-act-key="${act().key}" data-act-kind="cover">
            <header class="cover__head">
              <p class="cover__kicker">${scene.chapterLabel}</p>
              <h1 class="cover__title">${cover.title || scene.title}</h1>
            </header>
            <div class="cover__card">
              <ul class="cover__chips">
                ${ui.raw(
                  chips
                    .map(function (label) {
                      return ui.html`<li class="cover__chip">${label}</li>`;
                    })
                    .join('')
                )}
              </ul>
              <p class="cover__line">${cover.line || ''}</p>
              <button class="btn btn--navy btn--lg cover__cta" type="button" data-action="game-start">
                <span class="cover__cta-icon" aria-hidden="true">
                  <svg viewBox="0 0 12 12" focusable="false"><path d="M3.6 2.3l6.2 3.7-6.2 3.7z" /></svg>
                </span>
                <span class="cover__cta-label">${cover.ctaLabel || '开始'}</span>
              </button>
            </div>
            <div class="cover__foot">
              <div class="act-progress" role="progressbar" aria-valuemin="1" aria-valuemax="${total}" aria-valuenow="${actIndex + 1}" aria-label="接单小游戏进度">
                ${dotsMarkup()}
              </div>
              <p class="cover__note">${cover.note || ''}</p>
            </div>
          </section>
        `;
      }

      /* 一幕的骨架（换幕时才整页重画） */
      function actMarkup(current) {
        return ui.html`
          <section class="act" data-act-key="${current.key}" data-act-kind="${current.kind}">
            <header class="act__head">
              <p class="act__kicker">${scene.chapterLabel}</p>
              <p class="act__no">第 ${actIndex + 1} 幕 / 共 ${total} 幕 · ${current.label}</p>
              <h1 class="act__title">${current.title}</h1>
              ${current.caption
                ? ui.raw('<p class="act__caption">' + ui.escapeHtml(current.caption) + '</p>')
                : ''}
            </header>
            <div class="act__stage" data-role="stage" aria-live="polite"></div>
            <div class="act__extra" data-role="extra"></div>
            <div class="act__foot" data-role="foot"></div>
            <div class="act-progress" role="progressbar" aria-valuemin="1" aria-valuemax="${total}" aria-valuenow="${actIndex + 1}" aria-label="接单小游戏进度">
              ${dotsMarkup()}
            </div>
          </section>
        `;
      }

      function paint() {
        clearTimers();
        destroyClaw(); /* 整页重画前先把小游戏的动画循环停掉（回看、换幕、重放都会走这里） */
        destroyCorridor(); /* 第七幕的键盘监听同样要在重画前摘掉，否则会跟着旧节点留到别的页面 */
        var current = act();
        phase = 0;
        var isCover = coverVisible();
        ui.setHtml(host, isCover ? coverMarkup() : actMarkup(current));
        ctx.store.setGameAct(actIndex, current.key);
        ctx.analytics.track(isCover ? 'game_cover_view' : 'game_act_view', {
          scene_id: scene.id,
          act_key: current.key,
          act_index: actIndex + 1
        });
        renderStage();
        renderExtra();
        renderFoot();
        window.scrollTo(0, 0);
        runActTimers();
      }

      /* 只重画当前幕内部（分镜、标注步骤、领取后的状态变化），不重置滚动，也不重复埋点 */
      function repaintParts() {
        renderStage();
        renderExtra();
        renderFoot();
      }

      /* ---------- 各幕的画面 ---------- */

      /* 自动播放的剧情幕（第一、二、七、八幕）：插画 + 自动进度条，不需要员工操作 */
      function runtimeMarkup(current) {
        if (current.stages) {
          var stage = current.stages[Math.min(phase, current.stages.length - 1)];
          return ui.html`
            <div class="autoplay" style="animation-duration:${stage.durationMs}ms"><span class="autoplay__fill"></span></div>
            <div class="illus-host" data-role="illus" data-scene="${stage.scene}"></div>
            <p class="act__stage-text" data-role="stage-text">${stage.text}</p>
            <div class="act__stage-dots">
              ${ui.raw(
                current.stages
                  .map(function (item, index) {
                    return ui.html`<span class="act__stage-dot ${index === phase ? 'is-on' : ''}"></span>`;
                  })
                  .join('')
              )}
            </div>
          `;
        }
        if (current.push && phase > 0) return pushMarkup(current);
        return ui.html`
          <div class="autoplay" style="animation-duration:${current.durationMs}ms"><span class="autoplay__fill"></span></div>
          <div class="illus-host" data-role="illus" data-scene="${current.scene}"></div>
          ${current.scoreChip ? ui.raw(ui.html`<p class="act__chip">${current.scoreChip}</p>`) : ''}
        `;
      }

      /* 第二幕后半段：工单卡片生成 → 滑入手机（卡片里不提前透露客人需求）
       * 「滑入手机」这块优先换成真实截图（assets/images/phone-wo-notify-real.png：公众号「工单处理通知」消息列表，
       * 由业务方提供的「收到工单提醒-替换图.png」而来）：素材自带手机外壳与红色高亮框，
       * 所以这里不再套第二层设备框，也不补白底圆角 / 投影（素材是一整块不透明矩形，
       * 再套一层等于在手机外面画一个直角方框），只留一句来源说明。
       * 素材缺失时保持下面这台模拟手机，并如实标注，不假装是真实界面。 */
      function pushMarkup(current) {
        return ui.html`
          <div class="push" data-role="push">
            <div class="push__card">
              <p class="push__card-title">${current.push.cardTitle}</p>
              <p class="push__card-line">工单编号 #${ticket.ticketNo}</p>
              <p class="push__card-line">状态 ${ticket.statusPending}</p>
              <p class="push__card-note">${current.push.line}</p>
            </div>
            <div class="push__shot" data-role="push-shot">${ui.raw(pushPhoneMarkup())}</div>
          </div>
        `;
      }

      /* 真图版：只放图片本身 + 来源说明（红框是素材里画好的，本页不叠加任何标注） */
      function pushShotMarkup(current) {
        return ui.html`
          <img class="push__shot-img" data-role="push-shot-img" src="${scene.screenshots.notify}"
            alt="${current.push.shotAlt || '真实产品截图：公众号工单消息'}" />
          <p class="push__shot-caption">${current.push.shotCaption || '真实产品截图'}</p>
        `;
      }

      /* 缺素材时的模拟界面：字段与真图同构，但不声称是真实截图 */
      function pushPhoneMarkup() {
        return ui.html`
          <div class="push__phone" aria-hidden="true">
            <span class="push__phone-notch"></span>
            <span class="push__notify">
              <span class="push__notify-app">${scene.phone.notifyApp}</span>
              <span class="push__notify-title">${scene.phone.notifyTitle}</span>
              <span class="push__notify-badge">${ticket.statusPending}</span>
            </span>
          </div>
        `;
      }

      /* 素材探测沿用 phone-mock 的做法：文件存在（onload）换成真图，不存在保持模拟界面 */
      function resolvePushShot(slot, current) {
        var path = scene.screenshots && scene.screenshots.notify;
        if (!path || !current.push) return;
        var probe = new Image();
        probe.onload = function () {
          if (!slot.parentNode) return;
          ui.setHtml(slot, pushShotMarkup(current));
        };
        probe.src = path;
      }

      /* 第三幕：真机工单截图套一层手机设备框（不做标注，设计稿页面 5）+ 一次性选择题 */
      function quizStageMarkup() {
        return ui.html`
          <div class="shot-host" data-role="shot-host"></div>
          <div class="choice-host" data-role="choice-host"></div>
        `;
      }

      /* 第四幕：同一张真实工单截图 + 分步骤红框 */
      function annotateStageMarkup(current) {
        var steps = current.steps || [];
        if (annotateIndex >= steps.length) return ui.html`<div class="shot-host" data-role="shot-host"></div>`;
        return ui.html`
          <div class="shot-host" data-role="shot-host"></div>
          <p class="act__stage-text" data-role="stage-text">
            <span class="act__stage-step">第 ${annotateIndex + 1}/${steps.length} 步</span>
            ${steps[annotateIndex].text}
          </p>
        `;
      }

      /* 第五幕：真实产品界面复刻，员工要自己点「领取」
       * caption 已经在标题下方显示过一次，这里不再重复同一句话 */
      function claimStageMarkup() {
        return ui.html`
          <div class="phone-host" data-role="phone-host"></div>
        `;
      }

      /* 第六幕「飞爪抓取挑战」：
       * - 可玩时只给一块容器，游戏本体（摆动 / 判定 / 动画）在 components/claw-game.js 里；
       * - 已经拿到「纯净水 × 1」时不再摆游戏区，换成一张「已完成」卡片 ——
       *   回看到这一幕看到的就是结果，不会又变回没玩过的样子。 */
      function clawStageMarkup() {
        if (clawCollected()) return clawDoneMarkup();
        /* 组件没加载 / 这一幕没配置时宁可留空，也不假装游戏能玩（脚部仍有「继续」按钮可以往下走） */
        if (!clawGame || !claw.taskLine) return '';
        return ui.html`<div class="claw-host" data-role="claw-host"></div>`;
      }

      /* 完成后的结果卡片：正常抓到和「跳过游戏」都算完成，区别只在说明文案 */
      function clawDoneMarkup() {
        var done = claw.done || {};
        var skipped = !!ctx.state().sceneState.claw_skipped;
        return ui.html`
          <section class="card card--ok">
            <p class="card__title">${done.title}</p>
            <p class="card__desc">${skipped ? done.skippedNote : done.note}</p>
          </section>
        `;
      }

      function destroyClaw() {
        if (clawInstance && clawInstance.destroy) clawInstance.destroy();
        clawInstance = null;
      }

      /* 挂载小游戏：判定规则、宽容区、动画都在组件里，页面只接两个回调。
       * 回调里不直接改 DOM：只写 store / 埋点，再交给 repaintParts() 让画面跟着状态走。 */
      function mountClaw(clawHost) {
        clawInstance = clawGame.render(clawHost, {
          config: claw,
          /* 上次玩过的抓错次数带进来：连续抓错满 assist.afterWrong 次后的「帮你对准」不会因为重画而清零 */
          wrongStreak: ctx.state().sceneState.claw_wrong || 0,
          onRelease: function (info) {
            ctx.analytics.track('claw_release', {
              scene_id: scene.id,
              act_key: act().key,
              item: info.key,
              assisted: info.assisted,
              distance: info.distance
            });
          },
          onResult: function (info) {
            var res = ctx.store.recordClawGrab({ item: info.key, correct: info.correct });
            ctx.analytics.track('claw_result', {
              scene_id: scene.id,
              act_key: act().key,
              item: info.key,
              correct: info.correct,
              assisted: info.assisted,
              wrong_total: res.wrong,
              newly: res.newly
            });
            if (!info.correct) return; /* 抓错：不扣分、不推进，接着再抓一次就行 */
            /* 抓到正确物品：让成功提示在画面上停一会儿，再把游戏区换成「已完成」卡片并亮出下一步 */
            var key = act().key;
            schedule(function () {
              if (act().key !== key) return; /* 已经换幕（点了进度点 / 跳过）就不再动 DOM */
              repaintParts();
            }, (claw.timing && claw.timing.successHoldMs) || 2000);
          }
        });
      }

      /* 第七幕「走廊寻房挑战」：
       * - 可玩时只给一块容器，地图 / 碰撞 / 方向键判定都在 components/corridor-game.js 里；
       * - 已经送到 8011 房门口时不再摆游戏区，换成一张「已送达」卡片 ——
       *   回看到这一幕看到的就是结果，不会又变回没走过的样子。 */
      function corridorStageMarkup() {
        if (corridorDelivered()) return corridorDoneMarkup();
        /* 组件没加载 / 这一幕没配置时宁可留空，也不假装游戏能玩（脚部仍有「继续」按钮可以往下走） */
        if (!corridorGame || !corridor.taskLine) return '';
        return ui.html`<div class="corridor-host" data-role="corridor-host"></div>`;
      }

      /* 送达后的结果卡片：自己走到和「跳过走位」都算送到，区别只在说明文案 */
      function corridorDoneMarkup() {
        var done = corridor.done || {};
        var skipped = !!ctx.state().sceneState.corridor_skipped;
        return ui.html`
          <section class="card card--ok">
            <p class="card__title">${done.title}</p>
            <p class="card__desc">${skipped ? done.skippedNote : done.note}</p>
          </section>
        `;
      }

      function destroyCorridor() {
        if (corridorInstance && corridorInstance.destroy) corridorInstance.destroy();
        corridorInstance = null;
      }

      /* 挂载走廊寻房：地图与规则都在组件里，页面只接三个回调。
       * 回调里不直接改 DOM：只写 store / 埋点，再交给 repaintParts() 让画面跟着状态走。 */
      function mountCorridor(corridorHost) {
        corridorInstance = corridorGame.render(corridorHost, {
          config: corridor,
          onMove: function (info) {
            /* 逐格移动都留一笔：用来复盘「有没有人卡在走廊里」 */
            ctx.analytics.track('corridor_move', {
              scene_id: scene.id,
              act_key: act().key,
              dir: info.dir,
              steps: info.steps
            });
          },
          onDoor: function (info) {
            /* 走过别的房门口：只记「停在哪个房门口」，不记失败（这里没有失败这回事） */
            ctx.store.deliverToRoom({ room: info.room });
            ctx.analytics.track('corridor_door', {
              scene_id: scene.id,
              act_key: act().key,
              room: info.room,
              steps: info.steps
            });
          },
          onDeliver: function (info) {
            var res = ctx.store.deliverToRoom({
              room: info.room,
              steps: info.steps,
              cell: { col: info.col, row: info.row }
            });
            ctx.analytics.track('corridor_deliver', {
              scene_id: scene.id,
              act_key: act().key,
              room: info.room,
              steps: info.steps,
              newly: res.newly
            });
            /* 送到之后先让成功提示在画面上停一会儿，再把游戏区换成「已送达」卡片并亮出下一步 */
            var key = act().key;
            schedule(function () {
              if (act().key !== key) return; /* 已经换幕（点了进度点 / 跳过）就不再动 DOM */
              repaintParts();
            }, (corridor.timing && corridor.timing.successHoldMs) || 1800);
          }
        });
      }

      /* 第十幕：实际工作流程总结 */
      function summaryStageMarkup(current) {
        return ui.html`
          <ol class="flow">
            ${ui.raw(
              (current.flow || [])
                .map(function (step, index) {
                  return ui.html`<li class="flow__item">
                    <span class="flow__index">${index + 1}</span>
                    <span class="flow__text">${step}</span>
                  </li>`;
                })
                .join('')
            )}
          </ol>
        `;
      }

      /* ---------- 分区渲染 ---------- */
      function renderStage() {
        var current = act();
        var stage = ui.$('[data-role="stage"]', host);
        if (!stage) return;

        if (current.kind === 'annotate') {
          ui.setHtml(stage, annotateStageMarkup(current));
        } else if (current.kind === 'quiz') {
          ui.setHtml(stage, quizStageMarkup());
        } else if (current.kind === 'claim') {
          ui.setHtml(stage, claimStageMarkup(current));
        } else if (current.kind === 'game') {
          /* 重画前先卸掉旧实例：换幕、回看、抓完重画都会走这里 */
          destroyClaw();
          ui.setHtml(stage, clawStageMarkup());
          var clawHost = ui.$('[data-role="claw-host"]', stage);
          if (clawHost) mountClaw(clawHost);
        } else if (current.kind === 'route') {
          /* 重画前先卸掉旧实例：换幕、回看、送到后重画都会走这里 */
          destroyCorridor();
          ui.setHtml(stage, corridorStageMarkup());
          var corridorHost = ui.$('[data-role="corridor-host"]', stage);
          if (corridorHost) mountCorridor(corridorHost);
        } else if (current.kind === 'summary') {
          ui.setHtml(stage, summaryStageMarkup(current));
        } else {
          ui.setHtml(stage, runtimeMarkup(current));
        }

        var illusHost = ui.$('[data-role="illus"]', stage);
        if (illusHost) illustration.render(illusHost, { scene: illusHost.getAttribute('data-scene') });

        var shotHost = ui.$('[data-role="shot-host"]', stage);
        if (shotHost) {
          var steps = current.steps || [];
          var step = current.kind === 'annotate' && annotateIndex < steps.length ? steps[annotateIndex] : null;
          ticketAnnotator.render(shotHost, {
            screenshotPath: scene.screenshots.detail,
            alt: ticket.statusPending,
            /* 第三幕（设计稿页面 5）：截图套手机设备框；第四幕的红框讲解仍在同一张截图上做 */
            device: current.kind === 'quiz',
            statusTime: scene.phone.frameTime,
            step: step,
            stepIndex: annotateIndex,
            stepTotal: steps.length,
            fallbackRows: fieldRows()
          });
        }

        var phoneHost = ui.$('[data-role="phone-host"]', stage);
        if (phoneHost) phoneMock.render(phoneHost, { sceneKey: 'delivery', view: 'real', claimed: claimed() });

        /* 第二幕的「滑入手机」：先摆模拟手机占位，真图探测到就换成真图 */
        var pushSlot = ui.$('[data-role="push-shot"]', stage);
        if (pushSlot) resolvePushShot(pushSlot, current);

        var choiceHost = ui.$('[data-role="choice-host"]', stage);
        if (choiceHost) {
          singleChoice.render(choiceHost, {
            question: game.quiz,
            sceneId: scene.id,
            /* 主按钮文案写在 acts[2].ctaLabel（设计稿页面 5 是「具体讲解 →」），页面里不写死 */
            ctaLabel: current.ctaLabel || '具体讲解',
            ctaArrow: true,
            initialAnswer: quizAnswer,
            onContinue: function () {
              goToAct(actIndex + 1);
            }
          });
        }
      }

      /* 领取之后：状态变化 + 后续会用到哪两个按钮（不把「领取」当「完成」） */
      function claimResultMarkup() {
        return ui.html`
          <section class="card card--ok">
            <p class="card__title">状态变化：${ticket.statusPending} → ${ticket.statusClaimed}</p>
            <p class="card__desc">${scene.phone.afterClaimDesc}</p>
          </section>
          <section class="card card--plain">
            <p class="card__title">领取之后，工单里还会用到这两个按钮</p>
            <div class="action-explain">
              ${ui.raw(
                (scene.phone.laterActions || [])
                  .map(function (action) {
                    return ui.html`<div class="action-explain__row">
                      <span class="action-explain__label">${action.label}</span>
                      <span class="action-explain__desc">${action.desc}</span>
                    </div>`;
                  })
                  .join('')
              )}
            </div>
          </section>
        `;
      }

      function renderExtra() {
        var current = act();
        var extra = ui.$('[data-role="extra"]', host);
        if (!extra) return;
        var parts = [];

        if (current.kind === 'annotate' && annotateIndex >= (current.steps || []).length) {
          parts.push(
            ui.html`<section class="card card--ok">
              <p class="card__title">小结</p>
              <p class="card__desc">${current.summary}</p>
            </section>`
          );
        }
        if (current.kind === 'claim' && claimed()) parts.push(claimResultMarkup());
        if (current.note) parts.push(ui.html`<p class="act__note">${current.note}</p>`);

        ui.setHtml(extra, parts.join(''));
      }

      /* 「再看一遍」入口：除了第 1 幕，每一幕的脚部都挂一个，演示时不用刷新页面就能重放 */
      function restartMarkup(label) {
        if (actIndex === 0) return '';
        return ui.html`<button class="linkbtn linkbtn--center" type="button" data-action="game-restart">${label || restartCopy.shortLabel || '从头再看一遍'}</button>`;
      }

      function renderFoot() {
        var current = act();
        var foot = ui.$('[data-role="foot"]', host);
        if (!foot) return;
        var markup = '';

        if (current.kind === 'watch') {
          markup = ui.html`
            <p class="act__foot-note">播完自动进入下一幕。</p>
            <button class="linkbtn linkbtn--center" type="button" data-action="act-skip">跳过动画，直接继续 ›</button>
          `;
        } else if (current.kind === 'quiz') {
          markup = ui.html`<p class="act__foot-note">选错也没关系，下一步用红框找答案。</p>`;
        } else if (current.kind === 'annotate') {
          var last = annotateIndex >= (current.steps || []).length;
          markup = ui.html`
            <button class="btn" type="button" data-action="annotate-next">${last ? '下一步：领取工单' : '下一步'}</button>
            <p class="act__foot-note">${last ? '三个字段都看过了。' : '一次只看一个字段，看完点下一步。'}</p>
          `;
        } else if (current.kind === 'claim') {
          markup = claimed()
            ? ui.html`<button class="btn" type="button" data-action="act-next">继续，去完成服务</button>`
            : ui.html`<p class="act__foot-note">在手机底部点「领取」。</p>`;
        } else if (current.kind === 'game') {
          /* 第六幕：没拿到东西时脚部不再重复「怎么玩 / 可以跳过」——那句话在游戏区里紧挨着
             「跳过游戏」说一次就够（同一句话不在同一屏出现两次）。只有组件没加载时才回退到脚部。
             拿到之后才出现「继续，去 8011 房间」，并把「再抓一次」作为低强调入口放在下面。 */
          var replayCopy = claw.replay || {};
          markup = clawCollected()
            ? ui.html`
                <button class="btn" type="button" data-action="act-next">${claw.nextLabel || '继续'}</button>
                <p class="act__foot-note">${claw.nextNote || ''}</p>
                <button class="linkbtn linkbtn--center" type="button" data-action="claw-replay">${replayCopy.label || '再抓一次'}</button>
              `
            : clawGame && claw.taskLine
              ? ''
              : ui.html`<p class="act__foot-note">${claw.playNote || ''}</p>`;
        } else if (current.kind === 'route') {
          /* 第七幕：没送到时脚部不重复「怎么玩 / 可以跳过」——那句话在游戏区里紧挨着
             「跳过走位，直接送达」说一次就够。送到之后才出现「继续」与低强调的「再走一次」。 */
          var routeReplay = corridor.replay || {};
          markup = corridorDelivered()
            ? ui.html`
                <button class="btn" type="button" data-action="act-next">${corridor.nextLabel || '继续'}</button>
                <p class="act__foot-note">${corridor.nextNote || ''}</p>
                <button class="linkbtn linkbtn--center" type="button" data-action="corridor-replay">${routeReplay.label || '再走一次'}</button>
              `
            : corridorGame && corridor.taskLine
              ? ''
              : ui.html`<p class="act__foot-note">${corridor.playNote || ''}</p>`;
        } else if (current.kind === 'summary') {
          markup = ui.html`<button class="btn btn--lg" type="button" data-action="finish">${current.ctaLabel}</button>`;
        }

        var restartLabel = current.kind === 'summary' ? restartCopy.label || '再看一遍' : '';
        ui.setHtml(foot, ui.html`${ui.raw(markup)}${ui.raw(restartMarkup(restartLabel))}`);
      }

      /* ---------- 自动播放与幕之间跳转 ---------- */
      function goToAct(index) {
        if (index < 0 || index >= total || index === actIndex) return;
        actIndex = index;
        annotateIndex = 0;
        paint();
      }

      function runActTimers() {
        /* 封面还挂着的时候不能起跑：点了「开始」才会重画成第一幕，计时器跟着那一轮 paint() 起来 */
        if (coverVisible()) return;

        var current = act();
        if (current.kind !== 'watch') return;

        if (current.stages) {
          var start = 0;
          current.stages.forEach(function (stage, index) {
            if (index > 0) {
              schedule(function () {
                phase = index;
                repaintParts();
              }, start);
            }
            start += stage.durationMs;
          });
          schedule(function () {
            goToAct(actIndex + 1);
          }, start);
          return;
        }

        if (current.push) {
          schedule(function () {
            phase = 1;
            repaintParts();
          }, PUSH_PHASE_AT);
        }
        schedule(function () {
          goToAct(actIndex + 1);
        }, current.durationMs);
      }

      function claimTicketOnce() {
        if (claimed()) return;
        ctx.store.claimTicket();
        ctx.analytics.track('scene_step', { scene_id: scene.id, step: 'claim_ticket' });
        ui.toast('领取成功 ✓', { variant: 'ok' });
        repaintParts();
        var card = ui.$('[data-role="extra"]', host);
        if (card && card.scrollIntoView) card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }

      /* ---------- 事件（只绑一次，内容重画后依然有效） ---------- */

      /* 封面的「开始」：记一笔之后整页重画成第一幕（第一幕的自动播放计时器这时才起跑） */
      ui.delegate(host, '[data-action="game-start"]', 'click', function () {
        started = true;
        ctx.analytics.track('game_start', { scene_id: scene.id, act_key: act().key, act_index: actIndex + 1 });
        paint();
      });

      ui.delegate(host, '[data-action="act-skip"]', 'click', function () {
        goToAct(actIndex + 1);
      });

      ui.delegate(host, '[data-action="act-next"]', 'click', function () {
        goToAct(actIndex + 1);
      });

      /* 点幕进度点：已经看过的幕可以点回去回看；还没看过的幕点不动（保持教学顺序） */
      ui.delegate(host, '[data-act-goto]', 'click', function (event, target) {
        var index = clamp(target.getAttribute('data-act-goto'), 0, total - 1);
        if (index === actIndex) return;
        if (index > maxSeen()) {
          ui.toast(restartCopy.lockedToast || '这一幕还没看过，按顺序看完才能回看', { variant: 'note' });
          return;
        }
        ctx.analytics.track('game_act_jump', {
          scene_id: scene.id,
          from_act_key: act().key,
          to_act_key: acts[index].key,
          to_act_index: index + 1
        });
        /* 回看 = 用户已经在章节里了，不再拦一次开场封面 */
        started = true;
        goToAct(index);
      });

      /* 「再看一遍」：把这一局清回第 1 幕（工单状态、第三幕作答一起回起点），方便重放。
         这里不再拦一次开场封面（started 保持 true）：用户已经知道这一章要做什么了，
         点了「再看一遍」就直接从第一幕动画开始重放 */
      ui.delegate(host, '[data-action="game-restart"]', 'click', function () {
        var fromActKey = act().key;
        ctx.analytics.track('game_restart', { scene_id: scene.id, from_act_key: fromActKey });
        ctx.store.restartDeliveryGame(game.quiz.id);
        quizAnswer = null;
        annotateIndex = 0;
        actIndex = 0;
        /* 重放也不过封面：用户已经知道这一章要做什么，点「再看一遍」就直接从第一幕动画开始 */
        started = true;
        paint();
        ui.toast(restartCopy.doneToast || '已回到第 1 幕，可以重新演示一遍', { variant: 'ok' });
      });

      ui.delegate(host, '[data-action="annotate-next"]', 'click', function () {
        var steps = act().steps || [];
        if (annotateIndex < steps.length) {
          var done = steps[annotateIndex];
          annotateIndex += 1;
          ctx.analytics.track('scene_step', { scene_id: scene.id, step: 'annotate_' + done.key });
          repaintParts();
          var shot = ui.$('[data-role="stage"]', host);
          if (shot && shot.scrollIntoView) shot.scrollIntoView({ block: 'start', behavior: 'smooth' });
        } else {
          goToAct(actIndex + 1);
        }
      });

      ui.delegate(host, '[data-action="phone-claim"]', 'click', function (event, target) {
        target.disabled = true;
        claimTicketOnce();
      });

      ui.delegate(host, '[data-action="phone-later"]', 'click', function (event, target) {
        var label = target.getAttribute('data-later');
        ui.toast('「' + label + '」在真实系统里可以操作，这里只做位置说明', { variant: 'note' });
      });

      /* 第六幕「跳过游戏」：直接把「纯净水 × 1」记为已领取（不扣分、不算失败，继续往下走）。
         幂等：已经记过就不再重复弹提示（回看这一幕时再点也一样）。 */
      ui.delegate(host, '[data-action="claw-skip"]', 'click', function () {
        var res = ctx.store.skipClawGame();
        ctx.analytics.track('game_act_skip', { scene_id: scene.id, act_key: act().key, step: 'claw_skip' });
        if (res.newly) ui.toast((claw.skip && claw.skip.doneToast) || '已为你完成本环节', { variant: 'note' });
        repaintParts();
      });

      /* 第六幕：完成后再点「再抓一次」——只把这一环节清回可玩状态，不动章节进度 */
      ui.delegate(host, '[data-action="claw-replay"]', 'click', function () {
        ctx.store.restartClawGame();
        ctx.analytics.track('scene_step', { scene_id: scene.id, act_key: act().key, step: 'claw_replay' });
        ui.toast((claw.replay && claw.replay.toast) || '已重置，可以再抓一次', { variant: 'ok' });
        repaintParts();
      });

      /* 第七幕「跳过走位，直接送达」：直接把「已送到 8011 房门口」记为完成（不扣分、不算失败）。
         幂等：已经记过就不再重复弹提示（回看这一幕时再点也一样）。 */
      ui.delegate(host, '[data-action="corridor-skip"]', 'click', function () {
        var res = ctx.store.skipCorridorRoute();
        ctx.analytics.track('game_act_skip', { scene_id: scene.id, act_key: act().key, step: 'corridor_skip' });
        if (res.newly) ui.toast((corridor.skip && corridor.skip.doneToast) || '已为你完成本环节', { variant: 'note' });
        repaintParts();
      });

      /* 第七幕：送到后再点「再走一次」——只把这一环节清回可走状态，不动章节进度 */
      ui.delegate(host, '[data-action="corridor-replay"]', 'click', function () {
        ctx.store.restartCorridorRoute();
        ctx.analytics.track('scene_step', { scene_id: scene.id, act_key: act().key, step: 'corridor_replay' });
        ui.toast((corridor.replay && corridor.replay.toast) || '已重置，可以再走一次', { variant: 'ok' });
        repaintParts();
      });

      ui.delegate(host, '[data-action="finish"]', 'click', function () {
        ctx.analytics.track('scene_step', { scene_id: scene.id, step: 'finish_game' });
        ctx.go(NEXT_PAGE_ID);
      });

      /* ---------- 起播（paint() 内部会自动接上本幕的计时器） ---------- */
      paint();
    }
  };
})();
