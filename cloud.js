/* ---------------- optional cloud layer: Google sign-in + cross-device sync ----
 * Everything here is additive. The game is fully playable signed-out and
 * offline; this layer only lights up when BOTH are true:
 *   - firebase-config.js carries a real config (no "REPLACE_ME" apiKey), and
 *   - the Firebase compat SDK loads from the CDN (it is fetched lazily,
 *     with an onerror fallback, so offline/PWA/CI use is never blocked).
 *
 * What syncs, per signed-in user (Firestore doc `users/{uid}`):
 *   - profile display name (the lobby "Your name" field),
 *   - game history (capped, WITHOUT per-move replay logs — replays stay
 *     device-local; the cloud copy is the win/loss record),
 *   - achievements fall out of history automatically (they are derived),
 *   - entitlements.noAds — the Phase 5 remove-ads flag. Reads are cached in
 *     localStorage so the ad gate can check it synchronously at boot.
 *
 * Merge model: local-first. On sign-in (and on every remote snapshot) the
 * cloud and local histories are unioned by a content key, newest first,
 * capped — so two devices converge without ever losing local games.
 */
var CLOUD={
  enabled:false,   // config present
  ready:false,     // SDK loaded + initialized
  user:null,       // {uid,name,photo}
  unsub:null,      // firestore listener
  syncing:false
};
var CLOUD_NOADS_KEY='sy_noads';
var CLOUD_HISTORY_CLOUD_CAP=100;

function cloudConfigured(){
  return typeof FIREBASE_CONFIG==='object'&&FIREBASE_CONFIG&&
    typeof FIREBASE_CONFIG.apiKey==='string'&&FIREBASE_CONFIG.apiKey.indexOf('REPLACE_ME')!==0;
}
function cloudNoAds(){ // synchronous gate for the (Phase 5) ad layer
  try{ return localStorage.getItem(CLOUD_NOADS_KEY)==='1'; }catch(e){ return false; }
}

/* ---- pure helpers (unit-tested headlessly) ---- */
function cloudHistoryKey(e){ return [e.date,e.role,e.result,e.round,e.mode||''].join('|'); }
function cloudStripEntry(e){ // cloud copies drop the heavyweight replay log
  var c={}; for(var k in e)if(k!=='moveLog')c[k]=e[k]; return c;
}
function cloudMergeHistories(localArr,remoteArr){
  var seen={},out=[];
  (localArr||[]).concat(remoteArr||[]).forEach(function(e){
    if(!e||typeof e.date!=='number')return;
    var k=cloudHistoryKey(e);
    if(seen[k]){ if(e.moveLog&&!seen[k].moveLog)seen[k].moveLog=e.moveLog; return; }
    var c={}; for(var f in e)c[f]=e[f];
    seen[k]=c; out.push(c);
  });
  out.sort(function(a,b){return b.date-a.date;});
  return out;
}

/* ---- lazy SDK load ---- */
function cloudLoadSdk(cb){
  if(window.firebase&&firebase.auth&&firebase.firestore){cb(true);return;}
  var base='https://www.gstatic.com/firebasejs/'+FIREBASE_SDK_VERSION+'/';
  var files=['firebase-app-compat.js','firebase-auth-compat.js','firebase-firestore-compat.js'];
  var i=0;
  (function next(){
    if(i>=files.length){cb(!!(window.firebase&&firebase.auth&&firebase.firestore));return;}
    var s=document.createElement('script');
    s.src=base+files[i++];
    s.onload=next;
    s.onerror=function(){cb(false);}; // offline / blocked — stay dormant
    document.head.appendChild(s);
  })();
}

function cloudInit(){
  if(!cloudConfigured())return;
  CLOUD.enabled=true;
  cloudRenderAccount(); // show the "connecting" state immediately
  cloudLoadSdk(function(ok){
    if(!ok){CLOUD.enabled=false;cloudRenderAccount();return;}
    try{
      firebase.initializeApp(FIREBASE_CONFIG);
      CLOUD.ready=true;
      firebase.auth().onAuthStateChanged(function(u){ cloudAuthChanged(u); });
    }catch(e){ CLOUD.enabled=false; }
    cloudRenderAccount();
  });
}

/* ---- auth ---- */
function cloudSignIn(){
  if(!CLOUD.ready)return;
  var provider=new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithPopup(provider)['catch'](function(){
    // popup blockers / iOS standalone PWAs: fall back to a full redirect
    try{ firebase.auth().signInWithRedirect(provider); }
    catch(e){ toast('Sign-in failed — try again.'); }
  });
}
function cloudSignOut(){
  if(!CLOUD.ready)return;
  firebase.auth().signOut();
}
function cloudAuthChanged(u){
  if(CLOUD.unsub){try{CLOUD.unsub();}catch(e){} CLOUD.unsub=null;}
  if(!u){ CLOUD.user=null; cloudRenderAccount(); return; }
  CLOUD.user={uid:u.uid,name:u.displayName||'Player',photo:u.photoURL||''};
  cloudRenderAccount();
  cloudStartSync();
}

