var G=null;
var UI={mrxViewing:false,privacy:false,showPs:false,busy:false,botTimer:null,pending:null,soundOn:true,mapBuilt:false};
var DCOL=['#2E6FD8','#7A3FB8','#0FA3A3','#D8621F','#C23A6B'];
var TKCOL={t:'#DFAE1F',b:'#2F8A52',u:'#D23A3A',x:'#20242B',boat:'#3E6E8E'};

/* ---------------- sound ---------------- */
var ACTX=null;
function actx(){
  if(!UI.soundOn)return null;
  try{
    if(!ACTX)ACTX=new (window.AudioContext||window.webkitAudioContext)();
    if(ACTX.state==='suspended')ACTX.resume();
    return ACTX;
  }catch(e){return null;}
}
function noiseBuf(ctx,sec){
  var b=ctx.createBuffer(1,Math.floor(ctx.sampleRate*sec),ctx.sampleRate),d=b.getChannelData(0);
  for(var i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  return b;
}
function nsrc(ctx,sec){var s=ctx.createBufferSource();s.buffer=noiseBuf(ctx,sec);return s;}
function tone(ctx,type,f0,f1,t0,dur,peak,dest){
  var o=ctx.createOscillator(),g=ctx.createGain();
  o.type=type;o.frequency.setValueAtTime(f0,t0);
  if(f1&&f1!==f0)o.frequency.exponentialRampToValueAtTime(f1,t0+dur);
  g.gain.setValueAtTime(0.0001,t0);
  g.gain.exponentialRampToValueAtTime(peak,t0+0.02);
  g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
  o.connect(g);g.connect(dest);o.start(t0);o.stop(t0+dur+0.05);
}
function sfx(kind){
  var ctx=actx();if(!ctx)return;
  var t=ctx.currentTime,m=ctx.createGain();m.gain.value=0.5;m.connect(ctx.destination);
  if(kind==='click'){tone(ctx,'sine',900,700,t,0.06,0.25,m);}
  else if(kind==='deny'){tone(ctx,'square',180,140,t,0.12,0.18,m);}
  else if(kind==='taxi'){
    var n=nsrc(ctx,0.6),f=ctx.createBiquadFilter(),g=ctx.createGain();
    f.type='bandpass';f.frequency.value=260;f.Q.value=1.2;
    g.gain.setValueAtTime(0.28,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.6);
    n.connect(f);f.connect(g);g.connect(m);n.start(t);
    tone(ctx,'square',540,540,t+0.10,0.09,0.20,m);
    tone(ctx,'square',640,640,t+0.24,0.11,0.20,m);
  }else if(kind==='bus'){
    tone(ctx,'sawtooth',68,88,t,0.85,0.30,m);
    tone(ctx,'sawtooth',102,120,t,0.85,0.14,m);
    var n=nsrc(ctx,0.25),f=ctx.createBiquadFilter(),g=ctx.createGain();
    f.type='highpass';f.frequency.value=3200;
    g.gain.setValueAtTime(0.0001,t+0.62);g.gain.exponentialRampToValueAtTime(0.22,t+0.68);
    g.gain.exponentialRampToValueAtTime(0.001,t+0.9);
    n.connect(f);f.connect(g);g.connect(m);n.start(t+0.6);
  }else if(kind==='underground'){
    var n=nsrc(ctx,1.1),f=ctx.createBiquadFilter(),g=ctx.createGain();
    f.type='lowpass';f.frequency.setValueAtTime(110,t);f.frequency.exponentialRampToValueAtTime(220,t+0.5);
    f.frequency.exponentialRampToValueAtTime(90,t+1.05);
    g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(0.5,t+0.25);
    g.gain.exponentialRampToValueAtTime(0.001,t+1.05);
    n.connect(f);f.connect(g);g.connect(m);n.start(t);
    tone(ctx,'sine',820,380,t+0.1,0.7,0.05,m);
  }else if(kind==='black'){
    var n=nsrc(ctx,0.9),f=ctx.createBiquadFilter(),g=ctx.createGain();
    f.type='lowpass';f.frequency.setValueAtTime(400,t);f.frequency.exponentialRampToValueAtTime(2400,t+0.7);
    g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(0.30,t+0.55);
    g.gain.exponentialRampToValueAtTime(0.001,t+0.9);
    n.connect(f);f.connect(g);g.connect(m);n.start(t);
    tone(ctx,'triangle',196,185,t,0.7,0.12,m);
  }else if(kind==='boat'){
    tone(ctx,'square',98,98,t,0.75,0.22,m);
    tone(ctx,'square',147,147,t,0.75,0.10,m);
  }else if(kind==='reveal'){
    tone(ctx,'sawtooth',220,220,t,0.55,0.14,m);
    tone(ctx,'sawtooth',262,262,t,0.55,0.12,m);
    tone(ctx,'sawtooth',311,311,t+0.05,0.55,0.12,m);
  }else if(kind==='win'){
    [523,659,784,1047].forEach(function(f,i){tone(ctx,'triangle',f,f,t+i*0.14,0.3,0.22,m);});
  }else if(kind==='lose'){
    [392,330,262,196].forEach(function(f,i){tone(ctx,'triangle',f,f,t+i*0.16,0.34,0.22,m);});
  }
}
function sfxForTicket(tk,boat){
  if(boat)return sfx('boat');
  sfx(tk==='t'?'taxi':tk==='b'?'bus':tk==='u'?'underground':'black');
}
/* ---------------- perspective ---------------- */
function currentSeat(){return G.turn===-1?G.seats[0]:G.seats[G.turn+1];}
function isNet(){return !!NET.code;}
function humanDetCount(){var n=0;G.seats.slice(1).forEach(function(s){if(s.kind==='human')n++;});return n;}
function canSeeMrx(){
  if(!G)return false;
  if(G.winner)return true;
  if(isNet())return G.seats[0].pid===MYID;
  var humans=G.seats.filter(function(s){return s.kind==='human';}).length;
  if(humans===0)return true;                    // spectating an all-bot game
  var humanX=G.seats[0].kind==='human';
  if(humanX&&humanDetCount()===0)return true;   // solo human plays Mr X
  if(humanX)return UI.mrxViewing;               // hot-seat privacy
  return false;                                 // humans are detectives only
}
function iControlCurrent(){
  var s=currentSeat();
  if(s.kind!=='human')return false;
  if(isNet())return s.pid===MYID;
  return true; // hot-seat: whoever holds the device
}
/* ---------------- rendering ---------------- */
function seatName(idx){
  var s=G.seats[idx];
  var base=idx===0?'Mr. X':'Detective '+idx;
  if(s.kind==='bot')return base+' · bot ('+s.diff+')';
  return base+(s.name?' · '+s.name:'');
}
function render(){
  if(!G)return;
  renderPieces();renderBanner();renderPlayers();renderLog();renderCtrls();renderHighlights();
}
function renderPieces(){
  var h='';
  G.dets.forEach(function(d,i){
    var p=POS[d.st],c=DCOL[i%5];
    h+=pieceTokenSvg(p.x,p.y,c,'#fff',String(i+1),'pawn');
  });
  if(canSeeMrx()){
    var p=POS[G.mrx.st];
    h+=pieceTokenSvg(p.x,p.y,'#101317','#F2C230','X','king');
  }else if(G.rev){
    var q=POS[G.rev];
    h+='<g transform="translate('+q.x+','+q.y+')" opacity="0.85">'+
       '<circle r="10" fill="rgba(11,13,16,0.12)" stroke="#0B0D10" stroke-width="1.6" stroke-dasharray="4 3"/>'+
       '<text y="3.6" text-anchor="middle" font-size="9" font-weight="700" fill="#0B0D10" class="st-num">X?</text></g>';
  }
  LAYER.pieces.innerHTML=h;
  // possible set halos
  var ph='';
  if(UI.showPs&&!G.winner){
    possibleSet(G).forEach(function(s){
      ph+='<circle class="psring" cx="'+POS[s].x+'" cy="'+POS[s].y+'" r="12"/>';
    });
  }
  LAYER.ps.innerHTML=ph;
}

function pieceTokenSvg(x,y,fill,accent,label,kind){
  var isKing=kind==='king';
  var bodyR=isKing?12.2:10.2;
  var baseR=isKing?15.2:13.3;
  var neckW=isKing?9.2:8.2;
  var neckH=isKing?7.8:6.8;
  var headR=isKing?7.1:6.1;
  var glow=isKing?'rgba(255,223,120,.22)':'rgba(255,255,255,.18)';
  var shadow=isKing?'rgba(1,2,3,.42)':'rgba(2,4,6,.34)';
  var crown=isKing
    ? '<path d="M -5.6 -15 L -2.3 -20 L 0 -16.6 L 2.3 -20 L 5.6 -15 L 3.9 -10.4 L -3.9 -10.4 Z" fill="'+accent+'" stroke="rgba(255,255,255,.30)" stroke-width="0.8"/>'+ 
      '<path d="M -4.4 -14.2 L -2.2 -18.1 L 0 -15.2 L 2.2 -18.1 L 4.4 -14.2" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="0.9" stroke-linecap="round"/>'
    : '<path d="M -4.2 -14 L -1.8 -18.4 L 0 -15.7 L 1.8 -18.4 L 4.2 -14" fill="none" stroke="rgba(255,255,255,.30)" stroke-width="0.8" stroke-linecap="round"/>';
  var topHighlight=isKing
    ? '<ellipse cx="-2.8" cy="-10.2" rx="4.8" ry="2.5" fill="rgba(255,255,255,.20)"/>'
    : '<ellipse cx="-2.4" cy="-8.8" rx="4.2" ry="2.2" fill="rgba(255,255,255,.24)"/>';
  return '<g transform="translate('+x+','+y+')" filter="url(#pieceShadow)">'+
    '<ellipse cx="0" cy="7.8" rx="'+(isKing?12.8:11.2)+'" ry="4.8" fill="'+shadow+'"/>'+ 
    '<ellipse cx="0" cy="5.7" rx="'+baseR+'" ry="5.1" fill="rgba(0,0,0,.16)"/>'+ 
    '<path d="M -'+(baseR-1)+' 5.5 C -'+(baseR-1)+' 2.0 -'+(baseR-0.2)+' -1.1 0 -2.1 C '+(baseR-0.2)+' -1.1 '+(baseR-1)+' 2.0 '+(baseR-1)+' 5.5 Z" fill="'+fill+'" stroke="rgba(12,16,22,.80)" stroke-width="1.6"/>'+ 
    '<path d="M -'+(baseR-2.2)+' 3.8 C -'+(baseR-2)+' 0.8 -1.3 -1 0 -1.2 C -0.6 1.8 -0.5 3.4 -'+(baseR-2.2)+' 3.8 Z" fill="rgba(255,255,255,.10)"/>'+ 
    '<path d="M '+(baseR-2.2)+' 4.1 C '+(baseR-1.5)+' 1.2 '+(baseR-1.2)+' -0.8 0 -1.2 C 0.8 1.7 0.7 3.5 '+(baseR-2.2)+' 4.1 Z" fill="rgba(0,0,0,.16)"/>'+ 
    '<ellipse cx="0" cy="3.7" rx="'+(baseR-3)+'" ry="3.2" fill="'+glow+'"/>'+ 
    '<rect x="-'+(neckW/2)+'" y="-6.1" width="'+neckW+'" height="'+neckH+'" rx="'+(neckW/2)+'" fill="'+fill+'" stroke="rgba(12,16,22,.80)" stroke-width="1.3"/>'+ 
    '<ellipse cx="0" cy="-7.4" rx="'+headR+'" ry="'+(headR*0.9)+'" fill="'+fill+'" stroke="rgba(12,16,22,.80)" stroke-width="1.2"/>'+ 
    '<ellipse cx="-2.2" cy="-8.8" rx="3.8" ry="1.9" fill="rgba(255,255,255,.26)"/>'+ 
    crown+
    '<ellipse cx="3.1" cy="2.9" rx="4.4" ry="2.2" fill="rgba(0,0,0,.20)"/>'+ 
    topHighlight+
    '<text y="4.1" text-anchor="middle" font-size="'+(isKing?10:9)+'" font-weight="800" fill="'+accent+'" class="st-num">'+label+'</text></g>';
}
function renderBanner(){
  var b=$('#banner');
  if(G.winner){
    b.innerHTML='<div class="w">'+(G.winner==='mrx'?'Mr. X escaped':'Detectives win')+'</div><div class="r">'+G.reason+'</div>';
    return;
  }
  var round=G.turn===-1?G.log.length+1:G.log.length;
  if(round<1)round=1;
  var isRev=G.turn===-1&&REVEALS.indexOf(G.log.length+1)>=0;
  var mine=iControlCurrent();
  var who=G.turn===-1?seatName(0):seatName(G.turn+1);
  var extra=G.dblPending>0?' — double move, hop '+(3-G.dblPending)+' of 2':'';
  b.innerHTML='<div class="r">ROUND '+round+' / 24'+(isRev?'<span class="revtag">REVEAL ROUND</span>':'')+'</div>'+
    '<div class="w'+(mine?' you':'')+'">'+who+(mine?' — your move':'')+extra+'</div>';
  var hint=$('#dblHint');
  if(G.dblPending>0&&mine){hint.hidden=false;hint.innerHTML='Double move: pick hop <b>'+(3-G.dblPending)+' of 2</b>';}
  else hint.hidden=true;
}
function tkChip(cls,txt){return '<span class="tk '+cls+'">'+txt+'</span>';}
function renderPlayers(){
  var h='',cur=G.turn===-1?0:G.turn+1;
  // Mr X row
  var xst=canSeeMrx()?G.mrx.st:(G.rev?G.rev+'?':'???');
  h+='<div class="prow'+(cur===0&&!G.winner?' on':'')+'">'+
     '<span class="dot" style="background:#0B0D10;border:2px solid #F2C230"></span>'+
     '<span class="nm">'+seatName(0)+'</span>'+
     '<span class="tks">'+tkChip('x','●'+G.mrx.black)+tkChip('d','2×'+G.mrx.dbl)+'</span>'+
     '<span class="st mono">'+xst+'</span></div>';
  G.dets.forEach(function(d,i){
    h+='<div class="prow'+(cur===i+1&&!G.winner?' on':'')+'">'+
       '<span class="dot" style="background:'+DCOL[i%5]+'"></span>'+
       '<span class="nm">'+seatName(i+1)+'</span>'+
       '<span class="tks">'+tkChip('t',d.t)+tkChip('b',d.b)+tkChip('u',d.u)+'</span>'+
       '<span class="st mono">'+d.st+'</span></div>';
  });
  $('#playersCard').innerHTML=h;
}
var LOG_TK_LABEL={t:'T',b:'B',u:'U',x:'●'};
function renderLog(){
  var h='';
  for(var i=0;i<MAX_ROUND;i++){
    var e=G.log[i],cls='lcell',val='',tkl='',isRev=REVEALS.indexOf(i+1)>=0;
    if(isRev)cls+=' rv';
    if(e){
      cls+=' f-'+e.tk;
      val=(e.rv||G.winner)?e.st:(e.tk==='x'?'●':'?');
      tkl=e.tk==='x'?'':LOG_TK_LABEL[e.tk];
    }
    if(!G.winner&&G.turn===-1&&i===G.log.length)cls+=' now';
    h+='<div class="'+cls+'" data-i="'+i+'"><span class="idx">'+(i+1)+'</span>'+(tkl?'<span class="tkl">'+tkl+'</span>':'')+'<span class="val">'+val+'</span></div>';
  }
  $('#logGrid').innerHTML=h;
}
function stampLog(){
  var i=G.log.length-1,c=$('#logGrid').children[i];
  if(c)c.classList.add('stamp');
}
function renderCtrls(){
  var db=$('#dblBtn');
  $('#dblN').textContent=G.mrx.dbl;
  var can=!G.winner&&G.turn===-1&&iControlCurrent()&&G.mrx.dbl>0&&G.dblPending===0&&G.log.length<MAX_ROUND-1&&!UI.busy;
  db.disabled=!can;
  db.style.display=(isNet()?G.seats[0].pid===MYID:G.seats[0].kind==='human')?'':'none';
  var ps=$('#psBtn');
  var n=UI.showPs?possibleSet(G).size:null;
  ps.textContent=UI.showPs?'Hide possible Mr. X spots ('+(n===null?'':n)+')':'Show possible Mr. X spots';
}
function renderHighlights(){
  var h='';
  if(G&&!G.winner&&iControlCurrent()&&!UI.busy&&(!UI.privacy||G.turn!==-1||UI.mrxViewing)){
    var moves=G.turn===-1?mrxMoves(G):detMoves(G,G.turn);
    var seen={};
    moves.forEach(function(m){
      if(seen[m.to])return;seen[m.to]=1;
      h+='<circle class="hlring" cx="'+POS[m.to].x+'" cy="'+POS[m.to].y+'" r="14.5"/>';
    });
    // ring current piece
    var st=G.turn===-1?G.mrx.st:G.dets[G.turn].st;
    if(G.turn!==-1||canSeeMrx())
      h+='<circle cx="'+POS[st].x+'" cy="'+POS[st].y+'" r="16" fill="none" stroke="#E9EEF4" stroke-width="1.4" stroke-dasharray="3 3" pointer-events="none"/>';
  }
  LAYER.hl.innerHTML=h;
}
/* ---------------- toast / modal ---------------- */
var toastT=null;
function toast(msg){
  var t=$('#toast');t.textContent=msg;t.classList.add('show');
  clearTimeout(toastT);toastT=setTimeout(function(){t.classList.remove('show');},2600);
}
function showModal(html){$('#modalBox').innerHTML=html;$('#modal').hidden=false;}
function hideModal(){$('#modal').hidden=true;}
/* ---------------- move flow ---------------- */
var lastTap={t:0,id:0};
function onStationClick(id,ev){
  var now=Date.now();
  if(now-lastTap.t<300&&lastTap.id===id)return;
  lastTap={t:now,id:id};
  if(!G||G.winner||UI.busy||!iControlCurrent()){return;}
  if(UI.privacy&&G.turn===-1&&!UI.mrxViewing)return;
  var moves=(G.turn===-1?mrxMoves(G):detMoves(G,G.turn)).filter(function(m){return m.to===id;});
  if(!moves.length){sfx('deny');return;}
  sfx('click');
  if(moves.length===1){commitMove(moves[0]);return;}
  openChooser(moves,ev);
}
var chooserOpenedAt=0;
function openChooser(moves,ev){
  chooserOpenedAt=Date.now();
  var ch=$('#chooser'),wrap=$('#mapwrap').getBoundingClientRect();
  var names={t:'Taxi',b:'Bus',u:'Underground',x:'Black ticket'};
  var icons={t:'🚕',b:'🚌',u:'🚇',x:'⚫'};
  var h='<div class="chooserhead">Travel by</div>';
  moves.forEach(function(m,i){
    var extra=m.tk==='x'?'<small>'+G.mrx.black+' left</small>':'';
    h+='<button class="tkbtn '+m.tk+'" data-i="'+i+'"><span class="tkico">'+icons[m.tk]+'</span>'+names[m.tk]+' → '+m.to+extra+'</button>';
  });
  ch.innerHTML=h;ch.hidden=false;
  var x=Math.min(wrap.width-190,Math.max(8,ev.clientX-wrap.left+10));
  var y=Math.min(wrap.height-46*moves.length-40,Math.max(8,ev.clientY-wrap.top+10));
  ch.style.left=x+'px';ch.style.top=y+'px';
  Array.prototype.forEach.call(ch.querySelectorAll('button'),function(b){
    b.onclick=function(e){e.stopPropagation();ch.hidden=true;commitMove(moves[+b.dataset.i]);};
  });
}
document.addEventListener('click',function(){
  if(Date.now()-chooserOpenedAt<350)return;
  var c=$('#chooser');if(c)c.hidden=true;
});
async function commitMove(m){
  if(UI.busy)return;
  if(G.turn===-1)await doMrxMove(m);
  else await doDetMove(G.turn,m);
}
async function doMrxMove(m){
  UI.busy=true;renderHighlights();
  var from=G.mrx.st;
  var visible=canSeeMrx();
  if(visible)await animateVehicle(from,m.to,m.tk);
  else await hiddenMoveFx(m.tk);
  var wasDbl=G.dblPending>0;
  applyMrx(G,m);
  stampAndReveal();
  UI.busy=false;
  afterAnyMove(wasDbl);
}
async function doDetMove(i,m){
  UI.busy=true;renderHighlights();
  var from=G.dets[i].st;
  await animateVehicle(from,m.to,m.tk);
  applyDet(G,i,m);
  UI.busy=false;
  afterAnyMove(false);
}
function stampAndReveal(){
  render();stampLog();
  var lm=G.lastMove;
  if(lm&&lm.who==='mrx'&&lm.rv){
    sfx('reveal');revealPing(lm.to);
    toast('Mr. X surfaces at station '+lm.to+'!');
  }
}
function afterAnyMove(){
  render();
  if(isNet())netPush();
  if(G.winner){onGameOver();return;}
  // hot-seat privacy handoff
  if(UI.privacy&&!isNet()){
    if(G.turn===-1&&currentSeat().kind==='human'&&!UI.mrxViewing){askPassToMrx();return;}
    if(G.turn!==-1&&UI.mrxViewing){UI.mrxViewing=false;render();askPassToDets();return;}
  }
  maybeBot();
}
function askPassToMrx(){
  showModal('<div class="handoff"><div class="handoff-icon">🕵️</div><h2>Pass the device to Mr. X</h2><p>Detectives, look away — Mr. X\'s position appears next.</p></div>'+
    '<button class="btn" id="mOK">I\'m Mr. X — show the board</button>');
  $('#mOK').onclick=function(){hideModal();UI.mrxViewing=true;sfx('click');render();};
}
function askPassToDets(){
  showModal('<div class="handoff"><div class="handoff-icon">🔎</div><h2>Hand the device back</h2><p>Mr. X\'s position is hidden again. Detectives, you\'re up.</p></div>'+
    '<button class="btn" id="mOK">Continue</button>');
  $('#mOK').onclick=function(){hideModal();sfx('click');render();maybeBot();};
}
/* ---------------- bot driver (local) ---------------- */
function maybeBot(){
  if(!G||G.winner||isNet())return;
  var s=currentSeat();
  if(s.kind!=='bot'||UI.botTimer||UI.busy)return;
  UI.botTimer=setTimeout(async function(){
    UI.botTimer=null;
    await botAct();
    if(!G.winner)maybeBot();
  },700);
}
async function botAct(){
  if(!G||G.winner)return;
  if(G.turn===-1){
    var p=botMrxPick(G,G.seats[0].diff);
    if(!p)return;
    if(p.dbl&&startDouble(G)){toast('Mr. X plays a double move!');render();await wait(500);}
    await doMrxMove(p.move);
    while(!G.winner&&G.dblPending>0&&G.turn===-1){
      var p2=botMrxPick(G,G.seats[0].diff);
      if(!p2)break;
      await wait(350);
      await doMrxMove(p2.move);
    }
  }else{
    var m=botDetPick(G,G.turn,G.seats[G.turn+1].diff);
    if(m)await doDetMove(G.turn,m);
  }
}
function wait(ms){return new Promise(function(r){setTimeout(r,ms);});}
/* ---------------- game over ---------------- */
function onGameOver(){
  render();
  var meIsX=isNet()?G.seats[0].pid===MYID:G.seats[0].kind==='human';
  var iWon=(G.winner==='mrx')===meIsX;
  sfx(G.seats.some(function(s){return s.kind==='human';})?(iWon?'win':'lose'):'win');
  var names={t:'T',b:'B',u:'U',x:'●'};
  var route='';
  G.log.forEach(function(e,i){
    route+='<span class="tk '+e.tk+'" title="Round '+(i+1)+'">'+e.st+'</span>';
  });
  showModal('<h2>'+(G.winner==='mrx'?'Mr. X vanished into the night':'Scotland Yard closes the net')+'</h2>'+
    '<p>'+G.reason+'</p>'+
    '<div class="cardhead" style="margin-top:10px">Mr. X\'s full route</div>'+
    '<div class="routelist">'+(route||'<span class="muted tiny">He never moved.</span>')+'</div>'+
    (isNet()?'':'<button class="btn" id="mAgain">Rematch — same seats</button>')+
    '<button class="btn ghost" id="mLobby" style="margin-top:8px">Back to lobby</button>');
  var again=$('#mAgain');
  if(again)again.onclick=function(){hideModal();startLocalGame(G.seats);};
  $('#mLobby').onclick=function(){hideModal();leaveToLobby();};
}
// ============ LOBBY / NET / BOOT ============
var MYID=Math.random().toString(36).slice(2,10);
var NET={code:null,isHost:false,v:0,timer:null,busy:false,room:null};
function hasNet(){try{return typeof window!=='undefined'&&window.storage&&typeof window.storage.get==='function';}catch(e){return false;}}
function KEY(c){return 'syroom_'+c;}
function myName(){return ($('#nameIn').value||'').trim()||'Player';}
async function readRoom(code){
  try{
    var r=await window.storage.get(KEY(code),true);
    return r&&r.value?JSON.parse(r.value):null;
  }catch(e){return null;}
}
async function writeRoom(room){
  room.v=(room.v||0)+1;room.t=Date.now();
  try{await window.storage.set(KEY(room.code),JSON.stringify(room),true);NET.v=room.v;return true;}
  catch(e){toast('Couldn\'t reach shared storage — move not synced.');return false;}
}
async function rmw(code,fn){
  var r=await readRoom(code);
  if(!r){toast('Room not found.');return null;}
  fn(r);
  await writeRoom(r);
  return r;
}
/* ------- local lobby seats ------- */
var localSeats=[
  {kind:'bot',diff:'hard'},          // Mr X
  {kind:'human'},                    // Det 1
  {kind:'bot',diff:'hard'},
  {kind:'bot',diff:'hard'},
  {kind:'bot',diff:'hard'},
  {kind:'empty'}
];
function seatLabel(i){return i===0?'Mr. X':'Detective '+i;}
function seatDotColor(i){return i===0?'#0B0D10':DCOL[(i-1)%5];}
function renderLocalSeats(){
  var h='';
  for(var i=0;i<6;i++){
    var s=localSeats[i];
    var val=s.kind==='human'?'human':s.kind==='empty'?'empty':'bot-'+s.diff;
    h+='<div class="seatrow"><span class="who"><span class="dot" style="background:'+seatDotColor(i)+(i===0?';border:2px solid #F2C230':'')+'"></span>'+seatLabel(i)+'</span>'+
      '<select data-i="'+i+'">'+
      '<option value="human"'+(val==='human'?' selected':'')+'>Human (this device)</option>'+
      '<option value="bot-easy"'+(val==='bot-easy'?' selected':'')+'>Bot — easy</option>'+
      '<option value="bot-hard"'+(val==='bot-hard'?' selected':'')+'>Bot — hard</option>'+
      (i>=2?'<option value="empty"'+(val==='empty'?' selected':'')+'>Empty seat</option>':'')+
      '</select></div>';
  }
  $('#seatList').innerHTML=h;
  Array.prototype.forEach.call($('#seatList').querySelectorAll('select'),function(sel){
    sel.onchange=function(){
      var i=+sel.dataset.i,v=sel.value;
      localSeats[i]=v==='human'?{kind:'human'}:v==='empty'?{kind:'empty'}:{kind:'bot',diff:v.split('-')[1]};
    };
  });
}
function buildGameSeats(cfg,nameForHumans){
  var seats=[];
  cfg.forEach(function(s,i){
    if(i>0&&s.kind==='empty')return;
    if(i===0&&s.kind==='empty')s={kind:'bot',diff:'hard'};
    var t={kind:s.kind==='human'?'human':'bot',diff:s.diff||'hard',name:s.name||(s.kind==='human'?nameForHumans:''),pid:s.pid||null};
    seats.push(t);
  });
  return seats;
}
function startLocalGame(prebuilt){
  var seats=prebuilt||buildGameSeats(localSeats,myName());
  if(seats.length<2){toast('You need at least one detective.');return;}
  G=newGame(seats);
  UI.privacy=!prebuilt? (seats[0].kind==='human'&&seats.slice(1).some(function(s){return s.kind==='human';}))
                      : (G.seats[0].kind==='human'&&G.seats.slice(1).some(function(s){return s.kind==='human';}));
  UI.mrxViewing=false;UI.showPs=false;UI.busy=false;
  enterGame();
  if(UI.privacy&&G.turn===-1&&G.seats[0].kind==='human'){askPassToMrx();}
  else maybeBot();
}
function enterGame(){
  $('#screen-lobby').hidden=true;
  $('#screen-game').hidden=false;
  buildMap();
  VB={x:0,y:0,w:1000,h:MAP_H};setVB();
  render();
}
function leaveToLobby(){
  if(UI.botTimer){clearTimeout(UI.botTimer);UI.botTimer=null;}
  if(NET.timer){clearInterval(NET.timer);NET.timer=null;}
  if(NET.code&&NET.room&&NET.room.phase==='lobby'){
    rmw(NET.code,function(r){r.seats.forEach(function(s){if(s.pid===MYID){s.kind='open';s.pid=null;s.name='';}});});
  }
  NET.code=null;NET.isHost=false;NET.v=0;NET.room=null;
  G=null;
  $('#roomBadge').hidden=true;
  $('#screen-game').hidden=true;
  $('#screen-lobby').hidden=false;
  $('#hostLobby').hidden=true;
  $('#joinLobby').hidden=true;
}
/* ------- net lobby ------- */
function defaultNetSeats(){
  return [
    {kind:'open'},{kind:'open'},
    {kind:'bot',diff:'hard'},{kind:'bot',diff:'hard'},
    {kind:'empty'},{kind:'empty'}
  ];
}
function renderNetSeats(el,room,amHost){
  var h='';
  room.seats.forEach(function(s,i){
    var right;
    if(s.kind==='human'){
      right='<span class="claimed">'+(s.name||'Player')+(s.pid===MYID?' (you)':'')+(s.pid===room.hostId?' · host':'')+'</span>'+
        (s.pid===MYID?'<button class="ghostbtn" data-act="release" data-i="'+i+'">leave seat</button>':'');
    }else if(amHost){
      var val=s.kind==='open'?'open':s.kind==='empty'?'empty':'bot-'+s.diff;
      right='<select data-act="cfg" data-i="'+i+'">'+
        '<option value="open"'+(val==='open'?' selected':'')+'>Open — waiting for player</option>'+
        '<option value="bot-easy"'+(val==='bot-easy'?' selected':'')+'>Bot — easy</option>'+
        '<option value="bot-hard"'+(val==='bot-hard'?' selected':'')+'>Bot — hard</option>'+
        (i>=2?'<option value="empty"'+(val==='empty'?' selected':'')+'>Empty seat</option>':'')+
        '</select>'+(s.kind==='open'?'<button class="claimbtn" data-act="claim" data-i="'+i+'">sit here</button>':'');
    }else{
      right=s.kind==='open'?'<button class="claimbtn" data-act="claim" data-i="'+i+'">sit here</button>'
        :s.kind==='empty'?'<span class="claimed muted">empty</span>'
        :'<span class="claimed muted">bot ('+s.diff+')</span>';
    }
    h+='<div class="seatrow"><span class="who"><span class="dot" style="background:'+seatDotColor(i)+(i===0?';border:2px solid #F2C230':'')+'"></span>'+seatLabel(i)+'</span>'+right+'</div>';
  });
  el.innerHTML=h;
  Array.prototype.forEach.call(el.querySelectorAll('[data-act]'),function(b){
    var i=+b.dataset.i;
    if(b.dataset.act==='claim')b.onclick=function(){netClaim(i);};
    if(b.dataset.act==='release')b.onclick=function(){netRelease(i);};
    if(b.dataset.act==='cfg')b.onchange=function(){netCfg(i,b.value);};
  });
}
async function netClaim(i){
  sfx('click');
  var room=await rmw(NET.code,function(r){
    r.seats.forEach(function(s){if(s.pid===MYID){s.kind='open';s.pid=null;s.name='';}});
    if(r.seats[i].kind==='open'){r.seats[i]={kind:'human',pid:MYID,name:myName()};}
  });
  if(room)adoptRoom(room);
}
async function netRelease(i){
  var room=await rmw(NET.code,function(r){
    if(r.seats[i].pid===MYID)r.seats[i]={kind:'open',pid:null,name:''};
  });
  if(room)adoptRoom(room);
}
async function netCfg(i,val){
  var room=await rmw(NET.code,function(r){
    if(r.seats[i].kind==='human')return;
    r.seats[i]=val==='open'?{kind:'open'}:val==='empty'?{kind:'empty'}:{kind:'bot',diff:val.split('-')[1]};
  });
  if(room)adoptRoom(room);
}
function adoptRoom(room){
  NET.room=room;NET.v=room.v;
  if(room.phase==='lobby'){
    var el=NET.isHost?$('#seatListNet'):$('#seatListJoin');
    renderNetSeats(el,room,NET.isHost);
  }else if(room.phase==='playing'&&room.game){
    adoptGame(room.game);
  }
}
function adoptGame(g){
  var prevMv=G?G.mv:-1;
  var animate=G&&g.mv===prevMv+1&&g.lastMove;
  var wasOver=G&&G.winner;
  G=g;
  if($('#screen-game').hidden)enterGame();
  if(animate){
    var lm=g.lastMove;
    UI.busy=true;render();
    var vis=lm.who!=='mrx'||canSeeMrx();
    var p=vis?animateVehicle(lm.from,lm.to,lm.tk):hiddenMoveFx(lm.tk);
    p.then(function(){
      UI.busy=false;
      stampAndReveal();render();
      if(G.winner&&!wasOver)onGameOver();
      hostDriveBots();
    });
  }else{
    render();
    if(G.winner&&!wasOver)onGameOver();
    hostDriveBots();
  }
}
async function netPush(){
  if(!NET.code)return;
  var g=G;
  await rmw(NET.code,function(r){
    if(r.game&&r.game.mv>g.mv){G=r.game;render();return;}
    r.game=g;r.phase='playing';
  });
  hostDriveBots();
}
function hostDriveBots(){
  if(!NET.code||!NET.isHost||!G||G.winner||NET.busy||UI.busy)return;
  if(currentSeat().kind!=='bot')return;
  NET.busy=true;
  setTimeout(async function(){
    try{
      if(!G||G.winner||currentSeat().kind!=='bot'){NET.busy=false;return;}
      await botAct(); // animates locally, applies to G; afterAnyMove -> netPush already syncs
    }finally{
      NET.busy=false;
      hostDriveBots();
    }
  },800);
}
function startPolling(){
  if(NET.timer)clearInterval(NET.timer);
  NET.timer=setInterval(async function(){
    if(!NET.code)return;
    var room=await readRoom(NET.code);
    if(!room)return;
    if(room.v>NET.v){adoptRoom(room);}
    else hostDriveBots();
  },2000);
}
function randCode(){
  var a='ABCDEFGHJKMNPQRSTUVWXYZ',s='';
  for(var i=0;i<5;i++)s+=a[Math.floor(Math.random()*a.length)];
  return s;
}
async function createRoomFlow(){
  sfx('click');
  var code=randCode();
  var room={code:code,v:0,hostId:MYID,phase:'lobby',seats:defaultNetSeats()};
  room.seats[1]={kind:'human',pid:MYID,name:myName()}; // host defaults to Detective 1
  var ok=await writeRoom(room);
  if(!ok)return;
  NET.code=code;NET.isHost=true;NET.room=room;
  $('#hostLobby').hidden=false;
  $('#createRoom').hidden=true;
  $('#codeOut').textContent=code;
  $('#roomBadge').textContent='ROOM '+code;$('#roomBadge').hidden=false;
  renderNetSeats($('#seatListNet'),room,true);
  startPolling();
}
async function joinRoomFlow(){
  sfx('click');
  var code=($('#codeIn').value||'').trim().toUpperCase();
  if(code.length!==5){toast('Room codes are 5 letters.');return;}
  var room=await readRoom(code);
  if(!room){toast('No room with that code.');return;}
  NET.code=code;NET.isHost=room.hostId===MYID;NET.room=room;
  $('#roomBadge').textContent='ROOM '+code;$('#roomBadge').hidden=false;
  $('#joinLobby').hidden=false;
  adoptRoom(room);
  startPolling();
}
async function startNetGame(){
  sfx('click');
  var room=await readRoom(NET.code);
  if(!room)return;
  var cfg=room.seats.map(function(s){return s.kind==='open'?{kind:'bot',diff:'hard'}:s;});
  var seats=buildGameSeats(cfg,'');
  if(seats.length<2){toast('You need at least one detective.');return;}
  var g=newGame(seats);
  room.phase='playing';room.game=g;
  await writeRoom(room);
  NET.room=room;
  adoptGame(g);
}
/* ------- rules modal ------- */
function showRules(){
  showModal('<h2>How to play</h2>'+
  '<p><b>Mr. X</b> is hiding somewhere in London. Every round he moves first — in secret. Only the <b>ticket type</b> he plays is public. On rounds <b style="color:var(--gold)">3, 8, 13, 18 and 24</b> he must surface and show his station.</p>'+
  '<p><b>Detectives</b> then each move once, spending a matching ticket (10 taxi, 8 bus, 4 underground; when they\'re gone, they\'re gone). Two detectives can\'t share a station. Land on Mr. X and the chase is over.</p>'+
  '<p><b>Black tickets</b> let Mr. X ride anything — including the Thames ferry — without revealing the transport type. <b>Double-move</b> cards let him move twice in one round.</p>'+
  '<p>Click a highlighted station to move. If several transports reach it, pick your ticket. Drag to pan, scroll or pinch to zoom.</p>'+
  '<p class="tiny">Digital adaptation note: Mr. X\'s taxi/bus/underground tickets are unlimited here (in the tabletop game he recycles the detectives\' spent tickets, which almost never runs dry).</p>'+
  '<button class="btn" id="mOK">Got it</button>');
  $('#mOK').onclick=hideModal;
}
/* ------- boot ------- */
function boot(){
  renderLocalSeats();
  // tabs
  Array.prototype.forEach.call(document.querySelectorAll('.tab'),function(t){
    t.onclick=function(){
      Array.prototype.forEach.call(document.querySelectorAll('.tab'),function(x){x.classList.remove('on');});
      t.classList.add('on');
      ['local','host','join'].forEach(function(n){$('#tab-'+n).hidden=n!==t.dataset.tab;});
      if(t.dataset.tab!=='local'&&!hasNet()){
        $('#netUnavail').hidden=false;$('#netUnavail2').hidden=false;
        $('#hostArea').style.display=t.dataset.tab==='host'?'none':'';
        $('#joinRoom').disabled=true;$('#codeIn').disabled=true;
      }
    };
  });
  $('#startLocal').onclick=function(){sfx('click');startLocalGame();};
  $('#createRoom').onclick=createRoomFlow;
  $('#joinRoom').onclick=joinRoomFlow;
  $('#startNet').onclick=startNetGame;
  $('#copyCode').onclick=function(){
    try{navigator.clipboard.writeText($('#codeOut').textContent);toast('Code copied.');}catch(e){}
  };
  $('#helpBtn').onclick=showRules;
  $('#sndBtn').onclick=function(){
    UI.soundOn=!UI.soundOn;
    $('#sndBtn').textContent=UI.soundOn?'🔊 Sound':'🔇 Muted';
    if(UI.soundOn)sfx('click');
  };
  $('#dblBtn').onclick=function(){
    if(startDouble(G)){sfx('click');toast('Double move armed — two hops this round.');render();}
  };
  $('#psBtn').onclick=function(){UI.showPs=!UI.showPs;sfx('click');render();};
  $('#leaveBtn').onclick=function(){sfx('click');leaveToLobby();};
  $('#modal').addEventListener('click',function(e){if(e.target.id==='modal'&&G&&!G.winner&&!UI.privacy)hideModal();});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'){var c=$('#chooser');if(c)c.hidden=true;}});
}
if(typeof document!=='undefined')boot();
