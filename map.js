/* ============================================================
   Scotland Yard — 3D board (Three.js)  [Phase 1: foundation]
   Full rewrite of the former SVG renderer. Interaction parity,
   zero art. engine.js / bots.js are a black box; this module only
   READS their globals (POS, PAIRS, NBRS, G, isFerryOnly) and the
   ui.js globals (UI, onStationClick, sfxForTicket).

   Public surface kept identical to the old map.js so ui.js and the
   rest of the app keep working unchanged:
     $  MAP_H  VB  setVB()  buildMap()
     animateVehicle(from,to,tk) -> Promise
     revealPing(st)
     hiddenMoveFx(tk) -> Promise
   Plus the new MAP3D API used by ui.js renderPieces/renderHighlights:
     MAP3D.setPieces(list) / setPossibleSpots(list) / setHighlights(rings,currentRing)
   ============================================================ */

const MAP_H=761;
function $(s){return document.querySelector(s);}

// Kept because ui.js's enterGame() does `VB={x:0,y:0,w:1000,h:MAP_H};setVB();`
var VB={x:0,y:0,w:1000,h:MAP_H};

/* ---- shared colours (same values as the old SVG board) ---- */
var TK_HEX={t:0xDFAE1F, b:0x2F8A52, u:0xD23A3A, f:0x3E6E8E, x:0x14181D};

/* ---- recovered hand-placed art data (from the pre-3D SVG buildMap) ----
   Regions are already positioned relative to POS, so no re-derivation.
   density/tall are per-district shaping factors for the procedural city. */
var DISTRICTS=[
  {cx:360, cy:455, rx:110, ry:58, name:'WESTMINSTER', tint:0x2f3947, density:0.95, tall:1.00},
  {cx:630, cy:600, rx:104, ry:54, name:'SOUTHWARK',   tint:0x2f3a38, density:0.90, tall:0.78},
  {cx:765, cy:352, rx:100, ry:52, name:'THE CITY',    tint:0x363348, density:1.30, tall:1.65},
  {cx:810, cy:175, rx:92,  ry:50, name:'CAMDEN',      tint:0x3a332c, density:0.70, tall:0.55},
  {cx:585, cy:44,  rx:88,  ry:40, name:'MARYLEBONE',  tint:0x323a40, density:0.72, tall:0.62},
  {cx:450, cy:224, rx:70,  ry:40, name:'SOHO',        tint:0x3e352c, density:1.20, tall:1.15}
];
var PARKS=[
  {cx:180, cy:405, rx:64, ry:40, name:'HYDE PARK'},
  {cx:140, cy:56,  rx:78, ry:30, name:"REGENT'S PARK"},
  {cx:900, cy:672, rx:60, ry:38, name:'GREENWICH PARK'}
];
var RIVER_STATIONS=[194,157,115,108]; // the ferry line = the Thames
var RIVER_HALF_W=19;                  // half width of the water ribbon

