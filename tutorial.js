/* ==========================================================================
   Interactive guided tutorials (driver.js)
   --------------------------------------------------------------------------
   Implements issue #23: a "Play Tutorial" flow using driver.js
   (https://driverjs.com, pinned to 1.7.0 via CDN in index.html) — a
   lightweight page-tour / spotlight library that draws popovers around
   real, live DOM elements rather than a separate mocked-up walkthrough.

   Approach: each tour seats the learner into a genuine practice game
   (newGame() via startLocalGame(), same code path as a real local match)
   against hard-difficulty bots, then points driver.js at the actual
   elements a new player needs to understand:
     - #logGrid            Mr. X's travel log and reveal rounds
     - #playersCard        ticket counts / black tickets / double moves
     - .stg[data-id=...]   the learner's own piece on the live SVG map
     - #turnCard / #ctrlCard / #dblBtn  turn order and special controls

   Bots are paused for the duration of the tour (UI.tutorialActive, checked
   in ui.js's maybeBot()) so the highlighted board stays put while the
   learner reads each step; ending the tour (Done, the X button, or Escape)
   always returns cleanly to the lobby via leaveToLobby().

   One deliberate simplification: the transport "ticket chooser" popup
   (#chooser) only exists transiently after a real ambiguous click, so
   rather than synthesizing a fake click to force it open mid-tour, the
   tour explains it in a popover anchored to the map/controls instead of
   highlighting the transient element itself. Everything else highlighted
   is genuine, live UI.
   ========================================================================== */
var TUT = {active: false, driver: null};

function tutorialAvailable(){
  return typeof window !== 'undefined' && window.driver && window.driver.js && typeof window.driver.js.driver === 'function';
}

function tutorialChooser(){
  sfx('click');
  showModal('<h2>Play Tutorial</h2>'+
    '<p class="muted tiny" style="margin-bottom:12px">Pick a seat — each tour drops you into a live practice game against hard-difficulty bots and highlights exactly what to click.</p>'+
    '<button class="btn big" id="tutDet">🔎 Detective Tutorial</button>'+
    '<button class="btn ghost big" id="tutMrx" style="margin-top:8px">🕵️ Mr. X Tutorial</button>'+
    '<button class="btn ghost" id="tutCancel" style="margin-top:8px">Cancel</button>');
  $('#tutDet').onclick=function(){hideModal();startTutorial('det');};
  $('#tutMrx').onclick=function(){hideModal();startTutorial('mrx');};
  $('#tutCancel').onclick=hideModal;
}

function startPracticeGame(role){
  // Same seat/game plumbing as a real local match (newGame via startLocalGame)
  // — the tour highlights a live board, not a scripted mockup.
  var seats = role==='mrx'
    ? [{kind:'human',name:'You'},{kind:'bot',diff:'hard'},{kind:'bot',diff:'hard'},{kind:'bot',diff:'hard'}]
    : [{kind:'bot',diff:'hard'},{kind:'human',name:'You'},{kind:'bot',diff:'hard'},{kind:'bot',diff:'hard'}];
  UI.tutorialActive = true;
  startLocalGame(seats);
}

function endTutorial(){
  UI.tutorialActive = false;
  TUT.active = false;
  if (TUT.driver){ try{ TUT.driver.destroy(); }catch(e){} TUT.driver=null; }
  if (G) leaveToLobby();
}

