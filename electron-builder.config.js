module.exports = {
  appId: 'com.mipyip.panoptisana',
  productName: 'Panoptisana',
  directories: {
    output: 'dist',
    buildResources: 'build'
  },
  files: [
    'dist-main/**/*',
    'dist-renderer/**/*',
    'build/trayIconTemplate.png',
    'build/trayIconTemplate@2x.png'
  ],
  asarUnpack: [
    'node_modules/better-sqlite3/**/*'
  ],
  mac: {
    category: 'public.app-category.productivity',
    target: ['dmg', 'zip'],  // zip needed for auto-update
    darkModeSupport: true,
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: 'build/entitlements.mac.plist',
    entitlementsInherit: 'build/entitlements.mac.plist',
    notarize: true  // Uses APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID from env
  },
  dmg: {
    title: '${productName}',
    iconSize: 80,
    window: {
      width: 540,
      height: 380
    }
  },
  // Auto-update support - publish to GitHub releases
  publish: {
    provider: 'github',
    owner: 'avanrossum',
    repo: 'panoptisana',
    releaseType: 'release'
  }
};
