/* 第七幕「走廊寻房挑战」：俯视走廊的走位小游戏（可玩，不是静态插画）
 *
 * 教学目标：东西领到手（第六幕）之后，还要按房间号在走廊里找到客人的房门，把东西送到。
 *  员工从服务间出发 → 沿走廊走到 8011 房门口 → 送达完成（8011 房门口亮着暖色灯）。
 *
 * 三条设计红线（与第六幕飞爪同一套原则）：
 *  1. 只考「按房号找对门」，不考反应速度：一格一步、没有倒计时，
 *     走错门只提示一句「这里是 8014 房门口，客人要的是 8011 房」；
 *  2. 不允许无意义的失败：撞到墙 / 服务间就停在原地（提示一句「走不过去，换个方向」），
 *     不掉步数、不写任何失败 / 扣分字段；
 *  3. 一次点击就能过：「跳过走位，直接送达」直接把送达记为完成，
 *     结果卡片如实写明是跳过的，不假装玩过。
 *
 * 画面是一张「酒店八楼走廊的俯视图」：石材地面一格一块砖、两排客房各两格一间，
 *  门上是深蓝门牌（上排 8007~8010、下排 8014~8011），中间那栋是服务间与电梯厅，
 *  门两侧是壁灯、门前地面保持石材本色（**门口不铺地垫**），8011 门口亮暖光并插着一枚定位针。
 *  画得不只是好看：看得见的格子 = 走得动的一步，看得见的墙 = 走不过去的墙
 *  （绘制 / 碰撞 / 房门口判定共用同一套坐标）。
 *
 * 坐标：全部在 352 × 256 的 viewBox 里（VIEW / MARGIN / CELL / GRID / ROOMS）。
 *  MARGIN = 16px 是板四周的外圈（只画外墙、落影与绿植），走廊本身仍然是 320 × 224，
 *  所以自测可以直接把规则钉死（tests/smoke.js 调 step / route 这些纯函数），
 *  也不需要按屏幕尺寸测坐标：板子宽度自适应，360 / 390 / 430 屏上比例完全一致。
 *
 * 移动：网格离散（一格一步）。方向键 / WASD 也能走（长按用浏览器自带的键盘连发，不另起定时器）；
 *  位置写在元素的 CSS transform 上（SVG 的 px 就是用户单位），位移交给 CSS transition 过渡 ——
 *  不跑 requestAnimationFrame，换幕时节点被换掉、过渡自然结束，不残留动画循环与监听器。
 */
window.HKR = window.HKR || {};
HKR.components = HKR.components || {};

