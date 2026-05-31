---
name: AdMob web stubs
description: Pattern required to use react-native-google-mobile-ads without breaking the web bundler
---

Metro's bundler statically resolves ALL `require()` calls, even those inside `Platform.OS !== 'web'` guards. This means any file that does `require('react-native-google-mobile-ads')` will break the web bundle with "Importing native-only module" errors.

**Rule:** For every file that imports from `react-native-google-mobile-ads`, create a matching `.web.ts` / `.web.tsx` stub that exports the same API as no-ops.

**Files created for this project:**
- `lib/admob.ts` (native) → `lib/admob.web.ts` (stub)
- `hooks/useInterstitialAd.ts` → `hooks/useInterstitialAd.web.ts`
- `hooks/useRewardedAd.ts` → `hooks/useRewardedAd.web.ts`
- `hooks/useAppOpenAd.ts` → `hooks/useAppOpenAd.web.ts`
- `components/AdBanner.tsx` → `components/AdBanner.web.tsx`

**Why:** Metro resolves `.web.ts` extensions first on the web platform, completely bypassing the native file. This is the only reliable way to tree-shake native-only packages in Expo managed workflow.

**How to apply:** Any new hook or component that does a conditional `require('react-native-google-mobile-ads')` must have a matching `.web.ts` stub that returns the same shape with no-op implementations.
