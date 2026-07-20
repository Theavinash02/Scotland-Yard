/* ================= enhancements =================
   Player-facing polish layered on the plain game object: persisted settings
   (theme / volume / music / motion / contrast / bot speed), a screen-reader
   live region + keyboard-accessible move list, the next-reveal HUD, an
   AI move hint, snapshot-based undo, a proximity readout, ambient music, the
   possible-locations belief heatmap, achievements, and the end-game debrief.
   Extracted from ui.js. Loaded before ui.js so its globals (SETTINGS, etc.)
   exist when ui.js boot() runs; everything it calls in ui.js is invoked at
   runtime, after all scripts have loaded. */
/* ============ v5 enhancements ============
   Player-facing polish layered on top of the game state, all reading from the
   same plain game object: persisted settings (volume / motion / bot speed /
   contrast), a screen-reader live region + keyboard-accessible move list, a
   "next reveal" HUD, an AI-powered move hint, and an end-of-game debrief. */
// Selectable map "board styles". Night is the default lit chase board; Day is
// the original untouched parchment; the rest are realism-oriented modes drawn
// from a shared procedural detail substrate (roads/blocks/city-lights/grid).
var BOARD_MODES=['night','day','aerial','atlas','tabletop','blueprint'];
var BOARD_LABELS={night:'Night — neon chase board',day:'Day — vintage parchment',aerial:'Aerial — city from above at night',atlas:'Atlas — printed street map',tabletop:'Tabletop — physical board on a table',blueprint:'Blueprint — tactical recon'};
var SETTINGS={volume:1,reduceMotion:false,botSpeed:'normal',highContrast:false,theme:'dark',music:false,board:'night'};
function loadSettings(){
  try{
    var s=JSON.parse(localStorage.getItem('sy_settings')||'{}');
    if(typeof s.volume==='number')SETTINGS.volume=Math.min(1,Math.max(0,s.volume));
    if(typeof s.reduceMotion==='boolean')SETTINGS.reduceMotion=s.reduceMotion;
    if(s.botSpeed==='slow'||s.botSpeed==='normal'||s.botSpeed==='fast')SETTINGS.botSpeed=s.botSpeed;
    if(typeof s.highContrast==='boolean')SETTINGS.highContrast=s.highContrast;
    if(s.theme==='dark'||s.theme==='light')SETTINGS.theme=s.theme;
    if(BOARD_MODES.indexOf(s.board)>=0)SETTINGS.board=s.board;
    if(typeof s.music==='boolean')SETTINGS.music=s.music;
  }catch(e){}
  applySettings();
}
function saveSettings(){try{localStorage.setItem('sy_settings',JSON.stringify(SETTINGS));}catch(e){}}
function applySettings(){
  document.body.classList.toggle('reduce-motion',SETTINGS.reduceMotion);
  document.body.classList.toggle('hc',SETTINGS.highContrast);
  document.body.classList.toggle('theme-light',SETTINGS.theme==='light');
  // One board-<mode> class at a time drives the map styling (styles.css). Day
  // adds board-day but has no overrides, so it renders the original parchment.
  BOARD_MODES.forEach(function(m){document.body.classList.toggle('board-'+m,SETTINGS.board===m);});
  // Family class so the dark modes (night/aerial/blueprint) share one base.
  document.body.classList.toggle('board-dark',['night','aerial','blueprint'].indexOf(SETTINGS.board)>=0);
  if(typeof musicUpdate==='function')musicUpdate();
}
function masterVol(){return SETTINGS.volume;}
var BOT_DELAY={slow:1150,normal:700,fast:280};
function botDelayMs(){return BOT_DELAY[SETTINGS.botSpeed]||700;}

/* Screen-reader announcements via the #srLive polite live region. Repeats of
   the same string are suppressed so re-renders don't spam assistive tech. */
var lastAnnounce='';
function announce(msg){
  if(!msg||msg===lastAnnounce)return;
  lastAnnounce=msg;
  var el=$('#srLive');if(el)el.textContent=msg;
}

