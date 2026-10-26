/* 一线员工课件的一屏 = 一个页面骨架
 * ---------------------------------------------------------------
 * 四种屏型（由 frontline.config.js 的 kind 决定）：
 *   illustration  正式插画（4:3 大图）
 *   scene         内联 SVG 插画（16:9）；配置里给了 image 且文件存在时自动换成那张图
 *   phone         手机端工单界面（实际操作），画法在 components/frontline-phone.js
 *   success       操作成功页
 *
 * 每屏的固定结构：进度 → 标题 → 画面 → 一句说明 → 讲解 → 主操作。
 * 页面只负责摆放，一句文案都不写在这里。
 */
window.HKR = window.HKR || {};
HKR.components = HKR.components || {};

(function () {
  var ARROW =
    '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M4 10h11.2" /><path d="m11.2 5.8 4.2 4.2-4.2 4.2" /></svg>';

  /* 讲解录音：同一时间只放一条，换屏就停 */
  var audioEl = null;

  function stopAudio() {
    if (!audioEl) return;
    try {
      audioEl.pause();
      audioEl.currentTime = 0;
    } catch (error) {
      /* 播放器还没加载完就换屏，忽略 */
    }
    audioEl = null;
  }

  function playAudio(screen, button, ui) {
    stopAudio();
    var el = new Audio();
    var label = ui.$('.frontline-audio__label', button);

    function reset() {
      button.setAttribute('data-audio-state', 'idle');
      if (label) label.textContent = '再听一遍';
    }

    el.preload = 'auto';
    el.addEventListener('ended', reset);
    el.addEventListener('error', function () {
      reset();
      ui.toast('这一屏的录音没加载出来，先看画面。', { variant: 'note', duration: 2400 });
    });
    el.src = screen.audioSrc;
    audioEl = el;

    var played = el.play();
    if (played && typeof played.catch === 'function') {
      played.catch(function () {
        reset();
        ui.toast('录音没能播放，可以点一下再试。', { variant: 'note', duration: 2400 });
      });
    }
    button.setAttribute('data-audio-state', 'playing');
    if (label) label.textContent = '正在播放…';
  }

  /* 三个字段的热区：一次只出一个框（点完一个才出下一个）。
     已经点过的框变绿勾，当前这个带序号、会呼吸；还没轮到的不渲染。 */
  function spotsMarkup(screen, ctx, ui) {
    var seen = (ctx.store.getState().frontline.fields_seen || []).length;
    return screen.steps
      .map(function (step, index) {
        if (index > seen) return '';
        var isCurrent = index === seen;
        var style =
          'top:' + step.top + '%;height:' + step.height + '%;left:3.2%;width:93.6%';
        return ui.html`
          <span
            class="fl-spot ${ui.raw(isCurrent ? 'is-current' : 'is-seen')}"
            ${ui.raw(isCurrent ? 'data-action="fl-step" role="button" tabindex="0"' : '')}
            style="${style}"
            aria-label="${step.label}"
          >
            <span class="fl-spot__index">${isCurrent ? String(index + 1) : '✓'}</span>
          </span>
        `;
      })
      .join('');
  }

  function bodyMarkup(screen, ui, ctx, hintText) {
    if (screen.kind === 'phone') {
      return '<div class="frontline-scene__phone" data-role="fl-phone"></div>';
    }

    /* 真截图 + 手机外框：这张截图本身就是一整块手机屏（自带状态栏和底栏），
       外面只补一圈机身，让阿姨觉得「这就是她手机上的一屏」 */
    if (screen.kind === 'screenshot') {
      var hasSteps = !!(screen.steps && screen.steps.length);
      var hasSpot = !!screen.spot;
      var seenCount = (ctx.store.getState().frontline.fields_seen || []).length;
      /* 三个框都点过之后（例如她退回来再看这一屏）：图恢复成可点，点一下直接往下走，
         不再给底部按钮 —— 底部只留一个「往前走」的入口，交给手机本身 */
      var allSeen = hasSteps && seenCount >= screen.steps.length;
      /* 收尾屏（tail）的图不用点：往前走靠手机下面那两个按钮 */
      var staticImg = (hasSteps && !allSeen) || hasSpot || screen.tail === 'replay';

      /* 热区：橙框（第 5 屏「领取」）或分步框（第 4 屏三个字段） */
      var spotsHtml = '';
      if (hasSpot) {
        spotsHtml = ui.html`
          <span
            class="fl-spot fl-spot--brand is-current"
            data-action="${screen.spotAction === 'solve' ? 'fl-solve' : 'fl-claim'}"
            role="button"
            tabindex="0"
            style="top:${screen.spot.top}%;height:${screen.spot.height}%;left:${screen.spot.left}%;width:${screen.spot.width}%"
            aria-label="${screen.spot.label}"
          ></span>
        `;
      } else if (hasSteps) {
        spotsHtml = spotsMarkup(screen, ctx, ui);
      }

      var guideHtml = screen.showGuide
        ? ui.html`
            <span class="fl-guide" aria-hidden="true">
              <span class="fl-guide__label">点这里</span>
              <svg class="fl-guide__arrow" viewBox="0 0 24 24" focusable="false">
                <path d="M12 3.5v12" />
                <path d="m5.8 10.2 6.2 6.2 6.2-6.2" />
              </svg>
            </span>
          `
        : '';

      /* 铺满模式：机身按原图比例占满整块高度；标题压在屏内上沿，说明可按屏去掉 */
      if (screen.fill) {
        return ui.html`
          <div class="fl-fill-stage">
            <div class="fl-device fl-device--fill" style="aspect-ratio:${screen.imageWidth} / ${screen.imageHeight}">
              <div class="fl-device__screen">
                <img
                  class="fl-device__img is-fill${ui.raw(staticImg ? ' is-static' : '')}"
                  ${ui.raw(staticImg ? '' : 'data-action="fl-open" role="button" tabindex="0"')}
                  src="${screen.image}"
                  alt="${screen.imageAlt}"
                  width="${screen.imageWidth}"
                  height="${screen.imageHeight}"
                  decoding="async"
                />
                <div
                  class="fl-device__bar"
                  ${ui.raw(screen.titleHeight ? 'style="height:' + screen.titleHeight + '%"' : '')}
                >
                  <p class="fl-device__title">${screen.title}</p>
                  ${ui.raw(
                    screen.audioSpot
                      ? ''
                      : ui.html`<button class="fl-device__audio" type="button" data-action="frontline-audio" aria-label="播放讲解">
                          <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
                            <path d="M7 13h5l6-5v16l-6-5H7z" />
                            <path d="M22.5 12.2c2.2 2.1 2.2 5.5 0 7.6" />
                            <path d="M26 9c4 3.8 4 10.2 0 14" />
                          </svg>
                        </button>`
                  )}
                </div>
                ${ui.raw(
                  screen.audioSpot
                    ? ui.html`<button
                        class="fl-device__audio fl-device__audio--float"
                        type="button"
                        data-action="frontline-audio"
                        aria-label="播放讲解"
                        style="left:${screen.audioSpot.left}%;top:${screen.audioSpot.top}%"
                      >
                        <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
                          <path d="M7 13h5l6-5v16l-6-5H7z" />
                          <path d="M22.5 12.2c2.2 2.1 2.2 5.5 0 7.6" />
                          <path d="M26 9c4 3.8 4 10.2 0 14" />
                        </svg>
                      </button>`
                    : ''
                )}
                ${ui.raw(screen.hideHint ? '' : ui.html`<p class="fl-device__hint">${hintText}</p>`)}
                ${ui.raw(spotsHtml)}
                ${ui.raw(guideHtml)}
              </div>
            </div>
          </div>
        `;
      }

      return ui.html`
        <div class="fl-device">
          <div class="fl-device__screen">
            <img
              class="fl-device__img${ui.raw(staticImg ? ' is-static' : '')}"
              ${ui.raw(staticImg ? '' : 'data-action="fl-open" role="button" tabindex="0"')}
              src="${screen.image}"
              alt="${screen.imageAlt}"
              width="${screen.imageWidth}"
              height="${screen.imageHeight}"
              decoding="async"
            />
            ${ui.raw(spotsHtml)}
            ${ui.raw(guideHtml)}
          </div>
        </div>
      `;
    }

    /* 关注公众号（最后一屏）：一张二维码 + 一句「长按识别」，阿姨照着点就行 */
    if (screen.kind === 'qr') {
      return ui.html`
        <div class="fl-qr">
          <div class="fl-qr__card">
            <img
              class="fl-qr__img"
              src="${screen.image}"
              alt="${screen.imageAlt}"
              width="265"
              height="248"
              decoding="async"
            />
            <span class="fl-qr__badge">${screen.qrBadge || '长按关注'}</span>
          </div>
          <p class="fl-qr__hint">${screen.qrHint || '长按图片 → 识别图中二维码'}</p>
        </div>
      `;
    }

    if (screen.kind === 'success') {
      return ui.html`
        <div class="fl-success" role="status">
          <span class="fl-success__badge" aria-hidden="true">✓</span>
          <p class="fl-success__title">${screen.successTitle}</p>
          <p class="fl-success__desc">${screen.successDesc}</p>
        </div>
      `;
    }

    if (screen.kind === 'scene') {
      return '<div class="frontline-scene__figure frontline-scene__figure--art" data-role="fl-scene"></div>';
    }

    return ui.html`
      <figure class="frontline-scene__figure">
        <img
          class="frontline-scene__image"
          src="${screen.image}"
          alt="${screen.imageAlt}"
          width="1440"
          height="1080"
          decoding="async"
          fetchpriority="high"
        />
      </figure>
    `;
  }

  function actionMarkup(screen, ui, ctx) {
    /* 三个字段的屏：点完第三个直接进下一屏，底部一律不给按钮（退回来时点手机即可） */
    if (screen.steps && screen.steps.length) return '';

    /* 收尾屏：再看一遍 / 结束预习（铺满模式下也照样给，只是手机会被压得矮一点） */
    if (screen.tail === 'replay') {
      return ui.html`
        <div class="frontline-scene__action frontline-scene__tail">
          <button class="btn btn--navy btn--lg frontline-scene__next" type="button" data-action="frontline-replay">
            <span>再看一遍</span>
            <span class="btn__arrow" aria-hidden="true">${ui.raw(ARROW)}</span>
          </button>
          <button class="linkbtn" type="button" data-action="frontline-exit">结束预习</button>
        </div>
      `;
    }

    /* 这一屏的入口在手机上（点工单），就不再给底部按钮，免得一屏两个「往前走」 */
    if (screen.hideNext) return '';

    if (screen.kind === 'phone') {
      if (screen.tail !== 'replay') return '';
      return ui.html`
        <div class="frontline-scene__action frontline-scene__tail">
          <button class="btn btn--navy btn--lg frontline-scene__next" type="button" data-action="frontline-replay">
            <span>再看一遍</span>
            <span class="btn__arrow" aria-hidden="true">${ui.raw(ARROW)}</span>
          </button>
          <button class="linkbtn" type="button" data-action="frontline-exit">结束预习</button>
        </div>
      `;
    }

    return ui.html`
      <div class="frontline-scene__action">
        <button class="btn btn--navy btn--lg frontline-scene__next" type="button" data-action="frontline-next">
          <span>${screen.nextLabel || '下一步'}</span>
          <span class="btn__arrow" aria-hidden="true">${ui.raw(ARROW)}</span>
        </button>
      </div>
    `;
  }

  function render(host, ctx, options) {
    var ui = ctx.ui;
    var screen = options.config;
    var total = HKR.config.frontline.totalSteps;
    var titleId = screen.id + '-title';
    /* 有 steps 的屏，说明跟着「当前第几个框」走：先看什么、再看什么，一句一句给 */
    var captionText = screen.caption;
    if (screen.steps && screen.steps.length) {
      var seenSteps = (ctx.store.getState().frontline.fields_seen || []).length;
      captionText =
        seenSteps >= screen.steps.length
          ? screen.doneHint || screen.caption
          : screen.steps[seenSteps].hint;
    }
    var captionHtml = ui.html`<p class="frontline-scene__caption">${captionText}</p>`;
    /* 手机特别高的那几屏，说明要放到手机上边，否则被挤到屏幕外面（见 captionFirst） */
    var captionFirst = screen.captionFirst === true;
    /* 铺满模式：机身上下压着标题和说明，所以外面那套标题 / 说明 / 讲解都不再输出 */
    var isFill = screen.fill === true;

    stopAudio();

    ui.setHtml(
      host,
      ui.html`
        <section
          class="frontline-scene ${ui.raw(isFill ? 'frontline-scene--fill' : '')}"
          data-step="${screen.step}"
          data-kind="${screen.kind}"
          aria-labelledby="${titleId}"
        >
          <div class="frontline-scene__progress">
            <div class="frontline-scene__progress-head">
              <span>第 ${screen.step} 步</span>
              <span>共 ${total} 步</span>
            </div>
            <div
              class="frontline-scene__progress-track"
              role="progressbar"
              aria-label="一线员工预习进度"
              aria-valuemin="0"
              aria-valuemax="${total}"
              aria-valuenow="${screen.step}"
            >
              <span style="width:${(screen.step / total) * 100}%"></span>
            </div>
          </div>

          ${ui.raw(
            isFill
              ? ''
              : ui.html`<header class="frontline-scene__head">
                  <h1 class="frontline-scene__title" id="${titleId}">${screen.title}</h1>
                </header>`
          )}

          ${isFill || !captionFirst ? '' : ui.raw(captionHtml)}

          ${ui.raw(bodyMarkup(screen, ui, ctx, captionText))}

          ${isFill || captionFirst ? '' : ui.raw(captionHtml)}

          ${ui.raw(
            screen.hideAudio || isFill
              ? ''
              : ui.html`<div class="frontline-scene__voice">${ui.raw(
                  HKR.components.frontlineAudio.render({ label: '播放讲解' })
                )}</div>`
          )}

          ${ui.raw(actionMarkup(screen, ui, ctx))}
        </section>
      `
    );

    /* 手机端工单界面：它自己绑操作（点开 / 看字段 / 领取 / 解决），画面由配置的 stage 决定 */
    if (screen.kind === 'phone') {
      var phoneSlot = ui.$('[data-role="fl-phone"]', host);
      if (phoneSlot) HKR.components.frontlinePhone.render(phoneSlot, ctx, screen);
    }

    /* 内联插画：先用 SVG 顶上；业务方给了正式插画（image 存在）就换成那张图 */
    if (screen.kind === 'scene') {
      var sceneSlot = ui.$('[data-role="fl-scene"]', host);
      if (sceneSlot) {
        HKR.components.illustration.render(sceneSlot, { scene: screen.scene, alt: screen.imageAlt });
        if (screen.image) {
          var probe = new Image();
          probe.onload = function () {
            if (!sceneSlot.parentNode) return;
            ui.setHtml(
              sceneSlot,
              '<img class="frontline-scene__image" src="' +
                ui.escapeHtml(screen.image) +
                '" alt="' +
                ui.escapeHtml(screen.imageAlt) +
                '" width="1440" height="1080" decoding="async" />'
            );
          };
          probe.onerror = function () {
            /* 没有正式插画：继续用内联 SVG，不报错 */
          };
          probe.src = screen.image;
        }
      }
    }

    ui.delegate(host, '[data-action="frontline-audio"]', 'click', function (event, target) {
      ctx.analytics.track('frontline_audio_requested', { page_id: screen.id });
      if (!screen.audioSrc) {
        ui.toast('这一屏的讲解录音还在制作，先看画面。', { variant: 'note', duration: 2400 });
        return;
      }
      playAudio(screen, target, ui);
    });

    /* 普通版式的「下一步」：先把这一屏的记录写上，再往下走 */
    function advance() {
      if (screen.markTicketOpened) ctx.store.openFrontlineTicket();
      ctx.analytics.track('frontline_scene_next', { page_id: screen.id });
      if (screen.nextPageId) {
        ctx.go(screen.nextPageId);
        return;
      }
      ui.toast('这一屏是最后一屏了。', { variant: 'note', duration: 2200 });
    }

    ui.delegate(host, '[data-action="frontline-next"]', 'click', function () {
      advance();
    });

    /* 点手机里的工单（红框那一块，实际是整张屏都可点，手滑一点也不会点空） */
    ui.delegate(host, '[data-action="fl-open"]', 'click', function () {
      advance();
    });

    ui.delegate(host, '[data-action="fl-open"]', 'keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ' || event.keyCode === 13 || event.keyCode === 32) {
        event.preventDefault();
        advance();
      }
    });

    if (screen.claimOnTap || screen.spotAction === 'solve') {
      /* 第 5 屏：点橙框 = 领取；第 9 屏：点橙框 = 解决 */
      var isSolve = screen.spotAction === 'solve';
      var act = function () {
        if (isSolve) {
          ctx.store.solveFrontlineTicket();
          ctx.analytics.track('frontline_ticket_solved', { page_id: screen.id });
          ui.toast('工单已解决。', { variant: 'ok', duration: 2600 });
        } else {
          ctx.store.claimFrontlineTicket();
          ctx.analytics.track('frontline_ticket_claimed', { page_id: screen.id });
          ui.toast('领取成功，这张工单归你处理。', { variant: 'ok', duration: 2600 });
        }
        ctx.go(screen.nextPageId);
      };

      ui.delegate(host, isSolve ? '[data-action="fl-solve"]' : '[data-action="fl-claim"]', 'click', function () {
        act();
      });
      ui.delegate(host, isSolve ? '[data-action="fl-solve"]' : '[data-action="fl-claim"]', 'keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ' || event.keyCode === 13 || event.keyCode === 32) {
          event.preventDefault();
          act();
        }
      });
    }

    /* 三个字段的屏：点当前这个框 → 记下已看 → 重画这一屏，出下一个框；第三个点完直接走 */
    function stepForward() {
      if (!screen.steps || !screen.steps.length) return;
      var seen = (ctx.store.getState().frontline.fields_seen || []).length;
      if (seen >= screen.steps.length) {
        ctx.go(screen.nextPageId);
        return;
      }
      var step = screen.steps[seen];
      ctx.store.seeFrontlineField(step.key);
      ctx.analytics.track('frontline_field_seen', { page_id: screen.id, field: step.key });
      if (seen + 1 >= screen.steps.length) {
        ctx.go(screen.nextPageId);
        return;
      }
      ctx.go(screen.id);
    }

    ui.delegate(host, '[data-action="fl-step"]', 'click', function () {
      stepForward();
    });

    ui.delegate(host, '[data-action="fl-step"]', 'keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ' || event.keyCode === 13 || event.keyCode === 32) {
        event.preventDefault();
        stepForward();
      }
    });

    /* 屏 11：再看一遍 —— 只清这一版演示工单，不动别的记录 */
    ui.delegate(host, '[data-action="frontline-replay"]', 'click', function () {
      ctx.store.resetFrontlineTicket();
      ctx.analytics.track('frontline_replay', { page_id: screen.id });
      ctx.go(HKR.config.frontline.screens[0].id);
    });

    ui.delegate(host, '[data-action="frontline-exit"]', 'click', function () {
      ctx.analytics.track('frontline_exit', { page_id: screen.id });
      ctx.go('roles');
    });
  }

  HKR.components.frontlineScene = {
    render: render
  };
})();
