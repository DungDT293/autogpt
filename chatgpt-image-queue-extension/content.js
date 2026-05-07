(() => {
  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === "cgptiq-toggle-panel") {
      window.CGPTIQ.panel.togglePanel();
    }
  });

  window.CGPTIQ.panel.createPanel();
})();
