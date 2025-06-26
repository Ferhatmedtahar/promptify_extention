// Popup script for handling API key storage
const apiKeyInput = document.getElementById("apiKey");
const saveBtn = document.getElementById("saveBtn");
const statusMessage = document.getElementById("statusMessage");
const btnText = document.querySelector(".btn-text");
const loadingSpinner = document.querySelector(".loading-spinner");
const chrome = window.chrome; // Declare the chrome variable

// IndexedDB setup
let db;
const dbName = "PromptFixerDB";
const dbVersion = 1;
const storeName = "settings";
const keyName = "gemini_api_key";

// Initialize IndexedDB with better error handling
function initDB() {
  return new Promise((resolve, reject) => {
    console.log("Initializing IndexedDB...");

    try {
      const request = indexedDB.open(dbName, dbVersion);

      request.onupgradeneeded = (event) => {
        console.log("Creating/upgrading database...");
        db = event.target.result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(storeName)) {
          const store = db.createObjectStore(storeName);
          console.log("Created object store:", storeName);
        }
      };

      request.onsuccess = (event) => {
        db = event.target.result;
        console.log("Database initialized successfully");

        // Test the database by trying to read from it
        testDatabase()
          .then(() => {
            resolve(db);
          })
          .catch((error) => {
            console.warn("Database test failed:", error);
            resolve(db); // Still resolve, but with warning
          });
      };

      request.onerror = (event) => {
        console.error("IndexedDB initialization error:", event.target.error);
        reject(event.target.error);
      };

      request.onblocked = (event) => {
        console.warn("IndexedDB blocked - close other tabs");
        reject(new Error("Database blocked"));
      };
    } catch (error) {
      console.error("IndexedDB setup error:", error);
      reject(error);
    }
  });
}

// Test database functionality
async function testDatabase() {
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction([storeName], "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.get("test_key");

      request.onsuccess = () => {
        console.log("Database test successful");
        resolve(true);
      };

      request.onerror = (event) => {
        console.error("Database test failed:", event.target.error);
        reject(event.target.error);
      };
    } catch (error) {
      reject(error);
    }
  });
}

// Load API key from IndexedDB
async function loadApiKey() {
  try {
    console.log("Loading API key from IndexedDB...");
    if (!db) {
      await initDB();
    }

    const transaction = db.transaction([storeName], "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.get(keyName);

    return new Promise((resolve) => {
      request.onsuccess = (event) => {
        const apiKey = event.target.result;
        console.log("API key loaded:", apiKey ? "Found" : "Not found");
        if (apiKey) {
          apiKeyInput.value = apiKey;
          showStatus("API key loaded successfully!", "success");
        }
        resolve(apiKey);
      };

      request.onerror = (event) => {
        console.error(
          "Failed to load API key from IndexedDB:",
          event.target.error
        );
        resolve(null);
      };
    });
  } catch (error) {
    console.error("Error loading API key:", error);
    return null;
  }
}

// Save API key with comprehensive error handling
async function saveApiKey(apiKey) {
  try {
    console.log("Saving API key to IndexedDB...");

    if (!db) {
      console.log("Database not initialized, initializing now...");
      await initDB();
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction([storeName], "readwrite");
        const store = transaction.objectStore(storeName);
        const request = store.put(apiKey, keyName);

        transaction.oncomplete = () => {
          console.log("Transaction completed successfully");

          // Verify the save by reading it back
          verifyApiKeySaved(apiKey)
            .then((verified) => {
              if (verified) {
                console.log("API key verified in database");

                // Also save to chrome.storage as backup
                if (typeof chrome !== "undefined" && chrome.runtime) {
                  chrome.runtime.sendMessage(
                    {
                      action: "setApiKey",
                      apiKey: apiKey,
                    },
                    (response) => {
                      if (chrome.runtime.lastError) {
                        console.warn(
                          "Chrome storage backup failed:",
                          chrome.runtime.lastError
                        );
                      } else {
                        console.log("API key also saved to chrome.storage");
                      }
                      resolve(true);
                    }
                  );
                } else {
                  resolve(true);
                }
              } else {
                reject(new Error("Failed to verify API key save"));
              }
            })
            .catch(reject);
        };

        transaction.onerror = (event) => {
          console.error("Transaction failed:", event.target.error);
          reject(new Error("Failed to save API key to IndexedDB"));
        };

        request.onerror = (event) => {
          console.error("Put request failed:", event.target.error);
          reject(new Error("Failed to save API key to IndexedDB"));
        };
      } catch (error) {
        console.error("Save operation error:", error);
        reject(error);
      }
    });
  } catch (error) {
    console.error("Error in saveApiKey:", error);
    throw error;
  }
}