var TK_ICON={t:'🚕',b:'🚌',u:'🚇',x:'⚫'},TK_WORD={t:'Taxi',b:'Bus',u:'Underground',x:'Black ticket'};
// The reveal round Mr. X's *next* move falls on, or null if none remain.
function nextRevealRound(){
  var up=(G?G.log.length:0)+1,rev=gReveals(G);
  for(var i=0;i<rev.length;i++)if(rev[i]>=up)return rev[i];
  return null;
}
function movesForCurrent(){
  return G.turn===-1?mrxMoves(G):detMoves(G,G.turn);
}
function canActNow(){
  return G&&!G.winner&&iControlCurrent()&&!UI.busy&&(!UI.privacy||G.turn!==-1||UI.mrxViewing);
}
// Repurposes the (previously empty) #turnCard: reveal HUD + accessible move list
// + hint button, giving keyboard/screen-reader users a first-class way to move.
function renderTurnCard(){
  var el=$('#turnCard');if(!el)return;
  if(!G){el.innerHTML='';return;}
  var h='';
  // --- reveal HUD ---
  if(!G.winner){
    var up=G.log.length+1,nr=nextRevealRound(),until=nr===null?null:nr-up;
    if(until===0){
      h+='<div class="revhud now"><span class="revnum">!</span><span class="revlbl"><b>Mr. X surfaces</b> on this round ('+nr+')</span></div>';
    }else if(until!==null){
      h+='<div class="revhud"><span class="revnum">'+until+'</span><span class="revlbl">round'+(until===1?'':'s')+' until <b>Mr. X surfaces</b> (round '+nr+')</span></div>';
    }else{
      h+='<div class="revhud"><span class="revnum">✓</span><span class="revlbl">No reveals left — the final stretch</span></div>';
    }
  }
  // --- accessible move list ---
  if(canActNow()){
    var moves=movesForCurrent();
    var suggest=(UI.hint&&UI.hint.mv===G.mv)?UI.hint:null;
    h+=dangerHtml();
    h+='<div class="moveshead"><div class="cardhead" style="margin:0">Your moves</div><span class="tiny muted">'+moves.length+'</span></div>';
    h+='<div id="movesList" role="list" aria-label="Available moves">';
    moves.forEach(function(m,i){
      var sug=suggest&&suggest.to===m.to&&suggest.tk===m.tk?' suggest':'';
      var extra=m.tk==='x'?' ('+G.mrx.black+' left)':'';
      h+='<button class="movebtn '+m.tk+sug+'" role="listitem" data-i="'+i+'" '+
         'aria-label="Move to station '+m.to+' by '+TK_WORD[m.tk]+extra+'">'+
         '<span class="mvico">'+TK_ICON[m.tk]+'</span>'+TK_WORD[m.tk]+extra+
         '<span class="mvto">'+m.to+'</span></button>';
    });
    h+='</div>';
    h+='<div class="tcbtns"><button id="hintBtn" class="btn ghost">💡 Hint</button>'+
       (canUndo()?'<button id="undoBtn" class="btn ghost">↶ Undo</button>':'')+'</div>';
  }else if(!G.winner){
    var who=G.turn===-1?seatName(0):seatName(G.turn+1);
    h+='<div class="tc-empty">Waiting for '+who+'…</div>';
  }
  el.innerHTML=h;
  var list=$('#movesList');
  if(list){
    var mv=movesForCurrent();
    Array.prototype.forEach.call(list.querySelectorAll('.movebtn'),function(b){
      b.onclick=function(){var m=mv[+b.dataset.i];if(!m)return;sfx('click');commitMove(m);};
    });
  }
  var hb=$('#hintBtn');if(hb)hb.onclick=suggestMove;
  var ub=$('#undoBtn');if(ub)ub.onclick=doUndo;
  announceTurn();
}
// A cheap proximity readout for the current human: how close the danger is.
function dangerHtml(){
  if(G.turn===-1){
    var mind=1e9;G.dets.forEach(function(d){var dd=DIST[G.mrx.st][d.st];if(dd<mind)mind=dd;});
    if(mind===1e9)return '';
    var cls=mind<=2?' hot':'';
    return '<div class="danger'+cls+'"><span class="dgn">'+mind+'</span> hop'+(mind===1?'':'s')+' to the nearest detective</div>';
  }
  var ps=possibleSet(G),me=G.dets[G.turn].st,best=1e9;
  ps.forEach(function(s){var dd=DIST[me][s];if(dd<best)best=dd;});
  if(best===1e9)return '<div class="danger">Mr. X\'s trail has gone cold</div>';
  var close=best<=2;
  return '<div class="danger'+(close?' hot':'')+'"><span class="dgn">'+(best===0?'0':'~'+best)+'</span> hop'+(best===1?'':'s')+' to the nearest suspect station</div>';
}
function announceTurn(){
  if(!G)return;
  if(G.winner){announce((G.winner==='mrx'?'Mr. X escaped. ':'Detectives win. ')+G.reason);return;}
  var round=G.turn===-1?G.log.length+1:G.log.length;if(round<1)round=1;
  if(canActNow()){
    var n=movesForCurrent().length;
    announce('Round '+round+'. Your move'+(G.turn===-1?' as Mr. X':' as Detective '+(G.turn+1))+'. '+n+' move'+(n===1?'':'s')+' available.');
  }else{
    var who=G.turn===-1?'Mr. X':'Detective '+(G.turn+1);
    announce('Round '+round+'. '+who+' to move.');
  }
}
// AI-powered hint: reuses the tested hard-difficulty bot logic to suggest a move
// for whichever side the human is playing, then flashes it on the board.
function suggestMove(){
  if(!canActNow())return;
  sfx('click');
  var m=G.turn===-1?(botMrxPick(G,'hard')||{}).move:botDetPick(G,G.turn,'hard');
  if(!m){toast('No suggestion available.');return;}
  UI.hint={mv:G.mv,to:m.to,tk:m.tk};
  renderTurnCard();
  var p=POS[m.to];if(p)focusStation(p.x,p.y);
  if(typeof revealPing==='function')revealPing(m.to);
  var msg='Suggested: '+TK_WORD[m.tk]+' to station '+m.to;
  toast('💡 '+msg);announce(msg);
}
function showSettings(){
  var volPct=Math.round(SETTINGS.volume*100);
  var seg=function(v,label){return '<button data-speed="'+v+'" class="'+(SETTINGS.botSpeed===v?'on':'')+'">'+label+'</button>';};
  var thseg=function(v,label){return '<button data-theme="'+v+'" class="'+(SETTINGS.theme===v?'on':'')+'">'+label+'</button>';};
  var bdopts=BOARD_MODES.map(function(v){return '<option value="'+v+'"'+(SETTINGS.board===v?' selected':'')+'>'+BOARD_LABELS[v]+'</option>';}).join('');
  showModal('<h2>Settings</h2>'+
    '<div class="setrow"><div><div class="setlbl">Board style</div><div class="setsub">How the map itself is drawn — from the neon chase board to a night city, a printed atlas, a tabletop or a recon blueprint.</div></div>'+
      '<select id="setBoard" style="max-width:150px">'+bdopts+'</select></div>'+
    '<div class="setrow"><div><div class="setlbl">Theme</div><div class="setsub">Night operations or a daytime parchment look.</div></div>'+
      '<div class="setseg" id="setTheme">'+thseg('dark','Dark')+thseg('light','Light')+'</div></div>'+
    '<div class="setrow"><div><div class="setlbl">Sound volume</div><div class="setsub">Affects all game sound effects.</div></div>'+
      '<input id="setVol" type="range" min="0" max="100" value="'+volPct+'"></div>'+
    '<div class="setrow"><div><div class="setlbl">Ambient music</div><div class="setsub">A soft synthesized undercurrent during play.</div></div>'+
      '<label class="switch"><input id="setMusic" type="checkbox"'+(SETTINGS.music?' checked':'')+'><span class="track"></span></label></div>'+
    '<div class="setrow"><div><div class="setlbl">Bot move speed</div><div class="setsub">How long bots pause before moving.</div></div>'+
      '<div class="setseg" id="setSpeed">'+seg('slow','Slow')+seg('normal','Normal')+seg('fast','Fast')+'</div></div>'+
    '<div class="setrow"><div><div class="setlbl">Reduce motion</div><div class="setsub">Minimise animations across the app.</div></div>'+
      '<label class="switch"><input id="setMotion" type="checkbox"'+(SETTINGS.reduceMotion?' checked':'')+'><span class="track"></span></label></div>'+
    '<div class="setrow"><div><div class="setlbl">High-contrast board</div><div class="setsub">Bolder station numbers and routes.</div></div>'+
      '<label class="switch"><input id="setContrast" type="checkbox"'+(SETTINGS.highContrast?' checked':'')+'><span class="track"></span></label></div>'+
    '<button class="btn" id="mSetDone" style="margin-top:14px">Done</button>');
  var segWire=function(id,key,after){Array.prototype.forEach.call($(id).querySelectorAll('button'),function(b){
    b.onclick=function(){SETTINGS[key]=b.dataset[key];saveSettings();applySettings();
      Array.prototype.forEach.call($(id).querySelectorAll('button'),function(x){x.classList.toggle('on',x===b);});
      if(after)after();};});};
  $('#setBoard').onchange=function(){SETTINGS.board=this.value;saveSettings();applySettings();};
  segWire('#setTheme','theme');
  // Bot speed writes SETTINGS.botSpeed (not a generic key), so wire it explicitly.
  Array.prototype.forEach.call($('#setSpeed').querySelectorAll('button'),function(b){
    b.onclick=function(){SETTINGS.botSpeed=b.dataset.speed;saveSettings();
      Array.prototype.forEach.call($('#setSpeed').querySelectorAll('button'),function(x){x.classList.toggle('on',x===b);});};
  });
  $('#setVol').oninput=function(){SETTINGS.volume=(+this.value)/100;saveSettings();if(typeof musicSetVolume==='function')musicSetVolume();};
  $('#setVol').onchange=function(){sfx('click');};
  $('#setMusic').onchange=function(){SETTINGS.music=this.checked;saveSettings();applySettings();};
  $('#setMotion').onchange=function(){SETTINGS.reduceMotion=this.checked;applySettings();saveSettings();};
  $('#setContrast').onchange=function(){SETTINGS.highContrast=this.checked;applySettings();saveSettings();};
  $('#mSetDone').onclick=hideModal;
}
// Extra end-of-game stats appended to the game-over modal (see onGameOver).
function debriefHtml(){
  var cfg=resolveVariant(G.variant);
  var blackUsed=(G.nd+(cfg.blackBonus||0))-G.mrx.black,dblUsed=cfg.dbl-G.mrx.dbl,reveals=0;
  G.log.forEach(function(e){if(e.rv)reveals++;});
  var gap=1e9;G.dets.forEach(function(d){var dd=DIST[G.mrx.st][d.st];if(dd<gap)gap=dd;});
  if(gap===1e9)gap='—';
  function cell(v,l){return '<div class="dcell"><div class="dval">'+v+'</div><div class="dlbl">'+l+'</div></div>';}
  return '<div class="cardhead" style="margin-top:12px">Match debrief</div>'+
    '<div class="debrief">'+cell(G.log.length,'Rounds played')+cell(reveals,'Reveals forced')+
    cell(blackUsed,'Black tickets used')+cell(gap,'Final gap to Mr. X')+'</div>';
}

