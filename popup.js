// Popup script for handling API key storage
const apiKeyInput = document.getElementById("apiKey");
const saveBtn = document.getElementById("saveBtn");
const statusMessage = document.getElementById("statusMessage");
const btnText = document.querySelector(".btn-text");
const loadingSpinner = document.querySelector(".loading-spinner");

// Load API key from Chrome storage
async function loadApiKey() {
  try {
    console.log("Loading API key from Chrome storage...");

    const result = await chrome.storage.local.get(["geminiApiKey"]);

    if (result.geminiApiKey) {
      apiKeyInput.value = result.geminiApiKey;
      showStatus("API key loaded successfully!", "success");
      console.log("API key loaded from storage");
    } else {
      console.log("No API key found in storage");
    }

    return result.geminiApiKey;
  } catch (error) {
    console.error("Error loading API key:", error);
    showStatus("Failed to load API key", "error");
    return null;
  }
}

// Save API key to Chrome storage
async function saveApiKey(apiKey) {
  try {
    console.log("Saving API key to Chrome storage...");

    await chrome.storage.local.set({ geminiApiKey: apiKey });

    console.log("API key saved successfully");
    return true;
  } catch (error) {
    console.error("Error saving API key:", error);
    throw new Error("Failed to save API key to storage");
  }
}

// Test API key validity
async function testApiKey(apiKey) {
  try {
    console.log("Testing API key...");
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
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
        window.close();
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

async function debugStorage() {
  try {
    const result = await chrome.storage.local.get(null);
    console.log("All stored data:", result);
  } catch (error) {
    console.error("Debug storage error:", error);
  }
}

// Initialize when popup loads
document.addEventListener("DOMContentLoaded", async () => {
  console.log("Popup loaded, initializing...");

  try {
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
