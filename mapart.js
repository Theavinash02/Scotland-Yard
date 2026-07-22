/* ---------------- mapart.js — the illustrated Graywater base ----------------
 * Generates the static city beneath the game: water, land, districts, parks,
 * streets, blocks and landmarks — all deterministically (fixed seed) and all
 * derived from the existing station coordinates (POS/PAIRS/NBRS, engine.js).
 * Nothing here touches game logic; buildMap() (map.js) calls
 * buildGraywaterBase(svg) once, and the group is never redrawn afterwards —
 * only the game layers above it change per move.
 *
 * Rendering notes: no SVG filters on large layers (filters re-rasterize every
 * viewBox change); softness comes from radial gradients and layered strokes,
 * which pan/zoom cheaply.
 */
'use strict';

var MA_SEED=97531;
function maRng(seed){
  var s=seed>>>0;
  return function(){
    s|=0;s=(s+0x6D2B79F5)|0;
    var t=Math.imul(s^(s>>>15),1|s);
    t=(t+Math.imul(t^(t>>>7),61|t))^t;
    return ((t^(t>>>14))>>>0)/4294967296;
  };
}
function maR1(v){return Math.round(v*10)/10;}

/* ---- the ferry chain (same derivation the old river used) ---- */
function maFerryChain(){
  var adj={};
  PAIRS.forEach(function(p){
    if(p.types.indexOf('f')<0)return;
    (adj[p.a]=adj[p.a]||[]).push(p.b);
    (adj[p.b]=adj[p.b]||[]).push(p.a);
  });
  var ids=Object.keys(adj).map(Number);
  if(!ids.length)return [];
  var head=ids.filter(function(s){return adj[s].length===1;})[0]||ids[0];
  var chain=[head],prev=null;
  while(chain.length<ids.length){
    var nxt=adj[chain[chain.length-1]].filter(function(s){return s!==prev;})[0];
    if(nxt===undefined)break;
    prev=chain[chain.length-1];chain.push(nxt);
  }
  return chain;
}

/* ---- centerline: smooth curve through the ferry stops, extended past both
   map edges so the water flows in from beyond the frame ---- */
function maRiverPoints(){
  var chain=maFerryChain().map(function(s){return {x:POS[s].x,y:POS[s].y};});
  if(chain.length<2)return null;
  var a=chain[0],b=chain[1],y=chain[chain.length-1],z=chain[chain.length-2];
  var pre={x:a.x+(a.x-b.x)*2.2,y:a.y+(a.y-b.y)*2.2};
  var post={x:y.x+(y.x-z.x)*2.2,y:y.y+(y.y-z.y)*2.2};
  var ctrl=[pre].concat(chain,[post]);
  // Catmull-Rom sampling with tangents
  var out=[],SEG=12;
  for(var i=0;i<ctrl.length-1;i++){
    var p0=ctrl[Math.max(0,i-1)],p1=ctrl[i],p2=ctrl[i+1],p3=ctrl[Math.min(ctrl.length-1,i+2)];
    for(var k=0;k<SEG;k++){
      var t=k/SEG,t2=t*t,t3=t2*t;
      out.push({
        x:0.5*((2*p1.x)+(-p0.x+p2.x)*t+(2*p0.x-5*p1.x+4*p2.x-p3.x)*t2+(-p0.x+3*p1.x-3*p2.x+p3.x)*t3),
        y:0.5*((2*p1.y)+(-p0.y+p2.y)*t+(2*p0.y-5*p1.y+4*p2.y-p3.y)*t2+(-p0.y+3*p1.y-3*p2.y+p3.y)*t3)
      });
    }
  }
  out.push(ctrl[ctrl.length-1]);
  return out;
}
var MA_RIVER=null; // cached sampled centerline (with widths), built once
function maRiver(){
  if(MA_RIVER)return MA_RIVER;
  var pts=maRiverPoints();
  if(!pts)return null;
  var rr=maRng(MA_SEED);
  // width profile: a working river that swells into a harbor basin downstream
  var n=pts.length;
  for(var i=0;i<n;i++){
    var t=i/(n-1);
    var swell=t>0.8?(t-0.8)/0.2:0;                    // harbor at the far end
    var lagoon=Math.exp(-Math.pow((t-0.47)/0.07,2));  // gentle mid bulge
    pts[i].w=24+Math.sin(t*23)*3+rr()*3+swell*46+lagoon*12;
  }
  // tangents -> left/right banks
  for(var j=0;j<n;j++){
    var A=pts[Math.max(0,j-1)],B=pts[Math.min(n-1,j+1)];
    var dx=B.x-A.x,dy=B.y-A.y,L=Math.hypot(dx,dy)||1;
    pts[j].nx=-dy/L;pts[j].ny=dx/L;
  }
  MA_RIVER=pts;
  return pts;
}
function maWaterPath(){
  var pts=maRiver();if(!pts)return '';
  var left=[],right=[];
  pts.forEach(function(p){
    left.push(maR1(p.x+p.nx*p.w)+' '+maR1(p.y+p.ny*p.w));
    right.push(maR1(p.x-p.nx*p.w)+' '+maR1(p.y-p.ny*p.w));
  });
  return 'M '+left.join(' L ')+' L '+right.reverse().join(' L ')+' Z';
}
function maCenterPath(){
  var pts=maRiver();if(!pts)return '';
  return 'M '+pts.map(function(p){return maR1(p.x)+' '+maR1(p.y);}).join(' L ');
}
/* distance from a point to the river centerline (coarse) — used by later
   layers to keep streets/blocks/parks out of the water */
