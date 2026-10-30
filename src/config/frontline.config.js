/* 一线员工课件（11 屏）的内容配置
 * ---------------------------------------------------------------
 * 改文案 / 换插画 / 接录音，只改这一个文件，不用碰页面代码。
 *
 * 每一屏就是 screens 数组里的一项，字段说明：
 *   id          页面 id（同时也是路由 hash：#/frontline-xxx）
 *   step        第几步（屏幕上的「第 N 步 / 共 11 步」）
 *   kind        'illustration' 实拍/正式插画 | 'scene' 内联 SVG 插画
 *               'phone' 手机端工单界面（实际操作）| 'success' 操作成功页
 *   title       大标题（≤10 字）
 *   caption     画面下一句说明（≤20 字）
 *   script      讲解稿（配音 / 提词卡用，不显示在页面上）
 *   image       插画路径。kind='scene' 时作为「替换图」：文件存在就自动换成它，
 *               不存在继续用内联 SVG —— 业务方给了正式插画，放进来即可，不用改代码
 *   audioSrc    讲解录音路径（assets/audio/xxx.mp3）。留空时按钮只给提示，不假装能播
 *   nextPageId  下一步去哪一屏
 *
 * 演示工单统一用「0000 房 · 拖鞋x1 + 纯净水x1」，与管理员版的 8011 房是两套独立演示数据。
 */
window.HKR = window.HKR || {};
HKR.config = HKR.config || {};

