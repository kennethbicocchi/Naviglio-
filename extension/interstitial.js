// DEBUG helper
function dbg(...a){ try{ console.log("[Naviglio interstitial]", ...a); }catch{} }

// proxy diretto al Native Host
function nativeNM(msg) {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendNativeMessage("com.naviglio.host", msg, (resp) => {
        const err = chrome.runtime.lastError ? chrome.runtime.lastError.message : null;
        if (err) dbg("native error:", err, msg);
        resolve({ resp, err });
      });
    } catch (e) {
      dbg("native throw:", e);
      resolve({ resp: null, err: String(e) });
    }
  });
}

function bestMatchDomain(host, blocked) {
  return blocked.find(d => host === d || host.endsWith("." + d)) || null;
}

async function waitUntilUnlocked(domain, maxTries = 12, delayMs = 120) {
  for (let i = 0; i < maxTries; i++) {
    const q = await nativeNM({ cmd: "get_unlock", domain });
    if (!q.err && q.resp && q.resp.active) return true;
    await new Promise(r => setTimeout(r, delayMs));
  }
  return false;
}

(async () => {
  const params = new URLSearchParams(location.search);
  const target = params.get("target") || "about:blank";

  const form = document.getElementById("unlockForm");
  const pwd = document.getElementById("pwd");
  const minutesSel = document.getElementById("minutes");
  const msg = document.getElementById("msg");
  const cancelBtn = document.getElementById("cancelBtn");

  cancelBtn.addEventListener("click", () => {
    msg.textContent = "Accesso negato.";
    setTimeout(() => { history.back(); }, 800);
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.textContent = "";

    const host = new URL(target).hostname;

    // 1) verifica password
    const check = await nativeNM({ cmd: "check_password", password: pwd.value });
    dbg("check_password resp:", check);
    if (check.err) { msg.textContent = "Host non raggiungibile: " + check.err; return; }
    if (!check.resp || !check.resp.ok) { msg.textContent = "Password errata."; pwd.value = ""; pwd.focus(); return; }

    // 2) leggi lista domini
    const list = await nativeNM({ cmd: "get_blocked_domains" });
    dbg("blocked list resp:", list);
    if (list.err) { msg.textContent = "Errore lettura domini: " + list.err; return; }

    const blocked = (list.resp && Array.isArray(list.resp.domains)) ? list.resp.domains : [];
    const matchedDomain = bestMatchDomain(host, blocked);
    dbg("matched domain:", matchedDomain);

    if (!matchedDomain) {
      msg.textContent = "Dominio non in blacklist. Procedo…";
      setTimeout(() => { location.href = target; }, 300);
      return;
    }

    // 3) concedi sblocco
    const minutes = parseInt(minutesSel.value, 10);
    const grant = await nativeNM({ cmd: "grant_unlock", domain: matchedDomain, minutes });
    dbg("grant_unlock resp:", grant);
    if (grant.err || !(grant.resp && grant.resp.ok)) {
      msg.textContent = "Errore sblocco: " + (grant.err || "risposta non valida");
      return;
    }

    // 4) attendi conferma sblocco
    msg.textContent = "Sbloccato. Verifico accesso…";
    const ok = await waitUntilUnlocked(matchedDomain, 15, 120);
    if (!ok) {
      msg.textContent = "Sblocco non confermato. Riprova.";
      return;
    }

    msg.textContent = "Sbloccato. Reindirizzamento…";
    setTimeout(() => { location.href = target; }, 150);
  });
})();