(function () {
  var ui = HKR.core.ui;

  /* ==================== 一、地图（绘制 / 碰撞 / 判定共用同一套坐标） ==================== */

  var MARGIN = 16; /* 板四周 16px 的外圈：只画外墙、落影与绿植，走廊本身仍是 320 × 224 */
  var VIEW = { w: MARGIN * 2 + 320, h: MARGIN * 2 + 224 }; /* 352 × 256 */
  var CELL = 32; /* 一格边长：所有位置都是格的整数倍，判定区与画出来的格子完全重合 */
  var COLS = 10;
  var ROWS = 7;

  var START = { col: 1, row: 1 }; /* 起点：左上角的服务间门口 */
  var TARGET = { col: 8, row: 5 }; /* 终点：8011 房门口那一格 */
  var TARGET_ROOM = '8011';

  /* 每行一个字符串：'.' 走廊（可走）/ '#' 服务间 · 电梯厅（不可走）/ 'R' 客房（不可走）。
     走廊是「回」字形：上排 8007~8010、下排 8014~8011 是客房，中间那栋是服务间与电梯厅，
     只有两侧的纵向通道能上下走 —— 所以从左上角去右下角的 8011 必须绕过去，这就是本关的墙。 */
  var GRID = [
    'RRRRRRRRRR',
    '..........',
    '..######..',
    '..######..',
    '..######..',
    '..........',
    'RRRRRRRRRR'
  ];

  /* 客房：房号写在门牌上（上排左→右 8007~8010，下排左→右 8014~8011）。
     door 是走廊里正对房门的那一格：踩到它就等于「站在谁家门口」——
     真实酒店里也是看门牌找门，所以判定只用这一格，不做「隔着三格也算」的宽容。 */
  var ROOMS = [
    { no: '8007', side: 'top', from: 1, to: 2, door: { col: 2, row: 1 } },
    { no: '8008', side: 'top', from: 3, to: 4, door: { col: 4, row: 1 } },
    { no: '8009', side: 'top', from: 5, to: 6, door: { col: 6, row: 1 } },
    { no: '8010', side: 'top', from: 7, to: 8, door: { col: 8, row: 1 } },
    { no: '8014', side: 'bottom', from: 1, to: 2, door: { col: 2, row: 5 } },
    { no: '8013', side: 'bottom', from: 3, to: 4, door: { col: 4, row: 5 } },
    { no: '8012', side: 'bottom', from: 5, to: 6, door: { col: 6, row: 5 } },
    { no: '8011', side: 'bottom', from: 7, to: 8, door: { col: 8, row: 5 } }
  ];

  var DIRS = {
    up: { dc: 0, dr: -1 },
    down: { dc: 0, dr: 1 },
    left: { dc: -1, dr: 0 },
    right: { dc: 1, dr: 0 }
  };
  var DIR_NAMES = ['up', 'right', 'down', 'left'];

  /* ==================== 二、纯函数（自测直接调，不依赖 DOM 与动画） ==================== */

  function inBounds(col, row) {
    return col >= 0 && col < COLS && row >= 0 && row < ROWS;
  }

  /* 这一格能不能走：越界 / 服务间 / 客房都算墙 */
  function walkable(col, row, map) {
    var grid = map || GRID;
    if (!inBounds(col, row)) return false;
    return grid[row].charAt(col) === '.';
  }

  /* 走一格：撞墙就停在原地（moved: false），并说明为什么停
     （blocked: 'wall' 前面是服务间 / 客房，'edge' 走廊到头了，'dir' 方向不认识）。 */
  function step(from, dir, map) {
    var move = DIRS[dir];
    var here = from || START;
    if (!move) return { col: here.col, row: here.row, moved: false, blocked: 'dir' };
    var col = here.col + move.dc;
    var row = here.row + move.dr;
    if (walkable(col, row, map)) return { col: col, row: row, moved: true, blocked: null };
    return { col: here.col, row: here.row, moved: false, blocked: inBounds(col, row) ? 'wall' : 'edge' };
  }

  function sameCell(a, b) {
    return !!a && !!b && a.col === b.col && a.row === b.row;
  }

  /* 站在谁家门口：不在任何房门口就返回 null（走廊中间、隔壁门口都不算） */
  function doorAt(col, row) {
    for (var i = 0; i < ROOMS.length; i++) {
      if (ROOMS[i].door.col === col && ROOMS[i].door.row === row) return ROOMS[i];
    }
    return null;
  }

  function roomByNumber(no) {
    for (var i = 0; i < ROOMS.length; i++) {
      if (ROOMS[i].no === no) return ROOMS[i];
    }
    return null;
  }

  function isTargetRoom(room) {
    return !!room && room.no === TARGET_ROOM;
  }

  /* 最短路线（BFS）：返回一串方向，走不到返回 null。
     自测用它把「8011 必须绕过去」这条规则钉死，也用来算最少几步。 */
  function route(from, to, map) {
    var start = from || START;
    var goal = to || TARGET;
    var key = function (col, row) {
      return col + ',' + row;
    };
    var seen = {};
    var prev = {};
    var queue = [{ col: start.col, row: start.row }];
    seen[key(start.col, start.row)] = true;

    while (queue.length) {
      var here = queue.shift();
      if (here.col === goal.col && here.row === goal.row) {
        var path = [];
        var cursor = key(here.col, here.row);
        while (prev[cursor]) {
          path.unshift(prev[cursor].dir);
          cursor = prev[cursor].from;
        }
        return path;
      }
      for (var i = 0; i < DIR_NAMES.length; i++) {
        var next = step(here, DIR_NAMES[i], map);
        if (!next.moved) continue;
        var nextKey = key(next.col, next.row);
        if (seen[nextKey]) continue;
        seen[nextKey] = true;
        prev[nextKey] = { from: key(here.col, here.row), dir: DIR_NAMES[i] };
        queue.push({ col: next.col, row: next.row });
      }
    }
    return null;
  }

  /* 最少几步：配置里不写死步数，界面上的提示都由它算出来 */
  function routeLength(from, to, map) {
    var path = route(from, to, map);
    return path ? path.length : -1;
  }

  /* 一格格数下去（到不了目标就停在原地）：
     自测用它逐格走完最短路线，也方便以后做「自动带路」这类辅助。 */
  function walk(from, steps, map) {
    var cell = { col: (from || START).col, row: (from || START).row };
    (steps || []).forEach(function (dir) {
      cell = step(cell, dir, map);
    });
    return cell;
  }
  /* ==================== 三、绘制（俯视图：石材走廊 + 深蓝门牌 + 服务间 / 电梯厅） ====================
   *
   * 这一层只负责「画出来」：坐标一律走 cellX / cellY，和碰撞、房门口判定共用同一套格子，
   * 所以画面上看得见的墙就是走不过去的墙 —— 改样式不会改规则。
   * 色板 / 图元 / 道具都从 illustration 拿（C / S / prop）：同一章里不会出现
   * 「两个样子的纯净水、两件制服、两种木色」。
   *
   * 画面自下而上五层，一层一个函数：
   *   建筑外圈（外墙 + 投影）→ 走廊地面（石材砖 + 踢脚 + 顶灯光斑）
   *   → 中间那栋（服务间 / 电梯厅）→ 两排客房墙带（门 / 门牌 / 壁灯）→ 员工。
   */

  /* 俯视图专用的一小撮中性色只在这里定义一次（石材地面两档、墙顶面、踢脚、门套五金……）：
     它们不是品牌色、不进 base.css；角色 / 道具 / 木色 / 深蓝仍然只用 illustration 的 C。 */
  function tones(C) {
    return {
      outside: '#EFE9DF', /* 建筑外的地面 */
      outsideLine: '#E1D9CA',
      wallTop: '#F2EBDF', /* 墙顶面（俯视看到的那一面） */
      wallTopDeep: '#E5DBC9',
      wallEdge: '#D2C1A8', /* 墙的走廊侧立面：墙有多厚，就看这两条 */
      wallEdgeDeep: '#C2AE92',
      stoneA: '#F7F1E7', /* 走廊石材地面：两档交替，用来数「一格」 */
      stoneB: '#F1E9DC',
      stoneJoint: 'rgba(176,156,126,0.28)',
      stoneDiamond: 'rgba(176,156,126,0.30)',
      roomFloor: '#F8F2E9',
      skirting: '#E3D6C0', /* 踢脚：地面与墙之间那条分界线 */
      brass: '#B6A279' /* 门把五金：与 illustration 里的门把同色 */
    };
  }

  /* 色板 / 图元 / 道具都从 illustration 拿：同一章里不会出现「两个样子的纯净水、两件制服」 */
  function ensureArt() {
    var illustration = HKR.components.illustration;
    return { C: illustration.palette, S: illustration.svg, prop: illustration.prop };
  }

  function cellX(col) {
    return MARGIN + col * CELL;
  }

  function cellY(row) {
    return MARGIN + row * CELL;
  }

  function cellCenter(col, row) {
    return { x: cellX(col) + CELL / 2, y: cellY(row) + CELL / 2 };
  }

  /* 文字图元：illustration 只出图形，房号 / 标牌这类文字在本组件里补一个
     （转义交给 ui.escapeHtml） */
  function t(x, y, value, options) {
    var o = options || {};
    return (
      '<text x="' + x + '" y="' + y + '" fill="' + (o.fill || '#6E6259') + '"' +
      ' font-size="' + (o.size || 9) + '" font-weight="' + (o.weight || 500) + '"' +
      ' text-anchor="' + (o.anchor || 'middle') + '" dominant-baseline="middle"' +
      ' font-family="-apple-system, BlinkMacSystemFont, PingFang SC, Microsoft YaHei, sans-serif">' +
      ui.escapeHtml(value) +
      '</text>'
    );
  }
  /* ==================== 绘制：图元定义（渐变 / 光斑） ==================== */

  function defsMarkup() {
    var A = ensureArt();
    var C = A.C;
    var T = tones(C);
    return (
      '<defs>' +
      /* 8011 房门口的暖光（CSS 拿它去做「呼吸」）：径向渐变，画面里不会出现「一块看得见的浅色圆盘」 */
      '<radialGradient id="corridorGlow" cx="50%" cy="50%" r="50%">' +
      '<stop offset="0%" stop-color="' + C.glow + '" stop-opacity="0.8"/>' +
      '<stop offset="55%" stop-color="' + C.glow + '" stop-opacity="0.3"/>' +
      '<stop offset="100%" stop-color="' + C.glow + '" stop-opacity="0"/>' +
      '</radialGradient>' +
      /* 壁灯落在墙面 / 地面上的光斑 */
      '<radialGradient id="corridorLamp" cx="50%" cy="50%" r="50%">' +
      '<stop offset="0%" stop-color="' + C.lamp + '" stop-opacity="0.9"/>' +
      '<stop offset="100%" stop-color="' + C.lamp + '" stop-opacity="0"/>' +
      '</radialGradient>' +
      /* 顶灯落在地上的一层光：地面才不是一块死白 */
      '<radialGradient id="corridorPool" cx="50%" cy="50%" r="50%">' +
      '<stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.6"/>' +
      '<stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>' +
      '</radialGradient>' +
      /* 墙顶面：同一条墙从上到下一档深浅，墙才「立」得起来 */
      '<linearGradient id="corridorWallTop" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="' + T.wallTopDeep + '"/>' +
      '<stop offset="100%" stop-color="' + T.wallTop + '"/>' +
      '</linearGradient>' +
      /* 下排墙带用同一档渐变、方向翻过来（外墙那一侧才是深的） */
      '<linearGradient id="corridorWallTopUp" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="' + T.wallTop + '"/>' +
      '<stop offset="100%" stop-color="' + T.wallTopDeep + '"/>' +
      '</linearGradient>' +
      /* 木门：暖木一深一浅（和插画里的门套同一个木色家族） */
      '<linearGradient id="corridorWood" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="' + C.wood + '"/>' +
      '<stop offset="100%" stop-color="' + C.woodDark + '"/>' +
      '</linearGradient>' +
      /* 电梯门：冷灰拉丝（和石材地面的暖白分开，一眼看出是金属） */
      '<linearGradient id="corridorSteel" x1="0" y1="0" x2="1" y2="0">' +
      '<stop offset="0%" stop-color="' + C.sashLight + '"/>' +
      '<stop offset="45%" stop-color="' + C.sash + '"/>' +
      '<stop offset="100%" stop-color="' + C.sashLight + '"/>' +
      '</linearGradient>' +
      /* 门牌 / 设施标牌的深蓝：上浅下深，白字压得住 */
      '<linearGradient id="corridorPlate" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="' + C.vest + '"/>' +
      '<stop offset="100%" stop-color="' + C.vestDark + '"/>' +
      '</linearGradient>' +
      '</defs>'
    );
  }

  /* ==================== 绘制：建筑外圈（外墙 + 落影 + 外圈绿植） ==================== */

  /* 板四周那 16px 外圈只干一件事：把走廊包进「一栋楼」里。
     它不参与任何判定 —— 能走的格子仍然只有走廊那一圈。 */
  function outsideMarkup() {
    var A = ensureArt();
    var C = A.C;
    var T = tones(C);
    var r = A.S.r;
    var ring = 5; /* 外墙厚 5px：画在走廊格外沿，不占可走的格子 */
    var x = MARGIN - ring;
    var y = MARGIN - ring;
    var w = COLS * CELL + ring * 2;
    var h = ROWS * CELL + ring * 2;
    var out = r(0, 0, VIEW.w, VIEW.h, 0, T.outside);
    /* 落影：三层浅色同心叠出来（和插画一样不用 filter，免得糊成一团） */
    out += r(x + 3, y + 4, w, h, 6, C.shadowSoft);
    out += r(x + 2, y + 3, w + 2, h + 2, 6, C.shadowSoft);
    out += r(x, y, w, h, 5, 'url(#corridorWallTop)', 'stroke="' + T.outsideLine + '" stroke-width="1"');
    /* 外圈四角的绿植：交代「楼外还有院子」，画面四角也不至于空着 */
    out += plantMarkup(7, 8.5, 0.78);
    out += plantMarkup(VIEW.w - 7, 8.5, 0.78);
    out += plantMarkup(7, VIEW.h - 8.5, 0.78);
    out += plantMarkup(VIEW.w - 7, VIEW.h - 8.5, 0.78);
    return out;
  }
  /* ==================== 绘制：小零件（绿植 / 壁灯 / 图标 / 标牌） ==================== */

  /* 绿植（俯视）：一只陶盆 + 一圈叶子。绿只从 illustration 的 C 里取（leaf / leafDark），
     和木色 / 暖调同族，不引入第二个饱和色。 */
  function plantMarkup(x, y, k) {
    var A = ensureArt();
    var C = A.C;
    var scale = k || 1;
    var e = A.S.e;
    var c = A.S.c;
    var leaves = [
      [0, -6.4, 6.6, 4.4],
      [-5.8, -3.2, 5.2, 3.4],
      [5.8, -3.2, 5.2, 3.4],
      [-2.6, -8.6, 4.4, 3],
      [2.8, -8.4, 4.2, 2.8]
    ];
    var out = e(x, y + 4.4 * scale, 9 * scale, 3.6 * scale, C.shadow);
    leaves.forEach(function (leaf, index) {
      var cx = x + leaf[0] * scale;
      var cy = y + leaf[1] * scale;
      out +=
        '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + leaf[2] * scale + '" ry="' + leaf[3] * scale +
        '" fill="' + (index % 2 ? C.leaf : C.leafDark) + '" opacity="0.95"' +
        ' transform="rotate(' + index * 62 + ' ' + cx + ' ' + cy + ')"/>';
    });
    /* 盆：从上往下看是「一圈盆口 + 一点盆身」 */
    out += c(x, y, 7 * scale, C.wood);
    out += c(x, y, 5.4 * scale, C.woodDark);
    return out;
  }

  /* 壁灯：挂在墙的走廊侧立面上，往地面落一小团暖光。
     dir 是「光往哪边照」——上排墙带往下、下排墙带往上、左右两侧外墙往走廊里照。 */
  function sconceMarkup(x, y, dir) {
    var A = ensureArt();
    var C = A.C;
    var e = A.S.e;
    var s = A.S.s;
    var p = A.S.p;
    var pool = {
      down: [x, y + 9, 15, 9],
      up: [x, y - 9, 15, 9],
      right: [x + 9, y, 9, 15],
      left: [x - 9, y, 9, 15]
    }[dir];
    var turn = { down: 0, up: 180, right: 90, left: -90 }[dir];
    var lamp =
      s('M' + x + ',' + (y - 3) + ' V' + (y + 1), C.doorDark, 2.4) +
      p(
        'M' + (x - 5) + ',' + (y + 1.6) + ' L' + (x + 5) + ',' + (y + 1.6) +
          ' L' + (x + 3) + ',' + (y - 3) + ' L' + (x - 3) + ',' + (y - 3) + ' Z',
        C.lamp
      );
    return (
      e(pool[0], pool[1], pool[2], pool[3], 'url(#corridorLamp)') +
      (turn ? '<g transform="rotate(' + turn + ' ' + x + ' ' + y + ')">' + lamp + '</g>' : lamp)
    );
  }
  /* 两枚设施标牌的图标（都画在 24 × 24 的方框里，再缩到牌子上）：
     电梯 = 一个人 + 一上一下两个箭头，服务间 = 一辆布草车 —— 线条语言和 illustration 的道具一致。 */
  function iconMarkup(name) {
    var A = ensureArt();
    var S = A.S;
    if (name === 'lift') {
      return (
        S.c(9.4, 8, 2.6, '#FFFFFF') +
        S.p('M5.2,20 C5.2,15.2 13.6,15.2 13.6,20 Z', '#FFFFFF') +
        S.p('M17.6,4.4 L20.8,8.8 L14.4,8.8 Z', '#FFFFFF') +
        S.p('M17.6,19.6 L14.4,15.2 L20.8,15.2 Z', '#FFFFFF')
      );
    }
    return (
      S.s('M4.8,7.4 L2.6,4.2 L4.4,3 L6.6,6.2', '#FFFFFF', 1.8) +
      S.r(3.4, 6.6, 17.2, 2.4, 1.2, '#FFFFFF') +
      S.r(4.6, 9, 14.8, 8.2, 1.6, '#FFFFFF') +
      S.c(8.2, 19.6, 1.9, '#FFFFFF') +
      S.c(15.8, 19.6, 1.9, '#FFFFFF')
    );
  }

  /* 设施标牌：深蓝底 + 白图标 + 白字（和门牌同一族深蓝）—— 一眼就是「酒店标识牌」。 */
  function badgeMarkup(cx, top, w, h, icon, label) {
    var A = ensureArt();
    var r = A.S.r;
    var out = r(cx - w / 2, top, w, h, 3, 'url(#corridorPlate)', 'stroke="rgba(255,255,255,0.3)" stroke-width="0.8"');
    out += '<g transform="translate(' + (cx - 7.2) + ' ' + (top + 2.4) + ') scale(0.6)">' + iconMarkup(icon) + '</g>';
    out += t(cx, top + h - 5.2, label, { size: 8, weight: 600, fill: '#FFFFFF' });
    return out;
  }

  /* ==================== 绘制：走廊地面（石材方砖 + 踢脚 + 顶灯光斑） ==================== */

  /* 一格一块石材方砖：走位是「一格一步」，地面就要看得见格子 ——
     砖缝只有 0.6px、两档底色只差一个色阶，所以看起来是「一块地」，不是棋盘格。 */
  function floorMarkup() {
    var A = ensureArt();
    var T = tones(A.C);
    var r = A.S.r;
    var e = A.S.e;
    var s = A.S.s;
    var out = '';
    /* 顶灯：走廊上下两条各一团（中间那栋是墙，不铺） */
    out += e(cellX(5), cellY(1) + CELL / 2, CELL * 3.2, CELL * 1.4, 'url(#corridorPool)');
    out += e(cellX(5), cellY(5) + CELL / 2, CELL * 3.2, CELL * 1.4, 'url(#corridorPool)');
    for (var row = 0; row < ROWS; row += 1) {
      for (var col = 0; col < COLS; col += 1) {
        if (!walkable(col, row)) continue;
        var x = cellX(col);
        var y = cellY(row);
        var mid = cellCenter(col, row);
        out += r(
          x + 0.5,
          y + 0.5,
          CELL - 1,
          CELL - 1,
          3,
          (col + row) % 2 ? T.stoneA : T.stoneB,
          'stroke="' + T.stoneJoint + '" stroke-width="0.6"'
        );
        /* 砖心一枚 10px 的菱形拼花：一格一眼可辨，又不跟房门抢注意力 */
        out += s(
          'M' + mid.x + ',' + (mid.y - 5) + ' L' + (mid.x + 5) + ',' + mid.y +
            ' L' + mid.x + ',' + (mid.y + 5) + ' L' + (mid.x - 5) + ',' + mid.y + ' Z',
          T.stoneDiamond,
          0.5
        );
      }
    }
    return out + skirtingMarkup();
  }

  /* 踢脚：走廊贴墙的那一条 2px 深线（画在「隔壁格走不进去」的那一侧）。
     有了它，地面和墙之间永远有一条分界，俯视图才不会「糊」成一片。 */
  function skirtingMarkup() {
    var A = ensureArt();
    var T = tones(A.C);
    var r = A.S.r;
    var out = '';
    for (var row = 0; row < ROWS; row += 1) {
      for (var col = 0; col < COLS; col += 1) {
        if (!walkable(col, row)) continue;
        var x = cellX(col);
        var y = cellY(row);
        if (!walkable(col, row - 1)) out += r(x, y, CELL, 2, 0, T.skirting);
        if (!walkable(col, row + 1)) out += r(x, y + CELL - 2, CELL, 2, 0, T.skirting);
        if (!walkable(col - 1, row)) out += r(x, y, 2, CELL, 0, T.skirting);
        if (!walkable(col + 1, row)) out += r(x + CELL - 2, y, 2, CELL, 0, T.skirting);
      }
    }
    return out;
  }
  /* ==================== 绘制：中间那栋（服务间 + 电梯厅） ==================== */

  /* 那栋走不过去的楼：左半是服务间、右半是电梯厅。
     俯视把屋顶「掀掉」了一层，所以看得见里面的货架、布草和电梯门 ——
     它读起来是「服务设施」，不是一堵没来由的墙（第六幕里员工就是从这间服务间拿的水）。
     判定上这一整栋仍然进不去，撞上去的提示写的就是「这边是服务间的墙」。 */
  function blockMarkup() {
    var A = ensureArt();
    var C = A.C;
    var T = tones(C);
    var r = A.S.r;
    var s = A.S.s;
    var e = A.S.e;
    var x = cellX(2);
    var y = cellY(2);
    var w = 6 * CELL;
    var h = 3 * CELL;
    var wall = 5;
    var inX = x + wall;
    var inY = y + wall;
    var inW = w - wall * 2;
    var inH = h - wall * 2;
    var split = x + w / 2; /* 服务间（左）/ 电梯厅（右）中间那道隔墙 */
    var liftX = split + 48; /* 电梯门居中：右半间的中线 */
    var p = A.S.p;
    var out = '';
    /* 墙顶面 + 走廊侧立面（下沿压深一档 = 这栋楼有厚度） */
    out += r(x, y, w, h, 4, 'url(#corridorWallTop)', 'stroke="' + T.wallEdge + '" stroke-width="1"');
    out += r(x + 1, y + h - 3.2, w - 2, 3.2, 1.5, T.wallEdgeDeep, 'opacity="0.55"');
    /* 两间房的地面：服务间亮一档（那是干活的地方），电梯厅是石材地面 */
    out += r(inX, inY, inW, inH, 3, T.stoneB);
    out += r(inX, inY, inW / 2 - 3, inH, 3, T.roomFloor);
    out += e(inX + 46, inY + 22, 42, 18, 'url(#corridorPool)');
    out += e(liftX, inY + 34, 40, 20, 'url(#corridorPool)');
    out += r(split - 1.6, inY, 3.2, inH, 0, T.wallEdge);
    /* 服务间：第六幕那架布草 / 纯净水搬进来（俯视在这里是「掀掉屋顶看进去」） */
    out += A.S.at(inX + 3, inY + 7, '<g transform="scale(0.5)">' + A.prop('pantry-unit') + '</g>');
    /* 服务间的门：开在靠走廊这一边（门洞 + 门框 + 洒进走廊的一小束暖光） */
    out += r(x + 20, y - 2, 44, wall + 4, 1.6, C.doorFrame);
    out += r(x + 22, y - 1, 40, wall + 2, 1, '#FFF3DF');
    out += s('M' + (x + 22) + ',' + (y + 1.4) + ' H' + (x + 62), C.doorDark, 0.9);
    out += p(
      'M' + (x + 22) + ',' + y + ' L' + (x + 62) + ',' + y +
        ' L' + (x + 70) + ',' + (y - 15) + ' L' + (x + 14) + ',' + (y - 15) + ' Z',
      C.glow,
      'opacity="0.26"'
    );
    out += badgeMarkup(x + 42, y + 5, 36, 26, 'cart', '服务间');
    /* 电梯厅：两部电梯门（冷灰拉丝）也开在靠走廊这一边 + 门边的呼梯面板 */
    out += r(liftX - 30, y - 2, 60, wall + 4, 1.6, T.wallEdge);
    out += r(liftX - 28, y - 1, 56, wall + 2, 1, 'url(#corridorSteel)', 'stroke="' + C.sash + '" stroke-width="0.6"');
    out += s('M' + liftX + ',' + (y - 1) + ' V' + (y + wall + 1), C.sash, 1.4);
    out += s('M' + (liftX - 12) + ',' + (y + 3.4) + ' V' + (y + wall - 1), C.sashLight, 1.2);
    out += s('M' + (liftX + 12) + ',' + (y + 3.4) + ' V' + (y + wall - 1), C.sashLight, 1.2);
    out += badgeMarkup(liftX, y - 17, 34, 26, 'lift', '电梯');
    out += r(liftX + 33, inY + 4, 6, 12, 1.2, C.sash, 'stroke="' + C.sashLight + '" stroke-width="0.6"');
    out += A.S.c(liftX + 36, inY + 7.6, 1.1, C.card);
    out += A.S.c(liftX + 36, inY + 12.4, 1.1, C.card);
    out += plantMarkup(inX + inW - 11, inY + inH - 10, 0.78);
    return out;
  }
  /* ==================== 绘制：两排客房墙带（门 / 门牌 / 壁灯） ==================== */

  /* 一条墙带的中线几何：上下两排只是把 y 镜像一下，所以坐标全部按 side 现算
     （不翻 transform —— 翻过来房号就倒着写了）。 */
  function bandMetrics(side) {
    var top = side === 'top';
    var bandY = top ? cellY(0) : cellY(6);
    var inner = top ? bandY + CELL : bandY; /* 墙贴走廊的那条边 */
    return {
      side: side,
      top: top,
      bandY: bandY,
      inner: inner,
      doorTop: top ? inner - 19 : inner + 3,
      doorH: 16,
      plateTop: top ? bandY + 2.5 : bandY + 17.5,
      plateH: 12,
      lampY: top ? inner - 1.5 : inner + 1.5,
      glowY: top ? inner + 7 : inner - 7,
      dir: top ? 'down' : 'up'
    };
  }

  /* 一间房的门口：门套 + 双开木门 + 深蓝门牌（壁灯按墙带统一摆，见 roomsMarkup）。
     门前那一格不画任何东西：地垫已按业务方反馈删掉，门口只留石材地面。
     每间两格宽（64px）、门居中 —— 走廊里一眼就能把「门」和「房号」对起来。 */
  function bayMarkup(room, M) {
    var A = ensureArt();
    var C = A.C;
    var T = tones(C);
    var r = A.S.r;
    var c = A.S.c;
    var e = A.S.e;
    var isTarget = isTargetRoom(room);
    var bayX = cellX(room.from);
    var cx = bayX + ((room.to - room.from + 1) * CELL) / 2;
    var out = '';
    /* 门套：比门大一圈的浅木色，门是嵌在墙里的 */
    out += r(cx - 23, M.doorTop - 2, 46, M.doorH + 4, 2.5, C.doorFrame);
    /* 双开木门：两扇各 20px，中间留 1px 门缝 */
    out += r(cx - 21, M.doorTop, 20, M.doorH, 1.6, 'url(#corridorWood)', 'stroke="' + C.woodDark + '" stroke-width="0.8"');
    out += r(cx + 1, M.doorTop, 20, M.doorH, 1.6, 'url(#corridorWood)', 'stroke="' + C.woodDark + '" stroke-width="0.8"');
    /* 门板上的两道凹线：木门才像木门 */
    out += r(cx - 18, M.doorTop + 3.4, 14, 4, 1, C.woodDark, 'opacity="0.32"');
    out += r(cx - 18, M.doorTop + 9, 14, 4, 1, C.woodDark, 'opacity="0.32"');
    out += r(cx + 4, M.doorTop + 3.4, 14, 4, 1, C.woodDark, 'opacity="0.32"');
    out += r(cx + 4, M.doorTop + 9, 14, 4, 1, C.woodDark, 'opacity="0.32"');
    /* 门把：两只铜色小球（贴门缝两侧） */
    out += c(cx - 2.6, M.doorTop + M.doorH / 2, 1.5, T.brass);
    out += c(cx + 2.6, M.doorTop + M.doorH / 2, 1.5, T.brass);
    if (isTarget) {
      /* 目标房：门里透着暖光，门口再铺一层暖色光斑（整个画面只有它一处） */
      out += r(cx - 21, M.doorTop, 42, M.doorH, 1.6, C.lamp, 'opacity="0.42"');
      out += e(cx, M.glowY, 30, 15, 'url(#corridorGlow)');
    }
    /* 门牌：深蓝底 + 白字（和设施标牌同一族），目标房描一圈暖金边并加一层背光 */
    if (isTarget) out += e(cx, M.plateTop + M.plateH / 2, 27, 12.5, 'url(#corridorGlow)');
    out += r(
      cx - 19,
      M.plateTop,
      38,
      M.plateH,
      2.5,
      'url(#corridorPlate)',
      'stroke="' + (isTarget ? C.lampWarm : 'rgba(255,255,255,0.32)') + '" stroke-width="' + (isTarget ? 1.2 : 0.7) + '"'
    );
    out += t(cx, M.plateTop + M.plateH / 2 + 0.4, room.no, { size: isTarget ? 9.8 : 9.3, weight: 600, fill: '#FFFFFF' });
    return out;
  }

  /* 8011 门口那枚定位针（金橙水滴 + 白针心 + 地上一圈小影）：整张俯视图里只有这一枚，
     它就是「客人要的那间房在这儿」的定点标记。 */
  function pinMarkup(cx, tipY) {
    var A = ensureArt();
    var C = A.C;
    var e = A.S.e;
    var p = A.S.p;
    var c = A.S.c;
    var head = tipY - 20;
    var shape = function (radius, center) {
      return (
        'M' + cx + ',' + tipY +
        ' C' + (cx - radius * 0.42) + ',' + (tipY - radius * 0.75) +
        ' ' + (cx - radius) + ',' + (center + radius * 0.55) +
        ' ' + (cx - radius) + ',' + center +
        ' A' + radius + ' ' + radius + ' 0 1 1 ' + (cx + radius) + ' ' + center +
        ' C' + (cx + radius) + ',' + (center + radius * 0.55) +
        ' ' + (cx + radius * 0.42) + ',' + (tipY - radius * 0.75) +
        ' ' + cx + ',' + tipY + ' Z'
      );
    };
    return (
      e(cx, tipY + 1.2, 5, 2, C.shadow) +
      e(cx, head, 13, 12, 'url(#corridorLamp)') +
      p(shape(7.8, head), C.furDark) +
      p(shape(6.4, head + 0.4), C.lampWarm) +
      c(cx, head, 2.4, C.card)
    );
  }
  /* 一条墙带的底子：墙顶面 + 走廊侧立面 + 夹在门中间的壁柱 + 两端的墙垛。
     壁柱给 5 根（4 间房两两之间 + 两端），位置就是房门的分界 —— 壁灯挂在这 5 根上。 */
  function bandFaceMarkup(side) {
    var A = ensureArt();
    var C = A.C;
    var T = tones(C);
    var r = A.S.r;
    var M = bandMetrics(side);
    var x0 = cellX(1);
    var x1 = cellX(8) + CELL;
    var out = '';
    /* 墙顶面：一条渐变，从头到尾（下排墙带把渐变翻过来，外墙那一侧才是深的） */
    out += r(x0, M.bandY, x1 - x0, CELL, 0, M.top ? 'url(#corridorWallTop)' : 'url(#corridorWallTopUp)');
    /* 走廊侧立面：3px 压深一档 —— 墙有厚度，就看这一条 */
    out += r(x0, M.top ? M.inner - 3 : M.inner, x1 - x0, 3, 0, T.wallEdge);
    out += r(x0, M.top ? M.inner - 3 : M.inner + 3, x1 - x0, 0.7, 0, T.wallEdgeDeep, 'opacity="0.5"');
    /* 两端的墙垛（cols 0 / 9）：不是房门，就一块干净的墙面 + 一圈内嵌线 */
    [cellX(0), cellX(9)].forEach(function (px) {
      out += r(px, M.bandY, CELL, CELL, 0, M.top ? 'url(#corridorWallTop)' : 'url(#corridorWallTopUp)');
      out += r(px + 6, M.bandY + 6, CELL - 12, CELL - 12, 2, 'none', 'stroke="' + T.wallEdge + '" stroke-width="0.8"');
    });
    /* 5 根壁柱 */
    for (var i = 0; i <= 4; i += 1) {
      var px = cellX(1 + i * 2);
      out += r(px - 7, M.bandY + 1.5, 14, CELL - 3, 1.5, C.card, 'opacity="0.72"');
      out += r(px + 5.4, M.bandY + 1.5, 1.6, CELL - 3, 0.8, C.shadow, 'opacity="0.5"');
    }
    return out;
  }

  /* 两排客房墙带：底子 → 每间房的门口 → 壁灯 →（目标房）定位针。
     门口不铺地垫（业务方反馈：门前那块深蓝地面太抢眼）：要站的那一格靠
     壁灯的光、目标房门内的暖光与地上那片光斑、以及门口那枚定位针一起指认。
     壁灯最后画：光是压在上面的一层，落在地面与墙上才对。 */
  function roomsMarkup() {
    var out = '';
    ['top', 'bottom'].forEach(function (side) {
      var M = bandMetrics(side);
      out += bandFaceMarkup(side);
      ROOMS.forEach(function (room) {
        if (room.side !== side) return;
        out += bayMarkup(room, M);
      });
      for (var i = 0; i <= 4; i += 1) {
        out += sconceMarkup(cellX(1 + i * 2), M.lampY, M.dir);
      }
      ROOMS.forEach(function (room) {
        if (room.side !== side || !isTargetRoom(room)) return;
        var cx = cellX(room.from) + ((room.to - room.from + 1) * CELL) / 2;
        out += pinMarkup(cx, M.top ? M.inner + 1 : M.inner - 1);
      });
    });
    /* 左右两侧外墙各一盏壁灯：光往走廊里照，两条纵向通道也不至于空着 */
    out += sconceMarkup(MARGIN - 3, cellY(3) + CELL / 2, 'right');
    out += sconceMarkup(VIEW.w - MARGIN + 3, cellY(3) + CELL / 2, 'left');
    return out;
  }
  /* 一线员工（俯视：头顶 + 肩背 + 两只鞋尖）+ 手里那瓶纯净水。
     道具复用第六幕的同一件 bottle（缩到随身尺寸），保证「同一瓶水」不会长出两个样子。
     局部坐标原点 = 所站那一格的格心，所以位置可以直接写 transform: translate(格心)。 */
  function actorMarkup() {
    var A = ensureArt();
    var C = A.C;
    var r = A.S.r;
    var c = A.S.c;
    var e = A.S.e;
    var at = A.S.at;
    return (
      /* 接触阴影：站在地面上，不飘 */
      at(0, 6, e(0, 0, 10.5, 4, C.shadow)) +
      /* 两只鞋尖：人是从背后看的，鞋在身体下沿露出一小截 */
      r(-5.8, 3.2, 4.4, 3.2, 1.6, C.shoe) +
      r(1.4, 3.2, 4.4, 3.2, 1.6, C.shoe) +
      /* 手里那瓶水（先画，压在手臂 / 手掌下面） */
      '<g transform="translate(10.5 2.6) scale(0.44)">' + A.prop('bottle', { shadow: false }) + '</g>' +
      /* 两截短袖（袖口压深一档） */
      r(-8.8, -3.2, 4.4, 7.6, 2.2, C.vest) +
      r(4.4, -3.2, 4.4, 7.6, 2.2, C.vest) +
      /* 马甲本体 + 两侧阴影（俯视看到的其实是肩背） */
      r(-7.4, -3.8, 14.8, 10.8, 4.4, C.vest) +
      r(-7.4, -3.8, 3.6, 10.8, 2, C.vestDark) +
      r(3.8, -3.8, 3.6, 10.8, 2, C.vestDark) +
      /* 后背的反光条 + 橙色滚边（和插画里的制服同一套色） */
      r(-5.4, -0.8, 10.8, 1.9, 0.9, C.piping) +
      r(-6.2, 2.4, 12.4, 1.6, 0.8, C.vestDark) +
      /* 露出的白领 + 工牌绳扣 */
      r(-2.9, -4.8, 5.8, 2.4, 1.2, C.shirt) +
      c(-4.2, 3, 1.3, C.card) +
      /* 头（俯视只看到头顶与短发）+ 两只耳朵 + 制服帽：
         短发只在后脑压一条，脸（俯视是头顶）要留得住肤色，不然整个人就是一团深色 */
      c(0, -6.4, 5.8, C.skin) +
      c(-5.9, -6.6, 1.5, C.skin) +
      c(5.9, -6.6, 1.5, C.skin) +
      r(-5.6, -10.4, 11.2, 5, 2.5, C.hair) +
      r(-5.4, -13, 10.8, 3.2, 1.6, C.vestDark) +
      c(0, -14.4, 1.5, C.vest)
    );
  }

  /* ==================== 四、一幕的骨架（任务条 → 走廊 → 方向键 → 提示 → 「跳过」） ==================== */

  /* 方向键：3 × 3 九宫格，四枚 52px 的圆形键 + 中间一格圆点，外面套一圈 1px 细线 ——
     四枚键连成一个「方向盘」，但底色仍然是白的（这一屏的深蓝只给门牌和设施标牌）。
     键 52px、命中区 ≥ 44px，360px 屏上四键也排得下、不会挤到边上。 */
  function padMarkup(cfg) {
    var arrows = {
      up: 'M12 5.5 L18 12.5 H6 Z',
      down: 'M12 18.5 L6 11.5 H18 Z',
      left: 'M4.5 12 L11.5 6 V18 Z',
      right: 'M19.5 12 L12.5 18 V6 Z'
    };
    var labels = { up: '往上走', left: '往左走', right: '往右走', down: '往下走' };
    function btn(dir) {
      return ui.html`<button class="corridor__pad-btn" type="button" data-action="corridor-move" data-dir="${dir}" aria-label="${labels[dir]}">
          <svg class="corridor__pad-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${arrows[dir]}" /></svg>
        </button>`;
    }
    return ui.html`
      <div class="corridor__pad" role="group" aria-label="${cfg.padLabel}">
        <span class="corridor__pad-ring" aria-hidden="true"></span>
        <span class="corridor__pad-slot" aria-hidden="true"></span>
        ${ui.raw(btn('up'))}
        <span class="corridor__pad-slot" aria-hidden="true"></span>
        ${ui.raw(btn('left'))}
        <span class="corridor__pad-core" aria-hidden="true"></span>
        ${ui.raw(btn('right'))}
        <span class="corridor__pad-slot" aria-hidden="true"></span>
        ${ui.raw(btn('down'))}
        <span class="corridor__pad-slot" aria-hidden="true"></span>
      </div>
    `;
  }
  /* 任务条与第六幕同一套：左边「这是什么任务」，中间「要送到哪一间」，右边「手里有什么」。
     走廊是 role="img"（整块地图读作一张图，方向键是它的操作面，所以不塞进图里）。 */
  function shellMarkup(cfg, actorPosition) {
    var A = ensureArt();
    var skip = cfg.skip || {};
    var skipMarkup = skip.label
      ? ui.html`<button class="corridor__skip" type="button" data-action="corridor-skip" aria-label="${skip.ariaLabel || skip.label}">${skip.label}</button>`
      : '';
    var noteMarkup = cfg.playNote ? ui.html`<p class="corridor__note">${cfg.playNote}</p>` : '';
    return ui.html`
      <div class="corridor" data-role="corridor" data-phase="walk">
        <div class="corridor__task">
          <p class="corridor__task-tag">
            <svg class="corridor__tag-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2.6 C7.9 2.6 4.6 5.7 4.6 9.6 C4.6 14.5 10.4 20.2 12 21.8 C13.6 20.2 19.4 14.5 19.4 9.6 C19.4 5.7 16.1 2.6 12 2.6 Z M12 12.4 A2.8 2.8 0 1 1 12 6.8 A2.8 2.8 0 1 1 12 12.4 Z" fill-rule="evenodd" /></svg>${cfg.taskTag}
          </p>
          <p class="corridor__task-line">${cfg.taskLine}</p>
          <p class="corridor__task-item">
            <svg class="corridor__task-bottle" viewBox="-9 -42 18 46" aria-hidden="true" focusable="false">${ui.raw(A.prop('bottle', { shadow: false }))}</svg>${cfg.taskItem}<span class="corridor__task-count">${cfg.taskCount}</span>
          </p>
        </div>
        <div class="corridor__board" data-role="corridor-board" role="img" aria-label="${cfg.boardLabel}">
          <svg class="corridor__svg" viewBox="0 0 ${VIEW.w} ${VIEW.h}" xmlns="http://www.w3.org/2000/svg" focusable="false" aria-hidden="true">
            ${ui.raw(
              defsMarkup() +
                outsideMarkup() +
                floorMarkup() +
                blockMarkup() +
                roomsMarkup() +
                '<g class="corridor__actor" data-role="actor" style="transform: translate(' +
                actorPosition.x +
                'px, ' +
                actorPosition.y +
                'px)">' +
                actorMarkup() +
                '</g>'
            )}
          </svg>
          <p class="corridor__flash" data-role="corridor-flash" aria-hidden="true"></p>
        </div>
        <div class="corridor__console">
          ${ui.raw(padMarkup(cfg))}
          <p class="corridor__hint" data-role="corridor-hint" role="status" aria-live="polite"></p>
        </div>
        <p class="corridor__tip">${cfg.padHint}</p>
        ${ui.raw(skipMarkup)}
        ${ui.raw(noteMarkup)}
      </div>
    `;
  }

  /* ==================== 五、挂载（页面只给一块容器 + 几个回调） ==================== */

  var KEY_DIRS = {
    arrowup: 'up',
    arrowdown: 'down',
    arrowleft: 'left',
    arrowright: 'right',
    w: 'up',
    a: 'left',
    s: 'down',
    d: 'right'
  };

  function render(host, options) {
    var opts = options || {};
    var cfg = opts.config || {};
    var holdMs = (cfg.timing && cfg.timing.successHoldMs) || 1800;
    var targetRoom = cfg.targetRoom || TARGET_ROOM;
    var start = opts.start || START;

    var cell = { col: start.col, row: start.row };
    var steps = 0;
    var delivered = false;
    var alive = true;

    ui.setHtml(host, shellMarkup(cfg, cellCenter(cell.col, cell.row)));
    var root = ui.$('[data-role="corridor"]', host) || host.firstElementChild;
    var actor = ui.$('[data-role="actor"]', root);
    var hintBox = ui.$('[data-role="corridor-hint"]', root);
    var flash = ui.$('[data-role="corridor-flash"]', root);
    var skipButton = ui.$('[data-action="corridor-skip"]', root);
    var moveButtons = Array.prototype.slice.call(ui.$$('[data-action="corridor-move"]', root) || []);

    /* 配置里的文案用 {room} 占位（房号只在配置里写一次，组件不写死 8011） */
    function copy(value) {
      return String(value === undefined || value === null ? '' : value).replace(/\{room\}/g, targetRoom);
    }

    /* 走错门时还要把「脚下是哪一间」写出来：{here} 是站在谁家门口（{room} 仍是任务要送的那间），
       所以提示永远是「这里是 8014 房门口，客人要的是 8011 房」这种实话。 */
    function withHere(value, here) {
      return copy(value).replace(/\{here\}/g, here || '');
    }

    function setHint(text) {
      if (hintBox) hintBox.textContent = text || '';
    }

    /* 位置写在 CSS transform 上（SVG 的 px 就是用户单位），位移由 CSS transition 过渡 */
    function paintActor() {
      if (!actor) return;
      var center = cellCenter(cell.col, cell.row);
      actor.style.transform = 'translate(' + center.x + 'px, ' + center.y + 'px)';
    }

    function getState() {
      var room = doorAt(cell.col, cell.row);
      return {
        col: cell.col,
        row: cell.row,
        steps: steps,
        room: room ? room.no : null,
        delivered: delivered
      };
    }

    /* 送到之后方向键与「跳过」都不再需要：禁掉它们，等页面换成「已送达」卡片 */
    function lockControls() {
      moveButtons.forEach(function (button) {
        button.disabled = true;
      });
      if (skipButton) skipButton.disabled = true;
    }

    /* 送达：成功反馈用和第六幕同一套「画面上的提示条」（CSS 动画，跑完自己消失） */
    function deliver(room) {
      delivered = true;
      if (root) root.setAttribute('data-phase', 'done');
      setHint(copy(cfg.success && cfg.success.title) + '（共走 ' + steps + ' 步）');
      if (flash) {
        flash.textContent = copy(cfg.success && cfg.success.title);
        flash.style.animationDuration = holdMs + 'ms'; /* 停留时长跟着 timing 配置走 */
        flash.className = 'corridor__flash is-on';
      }
      lockControls();
      if (typeof opts.onDeliver === 'function') {
        opts.onDeliver({ room: room.no, steps: steps, col: cell.col, row: cell.row });
      }
    }

    /* 走一格：只有「目标房门口」才算送达；别的房门口只提示一句，不扣分、不写失败 */
    function move(dir) {
      if (!alive || delivered) return { moved: false, delivered: delivered };
      var next = step(cell, dir);
      if (!next.moved) {
        setHint(copy(cfg.blockedHint));
        return { moved: false, blocked: next.blocked };
      }
      cell = { col: next.col, row: next.row };
      steps += 1;
      paintActor();
      var room = doorAt(cell.col, cell.row);
      if (room && room.no === targetRoom) {
        deliver(room);
      } else if (room) {
        setHint(withHere(cfg.doorHint, room.no));
        if (typeof opts.onDoor === 'function') opts.onDoor({ room: room.no, steps: steps });
      } else {
        setHint(copy(cfg.walkHint));
      }
      if (typeof opts.onMove === 'function') {
        opts.onMove({ dir: dir, col: cell.col, row: cell.row, steps: steps, room: room ? room.no : null });
      }
      return { moved: true, col: cell.col, row: cell.row, room: room ? room.no : null, delivered: delivered };
    }

    /* 键盘：方向键 / WASD（长按是浏览器自带的连发，这里不另起定时器）。
       只在这一幕还挂在页面上时响应 —— 换到别的页面后键盘不会再驱动小游戏。 */
    function onKeyDown(event) {
      if (!alive || !root || !document.body.contains(root)) return;
      var source = event.target || {};
      if (source.isContentEditable) return;
      var tag = String(source.tagName || '').toUpperCase();
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      var key = String(event.key || '').toLowerCase();
      var dir = KEY_DIRS[key];
      if (!dir) return;
      if (key.indexOf('arrow') === 0 && event.preventDefault) event.preventDefault(); /* 别把整页滚走 */
      move(dir);
    }

    ui.delegate(root, '[data-action="corridor-move"]', 'click', function (event, target) {
      move(target.getAttribute('data-dir'));
    });
    document.addEventListener('keydown', onKeyDown);

    setHint(copy(cfg.startHint));

    return {
      move: move,
      getState: getState,
      /* 页面换幕 / 重画之前必须调它：键盘监听只有这一处，停掉不留残留 */
      destroy: function () {
        if (!alive) return;
        alive = false;
        document.removeEventListener('keydown', onKeyDown);
      }
    };
  }

  HKR.components.corridorGame = {
    render: render,
    /* 地图与规则都是纯函数：自测直接调，不用起动画、不用点屏幕 */
    view: VIEW,
    cellSize: CELL,
    grid: GRID,
    rooms: ROOMS,
    start: START,
    target: TARGET,
    targetRoom: TARGET_ROOM,
    directions: DIR_NAMES,
    walkable: walkable,
    walk: walk,
    step: step,
    route: route,
    routeLength: routeLength,
    sameCell: sameCell,
    doorAt: doorAt,
    roomByNumber: roomByNumber,
    isTargetRoom: isTargetRoom
  };




})();
