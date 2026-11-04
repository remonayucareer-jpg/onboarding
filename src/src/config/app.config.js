/* 全局配置：品牌、活动、存储、后端预留开关
 * 说明：本文件是唯一需要「换素材 / 换文案 / 接后端」时优先修改的地方。
 */
window.HKR = window.HKR || {};
HKR.config = HKR.config || {};

HKR.config.app = {
  productName: '华客 AI 智能客服',
  campaignId: 'hotel-pretrain-2026', // 培训活动标识（campaign_id），上线时替换为真实活动 ID
  version: 'v1.0.0-prototype',
  storageKey: 'hkr_h5_state_v1',      // 体验状态（重置开关关闭时，刷新后保留）
  eventStorageKey: 'hkr_h5_events_v1', // 行为事件（本地）
  estimatedMinutes: '5～10',
  wechatTip: '页面显示异常时，点右上角「…」→「在浏览器打开」。',

  // 品牌色（与 CSS 变量保持一致，供 canvas/内联样式使用）
  brand: {
    name: '华客',
    primary: '#FF6B1A',
    textColor: '#1E2A38'
  },

  // 第三章公众号任务
  officialAccount: {
    name: '华客极联云',
    label: '工单消息公众号',
    qrImage: 'assets/images/wechat-qr-hkcloud.png',
    qrIsPlaceholder: false,
    alt: '公众号「华客极联云」二维码',
    desc: '用来接收工单消息。关注后请完成下面三件事：',
    // 需要的三步准备（来自培训材料，正式上线前请按贵司最新材料核对）
    setupSteps: [
      '关注「华客极联云」',
      '绑定你的华客账号',
      '打开该公众号的消息推送'
    ],
    searchHint: '扫不出二维码（例如你正用微信看这个页面）时，可在微信里搜索「华客极联云」，核对名称与认证主体后再关注。',
    helpHint: '还是完不成，或不确定有没有设置好，直接告诉本次培训的工作人员。',
    // 第一版没有关注/绑定校验接口：所有结果都只是「自我确认」，不是系统核验
    verification: {
      supported: false,
      method: 'self_report', // self_report | manual_check | future_api
      note: '当前版本无法自动核验关注与绑定状态，结果仅代表员工的自我确认，需要培训人员后续人工核对。'
    }
  },

  // 后端上报：登记信息和交卷成绩都走 workbuddy 的中转
  api: {
    enabled: true,
    endpoint: '', // 旧的「预习事件」上报地址，未启用
    /* 一线员工：登记信息 / 交卷成绩 各一个地址 */
    identityEndpoint:
      'https://hkr-training-relay.app.workbuddy.host/api/frontline/identity?sharecode=Y5UUYIKLC2',
    resultEndpoint:
      'https://hkr-training-relay.app.workbuddy.host/api/frontline/result?sharecode=Y5UUYIKLC2',
    /* 跨域不通时把 contentType 改成 'text/plain;charset=UTF-8'（简单请求，不触发预检） */
    contentType: 'application/json;charset=UTF-8',
    /* 中转没开 CORS 时的兜底：预检失败后改用 text/plain + no-cors 再发一次（请求能到，
     * 但读不到回执）。等中转加上 Access-Control-Allow-Origin 后可以关掉。 */
    fallbackNoCors: true,
    headers: {},
    timeoutMs: 8000
  },

  features: {
    showLocalRecordsPanel: true, // 完成页的「查看本次本地记录（演示用）」入口
    autoPlayAudio: true, // 进一屏 0.5 秒后自动播这一屏的讲解（手机拦自动播放时会提示点按钮）
    resetRecordsOnOpen: false // false = 关掉页面再打开能接着上次继续（记录留在本机 localStorage）
  }
};

// 页面按顺序展示的两个真实公众号二维码
HKR.config.app.officialAccounts = [
  // 第一项引用上面的 officialAccount，避免两处文案不同步
  HKR.config.app.officialAccount,
  {
    name: '报障公众号',
    label: '报障服务公众号',
    qrImage: 'assets/images/wechat-qr-repair.png',
    qrIsPlaceholder: false,
    alt: '公众号「报障公众号」二维码',
    desc: '用于接收和处理报障相关消息，请扫码关注。',
    setupSteps: [],
    searchHint: '扫不出来时，可让本次培训的工作人员把公众号名片发给你。',
    helpHint: '关注后如果不知道下一步怎么设置，直接告诉本次培训的工作人员。'
  }
];

/* 修复上报读不到配置的问题：
 * 本文件的配置挂在 HKR.config.app 下（所以接口地址实际在 HKR.config.app.api），
 * 而 src/core/report.js 早期按 HKR.config.api 读，两边路径不一致 → 即使填了地址也不会发。
 * 这里补一个别名（report.js 里也做了兜底读取），以后新增代码两种写法都能拿到。 */
HKR.config.api = HKR.config.app.api;