function maWaterDist(x,y){
  var pts=maRiver();if(!pts)return 1e9;
  var best=1e9;
  for(var i=0;i<pts.length;i+=2){
    var d=Math.hypot(pts[i].x-x,pts[i].y-y)-pts[i].w;
    if(d<best)best=d;
  }
  return best;
}

/* ---- layer 1+2: land base and the water body ---- */
function maBuildLand(g){
  var rr=maRng(MA_SEED+1);
  var h='';
  // landmass: deep slate, softly varied with large gradient blobs
  h+='<rect x="-900" y="-560" width="2800" height="'+(MAP_H+1120)+'" fill="#0D1726"/>';
  for(var i=0;i<12;i++){
    var cx=maR1(rr()*1240-120),cy=maR1(rr()*(MAP_H+240)-120);
    var rx=maR1(150+rr()*230),ry=maR1(110+rr()*180);
    var tone=i%2?'landBlobA':'landBlobB';
    h+='<ellipse cx="'+cx+'" cy="'+cy+'" rx="'+rx+'" ry="'+ry+'" fill="url(#'+tone+')"/>';
  }
  g.insertAdjacentHTML('beforeend','<g class="ma-land">'+h+'</g>');
}
function maBuildWater(g){
  var wp=maWaterPath();if(!wp)return;
  var cp=maCenterPath();
  var rr=maRng(MA_SEED+2);
  var h='';
  // glow bleeding onto the land, then the basin itself, then depth + shore
  h+='<path d="'+wp+'" fill="none" stroke="#153B52" stroke-width="26" stroke-linejoin="round" opacity="0.35"/>';
  h+='<path d="'+wp+'" fill="url(#waterG)" stroke="none"/>';
  h+='<path d="'+wp+'" fill="none" stroke="#0A2233" stroke-width="7" stroke-linejoin="round" opacity="0.9"/>';
  h+='<path d="'+wp+'" fill="none" stroke="#3E8FA8" stroke-width="1.6" stroke-linejoin="round" opacity="0.8"/>';
  // sparse ripples: short strokes following the flow
  var pts=maRiver(),n=pts.length;
  for(var i=0;i<34;i++){
    var j=2+Math.floor(rr()*(n-5));
    var p=pts[j],off=(rr()*2-1)*p.w*0.62;
    var x0=p.x+p.nx*off,y0=p.y+p.ny*off;
    var q=pts[Math.min(n-1,j+2)];
    var dx=q.x-p.x,dy=q.y-p.y,L=Math.hypot(dx,dy)||1;
    var len=5+rr()*10;
    h+='<path d="M '+maR1(x0)+' '+maR1(y0)+' q '+maR1(dx/L*len*0.5)+' '+maR1(dy/L*len*0.5-1.2)+' '+maR1(dx/L*len)+' '+maR1(dy/L*len)+'" fill="none" stroke="#5FB6CC" stroke-width="0.9" stroke-linecap="round" opacity="'+maR1(0.14+rr()*0.2)+'"/>';
  }
  // shipping lane along the ferry line + the water name
  h+='<path id="thamesPath" d="'+cp+'" fill="none" stroke="#4FD8E6" stroke-width="1.1" stroke-dasharray="10 14" opacity="0.32"/>';
  h+='<text class="riverlabel"><textPath href="#thamesPath" startOffset="26%">THE  GRAYWATER</textPath></text>';
  g.insertAdjacentHTML('beforeend','<g class="ma-water" style="pointer-events:none">'+h+'</g>');
}

