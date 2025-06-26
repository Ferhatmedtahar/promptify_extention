// Universal AI Chat Prompt Fixer Extension
// Works with ChatGPT, Claude, and v0

function waitForElement(selector, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const check = () => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
      } else if (Date.now() - startTime > timeout) {
        reject(new Error(`Element ${selector} not found within ${timeout}ms`));
      } else {
        setTimeout(check, 500);
      }
    };
    check();
  });
}

function createFixButton(platform) {
  const button = document.createElement("button");
  button.textContent = "✨ Fix Prompt";
  button.id = `fix-prompt-button-${platform}`;

  // Base styles
  const baseStyles = {
    position: "fixed",
    zIndex: "9999",
    padding: "8px 12px",
    fontSize: "14px",
    fontWeight: "500",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    fontFamily: "system-ui, -apple-system, sans-serif",
    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
    backdropFilter: "blur(10px)",
  };

  // Platform-specific styles and positioning
  const platformStyles = {
    chatgpt: {
      top: "20px",
      right: "20px",
      backgroundColor: "#10a37f",
      color: "white",
    },
    claude: {
      top: "20px",
      right: "20px",
      backgroundColor: "#cc785c",
      color: "white",
    },
    v0: {
      top: "20px",
      right: "20px",
      backgroundColor: "#000000",
      color: "white",
    },
  };

  // Apply styles
  Object.assign(button.style, baseStyles, platformStyles[platform]);

  // Hover effects
  button.addEventListener("mouseenter", () => {
    button.style.transform = "translateY(-2px)";
    button.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)";
  });

  button.addEventListener("mouseleave", () => {
    button.style.transform = "translateY(0)";
    button.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
  });

  return button;
}

async function getPromptText(platform) {
  switch (platform) {
    case "chatgpt":
      const chatgptInput = document.querySelector(".ProseMirror");
      return chatgptInput ? chatgptInput.innerText.trim() : "";

    case "claude":
      const claudeInput = document.querySelector(".ProseMirror");
      return claudeInput ? claudeInput.innerText.trim() : "";

    case "v0":
      const v0Input =
        document.querySelector("#chat-main-textarea") ||
        document.querySelector('textarea[placeholder*="chat"]') ||
        document.querySelector("textarea");
      return v0Input ? v0Input.value.trim() : "";

    default:
      return "";
  }
}

