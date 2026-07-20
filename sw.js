// Bump this on every deploy so old caches get cleared out.
var CACHE_VERSION = 'sy-v6';
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
  './sound.js',
  './enhancements.js',
  './ui.js',
  './tutorial.js',
  './ambience.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE_VERSION).then(function(cache){ return cache.addAll(CORE_ASSETS); })
      .then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k!==CACHE_VERSION; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  if(e.request.method!=='GET')return;
  var url=new URL(e.request.url);
  if(url.origin!==self.location.origin)return;

  // Intro/how-to-play videos: deliberately NOT in CORE_ASSETS (multi-MB —
  // precaching them would bloat install and delay first paint). Network
  // first so players always get the current file when online, caching each
  // successful response as we go so a later offline visit still has it.
  if(url.pathname.indexOf('/video/')!==-1){
    e.respondWith(
      fetch(e.request).then(function(res){
        if(res && res.ok){
          var copy=res.clone();
          // Multi-MB writes are slow enough that the worker can be torn
          // down before an un-awaited cache.put() finishes — waitUntil()
          // keeps it alive until the write actually completes.
          e.waitUntil(caches.open(CACHE_VERSION).then(function(cache){ return cache.put(e.request, copy); }));
        }
        return res;
      }).catch(function(){ return caches.match(e.request); })
    );
    return;
  }

  // Cache-first for our own static assets (this is a local-play offline cache —
  // online multiplayer still needs a live network connection to reach peers).
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
