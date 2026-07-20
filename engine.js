const POS_RAW="1:125.4,45.6;2:302.5,31.9;3:417.8,34.6;4:488.0,30.0;5:765.8,38.0;6:853.2,38.0;7:936.8,43.7;8:85.7,86.5;9:157.9,88.0;10:360.1,83.0;11:413.2,92.6;12:456.3,83.4;13:537.6,80.4;14:620.0,63.2;15:703.2,55.6;16:782.6,85.3;17:930.7,111.3;18:46.4,118.9;19:114.3,125.8;20:195.3,105.6;21:281.1,139.9;22:417.0,153.7;23:482.3,119.3;24:585.3,123.1;25:630.7,134.6;26:697.1,83.8;27:708.6,123.5;28:738.3,108.6;29:852.1,132.3;30:960.5,126.6;31:76.2,149.5;32:172.7,172.4;33:243.3,159.8;34:366.2,173.1;35:437.6,190.3;36:467.0,194.9;37:510.5,156.3;38:606.3,159.4;39:650.6,152.1;40:726.5,184.6;41:758.9,170.1;42:933.4,170.8;43:30.0,185.3;44:126.2,205.2;45:197.2,216.2;46:255.9,198.7;47:302.9,185.3;48:378.8,220.4;49:491.8,222.7;50:538.7,193.3;51:633.8,202.1;52:681.9,189.9;53:734.1,219.7;54:770.8,207.5;55:854.4,206.7;56:965.0,216.6;57:62.4,222.4;58:155.2,233.4;59:172.4,255.6;60:210.1,250.2;61:273.9,259.4;62:306.3,248.3;63:387.2,288.4;64:436.5,280.0;65:487.2,270.4;66:517.7,262.8;67:574.2,252.9;68:640.3,239.5;69:701.3,235.3;70:773.5,247.5;71:843.3,248.3;72:914.3,256.3;73:61.3,260.9;74:93.4,298.3;75:140.3,285.3;76:198.7,284.2;77:237.6,317.4;78:287.2,308.2;79:321.6,302.1;80:400.6,318.5;81:471.6,328.8;82:498.3,312.4;83:562.0,300.2;84:606.7,282.3;85:644.1,269.3;86:710.1,293.7;87:778.8,312.0;88:811.2,318.1;89:838.7,294.9;90:885.3,296.0;91:954.4,298.3;92:36.9,334.2;93:40.7,359.4;94:99.1,347.5;95:129.6,341.0;96:274.6,359.4;97:299.1,352.1;98:339.9,337.6;99:381.1,342.2;100:446.8,364.7;101:512.8,339.9;102:599.0,306.7;103:654.0,298.3;104:710.5,325.8;105:865.8,338.8;106:924.2,347.5;107:968.5,349.1;108:850.5,403.6;109:314.7,410.5;110:362.8,366.2;111:391.4,398.3;112:408.6,387.6;113:474.6,391.8;114:521.2,375.4;115:597.9,352.5;116:711.2,391.0;117:789.1,420.4;118:712.4,437.2;119:948.2,451.3;120:34.2,480.0;121:68.5,481.9;122:115.5,479.2;123:236.9,476.5;124:304.8,460.1;125:431.1,419.7;126:553.6,399.1;127:643.7,420.0;128:757.4,552.5;129:783.4,446.8;130:409.7,465.5;131:447.1,439.9;132:524.2,438.4;133:608.2,479.6;134:670.0,458.6;135:812.8,473.1;136:925.0,516.2;137:194.1,515.8;138:326.5,489.1;139:405.2,494.5;140:522.7,484.5;141:631.5,494.1;142:711.2,509.7;143:783.8,499.8;144:46.8,564.3;145:80.0,561.3;146:126.6,557.8;147:160.9,549.8;148:209.8,542.6;149:250.6,536.8;150:296.4,518.5;151:319.3,542.9;152:351.7,520.0;153:370.0,547.1;154:451.7,529.2;155:479.2,564.7;156:533.0,565.5;157:581.1,568.9;158:657.4,536.8;159:660.5,642.9;160:816.6,565.5;161:879.9,557.8;162:970.0,560.1;163:122.0,583.8;164:170.8,583.4;165:262.0,597.9;166:357.5,576.9;167:432.3,591.4;168:459.4,610.9;169:531.5,602.5;170:573.8,608.2;171:861.2,710.5;172:733.4,604.0;173:832.6,634.1;174:915.4,609.3;175:959.7,644.5;176:31.5,630.7;177:71.6,621.9;178:142.6,616.6;179:226.5,624.6;180:278.8,635.7;181:333.8,620.4;182:359.7,628.0;183:409.4,606.3;184:503.2,644.5;185:557.8,682.6;186:618.5,669.6;187:707.8,648.7;188:796.0,650.2;189:72.7,687.2;190:114.7,712.0;191:171.2,666.6;192:184.2,724.6;193:316.6,671.6;194:332.3,690.3;195:372.7,687.6;196:430.3,657.4;197:438.4,697.1;198:658.6,730.7;199:806.3,725.0";
const EDG_RAW="1-8-t;1-9-t;1-46-b;1-46-u;1-58-b;2-10-t;2-20-t;3-4-t;3-11-t;3-12-t;3-22-b;3-23-b;4-13-t;5-15-t;5-16-t;6-7-t;6-29-t;7-17-t;7-42-b;8-18-t;8-19-t;9-19-t;9-20-t;10-11-t;10-21-t;10-34-t;11-22-t;12-23-t;13-14-b;13-23-t;13-23-b;13-24-t;13-46-u;13-52-b;13-67-u;13-89-u;14-15-t;14-15-b;14-25-t;15-16-t;15-26-t;15-28-t;15-29-b;15-41-b;16-28-t;16-29-t;17-29-t;17-30-t;18-31-t;18-43-t;19-32-t;20-33-t;21-33-t;22-23-t;22-23-b;22-34-t;22-34-b;22-35-t;22-65-b;23-37-t;23-67-b;24-37-t;24-38-t;25-38-t;25-39-t;26-27-t;26-39-t;27-28-t;27-40-t;28-41-t;29-41-t;29-41-b;29-42-t;29-42-b;29-55-b;30-42-t;31-43-t;31-44-t;32-33-t;32-44-t;32-45-t;33-46-t;34-46-b;34-47-t;34-48-t;34-63-b;35-36-t;35-48-t;35-65-t;36-37-t;36-49-t;37-50-t;38-50-t;38-51-t;39-51-t;39-52-t;40-41-t;40-52-t;40-53-t;41-52-b;41-54-t;41-87-b;42-56-t;42-72-t;42-72-b;43-57-t;44-58-t;45-46-t;45-58-t;45-59-t;45-60-t;46-47-t;46-58-b;46-61-t;46-74-u;46-78-b;46-79-u;47-62-t;48-62-t;48-63-t;49-50-t;49-66-t;51-52-t;51-67-t;51-68-t;52-67-b;52-69-t;52-86-b;53-54-t;53-69-t;54-55-t;54-70-t;55-71-t;55-89-b;56-91-t;57-58-t;57-73-t;58-59-t;58-74-t;58-74-b;58-75-t;58-77-b;59-75-t;59-76-t;60-61-t;60-76-t;61-62-t;61-76-t;61-78-t;62-79-t;63-64-t;63-65-b;63-79-t;63-79-b;63-80-t;63-100-b;64-65-t;64-81-t;65-66-t;65-67-b;65-82-t;65-82-b;66-67-t;66-82-t;67-68-t;67-79-u;67-82-b;67-84-t;67-89-u;67-102-b;67-111-u;68-69-t;68-85-t;69-86-t;70-71-t;70-87-t;71-72-t;71-89-t;72-90-t;72-91-t;72-105-b;72-107-b;73-74-t;73-92-t;74-75-t;74-92-t;74-94-b;75-94-t;76-77-t;77-78-t;77-78-b;77-94-b;77-95-t;77-96-t;77-124-b;78-79-t;78-79-b;78-97-t;79-93-u;79-98-t;79-111-u;80-99-t;80-100-t;81-82-t;81-100-t;82-100-b;82-101-t;82-140-b;83-101-t;83-102-t;84-85-t;85-103-t;86-87-b;86-102-b;86-103-t;86-104-t;86-116-b;87-88-t;87-105-b;88-89-t;88-117-t;89-105-t;89-105-b;89-128-u;89-140-u;90-91-t;90-105-t;91-105-t;91-107-t;92-93-t;93-94-t;93-94-b;94-95-t;95-122-t;96-97-t;96-109-t;97-98-t;97-109-t;98-99-t;98-110-t;99-110-t;99-112-t;100-101-t;100-111-b;100-112-t;100-113-t;101-114-t;102-103-t;102-115-t;102-127-b;104-116-t;105-106-t;105-107-b;105-108-t;105-108-b;106-107-t;107-119-t;107-161-b;108-116-b;108-117-t;108-119-t;108-135-b;109-110-t;109-124-t;110-111-t;111-112-t;111-124-t;111-124-b;111-153-u;111-163-u;112-125-t;113-114-t;113-125-t;114-115-t;114-126-t;114-131-t;114-132-t;115-126-t;115-127-t;116-117-t;116-118-t;116-127-t;116-127-b;116-142-b;117-129-t;118-129-t;118-134-t;118-142-t;119-136-t;120-121-t;120-144-t;121-122-t;121-145-t;122-123-t;122-123-b;122-144-b;122-146-t;123-124-t;123-124-b;123-137-t;123-144-b;123-148-t;123-149-t;123-165-b;124-130-t;124-138-t;124-153-b;125-131-t;126-127-t;126-140-t;127-133-t;127-133-b;127-134-t;128-185-u;128-187-b;128-188-t;128-199-b;129-135-t;129-142-t;129-143-t;130-131-t;130-139-t;132-140-t;133-140-t;133-140-b;133-141-t;133-157-b;134-141-t;134-142-t;135-128-b;135-136-t;135-143-t;135-161-t;135-161-b;136-162-t;137-147-t;138-150-t;138-152-t;139-140-t;139-153-t;139-154-t;140-128-u;140-153-u;140-154-t;140-154-b;140-156-t;140-156-b;141-142-t;141-158-t;142-128-t;142-128-b;142-143-t;142-157-b;142-158-t;143-128-t;143-160-t;144-145-t;144-163-b;144-177-t;145-146-t;146-147-t;146-163-t;147-164-t;148-149-t;148-164-t;149-150-t;149-165-t;150-151-t;151-152-t;151-165-t;151-166-t;152-153-t;153-154-t;153-154-b;153-163-u;153-166-t;153-167-t;153-180-b;153-184-b;153-185-u;154-155-t;154-156-b;155-156-t;155-167-t;155-168-t;156-157-t;156-157-b;156-169-t;156-184-b;157-158-t;157-170-t;157-185-b;158-159-t;159-170-t;159-172-t;159-186-t;159-198-t;160-128-t;160-161-t;160-173-t;161-128-b;161-174-t;161-199-b;162-175-t;163-176-b;163-177-t;163-191-b;164-178-t;164-179-t;165-179-t;165-180-t;165-180-b;165-191-b;166-181-t;166-183-t;167-168-t;167-183-t;168-184-t;169-184-t;170-185-t;171-173-t;171-175-t;171-199-t;172-128-t;172-187-t;173-174-t;173-188-t;174-175-t;176-177-t;176-189-t;176-190-b;178-189-t;178-191-t;179-191-t;180-181-t;180-184-b;180-190-b;180-193-t;181-182-t;181-193-t;182-183-t;182-195-t;183-196-t;184-185-t;184-185-b;184-196-t;184-197-t;185-186-t;185-187-b;186-198-t;187-188-t;187-198-t;188-199-t;189-190-t;190-191-t;190-191-b;190-192-t;191-192-t;192-194-t;193-194-t;194-195-t;195-197-t;196-197-t;198-199-t;194-157-f;157-115-f;115-108-f";
// ============ CORE START ============
const REVEALS=[3,8,13,18,24], MAX_ROUND=24;
// Rule presets. The chosen preset's round count and reveal schedule are copied
// onto each game object (g.maxRound / g.reveals) at newGame() time, so they ride
// along with persistence, replay, and online sync automatically. gReveals/
// gMaxRound read from the game and fall back to the classic constants, so older
// saves (which predate these fields) still resume as a classic game.
const VARIANTS={
  classic:{key:'classic',name:'Classic',rounds:24,reveals:[3,8,13,18,24],dbl:2,blackBonus:0,desc:'The standard chase — 24 rounds, five reveals.'},
  short:{key:'short',name:'Short chase',rounds:12,reveals:[3,6,9,12],dbl:1,blackBonus:0,desc:'A brisk 12-round game: four reveals, one double-move.'},
  sneaky:{key:'sneaky',name:"Fugitive's edge",rounds:24,reveals:[3,13,24],dbl:3,blackBonus:3,desc:'Only three reveals, with extra black tickets and double-moves — Mr. X is far harder to pin down.'}
};
function resolveVariant(v){ if(v&&typeof v==='object')return v; return VARIANTS[v]||VARIANTS.classic; }
function gReveals(g){return (g&&g.reveals)||REVEALS;}
function gMaxRound(g){return (g&&g.maxRound)||MAX_ROUND;}
const MRX_STARTS=[35,45,51,71,78,104,106,127,132,146,166,170,172];
const DET_STARTS=[13,26,29,34,50,53,91,94,103,112,117,123,138,141,155,174,197,198];
const TK_NAME={t:'Taxi',b:'Bus',u:'Underground',x:'Black',f:'Ferry'};
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
  if(m.to===g.mrx.st){g.winner='dets';g.reason='Detective '+(i+1)+' caught Mr. X at station '+m.to+'.';return;}
  g.turn=i+1;normalizeTurn(g);
}
function normalizeTurn(g){
  if(g.winner)return;
  while(g.turn>=0&&g.turn<g.nd&&detMoves(g,g.turn).length===0)g.turn++;
  if(g.turn<g.nd)return;
  if(g.log.length>=gMaxRound(g)){g.winner='mrx';g.reason='The travel log is full — Mr. X slipped away after '+gMaxRound(g)+' rounds.';return;}
  g.turn=-1;
  if(mrxMoves(g).length===0){g.winner='dets';g.reason='Mr. X is cornered with no legal move.';return;}
  var any=false;for(var i=0;i<g.nd;i++)if(detMoves(g,i).length>0){any=true;break;}
  if(!any){g.winner='mrx';g.reason='Every detective is stuck — Mr. X walks free.';}
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
