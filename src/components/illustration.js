/* 第二章「接单小游戏」插画组件（统一美术系统的唯一出口）
 *
 * 美术方向：精致的编辑插画 + 轻量动态分镜（Contemporary editorial illustration / art-directed 2D）
 *  - 一套配色、一套角色、一套比例：所有画面都从下面的 C（色板）与角色构造函数取值，改一处全局生效
 *  - 画面里不出现对话框、字幕、语音转写：前两幕只交代工单是怎么来的，不提前透露客人需求
 *  - 全部为内联 SVG + CSS 动画：零依赖、离线可用、不产生额外请求
 *
 * 角色规范（客人、AI、一线员工三套，画面里只复用这三套）
 *  - 客人（橘猫）：耳距/耳形、眼睛风格、口鼻比例、尾巴曲线固定；坐姿与站姿共用同一个头
 *  - AI 助手：圆顶头 + 面板脸 + 客服耳麦（呼应「AI 接待电话」），悬浮底座，不用霓虹/发光特效
 *  - 一线员工：酒店制服（深蓝马甲 + 橙线 + 白衬衫 + 帽子 + 工牌），脸型与短发固定
 *  - 统一：头身比约 1:3.3、特征线宽 2.2 / 1.5、每个体积最多 2 个色阶 + 1 个接触阴影
 *
 * 构图规范：每个画面只有一个主视觉；分前景/中景/背景三层；所有角色与道具都有落地或接触关系。
 * 运动规范：入场优先（小幅位移 + 透明度），每个画面只保留 1 个呼吸循环；不做全局抖动与无限弹跳。
 */
window.HKR = window.HKR || {};
HKR.components = HKR.components || {};

