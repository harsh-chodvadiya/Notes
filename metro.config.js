const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Sibling projects live in this repo — keep Metro from scanning them.
const block = [
  'Notes-Expo',
  'Notes-Flutter',
  'Old Notes',
  'S Notes',
].map((name) => path.resolve(__dirname, name));

config.resolver.blockList = block.map(
  (dir) => new RegExp(`^${dir.replace(/[/\\]/g, '[/\\\\]')}[/\\\\].*`)
);
config.watchFolders = [__dirname];

module.exports = config;
