---
name: Unity Ads integration
description: How Unity Ads is set up in this Expo project — local module replaces the dead npm package
---

## Package
`react-native-unity-ads@1.0.3` was removed — it uses a 2016 Gradle build file (`compileSdkVersion 23`, `jcenter()`, `compile` directive) and Unity Ads 2.x Java API (`IUnityAdsListener`, synchronous `isReady`) which is completely incompatible with RN 0.81 + Unity Ads 4.x.

**Replacement:** Local Expo native module at `modules/unity-ads/` registered as workspace package `unity-ads: "workspace:*"`.

**Why:** No maintained npm package exists for Unity Ads 4.x + React Native 0.81. The local module uses Unity Ads 4.12.2 Kotlin API (`IUnityAdsLoadListener`, `IUnityAdsShowListener`, load-then-show pattern) and is registered via `expo-module.config.json` for autolinking.

## JS API (unchanged from before — lib/unityAds.ts unchanged)
`require("unity-ads").default` — shim object with:
- `.init(gameId)` → calls native `initialize(gameId, false)`
- `.isReady(placementId, callback)` → callback called synchronously with boolean
- `.show(placementId)` → calls native show
- `.addEventListener(event, handler)` / `.removeEventListener(event, handler)` → expo EventEmitter adapter

## Unity Ads 4.x load pattern
Ads are pre-loaded after init completes (Interstitial_Android, Rewarded_Android, Banner_Android). `loadedPlacements` Set tracks which placements are ready. `isReady` checks the Set synchronously. `show` removes from Set then calls Unity `show()`, and reloads the placement afterward.

## Maven repo
`withUnityAds.js` plugin injects `maven { url 'https://unityads.unity3d.com/repository' }` into `settings.gradle` `dependencyResolutionManagement.repositories` block (project-level, works with PREFER_SETTINGS mode). The local module's `build.gradle` also declares the repo for local builds.

## Game IDs
- Android: `6125972`
- iOS: `6125973`

## Placement IDs
`Interstitial_Android`, `Rewarded_Android`, `Banner_Android` (pre-loaded at init)

## Initialization
`initializeUnityAds(__DEV__)` called at module level in `app/_layout.tsx`.

## Interstitial trigger
Fires when download `phase === 'done'` in `app/_layout.tsx`. Minimum 45s interval.

## Config plugin
`plugins/withUnityAds.js` — adds Maven repo to `settings.gradle` and Unity Ads pod to iOS Podfile. The local module's own `build.gradle` handles the `unity-ads:4.12.2` dependency.
