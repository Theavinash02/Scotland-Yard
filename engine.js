const POS_RAW="1:62.7,37.9;2:215.3,48.5;3:264.2,36.2;4:382.8,51.2;5:434.5,51.8;6:657.9,39.4;7:722.0,48.1;8:795.4,51.2;9:906.2,51.9;10:52.2,96.7;11:131.5,73.8;12:151.4,61.8;13:292.0,97.3;14:338.5,74.5;15:511.1,57.0;16:549.2,73.1;17:621.0,79.1;18:815.5,104.5;19:836.8,74.0;20:921.0,77.4;21:53.7,156.9;22:120.7,112.5;23:181.0,110.0;24:244.5,120.6;25:352.6,127.8;26:381.3,141.3;27:443.7,125.2;28:487.9,105.3;29:534.2,153.4;30:573.0,117.1;31:623.4,118.8;32:648.2,121.4;33:705.0,137.0;34:778.6,136.4;35:865.1,127.7;36:922.0,127.3;37:106.9,180.2;38:152.2,177.7;39:242.1,181.8;40:264.8,162.8;41:321.0,190.4;42:386.0,174.3;43:447.5,190.1;44:488.7,187.7;45:596.1,176.3;46:649.8,180.4;47:711.2,161.9;48:763.3,179.3;49:893.8,174.0;50:940.3,177.6;51:70.2,225.3;52:105.3,229.2;53:168.9,257.3;54:238.1,224.0;55:297.1,247.6;56:312.0,241.9;57:368.4,243.9;58:443.5,225.9;59:537.5,215.7;60:625.0,257.4;61:644.6,251.4;62:702.0,219.7;63:794.0,224.8;64:844.0,240.3;65:926.1,224.0;66:79.6,303.3;67:105.3,289.4;68:163.0,278.2;69:216.3,293.3;70:282.2,283.9;71:314.5,312.3;72:382.4,292.6;73:458.7,308.8;74:504.9,299.0;75:553.2,275.2;76:624.4,304.6;77:728.4,271.1;78:785.6,286.7;79:844.4,275.2;80:889.8,308.9;81:944.6,279.0;82:45.3,327.9;83:111.7,332.8;84:156.8,338.3;85:203.5,333.5;86:267.6,359.2;87:333.1,330.5;88:408.1,355.2;89:438.6,339.4;90:533.1,342.9;91:713.8,355.9;92:789.1,335.8;93:816.9,328.7;94:902.9,348.5;95:930.3,340.8;96:160.7,392.0;97:220.4,404.6;98:273.8,413.7;99:347.6,402.8;100:434.5,406.5;101:485.1,396.5;102:514.9,373.2;103:557.2,417.5;104:595.7,370.5;105:607.7,390.6;106:650.9,394.2;107:652.2,368.8;108:725.0,403.1;109:791.9,394.5;110:836.6,398.8;111:865.0,396.5;112:921.7,387.9;113:45.9,432.6;114:54.5,466.0;115:97.4,433.1;116:122.5,448.9;117:151.9,460.0;118:227.8,456.3;119:287.2,467.0;120:375.8,426.9;121:489.8,452.8;122:570.6,450.4;123:631.6,464.2;124:653.3,466.2;125:820.5,460.1;126:907.2,443.6;127:75.3,514.2;128:187.2,523.6;129:243.9,508.0;130:299.4,520.9;131:343.2,481.1;132:379.2,482.9;133:431.0,485.3;134:439.3,521.6;135:562.1,504.1;136:702.0,508.8;137:756.6,482.2;138:834.0,519.2;139:894.0,523.2;140:960.6,523.2;141:962.2,493.3;142:104.9,526.3;143:133.7,577.8;144:156.1,569.4;145:259.0,561.3;146:311.5,528.6;147:401.6,573.3;148:410.3,567.7;149:483.2,529.1;150:544.7,563.8;151:591.3,540.3;152:675.8,533.3;153:787.8,546.1;154:908.2,574.9;155:937.9,564.0;156:71.1,588.9;157:151.3,622.9;158:202.5,607.3;159:320.0,579.7;160:351.4,626.2;161:399.0,625.6;162:430.9,588.4;163:458.8,620.7;164:498.3,604.0;165:604.7,613.5;166:678.2,599.7;167:742.3,591.5;168:757.4,625.1;169:770.0,596.4;170:811.7,591.7;171:79.7,632.6;172:115.2,655.7;173:242.2,655.3;174:288.9,658.6;175:516.5,639.5;176:552.7,678.2;177:562.2,644.8;178:588.2,639.7;179:644.4,662.1;180:722.8,658.8;181:817.3,634.8;182:902.5,643.6;183:955.8,647.7;184:41.6,694.6;185:135.5,721.1;186:175.7,712.6;187:234.4,705.9;188:263.2,691.1;189:354.8,713.9;190:368.7,702.6;191:437.1,721.9;192:488.6,685.6;193:619.1,706.4;194:687.9,696.5;195:712.0,695.6;196:787.5,691.4;197:818.8,721.6;198:876.5,700.7;199:935.6,684.8";
const EDG_RAW="71-87-t;177-178-t;167-169-t;94-95-t;110-111-t;92-93-t;66-67-t;148-162-t;9-20-t;115-116-t;39-40-t;140-141-t;165-178-t;168-169-t;116-117-t;154-155-t;25-26-t;127-142-t;187-188-t;147-162-t;26-42-t;88-89-t;113-114-t;176-177-t;64-79-t;90-102-t;51-52-t;103-122-t;136-152-t;43-58-t;131-132-t;73-89-t;167-168-t;99-120-t;18-19-t;133-134-t;101-102-t;180-195-t;55-70-t;17-31-t;164-175-t;11-22-t;185-186-t;43-44-t;15-16-t;174-188-t;173-188-t;80-94-t;169-170-t;66-82-t;69-85-t;183-199-t;171-172-t;39-54-t;162-163-t;163-164-t;70-71-t;105-106-t;170-181-t;196-197-t;66-83-t;94-112-t;67-83-t;134-149-t;156-171-t;109-110-t;37-38-t;83-84-t;34-48-t;175-177-t;135-151-t;49-50-t;140-155-t;173-174-t;24-40-t;84-85-t;60-76-t;73-74-t;8-19-t;160-161-t;95-112-t;168-180-t;143-157-t;27-28-t;50-65-t;91-108-t;157-172-t;18-34-t;161-162-t;37-52-t;78-92-t;105-107-t;20-36-t;16-30-t;4-14-t;17-32-t;2-3-t;30-31-t;57-72-t;179-193-t;173-187-t;180-194-t;153-170-t;100-101-t;56-70-t;113-115-t;80-95-t;4-5-t;13-14-t;146-159-t;132-133-t;97-118-t;74-90-t;150-151-t;41-56-t;63-64-t;147-161-t;78-93-t;176-178-t;114-127-t;165-177-t;182-199-t;13-24-t;175-176-t;29-30-t;153-169-t;182-183-t;138-153-t;15-28-t;157-158-t;36-50-t;139-154-t;144-157-t;84-96-t;74-75-t;175-192-t;45-46-t;114-115-t;97-98-t;118-129-t;6-17-t;122-135-t;35-49-t;134-148-t;36-49-t;18-35-t;48-63-t;86-98-t;98-119-t;47-48-t;14-25-t;119-130-t;128-144-t;129-145-t;68-69-t;179-194-t;159-160-t;120-132-t;44-59-t;56-57-t;104-107-t;79-80-t;101-121-t;12-23-t;61-76-t;35-36-t;8-18-t;129-130-t;29-44-t;130-145-t;131-146-t;25-42-t;103-105-t;111-112-t;112-126-t;119-131-t;88-100-t;62-77-t;21-37-t;65-81-t;37-51-t;47-62-t;92-109-t;67-68-t;128-129-t;32-33-t;142-143-t;32-46-t;186-187-t;44-58-t;130-131-t;77-78-t;12-22-t;49-65-t;53-69-t;1-10-t;78-79-t;139-155-t;144-158-t;161-163-t;79-93-t;52-67-t;138-139-t;10-21-t;118-119-t;68-84-t;22-23-t;178-179-t;125-138-t;168-181-t;19-35-t;115-117-t;103-104-t;136-137-t;96-97-t;94-111-t;198-199-t;17-30-t;102-103-t;24-39-t;197-198-t;150-164-t;59-75-t;145-146-t;41-55-t;100-120-t;135-150-t;72-87-t;158-173-t;29-59-t;80-81-t;122-123-t;40-41-t;98-118-t;165-179-t;182-198-t;91-107-t;191-192-t;111-126-t;110-125-t;81-95-t;54-55-t;143-156-t;42-43-t;31-45-t;145-159-t;181-196-t;46-47-t;153-167-t;23-24-t;26-27-t;176-192-t;166-167-t;124-136-t;6-7-t;27-43-t;2-12-t;46-62-t;86-97-t;61-62-t;29-45-t;71-86-t;82-83-t;69-70-t;139-140-t;40-54-t;142-144-t;41-42-t;121-133-t;3-13-t;89-100-t;108-109-t;125-137-t;72-88-t;13-25-t;133-149-t;90-104-t;172-185-t;96-117-t;68-85-t;73-88-t;154-182-t;85-86-t;16-28-t;52-53-t;193-194-t;76-107-t;114-116-t;10-22-t;93-109-t;2-23-t;160-174-t;21-51-t;105-122-t;56-71-t;149-150-t;45-59-t;75-90-t;124-152-t;142-156-t;190-191-t;163-192-t;132-134-t;76-104-t;106-124-t;33-48-t;180-196-t;106-123-t;171-184-t;9-19-t;147-160-t;7-8-t;89-101-t;91-106-t;33-34-t;87-99-t;60-75-t;5-27-t;165-166-t;74-102-t;127-156-t;32-47-t;5-28-t;195-196-t;138-170-t;121-149-t;5-15-t;53-54-t;143-171-t;57-58-t;1-11-t;91-92-t;72-73-t;51-66-t;14-26-t;123-135-t;63-77-t;38-53-t;147-159-t;123-152-t;10-11-t;189-191-t;172-186-t;110-126-t;64-65-t;151-152-t;108-137-t;128-158-t;155-183-t;174-189-t;61-77-t;8-34-t;181-197-t;154-183-t;125-126-t;38-39-t;7-33-t;1-12-t;193-195-t;57-87-t;188-189-t;148-164-t;108-124-t;166-194-t;184-185-t;139-141-t;189-190-t;56-87-b;39-56-b;109-137-b;98-131-b;107-124-b;184-185-b;124-135-b;98-129-b;157-185-b;10-37-b;42-56-b;17-45-b;134-163-b;87-98-b;129-131-b;163-191-b;42-44-b;131-134-b;124-137-b;75-102-b;160-163-b;45-75-b;44-45-b;56-69-b;37-67-b;160-188-b;137-167-b;14-42-b;8-9-b;67-69-b;15-17-b;69-96-b;39-69-b;45-62-b;178-194-b;50-64-b;96-98-b;167-194-b;94-109-b;64-94-b;134-135-b;2-14-b;160-191-b;96-114-b;9-50-b;163-178-b;157-188-b;157-184-b;15-44-b;194-197-b;2-39-b;75-107-b;102-107-b;139-183-b;137-139-b;62-64-b;167-197-b;183-197-b;2-10-b;8-17-b;67-114-b;139-197-u;178-197-u;134-178-u;129-134-u;129-188-u;114-129-u;67-114-u;87-129-u;10-67-u;184-188-u;14-87-u;107-134-u;14-17-u;17-50-u;114-184-u;67-87-u;107-178-u;117-131-f;131-164-f;164-166-f;138-166-f";
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
const MRX_STARTS=[10,14,17,50,87,107,114,129,134,139,178,188,197];
const DET_STARTS=[1,5,8,36,46,56,66,74,110,119,122,127,153,174,183,185,191,194];
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
    dets:sample(DET_STARTS,nd).map(function(st){return{st:st,t:10,b:8,u:4};}),
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