function maDefs(){
  return '<radialGradient id="landBlobA" cx="50%" cy="50%" r="50%">'+
      '<stop offset="0%" stop-color="#122036" stop-opacity="0.9"/><stop offset="100%" stop-color="#122036" stop-opacity="0"/></radialGradient>'+
    '<radialGradient id="landBlobB" cx="50%" cy="50%" r="50%">'+
      '<stop offset="0%" stop-color="#0A1220" stop-opacity="0.85"/><stop offset="100%" stop-color="#0A1220" stop-opacity="0"/></radialGradient>'+
    '<linearGradient id="waterG" x1="0" y1="0" x2="1" y2="0.35">'+
      '<stop offset="0%" stop-color="#0D2C42"/><stop offset="55%" stop-color="#0E3450"/><stop offset="100%" stop-color="#123E5C"/></linearGradient>';
}

/* ---- layer 3: districts — station clusters around six anchors ---- */
var MA_DISTRICTS=[
  {name:'HOLLOWBROOK',x:585,y:60},
  {name:'NORTHGATE',x:810,y:185},
  {name:'LANTERN ROW',x:450,y:230},
  {name:'THE EXCHANGE',x:765,y:420},
  {name:'OLD QUAY',x:360,y:470},
  {name:'IRONVALE',x:630,y:625}
];
function maConvexHull(pts){
  pts=pts.slice().sort(function(a,b){return a.x-b.x||a.y-b.y;});
  var cross=function(o,a,b){return (a.x-o.x)*(b.y-o.y)-(a.y-o.y)*(b.x-o.x);};
  var lo=[],up=[];
  pts.forEach(function(p){
    while(lo.length>=2&&cross(lo[lo.length-2],lo[lo.length-1],p)<=0)lo.pop();
    lo.push(p);
  });
  pts.slice().reverse().forEach(function(p){
    while(up.length>=2&&cross(up[up.length-2],up[up.length-1],p)<=0)up.pop();
    up.push(p);
  });
  lo.pop();up.pop();
  return lo.concat(up);
}
function maSmoothClosed(pts){
  var d='';
  for(var i=0;i<pts.length;i++){
    var p1=pts[i],p2=pts[(i+1)%pts.length];
    var mx=(p1.x+p2.x)/2,my=(p1.y+p2.y)/2;
    d+=(i===0?'M '+maR1(mx)+' '+maR1(my):'')+' Q '+maR1(p2.x)+' '+maR1(p2.y)+' ';
    var p3=pts[(i+2)%pts.length];
    d+=maR1((p2.x+p3.x)/2)+' '+maR1((p2.y+p3.y)/2);
  }
  return d+' Z';
}
function maBuildDistricts(g){
  var tints=['#16283E','#14293A','#182741','#13293C','#172A3D','#122438'];
  var h='',labels='';
  var clusters=MA_DISTRICTS.map(function(){return [];});
  for(var i=1;i<=199;i++){
    var best=0,bd=1e9;
    MA_DISTRICTS.forEach(function(d,k){
      var dd=Math.hypot(POS[i].x-d.x,POS[i].y-d.y);
      if(dd<bd){bd=dd;best=k;}
    });
    clusters[best].push({x:POS[i].x,y:POS[i].y});
  }
  clusters.forEach(function(c,k){
    if(c.length<3)return;
    var cx=0,cy=0;c.forEach(function(p){cx+=p.x;cy+=p.y;});cx/=c.length;cy/=c.length;
    var hull=maConvexHull(c).map(function(p){
      var dx=p.x-cx,dy=p.y-cy,L=Math.hypot(dx,dy)||1;
      var grow=Math.min(34,18+L*0.06);
      return {x:p.x+dx/L*grow,y:p.y+dy/L*grow};
    });
    var d=maSmoothClosed(hull);
    h+='<path d="'+d+'" fill="'+tints[k%tints.length]+'" opacity="0.5"/>';
    h+='<path d="'+d+'" fill="none" stroke="#2C4260" stroke-width="5" opacity="0.16"/>';
    h+='<path d="'+d+'" fill="none" stroke="#5C82B0" stroke-width="0.8" stroke-dasharray="2 7" opacity="0.35"/>';
    labels+='<text class="maplabel" x="'+maR1(MA_DISTRICTS[k].x)+'" y="'+maR1(MA_DISTRICTS[k].y)+'" text-anchor="middle" font-size="14" letter-spacing="5">'+MA_DISTRICTS[k].name+'</text>';
  });
  g.insertAdjacentHTML('beforeend','<g class="ma-districts">'+h+labels+'</g>');
}

