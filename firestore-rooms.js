/* ============================================================
   firestore-rooms.js — Firestore-backed multiplayer LOBBY.

   Scope: this module owns pre-game room state only — creating a room,
   claiming/releasing seats, and live seat-list sync via onSnapshot.
   It has no idea what a "move" or a "game" is; once a game starts,
   ui.js hands off to the existing PeerJS host-authoritative sync
   (broadcastRoom/sendHost/hostHandleData's 'move' branch/adoptGame)
   and this module's subscription is torn down.

   Room document shape (rooms/{code}), mirrors the old NET.room object
   so handoff into game-start stays a near drop-in:
     {
       code, v (version counter, incremented on every write),
       hostId, hostUid, createdAt (server timestamp),
       phase: 'lobby' | 'playing',
       seats: [ {kind:'open'|'human'|'bot'|'empty', pid, uid, name, diff}, ... ]
     }

   Identity: signed-in players use AUTH.user.uid/username. Guests get a
   random id generated once and persisted in localStorage, so a guest
   who reloads mid-session is recognized as the same seat-holder rather
   than looking like a brand-new player.
   ============================================================ */

var ROOMS = (function(){
  var GUEST_KEY = 'sy_guest_pid';
  var CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ';
  var _unsub = null;

  function ready(){
    try{ return typeof firebase !== 'undefined' && typeof AUTH !== 'undefined' && AUTH.available; }
    catch(e){ return false; }
  }
  function db(){ return firebase.firestore(); }

  function guestId(){
    var gid;
    try{ gid = localStorage.getItem(GUEST_KEY); }catch(e){ gid = null; }
    if(!gid){
      gid = 'guest-' + Math.random().toString(36).slice(2,10) + Date.now().toString(36);
      try{ localStorage.setItem(GUEST_KEY, gid); }catch(e){}
    }
    return gid;
  }

  function randCode(){
    var s = '';
    for(var i=0;i<5;i++) s += CODE_CHARS[Math.floor(Math.random()*CODE_CHARS.length)];
    return s;
  }

  /* create(hostSeatInfo, cb): hostSeatInfo = {hostId, seats, code}. If
     hostSeatInfo.code is given (e.g. it must match a PeerJS id already
     reserved by the caller) that exact code is used; otherwise a fresh one
     is picked. Writes the initial lobby document, returns the code via cb. */
  function create(hostSeatInfo, cb){
    cb = cb || function(){};
    if(!ready()){ cb({message:'Online rooms need Firebase configured.'}); return; }
    tryCreate(hostSeatInfo, 0, cb);
  }
  function tryCreate(hostSeatInfo, attempt, cb){
    var code = hostSeatInfo.code || randCode();
    var ref = db().collection('rooms').doc(code);
    ref.get().then(function(snap){
      if(snap.exists){
        if(!hostSeatInfo.code && attempt < 6) return tryCreate(hostSeatInfo, attempt+1, cb);
        throw {message:'Could not allocate a room code — try again.'};
      }
      return ref.set({
        code: code,
        v: 1,
        hostId: hostSeatInfo.hostId,
        hostUid: (typeof AUTH !== 'undefined' && AUTH.user) ? AUTH.user.uid : null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        phase: 'lobby',
        seats: hostSeatInfo.seats
      }).then(function(){ cb(null, code); });
    }).catch(function(err){ cb(err); });
  }

  /* claimSeat(code, seatIndex, playerInfo, cb): transaction — verifies the
     target seat is still 'open' before claiming it, so two players racing
     for the same seat can't both win. Also frees any other seat the same
     player already held (matches old freeSeatsOf semantics). */
  function claimSeat(code, seatIndex, playerInfo, cb){
    cb = cb || function(){};
    if(!ready()){ cb({message:'Online rooms need Firebase configured.'}); return; }
    var ref = db().collection('rooms').doc(code);
    db().runTransaction(function(tx){
      return tx.get(ref).then(function(snap){
        if(!snap.exists) throw {code:'sy/no-room', message:'That room no longer exists.'};
        var room = snap.data();
        var seats = room.seats.map(function(s){ return Object.assign({}, s); });
        if(seatIndex < 0 || seatIndex >= seats.length) throw {message:'Invalid seat.'};
        if(seats[seatIndex].kind !== 'open') throw {code:'sy/seat-taken', message:'That seat was just taken.'};
        for(var i=0;i<seats.length;i++){
          if(seats[i].kind === 'human' && seats[i].pid === playerInfo.pid) seats[i] = {kind:'open'};
        }
        seats[seatIndex] = {
          kind: 'human',
          pid: playerInfo.pid,
          uid: playerInfo.uid || null,
          name: playerInfo.name || 'Player'
        };
        tx.update(ref, {seats: seats, v: firebase.firestore.FieldValue.increment(1)});
      });
    }).then(function(){ cb(null); }).catch(function(err){ cb(err); });
  }

  /* releaseSeat(code, pid, cb): transaction — opens any seat(s) held by pid. */
  function releaseSeat(code, pid, cb){
    cb = cb || function(){};
    if(!ready()){ cb(null); return; } // nothing to release if Firestore isn't available
    var ref = db().collection('rooms').doc(code);
    db().runTransaction(function(tx){
      return tx.get(ref).then(function(snap){
        if(!snap.exists) return;
        var room = snap.data();
        var changed = false;
        var seats = room.seats.map(function(s){
          if(s.kind === 'human' && s.pid === pid){ changed = true; return {kind:'open'}; }
          return s;
        });
        if(changed) tx.update(ref, {seats: seats, v: firebase.firestore.FieldValue.increment(1)});
      });
    }).then(function(){ cb(null); }).catch(function(err){ cb(err); });
  }

  /* updateSeatConfig(code, seatIndex, seatConfig, cb): host-only — changes
     an unclaimed seat between open/bot-easy/bot-hard/empty. */
  function updateSeatConfig(code, seatIndex, seatConfig, cb){
    cb = cb || function(){};
    if(!ready()){ cb({message:'Online rooms need Firebase configured.'}); return; }
    var ref = db().collection('rooms').doc(code);
    db().runTransaction(function(tx){
      return tx.get(ref).then(function(snap){
        if(!snap.exists) throw {message:'That room no longer exists.'};
        var room = snap.data();
        var seats = room.seats.map(function(s){ return Object.assign({}, s); });
        if(seatIndex < 0 || seatIndex >= seats.length) throw {message:'Invalid seat.'};
        if(seats[seatIndex].kind === 'human') return; // don't clobber a claimed seat
        seats[seatIndex] = seatConfig;
        tx.update(ref, {seats: seats, v: firebase.firestore.FieldValue.increment(1)});
      });
    }).then(function(){ cb(null); }).catch(function(err){ cb(err); });
  }

  /* setPhase(code, phase, cb): marks the room doc as no longer being in the
     lobby once the game starts. Best-effort — the actual game handoff to
     other clients travels over the existing PeerJS broadcastRoom(), not
     this write; this is just bookkeeping for the Firestore document. */
  function setPhase(code, phase, cb){
    cb = cb || function(){};
    if(!ready()){ cb(null); return; }
    db().collection('rooms').doc(code).update({
      phase: phase,
      v: firebase.firestore.FieldValue.increment(1)
    }).then(function(){ cb(null); }).catch(function(err){ cb(err); });
  }

  /* subscribe(code, onUpdate): live seat-list sync, replacing the old
     PeerJS broadcastRoom()/adoptRoom() lobby path. Calls onUpdate(roomData)
     on every change (initial snapshot included). */
  function subscribe(code, onUpdate){
    unsubscribe();
    if(!ready()) return;
    _unsub = db().collection('rooms').doc(code).onSnapshot(function(snap){
      if(snap.exists) onUpdate(snap.data());
    }, function(err){ console.error('[rooms] subscribe error', err); });
  }
  function unsubscribe(){
    if(_unsub){ try{ _unsub(); }catch(e){} _unsub = null; }
  }

  return {
    create: create,
    claimSeat: claimSeat,
    releaseSeat: releaseSeat,
    updateSeatConfig: updateSeatConfig,
    setPhase: setPhase,
    subscribe: subscribe,
    unsubscribe: unsubscribe,
    guestId: guestId,
    ready: ready
  };
})();
