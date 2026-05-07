async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

document.getElementById("toggle-panel").addEventListener("click", async () => {
  const tab = await getActiveTab();
  if (!tab?.id) return;
  chrome.tabs.sendMessage(tab.id, { type: "cgptiq-toggle-panel" });
  window.close();
});

document.getElementById("open-chatgpt").addEventListener("click", () => {
  chrome.tabs.create({ url: "https://chatgpt.com/" });
  window.close();
});