/* ---- layer 4: parks — organic green polygons in station gaps ---- */
function maParkSpots(count){
  // largest on-land gaps between stations, well inside the frame
  var spots=[];
  for(var gy=70;gy<=MAP_H-70;gy+=24){
    for(var gx=70;gx<=930;gx+=24){
      if(maWaterDist(gx,gy)<30)continue;
      var d=1e9;
      for(var i=1;i<=199;i++){var dd=Math.hypot(POS[i].x-gx,POS[i].y-gy);if(dd<d)d=dd;}
      spots.push({x:gx,y:gy,d:d});
    }
  }
  spots.sort(function(a,b){return b.d-a.d;});
  var out=[];
  spots.forEach(function(sp){
    if(out.length>=count)return;
    if(out.some(function(o){return Math.hypot(o.x-sp.x,o.y-sp.y)<170;}))return;
    out.push(sp);
  });
  return out;
}
var MA_PARK_NAMES=['ASHGROVE PARK','NORTHFIELD COMMON','EASTMARSH GREEN','WIDOW\'S GARDEN','FOUNDRY FIELDS'];
var MA_PARKS=null;
function maBuildParks(g){
  var rr=maRng(MA_SEED+3);
  MA_PARKS=maParkSpots(5);
  var h='';
  MA_PARKS.forEach(function(sp,i){
    var R=Math.min(58,sp.d-14);
    if(R<26)return;
    var pts=[];
    for(var a=0;a<8;a++){
      var ang=a/8*Math.PI*2;
      var rad=R*(0.72+rr()*0.4);
      pts.push({x:sp.x+Math.cos(ang)*rad*1.25,y:sp.y+Math.sin(ang)*rad*0.85});
    }
    var d=maSmoothClosed(pts);
    h+='<path d="'+d+'" fill="#12301F" opacity="0.85"/>';
    h+='<path d="'+d+'" fill="none" stroke="#1E4A30" stroke-width="2.4" opacity="0.8"/>';
    h+='<path d="'+d+'" fill="none" stroke="#2E6B45" stroke-width="0.8" opacity="0.5"/>';
    // tree stipples
    for(var t=0;t<14;t++){
      var ang2=rr()*Math.PI*2,rad2=rr()*R*0.62;
      var tx=maR1(sp.x+Math.cos(ang2)*rad2*1.2),ty=maR1(sp.y+Math.sin(ang2)*rad2*0.8);
      h+='<circle cx="'+tx+'" cy="'+ty+'" r="'+maR1(2+rr()*1.6)+'" fill="#1C4A2E" opacity="0.9"/>'+
         '<circle cx="'+tx+'" cy="'+(ty-0.8)+'" r="'+maR1(0.9)+'" fill="#39795083"/>';
    }
    // boxed label like a printed map
    var nm=MA_PARK_NAMES[i%MA_PARK_NAMES.length];
    var bw=nm.length*5.4+14;
    h+='<g transform="translate('+maR1(sp.x)+','+maR1(sp.y)+')">'+
      '<rect x="'+maR1(-bw/2)+'" y="-7" width="'+maR1(bw)+'" height="13" rx="2.5" fill="#0B1524" opacity="0.78" stroke="#2E6B45" stroke-width="0.7"/>'+
      '<text class="parklabel" y="3" text-anchor="middle" font-size="8" letter-spacing="1.6">'+nm+'</text></g>';
  });
  g.insertAdjacentHTML('beforeend','<g class="ma-parks">'+h+'</g>');
}

