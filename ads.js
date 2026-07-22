/* ---------------- ads.js — ads + remove-ads entitlement gating ----------------
 * Additive monetization layer. Entirely dormant unless MONETIZATION.enabled
 * is true AND ids are configured (monetization-config.js). Even then, every
 * ad decision is gated behind the no-ads entitlement:
 *   - cloudNoAds() — the Firestore-backed flag cached in localStorage
 *     (cloud.js); purchases set entitlements.noAds so "no ads" follows the
 *     signed-in account across web and mobile;
 *   - a local purchase cache (sy_noads) so the gate also works signed-out on
 *     the device where the purchase happened.
 *
 * Placement policy: interstitial-style breaks ONLY at natural pauses — after
 * a finished game when the player returns to the lobby — never mid-turn,
 * frequency-capped, and never before the player has finished a game.
 *
 * Platforms:
 *   - Native (Capacitor + AdMob plugin): used when window.Capacitor and the
 *     AdMob plugin are present (wired for real in Phase 6).
 *   - Web: AdSense script is lazy-loaded on first use; the break renders as
 *     an in-app overlay with the ad container (or a quiet house card if the
 *     network returns nothing), plus a "Remove ads" path.
 */
'use strict';

var ADS={
  configured:false,
  lastShown:0,
  gamesFinished:0,
  sdkRequested:false
};

function adsConfigured(){
  return typeof MONETIZATION==='object'&&MONETIZATION&&MONETIZATION.enabled===true&&
    ((MONETIZATION.web&&MONETIZATION.web.client&&MONETIZATION.web.client.indexOf('REPLACE_ME')!==0)||adsIsNative());
}
function adsIsNative(){
  return typeof window!=='undefined'&&window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform();
}
function adsRemoved(){ // the entitlement gate — checked before EVERY ad decision
  if(typeof cloudNoAds==='function'&&cloudNoAds())return true;
  try{ return localStorage.getItem('sy_noads')==='1'; }catch(e){ return false; }
}
function adsActive(){ return adsConfigured()&&!adsRemoved(); }

/* ---- the natural-break hook (wrapped around leaveToLobby below) ---- */
function adsGameBreak(){
  if(!adsActive())return false;
  if(ADS.gamesFinished<((MONETIZATION&&MONETIZATION.graceGames)||1))return false;
  var now=Date.now();
  if(now-ADS.lastShown<((MONETIZATION&&MONETIZATION.minSecondsBetweenAds)||180)*1000)return false;
  ADS.lastShown=now;
  if(adsIsNative())adsShowNativeInterstitial();
  else adsShowWebBreak();
  return true;
}

/* ---- native (Capacitor AdMob — plugin wired in Phase 6) ---- */
function adsShowNativeInterstitial(){
  try{
    var AdMob=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.AdMob;
    if(!AdMob)return;
    AdMob.prepareInterstitial({adId:MONETIZATION.admob.interstitialId})
      .then(function(){return AdMob.showInterstitial();})
      ['catch'](function(){/* no fill / not ready — skip silently */});
  }catch(e){}
}

