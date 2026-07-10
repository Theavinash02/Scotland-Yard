(function(){
  function rand(min,max){return min+Math.random()*(max-min);}

  function makeCloud(){
    var el=document.createElement('div');
    el.className='amb-cloud';
    var w=rand(160,260);
    el.style.setProperty('--w',w.toFixed(0)+'px');
    el.style.setProperty('--h',(w*0.34).toFixed(0)+'px');
    el.style.setProperty('--top',rand(4,46).toFixed(1)+'%');
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
    var dur=rand(38,64);
    el.style.setProperty('--dur',dur.toFixed(1)+'s');
    el.style.setProperty('--delay',(-rand(0,dur)).toFixed(1)+'s');
    el.style.setProperty('--y0',rand(8,30).toFixed(1)+'vh');
    el.style.setProperty('--y1',rand(4,22).toFixed(1)+'vh');
    el.style.setProperty('--scale',rand(.7,1.1).toFixed(2));
    el.innerHTML='<svg viewBox="0 0 40 16" width="28" height="12">'+
      '<path class="amb-wing" d="M20 8 Q10 0 0 6"/>'+
      '<path class="amb-wing" d="M20 8 Q30 0 40 6"/>'+
      '</svg>';
    return el;
  }

  function buildAmbience(){
    var wrap=document.getElementById('mapwrap');
    var mapSvg=document.getElementById('map');
    var banner=document.getElementById('banner');
    if(!wrap||!mapSvg||!banner||document.getElementById('ambience'))return;

    var amb=document.createElement('div');
    amb.id='ambience';
    amb.setAttribute('aria-hidden','true');
    wrap.insertBefore(amb,banner);

    var cloudCount=3+Math.floor(Math.random()*3); // 3-5
    for(var i=0;i<cloudCount;i++)amb.appendChild(makeCloud());

    var birdCount=1+Math.floor(Math.random()*2); // 1-2
    for(var j=0;j<birdCount;j++)amb.appendChild(makeBird());
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',buildAmbience);
  }else{
    buildAmbience();
  }
})();
