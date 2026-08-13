// Metro bundler configured for this monorepo.
//
// Without this, the app cannot import @poker-club/core — the package that holds
// the money and settlement logic shared with the server. Metro only watches the
// app folder by default, so we widen it to the workspace root and tell it where
// the hoisted node_modules live.
//
// See https://docs.expo.dev/guides/monorepos/

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch the whole workspace so edits to packages/core hot-reload in the app.
config.watchFolders = [workspaceRoot];

// Resolve from the app first, then from the hoisted root.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Don't walk up the tree looking for modules; use the two paths above only.
config.resolver.disableHierarchicalLookup = true;

// expo-sqlite's web build is a WebAssembly SQLite, and Metro will not resolve a
// .wasm import unless it is told that one is an asset. Native builds never hit
// this; a browser preview does, on the very first import in the store.
config.resolver.assetExts.push('wasm');

module.exports = config;
