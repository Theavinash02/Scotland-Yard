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
var MA_RIVERS=null; // cached rivers: [{pts(sampled, with widths+normals), name}]
function maSampleLine(raw){
  // Catmull-Rom resample of a control polyline [[x,y],...] with tangents
  var ctrl=raw.map(function(p){return {x:p[0],y:p[1]};});
  var out=[],SEG=4;
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
function maAddNormals(pts){
  var n=pts.length;
  for(var j=0;j<n;j++){
    var A2=pts[Math.max(0,j-1)],B2=pts[Math.min(n-1,j+1)];
    var dx=B2.x-A2.x,dy=B2.y-A2.y,L=Math.hypot(dx,dy)||1;
    pts[j].nx=-dy/L;pts[j].ny=dx/L;
  }
  return pts;
}
function maRivers(){
  if(MA_RIVERS)return MA_RIVERS;
  var geo=MAPDATA.geo;
  if(geo&&geo.rivers){
    MA_RIVERS=geo.rivers.map(function(r){
      var pts=maAddNormals(maSampleLine(r.pts));
      pts.forEach(function(p){p.w=r.w/2;});
      return {pts:pts,name:r.name};
    });
    return MA_RIVERS;
  }
  // fallback: one river derived from the ferry chain (Graywater)
  var pts=maRiverPoints();
  if(!pts)return (MA_RIVERS=[]);
  var rr=maRng(MA_SEED);
  var n=pts.length;
  for(var i=0;i<n;i++){
    var t=i/(n-1);
    var swell=t>0.8?(t-0.8)/0.2:0;
    var lagoon=Math.exp(-Math.pow((t-0.47)/0.07,2));
    pts[i].w=24+Math.sin(t*23)*3+rr()*3+swell*46+lagoon*12;
  }
  maAddNormals(pts);
  MA_RIVERS=[{pts:pts,name:'THE  GRAYWATER'}];
  return MA_RIVERS;
}
function maWaterPathOf(pts){
  var left=[],right=[];
  pts.forEach(function(p){
    left.push(maR1(p.x+p.nx*p.w)+' '+maR1(p.y+p.ny*p.w));
    right.push(maR1(p.x-p.nx*p.w)+' '+maR1(p.y-p.ny*p.w));
  });
  return 'M '+left.join(' L ')+' L '+right.reverse().join(' L ')+' Z';
}
function maCenterPathOf(pts){
  return 'M '+pts.map(function(p){return maR1(p.x)+' '+maR1(p.y);}).join(' L ');
}
/* distance from a point to the nearest river surface (coarse) */
function maWaterDist(x,y){
  var rs=maRivers(),best=1e9;
  rs.forEach(function(r){
    for(var i=0;i<r.pts.length;i+=2){
      var d=Math.hypot(r.pts[i].x-x,r.pts[i].y-y)-r.pts[i].w;
      if(d<best)best=d;
    }
  });
  return best;
}
/* point-in-polygon for the geo park */
function maInPoly(poly,x,y){
  var inside=false;
  for(var i=0,j=poly.length-1;i<poly.length;j=i++){
    var xi=poly[i][0],yi=poly[i][1],xj=poly[j][0],yj=poly[j][1];
    if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi))inside=true;
  }
  return inside;
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
  var rs=maRivers();if(!rs.length)return;
  var rr=maRng(MA_SEED+2);
  var h='';
  rs.forEach(function(r,ri){
    var wp=maWaterPathOf(r.pts),cp=maCenterPathOf(r.pts);
    h+='<path d="'+wp+'" fill="none" stroke="#153B52" stroke-width="26" stroke-linejoin="round" opacity="0.35"/>';
    h+='<path d="'+wp+'" fill="url(#waterG)" stroke="none"/>';
    h+='<path d="'+wp+'" fill="none" stroke="#0A2233" stroke-width="7" stroke-linejoin="round" opacity="0.9"/>';
    h+='<path d="'+wp+'" fill="none" stroke="#3E8FA8" stroke-width="1.6" stroke-linejoin="round" opacity="0.8"/>';
    var n=r.pts.length;
    for(var i=0;i<22;i++){
      var j=2+Math.floor(rr()*(n-5));
      var p=r.pts[j],off=(rr()*2-1)*p.w*0.62;
      var x0=p.x+p.nx*off,y0=p.y+p.ny*off;
      var q=r.pts[Math.min(n-1,j+2)];
      var dx=q.x-p.x,dy=q.y-p.y,L=Math.hypot(dx,dy)||1;
      var len=5+rr()*10;
      h+='<path d="M '+maR1(x0)+' '+maR1(y0)+' q '+maR1(dx/L*len*0.5)+' '+maR1(dy/L*len*0.5-1.2)+' '+maR1(dx/L*len)+' '+maR1(dy/L*len)+'" fill="none" stroke="#5FB6CC" stroke-width="0.9" stroke-linecap="round" opacity="'+maR1(0.14+rr()*0.2)+'"/>';
    }
    h+='<path id="riverPath'+ri+'" d="'+cp+'" fill="none"/>';
    h+='<text class="riverlabel"><textPath href="#riverPath'+ri+'" startOffset="'+(ri%2?'62%':'26%')+'">'+r.name+'</textPath></text>';
  });
  // ferry lanes: one dashed line per ferry edge (works for chains AND stars)
  PAIRS.forEach(function(p){
    if(p.types.indexOf('f')<0)return;
    h+='<path d="M '+maR1(POS[p.a].x)+' '+maR1(POS[p.a].y)+' L '+maR1(POS[p.b].x)+' '+maR1(POS[p.b].y)+'" fill="none" stroke="#4FD8E6" stroke-width="1.1" stroke-dasharray="10 14" opacity="0.32"/>';
  });
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
function maDistrictAnchors(){
  var geo=MAPDATA.geo;
  if(geo&&geo.districts)return geo.districts.map(function(d){return {name:d.name,x:d.at[0],y:d.at[1]};});
  return MA_DISTRICTS;
}
function maBuildDistricts(g){
  var ANCH=maDistrictAnchors();
  var tints=['#16283E','#14293A','#182741','#13293C','#172A3D','#122438'];
  var h='',labels='';
  var clusters=ANCH.map(function(){return [];});
  for(var i=1;i<=199;i++){
    var best=0,bd=1e9;
    ANCH.forEach(function(d,k){
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
    labels+='<text class="maplabel" x="'+maR1(ANCH[k].x)+'" y="'+maR1(ANCH[k].y)+'" text-anchor="middle" font-size="'+(ANCH.length>8?11:14)+'" letter-spacing="4">'+ANCH[k].name+'</text>';
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
var MA_PARK_NAMES=['ASHGROVE PARK','NORTHFIELD COMMON','EASTMARSH GREEN',"WIDOW'S GARDEN",'FOUNDRY FIELDS'];
var MA_PARK_NAMES_GEO=['RIVERSIDE GREEN','TOMPKINS FIELD','BATTERY GARDENS'];
function maBuildParks(g){
  var rr=maRng(MA_SEED+3);
  var geo=MAPDATA.geo;
  var h='';
  if(geo&&geo.park){
    // the big park: smoothed polygon + trees + a meadow path + label
    var poly=geo.park.poly.map(function(p){return {x:p[0],y:p[1]};});
    var cx=0,cy=0;poly.forEach(function(p){cx+=p.x;cy+=p.y;});cx/=poly.length;cy/=poly.length;
    var soft=[];
    poly.forEach(function(p,i){
      var q=poly[(i+1)%poly.length];
      for(var t=0;t<1;t+=0.34){
        var x=p.x+(q.x-p.x)*t,y=p.y+(q.y-p.y)*t;
        soft.push({x:x+(rr()*2-1)*5,y:y+(rr()*2-1)*5});
      }
    });
    var d=maSmoothClosed(soft);
    h+='<path d="'+d+'" fill="#12301F" opacity="0.9"/>';
    h+='<path d="'+d+'" fill="none" stroke="#1E4A30" stroke-width="3" opacity="0.85"/>';
    h+='<path d="'+d+'" fill="none" stroke="#2E6B45" stroke-width="0.9" opacity="0.5"/>';
    for(var t2=0;t2<30;t2++){
      var px=cx+(rr()*2-1)*(Math.abs(poly[1].x-poly[0].x)/2-10);
      var py=cy+(rr()*2-1)*(Math.abs(poly[2].y-poly[1].y)/2-8);
      if(!maInPoly(geo.park.poly,px,py))continue;
      h+='<circle cx="'+maR1(px)+'" cy="'+maR1(py)+'" r="'+maR1(2+rr()*1.8)+'" fill="#1C4A2E" opacity="0.9"/>';
    }
    var nm=geo.park.name,bw=nm.length*6+18;
    h+='<g transform="translate('+maR1(cx)+','+maR1(cy)+')">'+
      '<rect x="'+maR1(-bw/2)+'" y="-9" width="'+maR1(bw)+'" height="17" rx="3" fill="#0B1524" opacity="0.78" stroke="#2E6B45" stroke-width="0.8"/>'+
      '<text class="parklabel" y="4" text-anchor="middle" font-size="10" letter-spacing="2.4">'+nm+'</text></g>';
  }
  // smaller computed parks in the biggest station gaps
  var names=geo?MA_PARK_NAMES_GEO:MA_PARK_NAMES;
  var spots=maParkSpots(geo?3:5);
  spots.forEach(function(sp,i){
    if(geo&&geo.park&&maInPoly(geo.park.poly,sp.x,sp.y))return;
    var R=Math.min(geo?44:58,sp.d-14);
    if(R<24)return;
    var pts=[];
    for(var a=0;a<8;a++){
      var ang=a/8*Math.PI*2;
      var rad=R*(0.72+rr()*0.4);
      pts.push({x:sp.x+Math.cos(ang)*rad*1.25,y:sp.y+Math.sin(ang)*rad*0.85});
    }
    var d2=maSmoothClosed(pts);
    h+='<path d="'+d2+'" fill="#12301F" opacity="0.85"/>';
    h+='<path d="'+d2+'" fill="none" stroke="#1E4A30" stroke-width="2.4" opacity="0.8"/>';
    for(var t3=0;t3<12;t3++){
      var ang2=rr()*Math.PI*2,rad2=rr()*R*0.62;
      var tx=maR1(sp.x+Math.cos(ang2)*rad2*1.2),ty=maR1(sp.y+Math.sin(ang2)*rad2*0.8);
      h+='<circle cx="'+tx+'" cy="'+ty+'" r="'+maR1(2+rr()*1.6)+'" fill="#1C4A2E" opacity="0.9"/>';
    }
    var nm2=names[i%names.length],bw2=nm2.length*5.4+14;
    h+='<g transform="translate('+maR1(sp.x)+','+maR1(sp.y)+')">'+
      '<rect x="'+maR1(-bw2/2)+'" y="-7" width="'+maR1(bw2)+'" height="13" rx="2.5" fill="#0B1524" opacity="0.78" stroke="#2E6B45" stroke-width="0.7"/>'+
      '<text class="parklabel" y="3" text-anchor="middle" font-size="8" letter-spacing="1.6">'+nm2+'</text></g>';
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
      if(MAPDATA.geo&&MAPDATA.geo.park&&maInPoly(MAPDATA.geo.park.poly,ex,ey))continue;
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
      if(MAPDATA.geo&&MAPDATA.geo.park&&maInPoly(MAPDATA.geo.park.poly,x,y))continue;
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

/* ---- layer 7: landmarks — original stylized icons + boxed labels ---- */
function maLandmarkBox(x,y,nm,stroke){
  var bw=nm.length*5.2+16;
  return '<g transform="translate('+maR1(x)+','+maR1(y)+')">'+
    '<rect x="'+maR1(-bw/2)+'" y="-7.5" width="'+maR1(bw)+'" height="14" rx="2.5" fill="#0B1524" opacity="0.85" stroke="'+stroke+'" stroke-width="0.8"/>'+
    '<text class="lmlabel" y="3.2" text-anchor="middle" font-size="8" letter-spacing="1.4">'+nm+'</text></g>';
}
function maBuildLandmarks(g){
  var geo=MAPDATA.geo,h='';
  if(geo){
    (geo.bridges||[]).forEach(function(b){
      h+='<g transform="translate('+b[0]+','+b[1]+') rotate('+b[2]+')">'+
        '<rect x="-30" y="-4.6" width="60" height="9.2" rx="2" fill="#2B3B52" stroke="#101B2C" stroke-width="0.8"/>'+
        '<path d="M -26 -4.6 Q -13 -16 0 -4.6 Q 13 -16 26 -4.6" fill="none" stroke="#5B7AA8" stroke-width="1.4"/>'+
        '<path d="M -13 -4.6 L -13 -11 M 13 -4.6 L 13 -11" stroke="#5B7AA8" stroke-width="1.6"/>'+
        '</g>';
    });
    (geo.landmarks||[]).forEach(function(l){
      if(l.name==='HARBOR LIGHT'){
        var lx=Math.min(966,Math.max(34,l.at[0])),ly=Math.min(MAP_H-40,Math.max(40,l.at[1]));
        h+='<g transform="translate('+lx+','+ly+')">'+
          '<path d="M -3.2 8 L -1.8 -4 L 1.8 -4 L 3.2 8 Z" fill="#22344C" stroke="#101B2C" stroke-width="0.8"/>'+
          '<rect x="-2.4" y="-7.4" width="4.8" height="3.6" rx="1" fill="#0E1A2B" stroke="#101B2C" stroke-width="0.7"/>'+
          '<circle cy="-5.6" r="1.3" fill="#FFE9A6"/>'+
          '<path d="M 2 -5.6 L 15 -9 L 15 -2.2 Z" fill="#FFE9A6" opacity="0.18"/>'+
          maLandmarkBox(0,17,l.name,'#8A7B54')+'</g>';
      }else{
        h+=maLandmarkBox(l.at[0],l.at[1],l.name,l.name.indexOf('BRIDGE')>=0?'#3E6E8E':'#8A7B54');
      }
    });
    g.insertAdjacentHTML('beforeend','<g class="ma-landmarks" style="pointer-events:none">'+h+'</g>');
    return;
  }
  var rs=maRivers(),pts=rs.length?rs[0].pts:null;
  var bridge=null;
  PAIRS.forEach(function(p){
    if(p.types.indexOf('f')>=0)return;
    var mx=(POS[p.a].x+POS[p.b].x)/2,my=(POS[p.a].y+POS[p.b].y)/2;
    if(maWaterDist(mx,my)<0&&(!bridge||p.types.length>bridge.types.length))bridge={types:p.types,x:mx,y:my};
  });
  if(bridge)h+=maLandmarkBox(bridge.x,bridge.y+26,'GRAYWATER BRIDGE','#3E6E8E');
  if(pts){
    var e=pts[pts.length-4];
    var bx=maR1(Math.min(966,Math.max(34,e.x))),by=maR1(Math.min(MAP_H-40,Math.max(40,e.y-e.w-16)));
    h+='<g transform="translate('+bx+','+by+')">'+
      '<path d="M -3.2 8 L -1.8 -4 L 1.8 -4 L 3.2 8 Z" fill="#22344C" stroke="#101B2C" stroke-width="0.8"/>'+
      '<path d="M -2.6 3.2 L 2.6 3.2 M -2.9 5.8 L 2.9 5.8" stroke="#101B2C" stroke-width="0.7"/>'+
      '<rect x="-2.4" y="-7.4" width="4.8" height="3.6" rx="1" fill="#0E1A2B" stroke="#101B2C" stroke-width="0.7"/>'+
      '<circle cy="-5.6" r="1.3" fill="#FFE9A6"/>'+
      '<path d="M 2 -5.6 L 15 -9 L 15 -2.2 Z" fill="#FFE9A6" opacity="0.18"/>'+
      maLandmarkBox(0,17,'THE BEACON','#8A7B54')+
      '</g>';
  }
  var best=0,bd=-1;
  for(var i=1;i<=199;i++){
    var u=0;NBRS[i].forEach(function(e2){if(e2.t==='u')u++;});
    if(u>bd){bd=u;best=i;}
  }
  if(bd>0)h+=maLandmarkBox(POS[best].x,POS[best].y-17,'GRAND TERMINAL','#FF5A6A');
  var mBest=0,mScore=-1;
  for(var j=1;j<=199;j++){
    var b2=0;NBRS[j].forEach(function(e3){if(e3.t==='b')b2++;});
    var far=Math.hypot(POS[j].x-POS[best].x,POS[j].y-POS[best].y);
    if(b2>=2&&b2*100+far>mScore){mScore=b2*100+far;mBest=j;}
  }
  if(mBest)h+=maLandmarkBox(POS[mBest].x,POS[mBest].y-16,'OLD MARKET HALL','#37E38C');
  g.insertAdjacentHTML('beforeend','<g class="ma-landmarks" style="pointer-events:none">'+h+'</g>');
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
  maBuildLandmarks(base);
  return base;
}