(function () {
  var ui = HKR.core.ui;

  /* ==================== 色板：一套配色，场景里不再临时调色 ====================
   * 与全站设计系统对齐（见 css/base.css 的「视觉系统」）：
   *  - 蓝只有一族人：制服 / AI 助手 / 卡片头都用品牌深蓝的同族色阶，不用鲜蓝与渐变；
   *  - 橙只出现在制服滚边、围巾、AI 助手的少量识别点，与「主要操作橙」同族；
   *  - 房间墙面 / 木色 / 灯光保持暖调（MUJI 式的自然材质），构成冷暖对比，不是装饰。
   */
  var C = {
    ink: '#3B3530',
    ink2: '#6E6259',
    fur: '#F2A45C',
    furDark: '#DD8B3D',
    furLight: '#FFE7C8',
    ear: '#F7C79B',
    skin: '#E9B68F',
    skinDark: '#D9A176',
    hair: '#463A32',
    shirt: '#FCFDFE',
    shirtShade: '#EDF1F6',
    vest: '#1F3F6B',
    vestDark: '#17365D',
    piping: '#F2792F',
    scarf: '#E8632C',
    shoe: '#3D4753',
    bot: '#3E6FA8',
    botDark: '#2A5282',
    botFace: '#EEF2F7',
    botLight: '#B7C8DE',
    botAccent: '#F2792F',
    wall: '#F6F1E9',
    wallShade: '#EAE1D5',
    wallLine: '#DCCFBE',
    floor: '#EADCC9',
    floorDark: '#DAC7AC',
    bed: '#FFFFFF',
    bedShade: '#EFE6DA',
    wood: '#C9A57E',
    woodDark: '#AC8760',
    night: '#1B2C46',
    nightDeep: '#102744',
    lamp: '#FFE6B4',
    lampWarm: '#FFC978',
    glow: '#FFD68A',
    sash: '#BFCBDA',
    sashLight: '#E2E8EF',
    doorLeaf: '#E4D8C7',
    doorFrame: '#CDBEA9',
    doorDark: '#B9A88F',
    card: '#FFFFFF',
    cardLine: '#E2E6EB',
    cardHead: '#1F3F6B',
    coral: '#FF7A4D',
    /* 走廊俯视图（第七幕）里的绿植：三档叶色，和木色 / 暖调同族，不引入第二个饱和色系 */
    leaf: '#7A9A6B',
    leafDark: '#5C7A50',
    leafLight: '#96B487',
    shadow: 'rgba(92,72,50,0.16)',
    shadowSoft: 'rgba(92,72,50,0.10)'
  };

  /* ==================== 绘图原语 ==================== */
  function r(x, y, w, h, rx, fill, extra) {
    return (
      '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + rx + '" fill="' + fill + '"' +
      (extra ? ' ' + extra : '') + '/>'
    );
  }

  function e(cx, cy, rx, ry, fill, extra) {
    return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="' + fill + '"' +
      (extra ? ' ' + extra : '') + '/>';
  }

  function c(cx, cy, rad, fill, extra) {
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + rad + '" fill="' + fill + '"' +
      (extra ? ' ' + extra : '') + '/>';
  }

  function p(d, fill, extra) {
    return '<path d="' + d + '" fill="' + fill + '"' + (extra ? ' ' + extra : '') + '/>';
  }

  function s(d, stroke, w, extra) {
    return '<path d="' + d + '" fill="none" stroke="' + stroke + '" stroke-width="' + w + '" stroke-linecap="round"' +
      (extra ? ' ' + extra : '') + '/>';
  }

  function g(attrs, inner) {
    return '<g ' + attrs + '>' + inner + '</g>';
  }

  /* 位置与动画必须分层：SVG 的 transform 属性会被 CSS 动画整体覆盖，
     所以外层只负责摆放，动画类一律放在内层（配合 CSS 的 transform-box: fill-box） */
  function at(x, y, inner, cls) {
    return place('translate(' + x + ' ' + y + ')', inner, cls);
  }

  function place(transform, inner, cls) {
    return '<g transform="' + transform + '">' + (cls ? '<g class="' + cls + '">' + inner + '</g>' : inner) + '</g>';
  }

  /* 柔和光源：用径向渐变代替「硬边椭圆」，避免画面里出现一个可见的浅色圆盘 */
  function defs() {
    return (
      '<defs>' +
      '<radialGradient id="illGlow" cx="50%" cy="50%" r="50%">' +
      '<stop offset="0%" stop-color="' + C.glow + '" stop-opacity="0.5"/>' +
      '<stop offset="60%" stop-color="' + C.glow + '" stop-opacity="0.16"/>' +
      '<stop offset="100%" stop-color="' + C.glow + '" stop-opacity="0"/>' +
      '</radialGradient>' +
      '<radialGradient id="illShade" cx="50%" cy="50%" r="50%">' +
      '<stop offset="0%" stop-color="#5C4832" stop-opacity="0.24"/>' +
      '<stop offset="100%" stop-color="#5C4832" stop-opacity="0"/>' +
      '</radialGradient>' +
      '</defs>'
    );
  }

  function glow(x, y, rx, ry, opacity) {
    return e(x, y, rx, ry, 'url(#illGlow)', 'opacity="' + (opacity === undefined ? 1 : opacity) + '"');
  }

  /* 接触阴影：任何站在地面/台面/床上的东西都要有它，否则会「飘」 */
  function floorShadow(cx, cy, rx, ry, opacity) {
    return e(cx, cy, rx, ry, C.shadow, 'opacity="' + (opacity || 0.5) + '"');
  }

  /* ==================== 角色 A：客人（橘猫）====================
   * 所有画面里的客人都由 guestHead + guestSit / guestStand 组合，耳形、眼神、口鼻、尾巴完全一致
   */

  /* 头：局部坐标以头部中心为原点，头半径 25 */
  function guestHead(o) {
    var oo = o || {};
    var happy = oo.eyes === 'happy';
    var blinkCls = oo.blink === false ? '' : 'ill-eye';
    return (
      p('M-25,-9 L-20,-40 L-2,-22 Z', C.fur) +
      p('M-22,-14 L-19,-34 L-9,-22 Z', C.ear) +
      p('M25,-9 L20,-40 L2,-22 Z', C.fur) +
      p('M22,-14 L19,-34 L9,-22 Z', C.ear) +
      c(0, 0, 25, C.fur) +
      s('M-7,-16 L-8,-25 M0,-18 L0,-28 M7,-16 L8,-25', C.furDark, 2, 'opacity="0.5"') +
      s('M-24,2 q-7,3 -4,8 M24,2 q7,3 4,8', C.furDark, 2, 'opacity="0.45"') +
      e(0, 10, 16, 11, C.furLight) +
      p('M-3.6,4.4 L3.6,4.4 L0,8.4 Z', C.furDark) +
      s('M0,8.6 q-4.6,4.4 -8,0.4 M0,8.6 q4.6,4.4 8,0.4', C.ink, 2, 'opacity="0.8"') +
      s('M-16,8 L-28,6 M-16,12 L-28,13 M16,8 L28,6 M16,12 L28,13', C.ink2, 1.3, 'opacity="0.45"') +
      e(-17, 6, 4.6, 3, C.coral, 'opacity="0.16"') +
      e(17, 6, 4.6, 3, C.coral, 'opacity="0.16"') +
      (happy
        ? s('M-16,-2 q5,-6.5 10,0 M6,-2 q5,-6.5 10,0', C.ink, 2.6, 'class="' + blinkCls + '"')
        : g('class="' + blinkCls + '"',
            c(-11, -2, 3.8, C.ink) + c(-11.9, -3.3, 1.3, '#FFFFFF', 'opacity="0.9"') +
            c(11, -2, 3.8, C.ink) + c(10.1, -3.3, 1.3, '#FFFFFF', 'opacity="0.9"')))
    );
  }

  /* 坐姿：局部坐标以「身体落地线」为原点（y=0 就是床面/地面） */
  function guestSit(o) {
    var oo = o || {};
    var arm = oo.arm || 'call';
    var armMarkup =
      arm === 'call'
        ? s('M-16,-42 C-25,-50 -31,-60 -33,-70', C.fur, 11) + c(-34, -72, 6, C.fur)
        : s('M-18,-40 C-25,-31 -27,-19 -27,-11', C.fur, 11) + c(-28, -9, 5.6, C.fur);
    return (
      s('M28,-22 C46,-26 52,-8 40,2 C34,6 30,4 29,-1', C.furDark, 9, 'class="ill-tail"') +
      c(29, -1, 4.4, C.furDark) +
      e(0, -4, 30, 20, C.furDark, 'opacity="0.14"') +
      e(0, -22, 33, 23, C.fur) +
      p('M-19,-44 C-29,-30 -29,-12 -21,-4 L21,-4 C29,-12 29,-30 19,-44 C11,-52 -11,-52 -19,-44 Z', C.fur) +
      p('M-11,-40 C-17,-30 -17,-14 -11,-6 L11,-6 C17,-14 17,-30 11,-40 C5,-46 -5,-46 -11,-40 Z', C.furLight) +
      e(-27, -4, 12, 6, C.fur) +
      e(27, -4, 12, 6, C.fur) +
      r(-15, -7, 11, 9, 4.5, C.fur, 'stroke="' + C.furDark + '" stroke-width="1.1"') +
      r(4, -7, 11, 9, 4.5, C.fur, 'stroke="' + C.furDark + '" stroke-width="1.1"') +
      s('M-11,-4 h2.4 M8,-4 h2.4', C.furLight, 1.6) +
      armMarkup +
      at(0, -74, guestHead(oo), 'ill-cat__head')
    );
  }

  /* 站姿：局部坐标以脚底为原点，站高约 100 */
  function guestStand(o) {
    var oo = o || {};
    var arms;
    if (oo.arms === 'hold') {
      arms =
        s('M-13,-48 C-16,-42 -14,-36 -12,-34', C.fur, 10) + c(-11, -32, 5.2, C.fur) +
        s('M13,-48 C16,-42 14,-36 12,-34', C.fur, 10) + c(11, -32, 5.2, C.fur);
    } else if (oo.arms === 'reach') {
      arms =
        s('M14,-46 C26,-49 34,-51 41,-53', C.fur, 10.5) + c(42, -53, 5.4, C.fur) +
        s('M-15,-44 C-21,-38 -24,-32 -25,-27', C.fur, 10) + c(-25, -25, 5, C.fur);
    } else {
      arms =
        s('M-14,-46 C-21,-38 -23,-30 -23,-24', C.fur, 10) + c(-23, -22, 5, C.fur) +
        s('M14,-46 C21,-38 23,-30 23,-24', C.fur, 10) + c(23, -22, 5, C.fur);
    }
    return (
      s('M22,-34 C41,-40 52,-25 45,-11 C41,-2 32,-1 30,-5', C.furDark, 9.5, 'class="ill-tail"') +
      c(30, -4, 4.6, C.furDark) +
      r(-14, -15, 11, 16, 5, C.fur) +
      r(3, -15, 11, 16, 5, C.fur) +
      e(-8.5, -1.6, 6, 2.6, C.furLight) +
      e(8.5, -1.6, 6, 2.6, C.furLight) +
      p('M-15,-52 C-22,-40 -22,-22 -16,-13 L16,-13 C22,-22 22,-40 15,-52 C8,-59 -8,-59 -15,-52 Z', C.fur) +
      p('M-8,-48 C-13,-38 -13,-22 -8,-15 L8,-15 C13,-22 13,-38 8,-48 C4,-53 -4,-53 -8,-48 Z', C.furLight) +
      arms +
      at(0, -86, guestHead(oo), 'ill-cat__head')
    );
  }

  /* ==================== 角色 B：AI 助手 ====================
   * 局部坐标：落地阴影在 y=0，机身悬浮在 6~99 之间；戴客服耳麦（呼应「AI 接待电话」）
   */
  function bot(o) {
    var oo = o || {};
    var arms =
      oo.arms === 'hold'
        ? s('M-13,-51 C-17,-52 -19,-53 -20,-53', C.bot, 7.5) + c(-21, -53, 4.4, C.botLight) +
          s('M13,-51 C17,-52 19,-53 20,-53', C.bot, 7.5) + c(21, -53, 4.4, C.botLight)
        : oo.arms === 'present'
          ? s('M-13,-50 C-21,-49 -25,-45 -27,-41', C.bot, 8) + c(-28, -40, 4.6, C.botLight) +
            s('M13,-51 C17,-52 19,-53 20,-53', C.bot, 7.5) + c(21, -53, 4.4, C.botLight)
          : s('M-13,-50 C-21,-49 -25,-45 -27,-41', C.bot, 8) + c(-28, -40, 4.6, C.botLight) +
            s('M13,-50 C21,-49 25,-45 27,-41', C.bot, 8) + c(28, -40, 4.6, C.botLight);
    return (
      floorShadow(0, 0, 25, 5.5, 0.4) +
      e(0, -6, 17, 4, C.botLight, 'opacity="0.38"') +
      p('M-15,-23 L15,-23 C15,-13 8,-6 0,-6 C-8,-6 -15,-13 -15,-23 Z', C.botDark) +
      s('M-10,-17 h20', C.botLight, 2, 'opacity="0.45"') +
      r(-14, -57, 28, 35, 12, C.bot) +
      p('M-14,-40 L14,-40 C14,-31 12,-27 0,-27 C-12,-27 -14,-31 -14,-40 Z', C.botDark, 'opacity="0.3"') +
      r(-8, -47, 16, 6, 3, C.botDark) +
      c(0, -44, 3.6, C.botAccent, 'class="ill-bot__core"') +
      c(-8, -31, 1.5, C.botLight) +
      c(-4, -31, 1.5, C.botLight) +
      arms +
      r(-3, -61, 6, 5, 2, C.botDark) +
      r(-17, -89, 34, 29, 11, C.bot) +
      r(-12, -84, 24, 19, 7, C.botFace) +
      g('class="ill-bot__eyes"', c(-4.6, -77, 2.6, C.botDark) + c(4.6, -77, 2.6, C.botDark)) +
      s('M-3.2,-71.6 q3.2,2.8 6.4,0', C.botDark, 1.6, 'opacity="0.7"') +
      s('M0,-89 L0,-97', C.botDark, 2) +
      c(0, -99, 3.2, C.botAccent) +
      s('M-17,-79 C-17,-95 17,-95 17,-79', '#4A5563', 2.6) +
      r(-22, -82, 5.5, 7.5, 2.6, '#4A5563') +
      s('M-19,-77 C-14,-71 -9,-69 -6,-67', '#4A5563', 2) +
      c(-5, -66, 2.4, C.botAccent)
    );
  }

  /* ==================== 角色 C：一线员工（酒店制服）====================
   * 局部坐标：脚底在 y=0，站高约 96；默认朝左，朝右时整体 scale(-1,1)
   */
  function staffHead(o) {
    var oo = o || {};
    var happy = oo.eyes !== 'open';
    return (
      c(-13, -3, 5.5, C.hair) +
      e(0, -4, 14.5, 13, C.hair) +
      c(0, 0, 13.5, C.skin) +
      c(-13.4, 2, 3.6, C.skinDark) +
      c(13.4, 2, 3.6, C.skinDark) +
      (happy
        ? s('M-6.2,-1 q3.2,-3.6 6.4,0', C.ink, 2, 'opacity="0.9"') +
          s('M0.2,-1 q3.2,-3.6 6.4,0', C.ink, 2, 'opacity="0.9"')
        : c(-5, 0, 1.8, C.ink) + c(5, 0, 1.8, C.ink) +
          c(-5.6, -0.7, 0.7, '#FFFFFF', 'opacity="0.9"') + c(4.4, -0.7, 0.7, '#FFFFFF', 'opacity="0.9"')) +
      e(-8, 4.6, 3.1, 2.3, C.coral, 'opacity="0.2"') +
      e(8, 4.6, 3.1, 2.3, C.coral, 'opacity="0.2"') +
      s('M-3.4,6.2 q3.4,3 6.8,0', C.ink, 1.9, 'opacity="0.75"') +
      p('M-15,-6 C-15,-22 15,-22 15,-6 Z', C.vest) +
      r(-16, -8, 32, 4.6, 2.3, C.shirt) +
      c(0, -20, 1.7, C.vestDark) +
      c(5.6, -12, 1.6, C.piping)
    );
  }

  /* pose: 'stand' | 'walk' | 'reach'（伸手取物）；tray:'hip' 时另一只手托着托盘 */
  function staffBody(o) {
    var oo = o || {};
    var pose = oo.pose || 'stand';
    var legs;
    if (pose === 'walk') {
      legs =
        g('class="ill-leg ill-leg--a"', s('M-5,-48 L-15,-7', C.vestDark, 11) + r(-25, -7, 21, 7, 3.5, C.shoe)) +
        g('class="ill-leg ill-leg--b"', s('M6,-48 L13,-7', C.vestDark, 11) + r(4, -7, 21, 7, 3.5, C.shoe));
    } else {
      legs =
        s('M-6,-48 L-7,-6', C.vestDark, 11) + r(-17, -6, 21, 7, 3.5, C.shoe) +
        s('M6,-48 L7,-6', C.vestDark, 11) + r(-4, -6, 21, 7, 3.5, C.shoe);
    }
    var farArm =
      pose === 'reach'
        ? s('M11,-72 C19,-64 21,-55 21,-48', C.shirtShade, 8.5) + c(21, -46, 4.2, C.skinDark)
        : s('M-12,-72 C-20,-65 -22,-56 -22,-48', C.shirtShade, 8.5) + c(-22, -46, 4.2, C.skinDark);
    var nearArm;
    if (pose === 'reach') {
      nearArm = s('M-11,-70 C-24,-72 -34,-74 -41,-75', C.shirt, 8.8) + c(-42, -75, 4.4, C.skin);
    } else if (pose === 'walk') {
      nearArm = s('M12,-72 C19,-64 21,-56 21,-50', C.shirt, 8.8) + c(21, -48, 4.2, C.skin);
    } else {
      nearArm = s('M-12,-70 C-20,-63 -22,-55 -22,-48', C.shirt, 8.8) + c(-22, -46, 4.2, C.skin);
    }
    var hip =
      oo.tray === 'hip'
        ? s('M12,-70 C20,-64 23,-60 24,-58', C.shirt, 8.8) + c(25, -57, 4.2, C.skin) +
          r(20, -61, 30, 4, 2, C.sash)
        : '';
    return (
      legs +
      p('M-13,-46 C-15,-64 -12,-80 0,-80 C12,-80 15,-64 13,-46 Z', C.shirt) +
      p('M-13,-46 C-14,-64 -10,-78 -1,-80 L-1,-46 Z', C.shirtShade, 'opacity="0.75"') +
      p('M-13,-45 L-1,-45 L-1,-79 C-9,-78 -13,-62 -13,-45 Z', C.vest) +
      p('M13,-45 L1,-45 L1,-79 C9,-78 13,-62 13,-45 Z', C.vest) +
      s('M-1,-45 L-1,-79 M1,-45 L1,-79', C.piping, 1.6) +
      s('M-9,-59 h7 M-9,-55 h7', C.vestDark, 1.4, 'opacity="0.8"') +
      r(2.5, -71, 10, 7.4, 1.6, C.shirt) +
      s('M4.5,-68.6 h6 M4.5,-65.6 h4', C.vestDark, 1.5) +
      p('M-5,-80 L5,-80 L3,-74 L-3,-74 Z', C.scarf) +
      farArm +
      nearArm +
      hip +
      r(-3, -83, 6, 6, 2, C.skinDark) +
      at(0, -96, staffHead(oo), 'ill-staff__head')
    );
  }

  /* ==================== 道具：只在场景里复用这几件 ====================
   * 统一要求：每件道具都带自己的接触阴影/高光，保证「放在桌面上」而不是「贴在画面上」
   */

  /* 纯净水（真实工单的服务项）：局部坐标以瓶底为原点，瓶高 40 */
  function bottle(o) {
    var oo = o || {};
    return (
      (oo.shadow === false ? '' : e(0, 2, 9, 2.6, C.shadowSoft)) +
      r(-7, -28, 14, 28, 5, '#DCEDFB') +
      s('M-4,-24 L-4,-9', '#FFFFFF', 2, 'opacity="0.75"') +
      p('M-6,-13 q6,3 12,0 L6,-5 C4,-3 -4,-3 -6,-5 Z', '#BBD9F5') +
      r(-7, -21, 14, 9, 1.5, C.card) +
      p('M-3,-18 q3,3 0,4.6 q-3,-1.6 0,-4.6', C.bot) +
      r(-3.4, -34, 6.8, 7, 2, '#DCEDFB') +
      r(-4.6, -40, 9.2, 6, 2.2, C.bot) +
      s('M-4.6,-37.4 h9.2', C.botDark, 1)
    );
  }

  /* 一双酒店客用拖鞋（第六幕飞爪小游戏里可抓的物品之一）：
     局部坐标以两只鞋的底边中线为原点（宽 44、高 8），造型只留「一对 + 白鞋面 + 深蓝 V 带」，
     和其它道具一样不做写实材质；右鞋压 4° 让一双鞋看起来是「随手摆的」 */
  function slippers() {
    function one() {
      return (
        r(-10, -7.4, 20, 7.4, 3.6, C.shirt, 'stroke="' + C.cardLine + '" stroke-width="0.9"') +
        r(-10, -7.4, 20, 2.4, 1.2, C.shirtShade, 'opacity="0.9"') +
        s('M-6.6,-6.6 L0,-3.2 L6.6,-6.6', C.bot, 1.8)
      );
    }
    return at(-11.6, 0, one()) + place('translate(11.6 1.6) rotate(4)', one());
  }

  /* 客房电话听筒：局部坐标以听筒中心为原点，长 32 */
  function handset() {
    return (
      r(-16, -6, 10, 12, 4.2, C.sash) +
      r(-7, -3.6, 14, 7.2, 3.6, C.sashLight) +
      r(6, -6, 10, 12, 4.2, C.sash) +
      s('M-5,0 h10', '#8FA6BC', 1.2, 'opacity="0.7"')
    );
  }

  /* 工单卡片（与真实产品一致的蓝白卡片，卡片上不放具体需求文字） */
  function ticketCard(cls) {
    return (
      g(cls ? 'class="' + cls + '"' : '',
        r(-23, -29, 46, 58, 8, C.card, 'stroke="#E3EAF3" stroke-width="1.2"') +
        r(-23, -29, 46, 15, 8, C.cardHead) +
        r(-23, -21, 46, 7, 0, C.cardHead) +
        c(-16, -21, 2.2, '#FFFFFF', 'opacity="0.85"') +
        s('M-9,-21 h22', '#FFFFFF', 2.4, 'opacity="0.55"') +
        r(-16, -9, 30, 4, 2, C.cardLine) +
        r(-16, -1, 30, 4, 2, C.cardLine) +
        r(-16, 7, 19, 4, 2, C.cardLine) +
        r(-16, 15, 18, 7, 3.5, C.coral, 'opacity="0.9"') +
        r(6, 15, 12, 7, 3.5, '#EEF2F7'))
    );
  }

  /* ==================== 场景零件：客房（暖白 + 木质 + 夜色窗）==================== */

  /* 客房背景：墙 / 踢脚 / 地板 / 地板缝，三层结构让角色有「落在房间里」的关系 */
  function roomBackdrop() {
    return (
      r(0, 0, 320, 132, 0, C.wall) +
      r(0, 124, 320, 9, 0, C.wallShade) +
      r(0, 133, 320, 47, 0, C.floor) +
      r(0, 133, 320, 9, 0, C.floorDark) +
      s('M52,180 L86,133 M164,180 L170,133 M282,180 L254,133', C.floorDark, 1.4, 'opacity="0.45"')
    );
  }

  /* 夜里的窗（不起眼但要交代「晚上 / 客房」） */
  function windowNight(x, y) {
    return (
      at(x, y,
        r(0, 0, 76, 88, 6, '#FFFFFF') +
        r(6, 6, 64, 76, 3, C.night) +
        r(6, 30, 64, 52, 0, C.nightDeep, 'opacity="0.55"') +
        p('M6,82 L70,82 L70,66 L58,62 L44,68 L28,64 L6,70 Z', '#33425E') +
        c(18, 22, 1.4, '#FFFFFF', 'opacity="0.85"') +
        c(36, 16, 1.1, '#FFFFFF', 'opacity="0.6"') +
        c(56, 26, 1.2, '#FFFFFF', 'opacity="0.5"') +
        c(52, 44, 8, C.lamp, 'opacity="0.18"') +
        c(52, 44, 4.4, C.lamp, 'opacity="0.5"') +
        r(26, 6, 2.6, 76, 1.2, '#FFFFFF') +
        r(6, 42, 64, 2.6, 1.2, '#FFFFFF') +
        r(-4, 86, 84, 7, 3.5, '#EFE7DB'))
    );
  }

  /* 墙上小画框：让墙面有编辑感的层次，不抢主视觉 */
  function pictureFrame(x, y) {
    return (
      at(x, y,
        r(0, 0, 42, 32, 3, '#E4D8C6') +
        r(3, 3, 36, 26, 2, '#F5EEE3') +
        p('M4,23 L13,13 L21,19 L30,9 L35,23 Z', '#C6B7A0') +
        c(14, 9, 3, C.lampWarm, 'opacity="0.8"'))
    );
  }

  /* 床（右侧，可出画）：床头顶板 + 床垫 + 被子折边 + 床架 */
  function bedRight() {
    return (
      r(198, 56, 122, 58, 10, C.wood) +
      r(206, 64, 106, 42, 7, C.woodDark, 'opacity="0.3"') +
      r(176, 94, 58, 24, 8, C.bed, 'stroke="' + C.bedShade + '" stroke-width="1.6"') +
      s('M188,106 h34', C.bedShade, 1.4) +
      r(168, 114, 152, 24, 6, C.bed) +
      p('M168,114 C200,106 244,106 320,111 L320,132 L168,132 Z', C.bed) +
      r(168, 122, 152, 7, 3.5, C.bedShade) +
      r(174, 138, 146, 13, 5, C.wood) +
      r(174, 146, 146, 5, 2.5, C.woodDark, 'opacity="0.35"')
    );
  }

  /* 床头柜 + 台灯 + 客房电话底座（听筒在客人手里，靠电话线连回底座） */
  function nightstandPhone(x, y) {
    return (
      at(x, y,
        glow(0, 0, 48, 34, 0.9) +
        floorShadow(6, 48, 40, 7, 0.35) +
        r(-36, 0, 72, 48, 6, C.wood) +
        r(-40, -4, 80, 8, 4, C.wood) +
        r(-29, 8, 58, 14, 3, C.woodDark, 'opacity="0.45"') +
        c(0, 15, 2.2, C.woodDark) +
        r(-32, 44, 6, 8, 2, C.wood) +
        r(26, 44, 6, 8, 2, C.wood) +
        r(-14, -26, 5, 22, 2.4, C.woodDark) +
        p('M-20,-26 L20,-26 L13,-46 L-13,-46 Z', C.lamp) +
        p('M-20,-26 L0,-26 L0,-46 L-13,-46 Z', C.lampWarm, 'opacity="0.7"') +
        r(-24, -28, 48, 4, 2, C.woodDark) +
        r(-22, -12, 44, 12, 4, C.sash) +
        c(-14, -6, 1.5, '#FFFFFF', 'opacity="0.85"') +
        c(-8, -6, 1.5, '#FFFFFF', 'opacity="0.85"') +
        c(-2, -6, 1.5, '#FFFFFF', 'opacity="0.85"') +
        c(4, -6, 1.5, '#FFFFFF', 'opacity="0.6"') +
        c(10, -6, 1.5, '#FFFFFF', 'opacity="0.6"'))
    );
  }

  /* ==================== 场景零件：走廊（浅透视 + 暖色壁灯）==================== */

  /* 走廊背景：墙 / 踢脚 / 地板 + 向消失点收敛的地板缝（不做夸张一点透视，保持编辑感） */
  function corridorBackdrop() {
    return (
      r(-60, 0, 440, 116, 0, C.wall) +
      r(-60, 0, 440, 9, 0, C.wallShade) +
      r(-60, 104, 440, 12, 0, C.wallShade) +
      r(-60, 116, 440, 64, 0, C.floor) +
      r(-60, 116, 440, 8, 0, C.floorDark) +
      s('M-10,180 L108,118 M118,180 L136,118 M252,180 L166,118 M382,180 L206,118', C.floorDark, 1.6, 'opacity="0.35"')
    );
  }

  /* 壁灯：一盏就够，用来交代光源方向 */
  function wallSconce(x, y) {
    return (
      at(x, y,
        glow(0, 10, 34, 22, 1) +
        s('M0,-8 L0,2', C.doorDark, 3) +
        p('M-9,3 L9,3 L6,-7 L-6,-7 Z', C.lamp) +
        r(-11, 3, 22, 3, 1.5, C.woodDark))
    );
  }

  /* 客房门口：默认是关着的门；open:'back' 只画门套 + 半开门后的房内暖光（给客人留出层次），
     open:'front' 只画那扇向房内推开、被压缩的门扇（压在客人身侧），用它做出「客人在门里」的前后关系 */
  function corridorDoor(o) {
    var oo = o || {};
    var w = oo.w || 68;
    var h = oo.h || 112;
    var plate =
      r(w * 0.38, -2, 30, 12, 2, C.card) +
      '<text x="' + (w * 0.38 + 15) + '" y="6.6" text-anchor="middle" font-family="Helvetica,Arial,sans-serif" font-size="6.6" fill="#5A6B7E">' +
      (oo.num || '') + '</text>';
    var frame = r(-5, -5, w + 10, h + 10, 5, C.doorFrame);
    var lightSpill = oo.light
      ? p('M0,' + h + ' L' + w + ',' + h + ' L' + (w + 8) + ',' + (h + 12) + ' L-8,' + (h + 12) + ' Z', C.glow, 'opacity="0.3"')
      : '';
    var body;
    if (oo.open === 'back') {
      body =
        r(0, 0, w, h, 3, '#FFF3DF') +
        r(0, 0, 3, h, 0, '#E5D6BD') +
        p('M0,' + h * 0.62 + ' L' + w + ',' + h * 0.58 + ' L' + w + ',' + h + ' L0,' + h + ' Z', '#EAD9BC', 'opacity="0.75"') +
        glow(w * 0.52, h * 0.42, w * 0.46, h * 0.42, 1) +
        p('M0,' + h + ' L' + w + ',' + h + ' L' + (w + 10) + ',' + (h + 14) + ' L-10,' + (h + 14) + ' Z', C.glow, 'opacity="0.26"');
      return at(oo.x || 0, oo.y || 0, frame + body + plate);
    }
    if (oo.open === 'front') {
      var leafW = Math.max(18, Math.round(w * 0.26));
      var x0 = w - leafW;
      return at(oo.x || 0, oo.y || 0,
        floorShadow(x0 + leafW / 2 - 6, h + 8, leafW, 6, 0.3) +
        p('M' + w + ',0 L' + x0 + ',8 L' + x0 + ',' + (h - 8) + ' L' + w + ',' + h + ' Z', C.doorLeaf) +
        p('M' + w + ',0 L' + (w - 6) + ',2 L' + (w - 6) + ',' + (h - 2) + ' L' + w + ',' + h + ' Z', C.doorDark, 'opacity="0.25"') +
        s('M' + x0 + ',8 L' + x0 + ',' + (h - 8), C.doorDark, 1.6, 'opacity="0.5"') +
        c(x0 + 5, h * 0.55, 3, '#B6A279'));
    }
    return at(oo.x || 0, oo.y || 0,
      frame +
      r(0, 0, w, h, 3, C.doorLeaf) +
      r(9, 11, w - 18, 38, 2, C.doorDark, 'opacity="0.16"') +
      r(9, 58, w - 18, Math.max(20, h - 70), 2, C.doorDark, 'opacity="0.16"') +
      plate +
      c(w - 10, h * 0.55, 3.6, '#B6A279') +
      lightSpill);
  }

  /* ==================== 场景零件：服务间 / 布草间（第 6 幕 A）==================== */

  function towelStack(x, y, w) {
    return (
      at(x, y,
        r(0, -18, w, 18, 3, C.shirt) +
        r(0, -9, w, 9, 3, C.shirtShade, 'opacity="0.9"') +
        s('M6,-13 h' + (w - 12) + ' M10,-5 h' + (w - 20), C.shirtShade, 1.6))
    );
  }

  function towelRoll(x, y) {
    return at(x, y, e(0, -8, 19, 8, C.shirt) + e(0, -8, 7, 7, C.shirtShade));
  }

  /* 服务间的货架 + 台面；台面上留出 4 个纯净水的位置（第 4 个位置在本幕被员工拿走） */
  function pantryUnit() {
    var bottlesAt = [36, 76, 116];
    var bottleRow = bottlesAt
      .map(function (x) {
        return at(x, 88, bottle());
      })
      .join('');
    return (
      floorShadow(80, 153, 84, 7, 0.4) +
      r(4, 40, 6, 116, 3, C.woodDark) +
      r(150, 40, 6, 116, 3, C.woodDark) +
      r(6, 46, 148, 6, 3, C.wood) +
      r(6, 76, 148, 6, 3, C.wood) +
      e(0, 0, 0, 0, 'none') +
      towelStack(24, 46, 46) +
      towelStack(86, 46, 54) +
      towelRoll(34, 76) +
      towelRoll(66, 76) +
      r(96, 56, 50, 20, 4, '#E8D9C0') +
      r(94, 54, 54, 5, 2.5, '#D9C6A8') +
      r(-2, 88, 164, 9, 5, '#E4D7C3') +
      r(4, 97, 152, 53, 5, C.wood) +
      s('M80,101 L80,147', C.woodDark, 1.6, 'opacity="0.55"') +
      c(72, 124, 2.4, C.woodDark) +
      c(88, 124, 2.4, C.woodDark) +
      bottleRow
    );
  }

  /* ==================== 分层：入场动效统一走 layer()，每层一个 60~120ms 的错峰 ==================== */
  function layer(delay, inner, cls) {
    return (
      '<g class="ill-in' + (cls ? ' ' + cls : '') + '" style="animation-delay:' + delay + 's">' + inner + '</g>'
    );
  }

  /* ==================== 第一幕：客人在房间里拨通客房电话 ====================
   * 主视觉 = 客人（右手拿听筒贴着脸颊），电话线连回床头柜上的座机 → 空间关系一眼可读
   */
  function guestCall() {
    return (
      layer(0, roomBackdrop()) +
      layer(0.06, windowNight(16, 22)) +
      layer(0.1, pictureFrame(112, 30)) +
      layer(0.14, bedRight()) +
      layer(0.18, nightstandPhone(132, 104)) +
      layer(0.16, glow(238, 112, 100, 52, 0.9)) +
      layer(0.26, at(236, 116, guestSit({ arm: 'call', eyes: 'open' }), 'ill-actor ill-actor--guest')) +
      layer(0.3, s('M200,50 C186,68 168,82 142,95', C.sash, 1.8, 'opacity="0.9"')) +
      layer(0.32, at(202, 44, '<g transform="rotate(-20)">' + handset() + '</g>', 'ill-handset'))
    );
  }

  /* ==================== 第二幕：AI 接待并生成工单 ====================
   * 同一间房（换机位）+ AI 在房间中央悬浮接待 → 工单从胸前推出，飞向手机（手机上交给 push 卡片）
   */
  function aiDispatch() {
    return (
      layer(0, roomBackdrop()) +
      layer(0.06, windowNight(-18, 22)) +
      layer(0.1, pictureFrame(60, 30)) +
      layer(0.14, s('M214,98 C240,92 262,80 286,68', C.botLight, 2, 'stroke-dasharray="5 6" opacity="0.45"')) +
      layer(0.16, glow(146, 126, 86, 42, 0.95) + e(146, 129, 42, 12, C.shadow, 'opacity="0.08"')) +
      layer(0.22, at(146, 150, bot({ arms: 'present' }), 'ill-actor ill-actor--bot')) +
      layer(0.34, place('translate(186 100) scale(0.85)', ticketCard(), 'ill-ticket'))
    );
  }


  /* ==================== 第六幕 A：领取后先按房间需求准备一瓶纯净水 ====================
   * 主视觉 = 员工从台面上取水的「手—瓶」接触关系；货架/毛巾交代服务间环境
   */
  function staffPrepare() {
    return (
      layer(0, r(0, 0, 320, 150, 0, C.wall) +
        r(0, 0, 320, 10, 0, C.wallShade) +
        r(0, 116, 320, 34, 0, C.wallShade, 'opacity="0.5"') +
        r(0, 150, 320, 30, 0, C.floor) +
        r(0, 150, 320, 7, 0, C.floorDark)) +
      layer(0.06, s('M34,180 L92,152 M168,180 L146,152 M292,180 L208,152', C.floorDark, 1.4, 'opacity="0.35"')) +
      layer(0.1, wallSconce(238, 34)) +
      layer(0.14, pantryUnit()) +
      layer(0.28, at(198, 150, staffBody({ pose: 'reach', eyes: 'happy' }), 'ill-actor ill-actor--staff')) +
      layer(0.34, at(163, 88, bottle(), 'ill-taken'))
    );
  }

  /* ==================== 第六幕 B：沿走廊前往 8011 ====================
   * 主视觉 = 走廊里往前走的员工；背景（门/壁灯）整体向左视差位移，走路不是「整张图平移」
   */
  function staffWalk(options) {
    /* 房号可换：一线员工课件是「0000 房」，管理员版沿用 8010 / 8011 */
    var opts = options || {};
    var nearNum = opts.nearNum || '8010';
    var targetNum = opts.num || '8011';
    return (
      g('class="ill-parallax"',
        layer(0, corridorBackdrop()) +
        layer(0.1, wallSconce(60, 34) + corridorDoor({ x: 22, y: 20, num: nearNum }) + wallSconce(212, 34) + corridorDoor({ x: 182, y: 16, num: targetNum, light: true }))) +
      layer(0.26, place('translate(182 150) scale(-1 1)', staffBody({ pose: 'walk', eyes: 'happy' }), 'ill-actor ill-actor--staff ill-walk')) +
      layer(0.3, at(168, 112, bottle(), 'ill-carried'))
    );
  }

  /* ==================== 第六幕 C：敲门，把纯净水送到客人手上 ====================
   * 沿用上一幕的走廊与 8011 门（同一空间逻辑）；主视觉 = 手与猫爪之间的那瓶水
   * 层次：房内暖光（门后）→ 员工与瓶子 → 客人（在门里伸手）→ 半开的门扇压在客人身侧
   */
  function staffDeliver(options) {
    var opts = options || {};
    var targetNum = opts.num || '8011';
    return (
      layer(0, corridorBackdrop()) +
      layer(0.06, wallSconce(120, 32)) +
      layer(0.12, corridorDoor({ x: 214, y: 6, w: 96, h: 144, num: targetNum, open: 'back' })) +
      layer(0.28, place('translate(148 150) scale(-1 1)', staffBody({ pose: 'reach', eyes: 'happy' }), 'ill-actor ill-actor--staff')) +
      layer(0.34, at(200, 94, bottle(), 'ill-handover')) +
      layer(0.22, place('translate(252 146) scale(-1 1)', guestStand({ arms: 'reach', eyes: 'open' }), 'ill-actor ill-actor--guest')) +
      layer(0.16, corridorDoor({ x: 214, y: 6, w: 96, h: 144, open: 'front' }))
    );
  }

  /* ==================== 第七幕：服务完成，客人很满意 ====================
   * 延续第六幕 C 的门口机位与角色：客人抱着水，员工还在门口；只多三颗小爱心，不做庆祝特效
   */
  function guestHappy() {
    var heart = p('M0,5 C-6.4,0 -7.6,-3.6 -4.4,-5.8 C-2.2,-6.8 -0.8,-5.6 0,-4.2 C0.8,-5.6 2.2,-6.8 4.4,-5.8 C7.6,-3.6 6.4,0 0,5 Z', C.coral);
    return (
      layer(0, corridorBackdrop()) +
      layer(0.06, wallSconce(120, 32)) +
      layer(0.12, corridorDoor({ x: 214, y: 6, w: 96, h: 144, num: '8011', open: 'back' })) +
      layer(0.24, place('translate(150 150) scale(-1 1)', staffBody({ pose: 'stand', eyes: 'happy' }), 'ill-actor ill-actor--staff')) +
      layer(0.28, glow(262, 108, 58, 46, 1)) +
      layer(0.3, place('translate(256 146)', guestStand({ arms: 'hold', eyes: 'happy' }), 'ill-actor ill-actor--guest')) +
      layer(0.36, at(256, 128, bottle(), 'ill-keep')) +
      layer(0.16, corridorDoor({ x: 214, y: 6, w: 96, h: 144, open: 'front' })) +
      layer(0.5, g('class="ill-hearts"',
        at(292, 34, heart, 'ill-heart') +
        at(306, 62, '<g transform="scale(0.72)">' + heart + '</g>', 'ill-heart') +
        at(276, 18, '<g transform="scale(0.55)">' + heart + '</g>', 'ill-heart')))
    );
  }

  var SCENES = {
    'guest-call': guestCall,
    'ai-dispatch': aiDispatch,
    'staff-prepare': staffPrepare,
    'staff-walk': staffWalk,
    'staff-deliver': staffDeliver,
    'guest-happy': guestHappy,
    /* 一线员工课件（0000 房）复用同一套走廊与角色，只换门牌号 */
    'staff-walk-0000': function () {
      return staffWalk({ num: '0000', nearNum: '0002' });
    },
    'staff-deliver-0000': function () {
      return staffDeliver({ num: '0000' });
    }
  };

  var ALT = {
    'guest-call': '插画：客人在客房床头柜旁拿起听筒打电话，画面里没有对话内容',
    'ai-dispatch': '插画：AI 助手接待这通电话，并把生成的工单推向手机',
    'staff-prepare': '插画：员工在服务间从台面上取一瓶纯净水',
    'staff-walk': '插画：员工拿着纯净水沿走廊前往 8011 房',
    'staff-deliver': '插画：员工把纯净水递到 8011 房门口的客人手上',
    'guest-happy': '插画：客人抱着纯净水，员工在门口，服务完成',
    'staff-walk-0000': '插画：员工拿着客人要的物品沿走廊前往 0000 房',
    'staff-deliver-0000': '插画：员工在 0000 房门口把物品递到客人手上'
  };

  function wrap(inner) {
    return (
      '<svg class="illus__svg" viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg" focusable="false" aria-hidden="true">' +
      defs() +
      inner +
      '</svg>'
    );
  }

  /* options: { scene, alt, className } */
  function render(host, options) {
    var opts = options || {};
    var key = opts.scene;
    var builder = SCENES[key];
    if (!builder) {
      ui.setHtml(host, '');
      return;
    }
    ui.setHtml(
      host,
      '<figure class="illus illus--' +
        key +
        (opts.className ? ' ' + opts.className : '') +
        '" role="img" aria-label="' +
        ui.escapeHtml(opts.alt || ALT[key] || '插画') +
        '">' +
        wrap(builder()) +
        '</figure>'
    );
  }

  /* 道具出口：别的组件（第六幕的飞爪小游戏）直接复用这几件道具，
     保证「同一瓶纯净水」在一章里不会长出两个样子。局部坐标原点见各函数注释。 */
  var PROPS = {
    bottle: bottle,
    slippers: slippers,
    /* 第七幕的走廊俯视图复用第六幕服务间那一架货架（同一架布草、同一瓶水） */
    'pantry-unit': pantryUnit,
    'towel-stack': function (o) {
      var oo = o || {};
      var width = oo.width || 46;
      return towelStack(-width / 2, 0, width);
    }
  };

  HKR.components.illustration = {
    render: render,
    has: function (key) {
      return !!SCENES[key];
    },
    palette: C,
    /* 绘图原语出口：自绘组件（claw-game.js）用同一套 r / e / c / p / s / g / at / place，
       不另起一套画法，也不用在组件里手拼 <rect …> 字符串 */
    svg: { r: r, e: e, c: c, p: p, s: s, g: g, at: at, place: place },
    prop: function (name, options) {
      var builder = PROPS[name];
      if (!builder) return '';
      return builder(options || {});
    }
  };
})();
