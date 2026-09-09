/* 三線 練習帳 — オフライン用の Service Worker
 *
 * index.html 単体でも（file:// で開いても）アプリは動く。
 * この Service Worker は http(s) で配信したときだけ登録され、オフラインで開けるようにする。
 * 更新を取りこぼさないよう、ネットワーク優先・失敗時にキャッシュという順にしている。
 */
"use strict";

var CACHE = "sanshin-trainer-v1";
var ASSETS = ["./", "./index.html", "./manifest.webmanifest"];

self.addEventListener("install", function(e){
  e.waitUntil(
    caches.open(CACHE)
      .then(function(c){ return c.addAll(ASSETS); })
      .catch(function(){})              // 1 つでも取れなければ諦める（登録は成功させる）
      .then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){
        return (k === CACHE) ? null : caches.delete(k);
      }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(e){
  var req = e.request;
  if (req.method !== "GET") return;

  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;   // 外部リソースは扱わない

  e.respondWith(
    fetch(req).then(function(res){
      if (res && res.ok && res.type === "basic") {
        var copy = res.clone();
        caches.open(CACHE).then(function(c){ c.put(req, copy); }).catch(function(){});
      }
      return res;
    }).catch(function(){
      return caches.match(req).then(function(hit){
        if (hit) return hit;
        // ページ遷移はトップに落とす（単一ページなのでこれで足りる）
        if (req.mode === "navigate") return caches.match("./index.html");
        return Response.error();
      });
    })
  );
});
