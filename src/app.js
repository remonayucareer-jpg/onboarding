/* 启动入口：解析活动链接参数 → 恢复会话 → 启动路由 */
window.HKR = window.HKR || {};

(function () {
  var cfg = HKR.config.app;
  var store = HKR.core.store;
  var analytics = HKR.core.analytics;
  var router = HKR.core.router;
  var ui = HKR.core.ui;

  function queryParams() {
    var result = {};
    var search = (window.location.search || '').replace(/^\?/, '');
    if (!search) return result;
    search.split('&').forEach(function (pair) {
      if (!pair) return;
      var parts = pair.split('=');
      var key = decodeURIComponent(parts[0]);
      var value = decodeURIComponent((parts[1] || '').replace(/\+/g, ' '));
      result[key] = value;
    });
    return result;
  }

  /* 活动链接可以带上角色/酒店/员工标识，例如：?role=frontline&hotel_id=H001&campaign_id=xxx
   * 不传参数时保持匿名会话（user_id / hotel_id 均为 null）。 */
  function applyCampaignParams() {
    var params = queryParams();
    var changed = false;
    store.update(function (state) {
      if (params.campaign_id) {
        state.session.campaign_id = params.campaign_id;
        changed = true;
      }
      if (params.role === 'frontline' || params.role === 'admin') {
        state.session.role = params.role;
        changed = true;
      }
      if (params.hotel_id) {
        state.session.hotel_id = params.hotel_id;
        changed = true;
      }
      if (params.user_id) {
        state.session.user_id = params.user_id;
        changed = true;
      }
    });
    if (changed) analytics.track('campaign_params_applied', { params: params });
    if (params.reset === '1') store.reset();
  }

  function bindLifecycleLogging() {
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        var pageId = router.currentPageId();
        if (pageId) {
          var dwell = store.leavePage(pageId);
          analytics.track('page_hidden', { page_id: pageId, dwell_seconds: Math.round(dwell) });
        }
      } else {
        /* 回到页面时重新计时，避免把离开的时间算进单页时长 */
        store.enterPage(router.currentPageId() || 'welcome');
      }
    });
  }

  function bindErrorLogging() {
    window.addEventListener('error', function (event) {
      analytics.track('client_error', {
        message: event.message,
        source: event.filename,
        line: event.lineno
      });
      if (window.console && window.console.warn) {
        window.console.warn('[HKR H5] 运行期错误：', event.message);
      }
    });
  }

  function boot() {
    try {
      /* 本地演示模式：每次 index 重新加载（包括刷新、关闭后重开）都从干净状态开始。
         正式上线时可在 app.config.js 中把 features.resetRecordsOnOpen 改为 false。 */
      if (cfg.features && cfg.features.resetRecordsOnOpen) {
        analytics.clearLocalRecords();
      }
      applyCampaignParams();
      bindLifecycleLogging();
      bindErrorLogging();
      router.boot();
      analytics.track('app_boot', { version: cfg.version });
      if (store.isPersistent() === false) {
        ui.toast('当前浏览器不允许本地存储，本次记录仅在当前页面有效', { variant: 'note', duration: 3200 });
      }
    } catch (error) {
      var view = document.getElementById('view');
      if (view) {
        view.innerHTML =
          '<section class="card card--warn"><p class="card__title">页面加载出现问题</p>' +
          '<p class="card__desc">请刷新页面重试。错误信息：' + ui.escapeHtml(String(error && error.message ? error.message : error)) + '</p></section>';
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
