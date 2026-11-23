// Expo's default config detects the pnpm workspace root and watches it, and resolves symlinked
// workspace packages (@roleup/core, @roleup/ui-tokens), which ship TypeScript source.
const { getDefaultConfig } = require('expo/metro-config');

module.exports = getDefaultConfig(__dirname);