function detectiveSteps(){
  var myStation = G.dets[0].st; // Detective 1 is always the learner's seat here
  return [
    {popover:{title:'Welcome, Detective', description:'You\'re seated as Detective 1 in a live practice game against hard-difficulty bots. This tour highlights the real board as you go — nothing here is a mockup.'}},
    {element:'#turnCard', popover:{title:'Whose move is it', description:'This banner tracks the round out of 24 and whose turn it is. Mr. X always moves first each round, then detectives move in seat order.'}},
    {element:'#logGrid', popover:{title:'Mr. X\'s travel log', description:'Every Mr. X move is logged here by ticket type, but his station stays hidden — except on the gold reveal rounds 3, 8, 13, 18 and 24, when he must surface and show his station.'}},
    {element:'#playersCard', popover:{title:'Players & tickets', description:'Each detective starts with 10 taxi, 8 bus and 4 underground tickets (shown here per player). Moving spends one matching ticket — once a type runs out for you, it\'s gone for the rest of the game.'}},
    {element:'.stg[data-id="'+myStation+'"]', popover:{title:'Your piece', description:'This is your detective, currently at station '+myStation+'. On your turn, every station you can reach glows on the map — tap one to move there.'}},
    {element:'#mapwrap', popover:{title:'Picking a ticket', description:'If a glowing station is reachable by more than one transport, a small chooser pops up beside it so you can pick taxi, bus or underground before you move.'}},
    {element:'#ctrlCard', popover:{title:'Show possible Mr. X spots', description:'"Show possible Mr. X spots" highlights every station still consistent with his revealed moves — a big help right after a reveal round.'}},
    {element:'#leaveBtn', popover:{title:'You\'re ready', description:'That\'s the loop: read the log, spend the right ticket, and corner Mr. X before round 24. Click here (or Done below) to head back to the lobby and start a real game.'}}
  ];
}

function mrxSteps(){
  var myStation = G.mrx.st;
  return [
    {popover:{title:'Welcome, Mr. X', description:'You\'re seated as Mr. X in a live practice game — four hard-difficulty detective bots are hunting you. This tour highlights the real board as you go.'}},
    {element:'#turnCard', popover:{title:'You move first, in secret', description:'Each round you move before the detectives, and only the ticket type you played is shown to them — never your station, unless it\'s a reveal round.'}},
    {element:'#logGrid', popover:{title:'Reveal rounds', description:'Your route is logged by ticket type only. On rounds 3, 8, 13, 18 and 24 (marked in gold) you must surface and reveal your actual station.'}},
    {element:'#playersCard', popover:{title:'Black tickets & double moves', description:'The ● count is your black tickets — they let you ride any transport, including the Thames ferry, without revealing which one you used. The 2× count is double-move cards: play one to move twice in a single round.'}},
    {element:'.stg[data-id="'+myStation+'"]', popover:{title:'Your piece', description:'This is you, currently hidden at station '+myStation+'. Detectives only ever see this position on a reveal round.'}},
    {element:'#dblBtn', popover:{title:'Double move', description:'Arm a double move here before picking your first station this round — you\'ll then choose two hops back-to-back, both logged as a single round, which is great for shaking off a close detective.'}},
    {element:'#leaveBtn', popover:{title:'You\'re ready', description:'Stay hidden, spend black tickets wisely, and survive to round 24 to win. Click here (or Done below) to head back to the lobby and start a real game.'}}
  ];
}

function startTutorial(role){
  if (!tutorialAvailable()){
    toast('Tutorial library failed to load — check your connection and try again.');
    return;
  }
  hideModal();
  TUT.active = true;
  startPracticeGame(role);
  // Give enterGame()'s synchronous render + SVG map build a beat to settle
  // before driver.js measures element positions.
  setTimeout(function(){
    if (!G){ endTutorial(); return; } // user bailed out before the timer fired
    var steps = role==='mrx' ? mrxSteps() : detectiveSteps();
    var d = window.driver.js.driver({
      showProgress: true,
      allowClose: true,
      stagePadding: 6,
      overlayOpacity: 0.6,
      smoothScroll: true,
      // The live board underneath the tour is meant to be looked at, not
      // touched: on mobile a normal instinct to pan/pinch-zoom the map
      // lands outside whatever tiny element is highlighted (e.g. a single
      // piece), and driver.js's default overlayClickBehavior ('close')
      // would tear down the whole tour on that "outside click". Swallow it
      // instead — allowClose stays true so the popover's own × button and
      // Escape still exit intentionally.
      overlayClickBehavior: function(){},
      // Keep the live board inert while a step highlights it (e.g. the
      // #mapwrap step below) so an accidental tap can't trigger a real
      // move/ticket-chooser mid-tour.
      disableActiveInteraction: true,
      steps: steps,
      onDestroyed: function(){ endTutorial(); }
    });
    TUT.driver = d;
    d.drive();
  }, 80);
}

if (typeof document !== 'undefined'){
  var tb = document.getElementById('tutorialBtn');
  if (tb) tb.onclick = tutorialChooser;
}
