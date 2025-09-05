// bg.js — proxy unico per Native Messaging
const HOST = "com.naviglio.host";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === "native" && message.msg) {
    chrome.runtime.sendNativeMessage(HOST, message.msg, (resp) => {
      if (chrome.runtime.lastError) {
        sendResponse({ ok: false, err: chrome.runtime.lastError.message });
      } else {
        sendResponse(resp);
      }
    });
    return true;
  }
});
