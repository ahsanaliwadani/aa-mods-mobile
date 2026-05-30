const { withAppBuildGradle, withPodfile, withDangerousMod } = require("@expo/config-plugins");

/**
 * Expo config plugin to set up Unity Ads native dependencies.
 * Adds the Unity Ads Maven repository and SDK dependency for Android,
 * and the UnityAds pod for iOS.
 */

function withUnityAdsAndroid(config, { gameId } = {}) {
  return withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    // Add Unity Ads Maven repository if not already present
    const unityMavenRepo = `maven { url 'https://storage.googleapis.com/download.firebase.sdk.android/release' }`;
    const unityRepo = `maven {
            url 'https://unityads.unity3d.com/repository'
        }`;

    // Add the Unity Ads dependency
    const unityDepLine = `implementation 'com.unity3d.ads:unity-ads:4.12.2'`;

    if (!contents.includes("unity-ads")) {
      // Add to dependencies block
      contents = contents.replace(
        /dependencies\s*\{/,
        `dependencies {\n    ${unityDepLine}`,
      );
      config.modResults.contents = contents;
    }

    return config;
  });
}

function withUnityAdsIOS(config) {
  return withPodfile(config, (config) => {
    let contents = config.modResults.contents;

    if (!contents.includes("UnityAds")) {
      // Add UnityAds pod before the final 'end'
      const podLine = `  pod 'UnityAds', '~> 4.12.2'\n`;
      const targetMatch = contents.match(/target '[^']+' do/);
      if (targetMatch) {
        contents = contents.replace(targetMatch[0], `${targetMatch[0]}\n${podLine}`);
      } else {
        // fallback: insert before final end
        contents = contents.replace(/\nend\s*$/, `\n${podLine}\nend`);
      }
      config.modResults.contents = contents;
    }

    return config;
  });
}

module.exports = function withUnityAds(config, options = {}) {
  config = withUnityAdsAndroid(config, options);
  config = withUnityAdsIOS(config);
  return config;
};
