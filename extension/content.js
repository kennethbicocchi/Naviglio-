function dbg(...a){ try{ console.log("[Naviglio]", ...a); }catch{} }

// Ask SW to talk to native
function native(msg){
  return new Promise((resolve)=>{
    try{
      chrome.runtime.sendMessage({ type:"native", msg }, (resp)=>{
        if (chrome.runtime.lastError) dbg("bg error:", chrome.runtime.lastError.message);
        resolve(resp || null);
      });
    }catch(e){ dbg("sendMessage throw:", e); resolve(null); }
  });
}

// reload-when-active (no tabs permission)
chrome.runtime.onMessage.addListener((m)=>{
  if (m && m.type === "reload_if_active") {
    if (document.hasFocus()) location.reload();
  }
});

(async ()=>{
  try{
    dbg("content loaded:", location.href);

    const origin = location.origin || "";
    if (origin.startsWith("chrome-extension://") || origin.startsWith("moz-extension://")) return;
    if (window.top !== window) return;

    let blockedDomains = [];
    const r = await native({ cmd: "get_blocked_domains" });
    if (r && Array.isArray(r.domains)) blockedDomains = r.domains;
    if (!blockedDomains.length) { dbg("no blocked domains configured"); return; }

    const host = new URL(location.href).hostname;
    const match = blockedDomains.find(d => host === d || host.endsWith("." + d));
    if (!match) return;

    const u = await native({ cmd: "get_unlock", domain: match });
    if (u && u.active) { dbg("domain unlocked"); return; }

    const url = chrome.runtime.getURL("interstitial.html") + `?target=${encodeURIComponent(location.href)}`;
    if (!location.href.startsWith(chrome.runtime.getURL("interstitial.html"))) {
      location.replace(url);
    }
  }catch(e){ dbg("fatal:", e); }
})();