/* ---- Undo (local games only): snapshot-based rewind to the human's last
   decision point. Disabled online (no host authority to rewind) and in hot-seat
   privacy games (a rewind could leak Mr. X's hidden move to a detective sharing
   the device). A snapshot of the whole JSON-safe game object is pushed before
   every move; undo restores the most recent one that sits on a human's turn. */
function undoAllowed(){return !!G&&!isNet()&&!UI.privacy;}
function pushUndo(){
  if(!undoAllowed())return;
  if(!UI.undoStack)UI.undoStack=[];
  try{UI.undoStack.push(JSON.stringify(G));}catch(e){return;}
  if(UI.undoStack.length>80)UI.undoStack.shift();
}
function isHumanDecision(snapStr){
  var g;try{g=JSON.parse(snapStr);}catch(e){return false;}
  if(g.winner||g.dblPending)return false;
  var seat=g.turn===-1?g.seats[0]:g.seats[g.turn+1];
  return !!(seat&&seat.kind==='human');
}
function canUndo(){
  return undoAllowed()&&!UI.busy&&!!UI.undoStack&&UI.undoStack.some(isHumanDecision);
}
function doUndo(){
  if(!undoAllowed()||UI.busy||!UI.undoStack)return;
  var i=UI.undoStack.length-1;
  while(i>=0&&!isHumanDecision(UI.undoStack[i]))i--;
  if(i<0)return;
  if(UI.botTimer){clearTimeout(UI.botTimer);UI.botTimer=null;}
  try{G=JSON.parse(UI.undoStack[i]);}catch(e){return;}
  UI.undoStack=UI.undoStack.slice(0,i);
  UI.hint=null;UI.busy=false;
  sfx('click');
  persistLocalGame(G,{privacy:UI.privacy});
  render();
  toast('Move undone — your turn again.');
  announce('Move undone. Your turn again.');
}

