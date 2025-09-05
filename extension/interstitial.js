function nativeNM(msg){
  return new Promise((resolve)=>{
    try{
      chrome.runtime.sendNativeMessage("com.naviglio.host", msg, (resp)=>{
        const err = chrome.runtime.lastError?.message || null;
        resolve({ resp, err });
      });
    }catch(e){ resolve({ resp:null, err:String(e) }); }
  });
}

function bestMatchDomain(host, list){
  return list.find(d => host === d || host.endsWith("."+d)) || null;
}

async function waitUntilUnlocked(domain, tries=15, delay=120){
  for (let i=0;i<tries;i++){
    const q = await nativeNM({ cmd:"get_unlock", domain });
    if (!q.err && q.resp && q.resp.active) return true;
    await new Promise(r=>setTimeout(r,delay));
  }
  return false;
}

(async ()=>{
  const params = new URLSearchParams(location.search);
  const target = params.get("target") || "about:blank";

  const formBtn = document.getElementById("btn");
  const cancelBtn = document.getElementById("cancel");
  const pwd = document.getElementById("pwd");
  const minutesSel = document.getElementById("minutes");
  const msg = document.getElementById("msg");

  cancelBtn.addEventListener("click", ()=>{
    msg.textContent = "Access denied.";
    setTimeout(()=>history.back(), 600);
  });

  formBtn.addEventListener("click", async ()=>{
    msg.textContent = "";

    const host = new URL(target).hostname;

    const check = await nativeNM({ cmd:"check_password", password: pwd.value });
    if (check.err){ msg.textContent = "Host not reachable: " + check.err; return; }
    if (!check.resp?.ok){ msg.textContent = "Wrong password."; pwd.value = ""; pwd.focus(); return; }

    const list = await nativeNM({ cmd:"get_blocked_domains" });
    if (list.err){ msg.textContent = "Error reading domains: " + list.err; return; }

    const blocked = Array.isArray(list.resp?.domains) ? list.resp.domains : [];
    const matched = bestMatchDomain(host, blocked);

    if (!matched){
      msg.textContent = "Domain not on the list. Continuing…";
      setTimeout(()=>{ location.href = target; }, 250);
      return;
    }

    const minutes = parseInt(minutesSel.value, 10);
    const grant = await nativeNM({ cmd:"grant_unlock", domain: matched, minutes });
    if (grant.err || !grant.resp?.ok){
      msg.textContent = "Unlock error: " + (grant.err || "invalid response");
      return;
    }

    msg.textContent = "Unlocked. Verifying…";
    const ok = await waitUntilUnlocked(matched, 15, 120);
    if (!ok){ msg.textContent = "Unlock not confirmed. Try again."; return; }

    msg.textContent = "Unlocked. Redirecting…";
    setTimeout(()=>{ location.href = target; }, 150);
  });
})();
