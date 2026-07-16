/* ==========================================================================
   Intro video + How-to-Play video.
   --------------------------------------------------------------------------
   Two independent, self-contained video-overlay modules that share a tiny
   timer/listener lifecycle helper:

   1. The cold-open intro: black → existing "tap to begin" gate → plays
      video/Game_intro.mp4 fullscreen (with sound, muted to match the header
      toggle) → on end or skip, crossfades into the existing lobby screen,
      which already serves as the game's main menu. Runs once at boot.
      Exposes the same three globals ui.js's boot() already depends on:
        startIntro(onDone)   — run the sequence, call onDone() once the
                                lobby should be revealed
        introSetMuted(bool)  — mirror of the header's sound toggle
        introTeardown()      — idempotent full teardown
      Plus one more, used by the phone rotate-lock overlay (ui.js):
        introSetPaused(bool) — pause/resume the intro video without tearing
                                it down, e.g. while the device is in portrait

   2. The "How to Play" overlay: opened on demand from the lobby, plays
      video/Game_working.mp4. The video is never fetched until the button
      is first clicked, and is fully torn down (paused, src cleared) on
      close so nothing lingers into gameplay.
      Exposes: showHowToVideo()

   Neither module touches ui.js's game logic, and neither creates an
   AudioContext — video audio plays through the browser's native media
   pipeline, muted/unmuted via the standard HTMLMediaElement.muted property.
   ========================================================================== */
