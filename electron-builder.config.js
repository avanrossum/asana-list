module.exports = {
  appId: 'com.mipyip.panorasana',
  productName: 'Panorasana',
  directories: {
    output: 'dist',
    buildResources: 'build'
  },
  files: [
    'src/main/**/*',
    'dist-renderer/**/*',
    'build/trayIconTemplate.png',
    'build/trayIconTemplate@2x.png'
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
    repo: 'asana-list',
    releaseType: 'release'
  }
};
