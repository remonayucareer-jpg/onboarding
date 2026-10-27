# 华客 AI 客服 · 一线员工预习 H5

纯静态页面（零依赖、无构建），直接放在 GitHub Pages / 对象存储上就能跑。

## 目录

```
index.html        入口（hash 路由：#/roles → #/frontline-identity → … → #/frontline-quiz）
css/              样式
src/              配置、核心逻辑、组件、页面
assets/           图片、二维码、音频（assets/audio/，由 tools/gen-audio.py 生成）
.nojekyll         关掉 GitHub Pages 的 Jekyll 处理
```

## 页面流程

```
角色入口（管理员暂未开放）
  └─ 一线人员 → 登记页（酒店 + 姓名）
       └─ 准备页 → 11 个学习画面 → 测试说明页 → 课后测试（一屏一题，答对 2 题即通过）
```

- 测试答对 2 题就结束，结果页**没有「再看一遍」按钮**，不会绕回开头；
  9 题答完还没到 2 题正确会**换一轮接着问**（题号继续往下数，正确的题数保留）。
- **断点续答**：页面状态存在本机 `localStorage`（`features.resetRecordsOnOpen: false`）。
  中途退出后再点链接，会**自动回到上次停的那一页**，并弹一句「接着上次继续」。
  注意：只在**同一台手机、同一个浏览器**里有效；清微信缓存、换手机都会丢（没有账号体系）。

## 数据上报（登记信息 → workbuddy 中转 → 飞书表格）

配置在 `src/config/app.config.js` 的 `api` 块：

| 配置项 | 现在的值 | 说明 |
| --- | --- | --- |
| `enabled` | `true` | 总开关 |
| `identityEndpoint` | `https://hkr-training-relay.app.workbuddy.host/api/frontline/identity?sharecode=Y5UUYIKLC2` | 登记信息上报地址 |
| `resultEndpoint` | `https://hkr-training-relay.app.workbuddy.host/api/frontline/result?sharecode=Y5UUYIKLC2` | 交卷成绩上报地址 |
| `contentType` | `application/json;charset=UTF-8` | 正常通道的请求头 |
| `fallbackNoCors` | `true` | 中转没开 CORS 时，自动改用 `text/plain` + `no-cors` 再发一次 |

**登记**（她点「开始预习」时发一次）：

```json
{
  "schema": 1,
  "kind": "identity",
  "source": "frontline-h5",
  "sent_at": "2026-10-27T10:30:00.000Z",
  "hotel": "2.0演示酒店",
  "name": "王芳",
  "saved_at": "2026-10-27T10:30:00.000Z"
}
```

**成绩**（答对 2 题、页面切到「测试完成」时发一次，本机打标记，刷新不重发）：

```json
{
  "kind": "result",
  "hotel": "2.0演示酒店",
  "name": "王芳",
  "accuracy": 0.667,
  "accuracy_text": "67%"
}
```

### 正确率怎么算

**正确率 = 答对数 ÷ 作答次数**（一次作答 = 点一次选项，不管对错；通过时答对数 = 2）。

| 过程 | 作答 | 正确率 |
| --- | --- | --- |
| 对、对 | 2 | 100% |
| 错、对、对 | 3 | 67% |
| 错、错、错、对、错、对 | 6 | 33% |

9 题答完还没凑够 2 题正确会**换一轮接着问**，答对数保留、作答次数继续累加 —— 所以正确率会被拉低，
反映的是「她花了多少次才凑够」。计算在页面里完成，表里直接接 `accuracy`（0~1）或 `accuracy_text`（67%）。

### 两个需要注意的点

1. **配置路径**：配置实际挂在 `HKR.config.app` 下，所以接口地址在 `HKR.config.app.api`。
   `src/core/report.js` 早期按 `HKR.config.api` 读，路径不一致会导致「填了地址也不发」。
   现在两处都修了：`app.config.js` 末尾补了 `HKR.config.api = HKR.config.app.api;` 别名，
   `report.js` 也同时兼容两种路径。

2. **跨域（CORS）**：浏览器直连该中转时，`application/json` 会触发预检，中转目前没有返回
   `Access-Control-Allow-Origin`，预检失败 → POST 根本不会发出。
   所以客户端加了兜底：改用 `text/plain` + `no-cors`（简单请求，不预检），服务端已验证接受这种请求。
   代价是**读不到回执**，只能按「已发出」处理。
   **彻底的解法是让中转加一行 CORS 头**（`Access-Control-Allow-Origin: *` 并处理 `OPTIONS`），
   之后会自动走回正常通道，能拿到 200 和 `record_id`。

### 排错

- 页面上**不会**因为上报失败弹任何提示（不打断学习）。
- 失败时会写进浏览器控制台：`[report] identity 上报失败…`。
- 失败的记录存在 `localStorage` 的 `hkr.report.queue.v1`，下次打开页面自动补发（最多留 60 条）。

## 讲解录音

- 每屏喇叭按钮播放 `assets/audio/fl-XX.mp3`；屏 4 的三个字段另有分步录音 `fl-04-1/2/3.mp3`，
  点一个框播对应那一句（配置在 `frontline.config.js` 每屏的 `audioSrc`，分步的在 `steps[].audioSrc`）。
- **台词台账是 `frontline.config.js` 的 `script` 字段**；改台词时：
  1. 改 `frontline.config.js` 里的 `script`（和 `steps[].hint`）；
  2. 同步改 `tools/gen-audio.py` 的 `LINES`（语音引擎按它生成）；
  3. 跑 `python tools/gen-audio.py`，同名覆盖，提交即可。
- 音色 / 语速在 `tools/gen-audio.py` 顶部的 `VOICE` / `RATE`，按 5% 一档调。
- 屏 4 特殊流程：第三个框点完**不再直接跳下一屏**——留在本屏把分步录音放完，
  底部说明变成「三个都看完了，接着去领取」，点手机继续。
- 上线前注意：当前音色来自免费在线服务，**对外发布需确认商用授权**（或换有授权的音色重新生成）。

## 发布

把 `index.html`、`.nojekyll`、`css/`、`src/`、`assets/` 传到仓库根目录，
Settings → Pages → Deploy from a branch → `main` / `(root)`，
地址为 `https://<用户名>.github.io/<仓库名>/`。

> 微信内置浏览器缓存很积极：改了内容后如果看不到新版，在地址后加个 `?v=日期` 再打开。