/* ---- sync ---- */
function cloudDoc(){ return firebase.firestore().collection('users').doc(CLOUD.user.uid); }
function cloudStartSync(){
  // live-mirror the user doc; every snapshot merges into local state
  CLOUD.unsub=cloudDoc().onSnapshot(function(snap){
    var d=snap.exists?(snap.data()||{}):{};
    // 1) entitlement cache for the ad gate
    try{ localStorage.setItem(CLOUD_NOADS_KEY,(d.entitlements&&d.entitlements.noAds)?'1':'0'); }catch(e){}
    // 2) profile name: adopt the cloud name if we don't have one locally
    try{
      var localName=localStorage.getItem('sy_name');
      if(!localName&&d.profile&&d.profile.name){ localStorage.setItem('sy_name',d.profile.name); var inp=document.getElementById('nameIn'); if(inp&&!inp.value)inp.value=d.profile.name; }
    }catch(e){}
    // 3) histories: union both ways; write back only if the cloud is missing games
    var local=historyLoad();
    var remote=Array.isArray(d.history)?d.history:[];
    var merged=cloudMergeHistories(local,remote);
    if(merged.length!==local.length)historySave(merged);
    var cloudWant=merged.slice(0,CLOUD_HISTORY_CLOUD_CAP).map(cloudStripEntry);
    if(cloudWant.length!==remote.length)cloudPushDoc({history:cloudWant});
  },function(){/* offline snapshots — retry silently on reconnect */});
}
function cloudPushDoc(fields){
  if(!CLOUD.ready||!CLOUD.user||CLOUD.syncing)return;
  CLOUD.syncing=true;
  fields.updatedAt=Date.now();
  var done=function(){CLOUD.syncing=false;};
  try{
    var p=cloudDoc().set(fields,{merge:true});
    if(p&&p.then)p.then(done,done);else done();
  }catch(e){done();}
}
/* record hook: history.js is loaded before us, so wrap its recorder */
(function(){
  if(typeof historyRecord!=='function')return;
  var base=historyRecord;
  historyRecord=function(entry){
    base(entry);
    if(CLOUD.ready&&CLOUD.user){
      var cloudWant=historyLoad().slice(0,CLOUD_HISTORY_CLOUD_CAP).map(cloudStripEntry);
      cloudPushDoc({history:cloudWant});
    }
  };
})();
function cloudSaveName(name){ // called when the lobby name field changes
  if(CLOUD.ready&&CLOUD.user&&name)cloudPushDoc({profile:{name:name}});
}

/* ---- account UI (lobby card section) ---- */
function cloudRenderAccount(){
  var box=document.getElementById('accountBox');
  if(!box)return;
  if(!CLOUD.enabled){ box.hidden=true; return; }
  box.hidden=false;
  if(CLOUD.user){
    box.innerHTML=
      '<span class="acct-ava">'+(CLOUD.user.photo?'<img src="'+CLOUD.user.photo+'" alt="" referrerpolicy="no-referrer">':'👤')+'</span>'+
      '<span class="acct-name">'+escapeHtml(CLOUD.user.name)+'</span>'+
      '<span class="acct-sub">history &amp; purchases synced</span>'+
      '<button id="acctOut" class="ghostbtn">Sign out</button>';
    var out=document.getElementById('acctOut'); if(out)out.onclick=function(){sfx('click');cloudSignOut();};
  }else if(CLOUD.ready){
    box.innerHTML=
      '<span class="acct-ava">☁️</span>'+
      '<span class="acct-sub">Sign in to sync your history and purchases across devices</span>'+
      '<button id="acctIn" class="btn">Sign in with Google</button>';
    var btn=document.getElementById('acctIn'); if(btn)btn.onclick=function(){sfx('click');cloudSignIn();};
  }else{
    box.innerHTML='<span class="acct-ava">☁️</span><span class="acct-sub">Connecting…</span>';
  }
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}

window.addEventListener('load',function(){
  // Persist the lobby name locally (works signed-out too) and mirror it to
  // the cloud profile when signed in.
  try{
    var inp=document.getElementById('nameIn');
    if(inp){
      var saved=localStorage.getItem('sy_name');
      if(saved&&!inp.value)inp.value=saved;
      inp.addEventListener('change',function(){
        var v=(inp.value||'').trim();
        try{ if(v)localStorage.setItem('sy_name',v); }catch(e){}
        cloudSaveName(v);
      });
    }
  }catch(e){}
  try{ cloudInit(); }catch(e){}
});