/* ---- Achievements: derived purely from the local game-history log, so they
   need no extra tracking during play and stay in sync with what's recorded. */
var ACHIEVEMENTS=[
  {name:'First Collar',desc:'Win your first game.',emo:'🎉',test:function(a,s){return s.detWins+s.mrxWins>0;}},
  {name:'Double Agent',desc:'Win as both Mr. X and the detectives.',emo:'🎭',test:function(a,s){return s.mrxWins>0&&s.detWins>0;}},
  {name:'Dragnet',desc:'Win as the detectives in 8 rounds or fewer.',emo:'🚨',test:function(a){return a.some(function(e){return e.role==='det'&&e.result==='win'&&e.round<=8;});}},
  {name:'Ghost of London',desc:'Win as Mr. X by surviving to the final round.',emo:'👻',test:function(a){return a.some(function(e){return e.role==='mrx'&&e.result==='win'&&(e.full||e.round>=MAX_ROUND);});}},
  {name:'Table Manners',desc:'Play a game against other humans.',emo:'🧑‍🤝‍🧑',test:function(a){return a.some(function(e){return e.opponents==='human';});}},
  {name:'Veteran',desc:'Play 10 games.',emo:'🎖️',test:function(a,s){return s.games>=10;}},
  {name:'On a Roll',desc:'Win 3 games in a row.',emo:'🔥',test:function(a){var run=0;for(var i=0;i<a.length;i++){if(a[i].result==='win'){if(++run>=3)return true;}else run=0;}return false;}}
];
function achievementsHtml(arr){
  var s=historySummary(arr);
  var earned=ACHIEVEMENTS.map(function(A){return {A:A,got:!!A.test(arr,s)};});
  var gotN=earned.filter(function(x){return x.got;}).length;
  var chips=earned.map(function(x){
    return '<div class="ach'+(x.got?' got':'')+'" title="'+escHtml(x.A.desc)+'">'+
      '<span class="achemo">'+x.A.emo+'</span><span class="achname">'+escHtml(x.A.name)+'</span></div>';
  }).join('');
  return '<div class="cardhead" style="margin-top:14px">Achievements <span class="tiny muted">'+gotN+' / '+ACHIEVEMENTS.length+'</span></div>'+
    '<div class="achgrid">'+chips+'</div>';
}

