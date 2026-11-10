# App Store checklist: Coptic Trivia (Kinesa)

Everything below is preparation. Nothing has been run: no `cap add ios`, no Xcode build, no signing, no upload.

## Placeholders to fill (search the repo for `TODO_`)
- `TODO_PRIVACY_URL` and `TODO_SUPPORT_URL` in `src/appInfo.js`. They appear in Collection (bottom) and in the How to play dialog. Apple requires a working privacy policy URL and a support URL in App Store Connect.
- `TODO_BUNDLE_ID` in `capacitor.config.ts`.

## Wrapper setup (when you are ready)
1. `npm i @capacitor/core @capacitor/ios @capacitor/status-bar @capacitor/splash-screen` and `npm i -D @capacitor/cli @capacitor/assets`.
2. `npm run build && npx cap add ios && npx cap sync ios`.
3. `npx capacitor-assets generate --ios` (uses `resources/icon-only.png`, a 1024 opaque icon, and `resources/splash.png` / `splash-dark.png`).
4. In `ios/App/App/Info.plist` set:
   - `ITSAppUsesNonExemptEncryption` = `false` (no custom or non-OS encryption; no network calls).
   - `UISupportedInterfaceOrientations` = portrait only (the manifest also says portrait).
   - `UIViewControllerBasedStatusBarAppearance` = `true`.
5. Privacy manifest (`PrivacyInfo.xcprivacy`): no data collected, no tracking. Add a required-reason entry only if a plugin you add uses one.

## Service worker and offline
- Kinesa has no service worker and no network calls; everything ships in the bundle. Nothing to disable in the wrapper.
- It is not an installable PWA yet (manifest and icons only). Add a service worker only if you want offline web use; the Heads Up app has a wrapper-safe example.

## Storage
- Progress, preferences and the saved match live in `localStorage` (versioned and migrated). If storage is full or blocked, the app says so once (a toast) and keeps playing in memory. In the wrapper, test an upgrade and an app restart on device. If iOS evicts web storage in your testing, move the keys to `@capacitor/preferences` behind `readSaved`/`saveLocal` in `src/engine.js`.
- A render crash shows a recovery screen (Reload, or Clear unfinished match) instead of a blank page.

## Share image
- The result card is drawn on a canvas and shared with the Web Share API (file); it falls back to a PNG download. Test it in the wrapper. If the share sheet does not open, use `@capacitor/share` with a temporary file.

## Icons and splash
- Master: `docs/store/icon-source.svg` -> `docs/store/app-icon-1024.png` (opaque RGB, full bleed, no corners or alpha). Web sizes (192, 512, maskable 192/512, apple-touch 180, favicon 32) are in `public/`.
- Regenerate with `node scripts/build-icons.mjs && python3 -I scripts/flatten-icons.py`.
- The mark is the in-app twelve-point Coptic cross (weld yellow on tapestry purple), so the home screen icon matches the header.

## Store listing (owner)
- Name: Coptic Trivia (the in-app wordmark stays "kinesa"). Subtitle, keywords, screenshots (6.9" and 6.5" iPhone), age rating (religious content, no objectionable material), category (Games > Trivia, or Education).
- Privacy answers: "Data Not Collected". No accounts, analytics, ads or backend. Because there are no accounts, no in-app account or data deletion flow is required; "Clear unfinished match" only removes the saved match.
- Content: all Coptic and church content is reviewed by the project owner (see `PRODUCT.md`). No endorsement by any church body is claimed.

## Known limits
- The iOS wrapper has never been compiled or run on a device. Test safe areas (notch and Dynamic Island), the keyboard on the friends setup screen, companion WebGL motion, and sound.
- Companion paintings were downscaled to 75% (`public/characters/`, about 0.46 MB total, down from 2.5 MB). Check the faces on a 3x device.
