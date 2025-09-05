// Minimal bridge: content/popup/options -> native host
const HOST = "com.naviglio.host";

function sendNative(msg) {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendNativeMessage(HOST, msg, (resp) => {
        const err = chrome.runtime.lastError?.message || null;
        if (err) resolve({ ok: false, err });
        else resolve(resp ?? { ok: false, err: "no_response" });
      });
    } catch (e) {
      resolve({ ok: false, err: String(e) });
    }
  });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    if (message?.type === "native") {
      const r = await sendNative(message.msg);
      sendResponse(r);
    } else if (message?.type === "reload_if_active") {
      // Broadcast to every tab; each content script reloads only if focused
      const tabs = await chrome.tabs.query({});
      for (const t of tabs) {
        try { chrome.tabs.sendMessage(t.id, { type: "reload_if_active" }); } catch {}
      }
      sendResponse({ ok: true });
    } else {
      sendResponse({ ok: false, err: "unknown_message" });
    }
  })();
  return true; // async response
});