/* ---- Optional ambient music: a soft synthesized pad (open-fifth drone under a
   slow filter sweep), opt-in via Settings. Gated on sound being on and a live
   in-game screen; safely no-ops if the Web Audio context can't start. ---- */
var MUSIC={nodes:null};
function musicStart(){
  if(MUSIC.nodes)return;
  var ctx=actx();if(!ctx)return;
  try{
    var master=ctx.createGain();master.gain.value=0.0001;master.connect(ctx.destination);
    var filt=ctx.createBiquadFilter();filt.type='lowpass';filt.frequency.value=560;filt.Q.value=0.7;filt.connect(master);
    var oscs=[110,164.81,220].map(function(f,i){
      var o=ctx.createOscillator();o.type=i===2?'triangle':'sine';o.frequency.value=f;
      var g=ctx.createGain();g.gain.value=i===2?0.10:0.16;o.connect(g);g.connect(filt);o.start();return o;});
    var lfo=ctx.createOscillator();lfo.frequency.value=0.045;var lg=ctx.createGain();lg.gain.value=160;
    lfo.connect(lg);lg.connect(filt.frequency);lfo.start();
    master.gain.exponentialRampToValueAtTime(Math.max(0.0001,0.05*masterVol()),ctx.currentTime+2.5);
    MUSIC.nodes={ctx:ctx,master:master,oscs:oscs,lfo:lfo};
  }catch(e){MUSIC.nodes=null;}
}
function musicStop(){
  var n=MUSIC.nodes;if(!n)return;MUSIC.nodes=null;
  try{
    n.master.gain.cancelScheduledValues(n.ctx.currentTime);
    n.master.gain.exponentialRampToValueAtTime(0.0001,n.ctx.currentTime+1.0);
    setTimeout(function(){try{n.oscs.forEach(function(o){o.stop();});n.lfo.stop();}catch(e){}},1200);
  }catch(e){}
}
function musicSetVolume(){
  var n=MUSIC.nodes;if(!n)return;
  try{n.master.gain.setTargetAtTime(Math.max(0.0001,0.05*masterVol()),n.ctx.currentTime,0.2);}catch(e){}
}
function musicUpdate(){
  var want=!!(SETTINGS.music&&UI.soundOn&&G&&!G.winner&&!$('#screen-game').hidden);
  if(want)musicStart();else musicStop();
}

