// ---------------- bots ----------------
function botDetPick(g,i,diff){
  var moves=detMoves(g,i);if(!moves.length)return null;
  if(diff==='easy')return rnd(moves);
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
function scoreMrx(g,m){
  var mind=1e9,sum=0;
  g.dets.forEach(function(d){var dd=DIST[m.to][d.st];if(dd<mind)mind=dd;sum+=dd;});
  if(mind===0)return -1e9;
  var s=3*mind+0.4*sum/g.nd+0.25*DEG[m.to]+0.6*Math.log(1+psAfter(g,m.tk));
  if(mind===1)s-=6;
  if(m.tk==='x'){
    var ferryOnly=!NBRS[g.mrx.st].some(function(e){return e.to===m.to&&e.t!=='f';});
    var justRevealed=g.log.length>0&&g.log[g.log.length-1].rv;
    if(ferryOnly)s+=4;else if(justRevealed)s+=1.5;else s-=3;
  }
  return s;
}
function botMrxPick(g,diff){
  var moves=mrxMoves(g);if(!moves.length)return null;
  if(diff==='easy'){var nb=moves.filter(function(m){return m.tk!=='x';});return{move:rnd(nb.length?nb:moves),dbl:false};}
  var best=null,bs=-1e9;
  moves.forEach(function(m){var s=scoreMrx(g,m)+Math.random()*0.2;if(s>bs){bs=s;best=m;}});
  var mind=1e9;g.dets.forEach(function(d){var dd=DIST[best.to][d.st];if(dd<mind)mind=dd;});
  var useDbl=g.dblPending===0&&g.mrx.dbl>0&&g.log.length<MAX_ROUND-1&&mind<=1;
  return {move:best,dbl:useDbl};
}
