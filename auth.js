/* ============================================================
   Accounts (Firebase Auth + a tiny Firestore username lookup).

   Firebase password auth is keyed by email, so plain usernames are
   implemented as a mapping: usernames/{lowercaseUsername} ->
   {uid, displayUsername, email}. The email is synthetic
   (name@players.scotlandyard.local), never shown to the user and never
   mailed — it's purely an internal Firebase identifier. Firestore usage
   in this phase is strictly that one collection.

   This module owns the login/signup screen and the header user badge.
   It does not touch game logic, NET/PeerJS, or how rooms sync.
   Guest mode skips all of it and the game behaves exactly as before.
   ============================================================ */

var AUTH = {
  user: null,          // {uid, username} or null
  available: false,    // false when the SDK is missing or config is a placeholder
  _cbs: [],

  onChange: function(cb){
    this._cbs.push(cb);
    cb(this.user);
  },
  _fire: function(){
    var u = this.user;
    this._cbs.forEach(function(cb){ try{ cb(u); }catch(e){} });
  },

  _validUsername: function(name){
    return /^[A-Za-z0-9_]{3,20}$/.test(name || '');
  },
  _emailFor: function(lower){
    return lower + '@players.scotlandyard.local';
  },

  signUp: function(username, password, cb){
    cb = cb || function(){};
    if(!this.available){ cb('Accounts are not available right now.'); return; }
    username = (username || '').trim();
    if(!this._validUsername(username)){
      cb('Usernames are 3–20 characters: letters, numbers and _ only.'); return;
    }
    if(!password || password.length < 6){
      cb('Passwords need at least 6 characters.'); return;
    }
    var lower = username.toLowerCase();
    var email = this._emailFor(lower);
    var db = firebase.firestore();
    var docRef = db.collection('usernames').doc(lower);
    docRef.get().then(function(snap){
      if(snap.exists) throw {code:'sy/username-taken'};
      return firebase.auth().createUserWithEmailAndPassword(email, password);
    }).then(function(cred){
      return cred.user.updateProfile({displayName: username}).then(function(){ return cred; });
    }).then(function(cred){
      return docRef.set({uid: cred.user.uid, displayUsername: username, email: email})
        .catch(function(err){
          // Auth account exists but the lookup write failed — without the
          // mapping the account can't be logged into by username, so roll
          // the auth user back rather than leave it half-created.
          console.error('[auth] username mapping write failed after account creation; rolling back auth user', err);
          return cred.user.delete().catch(function(delErr){
            console.error('[auth] rollback delete also failed — orphaned auth account for', email, delErr);
          }).then(function(){ throw {code:'sy/registration-incomplete'}; });
        });
    }).then(function(){
      cb(null);
    }).catch(function(err){
      if(err && err.code === 'sy/username-taken') cb('That username is already taken.');
      else if(err && err.code === 'sy/registration-incomplete') cb('Sign-up could not complete — please try again.');
      else if(err && err.code === 'auth/email-already-in-use') cb('That username is already taken.');
      else if(err && err.code === 'auth/weak-password') cb('Passwords need at least 6 characters.');
      else{ console.error('[auth] signUp failed', err); cb('Could not sign up — check your connection and try again.'); }
    });
  },

  logIn: function(username, password, cb){
    cb = cb || function(){};
    var GENERIC = 'Incorrect username or password.';
    if(!this.available){ cb('Accounts are not available right now.'); return; }
    username = (username || '').trim();
    if(!this._validUsername(username) || !password){ cb(GENERIC); return; }
    var lower = username.toLowerCase();
    firebase.firestore().collection('usernames').doc(lower).get().then(function(snap){
      if(!snap.exists) throw {code:'sy/no-such-user'};
      return firebase.auth().signInWithEmailAndPassword(snap.data().email, password);
    }).then(function(){
      cb(null);
    }).catch(function(err){
      var c = err && err.code;
      if(c === 'sy/no-such-user' || c === 'auth/wrong-password' ||
         c === 'auth/user-not-found' || c === 'auth/invalid-credential' ||
         c === 'auth/invalid-login-credentials') cb(GENERIC);
      else{ console.error('[auth] logIn failed', err); cb('Could not log in — check your connection and try again.'); }
    });
  },

  signOut: function(){
    if(!this.available) return;
    try{ localStorage.removeItem('sy_guest'); }catch(e){}
    firebase.auth().signOut();
  }
};