/* Weighted belief over Mr. X's location for the possible-spots heatmap: the more
   ways a station can be reached along his ticket log, the more colour it gets.
   Same reveal/transition logic as possibleSet(), but keeping the mass instead of
   collapsing to a flat set. */
function computeBelief(){
  var lastRv=-1,i;
  for(i=0;i<G.log.length;i++)if(G.log[i].rv)lastRv=i;
  var cur=new Map(),start;
  if(lastRv>=0){cur.set(G.log[lastRv].st,1);start=lastRv+1;}
  else{MRX_STARTS.forEach(function(s){cur.set(s,1/MRX_STARTS.length);});start=0;}
  for(i=start;i<G.log.length;i++){
    var tk=G.log[i].tk,nxt=new Map();
    cur.forEach(function(wt,s){
      var seen={},outs=[];
      NBRS[s].forEach(function(e){
        if(e.t==='f'&&tk!=='x')return;if(tk!=='x'&&e.t!==tk)return;
        if(seen[e.to])return;seen[e.to]=1;outs.push(e.to);
      });
      if(!outs.length)return;var share=wt/outs.length;
      outs.forEach(function(to){nxt.set(to,(nxt.get(to)||0)+share);});
    });
    cur=nxt;
  }
  G.dets.forEach(function(d){cur.delete(d.st);});
  return cur;
}

// A compact inline-SVG timeline of recent results for the History screen.
function statsChartHtml(arr){
  if(!arr.length)return '';
  var recent=arr.slice(0,24).reverse(),W=recent.length,bw=100/W;
  var bars=recent.map(function(e,i){
    var win=e.result==='win',col=win?'var(--bus)':'var(--tube)',h=win?20:11,y=24-h,x=(i*bw).toFixed(2);
    return '<rect x="'+x+'" y="'+y+'" width="'+(bw*0.78).toFixed(2)+'" height="'+h+'" rx="0.8" fill="'+col+'" opacity="'+(e.role==='mrx'?0.6:1)+'">'+
      '<title>'+(e.role==='mrx'?'Mr. X':'Detective')+' — '+(win?'win':'loss')+' (round '+e.round+')</title></rect>';
  }).join('');
  return '<div class="cardhead" style="margin-top:14px">Recent results <span class="tiny muted">oldest → newest</span></div>'+
    '<svg class="statschart" viewBox="0 0 100 26" preserveAspectRatio="none" role="img" aria-label="Recent game results timeline">'+bars+'</svg>'+
    '<div class="tiny muted" style="margin-top:3px">Green = win · red = loss · faded = played as Mr. X</div>';
}
