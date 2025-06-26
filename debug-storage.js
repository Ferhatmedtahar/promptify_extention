// Debug script to check storage - add this to popup.html for testing
function debugAllStorage() {
  console.log("=== STORAGE DEBUG ===");

  // Check IndexedDB
  const request = indexedDB.open("PromptFixerDB", 1);
  const storeName = "settings"; // Declare storeName variable

  request.onsuccess = (event) => {
    const db = event.target.result;
    const transaction = db.transaction(["settings"], "readonly");
    const store = transaction.objectStore(storeName);
    const getAllRequest = store.getAll();

    getAllRequest.onsuccess = (event) => {
      console.log("IndexedDB contents:", event.target.result);

      // Also check specific key
      const getRequest = store.get("gemini_api_key");
      getRequest.onsuccess = (event) => {
        console.log("API key in IndexedDB:", event.target.result);
      };
    };
  };

  // Check chrome.storage
  const chrome = window.chrome; // Declare chrome variable
  if (typeof chrome !== "undefined" && chrome.storage) {
    chrome.storage.local.get(null, (result) => {
      console.log("Chrome storage contents:", result);
    });
  }

  // Check localStorage
  console.log("LocalStorage contents:", localStorage);
}

// Add debug button to popup
const debugBtn = document.createElement("button");
debugBtn.textContent = "🔍 Full Storage Debug";
debugBtn.style.cssText = `
  margin-top: 10px;
  padding: 8px 16px;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  width: 100%;
`;
debugBtn.addEventListener("click", debugAllStorage);
document.querySelector(".container").appendChild(debugBtn);
