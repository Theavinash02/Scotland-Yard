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

var MAP3D={
  built:false,
  scene:null, camera:null, renderer:null, raycaster:null,
  groundPlane:null,
  stationMeshes:[],
  edgeLines:[],
  piecesGroup:null, spotsGroup:null, hlGroup:null, fxGroup:null,
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

    // lights (functional only; mood is Phase 2)
    scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    var dir=new THREE.DirectionalLight(0xffffff, 0.55);
    dir.position.set(400, 900, 200);
    scene.add(dir);

    // ground plane spanning the station coordinate bounds
    var groundGeo=new THREE.PlaneGeometry(1000, MAP_H);
    var groundMat=new THREE.MeshStandardMaterial({color:0xE7DEC4, roughness:1, metalness:0});
    var ground=new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x=-Math.PI/2;
    ground.position.set(500, 0, MAP_H/2);
    scene.add(ground);

    this._buildEdges();
    this._buildStations();

    this.piecesGroup=new THREE.Group(); scene.add(this.piecesGroup);
    this.spotsGroup =new THREE.Group(); scene.add(this.spotsGroup);
    this.hlGroup    =new THREE.Group(); scene.add(this.hlGroup);
    this.fxGroup    =new THREE.Group(); scene.add(this.fxGroup);

    this.built=true;
    this.frameRegion(0,0,1000,MAP_H);
    this._bindControls(canvas);
    this._observeResize(canvas);
    this._startLoop();
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
      var geo=new THREE.CylinderGeometry(r, r, 5, 20);
      var mat=new THREE.MeshStandardMaterial({color:0xFDFBF2, roughness:0.75, metalness:0,
        emissive:(hasU?0x3a1414:hasB?0x143a1f:0x2a2418), emissiveIntensity:0.35});
      var m=new THREE.Mesh(geo, mat);
      m.position.set(POS[id].x, 2.5, POS[id].y);
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
