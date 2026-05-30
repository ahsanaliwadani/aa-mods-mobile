---
name: Unity Ads integration
description: How Unity Ads is set up in this Expo project, including game IDs, placement IDs, and web guard pattern
---

## Game IDs
- Android: `6125972`
- iOS: `6125973`

## Package
`react-native-unity-ads@1.0.3` — JS bridge over native Unity Ads SDK.

API: `initialize(gameId, testMode)`, `show(placementId)`, `isReady(placementId, cb)`, `getState(placementId, cb)`, events via `addEventListener('onReady'|'onStart'|'onFinish'|'onError', handler)`.

No built-in banner component in this package version.

## Placement IDs
Platform-specific Unity defaults: `'Interstitial_Android'`, `'Interstitial_iOS'`, `'Rewarded_Android'`, `'Rewarded_iOS'`.

## Initialization
Called at module level in `app/_layout.tsx` immediately after `initializeOneSignal()`:
```ts
initializeUnityAds(__DEV__); // testMode=true in dev, false in prod
```

**Why:** Module-level ensures SDK initializes before any ad is requested.

## Web guard pattern
All calls in `lib/unityAds.ts` are guarded with `if (Platform.OS === 'web') return;`.
The package is loaded via `require()` inside the guard to avoid web bundler errors.

## Interstitial trigger
Fires in the download phase-tracking `useEffect` in `app/_layout.tsx` when `phase === 'done'`. Minimum interval: 45 seconds between ads.

## Config plugin
`plugins/withUnityAds.js` — adds `com.unity3d.ads:unity-ads:4.12.2` to Android app/build.gradle and `pod 'UnityAds', '~> 4.12.2'` to iOS Podfile. Referenced in `app.json` plugins array.
