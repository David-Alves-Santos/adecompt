// Mock element_sdk.js
window.elementSdk = {
  init(config) {
    if (config && typeof config.onConfigChange === 'function') {
      config.onConfigChange(config.defaultConfig || {});
    }
  },
  setConfig(config) {
    // no-op
  }
};