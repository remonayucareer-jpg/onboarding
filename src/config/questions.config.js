/* 全部题目与选项文案（配置化；后续换题目只需改这里）
 * 每题字段：key / label / desc / tag / isCorrect / explain / correctLogic
 */
window.HKR = window.HKR || {};
HKR.config = HKR.config || {};

/* ---------- 页面 1：工作困扰单选（了解关注点，不做身份判断/考核/分流） ---------- */
HKR.config.painPoint = {
  id: 'q_pain_point',
  title: '最希望改善工作中的哪件事？',
  hint: '选一个最贴近你日常的选项，不记录对错，也不影响后面的体验。',
  ctaLabel: '选一个选项后继续',
  recordedAs: 'pain_point_choice',
  /* 每个选项末尾那句话的前半句固定（见 options[].help），不要写在每个选项里重复三遍 */
  helpLead: '我们可以帮忙！',
  options: [
    {
      key: 'A',
      label: '同样的问题，总要反复回答。',
      valueTitle: '常见咨询反复回答',
      valueSummary: '在酒店已配置的知识库范围内，AI 可以回答常见咨询；超出范围时按配置的话术或转接规则处理。',
      valuePoints: [
        '早餐时间、洗衣服务、设施位置这类重复问题，AI 先接。',
        '知识库里没有答案的问题，按酒店配置的话术回复或转人工。',
        '能回答什么，取决于酒店配置了什么。'
      ],
      help: '避免重复回答相同问题，我们知道这很累'
    },
    {
      key: 'B',
      label: '客人有了需求，我怕没及时接到任务。',
      valueTitle: '任务要及时有人接手',
      valueSummary: '识别到已配置的服务需求时，AI 生成工单，并按配置推送给相关人员。',
      valuePoints: [
        '送物、报修、打扫等需求，变成一张有记录的工单。',
        '工单按酒店配置推送，减少「口头传话」造成的遗漏。',
        '工单只是任务流转的开始，服务仍要员工完成。'
      ],
      help: 'AI 自动分析整理客户要求，减少传话误差，更准确，更高效'
    },
    {
      key: 'C',
      label: '工作做了不少，但很难看清整体情况。',
      valueTitle: '看清整体服务情况',
      valueSummary: '系统提供工单数据统计和报表，帮助管理人员了解服务量、平均处理时长、完成率。',
      valuePoints: [
        '管理员能看到服务量、平均处理时长、完成率。',
        '数据来自工单流转记录，不需要手工汇总。',
        '一线员工日常只需要关注自己的工单。'
      ],
      help: '你的辛苦，值得被看见'
    }
  ]
};

/* ---------- 页面 2：酒店工作类型（两类需求：服务类 / 咨询类） ---------- */
HKR.config.needTypes = {
  title: '酒店工作类型',
  subtitle: '分清这两类，后面的工单就好理解。',
  /* 先服务类、再咨询类（设计稿页面 3 的顺序）：这一屏往下要讲「工单怎么来」，
     所以先讲「有人要去做」的那一类。
     每张卡片：style（样式修饰类 .need-card--xxx，同时也是本地记录的值）/ icon / name / hint
     / examples（客人原话）/ desc（AI 怎么处理） */
  cards: [
    {
      style: 'service',
      icon: 'hand',
      name: '服务类',
      hint: '提需求，需要有人去做',
      examples: ['「帮我送两条毛巾。」', '「房间空调坏了。」', '「请安排客房打扫。」'],
      desc: 'AI 识别到已配置的服务需求后生成工单，交给相关人员处理。'
    },
    {
      style: 'consult',
      icon: 'chat',
      name: '咨询类',
      hint: '问问题，不需要员工接手',
      examples: ['「早餐几点开始？」', '「酒店有洗衣服务吗？」'],
      desc: '在知识库配置范围内，AI 可以回答相关问题。'
    }
  ],
  /* 卡片下面那条提示（设计稿：ⓘ + 两行小字），也是这一屏唯一的说明容器。
     原「一句话记住区别」整段已删除 —— 两类的差别由卡片自己讲，不再多一段结论重复 */
  note: '请点击选择你在日常处理的工作类型，并查看华客 AI 如何为你在你的环节提供帮助',
  ctaLabel: '继续，看工单怎么来'
};

/* ---------- 页面 6：学习反馈 ---------- */
HKR.config.feedback = {
  title: '最后两个小问题',
  subtitle: '帮我们知道正式培训该重点讲什么。没有对错，也不影响你能不能完成。',
  clarity: {
    id: 'feedback_clarity',
    question: '刚才的流程清楚吗？',
    options: [
      { key: 'clear', label: '很清楚。' },
      { key: 'mostly', label: '大致明白，还有点疑问。' },
      { key: 'unclear', label: '不太清楚，想请老师再讲一次。' }
    ]
  },
  learningNeed: {
    id: 'learning_need_category',
    question: '课堂上你最想重点听什么？',
    options: [
      { key: 'where_to_view', label: '去哪里查看工单。' },
      { key: 'how_to_claim', label: '怎么领取工单。' },
      { key: 'after_service', label: '服务完成后怎么处理。' },
      { key: 'no_notification', label: '没收到通知时怎么办。' },
      { key: 'who_handles', label: '不同类型的工单由谁处理。' },
      { key: 'other', label: '其他问题。', allowFreeText: true }
    ],
    freeTextPlaceholder: '想补充的地方（选填）'
  }
};

/* ---------- 页面 7：公众号任务三状态 ---------- */
HKR.config.officialAccountOptions = [
  {
    key: 'A',
    status: 'self_confirmed',
    label: '已完成关注和要求的设置。',
    desc: '我已经关注了公众号，也确认了账号绑定和消息推送。',
    record: {
      official_account_status: '自我确认完成',
      verification_method: 'self_report',
      verified_at: null,
      help_requested: false
    },
    response: '正式上岗前，请确认消息能正常收到（可让同事发一条测试工单）。'
  },
  {
    key: 'B',
    status: 'followed_pending',
    label: '之前已经关注过，需要确认设置是否完整。',
    desc: '我关注过了，但不确定账号绑定、消息推送有没有设置好。',
    record: {
      official_account_status: '已关注待确认',
      verification_method: 'manual_check',
      verified_at: null,
      help_requested: true
    },
    response: '培训人员会和你一起核对绑定与推送设置。'
  },
  {
    key: 'C',
    status: 'not_done',
    label: '还没有完成，或者遇到操作问题，需要协助。',
    desc: '我还没关注，或者扫码、绑定时遇到了问题。',
    record: {
      official_account_status: '未完成 / 需要协助',
      verification_method: 'manual_check',
      verified_at: null,
      help_requested: true
    },
    response: '培训人员会根据这条记录来帮你处理。'
  }
];
