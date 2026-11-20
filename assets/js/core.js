/* API_BASE приходит из assets/js/config.js */
const API_BASE=String(window.API_BASE||"").replace(/\/+$/,"");


const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function md(t){
  let h=esc(t).split("\n").map(l=>l.replace(/^#{1,6}\s*(.+)$/,"<b>$1</b>").replace(/^\s*[-*•]\s+(.+)$/,"<li>$1</li>").replace(/^\s*\d+[.)]\s+(.+)$/,"<li>$1</li>")).join("\n");
  h=h.replace(/\*\*(.+?)\*\*/g,"<b>$1</b>").replace(/__(.+?)__/g,"<b>$1</b>").replace(/(^|[\s(])\*(?!\s)(.+?)\*/g,"$1<i>$2</i>").replace(/`([^`]+)`/g,"$1");
  return h.replace(/((?:<li>.*<\/li>\n?)+)/g,"<ul>$1</ul>").replace(/\n/g,"<br>").replace(/<\/ul><br>/g,"</ul>").replace(/<br><ul>/g,"<ul>");
}
let TOKEN=sessionStorage.getItem("t")||"";
async function api(path,body,method){
  const o={method:method||(body?"POST":"GET"),headers:{"Content-Type":"application/json","X-Teacher":TOKEN}};
  if(body)o.body=JSON.stringify(body);
  const r=await fetch(API_BASE+path,o);const j=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(typeof j.detail==="string"?j.detail:"Ошибка");return j;
}
const busy=async(btn,fn)=>{btn.classList.add("ld");btn.disabled=true;try{await fn()}finally{btn.classList.remove("ld");btn.disabled=false}};
function toast(t){document.querySelectorAll(".toast").forEach(x=>x.remove());const e=document.createElement("div");e.className="toast";e.textContent=t;document.body.appendChild(e);setTimeout(()=>{e.style.transition="opacity .3s";e.style.opacity=0;setTimeout(()=>e.remove(),300)},2200)}
async function copy(t){
  try{await navigator.clipboard.writeText(t)}
  catch(e){const a=document.createElement("textarea");a.value=t;a.style.cssText="position:fixed;opacity:0";document.body.appendChild(a);a.select();document.execCommand("copy");a.remove()}
  toast("Скопировано");
}
function shrink(file){return new Promise((res,rej)=>{const im=new Image();im.onload=()=>{const k=Math.min(1,1600/Math.max(im.width,im.height));
  const c=document.createElement("canvas");c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext("2d").drawImage(im,0,0,c.width,c.height);
  URL.revokeObjectURL(im.src);res(c.toDataURL("image/jpeg",.85))};im.onerror=()=>rej(new Error("Не удалось открыть фото"));im.src=URL.createObjectURL(file)})}
function drawThumbs(el,list){
  el.innerHTML=list.map((u,i)=>`<div class="thumb"><img src="${u}" alt=""><button data-i="${i}" aria-label="Удалить фото">×</button></div>`).join("");
  el.querySelectorAll("button").forEach(b=>b.onclick=()=>{list.splice(+b.dataset.i,1);drawThumbs(el,list);if(el.onchange)el.onchange()});
}
const view=h=>{$("#root").innerHTML=h;window.scrollTo(0,0)};
const sk=(n,h=74)=>Array(n).fill(`<div class="sk" style="height:${h}px;margin:10px 0"></div>`).join("");
// «ИИ думает»: понятный индикатор с меняющимися этапами
function think(el,steps){
  el.innerHTML=`<div class="think fade"><div class="orb"><i></i><i></i><i></i></div><b class="tt">${steps[0]}</b><div class="mute" style="font-size:14px;margin-top:4px">Обычно несколько секунд</div></div>`;
  let n=0;const t=setInterval(()=>{const e=el.querySelector(".tt");if(!e)return clearInterval(t);n=Math.min(n+1,steps.length-1);e.style.opacity=0;setTimeout(()=>{e.textContent=steps[n];e.style.opacity=1},200)},2000);
  return()=>clearInterval(t)}
// блик стекла следует за курсором
document.addEventListener("pointermove",e=>{const g=e.target.closest&&e.target.closest(".card,.blk,.item,.result");if(g){const r=g.getBoundingClientRect();g.style.setProperty("--mx",e.clientX-r.left+"px");g.style.setProperty("--my",e.clientY-r.top+"px")}},{passive:true});
function modal(o){return new Promise(res=>{
  const ov=document.createElement("div");ov.className="ov";
  ov.innerHTML=`<div class="sheet"><h2>${esc(o.title)}</h2>${o.text?`<p class="mute" style="margin:0 0 16px">${esc(o.text)}</p>`:""}${o.input?`<input id="mi" placeholder="${esc(o.input)}" autocomplete="off">`:""}<div class="row"><button class="btn dark" id="mc">Отмена</button><button class="btn" id="mo">${esc(o.ok||"ОК")}</button></div></div>`;
  document.body.appendChild(ov);
  const close=v=>{ov.classList.add("out");setTimeout(()=>ov.remove(),230);res(v)};
  const inp=ov.querySelector("#mi");
  ov.onclick=e=>{if(e.target===ov)close(null)};
  ov.querySelector("#mc").onclick=()=>close(null);
  ov.querySelector("#mo").onclick=()=>close(inp?(inp.value.trim()||null):true);
  if(inp){inp.focus();inp.onkeydown=e=>{if(e.key==="Enter")ov.querySelector("#mo").click()}}
})}
function countUp(el,to){if(isNaN(to)){el.textContent="—";return}const t0=performance.now();
  const f=n=>{const p=Math.min(1,(n-t0)/800);el.textContent=(to*(1-Math.pow(1-p,3))).toFixed(1);if(p<1)requestAnimationFrame(f)};requestAnimationFrame(f)}

