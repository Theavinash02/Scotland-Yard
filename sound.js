/* ================= sound =================
   Runtime Web-Audio sound effects — no audio files. Split out of ui.js; all
   cross-file references (UI.soundOn, masterVol from enhancements.js) resolve at
   call time, so this only needs to load before the game runs, not in any
   particular order relative to those globals. */
/* ---------------- sound ---------------- */
var ACTX=null;
function actx(){
  if(!UI.soundOn)return null;
  try{
    if(!ACTX)ACTX=new (window.AudioContext||window.webkitAudioContext)();
    if(ACTX.state==='suspended')ACTX.resume();
    return ACTX;
  }catch(e){return null;}
}
function noiseBuf(ctx,sec){
  var b=ctx.createBuffer(1,Math.floor(ctx.sampleRate*sec),ctx.sampleRate),d=b.getChannelData(0);
  for(var i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  return b;
}
function nsrc(ctx,sec){var s=ctx.createBufferSource();s.buffer=noiseBuf(ctx,sec);return s;}
function tone(ctx,type,f0,f1,t0,dur,peak,dest){
  var o=ctx.createOscillator(),g=ctx.createGain();
  o.type=type;o.frequency.setValueAtTime(f0,t0);
  if(f1&&f1!==f0)o.frequency.exponentialRampToValueAtTime(f1,t0+dur);
  g.gain.setValueAtTime(0.0001,t0);
  g.gain.exponentialRampToValueAtTime(peak,t0+0.02);
  g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
  o.connect(g);g.connect(dest);o.start(t0);o.stop(t0+dur+0.05);
}
function sfx(kind){
  var ctx=actx();if(!ctx)return;
  var t=ctx.currentTime,m=ctx.createGain();m.gain.value=0.5*masterVol();m.connect(ctx.destination);
  if(kind==='click'){tone(ctx,'sine',900,700,t,0.06,0.25,m);}
  else if(kind==='deny'){tone(ctx,'square',180,140,t,0.12,0.18,m);}
  else if(kind==='taxi'){
    var n=nsrc(ctx,0.6),f=ctx.createBiquadFilter(),g=ctx.createGain();
    f.type='bandpass';f.frequency.value=260;f.Q.value=1.2;
    g.gain.setValueAtTime(0.28,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.6);
    n.connect(f);f.connect(g);g.connect(m);n.start(t);
    tone(ctx,'square',540,540,t+0.10,0.09,0.20,m);
    tone(ctx,'square',640,640,t+0.24,0.11,0.20,m);
  }else if(kind==='bus'){
    tone(ctx,'sawtooth',68,88,t,0.85,0.30,m);
    tone(ctx,'sawtooth',102,120,t,0.85,0.14,m);
    var n=nsrc(ctx,0.25),f=ctx.createBiquadFilter(),g=ctx.createGain();
    f.type='highpass';f.frequency.value=3200;
    g.gain.setValueAtTime(0.0001,t+0.62);g.gain.exponentialRampToValueAtTime(0.22,t+0.68);
    g.gain.exponentialRampToValueAtTime(0.001,t+0.9);
    n.connect(f);f.connect(g);g.connect(m);n.start(t+0.6);
  }else if(kind==='metro'){
    var n=nsrc(ctx,1.1),f=ctx.createBiquadFilter(),g=ctx.createGain();
    f.type='lowpass';f.frequency.setValueAtTime(110,t);f.frequency.exponentialRampToValueAtTime(220,t+0.5);
    f.frequency.exponentialRampToValueAtTime(90,t+1.05);
    g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(0.5,t+0.25);
    g.gain.exponentialRampToValueAtTime(0.001,t+1.05);
    n.connect(f);f.connect(g);g.connect(m);n.start(t);
    tone(ctx,'sine',820,380,t+0.1,0.7,0.05,m);
  }else if(kind==='black'){
    var n=nsrc(ctx,0.9),f=ctx.createBiquadFilter(),g=ctx.createGain();
    f.type='lowpass';f.frequency.setValueAtTime(400,t);f.frequency.exponentialRampToValueAtTime(2400,t+0.7);
    g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(0.30,t+0.55);
    g.gain.exponentialRampToValueAtTime(0.001,t+0.9);
    n.connect(f);f.connect(g);g.connect(m);n.start(t);
    tone(ctx,'triangle',196,185,t,0.7,0.12,m);
  }else if(kind==='boat'){
    tone(ctx,'square',98,98,t,0.75,0.22,m);
    tone(ctx,'square',147,147,t,0.75,0.10,m);
  }else if(kind==='reveal'){
    tone(ctx,'sawtooth',220,220,t,0.55,0.14,m);
    tone(ctx,'sawtooth',262,262,t,0.55,0.12,m);
    tone(ctx,'sawtooth',311,311,t+0.05,0.55,0.12,m);
  }else if(kind==='win'){
    [523,659,784,1047].forEach(function(f,i){tone(ctx,'triangle',f,f,t+i*0.14,0.3,0.22,m);});
  }else if(kind==='lose'){
    [392,330,262,196].forEach(function(f,i){tone(ctx,'triangle',f,f,t+i*0.16,0.34,0.22,m);});
  }
}
function sfxForTicket(tk,boat){
  if(boat)return sfx('boat');
  sfx(tk==='t'?'taxi':tk==='b'?'bus':tk==='u'?'metro':'black');
}
