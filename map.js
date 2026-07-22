const MAP_H=761;
function $(s){return document.querySelector(s);}
function svgEl(tag){return document.createElementNS('http://www.w3.org/2000/svg',tag);}

/* ---------------- map build ---------------- */
var VB={x:0,y:0,w:1000,h:MAP_H};
var LAYER={};
function setVB(){$('#map').setAttribute('viewBox',VB.x+' '+VB.y+' '+VB.w+' '+VB.h);}
function hash2(a,b){var h=(a*73856093)^(b*19349663);h=(h^(h>>>13))>>>0;return h;}
function r1(v){return Math.round(v*10)/10;}
function edgeBow(a,b){
  var lo=Math.min(a,b),hi=Math.max(a,b);
  var A=POS[lo],B=POS[hi];
  var len=Math.hypot(B.x-A.x,B.y-A.y)||1;
  var h=hash2(lo,hi);
  return ((h&1)?1:-1)*Math.min(11,len*0.10)*(0.7+((h>>>3)%100)/240);
}
function quadPoint(A,B,bow,off,t){
  var dx=B.x-A.x,dy=B.y-A.y,len=Math.hypot(dx,dy)||1;
  var px=-dy/len,py=dx/len;
  var ax=A.x+px*off,ay=A.y+py*off,bx=B.x+px*off,by=B.y+py*off;
  var cx=(ax+bx)/2+px*bow,cy=(ay+by)/2+py*bow;
  var u=1-t;
  return {x:u*u*ax+2*u*t*cx+t*t*bx, y:u*u*ay+2*u*t*cy+t*t*by,
    dx:2*(u*(cx-ax)+t*(bx-cx)), dy:2*(u*(cy-ay)+t*(by-cy)),
    d:'M '+r1(ax)+' '+r1(ay)+' Q '+r1(cx)+' '+r1(cy)+' '+r1(bx)+' '+r1(by)};
}
function catmullPath(pts){
  var d='M '+r1(pts[0].x)+' '+r1(pts[0].y);
  for(var i=0;i<pts.length-1;i++){
    var p0=pts[Math.max(0,i-1)],p1=pts[i],p2=pts[i+1],p3=pts[Math.min(pts.length-1,i+2)];
    d+=' C '+r1(p1.x+(p2.x-p0.x)/6)+' '+r1(p1.y+(p2.y-p0.y)/6)+' '+r1(p2.x-(p3.x-p1.x)/6)+' '+r1(p2.y-(p3.y-p1.y)/6)+' '+r1(p2.x)+' '+r1(p2.y);
  }
  return d;
}
function buildMap(){
  if(UI.mapBuilt)return;UI.mapBuilt=true;
  var svg=$('#map');
  svg.setAttribute('viewBox','0 0 1000 '+MAP_H);
  var defs=svgEl('defs');
  defs.innerHTML=
    '<radialGradient id="paperG" gradientUnits="userSpaceOnUse" cx="500" cy="'+r1(MAP_H*0.42)+'" r="900">'+
      '<stop offset="0%" stop-color="#F8F4E6"/><stop offset="65%" stop-color="#F2EDD9"/><stop offset="100%" stop-color="#E7DEC4"/></radialGradient>'+
    '<radialGradient id="vigG" gradientUnits="userSpaceOnUse" cx="500" cy="'+r1(MAP_H*0.46)+'" r="700">'+
      '<stop offset="0%" stop-color="#3A2F16" stop-opacity="0"/><stop offset="76%" stop-color="#3A2F16" stop-opacity="0"/><stop offset="100%" stop-color="#3A2F16" stop-opacity="0.22"/></radialGradient>'+
    '<filter id="eShadow" x="-10%" y="-10%" width="120%" height="120%">'+
      '<feDropShadow dx="0" dy="1.1" stdDeviation="1.1" flood-color="#5A4A22" flood-opacity="0.30"/></filter>'+
    '<filter id="stShadow" x="-20%" y="-20%" width="140%" height="140%">'+
      '<feDropShadow dx="0" dy="1.3" stdDeviation="1.3" flood-color="#4A3D1E" flood-opacity="0.35"/></filter>'+
    '<pattern id="grain" width="120" height="120" patternUnits="userSpaceOnUse">'+
      '<image href="data:image/png;base64,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" width="120" height="120"/></pattern>';
  svg.appendChild(defs);
  defs.insertAdjacentHTML('beforeend','<filter id="pieceShadow" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="2" stdDeviation="1.8" flood-color="#05070A" flood-opacity="0.45"/></filter>');
  // Night ("chase board") assets — a dark lit surface, a deep vignette and a
  // colour-preserving neon bloom for the transit lines. These live in the DOM
  // in every mode but only take effect when body.board-night is set (styles.css),
  // so switching Day/Night is an instant class toggle with no map rebuild.
  defs.insertAdjacentHTML('beforeend',
    '<radialGradient id="boardNightG" gradientUnits="userSpaceOnUse" cx="500" cy="'+r1(MAP_H*0.42)+'" r="900">'+
      '<stop offset="0%" stop-color="#182B47"/><stop offset="52%" stop-color="#0F1E33"/><stop offset="100%" stop-color="#070E1B"/></radialGradient>'+
    '<radialGradient id="vigNightG" gradientUnits="userSpaceOnUse" cx="500" cy="'+r1(MAP_H*0.46)+'" r="720">'+
      '<stop offset="0%" stop-color="#03060C" stop-opacity="0"/><stop offset="62%" stop-color="#03060C" stop-opacity="0"/><stop offset="100%" stop-color="#03060C" stop-opacity="0.62"/></radialGradient>'+
    '<filter id="neonGlow" x="-30%" y="-30%" width="160%" height="160%">'+
      '<feGaussianBlur stdDeviation="2.1" result="b"/>'+
      '<feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>');
  // Realism substrate (Aerial / Atlas / Blueprint modes). All inert until a
  // board-<mode> class shows the relevant layers (styles.css). A single warm
  // "city lights" turbulence filter fakes an aerial view of the built-up city;
  // tiled patterns give city-block texture and a blueprint grid cheaply.
  defs.insertAdjacentHTML('beforeend',
    '<filter id="cityLights" x="0" y="0" width="100%" height="100%">'+
      '<feTurbulence type="fractalNoise" baseFrequency="0.42" numOctaves="2" seed="11" stitchTiles="stitch" result="n"/>'+
      '<feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 11 -6.1" result="a"/>'+
      '<feFlood flood-color="#FFD79A" result="c"/>'+
      '<feComposite in="c" in2="a" operator="in"/></filter>'+
    '<pattern id="blocksPat" width="30" height="30" patternUnits="userSpaceOnUse" patternTransform="rotate(9)">'+
      '<rect x="3" y="3" width="10" height="7.5" rx="1" fill="#1B2A3A" opacity="0.5"/>'+
      '<rect x="17" y="4" width="9.5" height="6.5" rx="1" fill="#1B2A3A" opacity="0.42"/>'+
      '<rect x="5" y="16" width="7.5" height="10" rx="1" fill="#1B2A3A" opacity="0.5"/>'+
      '<rect x="18" y="17" width="9" height="9" rx="1" fill="#1B2A3A" opacity="0.4"/></pattern>'+
    '<pattern id="bpGrid" width="27" height="27" patternUnits="userSpaceOnUse">'+
      '<path d="M27 0H0V27" fill="none" stroke="#4FD0E6" stroke-width="0.5" opacity="0.28"/>'+
      '<path d="M13.5 0V27M0 13.5H27" fill="none" stroke="#4FD0E6" stroke-width="0.3" opacity="0.14"/></pattern>');
  // Oversized so the board surface (paper / night board / etc.) fills the whole
  // viewport even when fillView() frames the map to a much wider aspect ratio —
  // no flat "empty" margin ever shows outside the board on wide phone screens.
  function bigRect(attrs){var r=svgEl('rect');r.setAttribute('x',-900);r.setAttribute('y',-560);r.setAttribute('width',2800);r.setAttribute('height',MAP_H+1120);for(var k in attrs)r.setAttribute(k,attrs[k]);svg.appendChild(r);return r;}
  // (The old procedural street-grid substrate is gone; mapart.js will draw
  // the real illustrated base city here.)
  // (districts, parks and their labels are drawn by mapart.js)
  // The water, land and all base geography come from mapart.js:
  buildGraywaterBase(svg,defs);
  // frame, compass, cartouche
  var orn=svgEl('g');orn.setAttribute('style','pointer-events:none');orn.setAttribute('class','map-orn');
  orn.innerHTML=
    '<rect x="6" y="6" width="988" height="'+(MAP_H-12)+'" rx="10" fill="none" stroke="#8A7B54" stroke-width="2" opacity="0.75"/>'+
    '<rect x="12" y="12" width="976" height="'+(MAP_H-24)+'" rx="7" fill="none" stroke="#8A7B54" stroke-width="0.8" opacity="0.6"/>'+
    '<g transform="translate(945,405)" opacity="0.85">'+
      '<circle r="22" fill="#F8F4E6" stroke="#8A7B54" stroke-width="1.4"/>'+
      '<circle r="17" fill="none" stroke="#8A7B54" stroke-width="0.6"/>'+
      '<path d="M 0 -15 L 3.4 -3.4 L 15 0 L 3.4 3.4 L 0 15 L -3.4 3.4 L -15 0 L -3.4 -3.4 Z" fill="#8A7B54"/>'+
      '<path d="M 0 -15 L 3.4 -3.4 L 15 0 L 3.4 3.4 L 0 15 L -3.4 3.4 L -15 0 L -3.4 -3.4 Z" fill="#B5A87E" transform="rotate(45) scale(0.55)"/>'+
      '<text class="carto" y="-27" text-anchor="middle" font-size="11">N</text></g>'+
    '<g transform="translate(225,675)" opacity="0.95">'+
      '<rect x="-126" y="-23" width="252" height="46" rx="6" fill="#F8F4E6" stroke="#8A7B54" stroke-width="1.5"/>'+
      '<rect x="-120" y="-17" width="240" height="34" rx="4" fill="none" stroke="#8A7B54" stroke-width="0.6"/>'+
      '<text class="carto" y="-2" text-anchor="middle" font-size="15" letter-spacing="6">GRAYWATER</text>'+
      '<text class="carto" y="13" text-anchor="middle" font-size="7.5" letter-spacing="3" opacity="0.8">A CHASE IN 199 STATIONS</text></g>';
  svg.appendChild(orn);
  // functional layers
  ['edges','ps','hl','stations'].forEach(function(n){var g=svgEl('g');g.setAttribute('id','L-'+n);svg.appendChild(g);LAYER[n]=g;});
  bigRect({fill:'url(#vigNightG)',style:'pointer-events:none','class':'bg-vig'});
  ['pieces','fx'].forEach(function(n){var g=svgEl('g');g.setAttribute('id','L-'+n);g.setAttribute('style','pointer-events:none');svg.appendChild(g);LAYER[n]=g;});
  // transport lines, gently curved with weight variation
  // Each type also gets a distinct stroke pattern (not just color) so the
  // taxi/bus/metro/ferry lines stay distinguishable under red-green
  // colorblindness, which is exactly the bus(green)/metro(red) pair.
  var order={t:0,b:1,u:2,f:3};
  var col={t:'#DFAE1F',b:'#2F8A52',u:'#D23A3A',f:'#3E6E8E'};
  var dash={t:'',b:'10 6',u:'15 3 2 3',f:'0.1 6.5'};
  var lines=[];
  PAIRS.forEach(function(p){
    var types=p.types.slice().sort(function(a,b){return order[a]-order[b];});
    var bow=edgeBow(p.a,p.b);
    types.forEach(function(t,i){
      lines.push({t:t,a:p.a,b:p.b,bow:bow,off:(i-(types.length-1)/2)*4.4});
    });
  });
  lines.sort(function(a,b){return order[a.t]-order[b.t];});
  var eh='';
  lines.forEach(function(l){
    var q=quadPoint(POS[l.a],POS[l.b],l.bow,l.off,0);
    var hsh=hash2(l.a*7+order[l.t],l.b);
    var w=l.t==='t'?(2.0+(hsh%5)*0.12):l.t==='b'?(3.3+(hsh%4)*0.15):l.t==='u'?4.7:3.0;
    if(l.t==='u'||l.t==='b')eh+='<path class="ehalo" d="'+q.d+'" fill="none" stroke="#F6F1DF" stroke-width="'+r1(w+2.4)+'" stroke-linecap="round"/>';
    eh+='<path class="e e-'+l.t+'" d="'+q.d+'" fill="none" stroke="'+col[l.t]+'" stroke-width="'+r1(w)+'" stroke-linecap="round" stroke-opacity="'+(l.t==='t'?0.92:0.95)+'"'+(dash[l.t]?' stroke-dasharray="'+dash[l.t]+'"':'')+'/>';
  });
  LAYER.edges.innerHTML=eh;
  LAYER.edges.setAttribute('filter','url(#eShadow)');
  // stations: landmark markers with transport pips
  var pipc={t:'#D9A61F',b:'#2F8A52',u:'#C22B2B',f:'#3E6E8E'};
  for(var i=1;i<=199;i++){
    var hasU=false,hasB=false,hasF=false;
    NBRS[i].forEach(function(e){if(e.t==='u')hasU=true;if(e.t==='b')hasB=true;if(e.t==='f')hasF=true;});
    var r=hasU?8.6:hasB?6.9:5.5;
    var g=svgEl('g');
    g.setAttribute('class','stg');g.setAttribute('data-id',i);
    g.setAttribute('transform','translate('+POS[i].x+','+POS[i].y+')');
    var h='';
    if(hasU)h+='<circle class="st-u" r="'+r1(r+3.4)+'" fill="#FDF9EE" stroke="#C22B2B" stroke-width="2.4"/>';
    if(hasB)h+='<circle class="st-b" r="'+r1(r+1.6)+'" fill="'+(hasU?'none':'#FDF9EE')+'" stroke="#2F8A52" stroke-width="1.7"/>';
    h+='<circle class="st-core" r="'+r+'" fill="#FDFBF2" stroke="#4A4130" stroke-width="1.2"/>';
    h+='<text class="st-num st-lbl" y="'+r1(r*0.40)+'" text-anchor="middle" font-size="'+(hasU?7.4:hasB?6.6:6)+'">'+i+'</text>';
    var modes=['t'];if(hasB)modes.push('b');if(hasU)modes.push('u');if(hasF)modes.push('f');
    if(modes.length>1){
      var bw=modes.length*5.6+3.2,by=r1(r+(hasU?5.4:3.6));
      h+='<rect class="st-pip" x="'+r1(-bw/2)+'" y="'+by+'" width="'+r1(bw)+'" height="5.6" rx="2.8" fill="#FDF9EE" stroke="#4A4130" stroke-width="0.7"/>';
      modes.forEach(function(mm,k){
        h+='<circle cx="'+r1(-bw/2+4.4+k*5.6)+'" cy="'+r1(by+2.8)+'" r="1.7" fill="'+pipc[mm]+'"/>';
      });
    }
    g.innerHTML=h;
    // Taps/clicks are handled centrally by handleTap() in the pan/zoom layer,
    // which does proper drag-vs-tap detection and nearest-station hit-testing.
    // A per-station click listener here would be a second, independent path
    // that can disagree with handleTap (double-firing, chooser-dismiss races),
    // so we deliberately do not attach one.
    LAYER.stations.appendChild(g);
  }
  LAYER.stations.setAttribute('filter','url(#stShadow)');
  initPanZoom();
}
/* ---------------- pan / zoom ---------------- */
function initPanZoom(){
  var svg=$('#map'),ptrs={},panStart=null,pinch=null;
  // Coalesce viewBox writes to one per animation frame instead of one per raw
  // pointermove — touchmove can fire far faster than the display refresh rate,
  // and each redundant setAttribute()+layout was visible as mobile pan/pinch
  // jank. Pointer tracking itself (cheap, no DOM access) still happens on
  // every event so the gesture never feels like it's lagging behind a finger.
  var rafPending=false;
  function scheduleVB(){
    if(rafPending)return;
    rafPending=true;
    requestAnimationFrame(function(){rafPending=false;setVB();});
  }
  function clientToMap(cx,cy){
    // Use the SVG's own coordinate transform so we honour the viewBox's
    // preserveAspectRatio letterboxing. A naive rect-based mapping assumes
    // the viewBox stretches to fill the element, which is wrong whenever the
    // map area's aspect ratio differs from the viewBox (e.g. portrait/mobile)
    // and makes taps resolve to the wrong station.
    var ctm=svg.getScreenCTM();
    if(ctm){
      var pt=svg.createSVGPoint();pt.x=cx;pt.y=cy;
      var loc=pt.matrixTransform(ctm.inverse());
      return {x:loc.x,y:loc.y};
    }
    var r=svg.getBoundingClientRect();
    return {x:VB.x+(cx-r.left)/r.width*VB.w, y:VB.y+(cy-r.top)/r.height*VB.h};
  }
  svg.addEventListener('wheel',function(ev){
    ev.preventDefault();
    var k=ev.deltaY>0?1.15:0.87;
    var p=clientToMap(ev.clientX,ev.clientY);
    var nw=Math.min(2400,Math.max(120,VB.w*k)),nh=nw*(MAP_H/1000);
    VB.x=p.x-(p.x-VB.x)*(nw/VB.w);VB.y=p.y-(p.y-VB.y)*(nh/VB.h);
    VB.w=nw;VB.h=nh;scheduleVB();
  },{passive:false});
  svg.addEventListener('pointerdown',function(ev){
    try{svg.setPointerCapture(ev.pointerId);}catch(e){}
    ptrs[ev.pointerId]={x:ev.clientX,y:ev.clientY};
    var ids=Object.keys(ptrs);
    if(ids.length===1){panStart={cx:ev.clientX,cy:ev.clientY,vx:VB.x,vy:VB.y,t:Date.now(),moved:0,rect:svg.getBoundingClientRect()};svg.classList.add('dragging');}
    else if(ids.length===2){
      panStart=null;
      var a=ptrs[ids[0]],b=ptrs[ids[1]];
      pinch={d:Math.hypot(a.x-b.x,a.y-b.y),w:VB.w,cx:(a.x+b.x)/2,cy:(a.y+b.y)/2};
      // clientToMap() below needs VB as of *this* gesture's start, and the
      // element's rect can't change mid-pinch, so both are captured once here
      // rather than read again on every pointermove.
      pinch.anchor=clientToMap(pinch.cx,pinch.cy);
      pinch.vx=VB.x;pinch.vy=VB.y;
    }
  });
  svg.addEventListener('pointermove',function(ev){
    if(!ptrs[ev.pointerId])return;
    ptrs[ev.pointerId]={x:ev.clientX,y:ev.clientY};
    var ids=Object.keys(ptrs);
    if(ids.length===1&&panStart){
      var r=panStart.rect;
      panStart.moved=Math.max(panStart.moved,Math.hypot(ev.clientX-panStart.cx,ev.clientY-panStart.cy));
      VB.x=panStart.vx-(ev.clientX-panStart.cx)/r.width*VB.w;
      VB.y=panStart.vy-(ev.clientY-panStart.cy)/r.height*VB.h;
      scheduleVB();
    }else if(ids.length===2&&pinch){
      var a=ptrs[ids[0]],b=ptrs[ids[1]];
      var d=Math.hypot(a.x-b.x,a.y-b.y)||1;
      var p=pinch.anchor;
      var nw=Math.min(2400,Math.max(120,pinch.w*pinch.d/d)),nh=nw*(MAP_H/1000);
      // Both axes scale by the same factor (zoom is aspect-locked), so the
      // fixed anchor point (captured once at gesture start, see pointerdown)
      // maps to the new viewBox the same way on x and y.
      var scale=nw/pinch.w;
      VB.x=p.x-(p.x-pinch.vx)*scale;VB.y=p.y-(p.y-pinch.vy)*scale;
      VB.w=nw;VB.h=nh;scheduleVB();
    }
  });
  function up(ev){
    var tap=panStart&&Object.keys(ptrs).length===1&&panStart.moved<7&&(Date.now()-panStart.t)<700;
    delete ptrs[ev.pointerId];panStart=null;pinch=null;svg.classList.remove('dragging');
    if(tap)handleTap(ev);
  }
  function handleTap(ev){
    var p=clientToMap(ev.clientX,ev.clientY);
    var r=svg.getBoundingClientRect();
    var thr=Math.max(13,18*VB.w/Math.max(1,r.width));
    var bestId=0,bestD=1e9;
    for(var i=1;i<=199;i++){
      var d=Math.hypot(POS[i].x-p.x,POS[i].y-p.y);
      if(d<bestD){bestD=d;bestId=i;}
    }
    if(bestId&&bestD<=thr)onStationClick(bestId,ev);
    else{var c=$('#chooser');if(c)c.hidden=true;}
  }
  svg.addEventListener('pointerup',up);svg.addEventListener('pointercancel',up);
  $('#zin').onclick=function(){zoomBy(0.8);};
  $('#zout').onclick=function(){zoomBy(1.25);};
  $('#zfit').onclick=function(){fillView();};
  // Re-frame to fill on orientation change (the main viewport-shape change on
  // phones); a plain resize is left alone so it never fights a desktop user's pan.
  window.addEventListener('orientationchange',function(){setTimeout(fillView,120);});
}
// Frame the whole station network so it stays fully visible AND the board fills
// the viewport with no letterbox: expand the viewBox to the viewport's aspect
// ratio around the map, so preserveAspectRatio="meet" lands edge-to-edge.
function fillView(){
  var a=$('#maparea');if(!a)return;
  var r=a.getBoundingClientRect();
  if(!r.width||!r.height){VB={x:0,y:0,w:1000,h:MAP_H};setVB();return;}
  var arA=r.width/r.height,mapA=1000/MAP_H,vbw,vbh;
  if(arA>=mapA){vbh=MAP_H;vbw=MAP_H*arA;}
  else{vbw=1000;vbh=1000/arA;}
  VB={x:(1000-vbw)/2,y:(MAP_H-vbh)/2,w:vbw,h:vbh};
  setVB();
}
function zoomBy(k){
  var cx=VB.x+VB.w/2,cy=VB.y+VB.h/2;
  VB.w=Math.min(2400,Math.max(120,VB.w*k));VB.h=VB.w*(MAP_H/1000);
  VB.x=cx-VB.w/2;VB.y=cy-VB.h/2;setVB();
}
var focusAnim=null;
function focusStation(x,y){
  if(focusAnim)focusAnim.cancelled=true;
  var anim={cancelled:false};
  focusAnim=anim;
  var x0=VB.x,y0=VB.y;
  var tx=x-VB.w/2,ty=y-VB.h/2;
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var dur=reduce?1:320;
  var t0=performance.now();
  function step(now){
    if(anim.cancelled)return;
    var k=(now-t0)/dur;if(k>1)k=1;
    var e=k<0.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
    VB.x=x0+(tx-x0)*e;VB.y=y0+(ty-y0)*e;setVB();
    if(k<1)requestAnimationFrame(step);
    else if(focusAnim===anim)focusAnim=null;
  }
  requestAnimationFrame(step);
}
/* ---------------- vehicles + animation ---------------- */
function vehicleSvg(kind){
  if(kind==='t')return '<g>'+
    '<ellipse cx="0" cy="6.6" rx="12.5" ry="4.1" fill="rgba(6,10,14,.32)"/>'+
    '<path d="M -11.5 3.8 C -10.9 0.5 -8.4 -2.6 -4.7 -3.9 L 4.9 -3.9 C 8.6 -2.6 11.1 0.5 11.5 3.8 L 11.5 5.2 C 11.5 7.6 9.2 9.2 6.4 9.2 L -6.4 9.2 C -9.2 9.2 -11.5 7.6 -11.5 5.2 Z" fill="#E1AA20" stroke="#1E222A" stroke-width="1.1"/>'+
    '<path d="M -8.7 0.8 L -4.1 -2.2 L 5.7 -2.2 L 8.4 0.8 Z" fill="#F6CF59" opacity=".95"/>'+
    '<path d="M -9.2 3.2 L 9.2 3.2 L 9.2 5.8 C 7.8 6.8 6 7.2 4.2 7.2 L -4.2 7.2 C -6 7.2 -7.8 6.8 -9.2 5.8 Z" fill="#B47E10" opacity=".24"/>'+
    '<rect x="-4.5" y="-6.6" width="9" height="4.7" rx="1.6" fill="#F3D86A" stroke="#1E222A" stroke-width="1"/>'+
    '<rect x="-3.6" y="-5.8" width="7.2" height="3" rx="1" fill="#BFE3F2"/>'+
    '<rect x="-1.8" y="-8.9" width="3.6" height="2.1" rx="0.8" fill="#1E222A"/>'+
    '<circle cx="-6.2" cy="4.8" r="2.5" fill="#1E222A"/><circle cx="6.2" cy="4.8" r="2.5" fill="#1E222A"/>'+
    '<circle cx="-6.2" cy="4.8" r="0.95" fill="#B8C0CB"/><circle cx="6.2" cy="4.8" r="0.95" fill="#B8C0CB"/>'+
    '<ellipse cx="-2.8" cy="-2.9" rx="4.2" ry="2" fill="rgba(255,255,255,.28)"/></g>';
  if(kind==='b')return '<g>'+
    '<ellipse cx="0" cy="7" rx="15.6" ry="4.6" fill="rgba(6,10,14,.32)"/>'+
    '<path d="M -14.3 2.4 C -13.8 -1.1 -11.1 -4.5 -7.5 -5.4 L 7.5 -5.4 C 11.1 -4.5 13.8 -1.1 14.3 2.4 L 14.3 8.1 C 14.3 10 12.7 11.2 10.4 11.2 L -10.4 11.2 C -12.7 11.2 -14.3 10 -14.3 8.1 Z" fill="#2F8A52" stroke="#183D27" stroke-width="1.1"/>'+
    '<path d="M -11.2 -1.5 L 11.2 -1.5 L 10.2 4.5 L -10.2 4.5 Z" fill="#3EA065" opacity=".95"/>'+
    '<path d="M -11.2 4.5 L 11.2 4.5 L 11.2 7.8 C 9.3 8.9 7.2 9.4 4.8 9.4 L -4.8 9.4 C -7.2 9.4 -9.3 8.9 -11.2 7.8 Z" fill="#1B4A2E" opacity=".22"/>'+
    '<rect x="-12" y="-3.7" width="4.9" height="3.1" rx="0.9" fill="#D7F0E2"/><rect x="-6.1" y="-3.7" width="4.9" height="3.1" rx="0.9" fill="#D7F0E2"/><rect x="-0.2" y="-3.7" width="4.9" height="3.1" rx="0.9" fill="#D7F0E2"/><rect x="5.7" y="-3.7" width="4.9" height="3.1" rx="0.9" fill="#D7F0E2"/>'+
    '<rect x="-12" y="0.9" width="4.9" height="3.1" rx="0.9" fill="#D7F0E2"/><rect x="-6.1" y="0.9" width="4.9" height="3.1" rx="0.9" fill="#D7F0E2"/><rect x="-0.2" y="0.9" width="4.9" height="3.1" rx="0.9" fill="#D7F0E2"/>'+
    '<circle cx="-8.8" cy="6.4" r="2.6" fill="#1E222A"/><circle cx="8.8" cy="6.4" r="2.6" fill="#1E222A"/>'+
    '<circle cx="-8.8" cy="6.4" r="1" fill="#B8C0CB"/><circle cx="8.8" cy="6.4" r="1" fill="#B8C0CB"/>'+
    '<ellipse cx="-3.8" cy="-4" rx="5" ry="2.3" fill="rgba(255,255,255,.22)"/></g>';
  if(kind==='u')return '<g>'+
    '<ellipse cx="0" cy="5.6" rx="16" ry="4.1" fill="rgba(6,10,14,.30)"/>'+
    '<path d="M -15.2 -2.4 C -13.9 -6.1 -11.2 -7.2 -8.5 -7.2 L 8.5 -7.2 C 11.2 -7.2 13.9 -6.1 15.2 -2.4 L 15.2 3.9 C 15.2 7.8 12.2 10.4 8.7 10.4 L -8.7 10.4 C -12.2 10.4 -15.2 7.8 -15.2 3.9 Z" fill="#D23A3A" stroke="#8A1F1F" stroke-width="1.1"/>'+
    '<path d="M -11.9 -4.2 L 11.9 -4.2 L 10.6 0.5 L -10.6 0.5 Z" fill="#E85D5D" opacity=".95"/>'+
    '<path d="M -11.4 1.2 L 11.4 1.2 L 11.4 4.8 C 9.6 6.1 7.4 6.7 4.9 6.7 L -4.9 6.7 C -7.4 6.7 -9.6 6.1 -11.4 4.8 Z" fill="#8A1F1F" opacity=".22"/>'+
    '<rect x="-10.8" y="-2.6" width="4.9" height="3.4" rx="1" fill="#FBEDED"/><rect x="-4.8" y="-2.6" width="4.9" height="3.4" rx="1" fill="#FBEDED"/><rect x="1.2" y="-2.6" width="4.9" height="3.4" rx="1" fill="#FBEDED"/>'+
    '<rect x="7.2" y="-2.6" width="2.8" height="3.4" rx="1" fill="#FBEDED"/>'+
    '<circle cx="12.7" cy="0.1" r="1.5" fill="#FFE9A8"/>'+
    '<rect x="-12.4" y="4.9" width="24.8" height="1.2" rx="0.6" fill="rgba(0,0,0,.2)"/>'+
    '<circle cx="-9.5" cy="6.1" r="2.4" fill="#1E222A"/><circle cx="9.5" cy="6.1" r="2.4" fill="#1E222A"/>'+
    '<circle cx="-9.5" cy="6.1" r="0.95" fill="#B8C0CB"/><circle cx="9.5" cy="6.1" r="0.95" fill="#B8C0CB"/>'+
    '<ellipse cx="-4" cy="-5.2" rx="5.2" ry="2.2" fill="rgba(255,255,255,.20)"/></g>';
  if(kind==='boat')return '<g>'+
    '<ellipse cx="0" cy="7" rx="15.2" ry="4.4" fill="rgba(6,10,14,.30)"/>'+
    '<path d="M -13.8 1.4 L 13.8 1.4 L 9.2 8.8 L -9.2 8.8 Z" fill="#23303C" stroke="#101820" stroke-width="1"/>'+
    '<path d="M -11.2 0.2 L 11.2 0.2 L 8.2 5.6 L -8.2 5.6 Z" fill="#33404D" opacity=".95"/>'+
    '<path d="M -10.2 6.1 L 10.2 6.1 L 8.2 8.8 L -8.2 8.8 Z" fill="#101820" opacity=".2"/>'+
    '<rect x="-5.8" y="-3.7" width="11.6" height="5.8" rx="1.3" fill="#E9EEF4" stroke="#8E99A5" stroke-width="0.8"/>'+
    '<rect x="-3.8" y="-6.7" width="2.8" height="4" rx="0.8" fill="#E9EEF4"/>'+
    '<rect x="1.2" y="-7.5" width="3.1" height="4.8" rx="0.8" fill="#E24A4A"/>'+
    '<path d="M 3.1 -7.4 L 9.8 -12.5" stroke="#D9C79B" stroke-width="1.2" stroke-linecap="round"/>'+
    '<path d="M 9.8 -12.5 L 12.6 -12.5" stroke="#D9C79B" stroke-width="1.2" stroke-linecap="round"/>'+
    '<ellipse cx="-2.5" cy="-2.7" rx="4" ry="1.9" fill="rgba(255,255,255,.24)"/>'+
    '<path d="M -12 9.6 Q 0 13.2 12 9.6" fill="none" stroke="#E6D7A7" stroke-width="1.2" stroke-linecap="round" opacity=".8"/></g>';
  // black mystery sedan
  return '<g>'+
    '<ellipse cx="0" cy="6.2" rx="13.1" ry="4.1" fill="rgba(6,10,14,.34)"/>'+
    '<path d="M -11 -0.2 C -9.7 -3.8 -7.1 -5.8 -3.8 -6.4 L 3.8 -6.4 C 7.1 -5.8 9.7 -3.8 11 -0.2 L 11 4.8 C 11 7.2 8.9 8.8 6.4 8.8 L -6.4 8.8 C -8.9 8.8 -11 7.2 -11 4.8 Z" fill="#14181D" stroke="#F2C230" stroke-width="0.9"/>'+
    '<path d="M -8.9 -2.8 L -4.2 -5.4 L 4.2 -5.4 L 8.9 -2.8 Z" fill="#1D232C"/>'+
    '<path d="M -8.3 0.7 L 8.3 0.7 L 8.3 4.2 C 7 5 5.6 5.4 4 5.4 L -4 5.4 C -5.6 5.4 -7 5 -8.3 4.2 Z" fill="#2D3745"/>'+
    '<rect x="-4.8" y="-6.9" width="9.6" height="4.1" rx="1.6" fill="#14181D" stroke="#F2C230" stroke-width="0.9"/>'+
    '<rect x="-3.8" y="-6.1" width="7.6" height="2.6" rx="1" fill="#3A4656"/>'+
    '<circle cx="-5.8" cy="4.7" r="2.4" fill="#000"/><circle cx="5.8" cy="4.7" r="2.4" fill="#000"/>'+
    '<circle cx="-5.8" cy="4.7" r="0.95" fill="#F2C230"/><circle cx="5.8" cy="4.7" r="0.95" fill="#F2C230"/>'+
    '<ellipse cx="-2.7" cy="-4.5" rx="4.1" ry="1.9" fill="rgba(255,255,255,.16)"/>'+
    '<path d="M -9.5 6.9 Q 0 8.6 9.5 6.9" fill="none" stroke="rgba(255,242,168,.5)" stroke-width="1" stroke-linecap="round"/></g>';
}
function trailDot(x,y,c){
  var d=svgEl('circle');
  d.setAttribute('cx',x);d.setAttribute('cy',y);d.setAttribute('r',2.6);
  d.setAttribute('fill',c);d.setAttribute('class','puff');
  LAYER.fx.appendChild(d);
  setTimeout(function(){d.remove();},600);
}
function animateVehicle(from,to,tk){
  return new Promise(function(res){
    var boat=tk==='x'&&isFerryOnly(from,to);
    var kind=boat?'boat':tk;
    sfxForTicket(tk,boat);
    var A=POS[from],B=POS[to];
    var bow=edgeBow(from,to);
    var len=Math.hypot(B.x-A.x,B.y-A.y)||1;
    var overall=Math.atan2(B.y-A.y,B.x-A.x)*180/Math.PI;
    var flip=(overall>90||overall<-90)?-1:1;
    var g=svgEl('g');g.setAttribute('class','veh');g.innerHTML=vehicleSvg(kind);
    LAYER.fx.appendChild(g);
    var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var dur=reduce?150:Math.max(520,Math.min(1150,len*9));
    var t0=performance.now(),lastTrail=0;
    var tc=TKCOL[boat?'boat':tk];
    function step(now){
      var k=(now-t0)/dur;if(k>1)k=1;
      var e=k<0.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
      var q=quadPoint(A,B,bow,0,e);
      var ang=Math.atan2(q.dy,q.dx)*180/Math.PI;
      var bob=(kind==='u')?0:(kind==='boat'?Math.sin(k*10)*1.6:Math.sin(k*24)*1.1);
      g.setAttribute('transform','translate('+q.x+','+q.y+') rotate('+ang+') scale(1,'+flip+') translate(0,'+bob+')');
      if(now-lastTrail>46&&k>0.05&&k<0.95){
        lastTrail=now;
        var qt=quadPoint(A,B,bow,0,Math.max(0,e-0.05));
        trailDot(qt.x,qt.y,tc);
      }
      if(k<1)requestAnimationFrame(step);
      else{g.remove();res();}
    }
    requestAnimationFrame(step);
  });
}
function revealPing(st){
  var c=svgEl('circle');
  c.setAttribute('cx',POS[st].x);c.setAttribute('cy',POS[st].y);c.setAttribute('r',16);
  c.setAttribute('class','revping');
  LAYER.fx.appendChild(c);
  setTimeout(function(){c.remove();},3400);
}
function hiddenMoveFx(tk){ // the Phantom moved in secret: sound of the ticket + stamped log cell
  sfxForTicket(tk,false);
  return new Promise(function(res){setTimeout(res,500);});
}