/* ---------------- screen + header wiring ---------------- */
(function(){
  function $a(s){ return document.querySelector(s); }
  function isGuest(){ try{ return localStorage.getItem('sy_guest') === '1'; }catch(e){ return false; } }
  function setGuest(v){ try{ v ? localStorage.setItem('sy_guest','1') : localStorage.removeItem('sy_guest'); }catch(e){} }

  var configured = false;
  try{
    configured = typeof firebase !== 'undefined' &&
                 typeof firebaseConfig === 'object' &&
                 firebaseConfig.apiKey && firebaseConfig.apiKey !== 'YOUR_API_KEY';
  }catch(e){ configured = false; }

  var screen = $a('#screen-auth');
  if(!configured){
    // SDK missing or config not filled in yet: skip accounts entirely,
    // game behaves exactly as before (guest-style manual name entry).
    console.info('[auth] Firebase not configured — accounts disabled, playing as guest.');
    if(screen) screen.hidden = true;
    return;
  }

  firebase.initializeApp(firebaseConfig);
  AUTH.available = true;

  var mode = 'login'; // or 'signup'
  function setMode(m){
    mode = m;
    $a('#authLoginTab').classList.toggle('on', m === 'login');
    $a('#authSignupTab').classList.toggle('on', m === 'signup');
    $a('#authConfirmRow').hidden = (m === 'login');
    $a('#authSubmit').textContent = (m === 'login') ? 'Log in' : 'Create account';
    setError('');
  }
  function setError(msg){
    var el = $a('#authError');
    el.textContent = msg || '';
    el.hidden = !msg;
  }
  function setBusy(b){
    $a('#authSubmit').disabled = b;
    $a('#authGuest').disabled = b;
  }
  function showAuth(){ screen.hidden = false; $a('#screen-lobby').hidden = true; }
  function hideAuth(){ screen.hidden = true; if($a('#screen-game').hidden) $a('#screen-lobby').hidden = false; }

  function submit(){
    var name = $a('#authUser').value, pass = $a('#authPass').value;
    if(mode === 'signup' && pass !== $a('#authPass2').value){ setError('Passwords don’t match.'); return; }
    setBusy(true); setError('');
    var done = function(err){ setBusy(false); if(err) setError(err); };
    if(mode === 'signup') AUTH.signUp(name, pass, done);
    else AUTH.logIn(name, pass, done);
  }

  $a('#authLoginTab').onclick = function(){ setMode('login'); };
  $a('#authSignupTab').onclick = function(){ setMode('signup'); };
  $a('#authSubmit').onclick = submit;
  $a('#authPass').addEventListener('keydown', function(e){ if(e.key === 'Enter' && mode === 'login') submit(); });
  $a('#authPass2').addEventListener('keydown', function(e){ if(e.key === 'Enter') submit(); });
  $a('#authGuest').onclick = function(){ setGuest(true); hideAuth(); };
  $a('#signOutBtn').onclick = function(){ AUTH.signOut(); };

  // Until Firebase restores any persisted session (async), show the auth
  // screen only for non-guests; onAuthStateChanged below settles the truth.
  if(!isGuest()) showAuth();

  firebase.auth().onAuthStateChanged(function(fbUser){
    if(fbUser){
      var uname = fbUser.displayName || (fbUser.email || '').split('@')[0];
      AUTH.user = {uid: fbUser.uid, username: uname};
      setGuest(false);
      // pre-fill the existing display-name field (still editable)
      var nameIn = $a('#nameIn');
      if(nameIn && !nameIn.value.trim()) nameIn.value = uname.slice(0, 14);
      $a('#userBadge').textContent = uname;
      $a('#userBadge').hidden = false;
      $a('#signOutBtn').hidden = false;
      hideAuth();
    }else{
      AUTH.user = null;
      $a('#userBadge').hidden = true;
      $a('#signOutBtn').hidden = true;
      if(!isGuest()) showAuth();
    }
    AUTH._fire();
  });
})();
