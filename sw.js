// Bump this on every deploy so old caches get cleared out.
var CACHE_VERSION = 'sy-v3';
var CORE_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './engine.js',
  './bots.js',
  './map.js',
  './history.js',
  './persistence.js',
  './intro.js',
  './ui.js',
  './tutorial.js',
  './ambience.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];
// The recorded title theme is optional — the intro falls back to its
// procedural engine when it's absent. cache.addAll() rejects the whole
// install on any single 404, so these are cached best-effort instead of
// being required like CORE_ASSETS.
var OPTIONAL_ASSETS = [
  './audio/theme.ogg',
  './audio/theme.mp3'
];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE_VERSION).then(function(cache){
      return cache.addAll(CORE_ASSETS).then(function(){
        return Promise.all(OPTIONAL_ASSETS.map(function(url){
          return cache.add(url).catch(function(){/* not present in this deploy — fine */});
        }));
      });
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k!==CACHE_VERSION; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

// Cache-first for our own static assets (this is a local-play offline cache —
// online multiplayer still needs a live network connection to reach peers).
self.addEventListener('fetch', function(e){
  if(e.request.method!=='GET')return;
  var url=new URL(e.request.url);
  if(url.origin!==self.location.origin)return;
  e.respondWith(
    caches.match(e.request).then(function(cached){
      if(cached)return cached;
      return fetch(e.request).then(function(res){
        if(res && res.ok){
          var copy=res.clone();
          caches.open(CACHE_VERSION).then(function(cache){ cache.put(e.request, copy); });
        }
        return res;
      }).catch(function(){
        if(e.request.mode==='navigate')return caches.match('./index.html');
      });
    })
  );
});
