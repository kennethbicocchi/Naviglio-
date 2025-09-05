function nm(msg){
  return new Promise((resolve)=>{
    try{
      chrome.runtime.sendMessage({ type:"native", msg }, resolve);
    }catch(e){ resolve({ ok:false, err:String(e) }); }
  });
}

const lockStatus = document.getElementById("lockStatus");
const pwd = document.getElementById("pwd");
const minutesSel = document.getElementById("minutes");
const btnUnlock = document.getElementById("btnUnlock");
const msgUnlock = document.getElementById("msgUnlock");

const oldPwd = document.getElementById("oldPwd");
const newPwd1 = document.getElementById("newPwd1");
const newPwd2 = document.getElementById("newPwd2");
const btnChangePwd = document.getElementById("btnChangePwd");
const msgPwd = document.getElementById("msgPwd");

const domainInput = document.getElementById("domainInput");
const btnAdd = document.getElementById("btnAdd");
const btnReload = document.getElementById("btnReload");
const btnSave = document.getElementById("btnSave");
const list = document.getElementById("list");
const msgList = document.getElementById("msgList");

let domains = [];

function render(){
  list.innerHTML = "";
  if (!domains.length){ msgList.textContent = "No blocked domains."; return; }
  msgList.textContent = "";
  domains.forEach((d, i)=>{
    const li = document.createElement("li");
    li.textContent = d + " ";
    const b = document.createElement("button");
    b.textContent = "Remove";
    b.onclick = () => { domains.splice(i,1); render(); };
    li.appendChild(b);
    list.appendChild(li);
  });
}

// UNLOCK
btnUnlock.addEventListener("click", async ()=>{
  msgUnlock.textContent = "";
  const r = await nm({ cmd:"grant_unlock", domain:"__settings__", minutes: parseInt(minutesSel.value,10) });
  // We piggyback “__settings__” so host sets a timer; we only need the password check though:
  const chk = await nm({ cmd:"check_password", password: pwd.value || "" });
  if (chk?.ok) {
    lockStatus.textContent = "(unlocked)";
    msgUnlock.textContent = `Settings unlocked for ${minutesSel.value} minutes.`;
  } else {
    msgUnlock.textContent = "Wrong password or host not reachable.";
  }
});

// CHANGE PASSWORD
btnChangePwd.addEventListener("click", async ()=>{
  msgPwd.textContent = "";
  if (!oldPwd.value){ msgPwd.textContent = "Insert current password."; return; }
  if (newPwd1.value.length < 6){ msgPwd.textContent = "New password must be at least 6 characters."; return; }
  if (newPwd1.value !== newPwd2.value){ msgPwd.textContent = "New passwords do not match."; return; }

  const chk = await nm({ cmd:"check_password", password: oldPwd.value });
  if (!chk?.ok){ msgPwd.textContent = "Current password is incorrect."; return; }

  const r = await nm({ cmd:"set_password", old: oldPwd.value, "@new": newPwd1.value });
  msgPwd.textContent = r?.ok ? "✅ Password updated." : `❌ Error: ${r?.err || "unknown"}`;
  if (r?.ok){ oldPwd.value = newPwd1.value = newPwd2.value = ""; }
});

// DOMAINS
btnReload.addEventListener("click", async ()=>{
  msgList.textContent = "Loading…";
  const r = await nm({ cmd:"get_blocked_domains" });
  domains = Array.isArray(r?.domains) ? r.domains.slice().sort() : [];
  render();
});

btnAdd.addEventListener("click", ()=>{
  let d = (domainInput.value || "").trim().toLowerCase();
  try{
    if (d.startsWith("http://") || d.startsWith("https://")) d = new URL(d).hostname;
  }catch{}
  if (!d){ msgList.textContent = "Enter a valid domain."; return; }
  if (!domains.includes(d)){ domains.push(d); domains.sort(); }
  domainInput.value = ""; render();
});

btnSave.addEventListener("click", async ()=>{
  msgList.textContent = "Saving…";
  const r = await nm({ cmd:"sync_blocked", domains });
  msgList.textContent = r?.ok ? `✅ Saved (${r.count} domains).` : `❌ Error: ${r?.err || "unknown"}`;
});

// init
btnReload.click();
