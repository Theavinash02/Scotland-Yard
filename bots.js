// ---------------- bots ----------------
// Three difficulty tiers, for both roles:
//   easy   — picks a random legal move.
//   normal — a solid single-piece heuristic: detectives close on the deduced
//            possible-location set; Mr. X keeps his distance from the detectives.
//   hard   — anticipation + coordination: detectives cover the whole set of
//            stations Mr. X could reach *next* round (a smart fugitive dodges the
//            single likeliest spot, so uniform containment beats chasing it),
//            splitting the work so no two chase the same station; Mr. X reads two
//            moves deep and spends double-moves to break contact.
//
// All of this is pure logic over engine.js globals (NBRS, DIST, DEG, REVEALS,
// MRX_STARTS, possibleSet, detMoves, mrxMoves, rnd) — no DOM access — so it can
// be headlessly simulated (see the README's testing notes).

// ---- detectives ----
function normalDetPick(g,i,moves){
  var ps=Array.from(possibleSet(g));if(!ps.length)ps=MRX_STARTS.slice();
  var others=[];g.dets.forEach(function(d,j){if(j!==i)others.push(d.st);});
  var best=null,bs=-1e9;
  moves.forEach(function(m){
    var D=DIST[m.to],mind=1e9,sum=0;
    ps.forEach(function(p){var dd=D[p];if(dd<mind)mind=dd;sum+=dd;});
    var s=-(2*mind+sum/ps.length);
    if(ps.indexOf(m.to)>=0)s+=100;
    others.forEach(function(o){if(D[o]<=1)s-=1.6;});
    s+=0.15*DEG[m.to];
    s-=(m.tk==='u'?0.5:m.tk==='b'?0.2:0);
    s+=Math.random()*0.3;
    if(s>bs){bs=s;best=m;}
  });
  return best;
}

// Hard detectives think one round ahead: they cover the set of stations Mr. X
// could reach *next* round rather than where he might be now, since he has
// already moved this turn. Each detective adds value only where it can reach a
// suspect sooner than any teammate already can (a nearest-teammate baseline), so
// the team fans out to cover different regions instead of clumping, while still
// pouncing on any station he could occupy right now.
function hardDetPick(g,i,moves){
  var now=Array.from(possibleSet(g));if(!now.length)now=MRX_STARTS.slice();
  var onNow={};now.forEach(function(n){onNow[n]=1;});
  // The stations Mr. X could reach *next* round (any non-ferry ticket). Landing on
  // a current suspect can catch him now; but since he already moved this round,
  // the team should mostly be positioning to cover where he'll be next round.
  var nextSet={};now.forEach(function(s){NBRS[s].forEach(function(e){if(e.t!=='f')nextSet[e.to]=1;});});
  g.dets.forEach(function(d){delete nextSet[d.st];});
  var future=Object.keys(nextSet).map(Number);if(!future.length)future=now.slice();
  var otherPos=[];g.dets.forEach(function(d,j){if(j!==i)otherPos.push(d.st);});
  // Nearest *other* detective to each future station — I add value only where I beat it.
  var bo=future.map(function(node){
    var b=1e9;otherPos.forEach(function(o){var dd=DIST[o][node];if(dd<b)b=dd;});return b;
  });
  var best=null,bs=-1e9;
  moves.forEach(function(m){
    var D=DIST[m.to],mind=1e9,gain=0,adj=0;
    for(var k=0;k<future.length;k++){
      var d=D[future[k]];
      if(d<mind)mind=d;
      if(bo[k]-d>0)gain+=(bo[k]-d); // marginal coverage of the next-round escape set
      if(d<=1)adj++;                // I'll be on/next-to this escape station
    }
    // Cover the whole next-round escape set (a smart Mr. X evades the *likely* spot,
    // so uniform containment beats chasing probability mass), grabbing the stations
    // no teammate is near, and close the distance so nobody idles.
    var s=1.2*gain-1.8*mind+0.5*adj;
    if(onNow[m.to])s+=70;                  // a direct landing on a current suspect may catch him
    s+=0.16*DEG[m.to];                     // junctions cover more and cut more routes
    otherPos.forEach(function(o){if(D[o]===0)s-=4;else if(D[o]===1)s-=1.4;}); // don't clump
    s-=(m.tk==='u'?0.5:m.tk==='b'?0.2:0);  // conserve the scarce tickets
    s+=Math.random()*0.25;
    if(s>bs){bs=s;best=m;}
  });
  return best;
}

function botDetPick(g,i,diff){
  var moves=detMoves(g,i);if(!moves.length)return null;
  if(diff==='easy')return rnd(moves);
  if(diff==='normal')return normalDetPick(g,i,moves);
  return hardDetPick(g,i,moves);
}

// ---- Mr. X ----
function psAfter(g,tk){
  var round=g.log.length+1;
  if(REVEALS.indexOf(round)>=0)return 1;
  var cur=possibleSet(g),nxt=new Set();
  cur.forEach(function(s){NBRS[s].forEach(function(e){
    if(e.t==='f'&&tk!=='x')return;
    if(tk==='x'||e.t===tk)nxt.add(e.to);
  });});
  g.dets.forEach(function(d){nxt.delete(d.st);});
  return nxt.size||1;
}
function scoreMrx(g,m,hard){
  var mind=1e9,sum=0;
  g.dets.forEach(function(d){var dd=DIST[m.to][d.st];if(dd<mind)mind=dd;sum+=dd;});
  if(mind===0)return -1e9;
  var s=3*mind+0.4*sum/g.nd+0.25*DEG[m.to]+0.6*Math.log(1+psAfter(g,m.tk));
  if(mind===1)s-=6;
  if(hard&&mind===2)s-=1.2; // hard Mr. X also shies from two-away nets, not just adjacency
  if(m.tk==='x'){
    var ferryOnly=!NBRS[g.mrx.st].some(function(e){return e.to===m.to&&e.t!=='f';});
    var justRevealed=g.log.length>0&&g.log[g.log.length-1].rv;
    if(ferryOnly)s+=4;else if(hard&&justRevealed)s+=1.5;else s-=(hard?3:99);
  }
  return s;
}
function botMrxPick(g,diff){
  var moves=mrxMoves(g);if(!moves.length)return null;
  if(diff==='easy'){var nb=moves.filter(function(m){return m.tk!=='x';});return{move:rnd(nb.length?nb:moves),dbl:false};}
  var hard=diff==='hard',best=null,bs=-1e9;
  moves.forEach(function(m){var s=scoreMrx(g,m,hard)+Math.random()*0.2;if(s>bs){bs=s;best=m;}});
  var mind=1e9;g.dets.forEach(function(d){var dd=DIST[best.to][d.st];if(dd<mind)mind=dd;});
  // Only hard Mr. X spends double-move cards, and only to break contact when cornered.
  var useDbl=hard&&g.dblPending===0&&g.mrx.dbl>0&&g.log.length<MAX_ROUND-1&&mind<=1;
  return {move:best,dbl:useDbl};
}
