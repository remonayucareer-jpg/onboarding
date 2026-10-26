/* 第二章场景配置：一个完整主场景（送物）+ 两个快速场景（报修 / 打扫）
 * 所有文案、工单演示字段、题目、手机端阶段都是配置化的，后续换真实数据只改这里。
 *
 * screenshots：如果拿到真实手机端截图，把图片放到 assets/images/ 下并使用下面约定的文件名，
 *              页面会自动改用真实截图；文件不存在时自动回退到「模拟界面」。
 *              （约定文件名见 README.md「替换真实素材」一节）
 */
window.HKR = window.HKR || {};
HKR.config = HKR.config || {};

HKR.config.scenes = {
  /* ============ 主场景一：送物工单（第二章互动剧情「酒店服务接单小游戏」，共十幕） ============
   * 工单字段与状态全部对照真实产品截图（assets/images/phone-wo-detail-real.png，
   * 由项目根目录的「软件手机视角参考图片.png」裁切而来）：
   * 工单详情-#1274669 / 房间号 8011 / 服务分类 送物服务 / 服务项 纯净水x1 / 状态 待处理，
   * 领取后状态为「处理中」，底部按钮为「指派 / 解决」。
   * 请勿改动这些业务字段与状态：题目答案与红框位置都以这张真实截图为准。
   */
  delivery: {
    id: 'scene_delivery',
    kindLabel: '主场景一',
    chapterLabel: '第二章 · 进入工作现场',
    title: '酒店服务接单小游戏',
    ticket: {
      ticketNo: '1274669',
      title: '【8011】华客机器人/住中服务/送物服务',
      meta: '腾讯云测试 创建于 2024-11-08 15:16:32',
      hotel: '华客酒店-AI语音测试',
      room: '8011',
      category: '送物服务',
      categoryType: 'delivery',
      item: '纯净水x1',
      template: '酒店/华客机器人/华客酒店-AI语音测试/送物服务',
      demand: '【送物服务】纯净水x1;',
      createdAt: '今天 21:14',
      statusPending: '待处理',
      statusClaimed: '处理中',
      assigneePending: '待领取',
      assigneeClaimed: '你（本页模拟领取）',
      footerNote: '原型示例数据，实际以真实系统为准。'
    },
    phone: {
      screenTitle: '工单详情',
      appTitlePrefix: '工单详情-#',
      /* 第三幕把真机截图套进一层手机设备框（设计稿页面 5），设备框顶部的状态栏时间写在这里；
         截图素材本身没有状态栏，这一条是设计稿给设备框补的 */
      frameTime: '9:41',
      tabs: ['工单详情', '通话录音', '操作历史'],
      tabsNote: '「通话录音」是后台留档，一线员工不用听；干活的信息以工单为准。',
      /* 第二幕「滑入手机」那块优先用 screenshots.notify 的真图；
         下面四条只有真图缺失时才用（回退成模拟界面，字段与真图同构） */
      notifyTitle: '新工单提醒',
      notifyApp: '华客 · 工单消息',
      notifyTime: '21:14',
      notifyBadge: '待处理',
      claimLabel: '领取',
      afterClaimTitle: '领取成功，这张工单归你处理',
      afterClaimDesc: '送完水以后，还要按酒店流程把工单处理完（例如点「解决」），才算结束。',
      laterActions: [
        { label: '指派', desc: '如果这张工单要交给其他同事处理，可以用「指派」转出去。' },
        { label: '解决', desc: '服务做完之后，用「解决」把工单关上——领取不等于完成。' }
      ]
    },
    screenshots: {
      /* 真实产品截图（裁自「软件手机视角参考图片.png」）：工单详情 · 待处理 */
      detail: 'assets/images/phone-wo-detail-real.png',
      /* 真实产品截图（业务方提供的「收到工单提醒-替换图.png」，482 × 805）：公众号「工单处理通知」消息列表。
       * 这张素材自带手机外壳与红色高亮框（红框是素材里画好的，不是本页叠加的标注），
       * 所以第二幕不套设备框、也不补白底圆角 / 投影（素材含外壳外那圈柔和投影，套一层就是手机外面多一个直角方框）；
       * 文件缺失时回退到 phone.notify* 的模拟界面。 */
      notify: 'assets/images/phone-wo-notify-real.png'
    },
    game: {
      introLine: '十幕：前两幕只要看，第三幕起你动手。',
      /* 开场封面（设计稿页面 4）：这一章进第一幕之前，先把「要看什么」讲清楚。
       * 封面不算一幕：幕进度还是「第 1 幕 / 共 10 幕」，点「开始」才播第一幕动画。 */
      cover: {
        title: '接下来，交给我们',
        chips: ['一段小动画', '互动小游戏', '约 1 分钟'],
        line: '看看华客 AI 是怎么配合你工作的',
        ctaLabel: '开始',
        note: '开始后将播放动画 · 播完自动进入下一幕'
      },
      /* 第六幕「飞爪抓取挑战」：客人要纯净水 × 1，台面上另摆着拖鞋和毛巾。
       * 这是教学小游戏，考的是「选对物品」，不是操作精度——爪子落在哪、判定规则、
       * 连续抓错后的自动吸附都在 components/claw-game.js 里（方向 + 宽容区 + 吸附）；
       * 文案与动画时长统一放这里改，页面和组件里不写死。
       * answer 是这一关正确的物品（key 与 items[].key 对应）；items 只放名字，坐标归组件。 */
      claw: {
        answer: 'water',
        taskLine: '现在请用飞爪抓取客人所需的产品吧',
        taskItem: '纯净水',
        taskCount: '× 1',
        boardLabel: '飞爪抓取区：台面上摆着拖鞋、纯净水和毛巾，飞爪在上面左右摆动',
        legendLabel: '台面上的物品',
        items: [
          { key: 'slippers', label: '拖鞋' },
          { key: 'water', label: '纯净水' },
          { key: 'towels', label: '毛巾' }
        ],
        releaseLabel: '抓取',
        tip: '飞爪会自己左右摆动，看准了再点「抓取」，不用着急。',
        wrongHint: '客人需要的是纯净水，再试一次吧。',
        assistHint: '已帮你把飞爪对准纯净水，点「抓取」就好。',
        success: {
          title: '抓取成功！纯净水 × 1',
          note: '水领到手了，接着按房间需求准备并送到 8011 房。'
        },
        assist: { afterWrong: 2 },
        skip: {
          label: '跳过游戏',
          ariaLabel: '跳过飞爪抓取小游戏：直接把纯净水 × 1 记为已领取，继续下一步',
          doneToast: '已为你完成本环节，继续下一步'
        },
        replay: { label: '再抓一次', toast: '已重置，可以再抓一次纯净水' },
        done: {
          title: '纯净水 × 1 已领取',
          note: '这一环节已完成，接着按房间需求送到 8011 房。',
          skippedNote: '本环节由系统代为完成（跳过游戏），接着按房间需求送到 8011 房。'
        },
        nextLabel: '继续，去 8011 房间',
        nextNote: '下一步：领取之后，服务才开始。',
        playNote: '没时间玩也没关系：点下面的「跳过游戏」，系统会直接把纯净水 × 1 记为已领取。',
        /* 动画节奏：一个完整来回 4.8s（看清了再点也来得及）；各段时长足够看清发生了什么 */
        timing: {
          swingPeriodMs: 4800,
          snapMs: 180,
          dropMs: 520,
          gripMs: 140,
          liftMs: 620,
          settleMs: 320,
          successHoldMs: 2000
        }
      },
      /* 第七幕「走廊寻房挑战」：第六幕把水领到手，这一幕要把水按房号送到客人的房门口。
       * 第二个可玩环节，考的是「看房号找对门」——一格一步、没有倒计时，
       * 走错门只提示一句、撞墙只是停在原地（不扣分、不写任何失败字段）；
       * 地图、碰撞、房门口判定都在 components/corridor-game.js 里，文案与节奏统一放这里改。
       * 文案里 {room} 会被组件替换成 targetRoom、{here} 是脚下的房号（房号只在 targetRoom 写一次）；
         * 任务条分三块：taskTag（左上角那枚标签）/ taskLine（要送到哪一间，{room} 也用在这里）/ taskItem + taskCount（手里有什么）。 */
      corridor: {
        targetRoom: '8011',
        taskTag: '送物任务',
        taskLine: '把纯净水送到 8011 房门口',
        taskItem: '纯净水',
        taskCount: '× 1',
        boardLabel: '八楼走廊俯视图：上排是 8007 到 8010 房，下排是 8014 到 8011 房，中间那栋是服务间与电梯厅；每间门口都有深蓝门牌与壁灯，8011 房门口亮着暖色灯并插着一枚定位针',
        padLabel: '移动方向键',
        padHint: '一次走一格：点方向键，也可以按键盘的方向键 / WASD。',
        startHint: '从服务间出发，沿走廊走到 8011 房门口。',
        walkHint: '继续往前走，8011 在走廊的另一头。',
        doorHint: '这里是 {here} 房门口，客人要的是 {room} 房。',
        blockedHint: '这边是服务间 / 电梯厅的墙，走不过去，换个方向。',
        success: { title: '已送到 8011 房门口' },
        skip: {
          label: '跳过走位，直接送达',
          ariaLabel: '跳过走廊寻房：直接把「已送到 8011 房门口」记为完成，继续下一步',
          doneToast: '已为你完成本环节，继续下一步'
        },
        replay: { label: '再走一次', toast: '已回到服务间，可以再走一次' },
        done: {
          title: '纯净水已送到 8011 房门口',
          note: '按房号找到正确的房门，才算把东西送到客人手上。',
          skippedNote: '本环节由系统代为完成（跳过走位），接着看服务是怎么完成的。'
        },
        nextLabel: '继续，看看服务怎么完成',
        nextNote: '下一步：水送到门口，服务还没结束。',
        playNote: '不想走位也没关系：点下面的「跳过走位，直接送达」，系统会直接记为送到。',
        /* 成功提示条在画面上停留的时长 */
        timing: { successHoldMs: 1800 }
      },
      /* 「再看一遍」与幕进度点回看的文案：一场培训里常要重放，统一放这里改 */
      restart: {
        label: '再看一遍',
        shortLabel: '从头再看一遍',
        doneToast: '已回到第 1 幕：工单变回「待处理」，可以重新演示一遍',
        lockedToast: '这一幕还没看过，按顺序看完才能回看',
        jumpNote: '（点击回看）',
        lockedNote: '（还没看到）'
      },
      quiz: {
        id: 'q_delivery_need',
        text: '这位客人的需求是什么？',
        feedbackCategory: 'ticket_reading',
        options: [
          {
            key: 'A',
            label: '送物需求，客人需要 1 瓶纯净水',
            isCorrect: true,
            feedback: '答对了！接下来，我们一起看看如何从工单中找到这些信息。'
          },
          {
            key: 'B',
            label: '送物需求，客人需要 3 瓶纯净水',
            isCorrect: false,
            feedback: '选错了。这张工单上的数量不是 3 瓶，下一步用红框带你找到答案。'
          },
          {
            key: 'C',
            label: '清洁需求，客人需要打扫卫生',
            isCorrect: false,
            feedback: '选错了。这不是清洁工单，下一步用红框带你找到答案。'
          }
        ]
      },
      acts: [
        {
          key: 'act1_guest',
          kind: 'watch',
          label: '客人提出需求',
          title: '客人拨了一通客房电话',
          /* caption 省略即只在舞台区显示插画：标题已经说明了这一幕是什么 */
          note: '客人具体说了什么不重要，重点是看工单。',
          scene: 'guest-call',
          durationMs: 4600
        },
        {
          key: 'act2_ai',
          kind: 'watch',
          label: 'AI 生成工单',
          title: '电话由 AI 接待，需求变成工单',
          caption: 'AI 听懂需求、判断类型，生成工单。',
          note: '员工不需要旁听这通电话，干活以工单为准。',
          scene: 'ai-dispatch',
          durationMs: 5400,
          push: {
            cardTitle: '工单已生成',
            line: '工单内容请在手机端工单详情里查看',
            /* 「滑入手机」用 screenshots.notify 的真图时配的文案；素材缺失、回退模拟界面时用不到这两条 */
            shotAlt: '真实产品截图：公众号「工单处理通知」消息列表，其中一条新工单被红框圈出',
            shotCaption: '真实产品截图 · 公众号工单消息（红框为素材自带）'
          }
        },
        {
          key: 'act3_need',
          kind: 'quiz',
          label: '先判断需求',
          title: '工单来到你的手机上',
          caption: '这是手机端真实工单详情，先自己判断一下。',
          /* 这一幕的版式按设计稿页面 5：真机截图套手机设备框（不标注）→ 三选一 → 选错反馈 →
             深蓝主按钮「具体讲解 →」→ 一句安抚。按钮文案属于这一幕，放这里改，页面里不写死。 */
          ctaLabel: '具体讲解'
        },
        {
          key: 'act4_read',
          kind: 'annotate',
          label: '学会看工单',
          title: '一起看：这三项怎么看',
          /* 红框坐标按截图实际像素测得（assets/images/phone-wo-detail-real.png，664 × 924）：
           * 房间号文字 y=689..711、服务分类 y=778..800、服务项 y=868..890，三行文字横向范围 x=31..347。
           * 下面的 left/top/width/height 都是换算成百分比的数值——换截图必须重新测，不要凭感觉调。 */
          steps: [
            {
              key: 'room',
              field: '房间号',
              text: '确认房间号，知道要去哪个房间。',
              box: { left: 3.0, top: 71.6, width: 53.5, height: 7.6 },
              tagSide: 'right'
            },
            {
              key: 'category',
              field: '服务分类',
              text: '看服务类型，判断是哪类工单。',
              box: { left: 3.0, top: 81.3, width: 53.5, height: 7.6 },
              tagSide: 'right'
            },
            {
              key: 'item',
              field: '服务项',
              text: '确认具体需求：送什么、送多少。',
              box: { left: 3.0, top: 90.9, width: 53.5, height: 7.6 },
              tagSide: 'right'
            }
          ],
          summary: '看工单：先看房间号，再看服务类型，最后核对需求。'
        },
        {
          key: 'act5_claim',
          kind: 'claim',
          label: '领取工单',
          title: '轮到你了：点一下「领取」',
          caption: '工单要由员工领取后，才归你处理。'
        },
        {
          /* 新增的可玩环节（互动小游戏）：位置在「领取之后，服务才开始」动画之前 ——
             领取工单 ≠ 服务完成，中间这一步是「按房间需求把客人的东西领到手」。
             小游戏本身在 components/claw-game.js；这一幕的文案 / 判定 / 跳过都在 game.claw 里。
             幕数是 10 幕：它是一幕完整的教学环节（能回看、能跳过、算一次完成，不额外重复计次）。 */
          key: 'act6_claw',
          kind: 'game',
          label: '准备客人物品',
          title: '客人要的东西，先领到手',
          caption: '按房间需求把东西领齐，再送去房间。'
        },
        {
          /* 幕序在第七幕「走廊寻房」之后整体后移一位（这一幕原先叫 act7_service） */
          key: 'act8_service',
          kind: 'watch',
          label: '完成服务',
          title: '领取之后，服务才开始',
          caption: '工单把需求交到你手上，水还是要有人送。',
          stages: [
            { scene: 'staff-prepare', text: '按房间需求准备一瓶纯净水。', durationMs: 3000 },
            { scene: 'staff-walk', text: '沿着走廊前往 8011 房。', durationMs: 3200 },
            { scene: 'staff-deliver', text: '敲门，把纯净水送到客人手上。', durationMs: 3400 }
          ]
        },
        {
          /* 第二个可玩环节：东西领到手之后，按房号在走廊里找到 8011 房门口送过去。
             位置在「完成服务」动画之前 —— 那一幕讲的是「到了门口之后怎么把服务做完」。
             小游戏本身在 components/corridor-game.js；文案 / 节奏 / 跳过都在 game.corridor 里。
             它同样是一幕完整的教学环节（能回看、能跳过、算一次完成，不额外重复计次）。 */
          key: 'act7_corridor',
          kind: 'route',
          label: '走廊寻房',
          title: '按房号，把水送到门口',
          caption: '工单上的房间号，就是这一关要走对的门。'
        },
        {
          key: 'act9_done',
          kind: 'watch',
          label: '客人满意',
          title: '服务完成，客人很满意',
          note: '心形和满意度只是剧情演示，系统里没有这种计分。',
          scoreChip: '满意度 +1（教学虚拟反馈）',
          scene: 'guest-happy',
          durationMs: 5000
        },
        {
          key: 'act10_summary',
          kind: 'summary',
          label: '记住流程',
          title: '实际工作中，按这个顺序走',
          flow: ['接收工单', '确认房间号、服务类型、具体需求', '领取工单', '按酒店流程完成服务'],
          note: '服务完成后，还要在系统里处理完工单（例如点「解决」）。',
          ctaLabel: '继续，看下一张工单'
        }
      ]
    }
  },

  /* ============ 主场景二：客房报修（只看工单类型，不重复领取流程） ============ */
  repair: {
    id: 'scene_repair',
    kindLabel: '主场景二',
    chapterLabel: '第二章 · 进入工作现场',
    title: '空调坏了，会变成哪张工单？',
    intro: '换个需求，看工单有什么不同。',
    guestLine: '客人反映：「房间空调好像出了问题，可以帮忙处理一下吗？」',
    timelineTitle: '这条需求经历的 3 个步骤',
    timelineHint: '这类需求不需要领取，先认识它。',
    steps: [
      { title: '客人提出报修需求', desc: '客人反映房间空调有问题。' },
      { title: 'AI 识别服务需求并生成报修工单', desc: 'AI 判断这属于已配置的「报修」类需求。' },
      { title: '手机端出现对应工单卡片', desc: '相关岗位的员工会收到这张工单。' }
    ],
    ticket: {
      ticketNo: 'WO-DEMO-20831',
      category: '客房报修',
      categoryType: 'repair',
      room: '0912',
      roomNote: '虚构演示数据',
      demand: '房间空调制冷异常，需要处理',
      source: '客房电话 · AI 自动生成',
      createdAt: '今天 21:26',
      statusPending: '待领取',
      statusClaimed: '处理中',
      assigneePending: '待领取',
      assigneeClaimed: '工程部（示意）',
      footerNote: '原型示例数据，实际以真实系统为准。'
    },
    phone: {
      screenTitle: '工单详情',
      notifyTitle: '新工单提醒',
      notifyApp: '华客 · 工单消息',
      notifyTime: '21:26',
      notifyBadge: '待领取',
      agreeLabel: '查看详情',
      claimLabel: '领取',
      readOnlyNote: '不重复领取流程，看清「类型」和「需求」两项。'
    },
    question: {
      id: 'q_repair_type',
      text: '这是一张什么类型的工单？',
      feedbackCategory: 'ticket_category',
      options: [
        {
          key: 'A',
          label: '咨询。',
          isCorrect: false,
          explain:
            '咨询类是「回答问题」，例如早餐时间、洗衣服务，客人问完就结束了，通常不会变成要人去做的任务。'
        },
        {
          key: 'B',
          label: '报修。',
          isCorrect: true,
          explain: '客人反映的是设施问题，属于报修类服务需求，需要相应岗位去现场处理。'
        },
        {
          key: 'C',
          label: '送物。',
          isCorrect: false,
          explain: '送物类通常是「把东西送过去」，例如毛巾、拖鞋、矿泉水；空调坏了属于设施报修。'
        }
      ],
      correctLogic: '这是报修类服务需求。具体由谁处理、多久完成，应遵循酒店的实际分工和工作流程。'
    },
    screenshots: {
      notify: 'assets/images/phone-wo-repair-notify-real.png',
      detail: 'assets/images/phone-wo-repair-detail-real.png'
    }
  },

  /* ============ 主场景三：客房打扫（认识不同工单的共同点） ============ */
  cleaning: {
    id: 'scene_cleaning',
    kindLabel: '主场景三',
    chapterLabel: '第二章 · 进入工作现场',
    title: '和前两张工单，有什么共同点？',
    intro: '最后一个场景，我们把三张工单放在一起看。',
    guestLine: '客人希望安排客房打扫。',
    timelineTitle: '这条需求经历的 3 个步骤',
    timelineHint: '流程和前面一样，只是需求类型不同。',
    steps: [
      { title: '客人提出打扫需求', desc: '客人希望现在或稍后安排客房打扫。' },
      { title: 'AI 识别已配置的服务需求并生成工单', desc: 'AI 判断这属于已配置的「客房打扫」需求。' },
      { title: '相关员工接收任务', desc: '按酒店配置推送给客房相关岗位。' }
    ],
    ticket: {
      ticketNo: 'WO-DEMO-20834',
      category: '客房打扫',
      categoryType: 'cleaning',
      room: '1503',
      roomNote: '虚构演示数据',
      demand: '客人希望安排客房打扫',
      source: '客房电话 · AI 自动生成',
      createdAt: '今天 21:31',
      statusPending: '待领取',
      statusClaimed: '处理中',
      assigneePending: '待领取',
      assigneeClaimed: '客房部（示意）',
      footerNote: '原型示例数据，实际以真实系统为准。'
    },
    phone: {
      screenTitle: '工单详情',
      notifyTitle: '新工单提醒',
      notifyApp: '华客 · 工单消息',
      notifyTime: '21:31',
      notifyBadge: '待领取',
      agreeLabel: '查看详情',
      claimLabel: '领取',
      readOnlyNote: '这一张也只看不领：对比一下三张工单就好。'
    },
    question: {
      id: 'q_cleaning_common',
      text: '不同服务需求生成的工单，最重要的共同点是什么？',
      feedbackCategory: 'ticket_common_point',
      options: [
        {
          key: 'A',
          label: '都由 AI 自动完成后续服务。',
          isCorrect: false,
          explain:
            'AI 不会真的去送毛巾、修空调或打扫房间，它负责的是把需求识别出来、变成工单、通知到人。'
        },
        {
          key: 'B',
          label: '都需要按照酒店实际工作流程，由相关人员承接并处理。',
          isCorrect: true,
          explain: '不管送物、报修还是打扫，工单最终都要落到「有人接手、有人完成」这一步。'
        },
        {
          key: 'C',
          label: '都需要员工重新拨打客人电话。',
          isCorrect: false,
          explain:
            '通常不需要。房间号、需求描述已经在工单里了；只有信息不足或必须确认时，才按酒店规范联系客人。'
        }
      ],
      correctLogic: '工单是服务需求流转和处理的载体，不代表实际服务已经完成。'
    },
    screenshots: {
      notify: 'assets/images/phone-wo-cleaning-notify-real.png',
      detail: 'assets/images/phone-wo-cleaning-detail-real.png'
    }
  }
};
