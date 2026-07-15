/* ---------------- mid-game persistence ----------------
 * One save slot, localStorage only — no cross-device/cloud sync, same
 * device-local trade-off as history.js. Local/hot-seat games save the full
 * engine state directly (the game object ui.js/engine.js already pass
 * around is plain, JSON-safe data). Online games save the last-known room
 * snapshot plus which identity/seat this browser holds, so a refreshed tab
 * can attempt to rejoin the same room under the same identity — there is no
 * shared backend here (rooms are peer-to-peer, host-authoritative, live in
 * the host tab's memory), so a resume can only succeed if the host tab (or,
 * for the host itself, the PeerJS id) is still reachable.
 */
var PERSIST_KEY='sy_active_game';
var CLIENT_ID_KEY='sy_client_id';

function getStableClientId(){
  try{
    var id=localStorage.getItem(CLIENT_ID_KEY);
    if(id)return id;
    id=Math.random().toString(36).slice(2,10);
    localStorage.setItem(CLIENT_ID_KEY,id);
    return id;
  }catch(e){ return Math.random().toString(36).slice(2,10); }
}

function persistLocalGame(game,meta){
  try{
    localStorage.setItem(PERSIST_KEY,JSON.stringify({
      kind:'local',game:game,privacy:!!(meta&&meta.privacy),ts:Date.now()
    }));
  }catch(e){}
}
function persistNetGame(room,meta){
  try{
    localStorage.setItem(PERSIST_KEY,JSON.stringify({
      kind:'net',room:room,isHost:!!(meta&&meta.isHost),code:(meta&&meta.code)||null,
      name:(meta&&meta.name)||'',ts:Date.now()
    }));
  }catch(e){}
}
function clearActiveGame(){
  try{localStorage.removeItem(PERSIST_KEY);}catch(e){}
}
function loadActiveGame(){
  try{
    var raw=localStorage.getItem(PERSIST_KEY);
    if(!raw)return null;
    var obj=JSON.parse(raw);
    if(!obj||typeof obj!=='object')return null;
    if(obj.kind==='local'){
      var g=obj.game;
      if(!g||!Array.isArray(g.seats)||!Array.isArray(g.dets)||!g.mrx||g.winner)return null;
      return obj;
    }
    if(obj.kind==='net'){
      if(!obj.code||!obj.room||!obj.room.game||obj.room.phase!=='playing'||obj.room.game.winner)return null;
      return obj;
    }
    return null;
  }catch(e){
    try{localStorage.removeItem(PERSIST_KEY);}catch(e2){}
    return null;
  }
}
