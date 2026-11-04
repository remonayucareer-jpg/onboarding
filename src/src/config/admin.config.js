/* 管理版配置：文案与结构集中在这里，页面只负责摆
 * 设计稿：管理版第 1 屏「AI 能做 / 不能做」
 */
window.HKR = window.HKR || {};
HKR.config = HKR.config || {};

(function () {
  HKR.config.admin = {
    panorama: {
      kickerOff: '没有 AI 的时候',
      kickerOn: '有了 AI 之后',
      title: 'AI 能做',
      titleDim: '/ 不能做',
      items: [
        {
          no: '01',
          pain: '多通电话同时来，记不清谁要什么',
          solve: '房号需求都在工单里，随时可查'
        },
        {
          no: '02',
          pain: '同一个问题被反复问',
          solve: '知识库直答，不用人力重复'
        },
        {
          no: '03',
          pain: '酒店没有的东西也来问',
          solve: '按实际清单答，拿不准转人工'
        },
        {
          no: '04',
          pain: '高峰占线，人工接不过来',
          solve: '同时接听多路，高峰不漏'
        }
      ],
      summary: '人机协同，服务不断档',
      nextLabel: '继续',
      nextPageId: null
    }
  };
})();
