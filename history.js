/* ---------------- local game history ----------------
 * localStorage-only, tied to this browser/device — same trade-off already
 * accepted for the tutorial's "seen it" flag. No backend, no sync.
 */
var HISTORY_KEY='sy_history';
var HISTORY_CAP=50;

function historyLoad(){
  try{
    var raw=localStorage.getItem(HISTORY_KEY);
    var arr=raw?JSON.parse(raw):[];
    return Array.isArray(arr)?arr:[];
  }catch(e){return [];}
}
function historySave(arr){
  try{localStorage.setItem(HISTORY_KEY,JSON.stringify(arr.slice(0,HISTORY_CAP)));}catch(e){}
}
function historyRecord(entry){
  var arr=historyLoad();
  arr.unshift(entry);
  historySave(arr);
}
function historySummary(arr){
  var s={games:arr.length,detGames:0,detWins:0,mrxGames:0,mrxWins:0};
  arr.forEach(function(e){
    if(e.role==='mrx'){s.mrxGames++;if(e.result==='win')s.mrxWins++;}
    else{s.detGames++;if(e.result==='win')s.detWins++;}
  });
  return s;
}
function historyPct(wins,games){return games?Math.round(100*wins/games):0;}

/* ---------------- room-wide (shared) stats for online games ----------------
 * There's no backend here — online rooms are peer-to-peer, host-authoritative
 * — so "shared storage" for a room is the room object itself: the host
 * appends to room.history and broadcasts it like any other room mutation
 * (seats, game state), so every connected player sees the same list. This
 * is explicitly visible to anyone with the room code, same trust model as
 * the rest of online play — it is not private, and it only covers games
 * played while a player was connected to that live room.
 */
var ROOM_HISTORY_CAP=50;
function roomHistoryAppend(room,entry){
  if(!room)return;
  if(!Array.isArray(room.history))room.history=[];
  room.history.unshift(entry);
  if(room.history.length>ROOM_HISTORY_CAP)room.history.length=ROOM_HISTORY_CAP;
}
