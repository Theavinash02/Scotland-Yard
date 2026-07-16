/* ==========================================================================
   Title / attract sequence — 1960s London-noir cold open.
   --------------------------------------------------------------------------
   Runs once at boot, before the lobby: black → tap-to-begin gate → animated
   attract sequence (fog over a sliver of the real poster-map, Mr. X's
   silhouette dissolving into transport tokens along real route curves, an
   inked title stamp) → crossfade into the existing lobby screen, which
   already serves as the game's main menu (New Game / Online tabs, Rules,
   History, tutorial).

   Reuses rather than parallels the existing systems:
     - audio goes through ui.js's shared actx()/ACTX (same AudioContext,
       same UI.soundOn mute gate — no second context is ever created)
     - the river and route curves are drawn from the real POS/PAIRS station
       data and the real catmullPath()/quadPoint()/edgeBow() curve math
       defined in map.js, not redrawn from scratch
     - color tokens are read live from the :root CSS variables in styles.css

   Exposes three globals for ui.js's boot() to call:
     startIntro(onDone)   — run the sequence, call onDone() once the lobby
                             should be revealed (also called immediately by
                             boot() as a fallback if this file fails to load)
     introSetMuted(bool)  — mirror of the header's sound toggle
     introTeardown()      — idempotent full teardown (DOM + timers + audio);
                             also called defensively by enterGame()
   ========================================================================== */
