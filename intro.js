/* ==========================================================================
   Title / attract sequence — 1960s London-noir cold open.
   --------------------------------------------------------------------------
   Runs once at boot, before the lobby: black → tap-to-begin gate → a shot
   attract sequence (layered fog + a two-depth illustrated skyline, a slow
   camera push-in with parallax, a searchlight that finds Mr. X, his
   silhouette dissolving into transport tokens along real route curves, an
   inked title stamp on the melody's resolution) → crossfade into the
   existing lobby screen, which already serves as the game's main menu.

   Reuses rather than parallels the existing systems:
     - audio goes through ui.js's shared actx()/ACTX (same AudioContext,
       same UI.soundOn mute gate — no second context is ever created)
     - the river and route curves are drawn from the real POS/PAIRS station
       data and the real catmullPath()/quadPoint()/edgeBow() curve math
       defined in map.js, not redrawn from scratch
     - color tokens are read live from the :root CSS variables in styles.css

   Music: an optional recorded theme (audio/theme.ogg, audio/theme.mp3
   fallback) is lazy-loaded during the gate phase and, if it decodes in
   time, played through the exact same master-gain/compressor bus the
   procedural engine uses. If it isn't ready — or doesn't exist — playback
   falls back seamlessly to the procedural noir-jazz engine below; the
   intro is never silent.

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

  /* ==========================================================================
     VISUAL BUILD — reuses svgEl()/catmullPath()/quadPoint()/edgeBow() from
     map.js and the real POS/PAIRS station data. Everything lives inside one
     #introCamera wrapper so the slow push-in / parallax moves the whole shot
     (SVG illustration + plain-DOM fog/rain layers) as a single take.
     ========================================================================== */
  function buildBackdrop(){
    var s=svgEl('svg');
    s.setAttribute('viewBox','0 0 1000 761');
    s.setAttribute('preserveAspectRatio','xMidYMid slice');
    var defs=svgEl('defs');
    defs.innerHTML=
      '<radialGradient id="introPaperG" gradientUnits="userSpaceOnUse" cx="520" cy="260" r="760">'+
        '<stop offset="0%" stop-color="#3E3320"/><stop offset="42%" stop-color="#221E28"/><stop offset="100%" stop-color="#05070a"/></radialGradient>'+
      '<linearGradient id="introSkyG" gradientUnits="userSpaceOnUse" x1="0" y1="380" x2="0" y2="660">'+
        '<stop offset="0%" stop-color="#241E1A" stop-opacity="0"/><stop offset="100%" stop-color="#0A0705" stop-opacity="0.55"/></linearGradient>'+
      '<radialGradient id="introVigG" gradientUnits="userSpaceOnUse" cx="500" cy="340" r="640">'+
        '<stop offset="0%" stop-color="#000" stop-opacity="0"/><stop offset="68%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="0.78"/></radialGradient>'+
      '<filter id="introGrain" x="0" y="0" width="100%" height="100%">'+
        '<feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" result="n"/>'+
        '<feColorMatrix in="n" type="matrix" values="0 0 0 0 0.9  0 0 0 0 0.86  0 0 0 0 0.74  0 0 0 0.05 0"/>'+
      '</filter>';
    s.appendChild(defs);
    var bg=svgEl('rect');bg.setAttribute('x','-40');bg.setAttribute('y','-40');bg.setAttribute('width','1080');bg.setAttribute('height','841');bg.setAttribute('fill','url(#introPaperG)');
    s.appendChild(bg);
    var grain=svgEl('rect');grain.setAttribute('x','-40');grain.setAttribute('y','-40');grain.setAttribute('width','1080');grain.setAttribute('height','841');grain.setAttribute('filter','url(#introGrain)');grain.setAttribute('style','mix-blend-mode:overlay;pointer-events:none');
    s.appendChild(grain);
    return s;
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
    // streaking lines are genuine chunks of the actual transport network —
    // one layer of the scene among several, not the whole scene.
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

  // Deterministic "random" from map.js's own hash — an authored-looking
  // skyline that's identical every run rather than reshuffling on reload.
  function seeded(seed){return (hash2(seed,seed*7+1)%1000)/1000;}

  function rooftopPath(baseY,heights,x0,stepW,tail){
    tail=tail||40;
    var d='M '+x0+' '+(baseY+tail);
    var x=x0;
    d+=' L '+x+' '+baseY;
    heights.forEach(function(h){
      d+=' L '+x+' '+(baseY-h);
      x+=stepW;
      d+=' L '+x+' '+(baseY-h);
    });
    d+=' L '+x+' '+baseY+' L '+x+' '+(baseY+tail)+' Z';
    return d;
  }

  // Two parallax depths of a hand-authored London skyline: a hazier far
  // strip and a crisper near strip carrying the three landmark silhouettes
  // (Elizabeth Tower, St Paul's dome, a twin-tower bridge) plus chimneys and
  // gaslit windows. Deterministic heights (via hash2, not Math.random) so
  // the frame reads as designed, not shuffled.
  function buildSkyline(s,glowEls){
    var farHeights=[],nearHeights=[],i;
    for(i=0;i<22;i++)farHeights.push(28+Math.floor(seeded(i+1)*46));
    for(i=0;i<18;i++)nearHeights.push(55+Math.floor(seeded(i+51)*110));

    var farCol=cssVar('--ferry')||'#3E6E8E';
    var nearCol=cssVar('--blk')||'#14181D';
    var glowCol=cssVar('--taxi')||'#DFAE1F';

    var far=svgEl('g');
    far.setAttribute('class','intro-sky intro-sky-far');
    // Tail extends well past the near skyline's shortest rooftops so this
    // semi-transparent layer's flat bottom edge is always hidden behind the
    // opaque near skyline instead of showing as a seam against the backdrop.
    far.innerHTML='<path d="'+rooftopPath(560,farHeights,-40,1080/farHeights.length,220)+'" fill="'+farCol+'" opacity="0.34"/>';
    s.appendChild(far);

    // Soft atmospheric gradient bridging the far skyline into the fog above
    // it — sits between the far and near layers so it never tints the near
    // skyline's solid fill (which would show as a hard seam at its base).
    var skyFade=svgEl('rect');
    skyFade.setAttribute('x','-40');skyFade.setAttribute('y','380');skyFade.setAttribute('width','1080');skyFade.setAttribute('height','280');
    skyFade.setAttribute('fill','url(#introSkyG)');skyFade.setAttribute('style','pointer-events:none');
    s.appendChild(skyFade);

    var near=svgEl('g');
    near.setAttribute('class','intro-sky intro-sky-near');
    var nearD=rooftopPath(761,nearHeights,-40,1080/nearHeights.length);
    var nh='<path d="'+nearD+'" fill="'+nearCol+'"/>';
    // A few chimney stacks along the near roofline for silhouette texture.
    [90,205,340,470,600,730,860,960].forEach(function(cx,k){
      var ch=48+Math.floor(seeded(k+200)*130);
      nh+='<rect x="'+(cx-4)+'" y="'+(761-ch-16)+'" width="8" height="18" fill="'+nearCol+'"/>';
    });
    near.innerHTML=nh;
    s.appendChild(near);

    // Landmarks, anchored to the near roofline.
    var lm=svgEl('g');lm.setAttribute('class','intro-landmarks');
    lm.innerHTML=
      // St Paul's dome
      '<g transform="translate(300,761)">'+
        '<rect x="-38" y="-58" width="76" height="58" fill="'+nearCol+'"/>'+
        '<ellipse cx="0" cy="-58" rx="44" ry="27" fill="'+nearCol+'"/>'+
        '<rect x="-6" y="-96" width="12" height="20" fill="'+nearCol+'"/>'+
        '<circle cx="0" cy="-99" r="5" fill="'+nearCol+'"/>'+
      '</g>'+
      // Elizabeth Tower
      '<g transform="translate(560,761)">'+
        '<rect x="-10" y="-172" width="20" height="172" fill="'+nearCol+'"/>'+
        '<path d="M -10 -172 L 0 -206 L 10 -172 Z" fill="'+nearCol+'"/>'+
        '<rect x="-1.6" y="-214" width="3.2" height="12" fill="'+nearCol+'"/>'+
        '<circle cx="0" cy="-140" r="7.5" fill="none" stroke="'+glowCol+'" stroke-width="1.5" opacity="0.75"/>'+
      '</g>'+
      // twin-tower bridge, cropped by the right edge
      '<g transform="translate(900,761)">'+
        '<rect x="-72" y="-124" width="17" height="124" fill="'+nearCol+'"/>'+
        '<rect x="-76" y="-146" width="25" height="22" fill="'+nearCol+'"/>'+
        '<rect x="55" y="-124" width="17" height="124" fill="'+nearCol+'"/>'+
        '<rect x="51" y="-146" width="25" height="22" fill="'+nearCol+'"/>'+
        '<path d="M -63 -96 Q 0 -74 63 -96 L 63 -88 Q 0 -66 -63 -88 Z" fill="'+nearCol+'" opacity="0.88"/>'+
      '</g>';
    s.appendChild(lm);

    // Gaslight / window glows scattered along the near roofline.
    if(!reduced){
      for(i=0;i<20;i++){
        var gx=-20+seeded(i+300)*1040;
        var gy=761-8-seeded(i+400)*Math.min(150,nearHeights[i%nearHeights.length]);
        var g=svgEl('circle');
        g.setAttribute('class','intro-glow');
        g.setAttribute('cx',gx.toFixed(0));g.setAttribute('cy',gy.toFixed(0));g.setAttribute('r','2.6');
        g.setAttribute('fill',glowCol);
        g.style.animationDelay=(seeded(i+500)*6).toFixed(2)+'s';
        s.appendChild(g);
        glowEls.push(g);
      }
    }
  }

  var artState=null; // holds refs so teardown can strip everything cheaply

  function buildArt(){
    var s=buildBackdrop();
    artState={fogEls:[],tokenEls:[],glowEls:[]};

    // Single camera wrapper: the slow push-in and cross-layer parallax are
    // applied here so the whole shot (SVG + plain-DOM fog/rain) moves as one
    // take rather than a stack of independently-animated layers.
    var camera=document.createElement('div');
    camera.id='introCamera';
    artEl.appendChild(camera);
    artState.camera=camera;
    camera.appendChild(s);

    buildSkyline(s,artState.glowEls);

    // Thames, dim and desaturated for the night scene — one supporting
    // layer among several now, not the whole picture.
    var riverD=realRiverPath();
    if(riverD){
      var rg=svgEl('g');rg.setAttribute('style','pointer-events:none');
      rg.innerHTML=
        '<path d="'+riverD+'" fill="none" stroke="#0B1420" stroke-width="30" stroke-linecap="round" opacity="0.5"/>'+
        '<path class="intro-river" d="'+riverD+'" stroke="'+(cssVar('--ferry')||'#3E6E8E')+'" stroke-width="2" opacity="0.7" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>';
      s.appendChild(rg);
      artState.river=rg.querySelector('.intro-river');
    }

    // A richer set of real route curves, colored exactly like the board.
    var routes=realRouteCurves(reduced?0:6);
    artState.routes=[];
    routes.forEach(function(r,i){
      var p=svgEl('path');
      p.setAttribute('class','intro-route');
      p.setAttribute('d',r.d);
      p.setAttribute('stroke',colFor(r.t));
      p.setAttribute('stroke-width','2.4');
      p.setAttribute('opacity','0.8');
      p.setAttribute('pathLength','1');
      p.setAttribute('stroke-dasharray','1');
      p.setAttribute('stroke-dashoffset','1');
      s.appendChild(p);
      artState.routes.push({el:p,delay:i*110});
      [r.a,r.b].forEach(function(id){
        var pt=POS[id];if(!pt)return;
        var c=svgEl('circle');c.setAttribute('cx',pt.x);c.setAttribute('cy',pt.y);c.setAttribute('r','3.4');
        c.setAttribute('fill','#FDFBF2');c.setAttribute('stroke','#2E2818');c.setAttribute('stroke-width','0.8');c.setAttribute('opacity','0');
        c.style.transition='opacity .5s ease';c.style.transitionDelay=(i*110+300)+'ms';
        s.appendChild(c);
        artState.tokenEls.push(c);
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

    // Mr. X: fedora brim + crown, a popped trenchcoat collar meeting in a
    // V, broad shoulders tapering to a belted waist — reads as a figure,
    // not two blobs.
    var sil=svgEl('g');
    sil.setAttribute('class','intro-sil');
    sil.setAttribute('transform','translate(500,300)');
    var blk=cssVar('--blk')||'#14181D';
    sil.innerHTML=
      '<ellipse cx="1" cy="-59" rx="33" ry="7" transform="rotate(-4 1 -59)" fill="'+blk+'"/>'+
      '<path d="M -20 -62 C -24 -83 -7 -93 9 -90 C 24 -87 26 -72 20 -62 C 12 -66 -12 -66 -20 -62 Z" fill="'+blk+'"/>'+
      '<path d="M -12 -44 L 0 -58 L 12 -44 L 4 -38 L 0 -46 L -4 -38 Z" fill="'+blk+'"/>'+
      '<path d="M -37 -33 C -43 -14 -47 10 -49 30 C -47 34 -40 36 -34 32 C -33 12 -29 -8 -22 -26 Z" fill="'+blk+'"/>'+
      '<path d="M 37 -33 C 43 -14 47 10 49 30 C 47 34 40 36 34 32 C 33 12 29 -8 22 -26 Z" fill="'+blk+'"/>'+
      '<path d="M -34 -28 C -40 -6 -46 26 -50 58 L -45 64 L 45 64 L 50 58 C 46 26 40 -6 34 -28 C 30 -35 19 -40 0 -40 C -19 -40 -30 -35 -34 -28 Z" fill="'+blk+'"/>'+
      '<rect x="-42" y="16" width="84" height="6" rx="2" fill="'+blk+'" opacity="0.9"/>'+
      '<path d="M -1.5 -38 L -1.5 58 M 1.5 -38 L 1.5 58" stroke="'+(cssVar('--bg')||'#0F1722')+'" stroke-width="1" opacity="0.4"/>';
    s.appendChild(sil);
    artState.sil=sil;

    var vig=svgEl('rect');
    vig.setAttribute('x','-40');vig.setAttribute('y','-40');vig.setAttribute('width','1080');vig.setAttribute('height','841');
    vig.setAttribute('fill','url(#introVigG)');vig.setAttribute('style','pointer-events:none');
    s.appendChild(vig);

    // Fog + searchlight + rain (plain DOM, mirrors ambience.js's cloud
    // layer) — all inside the camera wrapper so they push/parallax with
    // the illustration instead of floating independently over it.
    if(!reduced){
      var beam=document.createElement('div');beam.className='intro-beam';camera.appendChild(beam);artState.beam=beam;
      var n=7;
      for(var i=0;i<n;i++){
        var f=document.createElement('div');f.className='intro-fog';
        var w=240+seeded(i+600)*220;
        f.style.setProperty('--w',w.toFixed(0)+'px');
        f.style.setProperty('--h',(w*0.4).toFixed(0)+'px');
        f.style.setProperty('--top',(4+seeded(i+700)*74).toFixed(1)+'%');
        f.style.setProperty('--op',(0.32+seeded(i+800)*0.28).toFixed(2));
        var dur=24+seeded(i+900)*34;
        f.style.setProperty('--dur',dur.toFixed(1)+'s');
        f.style.setProperty('--delay',(-seeded(i+1000)*dur).toFixed(1)+'s');
        camera.appendChild(f);
        artState.fogEls.push(f);
      }
      var rain=document.createElement('div');rain.className='intro-rain';camera.appendChild(rain);artState.rain=rain;
    }

    // Token scatter (taxi/bus/underground colored dots streaking out of the
    // silhouette along rough transport-line angles) — built now, played later.
    var tokenColors=[cssVar('--taxi')||'#DFAE1F',cssVar('--bus')||'#2F8A52',cssVar('--tube')||'#D23A3A',cssVar('--ferry')||'#3E6E8E'];
    var burstWrap=svgEl('g');burstWrap.setAttribute('transform','translate(500,300)');
    artState.burst=[];
    if(!reduced){
      for(var k=0;k<12;k++){
        var ang=(k/12)*Math.PI*2+seeded(k+1100)*0.4;
        var dist=170+seeded(k+1200)*230;
        var c=svgEl('circle');
        c.setAttribute('class','intro-token');
        c.setAttribute('r','4.2');
        c.setAttribute('fill',tokenColors[k%tokenColors.length]);
        c.style.setProperty('--tx',(Math.cos(ang)*dist).toFixed(0)+'px');
        c.style.setProperty('--ty',(Math.sin(ang)*dist*0.62).toFixed(0)+'px');
        c.style.setProperty('--tdelay',(k*32)+'ms');
        c.style.animationPlayState='paused';
        burstWrap.appendChild(c);
        artState.burst.push(c);
      }
    }
    s.appendChild(burstWrap);

    // The letterpress "thunk" — a brief full-screen flash outside the
    // camera wrapper (so the push-in scale never clips it) timed to the
    // title stamp.
    var flash=document.createElement('div');flash.id='introFlash';artEl.appendChild(flash);artState.flash=flash;
  }

  function teardownArt(){
    if(artState&&artState.camera&&artState.camera.parentNode)artState.camera.parentNode.removeChild(artState.camera);
    if(artState&&artState.flash&&artState.flash.parentNode)artState.flash.parentNode.removeChild(artState.flash);
    artState=null;
    if(artEl)artEl.innerHTML='';
  }

  /* ==========================================================================
     RECORDED THEME — optional, preferred when available. Lazy-loaded during
     the gate phase; if it isn't decoded by the time the gesture lands, we
     fall straight to the procedural engine below without a gap.
     ========================================================================== */
  var themeBuffer=null;
  var usingRecordedTheme=false;

  function fetchDecode(url,ctx){
    return fetch(url).then(function(r){
      if(!r.ok)throw new Error('theme asset missing: '+url);
      return r.arrayBuffer();
    }).then(function(ab){return ctx.decodeAudioData(ab);});
  }

  function preloadTheme(){
    var ctx=(typeof actx==='function')?actx():null;
    if(!ctx)return;
    fetchDecode('audio/theme.ogg',ctx)
      .catch(function(){return fetchDecode('audio/theme.mp3',ctx);})
      .then(function(buf){themeBuffer=buf;})
      .catch(function(){/* no recorded theme available — synth fallback plays instead */});
  }

  /* ---------------- music engine (shares ui.js's AudioContext) ---------------- */
  var BPM=92, SWING=0.64;
  function beatSec(){return 60/BPM;}
  function barSec(){return 4*beatSec();}
  function midiHz(n){return 440*Math.pow(2,(n-69)/12);}
  function slotTime(barStart,slot){
    var beat=Math.floor(slot/2),off=slot%2===1;
    var t=barStart+beat*beatSec();
    if(off)t+=beatSec()*SWING;
    return t;
  }

  // ii - V - I - VIb9 turnaround in C, voiced for pad/bass. The lead line
  // is a separate 8-bar melody (below) that plays over these changes twice
  // per full cycle, giving the phrase room for a call, a response, and a
  // hook that returns.
  var CHORDS=[
    {pad:[50,53,57,60], bass:[38,41,45,48]}, // Dm7
    {pad:[43,53,59,65], bass:[31,35,38,41]}, // G7
    {pad:[48,52,55,59], bass:[36,40,43,47]}, // Cmaj7
    {pad:[45,49,55,58], bass:[33,37,40,43]}  // A7(b9)
  ];

  // An 8-bar hook: bars 0-3 state a rising call-and-response phrase that
  // resolves on the turnaround; bars 4-7 bring the hook back a step higher
  // and build to a held resolution — that held note is what the title
  // stamp's stinger lands on.
  var MELODY=[
    [{slot:1,note:69,dur:1},{slot:3,note:72,dur:1},{slot:5,note:74,dur:2.5}],           // bar0 (Dm7)  — the call
    [{slot:1,note:77,dur:1},{slot:3,note:74,dur:1},{slot:5,note:71,dur:2}],             // bar1 (G7)   — response, falling
    [{slot:1,note:72,dur:1},{slot:3,note:76,dur:1},{slot:5,note:79,dur:2.5}],           // bar2 (Cmaj7) — call, up a step
    [{slot:1,note:76,dur:1},{slot:3,note:73,dur:1},{slot:5,note:69,dur:2}],             // bar3 (A7b9) — turnaround resolve
    [{slot:1,note:69,dur:1},{slot:3,note:72,dur:1},{slot:5,note:74,dur:2.5}],           // bar4 (Dm7)  — hook returns (the recognizable repeat)
    [{slot:1,note:77,dur:1},{slot:3,note:72,dur:1},{slot:5,note:69,dur:2}],             // bar5 (G7)   — response, lower landing
    [{slot:1,note:76,dur:1},{slot:3,note:79,dur:1},{slot:5,note:84,dur:2.5}],           // bar6 (Cmaj7) — climax, pushed higher
    [{slot:1,note:79,dur:2},{slot:4,note:76,dur:4}]                                      // bar7 (A7b9) — the held resolution
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
    AUD.compressor.threshold.value=-18;AUD.compressor.knee.value=24;AUD.compressor.ratio.value=3;
    AUD.compressor.attack.value=0.012;AUD.compressor.release.value=0.3;
    AUD.dry=ctx.createGain();AUD.dry.gain.value=1;
    AUD.reverbSend=ctx.createGain();AUD.reverbSend.gain.value=1;
    AUD.convolver=ctx.createConvolver();
    try{AUD.convolver.buffer=buildImpulse(ctx,2.6,2.3);}catch(e){}
    AUD.reverbReturn=ctx.createGain();AUD.reverbReturn.gain.value=0.34;
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

  // Pad: four detuned saw/triangle layers through a gentle lowpass, two of
  // them wobbled by slow chorus LFOs for width and movement instead of one
  // bright bare saw.
  function scheduleChordVoice(ctx,freq,t0,dur,peak){
    var f=ctx.createBiquadFilter();
    f.type='lowpass';f.frequency.value=880;f.Q.value=0.3;
    var g=ctx.createGain();
    g.gain.setValueAtTime(0.0001,t0);
    g.gain.exponentialRampToValueAtTime(peak,t0+1.3);
    g.gain.setValueAtTime(peak,Math.max(t0+1.3,t0+dur-0.8));
    g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
    var nodes=[f,g];
    var layers=[{type:'sawtooth',detune:-9},{type:'sawtooth',detune:8},{type:'triangle',detune:-4},{type:'triangle',detune:5}];
    var mainOsc=null;
    layers.forEach(function(ly,i){
      var o=ctx.createOscillator();
      o.type=ly.type;o.frequency.value=freq;o.detune.value=ly.detune;
      if(i>=2){
        var lfo=ctx.createOscillator(),lfoGain=ctx.createGain();
        lfo.type='sine';lfo.frequency.value=0.14+i*0.05;lfoGain.gain.value=4;
        lfo.connect(lfoGain);lfoGain.connect(o.detune);
        lfo.start(t0);lfo.stop(t0+dur+0.1);
        nodes.push(lfo,lfoGain);
      }
      o.connect(f);
      o.start(t0);o.stop(t0+dur+0.1);
      nodes.push(o);
      if(!mainOsc)mainOsc=o;
    });
    f.connect(g);g.connect(AUD.dry);
    var sg=voiceSend(ctx,g,0.4);
    if(sg)nodes.push(sg);
    trackVoice(nodes,mainOsc);
  }

  // Bass: a triangle body with a quick plucked-attack transient plus a sine
  // sub layered an octave under for low-end weight.
  function scheduleBassNote(ctx,freq,t0){
    var dur=beatSec()*0.85;
    var o=ctx.createOscillator(),sub=ctx.createOscillator(),f=ctx.createBiquadFilter(),g=ctx.createGain(),gSub=ctx.createGain();
    o.type='triangle';o.frequency.value=freq;
    sub.type='sine';sub.frequency.value=freq/2;
    f.type='lowpass';f.frequency.value=360;f.Q.value=0.7;
    g.gain.setValueAtTime(0.0001,t0);
    g.gain.exponentialRampToValueAtTime(0.55,t0+0.008);
    g.gain.exponentialRampToValueAtTime(0.26,t0+0.1);
    g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
    gSub.gain.setValueAtTime(0.0001,t0);
    gSub.gain.exponentialRampToValueAtTime(0.3,t0+0.02);
    gSub.gain.exponentialRampToValueAtTime(0.0001,t0+dur*0.9);
    o.connect(f);f.connect(g);g.connect(AUD.dry);
    sub.connect(gSub);gSub.connect(AUD.dry);
    var sg=voiceSend(ctx,g,0.1);
    o.start(t0);sub.start(t0);o.stop(t0+dur+0.05);sub.stop(t0+dur+0.05);
    trackVoice([o,sub,f,g,gSub,sg].filter(Boolean),o);
  }

  function overdriveCurve(amount){
    var n=256,curve=new Float32Array(n);
    for(var i=0;i<n;i++){
      var x=i*2/n-1;
      curve[i]=(1+amount)*x/(1+amount*Math.abs(x));
    }
    return curve;
  }
  var LEAD_CURVE=null;

  // Lead: a filtered, gently overdriven sawtooth with a soft attack and a
  // bandpass "cup mute" resonance — reads as a muted trumpet, not a bare
  // triangle beep. Vibrato eases in after the note settles, like a player.
  function scheduleLeadNote(ctx,freq,t0,dur){
    if(!LEAD_CURVE)LEAD_CURVE=overdriveCurve(7);
    var o=ctx.createOscillator(),vib=ctx.createOscillator(),vibGain=ctx.createGain();
    var pre=ctx.createBiquadFilter(),shaper=ctx.createWaveShaper(),cup=ctx.createBiquadFilter(),g=ctx.createGain();
    o.type='sawtooth';o.frequency.value=freq;
    vib.type='sine';vib.frequency.value=5.2;vibGain.gain.value=0;
    vib.connect(vibGain);vibGain.connect(o.frequency);
    pre.type='lowpass';pre.frequency.value=1900;pre.Q.value=0.5;
    shaper.curve=LEAD_CURVE;shaper.oversample='2x';
    cup.type='bandpass';cup.frequency.value=Math.min(2000,freq*1.9);cup.Q.value=1.3;
    g.gain.setValueAtTime(0.0001,t0);
    g.gain.exponentialRampToValueAtTime(0.3,t0+0.09);
    g.gain.setValueAtTime(0.3,Math.max(t0+0.09,t0+dur-0.2));
    g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
    vibGain.gain.setValueAtTime(0,t0);
    vibGain.gain.linearRampToValueAtTime(4.5,t0+0.22);
    o.connect(pre);pre.connect(shaper);shaper.connect(cup);cup.connect(g);g.connect(AUD.dry);
    var sg=voiceSend(ctx,g,0.48);
    o.start(t0);vib.start(t0);o.stop(t0+dur+0.05);vib.stop(t0+dur+0.05);
    trackVoice([o,vib,vibGain,pre,shaper,cup,g,sg].filter(Boolean),o);
  }

  // Brushed-jazz percussion: a swelling filtered-noise "swish" instead of a
  // click, a short rim tick, and a soft sine kick with a pitch drop.
  function brushSwish(ctx,t0,dur,peak){
    var len=Math.max(1,Math.floor(ctx.sampleRate*dur)),buf=ctx.createBuffer(1,len,ctx.sampleRate),d=buf.getChannelData(0);
    for(var i=0;i<len;i++)d[i]=Math.random()*2-1;
    var src=ctx.createBufferSource();src.buffer=buf;
    var f=ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=3200;f.Q.value=0.7;
    var g=ctx.createGain();
    g.gain.setValueAtTime(0.0001,t0);
    g.gain.linearRampToValueAtTime(peak,t0+dur*0.55);
    g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
    src.connect(f);f.connect(g);g.connect(AUD.dry);
    var sg=voiceSend(ctx,g,0.2);
    src.start(t0);
    trackVoice([src,f,g,sg].filter(Boolean),src);
  }
  function rimTick(ctx,t0,peak){
    var o=ctx.createOscillator(),g=ctx.createGain();
    o.type='square';o.frequency.setValueAtTime(1800,t0);o.frequency.exponentialRampToValueAtTime(900,t0+0.02);
    g.gain.setValueAtTime(0.0001,t0);
    g.gain.exponentialRampToValueAtTime(peak,t0+0.004);
    g.gain.exponentialRampToValueAtTime(0.0001,t0+0.05);
    o.connect(g);g.connect(AUD.dry);
    o.start(t0);o.stop(t0+0.06);
    trackVoice([o,g],o);
  }
  function softKick(ctx,t0,peak){
    var o=ctx.createOscillator(),g=ctx.createGain();
    o.type='sine';o.frequency.setValueAtTime(118,t0);o.frequency.exponentialRampToValueAtTime(44,t0+0.22);
    g.gain.setValueAtTime(0.0001,t0);
    g.gain.exponentialRampToValueAtTime(peak,t0+0.012);
    g.gain.exponentialRampToValueAtTime(0.0001,t0+0.3);
    o.connect(g);g.connect(AUD.dry);
    o.start(t0);o.stop(t0+0.32);
    trackVoice([o,g],o);
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

  function scheduleBar(ctx,melodyBarIdx,barStart){
    var chord=CHORDS[melodyBarIdx%CHORDS.length];
    var mel=MELODY[melodyBarIdx%MELODY.length];
    chord.pad.forEach(function(n){scheduleChordVoice(ctx,midiHz(n),barStart,barSec()+0.3,0.045);});
    chord.bass.forEach(function(n,i){scheduleBassNote(ctx,midiHz(n),barStart+i*beatSec());});
    mel.forEach(function(l){scheduleLeadNote(ctx,midiHz(l.note),slotTime(barStart,l.slot),l.dur*beatSec()*0.5);});
    for(var s=0;s<8;s++){
      var t=slotTime(barStart,s);
      if(s===0)softKick(ctx,t,0.22);
      else if(s%2===1)brushSwish(ctx,t,0.22,0.055);
      else if(s===4)rimTick(ctx,t,0.045);
    }
  }

  function schedulePickup(ctx,t0){
    // A short rubato fragment on solo bass before the loop locks in.
    scheduleLeadNote(ctx,midiHz(74),t0,0.32);
    scheduleLeadNote(ctx,midiHz(72),t0+0.36,0.32);
    scheduleLeadNote(ctx,midiHz(69),t0+0.72,0.58);
    scheduleBassNote(ctx,midiHz(38),t0+0.05);
  }

  // The stinger rides the melody's own turnaround/resolution — the same
  // chord tones the pad and bass are already voicing at that instant, not
  // an unrelated stab.
  function playStinger(ctx,t0){
    [45,52,57,64,69,73].forEach(function(n,i){
      var o=ctx.createOscillator(),g=ctx.createGain();
      o.type=i%2?'sawtooth':'triangle';o.frequency.value=midiHz(n);
      g.gain.setValueAtTime(0.0001,t0);
      g.gain.exponentialRampToValueAtTime(0.15,t0+0.02);
      g.gain.exponentialRampToValueAtTime(0.0001,t0+1.6);
      o.connect(g);g.connect(AUD.dry);
      var sg=voiceSend(ctx,g,0.48);
      o.start(t0);o.stop(t0+1.7);
      trackVoice([o,g,sg].filter(Boolean),o);
    });
    noiseBurst(ctx,t0,1.4,'highpass',3400,0.7,0.13);
    var o=ctx.createOscillator(),g=ctx.createGain();
    o.type='sine';o.frequency.setValueAtTime(88,t0);o.frequency.exponentialRampToValueAtTime(46,t0+0.5);
    g.gain.setValueAtTime(0.0001,t0);g.gain.exponentialRampToValueAtTime(0.38,t0+0.03);g.gain.exponentialRampToValueAtTime(0.0001,t0+0.6);
    o.connect(g);g.connect(AUD.dry);
    o.start(t0);o.stop(t0+0.65);
    trackVoice([o,g],o);
  }

  function startSynthMusic(ctx){
    ensureMusicGraph(ctx);
    AUD.master.gain.cancelScheduledValues(ctx.currentTime);
    AUD.master.gain.setValueAtTime(0.0001,ctx.currentTime);
    AUD.master.gain.exponentialRampToValueAtTime(UI.soundOn?0.55:0.0001,ctx.currentTime+1.7); // "swells" in
    var startAt=ctx.currentTime+0.05;
    schedulePickup(ctx,startAt);
    AUD.nextBarTime=startAt+1.4;
    AUD.barIdx=0;AUD.running=true;
    tick();
    function tick(){
      if(!AUD.running)return;
      while(AUD.nextBarTime<ctx.currentTime+0.25){
        scheduleBar(ctx,AUD.barIdx%MELODY.length,AUD.nextBarTime);
        AUD.nextBarTime+=barSec();
        AUD.barIdx++;
      }
      AUD.timer=addT(tick,100);
    }
    return AUD.nextBarTime; // approx loop-start audio time, used for stinger sync
  }

  function startRecordedTheme(ctx){
    ensureMusicGraph(ctx);
    AUD.master.gain.cancelScheduledValues(ctx.currentTime);
    AUD.master.gain.setValueAtTime(0.0001,ctx.currentTime);
    AUD.master.gain.exponentialRampToValueAtTime(UI.soundOn?0.6:0.0001,ctx.currentTime+1.8);
    var src=ctx.createBufferSource();
    src.buffer=themeBuffer;src.loop=true;
    var g=ctx.createGain();g.gain.value=0.9;
    src.connect(g);g.connect(AUD.compressor);
    src.start(ctx.currentTime+0.05);
    trackVoice([g,src],src);
    usingRecordedTheme=true;
    return null; // no known bar grid to sync the stinger to — caller falls back to a fixed delay
  }

  function startMusic(ctx){
    if(themeBuffer)return startRecordedTheme(ctx);
    return startSynthMusic(ctx);
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
      AUD.master.gain.exponentialRampToValueAtTime(muted?0.0001:(usingRecordedTheme?0.6:0.55),t+0.35);
    }catch(e){}
  }

  /* ==========================================================================
     CHOREOGRAPHY — a build, not a flat list: fog/skyline fade up, the
     camera begins its push, river and routes ink in, the searchlight finds
     Mr. X, he dissolves into transport tokens streaking the real lines,
     the title stamps on the melody's resolution, a settle, then crossfade.
     ========================================================================== */
  var stingerAudioTime=null;

  function beginGesture(){
    if(phase!=='gate')return;
    phase='playing';
    var ctx=(typeof actx==='function')?actx():null;
    if(gateEl)gateEl.classList.add('hide');
    addT(function(){if(gateEl)gateEl.hidden=true;},500);
    if(artEl)artEl.classList.add('on');
    addT(function(){if(skipEl){skipEl.hidden=false;skipEl.classList.add('on');}},400);
    if(artState&&artState.camera&&!reduced)addT(function(){artState.camera.classList.add('push');},250);

    var loopStart=null;
    if(ctx)loopStart=startMusic(ctx);

    if(reduced){
      runReducedTimeline(ctx,loopStart);
    }else{
      runFullTimeline(ctx,loopStart);
    }
  }

  function runFullTimeline(ctx,loopStart){
    // Fog + rain + beam settle in as the shot opens.
    addT(function(){if(artState&&artState.beam)artState.beam.classList.add('on');},700);
    addT(function(){if(artState&&artState.rain)artState.rain.classList.add('on');},600);
    // River and routes ink in, real curves drawn on top of the skyline.
    addT(function(){if(artState&&artState.river)artState.river.style.strokeDashoffset='0';},1300);
    addT(function(){
      (artState&&artState.routes||[]).forEach(function(r){
        addT(function(){r.el.style.strokeDashoffset='0';},r.delay);
      });
    },2400);
    // The searchlight swings to find him, then Mr. X materializes.
    addT(function(){if(artState&&artState.beam)artState.beam.classList.add('found');},3900);
    addT(function(){if(artState&&artState.sil)artState.sil.classList.add('on');},4300);
    addT(function(){if(artState&&artState.sil)artState.sil.classList.add('gone');},8100);
    addT(function(){
      (artState&&artState.burst||[]).forEach(function(el){el.style.animationPlayState='running';});
    },8150);

    // The stamp/stinger land on the melody's held resolution (real
    // audio-clock time when the synth is driving, a tuned fallback when a
    // recorded track or no audio is playing) — the hold-and-resolve is
    // scheduled relative to *that* actual delay so it can never race ahead.
    var stampDelay=scheduleStamp(ctx,loopStart,4,11800,'stamp');
    scheduleResolve(stampDelay+2600,false);
  }

  function runReducedTimeline(ctx,loopStart){
    addT(function(){if(artState&&artState.river)artState.river.style.strokeDashoffset='0';},300);
    addT(function(){if(artState&&artState.sil)artState.sil.classList.add('on');},500);
    var stampDelay=scheduleStamp(ctx,loopStart,0,1200,'stampCalm');
    scheduleResolve(stampDelay+1800,false);
  }

  // barsAfterLoop: how many full bars past the loop's downbeat the stinger
  // should land on — lets the reduced-motion path hit the very first
  // downbeat while the full sequence rides the melody's held resolution
  // (bar 4, where the hook returns) a couple of bars in.
  function scheduleStamp(ctx,loopStart,barsAfterLoop,fallbackMs,stampClass){
    var delayMs=fallbackMs;
    if(ctx&&loopStart!=null){
      stingerAudioTime=loopStart+barsAfterLoop*barSec();
      delayMs=Math.max(200,(stingerAudioTime-ctx.currentTime)*1000-15);
    }
    addT(function(){
      if(titleEl)titleEl.classList.add(stampClass);
      if(artState&&artState.flash)artState.flash.classList.add('go');
      if(subEl)addT(function(){subEl.classList.add('on');},260);
      // A recorded track already has its own production; only layer the
      // synthesized accent when the procedural engine is the one playing.
      if(ctx&&!usingRecordedTheme)playStinger(ctx,stingerAudioTime!=null?Math.max(ctx.currentTime,stingerAudioTime):ctx.currentTime);
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
    preloadTheme(); // lazy-load the optional recorded theme during the black/gate phase
    phase='gate';
    on(catcher,'pointerdown',function(ev){ev.preventDefault();onSkipOrBegin();},{passive:false});
    on(document,'keydown',function(ev){if(ev.key==='Tab')return;onSkipOrBegin();});
  }

  window.startIntro=startIntro;
  window.introSetMuted=introSetMuted;
  window.introTeardown=function(){if(phase!=='done')finishTeardown();};
})();
