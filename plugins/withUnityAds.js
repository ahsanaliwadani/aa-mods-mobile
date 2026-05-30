const { withSettingsGradle, withPodfile } = require("@expo/config-plugins");

function withUnityAdsAndroid(config) {
  return withSettingsGradle(config, (config) => {
    let contents = config.modResults.contents;
    if (contents.includes("unityads.unity3d.com")) return config;

    const unityRepo = `        maven { url 'https://unityads.unity3d.com/repository' }`;
    const dmIdx = contents.indexOf("dependencyResolutionManagement");
    if (dmIdx !== -1) {
      const repoBlockIdx = contents.indexOf("repositories {", dmIdx);
      if (repoBlockIdx !== -1) {
        const insertAt = repoBlockIdx + "repositories {".length;
        contents =
          contents.slice(0, insertAt) +
          "\n" +
          unityRepo +
          contents.slice(insertAt);
        config.modResults.contents = contents;
      }
    }
    return config;
  });
}

function withUnityAdsIOS(config) {
  return withPodfile(config, (config) => {
    let contents = config.modResults.contents;
    if (contents.includes("UnityAds")) return config;

    const podLine = `  pod 'UnityAds', '~> 4.12.2'\n`;
    const targetMatch = contents.match(/target '[^']+' do/);
    if (targetMatch) {
      contents = contents.replace(
        targetMatch[0],
        `${targetMatch[0]}\n${podLine}`,
      );
    } else {
      contents = contents.replace(/\nend\s*$/, `\n${podLine}\nend`);
    }
    config.modResults.contents = contents;
    return config;
  });
}

module.exports = function withUnityAds(config, _options = {}) {
  config = withUnityAdsAndroid(config);
  config = withUnityAdsIOS(config);
  return config;
};
