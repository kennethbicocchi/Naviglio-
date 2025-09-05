'use strict';

const HOST = "com.naviglio.host";

const msg = document.getElementById("msg");
const clearBtn = document.getElementById("clearBtn");
const reloadBtn = document.getElementById("reloadBtn");

/** Invio messaggi al native host con gestione errori */
async function native(message) {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendNativeMessage(HOST, message, (resp) => {
        const err = chrome.runtime.lastError ? chrome.runtime.lastError.message : null;
        if (err) {
          resolve({ ok: false, err });
        } else {
          resolve(resp ?? { ok: false, err: "no_response" });
        }
      });
    } catch (e) {
      resolve({ ok: false, err: String(e) });
    }
  });
}

/** Reset sblocchi */
clearBtn.addEventListener("click", async () => {
  try {
    msg.textContent = "Invio comando…";
    const resp = await native({ cmd: "clear_unlocks" });
    if (resp && resp.ok) {
      msg.textContent = "✅ Sblocchi azzerati.";
    } else {
      const detail = resp?.detail || resp?.err || "host non raggiungibile";
      msg.textContent = "❌ Errore reset: " + detail;
    }
  } catch (e) {
    msg.textContent = "❌ Errore reset: " + String(e);
  }
});

/**
 * Ricarica scheda attiva SENZA permesso "tabs":
 * inviamo un broadcast; ogni content script ricarica
 * solo se la sua pagina è attualmente in focus.
 */
reloadBtn.addEventListener("click", () => {
  try {
    chrome.runtime.sendMessage({ type: "reload_if_active" });
    msg.textContent = "🔁 Richiesta inviata.";
  } catch (e) {
    msg.textContent = "❌ Errore invio richiesta: " + String(e);
  }
});