/* ---- layer 5: streets — minor mesh + arterials; casings ride under routes ---- */
function maNearPairs(maxD){
  // near-neighbor station pairs NOT directly connected by a transport edge
  var linked={};
  PAIRS.forEach(function(p){linked[p.a+'_'+p.b]=1;});
  var out=[],deg={};
  for(var i=1;i<=199;i++){
    for(var j=i+1;j<=199;j++){
      var d=Math.hypot(POS[i].x-POS[j].x,POS[i].y-POS[j].y);
      if(d<maxD&&!linked[i+'_'+j])out.push({a:i,b:j,d:d});
    }
  }
  out.sort(function(x,y){return x.d-y.d;});
  var keep=[];
  out.forEach(function(p){
    deg[p.a]=deg[p.a]||0;deg[p.b]=deg[p.b]||0;
    if(deg[p.a]>=3||deg[p.b]>=3)return;
    keep.push(p);deg[p.a]++;deg[p.b]++;
  });
  return keep;
}
function maJitterPath(ax,ay,bx,by,rr,amt){
  var mx=(ax+bx)/2+(rr()*2-1)*amt,my=(ay+by)/2+(rr()*2-1)*amt;
  return 'M '+maR1(ax)+' '+maR1(ay)+' Q '+maR1(mx)+' '+maR1(my)+' '+maR1(bx)+' '+maR1(by);
}
function maBuildStreets(g){
  var rr=maRng(MA_SEED+4);
  var h='';
  // minor streets: joins between near stations that have no transport link,
  // plus stubs poking outward from each station so blocks read as connected
  maNearPairs(120).forEach(function(p){
    if(maWaterDist((POS[p.a].x+POS[p.b].x)/2,(POS[p.a].y+POS[p.b].y)/2)<6)return;
    h+='<path d="'+maJitterPath(POS[p.a].x,POS[p.a].y,POS[p.b].x,POS[p.b].y,rr,9)+'" class="ma-st"/>';
  });
  for(var i=1;i<=199;i++){
    var n=1+(i%2);
    for(var k=0;k<n;k++){
      var ang=rr()*Math.PI*2,len=18+rr()*26;
      var ex=POS[i].x+Math.cos(ang)*len,ey=POS[i].y+Math.sin(ang)*len;
      if(maWaterDist(ex,ey)<8)continue;
      h+='<path d="'+maJitterPath(POS[i].x,POS[i].y,ex,ey,rr,5)+'" class="ma-st ma-st-stub"/>';
    }
  }
  g.insertAdjacentHTML('beforeend','<g class="ma-streets">'+h+'</g>');
}
function maBuildCasings(g){
  // a dark asphalt bed under every transport edge, so the colored routes read
  // as riding real roads; drawn above the water = the crossings become bridges
  var h='';
  PAIRS.forEach(function(p){
    var land=p.types.filter(function(t){return t!=='f';});
    if(!land.length)return;
    var bow=edgeBow(p.a,p.b);
    var q=quadPoint(POS[p.a],POS[p.b],bow,0,0);
    var w=land.length*4.4+5.5;
    var wet=maWaterDist((POS[p.a].x+POS[p.b].x)/2,(POS[p.a].y+POS[p.b].y)/2)<4;
    h+='<path d="'+q.d+'" class="ma-road'+(wet?' ma-bridge':'')+'" stroke-width="'+maR1(w)+'"/>';
    h+='<path d="'+q.d+'" class="ma-road-edge" stroke-width="'+maR1(w+1.6)+'"/>';
  });
  g.insertAdjacentHTML('beforeend','<g class="ma-casings">'+h+'</g>');
}