(function () {
  /* 这一版演示的工单：字段与真实产品一致，取值是演示数据 */
  var ticket = {
    ticketNo: '#1274669',
    title: '【0000】华客机器人/住中服务/送物服务',
    meta: '华客大酒店（演示）· 2025-04-14 17:06',
    hotel: '华客大酒店（演示）',
    room: '0000',
    category: '送物服务',
    item: '拖鞋x1、纯净水x1',
    demand: '【送物服务】拖鞋x1、纯净水x1',
    template: '送物服务-标准模板',
    statusPending: '待处理',
    statusClaimed: '处理中',
    statusSolved: '已解决',
    assigneePending: '待领取',
    assigneeClaimed: '你',
    /* 手机通知（屏 3）这张消息卡片 */
    notifyApp: '华客 AI · 工单提醒',
    notifyTime: '17:06',
    notifyTitle: '你有 1 张新的送物工单',
    notifyLine: '送物服务 · 0000 房',
    notifyDemand: '拖鞋x1、纯净水x1'
  };

  var screens = [
    {
      id: 'frontline-call',
      step: 1,
      kind: 'illustration',
      title: '客人打电话',
      caption: '客人需要服务时，会打电话表达需求。',
      script: '客人想要什么，就会打房间里的电话。这个电话，AI 会替咱们接。',
      image: 'assets/images/frontline-call.jpg',
      imageAlt: '客人坐在客房床边，把电话听筒贴在耳边，正准备向酒店说明需求。',
      audioSrc: 'assets/audio/fl-01.mp3',
      nextLabel: '下一步',
      nextPageId: 'frontline-ai-workorder'
    },
    {
      id: 'frontline-ai-workorder',
      step: 2,
      kind: 'illustration',
      title: 'AI 发来工单',
      caption: 'AI 听懂客人需求后，会把工单发到你的手机上。',
      script: 'AI 在电话里听明白客人要什么，就会自动开出一张工单，直接发到咱们手机上。咱们要干的活儿，全在这张工单上。',
      image: 'assets/images/frontline-ai-workorder.jpg',
      imageAlt: 'AI 把客人的电话需求转换成工单，酒店员工在手机上收到新工单提醒。',
      audioSrc: 'assets/audio/fl-02.mp3',
      nextLabel: '下一步',
      nextPageId: 'frontline-notify'
    },
    {
      id: 'frontline-notify',
      step: 3,
      kind: 'screenshot',
      title: '手机上收到工单',
      caption: '点击工单，查看详情。',
      script: '手机一响，就是新工单来了。咱们点开这条消息，看看客人要什么。',
      /* 业务方给的整屏截图：微信聊天页里那条工单通知（红框是素材自带的），
         外面套一圈机身当手机 —— 截图本身自带状态栏和底栏，不再补 */
      image: 'assets/images/frontline-notify-full.png',
      imageAlt:
        '手机上的公众号「华客极联云」聊天页：两条工单处理通知，红框圈住的是最新一条，门店 2.0演示酒店 0000，工单内容 水x1、成人一次性拖鞋x1。',
      imageWidth: 537,
      imageHeight: 1187,
      /* 小屏上整张手机放不下，页面允许滚动；这一屏不再给底部按钮，入口就是点手机上那条工单 */
      hideNext: true,
      /* 铺满模式：机身占满整块内容区，标题和说明压在手机屏上下两端，图片轻微压扁换字号 */
      fill: true,
      titleHeight: 10.2,
      /* 红框上沿压一支大的红色箭头（没有文字，小字在手机上看不清） */
      showGuide: true,
      /* 这一屏的「下一步」= 点开工单，要在本机记录里留一笔 */
      markTicketOpened: true,
      audioSrc: 'assets/audio/fl-03.mp3',
      nextLabel: '点开工单',
      nextPageId: 'frontline-ticket'
    },
    {
      id: 'frontline-ticket',
      step: 4,
      kind: 'screenshot',
      title: '先看三个信息',
      caption: '房间号、服务分类、服务项，一个都别漏。',
      script: '拿到工单别急着动，先看三样最要紧的：房间号、服务分类、服务项。咱们一个一个来。',
      /* 业务方给的工单详情整屏截图（1080×2376），外面同样只补一圈机身 */
      image: 'assets/images/frontline-detail-full.jpg',
      imageAlt:
        '手机上的工单详情：标题【0000】华客机器人/住中服务/送物服务，状态 待处理、超时，需求摘要，基本信息里的酒店、房间号 0000、服务分类 送物服务、服务项 水x1 与 成人一次性拖鞋x1。',
      imageWidth: 1080,
      imageHeight: 2376,
      /* 三个字段的热区：一次只出一个框，点完一个才出下一个。
         top / height 是按截图实际像素量的（分隔线 1374 / 1529 / 1684 / 1914，图高 2376）：
         房间号 1374-1529、服务分类 1529-1684、服务项 1684-1914；left/width 取分隔线两端 40-1040。 */
      steps: [
        {
          key: 'room',
          label: '房间号',
          top: 57.8,
          height: 6.6,
          hint: '① 先看房间号：送到哪一间。',
          audioSrc: 'assets/audio/fl-04-1.mp3'
        },
        {
          key: 'category',
          label: '服务分类',
          top: 64.4,
          height: 6.6,
          hint: '② 再看服务分类：这是哪一类活儿。',
          audioSrc: 'assets/audio/fl-04-2.mp3'
        },
        {
          key: 'item',
          label: '服务项',
          top: 70.9,
          height: 9.7,
          hint: '③ 最后看服务项：要拿什么、拿几件。',
          audioSrc: 'assets/audio/fl-04-3.mp3'
        }
      ],
      doneHint: '三个都看完了，接着去领取。',
      audioSrc: 'assets/audio/fl-04.mp3',
      /* 和第 3 屏同一套：机身按原图比例铺满高度，标题压在屏内上沿；说明先去掉（要看效果） */
      fill: true,
      titleHeight: 11.7,
      /* 播放键落在原产品那个蓝色播放按钮的位置（截图 965,1833 / 1080×2376） */
      audioSpot: { left: 89.4, top: 77.1 },
      /* 分步录音上线后，底部说明条恢复显示：点完一个框，文字提示和录音同步给，
         第三个框点完留在本屏放完那句话，再点手机继续（不再直接跳屏） */
      hideHint: false,
      hideNext: true,
      hideAudio: true,
      nextLabel: '去领取',
      nextPageId: 'frontline-claim'
    },
    {
      id: 'frontline-claim',
      step: 5,
      kind: 'screenshot',
      title: '点「领取」',
      caption: '点一下「领取」，这张工单才归你处理。',
      script: '看完了就点下方的「领取」。点了领取，这一单就归咱们了，咱们就按工单上客人的需求，把这单做完。',
      /* 沿用第 4 屏那张详情图，只在底部的「领取」上做一个橙框 */
      image: 'assets/images/frontline-detail-full.jpg',
      imageAlt:
        '手机上的工单详情：房间号 0000、服务分类 送物服务、服务项 水x1 与 成人一次性拖鞋x1，底部是蓝色的「领取」按钮。',
      imageWidth: 1080,
      imageHeight: 2376,
      /* 橙色框的位置按截图量：按钮 2215–2340（图高 2376），横向 46–1035（图宽 1080） */
      spot: { top: 92.8, height: 6.1, left: 3.6, width: 92.8, label: '领取' },
      claimOnTap: true,
      /* 橙框 + 红箭头双层提示：箭头尖压在「领取」上沿，箭头本身也能点 */
      showGuide: true,
      guideTop: 78.6,
      fill: true,
      titleHeight: 11.7,
      audioSpot: { left: 89.4, top: 77.1 },
      hideHint: true,
      hideNext: true,
      hideAudio: true,
      audioSrc: 'assets/audio/fl-05.mp3',
      nextLabel: '去布草间',
      nextPageId: 'frontline-pickup'
    },
    {
      id: 'frontline-pickup',
      step: 6,
      kind: 'scene',
      scene: 'staff-prepare',
      title: '布草间取物',
      caption: '去布草间，把客人要的东西拿上。',
      script: '去布草间，把东西拿上：这一单是一瓶水，一双成人一次性拖鞋。要是怕记不住，随时打开工单看一眼，照着拿就行。',
      image: 'assets/images/frontline-06-pickup.jpg',
      imageAlt: '员工在布草间从货架上取下客人需要的物品。',
      audioSrc: 'assets/audio/fl-06.mp3',
      nextLabel: '下一步',
      nextPageId: 'frontline-find-room'
    },
    {
      id: 'frontline-find-room',
      step: 7,
      kind: 'scene',
      scene: 'staff-walk-0000',
      title: '找到 0000 房',
      caption: '按房号找门，别送错房间。',
      script: '东西拿好了，就去找房间。这一单是零零零零房。到门口看一眼门牌，对上了再敲门，别走错门。',
      image: 'assets/images/frontline-07-walk.jpg',
      imageAlt: '员工拿着客人要的物品，沿酒店走廊走向 0000 房。',
      audioSrc: 'assets/audio/fl-07.mp3',
      nextLabel: '下一步',
      nextPageId: 'frontline-deliver'
    },
    {
      id: 'frontline-deliver',
      step: 8,
      kind: 'scene',
      scene: 'staff-deliver-0000',
      title: '递给客人',
      caption: '敲门，把东西交到客人手上。',
      script: '到了门口敲敲门，把东西递到客人手上。不过到这里还没完哦，咱们还得再回到工单上。',
      image: 'assets/images/frontline-08-deliver.jpg',
      imageAlt: '员工在 0000 房门口，把物品递到客人手上。',
      audioSrc: 'assets/audio/fl-08.mp3',
      nextLabel: '下一步',
      nextPageId: 'frontline-solve'
    },
    {
      id: 'frontline-solve',
      step: 9,
      kind: 'screenshot',
      title: '回手机点「解决」',
      caption: '服务做完，还要在手机上把工单关掉。',
      script: '东西送到了，咱们回到手机上。点底下的「解决」，点了它，这一单才算真正做完。',
      /* 业务方给的「领取后」整屏截图（556×1173），自带的播放/扳手两个悬浮按钮已从图里抹掉 */
      image: 'assets/images/frontline-solve-full.png',
      imageAlt:
        '手机上的工单详情（已领取）：当前处理人 张璐璐，开始处理时间与最后更新时间，底部是指派 / 解决两个按钮。',
      imageWidth: 556,
      imageHeight: 1173,
      /* 橙框落在底部的「解决」上（1000–1165 之间量出来：解决在 x 370–455） */
      spot: { top: 92.4, height: 7, left: 65, width: 18, label: '解决' },
      spotAction: 'solve',
      fill: true,
      hideHint: true,
      titleHeight: 11.7,
      hideNext: true,
      hideAudio: true,
      audioSrc: 'assets/audio/fl-09.mp3',
      nextLabel: '继续',
      nextPageId: 'frontline-account'
    },
    {
      id: 'frontline-account',
      step: 10,
      kind: 'qr',
      title: '最后：关注两个公众号',
      caption: '',
      script:
        '最后一步：把这两个二维码都长按关注一下。左边「华客极联云」，新工单都推到这儿，不关注就收不到。右边「华客微服务」，工单遇到问题就在这儿报障。具体怎么用，上课老师会带着大家讲一遍。',
      /* 两个二维码并排：左「华客极联云」收工单，右「华客微服务」做报障 */
      qrList: [
        {
          image: 'assets/images/frontline-account-qr.png',
          alt: '公众号「华客极联云」的二维码',
          name: '华客极联云',
          role: '收工单通知'
        },
        {
          image: 'assets/images/frontline-account-qr-service.png',
          alt: '公众号「华客微服务」的二维码',
          name: '华客微服务',
          role: '工单报障'
        }
      ],
      qrHint: '长按两张二维码进行关注，课前务必完成。',
      qrNotes: [
        '「华客极联云」：新工单会推到这里，不关注就收不到。',
        '「华客微服务」：工单上遇到问题，可以在这里自动报障；具体怎么用，上课时老师会带着讲一遍。'
      ],
      audioSrc: 'assets/audio/fl-11.mp3',
      /* 关注完先进测试说明页，再进测试 */
      nextLabel: '开始测试',
      nextPageId: 'frontline-quiz-intro'
    }
  ];

  /* 课后测试的说明页（出题之前先讲清楚规则）——挂到下面最终的 config 上 */
  var quizIntro = {
    kicker: '课后测试',
    title: '先做个小测试',
    subtitle: '看看刚才看的内容记住了没有，不用紧张。',
    points: [
      '都对着工单回答：房间号、要送什么、要送几个',
      '每道题选一个答案，选完马上告诉你对不对'
    ],
    note: '答错了也没关系，可以再看一遍、再来一次。',
    /* 这一页的讲解录音：录好放到 assets/audio/ 下，把文件名填进来就自动生效
     * （留空时点播放键只会提示"录音还在制作"） */
    audioSrc: 'assets/audio/fl-intro.mp3',
    audioLabel: '听讲解',
    cta: '开始答题',
    nextPageId: 'frontline-quiz'
  };

  /* ============ 课后测试 ============
   * 三张工单截图（只裁了「基本信息」那一栏，字放到最大），每张问三题：房间号 / 物品 / 数量。
   * 规则：一屏一题、答完立即判对错并给一句解释；**全卷答对 2 题就算通过**（业务方定的）。
   */
  var quizTickets = [
    {
      key: 't1',
      image: 'assets/images/quiz-info-1.jpg',
      room: '0812',
      item: '矿泉水',
      unit: '瓶',
      qty: 1,
      itemOnTicket: '水x1'
    },
    {
      key: 't2',
      image: 'assets/images/quiz-info-2.jpg',
      room: '1205',
      item: '衣架',
      unit: '个',
      qty: 2,
      itemOnTicket: '衣架x2'
    },
    {
      key: 't3',
      image: 'assets/images/quiz-info-3.jpg',
      room: '1603',
      item: '毛巾',
      unit: '条',
      qty: 1,
      itemOnTicket: '毛巾x1'
    }
  ];

  var ALL_ROOMS = quizTickets.map(function (t) {
    return t.room;
  });
  var ALL_ITEMS = quizTickets.map(function (t) {
    return t.item;
  });

  var quizQuestions = [];
  quizTickets.forEach(function (t) {
    quizQuestions.push({
      id: t.key + '-room',
      image: t.image,
      prompt: '这张工单要送到哪个房间？',
      options: ALL_ROOMS.slice(),
      answer: t.room,
      explain: '看「房间号」那一行：写的是 ' + t.room + '，别送错门。'
    });
    quizQuestions.push({
      id: t.key + '-item',
      image: t.image,
      prompt: '客人要的是什么？',
      options: ALL_ITEMS.slice(),
      answer: t.item,
      explain: '看「服务项」：「' + t.itemOnTicket + '」说明要的是' + t.item + '。'
    });
    quizQuestions.push({
      id: t.key + '-qty',
      image: t.image,
      prompt: '要送几个？',
      options: ['1', '2', '3'].map(function (n) {
        return n + ' ' + t.unit;
      }),
      answer: t.qty + ' ' + t.unit,
      explain: '「' + t.itemOnTicket + '」里的 x' + t.qty + ' 就是 ' + t.qty + ' ' + t.unit + '。'
    });
  });

  /* ============ 开场封面（真正的落地首屏） ============
   * 一句“这是一份正式材料” + 三个数字 + 三条说明，然后进开场漫画。
   */
  var cover = {
    /* 开屏页直接用设计稿那张图（780×1688 = 390×844 @2x），换图只改这一行 */
    poster: 'assets/images/start-page/start-cover.png',
    posterAlt: '一线员工预习材料：10 个学习画面，6 分钟看完，答对 2 题就能通过。',
    nextPageId: 'frontline-comic'  };
  /* ============ 开场漫画（落地首屏） ============
   * 一页四格，4.5 秒自动播完，然后停住等她点。
   * 图在 assets/images/comic/，拟声词不烤进图里，位置用百分比对准画面。
   */
  var comic = {
    nextPageId: 'frontline-identity',
    /* 顶部那行：和正文的「第 N 步 / 共 10 步」用同一套排版，只是内容换成这一屏自己的 */
    stepLabel: '场景',
    countLabel: '约 5 秒',
    subtitle: '没有 AI 的时候',
    /* 旁白录音位：四个音效全部放完之后，再播这一段人声。
     * 现在先空着（不播任何东西）。录音录好后：
     *   1) 文件放到 assets/audio/fl-comic-narration.mp3
     *   2) 把下面这行填上文件名：'assets/audio/fl-comic-narration.mp3'
     * 页面上不显示任何文字，只有声音。 */
    narrationSrc: 'assets/audio/fl-comic-narration.mp3',
    /* 播完之后只出现一个动作按钮；那句共情文案暂时不放（留空即不显示） */
    endline: '',
    nextLabel: '看 AI 怎么搭把手',
    /* start：第一格入场时间；step：每格间隔（4 格 = 0.5 + 0.85×4 + 0.15 ≈ 4.0s 播完） */
    timeline: { start: 500, step: 850 },
    panels: [
      {
        shape: 'wide',
        src: 'assets/images/comic/fl-comic-1.webp',
        alt: '走廊里，她一手举着话筒、一手抱着工单，肩上还夹着一部手机。',
        onoma: '叮铃铃铃！！',
        x: 4,
        y: 8,
        rot: -8,
        size: 'lg'
      },
      {
        shape: 'small',
        src: 'assets/images/comic/fl-comic-2.webp',
        alt: '她抱着水和拖鞋在走廊里小跑。',
        onoma: '咚咚咚…',
        x: 52,
        y: 62,
        rot: 6,
        size: 'md'
      },
      {
        shape: 'small',
        src: 'assets/images/comic/fl-comic-3.webp',
        alt: '客房门打开，客人一脸困惑，她站在门外有些不好意思。',
        /* 空泡泡里放她的一声「啊？」：泡泡中心约 (53%, 16%) */
        onoma: '啊？',
        x: 53,
        y: 16,
        rot: -3,
        size: 'sm',
        /* 客人那句「我不要这个…」挪到画面左上角，当旁白式的一句 */
        extra: { text: '我不要这个…', x: 4, y: 74, rot: -3 }
      },
      {
        shape: 'banner',
        src: 'assets/images/comic/fl-comic-4.webp',
        alt: '她扶着额头，眼睛打转，怀里东西快掉了。',
        onoma: '晕……',
        x: 78,
        y: 58,
        rot: 5,
        size: 'lg'
      }
    ],
    /* 音效按“第几格出现”触发；文件还没放进来就静默跳过 */
    sfx: [
      { panel: 1, src: 'assets/audio/sfx-ring.wav' },
      { panel: 3, src: 'assets/audio/sfx-pop.wav' },
      { panel: 4, src: 'assets/audio/sfx-dizzy.wav' }
    ]
  };

  HKR.config.frontline = {
    /* 屏数由 screens 自己算：加一屏 / 删一屏不用再改数字 */
    totalSteps: screens.length,
    ticket: ticket,
    cover: cover,
    comic: comic,
    screens: screens,
    quizIntro: quizIntro,
    quiz: {
      passCorrect: 2,
      questions: quizQuestions
    }
  };
})();






















