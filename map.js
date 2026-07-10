const MAP_H=761;
function $(s){return document.querySelector(s);}
function svgEl(tag){return document.createElementNS('http://www.w3.org/2000/svg',tag);}
const GRAIN_B64='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';
/* ---------------- map build ---------------- */
var VB={x:0,y:0,w:1000,h:MAP_H};
var LAYER={};
function setVB(){$('#map').setAttribute('viewBox',VB.x+' '+VB.y+' '+VB.w+' '+VB.h);requestBgRedraw();}
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
function getRiverCtrlPts(){
  var FP=[194,157,115,108].map(function(s){return POS[s];});
  var pre={x:FP[0].x+(FP[0].x-FP[1].x)*0.9,y:FP[0].y+(FP[0].y-FP[1].y)*0.9};
  var post={x:FP[3].x+(FP[3].x-FP[2].x)*0.75,y:FP[3].y+(FP[3].y-FP[2].y)*0.75};
  return [pre,FP[0],FP[1],FP[2],FP[3],post];
}
function buildMap(){
  if(UI.mapBuilt)return;UI.mapBuilt=true;
  var svg=$('#map');
  svg.setAttribute('viewBox','0 0 1000 '+MAP_H);
  var defs=svgEl('defs');
  defs.innerHTML=
    '<radialGradient id="paperG" gradientUnits="userSpaceOnUse" cx="500" cy="'+r1(MAP_H*0.42)+'" r="900">'+
      '<stop offset="0%" stop-color="#1B2431" stop-opacity="0.16"/><stop offset="65%" stop-color="#141C27" stop-opacity="0.2"/><stop offset="100%" stop-color="#0B121A" stop-opacity="0.3"/></radialGradient>'+
    '<radialGradient id="vigG" gradientUnits="userSpaceOnUse" cx="500" cy="'+r1(MAP_H*0.46)+'" r="700">'+
      '<stop offset="0%" stop-color="#05080D" stop-opacity="0"/><stop offset="70%" stop-color="#05080D" stop-opacity="0"/><stop offset="100%" stop-color="#05080D" stop-opacity="0.5"/></radialGradient>'+
    '<filter id="eShadow" x="-10%" y="-10%" width="120%" height="120%">'+
      '<feDropShadow dx="0" dy="1.1" stdDeviation="1.1" flood-color="#05080D" flood-opacity="0.55"/></filter>'+
    '<filter id="lineGlow" x="-60%" y="-60%" width="220%" height="220%">'+
      '<feGaussianBlur stdDeviation="1.6" result="b"/>'+
      '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'+
    '<filter id="stShadow" x="-30%" y="-30%" width="160%" height="160%">'+
      '<feDropShadow dx="0" dy="1.2" stdDeviation="1.4" flood-color="#000" flood-opacity="0.55"/></filter>'+
    '<filter id="lampGlow" x="-120%" y="-120%" width="340%" height="340%">'+
      '<feGaussianBlur stdDeviation="2.4"/></filter>'+
    '<linearGradient id="glassGrad" x1="0" y1="0" x2="0" y2="1">'+
      '<stop offset="0%" stop-color="#BFE3F2"/><stop offset="100%" stop-color="#5E86A2"/></linearGradient>'+
    '<radialGradient id="brassG" cx="35%" cy="30%" r="75%">'+
      '<stop offset="0%" stop-color="#F5DFA3"/><stop offset="55%" stop-color="#D9A94C"/><stop offset="100%" stop-color="#9C742A"/></radialGradient>'+
    '<pattern id="grain" width="120" height="120" patternUnits="userSpaceOnUse">'+
      '<image href="data:image/png;base64,'+GRAIN_B64+'" width="120" height="120"/></pattern>';
  svg.appendChild(defs);
  function bigRect(attrs){var r=svgEl('rect');r.setAttribute('x',-400);r.setAttribute('y',-400);r.setAttribute('width',1800);r.setAttribute('height',MAP_H+800);for(var k in attrs)r.setAttribute(k,attrs[k]);svg.appendChild(r);return r;}
  bigRect({fill:'url(#paperG)'});
  bigRect({fill:'url(#grain)',opacity:'0.10',style:'mix-blend-mode:overlay;pointer-events:none'});
  // district & park labels only (visual texture now lives in the canvas landscape layer)
  var deco=svgEl('g');deco.setAttribute('style','pointer-events:none');svg.appendChild(deco);
  var dh='';
  var parks=[[180,405,"HYDE PARK"],[140,56,"REGENT'S PARK"],[900,672,"GREENWICH PARK"]];
  parks.forEach(function(p){
    dh+='<text class="parklabel" x="'+p[0]+'" y="'+p[1]+'" text-anchor="middle" font-size="10.5" letter-spacing="2.5">'+p[2]+'</text>';
  });
  var dlabels=[[360,459,'WESTMINSTER',15],[630,604,'SOUTHWARK',14],[765,356,'THE CITY',14],[810,179,'CAMDEN',13],[585,48,'MARYLEBONE',12],[450,228,'SOHO',11]];
  dlabels.forEach(function(l){dh+='<text class="maplabel" x="'+l[0]+'" y="'+l[1]+'" text-anchor="middle" font-size="'+l[3]+'" letter-spacing="4">'+l[2]+'</text>';});
  deco.innerHTML=dh;
  // River Thames: dashed wayfinding centerline + label (the water surface itself is painted by the canvas landscape below)
  var rp=catmullPath(getRiverCtrlPts());
  var river=svgEl('g');river.setAttribute('style','pointer-events:none');
  river.innerHTML=
    '<path d="'+rp+'" fill="none" stroke="#8FB4CC" stroke-width="1.3" stroke-dasharray="10 14" opacity="0.5"/>'+
    '<path id="thamesPath" d="'+rp+'" fill="none"/>'+
    '<text class="riverlabel"><textPath href="#thamesPath" startOffset="57%">RIVER  THAMES</textPath></text>';
  svg.appendChild(river);
  // frame, compass, cartouche
  var orn=svgEl('g');orn.setAttribute('style','pointer-events:none');
  orn.innerHTML=
    '<rect x="6" y="6" width="988" height="'+(MAP_H-12)+'" rx="10" fill="none" stroke="#B79A54" stroke-width="2" opacity="0.55"/>'+
    '<rect x="12" y="12" width="976" height="'+(MAP_H-24)+'" rx="7" fill="none" stroke="#B79A54" stroke-width="0.8" opacity="0.4"/>'+
    '<g transform="translate(945,405)" opacity="0.85">'+
      '<circle r="22" fill="#12181F" stroke="#B79A54" stroke-width="1.4"/>'+
      '<circle r="17" fill="none" stroke="#B79A54" stroke-width="0.6"/>'+
      '<path d="M 0 -15 L 3.4 -3.4 L 15 0 L 3.4 3.4 L 0 15 L -3.4 3.4 L -15 0 L -3.4 -3.4 Z" fill="#B79A54"/>'+
      '<path d="M 0 -15 L 3.4 -3.4 L 15 0 L 3.4 3.4 L 0 15 L -3.4 3.4 L -15 0 L -3.4 -3.4 Z" fill="#F2C230" transform="rotate(45) scale(0.55)"/>'+
      '<text class="carto" y="-27" text-anchor="middle" font-size="11">N</text></g>'+
    '<g transform="translate(225,675)" opacity="0.95">'+
      '<rect x="-126" y="-23" width="252" height="46" rx="6" fill="#12181F" stroke="#B79A54" stroke-width="1.5"/>'+
      '<rect x="-120" y="-17" width="240" height="34" rx="4" fill="none" stroke="#B79A54" stroke-width="0.6"/>'+
      '<text class="carto" y="-2" text-anchor="middle" font-size="15" letter-spacing="6">LONDON</text>'+
      '<text class="carto" y="13" text-anchor="middle" font-size="7.5" letter-spacing="3" opacity="0.8">A CHASE IN 199 STATIONS</text></g>';
  svg.appendChild(orn);
  // functional layers
  ['edges','ps','hl','stations'].forEach(function(n){var g=svgEl('g');g.setAttribute('id','L-'+n);svg.appendChild(g);LAYER[n]=g;});
  bigRect({fill:'url(#vigG)',style:'pointer-events:none'});
  ['pieces','fx'].forEach(function(n){var g=svgEl('g');g.setAttribute('id','L-'+n);svg.appendChild(g);LAYER[n]=g;});
  // transport lines, gently curved with weight variation
  var order={t:0,b:1,u:2,f:3};
  var col={t:'#DFAE1F',b:'#2F8A52',u:'#D23A3A',f:'#3E6E8E'};
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
    if(l.t==='u'||l.t==='b')eh+='<path d="'+q.d+'" fill="none" stroke="#0B121A" stroke-width="'+r1(w+2.4)+'" stroke-linecap="round" stroke-opacity="0.6"/>';
    eh+='<path d="'+q.d+'" fill="none" stroke="'+col[l.t]+'" stroke-width="'+r1(w)+'" stroke-linecap="round" stroke-opacity="'+(l.t==='t'?0.92:0.95)+'"'+(l.t==='f'?' stroke-dasharray="8 7"':'')+'/>';
  });
  LAYER.edges.innerHTML=eh;
  LAYER.edges.setAttribute('filter','url(#eShadow)');
  // stations: brass plaque / gaslamp-pin markers with transport pips
  var pipc={t:'#D9A61F',b:'#2F8A52',u:'#C22B2B',f:'#3E6E8E'};
  for(var i=1;i<=199;i++){
    var hasU=false,hasB=false,hasF=false;
    NBRS[i].forEach(function(e){if(e.t==='u')hasU=true;if(e.t==='b')hasB=true;if(e.t==='f')hasF=true;});
    var r=hasU?8.6:hasB?6.9:5.5;
    var g=svgEl('g');
    g.setAttribute('class','stg');g.setAttribute('data-id',i);
    g.setAttribute('transform','translate('+POS[i].x+','+POS[i].y+')');
    var h='';
    if(hasU)h+='<circle r="'+r1(r+3.4)+'" fill="#191008" stroke="#C22B2B" stroke-width="2.4"/>';
    if(hasB)h+='<circle r="'+r1(r+1.6)+'" fill="'+(hasU?'none':'#191008')+'" stroke="#2F8A52" stroke-width="1.7"/>';
    h+='<circle r="'+r+'" fill="url(#brassG)" stroke="#3A2C10" stroke-width="1.2"/>';
    h+='<circle r="'+r1(r*0.55)+'" fill="none" stroke="#3A2C10" stroke-width="0.6" opacity="0.5"/>';
    h+='<text class="st-num st-lbl" y="'+r1(r*0.40)+'" text-anchor="middle" font-size="'+(hasU?7.4:hasB?6.6:6)+'">'+i+'</text>';
    var modes=['t'];if(hasB)modes.push('b');if(hasU)modes.push('u');if(hasF)modes.push('f');
    if(modes.length>1){
      var bw=modes.length*5.6+3.2,by=r1(r+(hasU?5.4:3.6));
      h+='<rect x="'+r1(-bw/2)+'" y="'+by+'" width="'+r1(bw)+'" height="5.6" rx="2.8" fill="#12181F" stroke="#B79A54" stroke-width="0.7"/>';
      modes.forEach(function(mm,k){
        h+='<circle cx="'+r1(-bw/2+4.4+k*5.6)+'" cy="'+r1(by+2.8)+'" r="1.7" fill="'+pipc[mm]+'"/>';
      });
    }
    g.innerHTML=h;
    g.addEventListener('click',(function(id){return function(ev){ev.stopPropagation();onStationClick(id,ev);};})(i));
    LAYER.stations.appendChild(g);
  }
  LAYER.stations.setAttribute('filter','url(#stShadow)');
  initPanZoom();
  initBgCanvas();
}
/* ---------------- pan / zoom ---------------- */
function initPanZoom(){
  var svg=$('#map'),ptrs={},panStart=null,pinch=null;
  function clientToMap(cx,cy){
    var r=svg.getBoundingClientRect();
    return {x:VB.x+(cx-r.left)/r.width*VB.w, y:VB.y+(cy-r.top)/r.height*VB.h};
  }
  svg.addEventListener('wheel',function(ev){
    ev.preventDefault();
    var k=ev.deltaY>0?1.15:0.87;
    var p=clientToMap(ev.clientX,ev.clientY);
    var nw=Math.min(2400,Math.max(120,VB.w*k)),nh=nw*(MAP_H/1000);
    VB.x=p.x-(p.x-VB.x)*(nw/VB.w);VB.y=p.y-(p.y-VB.y)*(nh/VB.h);
    VB.w=nw;VB.h=nh;setVB();
  },{passive:false});
  svg.addEventListener('pointerdown',function(ev){
    try{svg.setPointerCapture(ev.pointerId);}catch(e){}
    ptrs[ev.pointerId]={x:ev.clientX,y:ev.clientY};
    var ids=Object.keys(ptrs);
    if(ids.length===1){panStart={cx:ev.clientX,cy:ev.clientY,vx:VB.x,vy:VB.y,t:Date.now(),moved:0};svg.classList.add('dragging');}
    else if(ids.length===2){
      panStart=null;
      var a=ptrs[ids[0]],b=ptrs[ids[1]];
      pinch={d:Math.hypot(a.x-b.x,a.y-b.y),w:VB.w,cx:(a.x+b.x)/2,cy:(a.y+b.y)/2};
    }
  });
  svg.addEventListener('pointermove',function(ev){
    if(!ptrs[ev.pointerId])return;
    ptrs[ev.pointerId]={x:ev.clientX,y:ev.clientY};
    var ids=Object.keys(ptrs),r=svg.getBoundingClientRect();
    if(ids.length===1&&panStart){
      panStart.moved=Math.max(panStart.moved,Math.hypot(ev.clientX-panStart.cx,ev.clientY-panStart.cy));
      VB.x=panStart.vx-(ev.clientX-panStart.cx)/r.width*VB.w;
      VB.y=panStart.vy-(ev.clientY-panStart.cy)/r.height*VB.h;
      setVB();
    }else if(ids.length===2&&pinch){
      var a=ptrs[ids[0]],b=ptrs[ids[1]];
      var d=Math.hypot(a.x-b.x,a.y-b.y)||1;
      var p=clientToMap(pinch.cx,pinch.cy);
      var nw=Math.min(2400,Math.max(120,pinch.w*pinch.d/d)),nh=nw*(MAP_H/1000);
      VB.x=p.x-(p.x-VB.x)*(nw/VB.w);VB.y=p.y-(p.y-VB.y)*(nh/VB.h);
      VB.w=nw;VB.h=nh;setVB();
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
  $('#zfit').onclick=function(){VB={x:0,y:0,w:1000,h:MAP_H};setVB();};
  window.addEventListener('resize',function(){requestBgRedraw();});
}
function zoomBy(k){
  var cx=VB.x+VB.w/2,cy=VB.y+VB.h/2;
  VB.w=Math.min(2400,Math.max(120,VB.w*k));VB.h=VB.w*(MAP_H/1000);
  VB.x=cx-VB.w/2;VB.y=cy-VB.h/2;setVB();
}
/* ---------------- canvas landscape (noir London backdrop) ---------------- */
var BG={ready:false,needsRedraw:false,raf:null,off:null,scale:1,riverPts:null,riverBox:null};
function cubicAt(p0,p1,p2,p3,t){
  var u=1-t;
  return {x:u*u*u*p0.x+3*u*u*t*p1.x+3*u*t*t*p2.x+t*t*t*p3.x,
          y:u*u*u*p0.y+3*u*u*t*p1.y+3*u*t*t*p2.y+t*t*t*p3.y};
}
function catmullSegs(pts){
  var segs=[];
  for(var i=0;i<pts.length-1;i++){
    var p0=pts[Math.max(0,i-1)],p1=pts[i],p2=pts[i+1],p3=pts[Math.min(pts.length-1,i+2)];
    segs.push({p1:p1,c1:{x:p1.x+(p2.x-p0.x)/6,y:p1.y+(p2.y-p0.y)/6},c2:{x:p2.x-(p3.x-p1.x)/6,y:p2.y-(p3.y-p1.y)/6},p2:p2});
  }
  return segs;
}
function catmullSamples(pts,perSeg){
  var segs=catmullSegs(pts),out=[];
  segs.forEach(function(s){for(var k=0;k<perSeg;k++)out.push(cubicAt(s.p1,s.c1,s.c2,s.p2,k/perSeg));});
  out.push(pts[pts.length-1]);
  return out;
}
function ptInEllipse(x,y,cx,cy,rx,ry,pad){
  var dx=(x-cx)/(rx+pad),dy=(y-cy)/(ry+pad);
  return dx*dx+dy*dy<=1;
}
function distToPolyline(x,y,pts){
  var best=1e9;
  for(var i=0;i<pts.length;i++){var d=Math.hypot(pts[i].x-x,pts[i].y-y);if(d<best)best=d;}
  return best;
}
var PARK_DEFS=[{cx:180,cy:405,rx:64,ry:42},{cx:140,cy:56,rx:80,ry:32},{cx:900,cy:672,rx:62,ry:40}];
function initBgCanvas(){
  var wrap=$('#mapwrap');
  var cv=document.getElementById('mapbg');
  if(!cv){cv=document.createElement('canvas');cv.id='mapbg';wrap.insertBefore(cv,$('#map'));}
  BG.canvas=cv;BG.ctx=cv.getContext('2d');
  BG.riverPts=getRiverCtrlPts();
  var samples=catmullSamples(BG.riverPts,14);
  var minX=1e9,minY=1e9,maxX=-1e9,maxY=-1e9;
  samples.forEach(function(p){if(p.x<minX)minX=p.x;if(p.x>maxX)maxX=p.x;if(p.y<minY)minY=p.y;if(p.y>maxY)maxY=p.y;});
  BG.riverSamples=samples;
  BG.riverBox={x:minX-40,y:minY-40,w:(maxX-minX)+80,h:(maxY-minY)+80};
  var OFF_SCALE=2.2;
  BG.scale=OFF_SCALE;
  var off=document.createElement('canvas');
  off.width=Math.round(1000*OFF_SCALE);off.height=Math.round(MAP_H*OFF_SCALE);
  var octx=off.getContext('2d');
  genLandscape(octx,off.width,off.height,OFF_SCALE,samples);
  BG.off=off;
  BG.ready=true;
  var img=new Image();
  img.onload=function(){
    octx.save();
    octx.globalAlpha=0.10;octx.globalCompositeOperation='overlay';
    for(var y=0;y<off.height;y+=120*OFF_SCALE*0.55){
      for(var x=0;x<off.width;x+=120*OFF_SCALE*0.55){
        octx.drawImage(img,x,y,120*OFF_SCALE*0.55,120*OFF_SCALE*0.55);
      }
    }
    octx.restore();
    requestBgRedraw();
  };
  img.src='data:image/png;base64,'+GRAIN_B64;
  requestBgRedraw();
}
function requestBgRedraw(){
  if(!BG.ready)return;
  BG.needsRedraw=true;
  if(!BG.raf)BG.raf=requestAnimationFrame(bgTick);
}
function riverVisible(){
  if(!BG.riverBox)return false;
  return !(VB.x+VB.w<BG.riverBox.x||VB.x>BG.riverBox.x+BG.riverBox.w||VB.y+VB.h<BG.riverBox.y||VB.y>BG.riverBox.y+BG.riverBox.h);
}
function bgTick(ts){
  BG.raf=null;
  var onRiver=riverVisible();
  if(BG.needsRedraw||onRiver){drawBgFrame(ts||performance.now(),onRiver);BG.needsRedraw=false;}
  if(onRiver)BG.raf=requestAnimationFrame(bgTick);
}
function drawBgFrame(ts,onRiver){
  var cv=BG.canvas,ctx=BG.ctx;
  var w=cv.clientWidth||cv.parentNode.clientWidth,h=cv.clientHeight||cv.parentNode.clientHeight;
  var dpr=Math.min(2,window.devicePixelRatio||1);
  var pw=Math.max(1,Math.round(w*dpr)),ph=Math.max(1,Math.round(h*dpr));
  if(cv.width!==pw||cv.height!==ph){cv.width=pw;cv.height=ph;}
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,w,h);
  var sx=(VB.x/1000)*BG.off.width, sy=(VB.y/MAP_H)*BG.off.height;
  var sw=(VB.w/1000)*BG.off.width, sh=(VB.h/MAP_H)*BG.off.height;
  ctx.imageSmoothingEnabled=true;
  ctx.drawImage(BG.off,sx,sy,sw,sh,0,0,w,h);
  if(onRiver)drawRiverShimmer(ctx,w,h,ts);
}
function mapToScreen(p,w,h){return {x:(p.x-VB.x)/VB.w*w,y:(p.y-VB.y)/VB.h*h};}
function drawRiverShimmer(ctx,w,h,ts){
  var t=(ts||0)/1000;
  var pts=BG.riverSamples;
  ctx.save();
  ctx.globalCompositeOperation='lighter';
  for(var band=0;band<2;band++){
    ctx.beginPath();
    for(var i=0;i<pts.length;i++){
      var seg=pts[Math.min(pts.length-1,i+1)],prev=pts[Math.max(0,i-1)];
      var nx=-(seg.y-prev.y),ny=(seg.x-prev.x);
      var nl=Math.hypot(nx,ny)||1;nx/=nl;ny/=nl;
      var amp=2.4+band*1.1;
      var off=Math.sin(t*1.3+i*0.5+band*2.1)*amp;
      var mp={x:pts[i].x+nx*off,y:pts[i].y+ny*off};
      var sp=mapToScreen(mp,w,h);
      if(i===0)ctx.moveTo(sp.x,sp.y);else ctx.lineTo(sp.x,sp.y);
    }
    ctx.strokeStyle=band===0?'rgba(191,227,242,0.16)':'rgba(120,180,210,0.10)';
    ctx.lineWidth=band===0?1.6:3.2;
    ctx.stroke();
  }
  ctx.restore();
}
/* ---- one-time procedural landscape bake ---- */
function genLandscape(ctx,W,H,scale,riverSamples){
  function mp(p){return {x:p.x*scale,y:p.y*scale};}
  // ambient base lighting: warm near the river/centre, cool toward the edges
  var amb=ctx.createRadialGradient(W*0.52,H*0.5,H*0.05,W*0.5,H*0.5,H*0.85);
  amb.addColorStop(0,'#241C15');
  amb.addColorStop(0.45,'#161F29');
  amb.addColorStop(1,'#080B10');
  ctx.fillStyle=amb;ctx.fillRect(0,0,W,H);
  // streets: draw the road network as a soft desaturated cobblestone bed beneath where the SVG lines will sit
  ctx.save();
  ctx.strokeStyle='#232C36';
  ctx.lineCap='round';
  PAIRS.forEach(function(p){
    var A=POS[p.a],B=POS[p.b];
    var bow=edgeBow(p.a,p.b);
    var maxU=p.types.indexOf('u')>=0?3:p.types.indexOf('b')>=0?2:1;
    var w=(maxU===3?9:maxU===2?6.5:4.4)*scale;
    var q0=quadPoint(A,B,bow,0,0),q1=quadPoint(A,B,bow,0,0.5),q2=quadPoint(A,B,bow,0,1);
    var s0=mp(q0),s1=mp(q1),s2=mp(q2);
    ctx.lineWidth=w;ctx.globalAlpha=0.55;
    ctx.beginPath();ctx.moveTo(s0.x,s0.y);ctx.quadraticCurveTo(s1.x,s1.y,s2.x,s2.y);ctx.stroke();
  });
  ctx.globalAlpha=1;ctx.restore();
  // parks: layered canopy + tree silhouettes
  PARK_DEFS.forEach(function(pk){
    var c=mp({x:pk.cx,y:pk.cy}),rx=pk.rx*scale,ry=pk.ry*scale;
    var g=ctx.createRadialGradient(c.x,c.y,0,c.x,c.y,Math.max(rx,ry));
    g.addColorStop(0,'#274A2E');g.addColorStop(0.7,'#1B331F');g.addColorStop(1,'#101C13');
    ctx.save();
    ctx.translate(c.x,c.y);ctx.scale(rx/Math.max(rx,ry),ry/Math.max(rx,ry));
    ctx.beginPath();ctx.arc(0,0,Math.max(rx,ry),0,Math.PI*2);ctx.fillStyle=g;ctx.fill();
    ctx.restore();
    var n=22;
    for(var i=0;i<n;i++){
      var h=hash2(Math.round(pk.cx)+i*13,Math.round(pk.cy)+i*7);
      var ang=(h%360)*Math.PI/180, rad=((h>>>4)%100)/100;
      var tx=c.x+Math.cos(ang)*rx*rad*0.85, ty=c.y+Math.sin(ang)*ry*rad*0.85;
      var tr=(2+((h>>>8)%5))*scale*0.55;
      ctx.beginPath();ctx.arc(tx,ty+tr*0.3,tr,0,Math.PI*2);
      ctx.fillStyle='#0E2013';ctx.fill();
      ctx.beginPath();ctx.arc(tx-tr*0.3,ty,tr*0.6,0,Math.PI*2);
      ctx.fillStyle='#183B22';ctx.fill();
    }
  });
  // river: shaded water ribbon
  ctx.save();
  ctx.beginPath();
  BG.riverPts && catmullSegs(BG.riverPts).forEach(function(s,i){
    var p1=mp(s.p1),c1=mp(s.c1),c2=mp(s.c2),p2=mp(s.p2);
    if(i===0)ctx.moveTo(p1.x,p1.y);
    ctx.bezierCurveTo(c1.x,c1.y,c2.x,c2.y,p2.x,p2.y);
  });
  ctx.lineCap='round';ctx.lineJoin='round';
  var rg=ctx.createLinearGradient(0,0,W,H);
  rg.addColorStop(0,'#122536');rg.addColorStop(0.5,'#193A52');rg.addColorStop(1,'#0E2130');
  ctx.strokeStyle=rg;ctx.lineWidth=30*scale;ctx.stroke();
  ctx.strokeStyle='rgba(120,175,205,0.18)';ctx.lineWidth=8*scale;ctx.stroke();
  ctx.restore();
  // bridge landmark near the river crossing
  (function(){
    var mid=BG.riverPts?mp(catmullSamples(BG.riverPts,8)[Math.floor(catmullSamples(BG.riverPts,8).length*0.55)]):null;
    if(!mid)return;
    ctx.save();ctx.translate(mid.x,mid.y);
    ctx.strokeStyle='#0B0F14';ctx.lineWidth=2.2*scale;ctx.globalAlpha=0.75;
    ctx.beginPath();
    for(var i=-3;i<=3;i++){ctx.moveTo(i*9*scale,-3*scale);ctx.lineTo(i*9*scale,6*scale);}
    ctx.stroke();
    ctx.beginPath();ctx.moveTo(-30*scale,-3*scale);ctx.lineTo(30*scale,-3*scale);ctx.stroke();
    ctx.fillStyle='#F2C230';ctx.globalAlpha=0.5;
    for(var j=-2;j<=2;j++){ctx.beginPath();ctx.arc(j*13*scale,-3*scale,1.4*scale,0,Math.PI*2);ctx.fill();}
    ctx.restore();
  })();
  // clocktower near Westminster, dome near The City
  function landmark(cx,cy,kind){
    var c=mp({x:cx,y:cy});
    ctx.save();ctx.translate(c.x,c.y);ctx.fillStyle='#0C1319';ctx.globalAlpha=0.82;
    if(kind==='tower'){
      ctx.fillRect(-3.2*scale,-26*scale,6.4*scale,26*scale);
      ctx.beginPath();ctx.moveTo(-3.2*scale,-26*scale);ctx.lineTo(0,-34*scale);ctx.lineTo(3.2*scale,-26*scale);ctx.fill();
      ctx.fillStyle='#F2C230';ctx.globalAlpha=0.55;
      ctx.beginPath();ctx.arc(0,-22*scale,1.6*scale,0,Math.PI*2);ctx.fill();
    }else{
      ctx.fillRect(-9*scale,-4*scale,18*scale,4*scale);
      ctx.beginPath();ctx.arc(0,-4*scale,9*scale,Math.PI,0);ctx.fill();
      ctx.strokeStyle='rgba(242,194,48,0.35)';ctx.lineWidth=0.8*scale;
      ctx.beginPath();ctx.arc(0,-4*scale,9*scale,Math.PI,0);ctx.stroke();
    }
    ctx.restore();
  }
  landmark(345,432,'tower');
  landmark(772,338,'dome');
  // buildings: deterministic scattered rooftop silhouettes
  var cell=32;
  for(var gx=40;gx<960;gx+=cell){
    for(var gy=40;gy<MAP_H-30;gy+=cell){
      var h=hash2(Math.round(gx*3.1),Math.round(gy*2.7));
      if(h%100<38)continue; // sparse organic gaps
      var jx=gx+((h>>>4)%cell)-cell/2, jy=gy+((h>>>9)%cell)-cell/2;
      if(distToPolyline(jx,jy,riverSamples||BG.riverSamples||[])<22)continue;
      var inPark=PARK_DEFS.some(function(pk){return ptInEllipse(jx,jy,pk.cx,pk.cy,pk.rx,pk.ry,6);});
      if(inPark)continue;
      if(Math.hypot(jx-945,jy-405)<32)continue; // compass rose
      if(jx>95&&jx<355&&jy>645&&jy<705)continue; // cartouche
      if(jx<22||jx>978||jy<22||jy>MAP_H-22)continue;
      var bw=(7+((h>>>12)%13))*scale, bh=(6+((h>>>16)%11))*scale;
      var p=mp({x:jx,y:jy});
      var shade=((h>>>20)%3);
      var fills=['#141C25','#1A2431','#101720'];
      ctx.save();
      ctx.translate(p.x,p.y);
      ctx.globalAlpha=0.5+((h>>>2)%20)/100;
      // soft drop shadow for depth
      ctx.fillStyle='rgba(0,0,0,0.35)';
      ctx.fillRect(-bw/2+1.4*scale,-bh/2+1.6*scale,bw,bh);
      ctx.fillStyle=fills[shade];
      ctx.fillRect(-bw/2,-bh/2,bw,bh);
      ctx.fillStyle='rgba(255,255,255,0.05)';
      ctx.fillRect(-bw/2,-bh/2,bw,1.2*scale);
      if(h%7===0){
        ctx.globalAlpha=0.55;
        ctx.fillStyle='#F2C230';
        ctx.fillRect(-bw/4,-bh/6,1.4*scale,1.4*scale);
      }
      ctx.restore();
    }
  }
  // gaslamp glow points along major roads (bus/underground edges)
  PAIRS.forEach(function(p){
    if(p.types.indexOf('u')<0&&p.types.indexOf('b')<0)return;
    var h=hash2(p.a*3,p.b*5);
    if(h%6!==0)return;
    var A=POS[p.a],B=POS[p.b],bow=edgeBow(p.a,p.b);
    var q=quadPoint(A,B,bow,0,0.5),c=mp(q);
    var glow=ctx.createRadialGradient(c.x,c.y,0,c.x,c.y,14*scale);
    glow.addColorStop(0,'rgba(242,194,48,0.35)');
    glow.addColorStop(1,'rgba(242,194,48,0)');
    ctx.fillStyle=glow;
    ctx.beginPath();ctx.arc(c.x,c.y,14*scale,0,Math.PI*2);ctx.fill();
  });
  // vignette
  var vig=ctx.createRadialGradient(W*0.5,H*0.46,H*0.35,W*0.5,H*0.46,H*0.95);
  vig.addColorStop(0,'rgba(4,6,9,0)');
  vig.addColorStop(1,'rgba(4,6,9,0.55)');
  ctx.fillStyle=vig;ctx.fillRect(0,0,W,H);
}
/* ---------------- vehicles + piece movement animation ---------------- */
function vehicleSvg(kind,tint){
  if(kind==='mrx')return mrxTravelGlyph();
  if(kind==='t')return '<g>'+
    '<rect x="-9" y="-4" width="18" height="7.2" rx="2.4" fill="#F2C230" stroke="#20242B" stroke-width="1"/>'+
    '<rect x="-4.6" y="-7.2" width="9.2" height="4.4" rx="1.6" fill="#F2C230" stroke="#20242B" stroke-width="1"/>'+
    '<rect x="-3.6" y="-6.4" width="7.2" height="3" rx="1" fill="url(#glassGrad)"/>'+
    '<rect x="-2.2" y="-9.3" width="4.4" height="2.2" rx="0.9" fill="'+(tint?tint.color:'#20242B')+'"/>'+
    (tint&&tint.num?'<text y="-7.6" text-anchor="middle" font-size="2.6" font-weight="800" fill="#0B0D10">'+tint.num+'</text>':'')+
    '<circle cx="-5.2" cy="3.6" r="2.3" fill="#20242B"/><circle cx="5.2" cy="3.6" r="2.3" fill="#20242B"/>'+
    '<circle cx="-5.2" cy="3.6" r="0.9" fill="#98A2AE"/><circle cx="5.2" cy="3.6" r="0.9" fill="#98A2AE"/></g>';
  if(kind==='b')return '<g>'+
    '<rect x="-13" y="-9" width="26" height="13" rx="2.6" fill="#2F8A52" stroke="#1B4A2E" stroke-width="1.1"/>'+
    '<rect x="-11" y="-7.4" width="4.6" height="3" rx="0.8" fill="url(#glassGrad)"/><rect x="-5" y="-7.4" width="4.6" height="3" rx="0.8" fill="url(#glassGrad)"/><rect x="1" y="-7.4" width="4.6" height="3" rx="0.8" fill="url(#glassGrad)"/><rect x="7" y="-7.4" width="4" height="3" rx="0.8" fill="url(#glassGrad)"/>'+
    (tint?'<rect x="-11" y="-2.6" width="22" height="2.6" rx="0.8" fill="'+tint.color+'"/>':'')+
    '<circle cx="-8" cy="4.9" r="2.5" fill="#20242B"/><circle cx="8" cy="4.9" r="2.5" fill="#20242B"/>'+
    '<circle cx="-8" cy="4.9" r="1" fill="#98A2AE"/><circle cx="8" cy="4.9" r="1" fill="#98A2AE"/></g>';
  if(kind==='u')return '<g>'+
    '<rect x="-14" y="-4.8" width="28" height="9.6" rx="4.8" fill="#D23A3A" stroke="#8A1F1F" stroke-width="1.1"/>'+
    '<rect x="-10.5" y="-2.6" width="4.4" height="3.4" rx="1" fill="#FBEDED"/><rect x="-4.4" y="-2.6" width="4.4" height="3.4" rx="1" fill="#FBEDED"/><rect x="1.7" y="-2.6" width="4.4" height="3.4" rx="1" fill="#FBEDED"/>'+
    '<circle cx="12.4" cy="0" r="1.5" fill="'+(tint?tint.color:'#FFE9A8')+'"/></g>';
  // ferry boat (Mr. X, ferry crossings only)
  return '<g>'+
    '<path d="M -12 1.5 L 12 1.5 L 7.6 7 L -7.6 7 Z" fill="#23303C" stroke="#101820" stroke-width="1"/>'+
    '<rect x="-5.4" y="-3.4" width="10.8" height="5.2" rx="1.2" fill="#E9EEF4" stroke="#8E99A5" stroke-width="0.8"/>'+
    '<rect x="1.6" y="-7.6" width="3" height="4.4" rx="0.8" fill="#F2C230"/></g>';
}
function mrxTravelGlyph(){
  return '<g>'+
    '<path d="M 0 -11 C 5 -11 8 -5 7 2 C 6.4 6 3 8.4 0 8.6 C -3 8.4 -6.4 6 -7 2 C -8 -5 -5 -11 0 -11 Z" fill="#12151B" stroke="#F2C230" stroke-width="0.8"/>'+
    '<ellipse cx="0" cy="-9.4" rx="6.6" ry="1.9" fill="#0B0D10" stroke="#F2C230" stroke-width="0.55"/>'+
    '<path d="M -3.6 -12.4 Q 0 -14.4 3.6 -12.4 L 3 -9.6 L -3 -9.6 Z" fill="#0B0D10" stroke="#F2C230" stroke-width="0.55"/>'+
    '<circle cx="3.4" cy="1.8" r="0.9" fill="#F2C230" opacity="0.9"/></g>';
}
function trailDot(x,y,c){
  var d=svgEl('circle');
  d.setAttribute('cx',x);d.setAttribute('cy',y);d.setAttribute('r',2.6);
  d.setAttribute('fill',c);d.setAttribute('class','puff');
  LAYER.fx.appendChild(d);
  setTimeout(function(){d.remove();},600);
}
function mrxPuff(x,y){
  for(var i=0;i<6;i++){
    var h=hash2(Math.round(x)+i*11,Math.round(y)+i*17);
    var ang=(h%360)*Math.PI/180,rad=1.6+(h>>>4)%3;
    var d=svgEl('circle');
    d.setAttribute('cx',r1(x+Math.cos(ang)*rad));d.setAttribute('cy',r1(y+Math.sin(ang)*rad));
    d.setAttribute('r',2.2+((h>>>8)%3));
    d.setAttribute('fill','#2B3542');d.setAttribute('opacity','0.55');
    d.setAttribute('class','puff');
    LAYER.fx.appendChild(d);
    (function(el){setTimeout(function(){el.remove();},700);})(d);
  }
}
function animateVehicle(from,to,tk,pieceMeta){
  return new Promise(function(res){
    var boat=tk==='x'&&isFerryOnly(from,to);
    var isMrx=pieceMeta&&pieceMeta.kind==='mrx';
    var tint=pieceMeta&&pieceMeta.kind==='det'?{color:pieceMeta.color,num:pieceMeta.num}:null;
    var kind=boat?'boat':(isMrx?'mrx':tk);
    sfxForTicket(tk,boat);
    var A=POS[from],B=POS[to];
    var bow=edgeBow(from,to);
    var len=Math.hypot(B.x-A.x,B.y-A.y)||1;
    var overall=Math.atan2(B.y-A.y,B.x-A.x)*180/Math.PI;
    var flip=(overall>90||overall<-90)?-1:1;
    var g=svgEl('g');g.setAttribute('class','veh');g.innerHTML=vehicleSvg(kind,tint);
    LAYER.fx.appendChild(g);
    var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var dur;
    if(reduce)dur=150;
    else if(tint)dur=Math.max(400,Math.min(600,len*7));
    else if(isMrx&&!boat)dur=Math.max(250,Math.min(450,len*6));
    else dur=Math.max(520,Math.min(1150,len*9));
    var t0=performance.now(),lastTrail=0;
    var tc=TKCOL[boat?'boat':tk];
    function step(now){
      var k=(now-t0)/dur;if(k>1)k=1;
      var e=k<0.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
      var q=quadPoint(A,B,bow,0,e);
      var ang=Math.atan2(q.dy,q.dx)*180/Math.PI;
      var bob=(kind==='u')?0:(kind==='boat'?Math.sin(k*10)*1.6:Math.sin(k*24)*1.1);
      var sx=1,sy=1;
      if(tint){sx=1+0.12*Math.sin(Math.PI*k);sy=1-0.08*Math.sin(Math.PI*k);}
      g.setAttribute('transform','translate('+q.x+','+q.y+') rotate('+ang+') scale('+sx+','+(flip*sy)+') translate(0,'+bob+')');
      if(now-lastTrail>46&&k>0.05&&k<0.95){
        lastTrail=now;
        var qt=quadPoint(A,B,bow,0,Math.max(0,e-0.05));
        trailDot(qt.x,qt.y,tc);
      }
      if(k<1)requestAnimationFrame(step);
      else{
        g.remove();
        if(isMrx&&!boat)mrxPuff(B.x,B.y);
        res();
      }
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
function hiddenMoveFx(tk){ // Mr X moved in secret: sound of the ticket + stamped log cell
  sfxForTicket(tk,false);
  return new Promise(function(res){setTimeout(res,500);});
}
/* ---------------- resting piece markup (taxi / cloaked silhouette) ---------------- */
function taxiPieceMarkup(x,y,color,num,key,delay){
  return '<g class="pieceTok det" data-key="'+key+'" transform="translate('+r1(x)+','+r1(y)+')">'+
    '<ellipse class="tokshadow" cx="0" cy="7.2" rx="9" ry="3" fill="#000" style="animation-delay:'+delay+'s"/>'+
    '<g class="tokbob" style="animation-delay:'+delay+'s">'+
      '<rect x="-9" y="-3" width="18" height="7" rx="2.4" fill="#14181D" stroke="#2B323C" stroke-width="0.7"/>'+
      '<rect x="-7.6" y="-6.6" width="15.2" height="4" rx="1.6" fill="#14181D" stroke="#2B323C" stroke-width="0.6"/>'+
      '<rect x="-6.4" y="-6" width="5.6" height="3" rx="0.8" fill="url(#glassGrad)"/>'+
      '<rect x="0.8" y="-6" width="5.6" height="3" rx="0.8" fill="url(#glassGrad)"/>'+
      '<circle cx="-5.6" cy="3.3" r="2.1" fill="#050607"/><circle cx="5.6" cy="3.3" r="2.1" fill="#050607"/>'+
      '<circle cx="-5.6" cy="3.3" r="0.8" fill="#8E99A5"/><circle cx="5.6" cy="3.3" r="0.8" fill="#8E99A5"/>'+
      '<rect x="-2.8" y="-9.1" width="5.6" height="2.8" rx="0.9" fill="'+color+'" stroke="#00000055" stroke-width="0.4"/>'+
      '<text y="-7.1" text-anchor="middle" font-size="3.4" font-weight="800" fill="#0B0D10" class="st-num">'+num+'</text>'+
    '</g></g>';
}
function mrxPieceMarkup(x,y,state,key){
  var ghost=state==='ghost';
  return '<g class="pieceTok mrx'+(ghost?' ghost':'')+'" data-key="'+key+'" transform="translate('+r1(x)+','+r1(y)+')">'+
    (ghost?'':'<ellipse class="tokshadow" cx="0" cy="8" rx="10" ry="3.2" fill="#000"/>')+
    '<g class="tokbob">'+
      '<path d="M 0 -11 C 5 -11 8 -5 7 2 C 6.4 6 3 8.4 0 8.6 C -3 8.4 -6.4 6 -7 2 C -8 -5 -5 -11 0 -11 Z" fill="'+(ghost?'#2B3542':'#12151B')+'" stroke="#F2C230" stroke-width="'+(ghost?'0.6':'0.85')+'" stroke-dasharray="'+(ghost?'2.4 2.2':'none')+'" opacity="'+(ghost?'0.55':'1')+'"/>'+
      (ghost?'':'<ellipse cx="0" cy="-9.4" rx="6.6" ry="1.9" fill="#0B0D10" stroke="#F2C230" stroke-width="0.55"/>'+
      '<path d="M -3.6 -12.4 Q 0 -14.4 3.6 -12.4 L 3 -9.6 L -3 -9.6 Z" fill="#0B0D10" stroke="#F2C230" stroke-width="0.55"/>'+
      '<circle cx="3.4" cy="1.8" r="0.95" fill="#F2C230"/>')+
    '</g>'+
    (ghost?'<text y="-13.5" text-anchor="middle" font-size="7.5" font-weight="800" fill="#E9EEF4" class="st-num">?</text>':'')+
  '</g>';
}
