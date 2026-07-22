const POS_RAW=MAPDATA.pos;
const EDG_RAW=MAPDATA.edges;
// ============ CORE START ============
const REVEALS=[3,8,13,18,24], MAX_ROUND=24;
// Rule presets. The chosen preset's round count and reveal schedule are copied
// onto each game object (g.maxRound / g.reveals) at newGame() time, so they ride
// along with persistence, replay, and online sync automatically. gReveals/
// gMaxRound read from the game and fall back to the classic constants, so older
// saves (which predate these fields) still resume as a classic game.
const VARIANTS={
  classic:{key:'classic',name:'Classic',rounds:24,reveals:[3,8,13,18,24],dbl:2,blackBonus:0,desc:'The standard chase — 24 rounds, five reveals.'},
  short:{key:'short',name:'Short chase',rounds:12,reveals:[3,6,9,12],dbl:1,blackBonus:0,desc:'A brisk 12-round game: four reveals, one sprint.'},
  sneaky:{key:'sneaky',name:"Fugitive's edge",rounds:24,reveals:[3,13,24],dbl:3,blackBonus:3,desc:'Only three reveals, with extra shadow tickets and sprints — the Phantom is far harder to pin down.'}
};
function resolveVariant(v){ if(v&&typeof v==='object')return v; return VARIANTS[v]||VARIANTS.classic; }
function gReveals(g){return (g&&g.reveals)||REVEALS;}
function gMaxRound(g){return (g&&g.maxRound)||MAX_ROUND;}
const MRX_STARTS=MAPDATA.mrxStarts;
const DET_STARTS=MAPDATA.detStarts;
const TK_NAME={t:'Taxi',b:'Bus',u:'Metro',x:'Shadow',f:'Ferry'};
const POS={},NBRS={},DEG={},PAIRS=[];
(function(){
  POS_RAW.split(';').forEach(function(s){var p=s.split(':'),xy=p[1].split(',');POS[+p[0]]={x:+xy[0],y:+xy[1]};});
  for(var i=1;i<=199;i++){NBRS[i]=[];DEG[i]=0;}
  var seen={};
  EDG_RAW.split(';').forEach(function(s){
    var p=s.split('-'),A=+p[0],B=+p[1],t=p[2];
    NBRS[A].push({to:B,t:t});NBRS[B].push({to:A,t:t});
    var lo=Math.min(A,B),hi=Math.max(A,B),k=lo+'_'+hi;
    if(!seen[k]){seen[k]={a:lo,b:hi,types:[]};PAIRS.push(seen[k]);}
    seen[k].types.push(t);
    if(t!=='f'){DEG[A]++;DEG[B]++;}
  });
})();
const DIST={};
(function(){
  for(var s=1;s<=199;s++){
    var d=new Array(200).fill(1e9);d[s]=0;var q=[s],h=0;
    while(h<q.length){var v=q[h++];for(var j=0;j<NBRS[v].length;j++){var e=NBRS[v][j];
      if(e.t==='f')continue;
      if(d[e.to]>d[v]+1){d[e.to]=d[v]+1;q.push(e.to);}}}
    DIST[s]=d;
  }
})();
function rnd(a){return a[Math.floor(Math.random()*a.length)];}
function sample(arr,n){var c=arr.slice(),out=[];while(out.length<n){out.push(c.splice(Math.floor(Math.random()*c.length),1)[0]);}return out;}
function newGame(seats,variant){
  var nd=seats.length-1,cfg=resolveVariant(variant);
  return {mv:0,seats:seats,nd:nd,
    variant:cfg.key,maxRound:cfg.rounds,reveals:cfg.reveals.slice(),
    mrx:{st:rnd(MRX_STARTS),black:nd+(cfg.blackBonus||0),dbl:cfg.dbl},
    dets:sample(DET_STARTS,nd).map(function(st){return{st:st,t:MAPDATA.det.t,b:MAPDATA.det.b,u:MAPDATA.det.u};}),
    log:[],turn:-1,dblPending:0,winner:null,reason:'',rev:null,lastMove:null};
}
function dedupe(ms){var s={};return ms.filter(function(m){var k=m.to+m.tk;if(s[k])return false;s[k]=1;return true;});}
function mrxMoves(g){
  if(g.winner)return[];
  var occ={},res=[];g.dets.forEach(function(d){occ[d.st]=1;});
  NBRS[g.mrx.st].forEach(function(e){
    if(occ[e.to])return;
    if(e.t!=='f')res.push({to:e.to,tk:e.t});
    if(g.mrx.black>0)res.push({to:e.to,tk:'x'});
  });
  return dedupe(res);
}
function detMoves(g,i){
  if(g.winner)return[];
  var d=g.dets[i],res=[],occ={};
  g.dets.forEach(function(x,j){if(j!==i)occ[x.st]=1;});
  NBRS[d.st].forEach(function(e){
    if(e.t==='f'||occ[e.to])return;
    if(d[e.t]>0)res.push({to:e.to,tk:e.t});
  });
  return dedupe(res);
}
function startDouble(g){
  if(g.turn===-1&&g.mrx.dbl>0&&g.dblPending===0&&g.log.length<gMaxRound(g)-1){g.mrx.dbl--;g.dblPending=2;return true;}
  return false;
}
function applyMrx(g,m){
  var from=g.mrx.st;
  g.mrx.st=m.to;if(m.tk==='x')g.mrx.black--;
  var round=g.log.length+1,rv=gReveals(g).indexOf(round)>=0;
  g.log.push({tk:m.tk,st:m.to,rv:rv});
  if(rv)g.rev=m.to;
  g.mv++;g.lastMove={who:'mrx',from:from,to:m.to,tk:m.tk,rv:rv};
  if(g.dblPending>0){
    g.dblPending--;
    if(g.dblPending>0){
      if(mrxMoves(g).length===0)g.dblPending=0;else return;
    }
  }
  g.turn=0;normalizeTurn(g);
}
function applyDet(g,i,m){
  var d=g.dets[i],from=d.st;
  d[m.tk]--;d.st=m.to;g.mv++;
  g.lastMove={who:i,from:from,to:m.to,tk:m.tk};
  if(m.to===g.mrx.st){g.winner='dets';g.reason='Agent '+(i+1)+' caught the Phantom at station '+m.to+'.';return;}
  g.turn=i+1;normalizeTurn(g);
}
function normalizeTurn(g){
  if(g.winner)return;
  while(g.turn>=0&&g.turn<g.nd&&detMoves(g,g.turn).length===0)g.turn++;
  if(g.turn<g.nd)return;
  if(g.log.length>=gMaxRound(g)){g.winner='mrx';g.reason='The travel log is full — the Phantom slipped away after '+gMaxRound(g)+' rounds.';return;}
  g.turn=-1;
  if(mrxMoves(g).length===0){g.winner='dets';g.reason='The Phantom is cornered with no legal move.';return;}
  var any=false;for(var i=0;i<g.nd;i++)if(detMoves(g,i).length>0){any=true;break;}
  if(!any){g.winner='mrx';g.reason='Every agent is stuck — the Phantom walks free.';}
}
function possibleSet(g){
  var cur,start=0,lastRv=-1,i;
  for(i=0;i<g.log.length;i++)if(g.log[i].rv)lastRv=i;
  if(lastRv>=0){cur=new Set([g.log[lastRv].st]);start=lastRv+1;}
  else cur=new Set(MRX_STARTS);
  for(i=start;i<g.log.length;i++){
    var tk=g.log[i].tk,nxt=new Set();
    cur.forEach(function(s){NBRS[s].forEach(function(e){
      if(e.t==='f'&&tk!=='x')return;
      if(tk==='x'||e.t===tk)nxt.add(e.to);
    });});
    cur=nxt;
  }
  g.dets.forEach(function(d){cur.delete(d.st);});
  return cur;
}
function isFerryOnly(a,b){
  var lo=Math.min(a,b),hi=Math.max(a,b);
  for(var i=0;i<PAIRS.length;i++){var p=PAIRS[i];
    if(p.a===lo&&p.b===hi)return p.types.indexOf('f')>=0&&p.types.length===p.types.filter(function(t){return t==='f';}).length;
  }
  return false;
}
