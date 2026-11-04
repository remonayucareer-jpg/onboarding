/* 一线员工的 11 个学习画面：11 屏共用一套页面结构，只有配置不同。
 * 在这里一次性把 11 个页面 id 注册进 HKR.pages —— 标题 / 文案 / 画面 / 配音
 * 全部来自 src/config/frontline.config.js#screens，加一屏只改那个配置。
 */
window.HKR = window.HKR || {};
HKR.pages = HKR.pages || {};

(function () {
  HKR.config.frontline.screens.forEach(function (screen) {
    HKR.pages[screen.id] = {
      render: function (host, ctx) {
        HKR.components.frontlineScene.render(host, ctx, {
          pageId: screen.id,
          config: screen
        });
      }
    };
  });
})();
