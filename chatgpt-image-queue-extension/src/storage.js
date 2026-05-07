window.CGPTIQ = window.CGPTIQ || {};

(() => {
  const { defaultSettings, storageKey } = window.CGPTIQ.config;

  async function loadSettings() {
    const stored = await chrome.storage.local.get(storageKey);
    return { ...defaultSettings, ...(stored[storageKey] || {}) };
  }

  async function saveSettings(settings) {
    await chrome.storage.local.set({ [storageKey]: settings });
  }

  window.CGPTIQ.storage = {
    loadSettings,
    saveSettings
  };
})();
