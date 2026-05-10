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

// Disable bundle caching in dev so browsers always get fresh bundles
config.server = config.server || {};
config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    if (req.url && req.url.includes(".bundle")) {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
    }
    return middleware(req, res, next);
  };
};

module.exports = config;
