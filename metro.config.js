const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

config.watchFolders = [__dirname];

config.resolver = config.resolver || {};
config.resolver.blockList = [
  /\.local\/.*/,
  /\.git\/.*/,
  /\.cache\/.*/,
];

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web" && moduleName === "react-native-onesignal") {
    return {
      filePath: path.resolve(__dirname, "lib/oneSignal.web.ts"),
      type: "sourceFile",
    };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
