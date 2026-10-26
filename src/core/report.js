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

  function apiConfig() {
    return (HKR.config && HKR.config.api) || {};
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
      xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
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
      enqueue(url, data);
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
