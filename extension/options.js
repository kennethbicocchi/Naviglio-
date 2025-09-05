// --- Native Messaging helper (pagine estensione possono chiamarlo direttamente)
function nm(msg){
  return new Promise((resolve)=>{
    try{
      chrome.runtime.sendNativeMessage("com.naviglio.host", msg, (resp)=>{
        const err = chrome.runtime.lastError ? chrome.runtime.lastError.message : null;
        resolve({ resp, err });
      });
    }catch(e){
      resolve({ resp:null, err:String(e) });
    }
  });
}

// Refs UI
const adminPwd = document.getElementById("adminPwd");
const unlockMins = document.getElementById("unlockMins");
const btnUnlock = document.getElementById("btnUnlock");
const msgAuth = document.getElementById("msgAuth");

const domainInput = document.getElementById("domainInput");
const btnAddDomain = document.getElementById("btnAddDomain");
const btnSaveDomains = document.getElementById("btnSaveDomains");
const btnReloadDomains = document.getElementById("btnReloadDomains");
const domainsList = document.getElementById("domainsList");
const msgDom = document.getElementById("msgDom");
const domainsCard = document.getElementById("domainsCard");
const lockBadge = document.getElementById("lockBadge");

// Stato
let domains = [];
let adminUnlocked = false;

// --- Lock handling (persistenza sessione: 10/30/60 min)
const KEY_UNTIL = "nav_opts_unlocked_until";

function isUnlocked() {
  const ts = Number(sessionStorage.getItem(KEY_UNTIL) || 0);
  return ts > Date.now();
}

function lockUI() {
  adminUnlocked = false;
  domainsCard.classList.add("locked");
  domainInput.disabled = true;
  btnAddDomain.disabled = true;
  btnSaveDomains.disabled = true;
  lockBadge.textContent = "bloccate";
  msgAuth.textContent = "Inserisci la password per modificare la lista.";
  msgAuth.className = "msg muted";
}

function unlockUI(minutes) {
  adminUnlocked = true;
  domainsCard.classList.remove("locked");
  domainInput.disabled = false;
  btnAddDomain.disabled = false;
  btnSaveDomains.disabled = false;
  lockBadge.textContent = "sbloccate";
  msgAuth.textContent = `Sblocco attivo per ${minutes} minuti.`;
  msgAuth.className = "msg ok";

  const until = Date.now() + minutes * 60 * 1000;
  sessionStorage.setItem(KEY_UNTIL, String(until));
}

function ensureUnlocked() {
  if (adminUnlocked) return true;
  msgDom.innerHTML = `<span class="err">Per modificare la lista devi sbloccare con la password.</span>`;
  return false;
}

// --- Helpers domini
function normDomain(s){
  s = (s || "").trim().toLowerCase();
  try {
    if (s.startsWith("http://") || s.startsWith("https://")) s = new URL(s).hostname;
  } catch {}
  if (s.startsWith(".")) s = s.slice(1);
  return s;
}

function renderDomains(){
  domainsList.innerHTML = "";
  if (!domains.length) msgDom.textContent = "Nessun dominio in lista.";
  else msgDom.textContent = "";

  domains.forEach((d, idx)=>{
    const li = document.createElement("li");
    const left = document.createElement("span");
    left.textContent = d;
    li.appendChild(left);

    if (adminUnlocked) {
      const right = document.createElement("span");
      right.className = "right";
      const rm = document.createElement("button");
      rm.className = "secondary edit-only";
      rm.textContent = "Rimuovi";
      rm.addEventListener("click", ()=>{
        if (!ensureUnlocked()) return;
        domains.splice(idx,1);
        renderDomains();
      });
      right.appendChild(rm);
      li.appendChild(right);
    }
    domainsList.appendChild(li);
  });
}

// --- Caricamento iniziale lista (sempre consentito in sola lettura)
async function loadDomains(){
  msgDom.textContent = "Carico lista...";
  const r = await nm({ cmd:"get_blocked_domains" });
  if (r.err){
    msgDom.innerHTML = `<span class="err">Errore lettura: ${r.err}</span>`;
    domains = [];
  } else {
    domains = Array.isArray(r.resp?.domains) ? r.resp.domains.slice().sort() : [];
    msgDom.textContent = "";
  }
  renderDomains();
}

// --- Sblocco con password
btnUnlock.addEventListener("click", async ()=>{
  msgAuth.textContent = "Verifica password…";
  msgAuth.className = "msg muted";

  const pwd = adminPwd.value || "";
  if (!pwd) { msgAuth.innerHTML = `<span class="err">Inserisci la password.</span>`; return; }

  const check = await nm({ cmd:"check_password", password: pwd });
  if (check.err){ msgAuth.innerHTML = `<span class="err">Host non raggiungibile: ${check.err}</span>`; return; }
  if (!check.resp?.ok){ msgAuth.innerHTML = `<span class="err">Password errata.</span>`; return; }

  const mins = parseInt(unlockMins.value,10) || 10;
  unlockUI(mins);
  adminPwd.value = "";
});

// --- Modifiche domini (bloccate se non sbloccato)
btnAddDomain.addEventListener("click", ()=>{
  if (!ensureUnlocked()) return;
  const d = normDomain(domainInput.value);
  if (!d){ msgDom.textContent = "Inserisci un dominio valido."; return; }
  if (domains.includes(d)){ msgDom.textContent = "Dominio già presente."; return; }
  domains.push(d);
  domains.sort();
  domainInput.value = "";
  renderDomains();
});

btnSaveDomains.addEventListener("click", async ()=>{
  if (!ensureUnlocked()) return;
  msgDom.textContent = "Salvataggio in corso...";
  const r = await nm({ cmd:"sync_blocked", domains });
  if (r.err) {
    msgDom.innerHTML = `<span class="err">Errore salvataggio: ${r.err}</span>`;
  } else if (!r.resp?.ok) {
    msgDom.innerHTML = `<span class="err">Errore salvataggio: ${r.resp?.err || "sconosciuto"}</span>`;
  } else {
    msgDom.innerHTML = `<span class="ok">✅ Salvato (${r.resp.count} domini).</span>`;
  }
});

// Ricarica (ammesso anche se locked: sola lettura)
btnReloadDomains.addEventListener("click", loadDomains);

// --- Avvio
(async ()=>{
  await loadDomains();

  // Ripristina eventuale sblocco di sessione
  if (isUnlocked()){
    const remain = Math.max(1, Math.round((Number(sessionStorage.getItem(KEY_UNTIL)) - Date.now()) / 60000));
    unlockUI(remain);
  } else {
    lockUI();
  }
})();
