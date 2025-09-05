const msg = document.getElementById("msg");
const clearBtn = document.getElementById("clearBtn");
const reloadBtn = document.getElementById("reloadBtn");

function native(message){
  return new Promise((resolve)=>{
    try{
      chrome.runtime.sendMessage({type:"native", msg:message}, resolve);
    }catch(e){ resolve({ ok:false, err:String(e) }); }
  });
}

clearBtn.addEventListener("click", async ()=>{
  msg.textContent = "Sending…";
  const r = await native({ cmd:"clear_unlocks" });
  msg.textContent = r?.ok ? "✅ Temporary unlocks cleared." : `❌ Error: ${r?.err || "host not reachable"}`;
});

// no tabs permission: broadcast -> content reloads only if focused
reloadBtn.addEventListener("click", ()=>{
  chrome.runtime.sendMessage({ type:"reload_if_active" });
  msg.textContent = "🔁 Reload requested.";
});
