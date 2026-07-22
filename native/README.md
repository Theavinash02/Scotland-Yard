# Native builds (Capacitor) — Android & iOS

This wraps the exact same web app into store-shippable Android and iOS apps.
The code side is already in the repo (`capacitor.config.json`,
`tools/build-www.js`, `native-init.js`, and the `cap:*` npm scripts); this
guide is the manual, one-time setup. See `STORE-CHECKLIST.md` for the
store-account and listing steps.

> The native plugin packages are **not** in `package.json` on purpose — CI runs
> `npm install` and shouldn't pull native tooling. You install them here.

## Prerequisites

- Node 18+.
- **Android:** Android Studio + a JDK.
- **iOS:** a Mac with Xcode (Apple's toolchain is Mac-only).

## 1. Install Capacitor + the plugins the app already calls

```bash
npm install @capacitor/core @capacitor/cli \
            @capacitor/android @capacitor/ios \
            @capacitor/splash-screen @capacitor/status-bar \
            @capacitor-community/admob
# a billing plugin exposing Purchases.purchaseProduct({ productIdentifier })
# (ads.js calls exactly this shape) — e.g.:
npm install @capgo/capacitor-purchases
```

`native-init.js` and `ads.js` call these defensively, so any plugin you skip
just no-ops rather than crashing.

## 2. Set your real app id

Edit `capacitor.config.json` → `"appId"`: replace `com.example.shadowline`
with your reverse-domain id (e.g. `com.yourstudio.shadowline`). **This id is
permanent once published** and must match the Play/App Store listings.

## 3. Add the native platforms

```bash
npm run build:www          # populates www/ (the lean bundle Capacitor ships)
npx cap add android
npx cap add ios            # Mac only
```

This creates `android/` and `ios/` project folders (commit them, or keep them
generated — your choice; they're not in this repo yet).

## 4. Wire the native config

- **AdMob app id** (distinct from the ad-unit ids in
  `monetization-config.js`):
  - Android → `android/app/src/main/AndroidManifest.xml`, inside
    `<application>`:
    ```xml
    <meta-data android:name="com.google.android.gms.ads.APPLICATION_ID"
               android:value="ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY"/>
    ```
  - iOS → `ios/App/App/Info.plist`:
    ```xml
    <key>GADApplicationIdentifier</key>
    <string>ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY</string>
    ```
- **App icons / splash:** generate from the existing art with
  `npx @capacitor/assets generate` (source icon: `icons/icon-512.png`).

## 5. Build & run

```bash
npm run cap:android        # build www, sync, open Android Studio
npm run cap:ios            # build www, sync, open Xcode  (Mac only)
```

From Android Studio / Xcode: run on a device/emulator, then build a signed
release (`.aab` for Play, archive for the App Store). Signing keys and store
listings are covered in `STORE-CHECKLIST.md`.

## Rebuilding after web changes

Any time the web app changes, re-sync the native projects:

```bash
npm run cap:sync           # runs build:www then `npx cap sync`
```

## How the pieces connect

| File | Role on native |
|---|---|
| `capacitor.config.json` | webDir=`www`, splash + AdMob plugin config, app id |
| `tools/build-www.js` | copies only runtime files into `www/` (lean bundle) |
| `native-init.js` | on-device boot: hide splash, `AdMob.initialize()`, status bar |
| `ads.js` | shows AdMob interstitials at breaks; calls `Purchases.purchaseProduct` for remove-ads |
| `cloud.js` | writes `entitlements.noAds` to Firestore so the purchase syncs across devices |
