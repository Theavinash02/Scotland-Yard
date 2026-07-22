# STORE-CHECKLIST.md — publishing SHADOW LINE

Everything the owner must do **manually** to ship SHADOW LINE as a monetized
web + mobile product. The code is ready and dormant: all ad/IAP/auth layers do
nothing until you fill in the config files below. Nothing here needs a code
change unless noted.

Legend: 🟢 = code already done · 🔧 = your manual step · 💳 = costs money.

---

## 1. Accounts to create (🔧💳)

| Service | Why | Notes |
|---|---|---|
| **Google Play Console** | Android store | one-time $25 |
| **Apple Developer Program** | iOS store | $99/year |
| **Firebase project** | Google login + cross-device sync of history & the no-ads entitlement | free tier is plenty |
| **Google AdMob** | ads in the native apps | links to your AdMob payments profile |
| **Google AdSense** | ads on the web/PWA build | site review can take days — start early |
| **Play Billing** (in Play Console) + **StoreKit** (App Store Connect) | the "remove ads" purchase | create the product (see §4) |

---

## 2. Firebase — auth + sync (🟢 code / 🔧 config)

1. Firebase console → create project → add a **Web app**.
2. **Authentication → Sign-in method → enable Google.**
3. **Firestore → create database** (production mode) and add this rule so each
   user can only touch their own doc:
   ```
   match /users/{uid} { allow read, write: if request.auth.uid == uid; }
   ```
4. **Authentication → Settings → Authorized domains:** add every domain you
   serve from (e.g. `yourname.github.io`, your custom domain, and for native
   builds the Capacitor scheme host).
5. Paste the web config into **`firebase-config.js`** (replace the `REPLACE_ME`
   values). The cloud layer stays off until you do — see the in-file checklist.

## 3. Ads (🟢 code / 🔧 config)

The ad layer (`ads.js`) shows an interstitial **only** at a natural break —
returning to the lobby after a finished game — frequency-capped, never
mid-turn, and always suppressed by the no-ads entitlement.

1. **Web (AdSense):** create an ad unit; put your publisher id
   (`ca-pub-…`) in `MONETIZATION.web.client` and the slot id in
   `MONETIZATION.web.slot` in **`monetization-config.js`**.
2. **Native (AdMob):** create an app + an **interstitial** unit per platform;
   set `MONETIZATION.admob.appId` / `interstitialId`. (The file currently holds
   Google's public **test** ids, which show test ads only.)
3. Flip `MONETIZATION.enabled = true`. Until then, zero ad code runs.
4. Native builds also need the AdMob Capacitor plugin installed and the app id
   in the native manifests (see §5).

## 4. Remove-ads in-app purchase (🟢 code / 🔧 config)

1. **Play Console → Monetize → Products → In-app products:** create a
   **non-consumable** product with id **`remove_ads`**.
2. **App Store Connect → your app → In-App Purchases:** create a
   **Non-Consumable** with the same product id.
3. Keep `MONETIZATION.iap.productId = "remove_ads"` (and set `priceLabel` for
   display only — the stores are the source of truth for the real price).
4. On a successful purchase the app writes `entitlements.noAds` to the signed-in
   user's Firestore doc, so "no ads" follows the Google account across web and
   mobile. 🟢 done in code.
5. Native purchase needs a billing Capacitor plugin exposing
   `Purchases.purchaseProduct({productIdentifier})` (see §5); the web build
   shows a dialog directing the user to buy in the app and sign in to sync.

## 5. Native apps with Capacitor (🔧 — Phase 6, not yet in the repo)

The web app is a self-contained static site (no build step), so wrapping it is
straightforward. This is the one remaining **code** milestone (tracked as
Phase 6 in `PLAN.md`); the steps will be:

1. `npm i @capacitor/core @capacitor/cli && npx cap init "Shadow Line" com.YOURNAME.shadowline`
2. Set `webDir` to the repo root (or a `dist/` if a bundler is added).
3. `npx cap add android && npx cap add ios`.
4. Add plugins: **@capacitor-community/admob** (ads) and a billing plugin
   (e.g. **@capgo/capacitor-purchases** or RevenueCat) exposing the
   `Purchases.purchaseProduct` shape `ads.js` already calls.
5. Put the AdMob app ids in `android/app/src/main/AndroidManifest.xml` and
   iOS `Info.plist` (`GADApplicationIdentifier`).
6. App icons/splash: run the icon generator (`tools/icons/make-icons.js`) output
   through `@capacitor/assets`.
7. `npx cap sync`, then build/sign in Android Studio / Xcode.

## 6. Signing & store listings (🔧💳)

- **Android:** create an upload keystore; enable Play App Signing; upload an
  `.aab`.
- **iOS:** distribution certificate + provisioning profile; upload via Xcode /
  Transporter.
- **Listings (both):** title *Shadow Line*, short + full description, feature
  graphic, and screenshots — the in-game UI is screenshot-ready; capture from a
  device or the Playwright helper. **Package id:** `com.YOURNAME.shadowline`
  (must match everywhere and can never change after publish).
- **Ratings/questionnaires:** content rating (the game is non-violent strategy),
  data-safety / privacy nutrition labels (declare Google sign-in + ad
  identifiers), and a hosted **privacy policy URL** (see §7).

## 7. Privacy policy (🔧)

A stub lives at **`privacy-policy.html`** — fill in your contact details and
host it (GitHub Pages serves it at `/privacy-policy.html`). It must disclose:
Google sign-in (email/profile), locally-stored game data synced to Firebase,
and advertising identifiers via AdMob/AdSense. Link this URL in both store
listings and the app.

## 8. Pre-launch verification (🔧)

- [ ] `firebase-config.js` filled; Google sign-in works on web and device.
- [ ] `monetization-config.js` filled + `enabled:true`; a real ad renders at a
      lobby break; "Remove ads" purchase completes and ads stop.
- [ ] Buying on one device removes ads on another after signing in (entitlement
      sync).
- [ ] `npm run test:all` green; both maps (`?map=newyork`, `?map=graywater`) load.
- [ ] Privacy policy hosted and linked; store data-safety forms match reality.