(function(){
  'use strict';

  var root=document.getElementById('screen-intro');
  if(!root){window.startIntro=function(onDone){onDone&&onDone();};return;}

  var artEl=document.getElementById('introArt');
  var titleEl=document.getElementById('introTitle');
  var subEl=titleEl?titleEl.querySelector('.introSub'):null;
  var gateEl=document.getElementById('introGateTxt');
  var skipEl=document.getElementById('introSkipTxt');
  var catcher=document.getElementById('introCatcher');

  var reduced=false;
  try{reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;}catch(e){}

  var phase='idle'; // idle -> gate -> playing -> resolving -> done
  var timers=[];
  var domListeners=[];
  var doneCb=null;
  var tornDown=false;

  function addT(fn,ms){var id=setTimeout(fn,Math.max(0,ms));timers.push(id);return id;}
  function clearTimers(){timers.forEach(clearTimeout);timers=[];}
  function on(target,type,fn,opts){if(!target)return;target.addEventListener(type,fn,opts);domListeners.push({target:target,type:type,fn:fn,opts:opts});}
  function offAll(){domListeners.forEach(function(l){try{l.target.removeEventListener(l.type,l.fn,l.opts);}catch(e){}});domListeners=[];}

  function cssVar(name){
    try{return getComputedStyle(document.documentElement).getPropertyValue(name).trim()||null;}catch(e){return null;}
  }

  /* ---------------- visual build (reuses svgEl() from map.js) ---------------- */
  function buildBackdrop(){
    var s=svgEl('svg');
    s.setAttribute('viewBox','0 0 1000 761');
    s.setAttribute('preserveAspectRatio','xMidYMid slice');
    var defs=svgEl('defs');
    defs.innerHTML=
      '<radialGradient id="introPaperG" gradientUnits="userSpaceOnUse" cx="520" cy="300" r="720">'+
        '<stop offset="0%" stop-color="#3E3320"/><stop offset="45%" stop-color="#221E28"/><stop offset="100%" stop-color="#05070a"/></radialGradient>'+
      '<radialGradient id="introVigG" gradientUnits="userSpaceOnUse" cx="500" cy="360" r="620">'+
        '<stop offset="0%" stop-color="#000" stop-opacity="0"/><stop offset="70%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="0.72"/></radialGradient>'+
      '<filter id="introGrain" x="0" y="0" width="100%" height="100%">'+
        '<feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" result="n"/>'+
        '<feColorMatrix in="n" type="matrix" values="0 0 0 0 0.9  0 0 0 0 0.86  0 0 0 0 0.74  0 0 0 0.05 0"/>'+
      '</filter>';
    s.appendChild(defs);
    var bg=svgEl('rect');bg.setAttribute('x','-20');bg.setAttribute('y','-20');bg.setAttribute('width','1040');bg.setAttribute('height','801');bg.setAttribute('fill','url(#introPaperG)');
    s.appendChild(bg);
    var grain=svgEl('rect');grain.setAttribute('x','-20');grain.setAttribute('y','-20');grain.setAttribute('width','1040');grain.setAttribute('height','801');grain.setAttribute('filter','url(#introGrain)');grain.setAttribute('style','mix-blend-mode:overlay;pointer-events:none');
    s.appendChild(grain);
    return {svg:s,layerBelow:bg};
  }

  function realRiverPath(){
    // Same four ferry stations and the same catmullPath() extension used for
    // the Thames on the real board (see map.js buildMap()) — literally the
    // same river, just drawn smaller and dimmer here.
    try{
      var ids=[194,157,115,108];
      var FP=ids.map(function(id){return POS[id];});
      if(!FP[0]||!FP[1]||!FP[2]||!FP[3])return null;
      var pre={x:FP[0].x+(FP[0].x-FP[1].x)*0.9,y:FP[0].y+(FP[0].y-FP[1].y)*0.9};
      var post={x:FP[3].x+(FP[3].x-FP[2].x)*0.75,y:FP[3].y+(FP[3].y-FP[2].y)*0.75};
      return catmullPath([pre,FP[0],FP[1],FP[2],FP[3],post]);
    }catch(e){return null;}
  }

  function realRouteCurves(n){
    // Pull real edges (with the real curve bow) out of PAIRS/POS so the
    // streaking lines are genuine chunks of the actual transport network,
    // not invented decoration.
    var out=[];
    try{
      if(typeof PAIRS==='undefined'||!PAIRS.length)return out;
      var step=Math.max(1,Math.floor(PAIRS.length/(n*3)));
      for(var i=0;i<PAIRS.length&&out.length<n;i+=step){
        var p=PAIRS[i];
        if(!p||!p.types||!p.types.length)continue;
        var t=p.types[0];
        var A=POS[p.a],B=POS[p.b];
        if(!A||!B)continue;
        var len=Math.hypot(B.x-A.x,B.y-A.y);
        if(len<70)continue; // skip tiny local hops, want visible sweeps
        var bow=edgeBow(p.a,p.b);
        var q=quadPoint(A,B,bow,0,0);
        out.push({d:q.d,t:t,a:p.a,b:p.b});
      }
    }catch(e){}
    return out;
  }

  function colFor(t){
    return t==='b'?(cssVar('--bus')||'#2F8A52'):t==='u'?(cssVar('--tube')||'#D23A3A'):(cssVar('--taxi')||'#DFAE1F');
  }

  var artState=null; // holds refs so teardown can strip everything cheaply

  function buildArt(){
    var built=buildBackdrop();
    var s=built.svg;
    artState={fogEls:[],tokenEls:[]};

    // Thames, dim and desaturated for the night scene.
    var riverD=realRiverPath();
    if(riverD){
      var rg=svgEl('g');rg.setAttribute('style','pointer-events:none');
      rg.innerHTML=
        '<path d="'+riverD+'" fill="none" stroke="#0B1420" stroke-width="30" stroke-linecap="round" opacity="0.55"/>'+
        '<path class="intro-river" d="'+riverD+'" stroke="'+(cssVar('--ferry')||'#3E6E8E')+'" stroke-width="2" opacity="0.75" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>';
      s.appendChild(rg);
      artState.river=rg.querySelector('.intro-river');
    }

    // A handful of real route curves, colored and dashed exactly like the board.
    var routes=realRouteCurves(reduced?0:4);
    artState.routes=[];
    routes.forEach(function(r,i){
      var p=svgEl('path');
      p.setAttribute('class','intro-route');
      p.setAttribute('d',r.d);
      p.setAttribute('stroke',colFor(r.t));
      p.setAttribute('stroke-width','2.6');
      p.setAttribute('opacity','0.85');
      p.setAttribute('pathLength','1');
      p.setAttribute('stroke-dasharray','1');
      p.setAttribute('stroke-dashoffset','1');
      s.appendChild(p);
      artState.routes.push({el:p,delay:i*130});
      [r.a,r.b].forEach(function(id){
        var pt=POS[id];if(!pt)return;
        var c=svgEl('circle');c.setAttribute('cx',pt.x);c.setAttribute('cy',pt.y);c.setAttribute('r','3.6');
        c.setAttribute('fill','#FDFBF2');c.setAttribute('stroke','#2E2818');c.setAttribute('stroke-width','0.8');c.setAttribute('opacity','0');
        c.style.transition='opacity .5s ease';c.style.transitionDelay=(i*130+300)+'ms';
        s.appendChild(c);
        artState.tokenEls.push(c); // reuse teardown list; also faded in with routes
      });
    });

    // Compass rose, echoing the board's cartouche ornament.
    var comp=svgEl('g');
    comp.setAttribute('class','intro-compass');
    comp.setAttribute('transform','translate(918,86)');
    comp.innerHTML=
      '<circle r="26" fill="none" stroke="#8A7B54" stroke-width="1.2" opacity="0.7"/>'+
      '<circle r="19" fill="none" stroke="#8A7B54" stroke-width="0.6" opacity="0.6"/>'+
      '<path d="M 0 -18 L 4 -4 L 18 0 L 4 4 L 0 18 L -4 4 L -18 0 L -4 -4 Z" fill="#8A7B54" opacity="0.75"/>'+
      '<text y="-30" text-anchor="middle" font-size="11" font-family="Marcellus, Georgia, serif" fill="#8A7B54" opacity="0.75">N</text>';
    s.appendChild(comp);

    // Mr. X: a fedora-and-trenchcoat silhouette that resolves out of the fog.
    var sil=svgEl('g');
    sil.setAttribute('class','intro-sil');
    sil.setAttribute('transform','translate(500,300)');
    sil.innerHTML=
      '<ellipse cx="0" cy="-58" rx="31" ry="7.5" fill="'+(cssVar('--blk')||'#14181D')+'"/>'+
      '<path d="M -19 -60 C -22 -80 -6 -90 9 -87 C 22 -85 24 -71 19 -60 Z" fill="'+(cssVar('--blk')||'#14181D')+'"/>'+
      '<path d="M -35 -30 C -41 -8 -47 24 -51 58 L -46 64 L 46 64 L 51 58 C 47 24 41 -8 35 -30 C 31 -37 20 -41 0 -41 C -20 -41 -31 -37 -35 -30 Z" fill="'+(cssVar('--blk')||'#14181D')+'"/>'+
      '<path d="M -7 -40 L 0 -20 L 7 -40 Z" fill="'+(cssVar('--bg')||'#0F1722')+'" opacity="0.55"/>';
    s.appendChild(sil);
    artState.sil=sil;

    var vig=svgEl('rect');
    vig.setAttribute('x','-20');vig.setAttribute('y','-20');vig.setAttribute('width','1040');vig.setAttribute('height','801');
    vig.setAttribute('fill','url(#introVigG)');vig.setAttribute('style','pointer-events:none');
    s.appendChild(vig);

    artEl.appendChild(s);
    artState.svgEl=s;

    // Fog + searchlight beam (plain DOM, mirrors ambience.js's cloud layer).
    if(!reduced){
      var beam=document.createElement('div');beam.className='intro-beam';artEl.appendChild(beam);artState.beam=beam;
      var n=6;
      for(var i=0;i<n;i++){
        var f=document.createElement('div');f.className='intro-fog';
        var w=220+Math.random()*180;
        f.style.setProperty('--w',w.toFixed(0)+'px');
        f.style.setProperty('--h',(w*0.4).toFixed(0)+'px');
        f.style.setProperty('--top',(8+Math.random()*70).toFixed(1)+'%');
        f.style.setProperty('--op',(0.35+Math.random()*0.25).toFixed(2));
        var dur=26+Math.random()*30;
        f.style.setProperty('--dur',dur.toFixed(1)+'s');
        f.style.setProperty('--delay',(-Math.random()*dur).toFixed(1)+'s');
        artEl.appendChild(f);
        artState.fogEls.push(f);
      }
    }

    // Token scatter (taxi/bus/underground colored dots streaking out of the
    // silhouette along rough transport-line angles) — built now, played later.
    var tokenColors=[cssVar('--taxi')||'#DFAE1F',cssVar('--bus')||'#2F8A52',cssVar('--tube')||'#D23A3A',cssVar('--ferry')||'#3E6E8E'];
    var burstWrap=svgEl('g');burstWrap.setAttribute('transform','translate(500,300)');
    artState.burst=[];
    if(!reduced){
      for(var k=0;k<10;k++){
        var ang=(k/10)*Math.PI*2+Math.random()*0.4;
        var dist=170+Math.random()*220;
        var c=svgEl('circle');
        c.setAttribute('class','intro-token');
        c.setAttribute('r','4.2');
        c.setAttribute('fill',tokenColors[k%tokenColors.length]);
        c.style.setProperty('--tx',(Math.cos(ang)*dist).toFixed(0)+'px');
        c.style.setProperty('--ty',(Math.sin(ang)*dist*0.62).toFixed(0)+'px');
        c.style.setProperty('--tdelay',(k*35)+'ms');
        c.style.animationPlayState='paused';
        burstWrap.appendChild(c);
        artState.burst.push(c);
      }
    }
    s.appendChild(burstWrap);
  }

  function teardownArt(){
    if(artState&&artState.svgEl&&artState.svgEl.parentNode)artState.svgEl.parentNode.removeChild(artState.svgEl);
    if(artState){
      (artState.fogEls||[]).forEach(function(el){if(el.parentNode)el.parentNode.removeChild(el);});
      if(artState.beam&&artState.beam.parentNode)artState.beam.parentNode.removeChild(artState.beam);
    }
    artState=null;
    if(artEl)artEl.innerHTML='';
  }

  /* ---------------- music engine (shares ui.js's AudioContext) ---------------- */
  var BPM=88, SWING=0.64;
  function beatSec(){return 60/BPM;}
  function barSec(){return 4*beatSec();}
  function midiHz(n){return 440*Math.pow(2,(n-69)/12);}
  function slotTime(barStart,slot){
    var beat=Math.floor(slot/2),off=slot%2===1;
    var t=barStart+beat*beatSec();
    if(off)t+=beatSec()*SWING;
    return t;
  }

  // ii - V - I - VIb9 turnaround in C, voiced for pad/bass/lead.
  var CHORDS=[
    {pad:[50,53,60],   bass:[38,41,45,48], lead:[{slot:2,note:69,dur:1.5},{slot:4,note:72,dur:1},{slot:6,note:70,dur:1.5}]}, // Dm7
    {pad:[55,59,65],   bass:[31,35,38,41], lead:[{slot:3,note:71,dur:1},{slot:5,note:74,dur:1},{slot:6,note:77,dur:2}]},     // G7
    {pad:[48,52,59],   bass:[36,40,43,47], lead:[{slot:2,note:67,dur:1},{slot:4,note:76,dur:3}]},                            // Cmaj7
    {pad:[57,61,70],   bass:[33,37,40,43], lead:[{slot:1,note:73,dur:1},{slot:3,note:70,dur:1},{slot:5,note:69,dur:2}]}      // A7(b9)
  ];

  var AUD={ctx:null,master:null,compressor:null,dry:null,reverbSend:null,convolver:null,reverbReturn:null,running:false,timer:null,barIdx:0,nextBarTime:0};
  var activeVoices=[];

  function trackVoice(nodes,src){
    activeVoices.push(nodes);
    src.onended=function(){
      var i=activeVoices.indexOf(nodes);if(i>=0)activeVoices.splice(i,1);
      nodes.forEach(function(n){try{n.disconnect();}catch(e){}});
    };
  }

  function buildImpulse(ctx,seconds,decay){
    var len=Math.floor(ctx.sampleRate*seconds);
    var buf=ctx.createBuffer(2,len,ctx.sampleRate);
    for(var ch=0;ch<2;ch++){
      var d=buf.getChannelData(ch);
      for(var i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,decay);
    }
    return buf;
  }

  function ensureMusicGraph(ctx){
    if(AUD.ctx===ctx&&AUD.master)return;
    AUD.ctx=ctx;
    AUD.master=ctx.createGain();AUD.master.gain.value=0.0001;
    AUD.compressor=ctx.createDynamicsCompressor();
    AUD.compressor.threshold.value=-20;AUD.compressor.knee.value=22;AUD.compressor.ratio.value=3;
    AUD.compressor.attack.value=0.012;AUD.compressor.release.value=0.28;
    AUD.dry=ctx.createGain();AUD.dry.gain.value=1;
    AUD.reverbSend=ctx.createGain();AUD.reverbSend.gain.value=1;
    AUD.convolver=ctx.createConvolver();
    try{AUD.convolver.buffer=buildImpulse(ctx,2.4,2.4);}catch(e){}
    AUD.reverbReturn=ctx.createGain();AUD.reverbReturn.gain.value=0.32;
    AUD.dry.connect(AUD.compressor);
    AUD.reverbSend.connect(AUD.convolver);AUD.convolver.connect(AUD.reverbReturn);AUD.reverbReturn.connect(AUD.compressor);
    AUD.compressor.connect(AUD.master);AUD.master.connect(ctx.destination);
  }

  function voiceSend(ctx,g,sendAmt){
    if(sendAmt<=0)return;
    var sg=ctx.createGain();sg.gain.value=sendAmt;
    g.connect(sg);sg.connect(AUD.reverbSend);
    return sg;
  }

  function scheduleChordVoice(ctx,freq,t0,dur,peak){
    var o1=ctx.createOscillator(),o2=ctx.createOscillator(),f=ctx.createBiquadFilter(),g=ctx.createGain();
    o1.type='sawtooth';o2.type='sawtooth';o1.frequency.value=freq;o2.frequency.value=freq;
    o1.detune.value=-6;o2.detune.value=7;
    f.type='lowpass';f.frequency.value=1000;f.Q.value=0.35;
    g.gain.setValueAtTime(0.0001,t0);
    g.gain.exponentialRampToValueAtTime(peak,t0+1.1);
    g.gain.setValueAtTime(peak,Math.max(t0+1.1,t0+dur-0.7));
    g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
    o1.connect(f);o2.connect(f);f.connect(g);g.connect(AUD.dry);
    var sg=voiceSend(ctx,g,0.4);
    o1.start(t0);o2.start(t0);o1.stop(t0+dur+0.1);o2.stop(t0+dur+0.1);
    trackVoice([o1,o2,f,g,sg].filter(Boolean),o1);
  }

  function scheduleBassNote(ctx,freq,t0){
    var dur=beatSec()*0.82;
    var o=ctx.createOscillator(),f=ctx.createBiquadFilter(),g=ctx.createGain();
    o.type='triangle';o.frequency.value=freq;
    f.type='lowpass';f.frequency.value=420;f.Q.value=0.6;
    g.gain.setValueAtTime(0.0001,t0);
    g.gain.exponentialRampToValueAtTime(0.5,t0+0.02);
    g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
    o.connect(f);f.connect(g);g.connect(AUD.dry);
    var sg=voiceSend(ctx,g,0.12);
    o.start(t0);o.stop(t0+dur+0.05);
    trackVoice([o,f,g,sg].filter(Boolean),o);
  }

  function scheduleLeadNote(ctx,freq,t0,dur){
    var o=ctx.createOscillator(),vib=ctx.createOscillator(),vibGain=ctx.createGain(),f=ctx.createBiquadFilter(),g=ctx.createGain();
    o.type='triangle';o.frequency.value=freq;
    vib.type='sine';vib.frequency.value=5.4;vibGain.gain.value=3.2;
    vib.connect(vibGain);vibGain.connect(o.frequency);
    f.type='bandpass';f.frequency.value=Math.min(2200,freq*2.1);f.Q.value=1.6;
    g.gain.setValueAtTime(0.0001,t0);
    g.gain.exponentialRampToValueAtTime(0.34,t0+0.05);
    g.gain.setValueAtTime(0.34,Math.max(t0+0.05,t0+dur-0.18));
    g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
    o.connect(f);f.connect(g);g.connect(AUD.dry);
    var sg=voiceSend(ctx,g,0.5);
    o.start(t0);vib.start(t0);o.stop(t0+dur+0.05);vib.stop(t0+dur+0.05);
    trackVoice([o,vib,vibGain,f,g,sg].filter(Boolean),o);
  }

  function noiseBurst(ctx,t0,dur,type,freq,q,peak){
    var len=Math.max(1,Math.floor(ctx.sampleRate*dur));
    var buf=ctx.createBuffer(1,len,ctx.sampleRate),d=buf.getChannelData(0);
    for(var i=0;i<len;i++)d[i]=Math.random()*2-1;
    var src=ctx.createBufferSource();src.buffer=buf;
    var f=ctx.createBiquadFilter();f.type=type;f.frequency.value=freq;f.Q.value=q;
    var g=ctx.createGain();
    g.gain.setValueAtTime(0.0001,t0);
    g.gain.exponentialRampToValueAtTime(peak,t0+0.008);
    g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
    src.connect(f);f.connect(g);g.connect(AUD.dry);
    var sg=voiceSend(ctx,g,0.15);
    src.start(t0);
    trackVoice([src,f,g,sg].filter(Boolean),src);
  }

  function scheduleBar(ctx,chordIdx,barStart){
    var chord=CHORDS[chordIdx];
    chord.pad.forEach(function(n){scheduleChordVoice(ctx,midiHz(n),barStart,barSec()+0.3,0.05);});
    chord.bass.forEach(function(n,i){scheduleBassNote(ctx,midiHz(n),barStart+i*beatSec());});
    chord.lead.forEach(function(l){scheduleLeadNote(ctx,midiHz(l.note),slotTime(barStart,l.slot),l.dur*beatSec()*0.5);});
    for(var s=0;s<8;s++){
      var t=slotTime(barStart,s);
      if(s===0)noiseBurst(ctx,t,0.3,'lowpass',140,0.9,0.22);
      else if(s%2===1)noiseBurst(ctx,t,0.09,'bandpass',5200,1.4,0.05);
      else if(s===4)noiseBurst(ctx,t,0.07,'bandpass',2200,2.2,0.035);
    }
  }

  function schedulePickup(ctx,t0){
    // A short rubato fragment on solo bass before the loop locks in.
    scheduleLeadNote(ctx,midiHz(74),t0,0.3);
    scheduleLeadNote(ctx,midiHz(72),t0+0.34,0.3);
    scheduleLeadNote(ctx,midiHz(69),t0+0.68,0.55);
    scheduleBassNote(ctx,midiHz(38),t0+0.05);
  }

  function playStinger(ctx,t0){
    [50,57,65,72,74].forEach(function(n,i){
      var o=ctx.createOscillator(),g=ctx.createGain();
      o.type=i%2?'sawtooth':'triangle';o.frequency.value=midiHz(n);
      g.gain.setValueAtTime(0.0001,t0);
      g.gain.exponentialRampToValueAtTime(0.16,t0+0.02);
      g.gain.exponentialRampToValueAtTime(0.0001,t0+1.4);
      o.connect(g);g.connect(AUD.dry);
      var sg=voiceSend(ctx,g,0.45);
      o.start(t0);o.stop(t0+1.5);
      trackVoice([o,g,sg].filter(Boolean),o);
    });
    noiseBurst(ctx,t0,1.3,'highpass',3400,0.7,0.14);
    var o=ctx.createOscillator(),g=ctx.createGain();
    o.type='sine';o.frequency.setValueAtTime(90,t0);o.frequency.exponentialRampToValueAtTime(48,t0+0.5);
    g.gain.setValueAtTime(0.0001,t0);g.gain.exponentialRampToValueAtTime(0.4,t0+0.03);g.gain.exponentialRampToValueAtTime(0.0001,t0+0.6);
    o.connect(g);g.connect(AUD.dry);
    o.start(t0);o.stop(t0+0.65);
    trackVoice([o,g],o);
  }

  function startMusic(ctx){
    ensureMusicGraph(ctx);
    AUD.master.gain.cancelScheduledValues(ctx.currentTime);
    AUD.master.gain.setValueAtTime(0.0001,ctx.currentTime);
    AUD.master.gain.exponentialRampToValueAtTime(UI.soundOn?0.55:0.0001,ctx.currentTime+1.6); // "swells" in
    var startAt=ctx.currentTime+0.05;
    schedulePickup(ctx,startAt);
    AUD.nextBarTime=startAt+1.35;
    AUD.barIdx=0;AUD.running=true;
    tick();
    function tick(){
      if(!AUD.running)return;
      while(AUD.nextBarTime<ctx.currentTime+0.25){
        scheduleBar(ctx,AUD.barIdx%CHORDS.length,AUD.nextBarTime);
        AUD.nextBarTime+=barSec();
        AUD.barIdx++;
      }
      AUD.timer=addT(tick,100);
    }
    return AUD.nextBarTime; // approx loop-start audio time, used for stinger sync
  }

  function stopMusicScheduler(){AUD.running=false;if(AUD.timer)clearTimeout(AUD.timer);}

  function softenMusic(fastMs){
    if(!AUD.ctx||!AUD.master)return;
    var ctx=AUD.ctx,t=ctx.currentTime;
    try{
      AUD.master.gain.cancelScheduledValues(t);
      AUD.master.gain.setValueAtTime(Math.max(0.0001,AUD.master.gain.value),t);
      AUD.master.gain.exponentialRampToValueAtTime(0.0001,t+fastMs/1000);
    }catch(e){}
  }

  function hardStopAudio(){
    stopMusicScheduler();
    activeVoices.forEach(function(nodes){
      nodes.forEach(function(n){
        try{if(n.stop)n.stop(0);}catch(e){}
        try{n.disconnect();}catch(e){}
      });
    });
    activeVoices=[];
    [AUD.dry,AUD.reverbSend,AUD.convolver,AUD.reverbReturn,AUD.compressor,AUD.master].forEach(function(n){
      if(n){try{n.disconnect();}catch(e){}}
    });
    AUD.ctx=null;AUD.master=null;AUD.compressor=null;AUD.dry=null;AUD.reverbSend=null;AUD.convolver=null;AUD.reverbReturn=null;
  }

  function introSetMuted(muted){
    if(!AUD.ctx||!AUD.master)return;
    var t=AUD.ctx.currentTime;
    try{
      AUD.master.gain.cancelScheduledValues(t);
      AUD.master.gain.setValueAtTime(Math.max(0.0001,AUD.master.gain.value),t);
      AUD.master.gain.exponentialRampToValueAtTime(muted?0.0001:0.55,t+0.35);
    }catch(e){}
  }

  /* ---------------- sequence timeline ---------------- */
  var stingerAudioTime=null;

  function beginGesture(){
    if(phase!=='gate')return;
    phase='playing';
    var ctx=(typeof actx==='function')?actx():null;
    if(gateEl)gateEl.classList.add('hide');
    addT(function(){if(gateEl)gateEl.hidden=true;},500);
    if(artEl)artEl.classList.add('on');
    addT(function(){if(skipEl){skipEl.hidden=false;skipEl.classList.add('on');}},400);

    var loopStart=null;
    if(ctx)loopStart=startMusic(ctx);

    if(reduced){
      runReducedTimeline(ctx,loopStart);
    }else{
      runFullTimeline(ctx,loopStart);
    }
  }

  function runFullTimeline(ctx,loopStart){
    // Beam + river + routes draw on.
    addT(function(){if(artState&&artState.beam)artState.beam.classList.add('on');},250);
    addT(function(){if(artState&&artState.river)artState.river.style.strokeDashoffset='0';},700);
    addT(function(){
      (artState&&artState.routes||[]).forEach(function(r){
        addT(function(){r.el.style.strokeDashoffset='0';},r.delay);
      });
    },1000);
    // Mr. X materializes.
    addT(function(){if(artState&&artState.sil)artState.sil.classList.add('on');},1500);
    addT(function(){if(artState&&artState.sil)artState.sil.classList.add('gone');},3100);
    addT(function(){
      (artState&&artState.burst||[]).forEach(function(el){el.style.animationPlayState='running';});
    },3150);

    // The stamp/stinger land on the loop's downbeat (real audio-clock time,
    // not a guessed ms offset) — the visual hold-and-resolve is scheduled
    // relative to *that* actual delay so it can never race ahead of it.
    var stampDelay=scheduleStamp(ctx,loopStart,1,4000,'stamp');
    scheduleResolve(stampDelay+2300,false);
  }

  function runReducedTimeline(ctx,loopStart){
    addT(function(){if(artState&&artState.river)artState.river.style.strokeDashoffset='0';},300);
    addT(function(){if(artState&&artState.sil)artState.sil.classList.add('on');},500);
    var stampDelay=scheduleStamp(ctx,loopStart,0,1200,'stampCalm');
    scheduleResolve(stampDelay+1800,false);
  }

  // barsAfterLoop: how many full bars past the loop's downbeat the stinger
  // should land on — lets the reduced-motion path hit the very first
  // downbeat while the full sequence gets a bar of groove first.
  function scheduleStamp(ctx,loopStart,barsAfterLoop,fallbackMs,stampClass){
    var delayMs=fallbackMs;
    if(ctx&&loopStart!=null){
      stingerAudioTime=loopStart+barsAfterLoop*barSec();
      delayMs=Math.max(200,(stingerAudioTime-ctx.currentTime)*1000-15);
    }
    addT(function(){
      if(titleEl)titleEl.classList.add(stampClass);
      if(subEl)addT(function(){subEl.classList.add('on');},260);
      if(ctx)playStinger(ctx,stingerAudioTime!=null?Math.max(ctx.currentTime,stingerAudioTime):ctx.currentTime);
    },delayMs);
    return delayMs;
  }

  function scheduleResolve(delayMs,fast){
    addT(function(){resolveToMenu(fast);},delayMs);
  }

  /* ---------------- resolve / skip / teardown ---------------- */
  function resolveToMenu(fast){
    if(phase==='resolving'||phase==='done')return;
    phase='resolving';
    var fadeMs=fast?450:900;
    softenMusic(fast?500:1300);
    if(artEl)artEl.style.transition='opacity '+fadeMs+'ms ease';
    if(artEl)artEl.style.opacity='0';
    if(titleEl){
      // The stamp-in used a fill-forwards @keyframes animation, which sits
      // above inline styles in the cascade — just setting opacity here would
      // be silently overridden and the title would hard-cut instead of
      // fading. Freeze its current rendered value, drop the animation, force
      // a reflow, then transition normally from that frozen value.
      var curOp=getComputedStyle(titleEl).opacity;
      titleEl.style.animation='none';
      titleEl.style.opacity=curOp;
      void titleEl.offsetWidth;
      titleEl.style.transition='opacity '+fadeMs+'ms ease';
      titleEl.style.opacity='0';
    }
    if(skipEl)skipEl.classList.remove('on');
    var hdr=document.getElementById('hdr'),lobby=document.getElementById('screen-lobby');
    if(hdr){hdr.hidden=false;hdr.style.opacity='0';hdr.style.transition='opacity '+fadeMs+'ms ease';addT(function(){hdr.style.opacity='1';},20);}
    if(lobby){lobby.hidden=false;lobby.style.opacity='0';lobby.style.transition='opacity '+fadeMs+'ms ease';addT(function(){lobby.style.opacity='1';},20);}
    addT(function(){
      if(hdr){hdr.style.transition='';hdr.style.opacity='';}
      if(lobby){lobby.style.transition='';lobby.style.opacity='';}
      finishTeardown();
    },fadeMs+Math.max(fast?150:400,0));
  }

  function finishTeardown(){
    phase='done';
    hardStopAudio();
    teardownArt();
    offAll();
    clearTimers();
    if(root){root.classList.add('introGone');root.hidden=true;}
    var cb=doneCb;doneCb=null;
    tornDown=true;
    if(cb)cb();
  }

  function onSkipOrBegin(){
    if(phase==='gate'){beginGesture();return;}
    if(phase==='playing'){resolveToMenu(true);}
  }

  /* ---------------- public API ---------------- */
  function startIntro(onDone){
    if(tornDown){onDone&&onDone();return;} // defensive: never re-enter after teardown
    doneCb=onDone;
    if(root){root.hidden=false;root.classList.remove('introGone');}
    if(reduced&&root)root.classList.add('reduced');
    try{buildArt();}catch(e){/* backdrop is decorative; sequence still runs without it */}
    phase='gate';
    on(catcher,'pointerdown',function(ev){ev.preventDefault();onSkipOrBegin();},{passive:false});
    on(document,'keydown',function(ev){if(ev.key==='Tab')return;onSkipOrBegin();});
  }

  window.startIntro=startIntro;
  window.introSetMuted=introSetMuted;
  window.introTeardown=function(){if(phase!=='done')finishTeardown();};
})();
