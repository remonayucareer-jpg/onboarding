/* 上报通道（一线员工）：登记信息 / 交卷结果 各一条记录。
 *
 * 现在的状态：`app.config.js` 里 `api.enabled = false`，所以下面全是空跑——
 * 页面照常运行，数据只留在本机。等后端（或中转层）给了地址，把
 * `api.identityEndpoint` / `api.resultEndpoint` 填上、`enabled` 改 true 就通了。
 *
 * 三条规矩：
 *   1. 永远不挡流程：发失败只进本地队列，页面该怎么走还怎么走；
 *   2. 失败要能补发：每次打开页面会 flush 一次队列；
 *   3. 请求里只带必要字段：酒店、姓名、成绩、错题明细。
 */
window.HKR = window.HKR || {};
HKR.core = HKR.core || {};

(function () {
  var QUEUE_KEY = 'hkr.report.queue.v1';
  var MAX_QUEUE = 60;

  /* 配置在 app.config.js 里挂在 HKR.config.app.api；app.config.js 末尾也会补一个 HKR.config.api 别名。
   * 这里两种都读，避免哪天别名被删掉就静默不发。 */
  function apiConfig() {
    var cfg = HKR.config || {};
    return cfg.api || (cfg.app && cfg.app.api) || {};
  }

  function readQueue() {
    try {
      var raw = window.localStorage.getItem(QUEUE_KEY);
      var list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (error) {
      return [];
    }
  }

  function writeQueue(list) {
    try {
      window.localStorage.setItem(QUEUE_KEY, JSON.stringify(list.slice(-MAX_QUEUE)));
    } catch (error) {
      /* 存不进去就算了，不能影响她做题 */
    }
  }

  function post(url, data) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', url, true);
      xhr.setRequestHeader('Content-Type', apiConfig().contentType || 'application/json;charset=UTF-8');
      var headers = apiConfig().headers || {};
      Object.keys(headers).forEach(function (key) {
        xhr.setRequestHeader(key, headers[key]);
      });
      xhr.timeout = apiConfig().timeoutMs || 8000;
      xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) resolve({ sent: true, status: xhr.status });
        else reject(new Error('HTTP ' + xhr.status));
      };
      xhr.onerror = function () {
        reject(new Error('network'));
      };
      xhr.ontimeout = function () {
        reject(new Error('timeout'));
      };
      xhr.send(JSON.stringify(data));
    });
  }

  function enqueue(url, data) {
    var list = readQueue();
    list.push({ url: url, data: data, at: new Date().toISOString() });
    writeQueue(list);
  }

  /* 兜底通道：中转接口没开 CORS 时，浏览器会在「预检」这一步就拦掉（POST 根本没发出去）。
   * 用 text/plain + no-cors 发就是「简单请求」，不触发预检——服务端照样能收到（已验证：
   * 这个中转同时接受 application/json 和 text/plain）。
   * 代价：这是"发了就不管"，读不到返回值，所以只能记为已发送（不重试、不入队）。
   * 等中转那边把 Access-Control-Allow-Origin 加上，会自然走回上面的正常通道，能拿到 200。 */
  function postOpaque(url, data) {
    var payload = JSON.stringify(data);
    if (window.fetch) {
      return window
        .fetch(url, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
          body: payload
        })
        .then(function () {
          return { sent: true, status: 0, opaque: true };
        });
    }
    /* 很老的浏览器没有 fetch：用 XHR 发 text/plain，请求能出去，但读不到回执 */
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', url, true);
      xhr.setRequestHeader('Content-Type', 'text/plain;charset=UTF-8');
      xhr.timeout = apiConfig().timeoutMs || 8000;
      xhr.onload = function () {
        resolve({ sent: true, status: xhr.status, opaque: true });
      };
      xhr.onerror = function () {
        resolve({ sent: true, status: 0, opaque: true });
      };
      xhr.ontimeout = function () {
        reject(new Error('timeout'));
      };
      xhr.send(payload);
    });
  }

  /* 统一出口：kind 决定用哪个地址；没配置就空跑 */
  function send(kind, payload) {
    var cfg = apiConfig();
    var url = kind === 'identity' ? cfg.identityEndpoint : cfg.resultEndpoint;
    var data = {
      schema: 1,
      kind: kind,
      source: 'frontline-h5',
      sent_at: new Date().toISOString()
    };
    Object.keys(payload || {}).forEach(function (key) {
      data[key] = payload[key];
    });

    if (!cfg.enabled || !url) {
      return Promise.resolve({ sent: false, reason: 'api_disabled' });
    }
    return post(url, data).catch(function (error) {
      /* 正常通道失败（多半是跨域预检被拦）：先走"无预检"兜底，服务端认 text/plain */
      if (cfg.fallbackNoCors !== false) {
        return postOpaque(url, data).catch(function (fallbackError) {
          enqueue(url, data);
          if (window.console && console.warn) {
            console.warn('[report] ' + kind + ' 上报失败，已存本机队列稍后重试：', fallbackError.message, url);
          }
          return { sent: false, reason: fallbackError.message };
        });
      }
      enqueue(url, data);
      /* 现场排查用：控制台能看到「发不出去」，但页面上不弹任何东西 */
      if (window.console && console.warn) {
        console.warn('[report] ' + kind + ' 上报失败，已存本机队列稍后重试：', error.message, url);
      }
      return { sent: false, reason: error.message };
    });
  }

  /* 补发队列（页面打开时跑一次） */
  function flush() {
    var cfg = apiConfig();
    if (!cfg.enabled) return Promise.resolve({ sent: 0 });
    var list = readQueue();
    if (!list.length) return Promise.resolve({ sent: 0 });

    var sent = 0;
    var rest = [];
    return list
      .reduce(function (chain, item) {
        return chain.then(function () {
          return post(item.url, item.data).then(
            function () {
              sent += 1;
            },
            function () {
              rest.push(item);
            }
          );
        });
      }, Promise.resolve())
      .then(function () {
        writeQueue(rest);
        return { sent: sent, left: rest.length };
      });
  }

  function flushLater() {
    window.setTimeout(function () {
      flush().catch(function () {
        /* 忽略 */
      });
    }, 1200);
  }

  if (document.readyState === 'complete') flushLater();
  else window.addEventListener('load', flushLater);

  HKR.core.report = {
    send: send,
    flush: flush,
    /* 登记信息：她点「开始预习」时发一条 */
    identity: function (identity) {
      return send('identity', {
        hotel: identity.hotel,
        name: identity.name,
        saved_at: identity.savedAt ? new Date(identity.savedAt).toISOString() : null
      });
    },
    /* 交卷结果：测试完成时发一条（酒店/姓名也带上，一条记录自成一体） */
    result: function (payload) {
      return send('result', payload);
    },
    queueSize: function () {
      return readQueue().length;
    }
  };
})();