// Verify API key was saved correctly
async function verifyApiKeySaved(expectedKey) {
  return new Promise((resolve) => {
    try {
      const transaction = db.transaction([storeName], "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.get(keyName);

      request.onsuccess = (event) => {
        const savedKey = event.target.result;
        const isMatch = savedKey === expectedKey;
        console.log("Verification result:", isMatch ? "SUCCESS" : "FAILED");
        resolve(isMatch);
      };

      request.onerror = () => {
        console.error("Verification failed");
        resolve(false);
      };
    } catch (error) {
      console.error("Verification error:", error);
      resolve(false);
    }
  });
}

// Test API key validity
async function testApiKey(apiKey) {
  try {
    console.log("Testing API key...");
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: "Test" }],
            },
          ],
        }),
      }
    );

    const isValid = response.ok;
    console.log("API key test result:", isValid ? "Valid" : "Invalid");
    return isValid;
  } catch (error) {
    console.error("API key test failed:", error);
    return false;
  }
}

// Show status message
function showStatus(message, type) {
  console.log("Status:", message, type);
  statusMessage.textContent = message;
  statusMessage.className = `status-message status-${type}`;
  statusMessage.classList.remove("hidden");

  // Auto-hide success messages after 5 seconds
  if (type === "success") {
    setTimeout(() => {
      statusMessage.classList.add("hidden");
    }, 5000);
  }
}

// Set loading state
function setLoading(loading) {
  if (loading) {
    saveBtn.disabled = true;
    btnText.textContent = "Testing API Key...";
    loadingSpinner.classList.remove("hidden");
  } else {
    saveBtn.disabled = false;
    btnText.textContent = "Save & Continue";
    loadingSpinner.classList.add("hidden");
  }
}

// Save button click handler
saveBtn.addEventListener("click", async () => {
  console.log("Save button clicked");
  const apiKey = apiKeyInput.value.trim();

  if (!apiKey) {
    showStatus("Please enter your Gemini API key", "error");
    return;
  }

  if (apiKey.length < 10) {
    showStatus("API key seems too short. Please check your key.", "error");
    return;
  }

  setLoading(true);

  try {
    console.log("Starting API key validation and save process...");

    // Test the API key first
    const isValid = await testApiKey(apiKey);

    if (isValid) {
      // Save the API key
      await saveApiKey(apiKey);
      showStatus(
        "✅ API key saved successfully! You can now use Prompt Fixer on ChatGPT, Claude, and V0.dev",
        "success"
      );

      // Close popup after 3 seconds
      setTimeout(() => {
        if (window.close) {
          window.close();
        }
      }, 3000);
    } else {
      throw new Error("Invalid API key - please check your key and try again");
    }
  } catch (error) {
    console.error("Save process error:", error);
    showStatus(`❌ ${error.message}`, "error");
  } finally {
    setLoading(false);
  }
});

// Enter key handler
apiKeyInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    saveBtn.click();
  }
});

// Debug function to check stored data
async function debugStorage() {
  try {
    if (!db) await initDB();

    const transaction = db.transaction([storeName], "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = (event) => {
      console.log("All stored data:", event.target.result);
    };
  } catch (error) {
    console.error("Debug storage error:", error);
  }
}

// Initialize when popup loads
document.addEventListener("DOMContentLoaded", async () => {
  console.log("Popup loaded, initializing...");

  try {
    await initDB();
    await loadApiKey();

    // Debug: log current storage state
    setTimeout(debugStorage, 1000);
  } catch (error) {
    console.error("Failed to initialize popup:", error);
    showStatus("❌ Failed to load settings", "error");
  }
});

// Add a test button for debugging (remove in production)
const testBtn = document.createElement("button");
testBtn.textContent = "🔍 Debug Storage";
testBtn.style.cssText = `
  margin-top: 10px;
  padding: 8px 16px;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
`;
testBtn.addEventListener("click", debugStorage);
document.querySelector(".container").appendChild(testBtn);
