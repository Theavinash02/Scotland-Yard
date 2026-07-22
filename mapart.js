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

/* ---- entry point: called once from buildMap() ---- */
function buildGraywaterBase(svg,defs){
  defs.insertAdjacentHTML('beforeend',maDefs());
  var base=document.createElementNS('http://www.w3.org/2000/svg','g');
  base.setAttribute('id','L-base');
  base.setAttribute('style','pointer-events:none');
  svg.appendChild(base);
  maBuildLand(base);
  maBuildWater(base);
  return base;
}
