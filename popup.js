const apiKeyInput = document.getElementById("apiKey");
const saveBtn = document.getElementById("saveBtn");
const statusMessage = document.getElementById("statusMessage");
const btnText = document.querySelector(".btn-text");
const loadingSpinner = document.querySelector(".loading-spinner");

async function loadApiKey() {
  try {
    const result = await chrome.storage.local.get(["geminiApiKey"]);

    if (result.geminiApiKey) {
      apiKeyInput.value = result.geminiApiKey;
      showStatus("API key loaded successfully!", "success");
    }

    return result.geminiApiKey;
  } catch (error) {
    console.error("Error loading API key:", error);
    showStatus(
      "ApiKey is missing, please click the extension icon to configure",
      "error"
    );
    return null;
  }
}

async function saveApiKey(apiKey) {
  try {
    await chrome.storage.local.set({ geminiApiKey: apiKey });
    return true;
  } catch (error) {
    console.error("Error saving API key:", error);
    throw new Error("Failed to save API key to storage");
  }
}

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

function showStatus(message, type) {
  console.log("Status:", message, type);
  statusMessage.textContent = message;
  statusMessage.className = `status-message status-${type}`;
  statusMessage.classList.remove("hidden");

  if (type === "success") {
    setTimeout(() => {
      statusMessage.classList.add("hidden");
    }, 6000);
  }
}

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

    const isValid = await testApiKey(apiKey);

    if (isValid) {
      await saveApiKey(apiKey);
      showStatus("✅ API key saved successfully!", "success");

      setTimeout(() => {
        window.close();
      }, 3500);
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

apiKeyInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    saveBtn.click();
  }
});
