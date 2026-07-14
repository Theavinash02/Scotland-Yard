(function(){
  function rand(min,max){return min+Math.random()*(max-min);}

  function makeCloud(){
    var el=document.createElement('div');
    el.className='amb-cloud';
    var w=rand(160,260);
    el.style.setProperty('--w',w.toFixed(0)+'px');
    el.style.setProperty('--h',(w*0.34).toFixed(0)+'px');
    el.style.setProperty('--top',rand(4,46).toFixed(1)+'%');
    el.style.setProperty('--y',rand(-6,6).toFixed(1)+'vh');
    el.style.setProperty('--bob',rand(-3,5).toFixed(1)+'vh');
    el.style.setProperty('--scale',rand(.82,1.16).toFixed(2));
    el.style.setProperty('--op',rand(.45,.72).toFixed(2));
    el.style.setProperty('--op2',rand(.16,.28).toFixed(2));
    var dur=rand(70,150);
    el.style.setProperty('--dur',dur.toFixed(1)+'s');
    el.style.setProperty('--delay',(-rand(0,dur)).toFixed(1)+'s');
    return el;
  }

  function makeBird(){
    var el=document.createElement('div');
    el.className='amb-bird';
    var dur=rand(24,42);
    el.style.setProperty('--dur',dur.toFixed(1)+'s');
    el.style.setProperty('--delay',(-rand(0,dur)).toFixed(1)+'s');
    el.style.setProperty('--y0',rand(8,30).toFixed(1)+'vh');
    el.style.setProperty('--y1',rand(4,22).toFixed(1)+'vh');
    el.style.setProperty('--y2',rand(9,28).toFixed(1)+'vh');
    el.style.setProperty('--arc',rand(2,6).toFixed(1)+'vh');
    el.style.setProperty('--tilt',rand(-10,12).toFixed(1)+'deg');
    el.style.setProperty('--scale',rand(.7,1.1).toFixed(2));
    el.innerHTML='<svg viewBox="0 0 64 28" width="42" height="18">'+
      '<path class="amb-tail" d="M13 17 L6 10 L11 21 Z"/>'+
      '<path class="amb-body" d="M16 17 C24 11 36 10 47 15 C41 19 30 22 18 20 Z"/>'+
      '<path class="amb-beak" d="M47 15 L57 13 L48 18 Z"/>'+
      '<path class="amb-wing" d="M22 16 Q16 5 6 10"/>'+
      '<path class="amb-wing" d="M27 15 Q37 4 51 9"/>'+
      '</svg>';
    return el;
  }

  function buildAmbience(){
    // The ambient sky sits over the map viewport only (#maparea), not the
    // docked game-state bar above it — inset:0 needs a positioned ancestor
    // that exactly matches the map's bounding box.
    var wrap=document.getElementById('maparea');
    var mapSvg=document.getElementById('map');
    if(!wrap||!mapSvg||document.getElementById('ambience'))return;

    var amb=document.createElement('div');
    amb.id='ambience';
    amb.setAttribute('aria-hidden','true');
    wrap.insertBefore(amb,mapSvg.nextSibling);

    var cloudCount=6+Math.floor(Math.random()*4); // 6-9
    for(var i=0;i<cloudCount;i++)amb.appendChild(makeCloud());

    var birdCount=3+Math.floor(Math.random()*3); // 3-5
    for(var j=0;j<birdCount;j++)amb.appendChild(makeBird());
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',buildAmbience);
  }else{
    buildAmbience();
  }
})();