var MAP3D={
  built:false,
  scene:null, camera:null, renderer:null, raycaster:null,
  groundPlane:null,
  stationMeshes:[],
  edgeLines:[],
  piecesGroup:null, spotsGroup:null, hlGroup:null, fxGroup:null,
  artGroup:null, labelSprites:[], riverPts:[], waterTex:null, _waterRaf:null,
  // camera rig: fixed downward pitch, only target + distance change
  pitch:52*Math.PI/180,           // angle from vertical (~game-board tilt)
  cam:{tx:500, tz:MAP_H/2, dist:1200},
  minDist:280, maxDist:4200,
  fps:{last:0, frames:0, value:0},
  raf:null,
  _ro:null,

  /* -------- build the scene (once) -------- */
  build:function(){
    if(this.built)return;
    if(typeof THREE==='undefined'){
      console.error('[map3d] THREE.js is not loaded — board cannot render.');
      return;
    }
    var canvas=document.getElementById('map');
    if(!canvas)return;

    var scene=new THREE.Scene();
    this.scene=scene;

    var w=canvas.clientWidth||canvas.parentElement.clientWidth||800;
    var h=canvas.clientHeight||canvas.parentElement.clientHeight||600;

    var camera=new THREE.PerspectiveCamera(45, w/Math.max(1,h), 1, 20000);
    this.camera=camera;

    var renderer=new THREE.WebGLRenderer({canvas:canvas, antialias:true, alpha:true});
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio||1));
    renderer.setSize(w,h,false);
    renderer.setClearColor(0x0f1722, 0); // transparent — CSS #mapwrap gradient shows through
    this.renderer=renderer;

    this.raycaster=new THREE.Raycaster();
    this.groundPlane=new THREE.Plane(new THREE.Vector3(0,1,0), 0);

    // --- dusk sky: vertical gradient background, ground fades into its horizon ---
    scene.background=this._skyTexture();

    // --- lighting & mood (dark noir): warm low key + cool fill, lifted a touch ---
    scene.add(new THREE.HemisphereLight(0x93a6c2, 0x101622, 0.74)); // cool sky / dark ground
    scene.add(new THREE.AmbientLight(0x46536e, 0.44));
    var key=new THREE.DirectionalLight(0xffd6a0, 0.95);            // warm, low-angle key
    key.position.set(-320, 470, -200);
    scene.add(key);
    // Exponential fog fades the vast extended ground smoothly into the sky.
    // Colour matches the deep-indigo band of the sky gradient so the far
    // ground and the sky read as one continuous night horizon (with the
    // fixed downward pitch, the true horizon sits high/off-screen, so the
    // fogged far ground IS what meets the sky — no seam, no black void).
    // Density is low enough that the whole board stays clear at play zoom
    // and only lightly hazed at full zoom-out.
    scene.fog=new THREE.FogExp2(0x171d33, 0.00019);

    // --- terrain & city art (Phase 2, all additive to the Phase 1 skeleton) ---
    this._buildGround();
    this._buildDistrictDecals();
    this._buildRiver();     // before buildings: they must stop at the water's edge
    this._buildBuildings();
    this._buildParks();
    this._buildLandmarks();

    this._buildEdges();
    this._buildStations();
    this._buildStationNumbers(); // Phase 3: numbered billboards (regression fix)
    this._buildLabels();    // camera-facing text sprites, on top of the art

    this.piecesGroup=new THREE.Group(); scene.add(this.piecesGroup);
    this.spotsGroup =new THREE.Group(); scene.add(this.spotsGroup);
    this.hlGroup    =new THREE.Group(); scene.add(this.hlGroup);
    this.fxGroup    =new THREE.Group(); scene.add(this.fxGroup);

    this.built=true;
    this.frameRegion(0,0,1000,MAP_H);
    this._bindControls(canvas);
    this._observeResize(canvas);
    this._startLoop();
    this._startWaterAnim();
  },

  /* -------- transport edges (one line object per colour) -------- */
  _buildEdges:function(){
    var order={t:0,b:1,u:2,f:3};
    var verts={t:[],b:[],u:[],f:[]};
    for(var i=0;i<PAIRS.length;i++){
      var p=PAIRS[i], A=POS[p.a], B=POS[p.b];
      var dx=B.x-A.x, dy=B.y-A.y, len=Math.hypot(dx,dy)||1;
      var px=-dy/len, py=dx/len;
      var types=p.types.slice().sort(function(a,b){return order[a]-order[b];});
      var n=types.length;
      for(var j=0;j<n;j++){
        var t=types[j], off=(j-(n-1)/2)*4.4;
        var ax=A.x+px*off, ay=A.y+py*off, bx=B.x+px*off, by=B.y+py*off;
        if(!verts[t])continue;
        verts[t].push(ax,1.2,ay, bx,1.2,by);
      }
    }
    var self=this;
    ['t','b','u','f'].forEach(function(t){
      if(!verts[t].length)return;
      var geo=new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(verts[t], 3));
      var line;
      if(t==='f'){
        var mat=new THREE.LineDashedMaterial({color:TK_HEX.f, dashSize:8, gapSize:7, transparent:true, opacity:0.9});
        line=new THREE.LineSegments(geo, mat);
        line.computeLineDistances();
      }else{
        line=new THREE.LineSegments(geo, new THREE.LineBasicMaterial({color:TK_HEX[t], transparent:true, opacity:0.95}));
      }
      self.scene.add(line);
      self.edgeLines.push(line);
    });
  },

  /* -------- station markers -------- */
  _buildStations:function(){
    for(var id=1;id<=199;id++){
      if(!POS[id])continue;
      var hasU=false, hasB=false;
      var nb=NBRS[id]||[];
      for(var k=0;k<nb.length;k++){ if(nb[k].t==='u')hasU=true; else if(nb[k].t==='b')hasB=true; }
      var r=hasU?9:hasB?7.4:6;
      // single-mesh marker (keeps draw calls low) with a two-tone tapered profile
      // and a soft warm base glow — reads as a lit token, not a flat disc.
      var geo=new THREE.CylinderGeometry(r, r+1.7, 4.6, 20);
      var mat=new THREE.MeshStandardMaterial({color:0xFDFBF2, roughness:0.5, metalness:0.08,
        emissive:(hasU?0x5a2418:hasB?0x1f4a2a:0x4a3a1a), emissiveIntensity:0.5});
      var m=new THREE.Mesh(geo, mat);
      m.position.set(POS[id].x, 2.3, POS[id].y);
      m.userData.id=id;
      this.scene.add(m);
      this.stationMeshes.push(m);
    }
  },

  /* -------- camera helpers -------- */
  _clampDist:function(){
    if(this.cam.dist<this.minDist)this.cam.dist=this.minDist;
    if(this.cam.dist>this.maxDist)this.cam.dist=this.maxDist;
  },
  applyCam:function(){
    if(!this.camera)return;
    var hgt=this.cam.dist*Math.cos(this.pitch);
    var off=this.cam.dist*Math.sin(this.pitch);
    this.camera.position.set(this.cam.tx, hgt, this.cam.tz+off);
    this.camera.lookAt(this.cam.tx, 0, this.cam.tz);
  },
  frameRegion:function(x,y,w,h){
    this.cam.tx=x+w/2;
    this.cam.tz=y+h/2;
    var vfov=this.camera?this.camera.fov*Math.PI/180:(45*Math.PI/180);
    var aspect=this.camera?this.camera.aspect:1.4;
    var hfov=2*Math.atan(Math.tan(vfov/2)*aspect);
    var distH=(w/2)/Math.tan(hfov/2);
    var distV=(h/2)/Math.tan(vfov/2);
    this.cam.dist=Math.max(distH,distV)*1.22;
    this._clampDist();
    this.applyCam();
  },

  /* -------- board<->screen picking -------- */
  groundPoint:function(clientX, clientY){
    if(!this.renderer)return null;
    var rect=this.renderer.domElement.getBoundingClientRect();
    if(!rect.width||!rect.height)return null;
    var ndc=new THREE.Vector2(
      ((clientX-rect.left)/rect.width)*2-1,
      -((clientY-rect.top)/rect.height)*2+1
    );
    this.raycaster.setFromCamera(ndc, this.camera);
    var pt=new THREE.Vector3();
    if(!this.raycaster.ray.intersectPlane(this.groundPlane, pt))return null;
    return {x:pt.x, y:pt.z};
  },
  nearestStation:function(bx, by){
    var thr=Math.max(14, Math.min(44, this.cam.dist*0.022));
    var best=0, bd=1e9;
    for(var i=1;i<=199;i++){
      if(!POS[i])continue;
      var d=Math.hypot(POS[i].x-bx, POS[i].y-by);
      if(d<bd){bd=d; best=i;}
    }
    return (best && bd<=thr)?best:0;
  },

  /* -------- pointer controls (pan / zoom / tap) -------- */
  _bindControls:function(canvas){
    var self=this;
    var ptrs={}, panStart=null, pinch=null, grab=null;

    canvas.addEventListener('wheel', function(ev){
      ev.preventDefault();
      var k=ev.deltaY>0?1.15:0.87;
      var before=self.groundPoint(ev.clientX, ev.clientY);
      self.cam.dist*=k; self._clampDist(); self.applyCam();
      var after=self.groundPoint(ev.clientX, ev.clientY);
      if(before&&after){ self.cam.tx+=before.x-after.x; self.cam.tz+=before.y-after.y; self.applyCam(); }
    }, {passive:false});

    canvas.addEventListener('pointerdown', function(ev){
      try{canvas.setPointerCapture(ev.pointerId);}catch(e){}
      ptrs[ev.pointerId]={x:ev.clientX, y:ev.clientY};
      var ids=Object.keys(ptrs);
      if(ids.length===1){
        panStart={cx:ev.clientX, cy:ev.clientY, t:Date.now(), moved:0};
        grab=self.groundPoint(ev.clientX, ev.clientY);
        canvas.classList.add('dragging');
      }else if(ids.length===2){
        panStart=null;
        var a=ptrs[ids[0]], b=ptrs[ids[1]];
        var mx=(a.x+b.x)/2, my=(a.y+b.y)/2;
        pinch={d:Math.hypot(a.x-b.x, a.y-b.y), dist0:self.cam.dist, grab:self.groundPoint(mx,my)};
      }
    });

    canvas.addEventListener('pointermove', function(ev){
      if(!ptrs[ev.pointerId])return;
      ptrs[ev.pointerId]={x:ev.clientX, y:ev.clientY};
      var ids=Object.keys(ptrs);
      if(ids.length===1 && panStart){
        panStart.moved=Math.max(panStart.moved, Math.hypot(ev.clientX-panStart.cx, ev.clientY-panStart.cy));
        if(grab){
          var cur=self.groundPoint(ev.clientX, ev.clientY);
          if(cur){ self.cam.tx+=grab.x-cur.x; self.cam.tz+=grab.y-cur.y; self.applyCam(); }
        }
      }else if(ids.length===2 && pinch){
        var a=ptrs[ids[0]], b=ptrs[ids[1]];
        var d=Math.hypot(a.x-b.x, a.y-b.y)||1;
        self.cam.dist=pinch.dist0*(pinch.d/d); self._clampDist(); self.applyCam();
        var mx=(a.x+b.x)/2, my=(a.y+b.y)/2;
        if(pinch.grab){
          var cur2=self.groundPoint(mx,my);
          if(cur2){ self.cam.tx+=pinch.grab.x-cur2.x; self.cam.tz+=pinch.grab.y-cur2.y; self.applyCam(); }
        }
      }
    });

    function up(ev){
      var isTap=panStart && Object.keys(ptrs).length===1 && panStart.moved<7 && (Date.now()-panStart.t)<700;
      var tapEv=ev;
      delete ptrs[ev.pointerId]; panStart=null; pinch=null; grab=null;
      canvas.classList.remove('dragging');
      if(isTap)self._handleTap(tapEv);
    }
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);

    var zin=$('#zin'), zout=$('#zout'), zfit=$('#zfit');
    if(zin) zin.onclick=function(){ self.cam.dist*=0.8;  self._clampDist(); self.applyCam(); };
    if(zout)zout.onclick=function(){ self.cam.dist*=1.25; self._clampDist(); self.applyCam(); };
    if(zfit)zfit.onclick=function(){ self.frameRegion(0,0,1000,MAP_H); };
  },
  _handleTap:function(ev){
    var g=this.groundPoint(ev.clientX, ev.clientY);
    if(g){
      var id=this.nearestStation(g.x, g.y);
      if(id){ onStationClick(id, ev); return; }
    }
    var c=$('#chooser'); if(c)c.hidden=true;
  },

  /* -------- resize -------- */
  _observeResize:function(canvas){
    var self=this;
    function resize(){
      var w=canvas.clientWidth||canvas.parentElement.clientWidth;
      var h=canvas.clientHeight||canvas.parentElement.clientHeight;
      if(!w||!h)return;
      self.renderer.setSize(w,h,false);
      self.camera.aspect=w/h;
      self.camera.updateProjectionMatrix();
    }
    if(window.ResizeObserver){
      this._ro=new ResizeObserver(resize);
      this._ro.observe(canvas.parentElement||canvas);
    }
    window.addEventListener('resize', resize);
  },

  /* -------- render loop + FPS -------- */
  _startLoop:function(){
    var self=this;
    this.fps.last=performance.now();
    function frame(now){
      self.raf=requestAnimationFrame(frame);
      self.fps.frames++;
      if(now-self.fps.last>=500){
        self.fps.value=Math.round(self.fps.frames*1000/(now-self.fps.last));
        self.fps.frames=0; self.fps.last=now;
        window.__map3dFps=self.fps.value;
      }
      // gentle pulse on legal-move rings
      if(self.hlGroup){
        var pulse=0.6+0.4*Math.abs(Math.sin(now*0.004));
        for(var i=0;i<self.hlGroup.children.length;i++){
          var ch=self.hlGroup.children[i];
          if(ch.userData.pulse && ch.material)ch.material.opacity=pulse;
        }
      }
      self.renderer.render(self.scene, self.camera);
    }
    this.raf=requestAnimationFrame(frame);
  },

  /* -------- group helpers -------- */
  _clearGroup:function(grp){
    if(!grp)return;
    for(var i=grp.children.length-1;i>=0;i--){
      var c=grp.children[i];
      grp.remove(c);
      if(c.geometry)c.geometry.dispose();
      if(c.material)c.material.dispose();
    }
  },

  /* ============ public API used by ui.js ============ */
  setPieces:function(list){
    if(!this.built)return;
    this._clearGroup(this.piecesGroup);
    for(var i=0;i<list.length;i++){
      var it=list[i], m;
      if(it.kind==='det'){
        m=new THREE.Mesh(
          new THREE.CylinderGeometry(8,8,12,24),
          new THREE.MeshStandardMaterial({color:new THREE.Color(it.color), roughness:0.5, metalness:0.1})
        );
        m.position.set(it.x, 10, it.y);
      }else if(it.kind==='mrx'){
        m=new THREE.Mesh(
          new THREE.CylinderGeometry(9,9,14,24),
          new THREE.MeshStandardMaterial({color:0x0B0D10, emissive:0xF2C230, emissiveIntensity:0.28, roughness:0.4, metalness:0.2})
        );
        m.position.set(it.x, 11, it.y);
      }else{ // mrx-ghost
        m=new THREE.Mesh(
          new THREE.CylinderGeometry(9,9,3,24),
          new THREE.MeshStandardMaterial({color:0x0B0D10, transparent:true, opacity:0.5, roughness:0.6})
        );
        m.position.set(it.x, 6, it.y);
      }
      this.piecesGroup.add(m);
    }
  },

  setPossibleSpots:function(list){
    if(!this.built)return;
    this._clearGroup(this.spotsGroup);
    for(var i=0;i<list.length;i++){
      var disc=new THREE.Mesh(
        new THREE.CircleGeometry(12, 24),
        new THREE.MeshBasicMaterial({color:0xD8621F, transparent:true, opacity:0.32, side:THREE.DoubleSide, depthWrite:false})
      );
      disc.rotation.x=-Math.PI/2;
      disc.position.set(list[i].x, 2.2, list[i].y);
      this.spotsGroup.add(disc);
    }
  },

  setHighlights:function(rings, currentRing){
    if(!this.built)return;
    this._clearGroup(this.hlGroup);
    var i, ring;
    for(i=0;i<rings.length;i++){
      ring=new THREE.Mesh(
        new THREE.RingGeometry(12, 15.5, 28),
        new THREE.MeshBasicMaterial({color:0xF2C230, transparent:true, opacity:0.9, side:THREE.DoubleSide, depthWrite:false})
      );
      ring.rotation.x=-Math.PI/2;
      ring.position.set(rings[i].x, 2.6, rings[i].y);
      ring.userData.pulse=true;
      this.hlGroup.add(ring);
    }
    if(currentRing){
      ring=new THREE.Mesh(
        new THREE.RingGeometry(15, 17, 30),
        new THREE.MeshBasicMaterial({color:0xE9EEF4, transparent:true, opacity:0.8, side:THREE.DoubleSide, depthWrite:false})
      );
      ring.rotation.x=-Math.PI/2;
      ring.position.set(currentRing.x, 2.7, currentRing.y);
      this.hlGroup.add(ring);
    }
  },

  /* -------- move animation -------- */
  animateVehicle:function(from, to, tk){
    var self=this;
    return new Promise(function(res){
      var boat=(tk==='x' && typeof isFerryOnly==='function' && isFerryOnly(from,to));
      if(typeof sfxForTicket==='function')sfxForTicket(tk, boat);
      if(!self.built || !POS[from] || !POS[to]){ setTimeout(res, 300); return; }
      var A=POS[from], B=POS[to];
      var hex=boat?TK_HEX.f:(TK_HEX[tk]!==undefined?TK_HEX[tk]:TK_HEX.x);
      var mesh=new THREE.Mesh(
        new THREE.SphereGeometry(9, 18, 12),
        new THREE.MeshStandardMaterial({color:hex, roughness:0.4, metalness:0.2, emissive:hex, emissiveIntensity:0.25})
      );
      mesh.position.set(A.x, 14, A.y);
      self.fxGroup.add(mesh);
      var len=Math.hypot(B.x-A.x, B.y-A.y)||1;
      var reduce=window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      var dur=reduce?150:Math.max(520, Math.min(1150, len*9));
      var t0=performance.now();
      function step(now){
        var k=(now-t0)/dur; if(k>1)k=1;
        var e=k<0.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
        mesh.position.set(A.x+(B.x-A.x)*e, 14+Math.sin(k*Math.PI)*7, A.y+(B.y-A.y)*e);
        if(k<1)requestAnimationFrame(step);
        else{
          self.fxGroup.remove(mesh);
          mesh.geometry.dispose(); mesh.material.dispose();
          res();
        }
      }
      requestAnimationFrame(step);
    });
  },

  revealPing:function(st){
    if(!this.built || !POS[st])return;
    var self=this, p=POS[st];
    var geo=new THREE.RingGeometry(10, 13, 32);
    var mat=new THREE.MeshBasicMaterial({color:TK_HEX.u, transparent:true, opacity:0.9, side:THREE.DoubleSide, depthWrite:false});
    var ring=new THREE.Mesh(geo, mat);
    ring.rotation.x=-Math.PI/2;
    ring.position.set(p.x, 3, p.y);
    self.fxGroup.add(ring);
    var t0=performance.now();
    function step(now){
      var k=(now-t0)/1100;
      ring.scale.setScalar(1+k*2.4);
      mat.opacity=Math.max(0, 0.9*(1-k));
      if(k<1)requestAnimationFrame(step);
      else{ self.fxGroup.remove(ring); geo.dispose(); mat.dispose(); }
    }
    requestAnimationFrame(step);
  },

  /* =====================================================================
     PHASE 2 — terrain & city art. Purely additive scene content; does not
     touch camera controls, pan/zoom, the click raycaster, or the MAP3D API.
     NOTE: none of these meshes are pushed to this.stationMeshes, and the
     tap picker (groundPoint + nearestStation over POS) never raycasts scene
     meshes at all, so buildings/trees/landmarks can never intercept a click.
     ===================================================================== */

  /* deterministic per-seed RNG (mulberry32), stable across reloads */
  _hash:function(a,b){ var h=(a*73856093)^(b*19349663); return (h^(h>>>13))>>>0; },
  _rng:function(seed){
    seed=seed>>>0;
    return function(){
      seed=(seed+0x6D2B79F5)>>>0;
      var t=seed;
      t=Math.imul(t^(t>>>15), 1|t);
      t=(t+Math.imul(t^(t>>>7), 61|t))^t;
      return ((t^(t>>>14))>>>0)/4294967296;
    };
  },

  _softCircleTexture:function(){
    if(this._softTex)return this._softTex;
    var c=document.createElement('canvas'); c.width=c.height=128;
    var ctx=c.getContext('2d');
    var g=ctx.createRadialGradient(64,64,4, 64,64,64);
    g.addColorStop(0,'rgba(255,255,255,1)');
    g.addColorStop(0.6,'rgba(255,255,255,0.55)');
    g.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle=g; ctx.fillRect(0,0,128,128);
    this._softTex=new THREE.CanvasTexture(c);
    return this._softTex;
  },
  _noiseTexture:function(){
    var c=document.createElement('canvas'); c.width=c.height=256;
    var ctx=c.getContext('2d');
    ctx.fillStyle='#2a313b'; ctx.fillRect(0,0,256,256);
    var img=ctx.getImageData(0,0,256,256), d=img.data;
    for(var i=0;i<d.length;i+=4){
      var n=(Math.random()*30-15)|0;
      d[i]=Math.max(0,Math.min(255,d[i]+n));
      d[i+1]=Math.max(0,Math.min(255,d[i+1]+n));
      d[i+2]=Math.max(0,Math.min(255,d[i+2]+n));
    }
    ctx.putImageData(img,0,0);
    // faint street-ish streaks for texture
    ctx.globalAlpha=0.05; ctx.strokeStyle='#0c0f14';
    for(var s=0;s<40;s++){ ctx.beginPath(); ctx.moveTo(Math.random()*256,Math.random()*256); ctx.lineTo(Math.random()*256,Math.random()*256); ctx.stroke(); }
    var tex=new THREE.CanvasTexture(c);
    tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
    return tex;
  },

  /* 1. shaded ground */
  _buildGround:function(){
    // Extend the ground far past the gameplay bounds so the plane edge is
    // never reachable within normal pan/zoom; the fog (set in build) fades
    // the far ground into the sky's horizon long before that edge.
    var SIZE=40000;
    var tex=this._noiseTexture();
    tex.repeat.set(SIZE/170, SIZE/170);
    var geo=new THREE.PlaneGeometry(SIZE, SIZE);
    var mat=new THREE.MeshStandardMaterial({color:0x28303a, map:tex, roughness:1, metalness:0});
    var g=new THREE.Mesh(geo, mat);
    g.rotation.x=-Math.PI/2;
    g.position.set(500, 0, MAP_H/2);
    this.scene.add(g);
  },

  /* 1b. subtle per-district & per-park colour variation via soft ground decals */
  _buildDistrictDecals:function(){
    var tex=this._softCircleTexture(), self=this;
    function decal(cx,cy,rx,ry,hex,op,y){
      var m=new THREE.Mesh(
        new THREE.PlaneGeometry(rx*2.4, ry*2.4),
        new THREE.MeshBasicMaterial({map:tex, color:hex, transparent:true, opacity:op, depthWrite:false})
      );
      m.rotation.x=-Math.PI/2; m.position.set(cx, y, cy); m.renderOrder=-2;
      self.scene.add(m);
    }
    DISTRICTS.forEach(function(d){ decal(d.cx,d.cy,d.rx,d.ry,d.tint,0.55,0.3); });
    PARKS.forEach(function(p){ decal(p.cx,p.cy,p.rx,p.ry,0x223a24,0.6,0.35); });
  },

  /* 3. River Thames — a shimmering ribbon along the recovered curve */
  _riverCurve:function(){
    var P=RIVER_STATIONS.map(function(s){return new THREE.Vector3(POS[s].x, 0.6, POS[s].y);});
    var pre =new THREE.Vector3(P[0].x+(P[0].x-P[1].x)*0.9, 0.6, P[0].z+(P[0].z-P[1].z)*0.9);
    var post=new THREE.Vector3(P[3].x+(P[3].x-P[2].x)*0.75,0.6, P[3].z+(P[3].z-P[2].z)*0.75);
    return new THREE.CatmullRomCurve3([pre,P[0],P[1],P[2],P[3],post]);
  },
  _buildRiver:function(){
    var curve=this._riverCurve();
    var N=80, pts=curve.getPoints(N);
    var pos=[], uv=[], idx=[];
    this.riverPts=[];
    for(var i=0;i<=N;i++){
      var p=pts[i];
      this.riverPts.push({x:p.x, y:p.z});
      var t=curve.getTangent(i/N);
      // perpendicular in XZ plane
      var px=-t.z, pz=t.x, l=Math.hypot(px,pz)||1; px/=l; pz/=l;
      pos.push(p.x+px*RIVER_HALF_W, 0.6, p.z+pz*RIVER_HALF_W);
      pos.push(p.x-px*RIVER_HALF_W, 0.6, p.z-pz*RIVER_HALF_W);
      var v=i/N*6;
      uv.push(0, v); uv.push(1, v);
      if(i<N){ var a=i*2; idx.push(a,a+1,a+2, a+1,a+3,a+2); }
    }
    var geo=new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos,3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv,2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    this.waterTex=this._waterTexture();
    var mat=new THREE.MeshStandardMaterial({color:0x2b6076, map:this.waterTex, roughness:0.32, metalness:0.35,
      transparent:true, opacity:0.92, emissive:0x0a2230, emissiveIntensity:0.4});
    var mesh=new THREE.Mesh(geo, mat);
    mesh.renderOrder=-1;
    this.scene.add(mesh);
  },
  _waterTexture:function(){
    var c=document.createElement('canvas'); c.width=c.height=128;
    var ctx=c.getContext('2d');
    ctx.fillStyle='#204a5e'; ctx.fillRect(0,0,128,128);
    ctx.strokeStyle='rgba(180,220,235,0.35)'; ctx.lineWidth=1.4;
    for(var i=0;i<26;i++){
      var y=Math.random()*128;
      ctx.beginPath(); ctx.moveTo(0,y);
      ctx.bezierCurveTo(32,y+6, 64,y-6, 128,y+3); ctx.stroke();
    }
    var tex=new THREE.CanvasTexture(c);
    tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
    tex.repeat.set(1.5, 3);
    return tex;
  },
  _distToRiver:function(x,y){
    var pts=this.riverPts, best=1e9;
    for(var i=0;i<pts.length-1;i++){
      var ax=pts[i].x, ay=pts[i].y, bx=pts[i+1].x, by=pts[i+1].y;
      var dx=bx-ax, dy=by-ay, l2=dx*dx+dy*dy||1;
      var t=((x-ax)*dx+(y-ay)*dy)/l2; t=t<0?0:t>1?1:t;
      var cx=ax+dx*t, cy=ay+dy*t, d=Math.hypot(x-cx, y-cy);
      if(d<best)best=d;
    }
    return best;
  },
  _inAnyPark:function(x,y){
    for(var i=0;i<PARKS.length;i++){
      var p=PARKS[i], nx=(x-p.cx)/(p.rx+8), ny=(y-p.cy)/(p.ry+8);
      if(nx*nx+ny*ny<=1)return true;
    }
    return false;
  },
  _nearStation:function(x,y,r){
    for(var i=1;i<=199;i++){ if(POS[i] && Math.hypot(POS[i].x-x,POS[i].y-y)<r)return true; }
    return false;
  },
  _landmarkSpots:function(){ return [{x:360,y:455,r:48},{x:765,y:352,r:44}]; },

  /* 2. Buildings — instanced boxes clustered per district */
  _buildBuildings:function(){
    var self=this;
    var lms=this._landmarkSpots();
    var items=[]; // {x,y,w,d,h,rot,shade}
    DISTRICTS.forEach(function(d, di){
      var rng=self._rng(self._hash(di+7, 1337));
      var step=10;
      for(var gx=d.cx-d.rx; gx<=d.cx+d.rx; gx+=step){
        for(var gy=d.cy-d.ry; gy<=d.cy+d.ry; gy+=step){
          var nx=(gx-d.cx)/d.rx, ny=(gy-d.cy)/d.ry;
          if(nx*nx+ny*ny>1)continue;                 // inside district ellipse
          if(rng()>d.density*0.7)continue;           // density gaps -> implied streets
          var x=gx+(rng()-0.5)*step*0.7, y=gy+(rng()-0.5)*step*0.7;
          if(self._nearStation(x,y,14))continue;     // keep junctions clear/legible
          if(self._distToRiver(x,y)<RIVER_HALF_W+9)continue; // stop at the water
          if(self._inAnyPark(x,y))continue;          // no buildings in parks
          var skip=false;
          for(var k=0;k<lms.length;k++){ if(Math.hypot(x-lms[k].x,y-lms[k].y)<lms[k].r){skip=true;break;} }
          if(skip)continue;
          var w=6+rng()*9, dd=6+rng()*9;
          var h=(10+rng()*rng()*40)*d.tall + 4;
          var rot=(rng()-0.5)*0.5;
          var shadeF=0.26+rng()*0.15;              // dark stone, but lifted off black
          var hue=(rng()*3)|0;                     // 3 base tints (cool / warm / slate)
          var win=(rng()<0.28 && h>16);            // subset get a warm window light
          items.push({x:x,y:y,w:w,d:dd,h:h,rot:rot,shade:shadeF,hue:hue,win:win});
        }
      }
    });
    if(!items.length)return;
    var PAL=[[0.80,0.90,1.10],[1.12,0.96,0.78],[0.96,0.98,1.00]]; // cool, warm, slate
    var geo=new THREE.BoxGeometry(1,1,1); geo.translate(0,0.5,0); // base sits on y=0
    var mat=new THREE.MeshStandardMaterial({roughness:0.9, metalness:0.05});
    var inst=new THREE.InstancedMesh(geo, mat, items.length);
    var dummy=new THREE.Object3D(), col=new THREE.Color();
    var wins=[];
    for(var i=0;i<items.length;i++){
      var it=items[i];
      dummy.position.set(it.x, 0, it.y);
      dummy.rotation.set(0, it.rot, 0);
      dummy.scale.set(it.w, it.h, it.d);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
      var p=PAL[it.hue];
      col.setRGB(it.shade*p[0], it.shade*p[1], it.shade*p[2]);
      inst.setColorAt(i, col);
      if(it.win){
        // warm light on the +Z facade (rotated with the building)
        var ox=Math.sin(it.rot)*(it.d/2+0.4), oz=Math.cos(it.rot)*(it.d/2+0.4);
        wins.push({x:it.x+ox, y:it.h*(0.45+ (i%3)*0.12), z:it.y+oz, rot:it.rot,
                   w:Math.min(it.w*0.55,4.5), h:Math.min(it.h*0.35,9)});
      }
    }
    inst.instanceMatrix.needsUpdate=true;
    if(inst.instanceColor)inst.instanceColor.needsUpdate=true;
    inst.frustumCulled=false;
    this.scene.add(inst);
    this.buildingCount=items.length;
    this.buildingMesh=inst;

    // warm emissive "window lights" — one instanced mesh (1 draw call)
    if(wins.length){
      var wgeo=new THREE.BoxGeometry(1,1,0.5);
      var wmat=new THREE.MeshStandardMaterial({color:0xF2C24A, emissive:0xF2B23A, emissiveIntensity:0.9, roughness:0.6});
      var winst=new THREE.InstancedMesh(wgeo, wmat, wins.length);
      for(var j=0;j<wins.length;j++){ var wn=wins[j];
        dummy.position.set(wn.x, wn.y, wn.z);
        dummy.rotation.set(0, wn.rot, 0);
        dummy.scale.set(wn.w, wn.h, 1);
        dummy.updateMatrix();
        winst.setMatrixAt(j, dummy.matrix);
      }
      winst.instanceMatrix.needsUpdate=true;
      winst.frustumCulled=false;
      this.scene.add(winst);
      this.windowCount=wins.length;
    }
  },

  /* 4. Parks — instanced trees (trunk + foliage) */
  _buildParks:function(){
    var self=this, trunks=[], foliage=[];
    PARKS.forEach(function(p, pi){
      var rng=self._rng(self._hash(pi+3, 9001));
      var step=11;
      for(var gx=p.cx-p.rx; gx<=p.cx+p.rx; gx+=step){
        for(var gy=p.cy-p.ry; gy<=p.cy+p.ry; gy+=step){
          var nx=(gx-p.cx)/p.rx, ny=(gy-p.cy)/p.ry;
          if(nx*nx+ny*ny>0.92)continue;
          if(rng()>0.78)continue;
          var x=gx+(rng()-0.5)*step, y=gy+(rng()-0.5)*step;
          if(self._nearStation(x,y,11))continue;
          var s=0.8+rng()*0.9;
          var th=6+rng()*4, fh=11+rng()*7, fr=5+rng()*4;
          trunks.push({x:x,y:y,r:1.1*s,h:th});
          foliage.push({x:x,y:y,r:fr*s,h:fh*s,base:th*s,shade:0.7+rng()*0.5});
        }
      }
    });
    if(!foliage.length)return;
    var dummy=new THREE.Object3D();
    // trunks
    var tg=new THREE.CylinderGeometry(1,1,1,6); tg.translate(0,0.5,0);
    var tm=new THREE.MeshStandardMaterial({color:0x3a2c20, roughness:1});
    var tinst=new THREE.InstancedMesh(tg, tm, trunks.length);
    for(var i=0;i<trunks.length;i++){ var t=trunks[i];
      dummy.position.set(t.x,0,t.y); dummy.rotation.set(0,0,0); dummy.scale.set(t.r,t.h,t.r); dummy.updateMatrix();
      tinst.setMatrixAt(i, dummy.matrix);
    }
    tinst.instanceMatrix.needsUpdate=true; tinst.frustumCulled=false; this.scene.add(tinst);
    // foliage
    var fg=new THREE.ConeGeometry(1,1,7); fg.translate(0,0.5,0);
    var fm=new THREE.MeshStandardMaterial({roughness:0.95});
    var finst=new THREE.InstancedMesh(fg, fm, foliage.length);
    var col=new THREE.Color();
    for(var j=0;j<foliage.length;j++){ var f=foliage[j];
      dummy.position.set(f.x, f.base, f.y); dummy.rotation.set(0,0,0); dummy.scale.set(f.r, f.h, f.r); dummy.updateMatrix();
      finst.setMatrixAt(j, dummy.matrix);
      col.setRGB(0.16*f.shade, 0.34*f.shade, 0.19*f.shade);
      finst.setColorAt(j, col);
    }
    finst.instanceMatrix.needsUpdate=true; if(finst.instanceColor)finst.instanceColor.needsUpdate=true;
    finst.frustumCulled=false; this.scene.add(finst);
    this.treeCount=foliage.length;
  },

  /* 5. Landmarks — stylised low-poly silhouettes */
  _buildLandmarks:function(){
    var grp=new THREE.Group(); this.scene.add(grp);
    var stone=new THREE.MeshStandardMaterial({color:0x545862, roughness:0.85});
    var stoneWarm=new THREE.MeshStandardMaterial({color:0x6a6152, roughness:0.85});
    var glow=new THREE.MeshStandardMaterial({color:0xF2C230, emissive:0xF2C230, emissiveIntensity:0.7, roughness:0.5});
    function box(w,h,d,x,y,z,mat){ var m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat); m.position.set(x,y,z); grp.add(m); return m; }

    // --- Clock tower near Westminster ---
    (function(){
      var cx=360, cz=455;
      box(15,78,15, cx, 39, cz, stoneWarm);          // shaft
      box(18,10,18, cx, 80, cz, stone);              // belfry
      box(5.5,5.5,0.6, cx, 70, cz+7.7, glow);        // clock face (south)
      box(0.6,5.5,5.5, cx+7.7, 70, cz, glow);        // clock face (east)
      var spire=new THREE.Mesh(new THREE.ConeGeometry(11,20,4), stone);
      spire.position.set(cx,95,cz); spire.rotation.y=Math.PI/4; grp.add(spire);
    })();

    // --- Domed building near The City ---
    (function(){
      var cx=765, cz=352;
      var base=new THREE.Mesh(new THREE.CylinderGeometry(24,26,28,20), stone);
      base.position.set(cx,14,cz); grp.add(base);
      var drum=new THREE.Mesh(new THREE.CylinderGeometry(17,19,10,20), stoneWarm);
      drum.position.set(cx,32,cz); grp.add(drum);
      var dome=new THREE.Mesh(new THREE.SphereGeometry(17,20,12,0,Math.PI*2,0,Math.PI/2), stone);
      dome.position.set(cx,37,cz); grp.add(dome);
      box(2.2,9,2.2, cx,49,cz, glow);                // lantern
    })();

    // --- Bridge with twin towers across the river ---
    (function(self){
      var curve=self._riverCurve();
      var c=curve.getPoint(0.52), tan=curve.getTangent(0.52);
      var px=-tan.z, pz=tan.x, l=Math.hypot(px,pz)||1; px/=l; pz/=l; // across-river axis
      var ang=Math.atan2(tan.x, tan.z); // orient group along flow
      var g2=new THREE.Group(); g2.position.set(c.x, 0, c.z); g2.rotation.y=ang; grp.add(g2);
      function b2(w,h,d,x,y,z,mat){ var m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat); m.position.set(x,y,z); g2.add(m); return m; }
      var span=RIVER_HALF_W+10;
      b2(2*span+8, 2.4, 8, 0, 6, 0, stoneWarm);      // deck
      [-1,1].forEach(function(s){
        b2(7,34,10, s*span, 17, 0, stone);           // tower
        b2(9,4,12, s*span, 30, 0, stone);            // tower cap
      });
      // suspension cables (thin angled boxes)
      [-1,1].forEach(function(s){
        var cbl=new THREE.Mesh(new THREE.BoxGeometry(span,1.1,1.1), stoneWarm);
        cbl.position.set(s*span/2, 22, s*3); cbl.rotation.z=s*0.5; g2.add(cbl);
      });
    })(this);
  },

  /* 6. District & park labels — camera-facing canvas-texture sprites */
  _makeLabelSprite:function(text, fontPx, tint){
    var pad=14, font='700 '+fontPx+'px Georgia, "Times New Roman", serif';
    var mc=document.createElement('canvas'), mx=mc.getContext('2d');
    mx.font=font; var tw=Math.ceil(mx.measureText(text).width);
    var cw=tw+pad*2, ch=fontPx+pad*2;
    var c=document.createElement('canvas'); c.width=cw; c.height=ch;
    var ctx=c.getContext('2d');
    // soft dark backing for legibility over varied art
    ctx.fillStyle='rgba(12,16,24,0.42)';
    var r=10; ctx.beginPath();
    ctx.moveTo(r,0); ctx.arcTo(cw,0,cw,ch,r); ctx.arcTo(cw,ch,0,ch,r); ctx.arcTo(0,ch,0,0,r); ctx.arcTo(0,0,cw,0,r); ctx.fill();
    ctx.font=font; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.lineWidth=3; ctx.strokeStyle='rgba(6,9,14,0.85)'; ctx.strokeText(text, cw/2, ch/2+1);
    ctx.fillStyle=tint; ctx.fillText(text, cw/2, ch/2+1);
    var tex=new THREE.CanvasTexture(c);
    var mat=new THREE.SpriteMaterial({map:tex, transparent:true, depthWrite:false, depthTest:true, fog:false});
    var sp=new THREE.Sprite(mat);
    sp.userData.aspect=cw/ch;
    return sp;
  },
  _buildLabels:function(){
    var self=this;
    function place(text, cx, cy, worldH, tint, yLift){
      var sp=self._makeLabelSprite(text, 30, tint);
      sp.scale.set(worldH*sp.userData.aspect, worldH, 1);
      sp.position.set(cx, yLift, cy);
      self.scene.add(sp);
      self.labelSprites.push(sp);
    }
    DISTRICTS.forEach(function(d){ place(d.name, d.cx, d.cy, 26, '#e7ddc4', 52); });
    PARKS.forEach(function(p){ place(p.name, p.cx, p.cy, 20, '#bfe0b6', 34); });
  },

  /* Phase 3 — station number billboards (same sprite technique as the labels,
     just smaller, one per station, sized to stay legible at full-board zoom) */
  _makeNumberSprite:function(text){
    var fontPx=30, font='700 '+fontPx+'px Georgia, "Times New Roman", serif';
    var mc=document.createElement('canvas'), mx=mc.getContext('2d');
    mx.font=font; var tw=Math.ceil(mx.measureText(text).width);
    var pad=9, cw=Math.max(tw+pad*2, fontPx+pad*2), ch=fontPx+pad*2;
    var c=document.createElement('canvas'); c.width=cw; c.height=ch;
    var ctx=c.getContext('2d');
    // round "token" backing so numbers read over any building/ground colour
    ctx.fillStyle='rgba(10,13,20,0.66)';
    var r=ch/2; ctx.beginPath();
    ctx.moveTo(r,0); ctx.arcTo(cw,0,cw,ch,r); ctx.arcTo(cw,ch,0,ch,r); ctx.arcTo(0,ch,0,0,r); ctx.arcTo(0,0,cw,0,r); ctx.fill();
    ctx.font=font; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.lineWidth=3.5; ctx.strokeStyle='rgba(5,8,12,0.9)'; ctx.strokeText(text, cw/2, ch/2+1);
    ctx.fillStyle='#FBF3DC'; ctx.fillText(text, cw/2, ch/2+1);
    var tex=new THREE.CanvasTexture(c);
    var sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex, transparent:true, depthWrite:false, depthTest:true, fog:false}));
    sp.userData.aspect=cw/ch;
    return sp;
  },
  _buildStationNumbers:function(){
    this.numberSprites=[];
    var worldH=13; // legible at default full-board zoom; scales with the map
    for(var id=1;id<=199;id++){
      if(!POS[id])continue;
      var sp=this._makeNumberSprite(''+id);
      sp.scale.set(worldH*sp.userData.aspect, worldH, 1);
      sp.position.set(POS[id].x, 9, POS[id].y); // floating just above the marker
      this.scene.add(sp);
      this.numberSprites.push(sp);
    }
  },

  /* dusk sky gradient (+ a few static stars), used as scene.background */
  _skyTexture:function(){
    var c=document.createElement('canvas'); c.width=16; c.height=512;
    var ctx=c.getContext('2d');
    var g=ctx.createLinearGradient(0,0,0,512);
    g.addColorStop(0.00,'#0b1030');   // deep indigo zenith
    g.addColorStop(0.45,'#1a1c3a');
    g.addColorStop(0.72,'#33283f');   // dusk violet
    g.addColorStop(0.90,'#5a3b40');   // warm muted rose near horizon
    g.addColorStop(1.00,'#6a4a42');   // amber horizon
    ctx.fillStyle=g; ctx.fillRect(0,0,16,512);
    // faint stars in the upper sky
    ctx.fillStyle='rgba(255,255,255,0.8)';
    for(var i=0;i<26;i++){
      var sx=Math.random()*16, sy=Math.random()*180;
      ctx.globalAlpha=0.3+Math.random()*0.5;
      ctx.fillRect(sx, sy, Math.random()<0.3?1.4:0.9, Math.random()<0.3?1.4:0.9);
    }
    ctx.globalAlpha=1;
    var tex=new THREE.CanvasTexture(c);
    tex.magFilter=THREE.LinearFilter; tex.minFilter=THREE.LinearFilter;
    return tex;
  },

  /* Phase 3 — smoothly centre the camera on a world position (Locate button).
     Reuses the existing {tx,tz,dist} rig + applyCam(); does not alter the
     pan/zoom/#zfit handlers. */
  focusStation:function(x, y){
    if(!this.built)return;
    if(this._focusRaf)cancelAnimationFrame(this._focusRaf);
    var self=this;
    var tx0=this.cam.tx, tz0=this.cam.tz, d0=this.cam.dist;
    var txT=x, tzT=y;
    // ease in to a comfortable focus distance if currently zoomed far out,
    // but never zoom back out if the player is already closer.
    var dT=Math.min(d0, 760); if(dT<this.minDist)dT=this.minDist;
    var dur=380, t0=performance.now();
    function step(now){
      var k=(now-t0)/dur; if(k>1)k=1;
      var e=k<0.5?2*k*k:1-Math.pow(-2*k+2,2)/2; // easeInOutQuad
      self.cam.tx=tx0+(txT-tx0)*e;
      self.cam.tz=tz0+(tzT-tz0)*e;
      self.cam.dist=d0+(dT-d0)*e;
      self.applyCam();
      if(k<1)self._focusRaf=requestAnimationFrame(step);
      else self._focusRaf=null;
    }
    self._focusRaf=requestAnimationFrame(step);
  },

  /* water shimmer — independent rAF; the main render loop paints it */
  _startWaterAnim:function(){
    var self=this;
    function tick(){
      self._waterRaf=requestAnimationFrame(tick);
      if(self.waterTex){
        self.waterTex.offset.y=(self.waterTex.offset.y+0.0010)%1;
        self.waterTex.offset.x=(self.waterTex.offset.x+0.0004)%1;
      }
    }
    tick();
  }
};

/* ---- kept public functions (same names/signatures as before) ---- */
function setVB(){ MAP3D.frameRegion(VB.x, VB.y, VB.w, VB.h); }
function buildMap(){ if(UI.mapBuilt)return; UI.mapBuilt=true; MAP3D.build(); }
function animateVehicle(from,to,tk){ return MAP3D.animateVehicle(from,to,tk); }
function revealPing(st){ MAP3D.revealPing(st); }
function hiddenMoveFx(tk){ // Mr X moved in secret: sound of the ticket only
  if(typeof sfxForTicket==='function')sfxForTicket(tk, false);
  return new Promise(function(res){ setTimeout(res, 500); });
}
