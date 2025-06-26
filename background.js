// Background script for Prompt Fixer Extension
const chrome = window.chrome; // Declare the chrome variable

chrome.runtime.onInstalled.addListener(() => {
  console.log("Prompt Fixer Extension installed");
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Background received message:", request.action);

  if (request.action === "getApiKey") {
    // Get API key from chrome.storage
    chrome.storage.local.get(["geminiApiKey"], (result) => {
      if (chrome.runtime.lastError) {
        console.error("Storage error:", chrome.runtime.lastError);
        sendResponse({ apiKey: null, error: chrome.runtime.lastError.message });
      } else {
        console.log(
          "Retrieved API key:",
          result.geminiApiKey ? "Found" : "Not found"
        );
        sendResponse({ apiKey: result.geminiApiKey || null });
      }
    });
    return true; // Keep message channel open for async response
  }

  if (request.action === "setApiKey") {
    // Store API key in chrome.storage
    chrome.storage.local.set({ geminiApiKey: request.apiKey }, () => {
      if (chrome.runtime.lastError) {
        console.error("Storage error:", chrome.runtime.lastError);
        sendResponse({
          success: false,
          error: chrome.runtime.lastError.message,
        });
      } else {
        console.log("API key saved to chrome.storage");
        sendResponse({ success: true });
      }
    });
    return true;
  }

  if (request.action === "openSettings") {
    chrome.tabs.create({
      url: chrome.runtime.getURL("index.html"),
    });
    sendResponse({ success: true });
  }
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.create({
    url: chrome.runtime.getURL("index.html"),
  });
});
