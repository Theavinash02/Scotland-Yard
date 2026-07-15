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