/* ---- web (AdSense) ---- */
function adsEnsureWebSdk(cb){
  if(ADS.sdkRequested){cb();return;}
  ADS.sdkRequested=true;
  var s=document.createElement('script');
  s.async=true;
  s.src='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client='+encodeURIComponent(MONETIZATION.web.client);
  s.crossOrigin='anonymous';
  s.onload=cb;s.onerror=cb; // blocked/offline -> the break still renders (house card)
  document.head.appendChild(s);
}
function adsShowWebBreak(){
  var ov=document.getElementById('adBreak');
  if(!ov){
    ov=document.createElement('div');
    ov.id='adBreak';
    document.body.appendChild(ov);
  }
  ov.innerHTML=
    '<div class="adbreak-box">'+
      '<div class="adbreak-head">A word from our sponsors <span class="tiny muted">— keeps Shadow Line free</span></div>'+
      '<div class="adbreak-slot"><ins class="adsbygoogle" style="display:block;width:100%;height:100%"'+
        ' data-ad-client="'+MONETIZATION.web.client+'" data-ad-slot="'+MONETIZATION.web.slot+'"></ins>'+
        '<div class="adbreak-house">SHADOW LINE<br><span>hunt the phantom</span></div></div>'+
      '<div class="adbreak-row">'+
        '<button id="adRemoveBtn" class="btn">Remove ads — '+((MONETIZATION.iap&&MONETIZATION.iap.priceLabel)||'')+'</button>'+
        '<button id="adCloseBtn" class="ghostbtn" disabled>Continue (3)</button></div>'+
    '</div>';
  ov.hidden=false;
  adsEnsureWebSdk(function(){
    try{ (window.adsbygoogle=window.adsbygoogle||[]).push({}); }catch(e){}
  });
  // short unskippable window, then a real close button — never trap the player
  var left=3;
  var btn=document.getElementById('adCloseBtn');
  var iv=setInterval(function(){
    left--;
    if(left<=0){clearInterval(iv);btn.disabled=false;btn.textContent='Continue';}
    else btn.textContent='Continue ('+left+')';
  },1000);
  btn.onclick=function(){ if(!btn.disabled){ov.hidden=true;ov.innerHTML='';} };
  document.getElementById('adRemoveBtn').onclick=function(){ov.hidden=true;ov.innerHTML='';purchaseRemoveAds();};
}

/* ---- remove-ads purchase ----
 * Native: Play Billing / StoreKit via a Capacitor purchases plugin (Phase 6
 * wires the real plugin; the flow + entitlement writing are ready here).
 * Web: no web checkout is bundled yet — the dialog explains that the
 * purchase lives in the mobile app, and signing in syncs it to the web.
 * A successful purchase writes the entitlement locally AND to Firestore. */
function adsGrantNoAds(){
  try{ localStorage.setItem('sy_noads','1'); }catch(e){}
  if(typeof CLOUD!=='undefined'&&CLOUD.ready&&CLOUD.user&&typeof cloudPushDoc==='function'){
    cloudPushDoc({entitlements:{noAds:true}});
  }
  toast('Ads removed — thank you for supporting Shadow Line! ✨');
}
function purchaseRemoveAds(){
  if(adsRemoved()){toast('Ads are already removed on this account.');return;}
  var native=adsIsNative();
  var Purchases=native&&window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.Purchases;
  if(Purchases&&Purchases.purchaseProduct){
    Purchases.purchaseProduct({productIdentifier:MONETIZATION.iap.productId})
      .then(function(){adsGrantNoAds();})
      ['catch'](function(){toast('Purchase cancelled.');});
    return;
  }
  showModal('<h2>Remove ads</h2>'+
    '<p class="muted">A one-time purchase ('+((MONETIZATION.iap&&MONETIZATION.iap.priceLabel)||'')+') removes all ads forever. '+
    (typeof CLOUD!=='undefined'&&CLOUD.user?'It\'s tied to your Google account, so it follows you across devices.':'Sign in with Google first so the purchase follows you across devices.')+'</p>'+
    '<p class="muted tiny">Purchasing is available in the Shadow Line mobile app; the web version unlocks automatically once you\'re signed in with the same account.</p>'+
    '<button class="btn" id="mAdsOk">OK</button>');
  var ok=document.getElementById('mAdsOk');
  if(ok)ok.onclick=hideModal;
}

/* ---- wiring: count finished games + hook the lobby return ---- */
(function(){
  if(typeof historyRecord==='function'){
    var baseHr=historyRecord;
    historyRecord=function(entry){ baseHr(entry); ADS.gamesFinished++; };
  }
  if(typeof leaveToLobby==='function'){
    var baseLeave=leaveToLobby;
    leaveToLobby=function(){
      var hadGame=typeof G!=='undefined'&&G&&G.winner; // only after a FINISHED game
      baseLeave();
      if(hadGame)adsGameBreak();
    };
  }
  ADS.configured=adsConfigured();
})();
