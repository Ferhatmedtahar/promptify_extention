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
  button.textContent = "Fix Prompt";
  button.id = `fix-prompt-button-${platform}`;

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
    gemini: {
      top: "20px",
      right: "20px",
      backgroundColor: "#4285f4",
      color: "white",
    },
  };

  Object.assign(button.style, baseStyles, platformStyles[platform]);

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

    case "gemini":
      const geminiInput =
        document.querySelector('.ql-editor[contenteditable="true"]') ||
        document.querySelector('div[contenteditable="true"][role="textbox"]') ||
        document.querySelector(".text-input-field_textarea .ql-editor") ||
        document.querySelector("rich-textarea .ql-editor");

      if (geminiInput) {
        return (
          geminiInput.innerText?.trim() || geminiInput.textContent?.trim() || ""
        );
      }
      return "";

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

    case "gemini":
      const geminiInput =
        document.querySelector('.ql-editor[contenteditable="true"]') ||
        document.querySelector('div[contenteditable="true"][role="textbox"]') ||
        document.querySelector(".text-input-field_textarea .ql-editor") ||
        document.querySelector("rich-textarea .ql-editor");

      if (geminiInput) {
        geminiInput.innerHTML = "";
        geminiInput.innerHTML = `<p>${text}</p>`;
        geminiInput.focus();
        geminiInput.dispatchEvent(new Event("input", { bubbles: true }));
        geminiInput.dispatchEvent(new Event("change", { bubbles: true }));
        geminiInput.dispatchEvent(
          new KeyboardEvent("keyup", { bubbles: true })
        );

        const range = document.createRange();
        const selection = window.getSelection();
        range.selectNodeContents(geminiInput);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      break;
  }
}

async function getApiKey() {
  try {
    console.log("Content script: Getting API key from Chrome storage...");

    const result = await chrome.storage.local.get(["geminiApiKey"]);

    console.log(
      "Content script: API key retrieved:",
      result.geminiApiKey ? "Found" : "Not found"
    );

    return result.geminiApiKey || null;
  } catch (error) {
    console.error("Content script: Error getting API key:", error);
    return null;
  }
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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
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
  } else if (hostname.includes("gemini.google.com")) {
    return "gemini";
  }

  return null;
}

async function initPlatformSpecific(platform) {
  try {
    const selectors = {
      chatgpt: ".ProseMirror",
      claude: ".ProseMirror",
      v0: "textarea",
      gemini:
        '.ql-editor[contenteditable="true"], div[contenteditable="true"][role="textbox"]',
    };

    console.log(`Initializing Prompt Fixer for ${platform}...`);
    await waitForElement(selectors[platform]);
    if (platform === "gemini") {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    if (document.getElementById(`fix-prompt-button-${platform}`)) {
      return;
    }

    const button = createFixButton(platform);
    document.body.appendChild(button);

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

(async function init() {
  console.log("Prompt Fixer Extension loading...");

  addStyles();

  const platform = detectPlatform();

  if (platform) {
    await initPlatformSpecific(platform);

    const observer = new MutationObserver(() => {
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
