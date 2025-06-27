chrome.runtime.onInstalled.addListener(() => {
  console.log("Prompt Fixer Extension installed");
});

chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.create({
    url: chrome.runtime.getURL("index.html"),
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Background received message:", request.action);

  sendResponse({ success: true });
});