(function(){
  'use strict';

  function makeLifecycle(){
    var timers=[],domListeners=[];
    return {
      addT:function(fn,ms){var id=setTimeout(fn,Math.max(0,ms));timers.push(id);return id;},
      clearTimers:function(){timers.forEach(clearTimeout);timers=[];},
      on:function(target,type,fn,opts){if(!target)return;target.addEventListener(type,fn,opts);domListeners.push({target:target,type:type,fn:fn,opts:opts});},
      offAll:function(){domListeners.forEach(function(l){try{l.target.removeEventListener(l.type,l.fn,l.opts);}catch(e){}});domListeners=[];}
    };
  }

  function safePlay(video){
    if(!video)return;
    try{
      var p=video.play();
      if(p&&p.catch)p.catch(function(){/* blocked/interrupted — the skip control still works */});
    }catch(e){}
  }
  function safePause(video){
    if(!video)return;
    try{video.pause();}catch(e){}
  }
  function releaseVideo(video){
    if(!video)return;
    try{video.pause();}catch(e){}
    // removeAttribute (not src='', which resolves to the page's own URL and
    // leaves the element in a spurious MEDIA_ERR_SRC_NOT_SUPPORTED state) is
    // what actually drops the media resource cleanly; .load() then makes
    // the element release any buffered data/decoder state (networkState
    // goes to EMPTY with no lingering error).
    try{video.removeAttribute('src');video.load();}catch(e){}
  }

  /* ==========================================================================
     INTRO VIDEO
     ========================================================================== */
  (function(){
    var root=document.getElementById('screen-intro');
    if(!root){
      window.startIntro=function(onDone){onDone&&onDone();};
      window.introSetMuted=function(){};
      window.introTeardown=function(){};
      window.introSetPaused=function(){};
      return;
    }

    var video=document.getElementById('introVideo');
    var gateEl=document.getElementById('introGateTxt');
    var skipEl=document.getElementById('introSkipTxt');
    var catcher=document.getElementById('introCatcher');

    var reduced=false;
    try{reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;}catch(e){}

    var phase='idle'; // idle -> gate -> playing -> resolving -> done
    var life=makeLifecycle();
    var doneCb=null;
    var tornDown=false;
    var pausedForRotate=false;
    var videoErrored=false; // set if the file fails during the gate-phase preload, before any gesture

    function beginGesture(){
      if(phase!=='gate')return;
      phase='playing';
      if(gateEl)gateEl.classList.add('hide');
      life.addT(function(){if(gateEl)gateEl.hidden=true;},500);
      if(videoErrored){
        // Already known broken (bad file/network) before the user even
        // tapped — nothing to play, so continue straight on instead of
        // sitting on a dead frame with only the skip control to save it.
        resolveToMenu(true);
        return;
      }
      if(video){
        video.muted=!(typeof UI!=='undefined'&&UI.soundOn);
        video.classList.add('on');
        safePlay(video);
      }
      life.addT(function(){if(skipEl){skipEl.hidden=false;skipEl.classList.add('on');}},400);
    }

    function resolveToMenu(fast){
      if(phase==='resolving'||phase==='done')return;
      phase='resolving';
      var fadeMs=fast?400:700;
      safePause(video);
      if(video){video.style.transition='opacity '+fadeMs+'ms ease';video.style.opacity='0';}
      if(skipEl)skipEl.classList.remove('on');
      var hdr=document.getElementById('hdr'),lobby=document.getElementById('screen-lobby');
      if(hdr){hdr.hidden=false;hdr.style.opacity='0';hdr.style.transition='opacity '+fadeMs+'ms ease';life.addT(function(){hdr.style.opacity='1';},20);}
      if(lobby){lobby.hidden=false;lobby.style.opacity='0';lobby.style.transition='opacity '+fadeMs+'ms ease';life.addT(function(){lobby.style.opacity='1';},20);}
      life.addT(function(){
        if(hdr){hdr.style.transition='';hdr.style.opacity='';}
        if(lobby){lobby.style.transition='';lobby.style.opacity='';}
        finishTeardown();
      },fadeMs+300);
    }

    function finishTeardown(){
      phase='done';
      releaseVideo(video);
      life.offAll();
      life.clearTimers();
      if(root){root.classList.add('introGone');root.hidden=true;}
      var cb=doneCb;doneCb=null;
      tornDown=true;
      if(cb)cb();
    }

    function onSkipOrBegin(){
      if(phase==='gate'){beginGesture();return;}
      if(phase==='playing'){resolveToMenu(true);}
    }

    function startIntro(onDone){
      if(tornDown){onDone&&onDone();return;} // defensive: never re-enter after teardown
      doneCb=onDone;

      if(reduced){
        // There's no calmer variant of a fixed video to fall back to —
        // reduced motion skips straight to the menu instead.
        if(root)root.hidden=false;
        phase='playing';
        resolveToMenu(true);
        return;
      }

      if(root){root.hidden=false;root.classList.remove('introGone');}
      if(video){
        // Faststart + ~2.7MB — preload during the black/gate phase so
        // playback starts promptly the moment the gesture lands.
        try{video.src='video/Game_intro.mp4';video.preload='auto';video.load();}catch(e){}
      }
      phase='gate';
      life.on(catcher,'pointerdown',function(ev){ev.preventDefault();onSkipOrBegin();},{passive:false});
      life.on(document,'keydown',function(ev){if(ev.key==='Tab')return;onSkipOrBegin();});
      life.on(video,'ended',function(){resolveToMenu(false);});
      // A genuinely broken/corrupt file (network failure, bad codec) should
      // never strand the player: if the error lands during preload (before
      // the gesture), beginGesture() skips playback and continues straight
      // through on tap; if it lands mid-playback, resolve immediately.
      life.on(video,'error',function(){
        videoErrored=true;
        if(phase==='playing')resolveToMenu(true);
      });
    }

    function introSetMuted(muted){
      if(video)video.muted=muted;
    }

    // Used by the phone rotate-lock overlay (ui.js) — pause without tearing
    // down while the device is in portrait, resume when it isn't.
    function introSetPaused(paused){
      if(!video||phase!=='playing')return;
      if(paused){
        if(!video.paused){pausedForRotate=true;safePause(video);}
      }else if(pausedForRotate){
        pausedForRotate=false;
        safePlay(video);
      }
    }

    window.startIntro=startIntro;
    window.introSetMuted=introSetMuted;
    window.introTeardown=function(){if(phase!=='done')finishTeardown();};
    window.introSetPaused=introSetPaused;
  })();

  /* ==========================================================================
     HOW-TO-PLAY VIDEO OVERLAY
     ========================================================================== */
  (function(){
    var overlay=document.getElementById('howtoOverlay');
    if(!overlay){window.showHowToVideo=function(){};window.introHowtoSetPaused=function(){};return;}

    var video=document.getElementById('howtoVideo');
    var catcher=document.getElementById('howtoCatcher');

    var open=false;
    var loaded=false;
    var pausedForRotate=false;
    var life=null;

    function close(){
      if(!open)return;
      open=false;
      safePause(video);
      overlay.classList.remove('on');
      var l=life;
      life=null;
      (l||makeLifecycle()).addT(function(){
        releaseVideo(video);
        loaded=false;
        overlay.hidden=true;
        if(l){l.offAll();l.clearTimers();}
      },320);
    }

    function openHowto(){
      if(open)return;
      open=true;
      life=makeLifecycle();
      overlay.hidden=false;
      void overlay.offsetWidth; // force a layout flush so the opacity transition below actually runs
      overlay.classList.add('on');
      if(video){
        if(!loaded){
          // close() always resets `loaded` to false, so every open here is
          // a fresh load that already starts at time 0 — no explicit
          // currentTime reset needed (and setting it before any metadata
          // exists is asking for trouble on some media pipelines).
          video.src='video/Game_working.mp4';
          video.load();
          loaded=true;
        }
        video.muted=!(typeof UI!=='undefined'&&UI.soundOn);
        safePlay(video);
      }
      life.on(catcher,'pointerdown',function(ev){ev.preventDefault();close();},{passive:false});
      life.on(document,'keydown',function(ev){if(ev.key==='Tab')return;close();});
      life.on(video,'ended',function(){close();});
      life.on(video,'error',function(){close();});
    }

    // Used by the phone rotate-lock overlay (ui.js), same contract as
    // introSetPaused above.
    function setPaused(paused){
      if(!video||!open)return;
      if(paused){
        if(!video.paused){pausedForRotate=true;safePause(video);}
      }else if(pausedForRotate){
        pausedForRotate=false;
        safePlay(video);
      }
    }

    window.showHowToVideo=openHowto;
    window.introHowtoSetPaused=setPaused;
  })();
})();
