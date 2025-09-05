// DEBUG helper
function dbg(...a){ try{ console.log("[Naviglio]", ...a); }catch{} }

// Proxy verso il service worker (che a sua volta parla col Native Host)
async function native(msg) {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage({ type: "native", msg }, (resp) => {
        if (chrome.runtime.lastError) {
          dbg("bg sendMessage error:", chrome.runtime.lastError.message);
        }
        resolve(resp || null);
      });
    } catch (e) {
      dbg("sendMessage throw:", e);
      resolve(null);
    }
  });
}

(async () => {
  try {
    dbg("content.js v0.5.1 loaded on", location.href);

    // Evita pagine dell'estensione (Chrome/Edge e Firefox)
    const origin = location.origin || "";
    if (origin.startsWith("chrome-extension://") || origin.startsWith("moz-extension://")) return;

    // Solo top frame per evitare rimbalzi dentro iframe di terze parti
    if (window.top !== window) return;

    // 1) domini dall'host; fallback se non disponibile
    let blockedDomains = [];
    const respDomains = await native({ cmd: "get_blocked_domains" });
    if (respDomains && Array.isArray(respDomains.domains)) {
      blockedDomains = respDomains.domains;
    }
    if (!blockedDomains.length) {
      blockedDomains = ["instagram.com", "tiktok.com"]; // Fallback
      dbg("fallback domains in use");
    } else {
      dbg("domains from host:", blockedDomains);
    }

    const url = new URL(window.location.href);
    const domain = url.hostname;
    const match = blockedDomains.find(d => domain === d || domain.endsWith("." + d));
    dbg("hostname:", domain, "match:", match);
    if (!match) return;

    // 2) verifica sblocco attivo (se bg/host disponibili)
    let unlocked = false;
    const respUnlock = await native({ cmd: "get_unlock", domain: match });
    dbg("unlock resp:", respUnlock);
    if (respUnlock && respUnlock.active) unlocked = true;
    if (unlocked) { dbg("unlocked active, allow"); return; }

    // 3) interstitial
    const interUrl = chrome.runtime.getURL("interstitial.html") + `?target=${encodeURIComponent(window.location.href)}`;
    const alreadyInterstitial = location.href.startsWith(chrome.runtime.getURL("interstitial.html"));
    dbg("redirecting to interstitial?", !alreadyInterstitial, interUrl);

    if (!alreadyInterstitial) {
      location.replace(interUrl);
    }
  } catch (err) {
    dbg("fatal error:", err);
  }
})();

// --- Listener per ricarica senza permesso "tabs"
chrome.runtime.onMessage.addListener((m) => {
  if (m && m.type === "reload_if_active") {
    // ricarica solo se questa pagina è la scheda attiva (ha il focus)
    if (document.hasFocus()) location.reload();
  }
});
