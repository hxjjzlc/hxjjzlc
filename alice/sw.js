// 爱丽丝语 · 无后端 JSON API（Service Worker 版）
// ---------------------------------------------------------------------------
// 作用：在浏览器里把 /alice/api 变成一个真正返回 application/json 的接口。
//   GET  /alice/api?text=你好&mode=to&pretty=1
//   POST /alice/api   body: {"text":"你好","mode":"to"}
// 没有 text/q 参数时，GET 会返回一份自描述信息（接口说明 + 版本 + 用法）。
//
// 安全边界：只接管「同源 + 路径恰为 /alice/api」的请求；其余请求一律不调用
// respondWith，直接走网络，因此对本站其它页面零影响。
// 卸载：在浏览器开发者工具 → Application → Service Workers 里 Unregister 即可。
// ---------------------------------------------------------------------------

var API_PATHS = { "/alice/api": 1, "/alice/api/": 1 };

importScripts("alice-core.js");   // 相对 sw.js 自身位置解析；挂载 self.AliceTranslate

self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (event) { event.waitUntil(self.clients.claim()); });

self.addEventListener("fetch", function (event) {
  var req = event.request;
  var u;
  try { u = new URL(req.url); } catch (e) { return; }               // 异常一律透传
  if (u.origin !== self.location.origin) return;                    // 只管同源
  if (!Object.prototype.hasOwnProperty.call(API_PATHS, u.pathname)) return;

  event.respondWith(handle(req, u));
});

function json(obj, status, pretty) {
  return new Response(pretty === undefined || pretty ? JSON.stringify(obj, null, 2) : JSON.stringify(obj), {
    status: status || 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function respond(text, mode, pretty) {
  try {
    var p = self.AliceTranslate.translate(text, mode);
    return json(p, 200, pretty);
  } catch (e) {
    return json({ ok: false, api: "alice-translator", error: String((e && e.message) || e) }, 500, pretty);
  }
}

function usage(mode, pretty) {
  return json({
    ok: true,
    api: "alice-translator",
    version: self.AliceTranslate.version,
    description: "把正常文字按 UTF-8 编码后用 Shift-JIS(cp932) 强行解码，得到伪日语乱码；反向可还原（有损）。",
    endpoints: {
      "GET /alice/api": "?text=<文字>&mode=to|from&pretty=0|1",
      "POST /alice/api": '{"text":"<文字>","mode":"to|from"}'
    },
    example: "/alice/api?text=" + encodeURIComponent("你好") + "&mode=to",
    default_mode: mode
  }, 200, pretty);
}

function handle(req, u) {
  var q = u.searchParams;
  var pretty = q.get("pretty") !== "0";
  var mode = q.get("mode") || q.get("dir") || "to";

  if (req.method === "POST") {
    return req.text().then(function (body) {
      var data = null;
      try { data = JSON.parse(body || "{}"); } catch (e) { data = null; }
      if (data === null) return json({ ok: false, error: "请求体不是合法 JSON" }, 400, pretty);
      var text = (data && typeof data.text === "string") ? data.text
               : (data && typeof data.input === "string") ? data.input : "";
      return respond(text, (data && data.mode) || mode, pretty);
    }, function () {
      return json({ ok: false, error: "读取请求体失败" }, 400, pretty);
    });
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    return Promise.resolve(json({ ok: false, error: "只支持 GET / POST" }, 405, pretty));
  }

  var text = q.has("text") ? q.get("text") : (q.has("q") ? q.get("q") : null);
  if (text === null) return Promise.resolve(usage(mode, pretty));   // 自描述
  return Promise.resolve(respond(text, mode, pretty));
}