async function setPromptText(platform, text) {
  switch (platform) {
    case "chatgpt":
      const chatgptInput = document.querySelector(".ProseMirror");
      if (chatgptInput) {
        chatgptInput.innerHTML = `<p>${text}</p>`;
        chatgptInput.focus();
        chatgptInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
      break;

    case "claude":
      const claudeInput = document.querySelector(".ProseMirror");
      if (claudeInput) {
        claudeInput.innerHTML = `<p>${text}</p>`;
        claudeInput.focus();
        claudeInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
      break;

    case "v0":
      const v0Input =
        document.querySelector("#chat-main-textarea") ||
        document.querySelector('textarea[placeholder*="chat"]') ||
        document.querySelector("textarea");
      if (v0Input) {
        v0Input.value = text;
        v0Input.focus();
        v0Input.dispatchEvent(new Event("input", { bubbles: true }));
        v0Input.dispatchEvent(new Event("change", { bubbles: true }));
      }
      break;
  }
}

// Get API key from IndexedDB with better error handling
async function getApiKeyFromIndexedDB() {
  return new Promise((resolve) => {
    console.log("Content script: Getting API key from IndexedDB...");

    try {
      const request = indexedDB.open("PromptFixerDB", 1);

      request.onsuccess = (event) => {
        try {
          const db = event.target.result;
          const transaction = db.transaction(["settings"], "readonly");
          const store = transaction.objectStore("settings");
          const getRequest = store.get("gemini_api_key");

          getRequest.onsuccess = (event) => {
            const apiKey = event.target.result;
            console.log(
              "Content script: API key retrieved:",
              apiKey ? "Found" : "Not found"
            );
            resolve(apiKey || null);
          };

          getRequest.onerror = (event) => {
            console.error(
              "Content script: Failed to get API key:",
              event.target.error
            );
            resolve(null);
          };
        } catch (error) {
          console.error("Content script: Transaction error:", error);
          resolve(null);
        }
      };

      request.onerror = (event) => {
        console.error("Content script: IndexedDB error:", event.target.error);
        resolve(null);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings");
        }
      };
    } catch (error) {
      console.error("Content script: IndexedDB initialization error:", error);
      resolve(null);
    }
  });
}

async function getApiKey() {
  // Try IndexedDB first
  const apiKey = await getApiKeyFromIndexedDB();

  // Fallback to chrome.storage only if chrome is available
  if (!apiKey && window.chrome && window.chrome.runtime) {
    try {
      return new Promise((resolve) => {
        window.chrome.runtime.sendMessage(
          { action: "getApiKey" },
          (response) => {
            if (window.chrome.runtime.lastError) {
              console.warn(
                "Chrome runtime error:",
                window.chrome.runtime.lastError
              );
              resolve(null);
            } else {
              resolve(response?.apiKey || null);
            }
          }
        );
      });
    } catch (error) {
      console.error("Chrome API error:", error);
      return null;
    }
  }

  return apiKey;
}

async function fixPromptWithGemini(promptText) {
  try {
    const geminiApiKey = await getApiKey();

    if (!geminiApiKey) {
      throw new Error(
        "Gemini API key not set. Please click the extension icon to configure it."
      );
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Please improve this prompt to make it clearer, more specific, and more effective for AI assistants. Follow these guidelines:

1. Make the request more specific and detailed
2. Add context if needed
3. Structure it properly with clear instructions
4. Keep the original intent but enhance clarity
5. Use best practices for AI prompting

Original prompt:
${promptText}

Please provide only the improved prompt without any explanation or additional text.`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `API request failed: ${response.status} - ${
          errorData.error?.message || "Unknown error"
        }`
      );
    }

    const data = await response.json();
    const fixedPrompt = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!fixedPrompt) {
      throw new Error("No response received from Gemini API");
    }

    return fixedPrompt.trim();
  } catch (error) {
    console.error("Error fixing prompt:", error);
    throw error;
  }
}

function showNotification(message, type = "info") {
  // Remove existing notifications
  const existingNotifications = document.querySelectorAll(
    ".prompt-fixer-notification"
  );
  existingNotifications.forEach((n) => n.remove());

  const notification = document.createElement("div");
  notification.className = "prompt-fixer-notification";
  notification.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    backdrop-filter: blur(10px);
    animation: slideIn 0.3s ease;
    max-width: 300px;
    word-wrap: break-word;
    ${
      type === "error"
        ? "background: #fee2e2; color: #dc2626; border: 1px solid #fecaca;"
        : "background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0;"
    }
  `;

  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = "slideOut 0.3s ease";
    setTimeout(() => notification.remove(), 300);
  }, 4000);
}

function detectPlatform() {
  const hostname = window.location.hostname;

  if (
    hostname.includes("chatgpt.com") ||
    hostname.includes("chat.openai.com")
  ) {
    return "chatgpt";
  } else if (hostname.includes("claude.ai")) {
    return "claude";
  } else if (hostname.includes("v0.dev")) {
    return "v0";
  }

  return null;
}

async function initPlatformSpecific(platform) {
  try {
    // Platform-specific selectors to wait for
    const selectors = {
      chatgpt: ".ProseMirror",
      claude: ".ProseMirror",
      v0: "textarea",
    };

    console.log(`Initializing Prompt Fixer for ${platform}...`);

    // Wait for the input element to be available
    await waitForElement(selectors[platform]);

    // Check if button already exists
    if (document.getElementById(`fix-prompt-button-${platform}`)) {
      return;
    }

    // Create and add the fix button
    const button = createFixButton(platform);
    document.body.appendChild(button);

    // Add click handler
    button.addEventListener("click", async () => {
      try {
        button.disabled = true;
        button.textContent = "🔄 Fixing...";

        const promptText = await getPromptText(platform);

        if (!promptText || promptText.length < 3) {
          showNotification("Please enter a prompt first!", "error");
          return;
        }

        const fixedPrompt = await fixPromptWithGemini(promptText);
        await setPromptText(platform, fixedPrompt);

        showNotification("Prompt enhanced successfully! ✨");
        console.log("Prompt fixed successfully!");
      } catch (error) {
        console.error("Error:", error);
        showNotification(error.message, "error");
      } finally {
        button.disabled = false;
        button.textContent = "✨ Fix Prompt";
      }
    });

    console.log(`Prompt Fixer button injected for ${platform}`);
  } catch (error) {
    console.error(`Failed to initialize for ${platform}:`, error);
  }
}

// Add CSS animations
function addStyles() {
  if (document.getElementById("prompt-fixer-styles")) return;

  const style = document.createElement("style");
  style.id = "prompt-fixer-styles";
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
}
// Main initialization
(async function init() {
  console.log("Prompt Fixer Extension loading...");

  addStyles();

  const platform = detectPlatform();

  if (platform) {
    console.log(`Platform detected: ${platform}`);

    // Initialize immediately
    await initPlatformSpecific(platform);

    // Also observe for dynamic content changes (SPA navigation)
    const observer = new MutationObserver(() => {
      // Re-initialize if button is missing
      if (!document.getElementById(`fix-prompt-button-${platform}`)) {
        initPlatformSpecific(platform);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  } else {
    console.log("Platform not supported");
  }
})();
