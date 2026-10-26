/* 页面顺序与章节信息（路由进度、步骤提示都从这里取）
 * 一线员工的 11 屏不在本文件里重复写一遍：页面顺序、步骤名、进度权重全部由
 * src/config/frontline.config.js#screens 生成，改屏只改那一个文件。
 */
window.HKR = window.HKR || {};
HKR.config = HKR.config || {};

(function () {
  var TOTAL_STEPS = HKR.config.frontline.totalSteps;

  HKR.config.pages = [
    /* 角色入口不属于任何一条学习路线；选择后进入对应角色的独立进度。 */
    { id: 'roles',            chapter: '培训预习', stepLabel: '选择身份',  title: '选择查看内容', track: 'entry' },

    /* 现有完整预习内容先全部收进管理员路线，后续再按四个管理模块重排。 */
    { id: 'welcome',          chapter: '管理员版', stepLabel: '欢迎',      title: '管理员预习', track: 'admin' },
    { id: 'pain-point',       chapter: '第一章',   stepLabel: '产品价值',  title: '认识产品价值', track: 'admin' },
    { id: 'need-types',       chapter: '第一章',   stepLabel: '两类需求',  title: '认识两类需求', track: 'admin' },
    { id: 'scene-delivery',   chapter: '第二章',   stepLabel: '接单小游戏', title: '进入工作现场', track: 'admin' },
    { id: 'scene-repair',     chapter: '第二章',   stepLabel: '客房报修',  title: '主场景二', track: 'admin' },
    { id: 'scene-cleaning',   chapter: '第二章',   stepLabel: '客房打扫',  title: '主场景三', track: 'admin' },
    { id: 'feedback',         chapter: '第二章',   stepLabel: '学习反馈',  title: '学习反馈', track: 'admin' },
    { id: 'official-account', chapter: '第三章',   stepLabel: '公众号准备', title: '打通工单消息通道', track: 'admin' },
    { id: 'finish',           chapter: '完成',     stepLabel: '完成',      title: '完成页', track: 'admin' },

    /* 一线员工：先登记酒店 + 姓名，再看准备页；两页都不计入后面的学习画面。 */
    { id: 'frontline-identity', chapter: '一线员工版', stepLabel: '登记信息', title: '登记信息', track: 'frontline' },
    { id: 'frontline',        chapter: '一线员工版', stepLabel: '准备开始', title: '一线员工预习', track: 'frontline' }
  ];

  /* 11 个学习画面：顺序与步骤名来自 frontline.config.js */
  HKR.config.frontline.screens.forEach(function (screen) {
    HKR.config.pages.push({
      id: screen.id,
      chapter: '一线员工版',
      stepLabel: screen.title,
      title: screen.title,
      track: 'frontline'
    });
  });

  /* 课后测试：先是说明页，再是出题页；都不算在那 11 步里 */
  HKR.config.pages.push({
    id: 'frontline-quiz-intro',
    chapter: '一线员工版',
    stepLabel: '课前说明',
    title: '课后测试',
    track: 'frontline'
  });
  HKR.config.pages.push({
    id: 'frontline-quiz',
    chapter: '一线员工版',
    stepLabel: '课后测试',
    title: '课后测试',
    track: 'frontline'
  });

  /* 页面在进度条中的权重（按「体验步骤」计算，避免用整章平均造成进度跳动） */
  HKR.config.progressWeights = {
    roles: 0,
    'frontline-identity': 0,
    welcome: 0.05,
    'pain-point': 0.15,
    'need-types': 0.25,
    'scene-delivery': 0.45,
    'scene-repair': 0.58,
    'scene-cleaning': 0.7,
    feedback: 0.82,
    'official-account': 0.93,
    finish: 1,
    frontline: 0,
    'frontline-quiz-intro': 0.95,
    'frontline-quiz': 1
  };

  /* 一线员工：进度就是「第几屏 / 共几屏」，最后一屏到 100% */
  HKR.config.frontline.screens.forEach(function (screen) {
    HKR.config.progressWeights[screen.id] = Math.round((screen.step / TOTAL_STEPS) * 100) / 100;
  });

  /* 角色入口：手机上只做一件事，让员工按自己的工作选择学习内容。 */
  HKR.config.roleSelection = {
    kicker: '华客 AI 智能客服',
    titleLines: ['先选择你的身份'],
    subtitle: '不同岗位，看到不同的预习内容。',
    helper: '点一下自己的身份即可进入。',
    cards: [
      {
        key: 'admin',
        eyebrow: '管理视角',
        title: '管理员',
        desc: '看完整流程、岗位分工和管理数据。',
        detail: '完整预习 · 9 个页面',
        cta: '进入管理员预习',
        /* 暂时只开放一线员工版：管理版先按住，点不进去 */
        disabled: true,
        disabledBadge: '暂未开放'
      },
      {
        key: 'frontline',
        eyebrow: '现场操作',
        title: '一线工作人员',
        desc: '先调好音量，再看 ' + TOTAL_STEPS + ' 个画面。',
        detail: TOTAL_STEPS + ' 个画面 · 可以慢慢看',
        cta: '进入一线员工预习'
      }
    ]
  };

  /* 一线员工的登记页：进预习前先留「酒店 + 姓名」，方便把学习记录落回来。
     hotels 可以留空（自由输入）；以后有门店名单，填进来就变成下拉建议。 */
  HKR.config.identityPage = {
    kicker: '开始之前',
    title: '先留个名字',
    subtitle: '写清楚是哪家酒店、叫什么，学习记录才能对上人。',
    hotelLabel: '酒店名称',
    hotelPlaceholder: '例如：2.0演示酒店',
    nameLabel: '你的名字',
    namePlaceholder: '例如：王芳',
    note: '只在这次培训里用，不会发给别人。',
    cta: '开始预习',
    hotels: [],
    nextPageId: 'frontline'
  };

  /* 一线员工准备页：不自动播音，用户点开始后才进入第一画面并启动语音。 */
  HKR.config.frontlinePrepare = {
    kicker: '一线员工预习',
    titleLines: ['6分钟，' + TOTAL_STEPS + '个画面，', '边看边学'],
    volumeTitle: '开始前，<wbr />请调大手机音量',
    volumeNote: '听不清，可以点“再听一遍”',
    ctaLabel: '准备好了，开始',
    startPageId: HKR.config.frontline.screens[0].id
  };

  /* 首页（页面 0）的版式与文案：主视觉 / 信息条 / 三步 / 主按钮。
     页面只负责摆放，一句文案都不写死在 src/pages/welcome.js 里。 */
  HKR.config.welcome = {
    kicker: '管理员预习',
    /* 标题按行给：设计稿是两行（第二行单独占一行，避免窄屏上断得难看） */
    titleLines: ['AI 来帮忙了！', '酒店服务情境体验'],
    subtitle: '了解 AI 如何处理客人需求，以及员工接下来需要做什么。',
    /* 主视觉配图：换图只改这一行（文件放 assets/images/，见该目录 README） */
    heroImage: 'assets/images/welcome-hero.jpg',
    /* 信息条：icon 取 welcome.js 里的细线图标（clock / note），value 是屏幕上那行大字。
       预计用时直接引用 app.config.js#estimatedMinutes，改一处全局一致 */
    facts: [
      { icon: 'clock', label: '预计用时', value: HKR.config.app.estimatedMinutes + ' 分钟' },
      { icon: 'note', label: '无需考试', value: '轻松体验，放心参与' }
    ],
    /* 「你将体验」三步：与后面的章节顺序一致（第一章 / 第二章 / 第三章） */
    stepsLabel: '你将体验',
    steps: [
      { title: '产品介绍', desc: '了解 AI 的基本功能' },
      { title: '情境体验', desc: '模拟真实服务场景' },
      { title: '公众号准备', desc: '完成必要的入驻设置' }
    ],
    ctaLabel: '开始体验',
    tipNote: '数据只存在你自己的手机上，不会公开给其他同事。'
  };
})();
