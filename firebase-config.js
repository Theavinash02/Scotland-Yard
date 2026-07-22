/* ---------------- Firebase project config ----------------
 * OWNER TODO: paste your real Firebase web-app config here (Firebase console
 * -> Project settings -> Your apps -> Web app -> SDK setup and configuration).
 *
 * While `apiKey` still starts with "REPLACE_" the entire cloud layer stays
 * dormant: no SDK is fetched, no UI is shown, and the game runs exactly as
 * the offline/local build — so this file is safe to ship as-is.
 *
 * Setup checklist (see also STORE-CHECKLIST.md, Phase 6):
 *   1. Create a Firebase project; add a Web app.
 *   2. Authentication -> Sign-in method -> enable Google.
 *   3. Firestore -> create database (production mode) and add the rule:
 *        match /users/{uid} { allow read, write: if request.auth.uid == uid; }
 *   4. Authentication -> Settings -> Authorized domains: add the domain(s)
 *      this game is served from (e.g. <you>.github.io).
 *   5. Paste the config below.
 */
var FIREBASE_CONFIG = {
  apiKey: "REPLACE_ME",
  authDomain: "REPLACE_ME.firebaseapp.com",
  projectId: "REPLACE_ME",
  storageBucket: "REPLACE_ME.appspot.com",
  messagingSenderId: "REPLACE_ME",
  appId: "REPLACE_ME"
};
/* Pinned compat SDK version served from the gstatic CDN (no build step). */
var FIREBASE_SDK_VERSION = '10.14.1';