/* ---- layer 6: city blocks — building footprints with lit windows ---- */
function maRoutePointsGrid(){
  // coarse hash of sampled route/street positions for fast proximity tests
  var cell=26,grid={};
  var put=function(x,y){grid[Math.floor(x/cell)+'_'+Math.floor(y/cell)]=1;};
  PAIRS.forEach(function(p){
    for(var t=0;t<=1;t+=0.2){
      put(POS[p.a].x+(POS[p.b].x-POS[p.a].x)*t,POS[p.a].y+(POS[p.b].y-POS[p.a].y)*t);
    }
  });
  return {near:function(x,y){
    var cx=Math.floor(x/cell),cy=Math.floor(y/cell);
    for(var dx=-1;dx<=1;dx++)for(var dy=-1;dy<=1;dy++)if(grid[(cx+dx)+'_'+(cy+dy)])return true;
    return false;
  }};
}
function maBuildBlocks(g){
  var rr=maRng(MA_SEED+5);
  var routes=maRoutePointsGrid();
  var h='',lit='';
  var cx0=500,cy0=MAP_H*0.5;
  for(var gy=44;gy<=MAP_H-36;gy+=27){
    for(var gx=44;gx<=956;gx+=27){
      var x=gx+(rr()*2-1)*8,y=gy+(rr()*2-1)*8;
      if(maWaterDist(x,y)<10)continue;
      var dSt=1e9,ang=0;
      for(var i=1;i<=199;i++){
        var dd=Math.hypot(POS[i].x-x,POS[i].y-y);
        if(dd<dSt){dSt=dd;ang=Math.atan2(POS[i].y-y,POS[i].x-x);}
      }
      if(dSt<13)continue;              // keep station badges clear
      var central=Math.hypot(x-cx0,y-cy0)<330;
      if(!central&&rr()<0.45)continue; // sparser at the edges
      var n=routes.near(x,y)?1:(1+Math.floor(rr()*2));
      for(var b=0;b<n;b++){
        var bx=x+(rr()*2-1)*7,by=y+(rr()*2-1)*7;
        var w=maR1(3.5+rr()*6),d2=maR1(2.6+rr()*4.4);
        var rot=maR1(ang*180/Math.PI+(rr()<0.5?0:90)+(rr()*2-1)*8);
        h+='<rect x="'+maR1(-w/2)+'" y="'+maR1(-d2/2)+'" width="'+w+'" height="'+d2+'" rx="0.7" transform="translate('+maR1(bx)+','+maR1(by)+') rotate('+rot+')"/>';
        if(central&&rr()<0.28)lit+='<circle cx="'+maR1(bx)+'" cy="'+maR1(by)+'" r="0.85" fill="#FFD79A" opacity="'+maR1(0.25+rr()*0.35)+'"/>';
      }
    }
  }
  g.insertAdjacentHTML('beforeend','<g class="ma-blocks">'+h+'</g><g class="ma-lit">'+lit+'</g>');
}

/* ---- entry point: called once from buildMap() ---- */
function buildGraywaterBase(svg,defs){
  defs.insertAdjacentHTML('beforeend',maDefs());
  var base=document.createElementNS('http://www.w3.org/2000/svg','g');
  base.setAttribute('id','L-base');
  base.setAttribute('style','pointer-events:none');
  svg.appendChild(base);
  maBuildLand(base);
  maBuildDistricts(base);
  maBuildParks(base);
  maBuildStreets(base);
  maBuildBlocks(base);
  maBuildWater(base);
  maBuildCasings(base);
  return base;
}
