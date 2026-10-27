/* 轻量路由：hash 路由（#/page-id）
 * - 默认先进入角色选择；管理员与一线员工各自有独立进度和页数
 * - 刷新后按 hash 恢复到当前页面；微信里点返回也不会进入空白/错误状态
 * - 管理员未走完的进度由欢迎页上的「继续上次进度」按钮决定是否继续（见 resumeTarget）
 * - 负责顶部进度、前进/后退、进入离开页时长统计
 */
window.HKR = window.HKR || {};
HKR.core = HKR.core || {};

(function () {
  var ui = HKR.core.ui;
  var store = HKR.core.store;
  var analytics = HKR.core.analytics;
  var pages = HKR.config.pages;
  var order = pages.map(function (item) {
    return item.id;
  });

  function trackOf(id) {
    var meta = metaOf(id);
    return meta && meta.track ? meta.track : 'admin';
  }

  function trackOrder(track) {
    return pages
      .filter(function (item) {
        return (item.track || 'admin') === track;
      })
      .map(function (item) {
        return item.id;
      });
  }

  var viewEl = null;
  var progressEl = null;
  var currentId = null;
  var lockUntil = 0;
  var pendingId = null;
  var lockTimer = null;
  var resumeHintMeta = null;

  function metaOf(id) {
    for (var i = 0; i < pages.length; i++) {
      if (pages[i].id === id) return pages[i];
    }
    return null;
  }

  function indexOf(id) {
    return order.indexOf(id);
  }

  /* 断点续学：只有「流程还没走完 + 上次停在欢迎页之后的页面」才算可继续。
   * 返回页面元信息（含 chapter / stepLabel，直接给首页做按钮文案），没有则返回 null。
   * 注意：路由不会拿它自动跳转，是否继续交给用户点按钮决定。 */
  function resumeTarget() {
    var session = store.getState().session;
    if (session.completion_status === 'completed') return null;
    var meta = metaOf(session.last_page_id);
    if (!meta || meta.track !== 'admin') return null;
    return trackOrder('admin').indexOf(meta.id) > 0 ? meta : null;
  }

  /* 首页「继续上次进度」入口用的值：进入下一页前会先留底（见 render），
   * 因为 store.enterPage() 会把 last_page_id 改写成当前页，之后就查不到「上次」了。
   * 流程走完（completion_status === 'completed'）后入口自动消失。 */
  function resumeHint() {
    if (store.getState().session.completion_status === 'completed') return null;
    return resumeHintMeta;
  }

  function fromHash() {
    var match = /^#\/?([a-z0-9-]+)$/i.exec(window.location.hash || '');
    var id = match ? match[1] : '';
    return indexOf(id) >= 0 ? id : null;
  }

  function renderHeader() {
    if (!progressEl) return;
    var meta = metaOf(currentId);
    var track = trackOf(currentId);
    var currentTrackOrder = trackOrder(track);
    var index = currentTrackOrder.indexOf(currentId);
    var weight = HKR.config.progressWeights[currentId] || 0;
    var canBack = currentId !== 'roles';

    ui.setHtml(
      progressEl,
      ui.html`
        <div class="topbar">
          <button class="topbar__back ${canBack ? '' : 'is-hidden'}" type="button" data-action="back" aria-label="返回上一步">
            <span class="topbar__back-icon" aria-hidden="true">‹</span>
            <span class="topbar__back-label" aria-hidden="true">返回</span>
          </button>
          <div class="topbar__meta">
            <span class="topbar__chapter">${meta ? meta.chapter : ''}</span>
            <span class="topbar__step">${meta ? meta.stepLabel : ''}</span>
          </div>
          <span class="topbar__count">${index + 1}/${currentTrackOrder.length}</span>
        </div>
        <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(weight * 100)}" aria-label="体验进度">
          <span class="progress__fill" style="width:${Math.round(weight * 100)}%"></span>
        </div>
      `
    );
  }

  var ctx = {
    go: function (pageId) {
      go(pageId);
    },
    next: function () {
      var currentTrackOrder = trackOrder(trackOf(currentId));
      var nextId = currentTrackOrder[currentTrackOrder.indexOf(currentId) + 1];
      if (nextId) go(nextId);
    },
    back: function () {
      var currentTrackOrder = trackOrder(trackOf(currentId));
      var currentIndex = currentTrackOrder.indexOf(currentId);
      var prevId = currentIndex > 0 ? currentTrackOrder[currentIndex - 1] : 'roles';
      go(prevId);
    },
    state: function () {
      return store.getState();
    },
    ui: ui,
    store: store,
    analytics: analytics,
    config: HKR.config,
    currentPageId: function () {
      return currentId;
    },
    resumeTarget: resumeTarget,
    resumeHint: resumeHint,
    restart: function () {
      analytics.clearLocalRecords();
      currentId = null;
      resumeHintMeta = null;
      window.location.hash = '/roles';
      render('roles');
      ui.toast('已重新开始，本次记录已清除（本地演示用）');
    }
  };

  /* 换页时把上一屏的讲解停掉。
   * 讲解由 components/frontline-scene.js 持有，它只在自己那几屏之间换屏时才会停，
   * 所以跨到别的页面模块（测试说明页、测题页、角色页…）要靠这里补一刀。 */
  function stopSceneAudio() {
    var scene = HKR.components && HKR.components.frontlineScene;
    if (scene && typeof scene.stopAudio === 'function') scene.stopAudio();
  }

  function render(pageId, options) {
    var opts = options || {};
    if (!opts.force && Date.now() < lockUntil) {
      /* 连续快速跳转（例如点完「下一步」马上又点返回）：等锁定结束再补渲染最后一次请求，
       * 避免出现「地址栏已经变了、页面还是上一页」 */
      scheduleAfterLock(pageId);
      return;
    }
    lockUntil = Date.now() + 260;

    if (currentId && currentId !== pageId) {
      var dwell = store.leavePage(currentId);
      analytics.track('page_leave', { page_id: currentId, dwell_seconds: Math.round(dwell) });
      /* 换页就停掉上一页还在播的讲解（跨页面模块也生效，比如第 11 屏 → 测试说明页） */
      stopSceneAudio();
    } else if (!currentId && store.getState().session.visited_pages.length === 0) {
      analytics.track('session_start', { campaign_id: store.getState().session.campaign_id });
    }

    /* 先留底：store.enterPage() 会把 last_page_id 改写成当前页，改写后就查不到「上次停在哪儿」了 */
    resumeHintMeta = resumeTarget();
    currentId = pageId;
    store.enterPage(pageId);
    analytics.track('page_view', { page_id: pageId });
    renderHeader();
    viewEl.className = 'view view--' + pageId;
    viewEl.setAttribute('data-page', pageId);
    /* 有些版式只在某一页成立（首页的整幅主视觉、首页报头只留「品牌 + 页码」），
     * 头部 / 页脚这些和页面同级、没法从 .view 往下选，用 body 上的 data-page 给 CSS 一个钩子 */
    document.body.setAttribute('data-page', pageId);
    document.body.setAttribute('data-track', trackOf(pageId));

    /* 每次渲染都换一个新的页面容器：页面上绑定的委托事件会随旧容器一起丢弃，
     * 避免上一页的按钮处理函数在下一页继续生效（会出现一次点击跳两次的情况） */
    viewEl.innerHTML = '';
    var pageEl = document.createElement('div');
    pageEl.className = 'page';
    pageEl.setAttribute('data-page', pageId);
    viewEl.appendChild(pageEl);

    var module = HKR.pages[pageId];
    if (!module || typeof module.render !== 'function') {
      ui.setHtml(pageEl, ui.html`<section class="card"><p class="card__title">页面不存在</p><p class="muted">请返回上一步。</p></section>
        <button class="btn" type="button" data-action="go-welcome">回到欢迎页</button>`);
      return;
    }
    module.render(pageEl, ctx);

    if (!opts.keepScroll) window.scrollTo(0, 0);
  }

  function scheduleAfterLock(pageId) {
    pendingId = pageId;
    if (lockTimer) return;
    lockTimer = setTimeout(function () {
      lockTimer = null;
      var target = pendingId;
      pendingId = null;
      if (target && target !== currentId) render(target, { force: true });
    }, Math.max(0, lockUntil - Date.now()) + 20);
  }

  function go(pageId) {
    if (indexOf(pageId) < 0) pageId = 'roles';
    var target = '/' + pageId;
    if (window.location.hash === '#' + target) {
      render(pageId, { force: true });
      return;
    }
    window.location.hash = target;
  }

  function boot(options) {
    viewEl = document.getElementById('view');
    progressEl = document.getElementById('progress-host');

    ui.delegate(document.body, '[data-action="back"]', 'click', function () {
      ctx.back();
    });
    ui.delegate(document.body, '[data-action="go-welcome"]', 'click', function () {
      go(order[0]);
    });

    window.addEventListener('hashchange', function () {
      var id = fromHash();
      if (id && id !== currentId) render(id);
    });

    var initial = fromHash();
    var resumedFrom = null;
    if (!initial) {
      /* 打开链接（没有 #/页面）：
       * - 一线员工：如果本机还留着上次的进度，直接回到上次停的那一页（她是用链接反复进来的）；
       * - 其他角色（管理员）：仍然固定从角色入口开始，续学只在欢迎页显式出现。 */
      var snapshot = store.getState();
      var lastPage = snapshot.session.last_page_id;
      var canResumeFrontline =
        lastPage && lastPage !== 'roles' && indexOf(lastPage) >= 0 && trackOf(lastPage) === 'frontline';

      if (canResumeFrontline) {
        initial = lastPage;
        resumedFrom = lastPage;
      } else {
        var resumable = resumeTarget();
        if (resumable) analytics.track('session_resume_available', { page_id: resumable.id });
        initial = 'roles';
      }
      window.location.replace('#' + '/' + initial);
    } else {
      analytics.track('session_resume', { page_id: initial });
    }
    render(initial, { force: true, keepScroll: !!(options && options.keepScroll) });

    if (resumedFrom) {
      analytics.track('session_resume_auto', { page_id: resumedFrom });
      showResumeToast();
    }
  }

  /* 「接着上次继续」的提示：只出现一次，不挡任何操作 */
  function showResumeToast() {
    var host = document.body;
    if (!host || !HKR.core.ui || !HKR.core.ui.toast) return;
    window.setTimeout(function () {
      HKR.core.ui.toast('接着上次继续', { variant: 'note', duration: 2200 });
    }, 400);
  }

  HKR.core.router = {
    boot: boot,
    go: go,
    render: render,
    ctx: ctx,
    order: order,
    trackOrder: trackOrder,
    metaOf: metaOf,
    resumeTarget: resumeTarget,
    currentPageId: function () {
      return currentId;
    }
  };
})();
