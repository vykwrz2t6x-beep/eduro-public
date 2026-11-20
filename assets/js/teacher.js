/* ---------- УЧИТЕЛЬ ---------- */
function teacherLogin(){
  view(`<div class="wrap fade"><h1>Вход для учителя</h1><p class="mute" style="margin:0 0 24px">Введи свой ID</p>
  <div class="card"><label class="lbl">ID</label><input id="tid" placeholder="000-000-000-000-000" autocomplete="off">
  <button class="btn block" id="go">Войти</button><div class="err" id="e"></div></div>
  <p style="text-align:center"><a href="#" id="back" class="link">Я ученик</a></p></div>`);
  $("#back").onclick=e=>{e.preventDefault();home()};
  $("#tid").onkeydown=e=>{if(e.key==="Enter")$("#go").click()};
  $("#go").onclick=e=>busy(e.currentTarget,async()=>{try{TOKEN=$("#tid").value.trim();await api("/api/teacher/login",{id:TOKEN});
    sessionStorage.setItem("t",TOKEN);shell("create")}catch(x){TOKEN="";$("#e").textContent="Неверный ID"}});
}
const ICON={
 create:'<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
 results:'<svg viewBox="0 0 24 24"><path d="M5 20V10M12 20V4M19 20v-7"/></svg>',
 ask:'<svg viewBox="0 0 24 24"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>',
 out:'<svg viewBox="0 0 24 24"><path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h9"/></svg>'};
const PAGES={create:()=>pCreate(),results:()=>pResults(),ask:()=>pAsk()};
let PAGE="create";
function movePill(instant){
  const b=document.querySelector(".nav.on"),p=$("#pill");if(!b||!p)return;
  if(instant)p.style.transition="none";
  p.style.width=b.offsetWidth+"px";p.style.height=b.offsetHeight+"px";
  p.style.transform=`translate(${b.offsetLeft}px,${b.offsetTop}px)`;
  if(instant){void p.offsetWidth;p.style.transition=""}
}
addEventListener("resize",()=>movePill(true));
function shell(page){
  const nav=[["create","Создать"],["results","Результаты"],["ask","Спросить ИИ"]];
  view(`<div class="app"><nav class="side"><i class="pill" id="pill"></i><div class="logo">Проверка ДЗ</div>
  ${nav.map(n=>`<button class="nav" data-p="${n[0]}">${ICON[n[0]]}<span>${n[1]}</span></button>`).join("")}
  <button class="nav" id="logout">${ICON.out}<span>Выйти</span></button></nav><main class="main" id="main"></main></div>`);
  document.querySelectorAll(".nav[data-p]").forEach(b=>b.onclick=()=>{if(b.dataset.p!==PAGE)go(b.dataset.p)});
  $("#logout").onclick=async()=>{if(await modal({title:"Выйти?",text:"Нужно будет снова ввести ID.",ok:"Выйти"})){TOKEN="";sessionStorage.clear();home()}};
  go(page,true);
}
function go(page,first){
  PAGE=page;
  document.querySelectorAll(".nav[data-p]").forEach(b=>b.classList.toggle("on",b.dataset.p===page));
  movePill(first);
  const m=$("#main");m.classList.remove("fade");void m.offsetWidth;m.classList.add("fade");
  window.scrollTo(0,0);PAGES[page]();
}

function blk(k,label,ph,extra=""){
  return `<div class="blk" data-k="${k}"><div class="bar"></div>
    <div class="blkhead"><span class="lbl" style="margin:0">${label}</span></div>
    <div class="drop" tabindex="0" id="drop-${k}">
      <label class="fbtn">Добавить фото<input type="file" accept="image/*" multiple id="fi-${k}"></label>
      <span class="mute" style="font-size:14px">или вставь фото (Ctrl+V)</span>
    </div>
    <div class="thumbs" id="thumbs-${k}"></div>
    ${extra}
    <textarea id="t-${k}" placeholder="${ph}"></textarea>
  </div>`;
}
let S={task:{imgs:[]},reference:{imgs:[]},criteria:{imgs:[]}};
let TPLS=[];
const KEYS=["task","reference","criteria"];
function mark(){KEYS.forEach(k=>{const d=document.querySelector(`#tabs [data-t="${k}"] .dot`);if(d)d.classList.toggle("y",!!($("#t-"+k).value.trim()||S[k].imgs.length))})}

async function addPhotos(k,files){
  const b=document.querySelector(`.blk[data-k="${k}"]`),t=$("#t-"+k),l=$("#drop-"+k).querySelector(".mute"),th=$("#thumbs-"+k);
  b.classList.add("ocr");l.textContent="Распознаю текст…";t.readOnly=true;t.classList.add("shim");
  try{
    const urls=[];for(const f of files)urls.push(await shrink(f));
    S[k].imgs.push(...urls);drawThumbs(th,S[k].imgs);th.classList.add("scan");
    const r=await api("/api/ocr",{images_b64:urls.map(u=>u.split(",")[1])});
    const cur=t.value.trim();t.value=cur?cur+"\n\n"+r.text:r.text;
    toast(`Фото добавлено: ${urls.length}. Проверь текст`);
  }catch(x){toast(x.message)}
  finally{b.classList.remove("ocr");th.classList.remove("scan");t.readOnly=false;t.classList.remove("shim");l.textContent="или вставь фото (Ctrl+V)";mark()}
}
function bindBlocks(){
  KEYS.forEach(k=>{
    $("#fi-"+k).onchange=e=>{const files=[...e.target.files];e.target.value="";if(files.length)addPhotos(k,files)};
    $("#t-"+k).oninput=mark;$("#thumbs-"+k).onchange=mark;
    document.querySelector(`.blk[data-k="${k}"]`).addEventListener("paste",e=>{
      const items=[...(e.clipboardData?.items||[])].filter(i=>i.type.startsWith("image/"));
      if(items.length){e.preventDefault();addPhotos(k,items.map(i=>i.getAsFile()).filter(Boolean))}
    });
  });
}
function renderTpls(){
  const sel=$("#tpl");if(!sel)return;
  sel.innerHTML=`<option value="">Сохранённые критерии</option>`+TPLS.map(t=>`<option value="${t.id}">${esc(t.title)}</option>`).join("");
}
async function loadTpls(){try{TPLS=await api("/api/criteria-templates");renderTpls()}catch(e){}}

function pCreate(){
  S={task:{imgs:[]},reference:{imgs:[]},criteria:{imgs:[]}};
  $("#main").innerHTML=`<h1>Создать ДЗ</h1><p class="mute" style="margin:0 0 24px">Задача, эталонное решение и критерии оценки</p><div id="form"></div>`;
  openForm();
}

function openForm(){
  const critTools=`<div class="tools"><select id="tpl"><option value="">Сохранённые критерии</option></select>
    <button class="btn soft small" id="tplsave">Сохранить критерий</button></div>`;
  const tabs=[["task","Задача"],["reference","Эталон"],["criteria","Критерии"]];
  $("#form").innerHTML=`
    <div class="card" style="margin-top:0"><label class="lbl">Заголовок</label><input id="title" placeholder="Например: Квадратные уравнения, №5" style="margin:0"></div>
    <div class="seg" id="tabs"><i class="sth"></i>${tabs.map(t=>`<button data-t="${t[0]}">${t[1]}<i class="dot"></i></button>`).join("")}</div>
    ${blk("task","Задача","Условие задачи")}
    ${blk("reference","Эталонное решение","Эталонное решение (желательно)")}
    ${blk("criteria","Критерии оценки 1–10","10 — полное верное решение с пояснениями\n7 — верный ход, ошибка в вычислениях\n4 — решение начато, но неверно",critTools)}
    <button class="btn block" id="mk" style="margin-top:6px">Создать ссылку</button><div class="err" id="e"></div><div id="result"></div>`;

  const showTab=t=>{
    $("#tabs").style.setProperty("--i",KEYS.indexOf(t));
    document.querySelectorAll("#tabs button").forEach(x=>x.classList.toggle("on",x.dataset.t===t));
    document.querySelectorAll(".blk").forEach(b=>{const on=b.dataset.k===t,was=!b.classList.contains("hide");
      b.classList.toggle("hide",!on);if(on&&!was){b.classList.remove("fade");void b.offsetWidth;b.classList.add("fade")}});
  };
  document.querySelectorAll("#tabs button").forEach(b=>b.onclick=()=>showTab(b.dataset.t));
  showTab("task");
  bindBlocks();renderTpls();loadTpls();

  $("#tpl").onchange=e=>{const t=TPLS.find(x=>x.id===e.target.value);if(!t)return;
    $("#t-criteria").value=t.criteria||"";
    S.criteria.imgs=[...(t.criteria_imgs||[])];
    drawThumbs($("#thumbs-criteria"),S.criteria.imgs);mark();toast("Критерии подставлены");
  };
  $("#tplsave").onclick=async e=>{
    const btn=e.currentTarget,text=$("#t-criteria").value.trim();
    if(!text&&!S.criteria.imgs.length){toast("Сначала заполни критерии");return}
    const title=await modal({title:"Сохранить критерии",text:"Они появятся в списке шаблонов.",input:"Например: Алгебра 8 класс",ok:"Сохранить"});
    if(!title)return;
    await busy(btn,async()=>{try{
      await api("/api/criteria-templates",{title,criteria:text,criteria_imgs:[...S.criteria.imgs]});
      toast("Критерий сохранён");await loadTpls()}catch(x){toast(x.message)}});
  };

  $("#mk").onclick=e=>busy(e.currentTarget,async()=>{try{$("#e").textContent="";
    const title=$("#title").value.trim();if(!title){$("#title").focus();throw new Error("Добавь заголовок")}
    const body={title,
      task:$("#t-task").value.trim(),reference:$("#t-reference").value.trim(),criteria:$("#t-criteria").value.trim(),
      task_imgs:S.task.imgs,reference_imgs:S.reference.imgs,criteria_imgs:S.criteria.imgs};
    if(!body.task&&!body.task_imgs.length){showTab("task");throw new Error("Добавь задачу (текст или фото)")}
    if(!body.criteria&&!body.criteria_imgs.length){showTab("criteria");throw new Error("Добавь критерии оценки")}
    const r=await api("/api/checks",body);
    const link=r.link||(location.origin+"/?id="+r.code);
    const msg=`Домашнее задание: ${title}\nСсылка: ${link}\nКод для сдачи: ${r.code}`;
    $("#result").innerHTML=`<div class="result fade">
      <svg class="ck" viewBox="0 0 52 52"><circle cx="26" cy="26" r="24"/><path d="M15 27l8 8 15-16"/></svg>
      <h2>Проверка создана</h2>
      <div class="msgbox">${esc(msg)}</div>
      <div class="row"><button class="btn" id="cp">Скопировать сообщение</button><button class="btn soft" id="cl">Скопировать ссылку</button>${navigator.share?'<button class="btn soft" id="sh">Поделиться</button>':""}</div>
    </div>`;
    $("#cp").onclick=()=>copy(msg);
    $("#cl").onclick=()=>copy(link);
    if($("#sh"))$("#sh").onclick=()=>navigator.share({text:msg}).catch(()=>{});
    $("#result").scrollIntoView({behavior:"smooth",block:"start"})}catch(x){$("#e").textContent=x.message}});
}

async function pResults(){
  $("#main").innerHTML=`<h1>Результаты</h1><p class="mute" style="margin:0 0 14px">Выбери задачу</p><div id="list">${sk(4)}</div>`;
  try{const cs=await api("/api/checks");
  $("#list").className="stg";
  $("#list").innerHTML=cs.map((c,i)=>`<div class="item" style="--i:${Math.min(i,10)}" data-id="${c.id}"><div><b>${esc(c.title)}</b>
    <div class="mute" style="font-size:14px">код ${esc(c.code)}${c.closed?" · сдача завершена":""}</div></div>
    <span class="badge">${c.count} сдали</span></div>`).join("")||'<p class="mute">Пока нет проверок</p>';
  document.querySelectorAll(".item").forEach(i=>i.onclick=()=>pCheck(i.dataset.id))}catch(x){$("#list").innerHTML=`<p class="err">${esc(x.message)}</p>`}
}
async function pCheck(id){
  $("#main").classList.remove("fade");void $("#main").offsetWidth;$("#main").classList.add("fade");window.scrollTo(0,0);
  $("#main").innerHTML=`<p style="margin:0 0 14px"><a href="#" id="back" class="link">‹ Все задачи</a></p><div id="detail">${sk(1,40)}${sk(1,150)}${sk(3,90)}</div>`;
  $("#back").onclick=e=>{e.preventDefault();$("#main").classList.remove("fade");void $("#main").offsetWidth;$("#main").classList.add("fade");pResults()};
  try{const r=await api(`/api/checks/${id}/results`);
  const ch=r.check,n=r.submissions.length;
  const avg=n?r.submissions.reduce((a,s)=>a+s.score,0)/n:NaN;
  $("#detail").innerHTML=`<h1>${esc(ch.title)}</h1>
  <div class="manage" style="margin:10px 0 16px"><span class="status ${ch.closed?"closed":""}">${ch.closed?"Сдача завершена":"Сдача открыта"}</span></div>
  <div class="manage">
    <button class="btn ${ch.closed?"soft":"dark"} small" id="toggle">${ch.closed?"Открыть сдачу":"Завершить сдачу"}</button>
    <button class="danger" id="del">Удалить проверку</button>
  </div>
  <div class="card"><h2>Класс в целом <span class="badge">средняя <span id="avg">—</span></span></h2>
  <div id="sm">${ch.summary?md(ch.summary):'<span class="mute">Сводка ещё не создана</span>'}</div>
  <button class="btn soft" id="rs" style="margin-top:14px">Обновить сводку</button></div>
  <h2 style="margin-top:26px">Ученики</h2><div class="stg">${r.submissions.map((s,i)=>`<div class="card" style="--i:${Math.min(i,10)}"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><b>${esc(s.name)}</b><span class="badge">${s.score}/10</span></div>
  <div class="sbar"><i style="--w:${Math.max(0,Math.min(1,s.score/10))}"></i></div>
  <p style="margin:10px 0">${esc(s.brief)}</p><details><summary>Подробнее</summary>
  <p><b>Вердикт:</b> ${esc(s.verdict)}</p><b>Сильные</b><ul>${(s.strengths||[]).map(x=>`<li>${esc(x)}</li>`).join("")}</ul>
  <b>Слабые</b><ul>${(s.weaknesses||[]).map(x=>`<li>${esc(x)}</li>`).join("")}</ul><b>Решение ученика</b><p class="mute" style="overflow-wrap:anywhere">${esc(s.text).replace(/\n/g,"<br>")}</p></details></div>`).join("")||'<p class="mute">Пока никто не сдал</p>'}</div>`;
  countUp($("#avg"),avg);

  $("#toggle").onclick=e=>busy(e.currentTarget,async()=>{try{
    await api(`/api/checks/${id}`,{closed:!ch.closed},"PATCH");toast(ch.closed?"Сдача открыта":"Сдача завершена");pCheck(id)}catch(x){toast(x.message)}});
  $("#del").onclick=async()=>{
    if(!await modal({title:"Удалить проверку?",text:`«${ch.title}» и все работы учеников будут удалены. Это нельзя отменить.`,ok:"Удалить"}))return;
    try{await api(`/api/checks/${id}`,null,"DELETE");toast("Проверка удалена");pResults()}catch(x){toast(x.message)}};
  $("#rs").onclick=e=>busy(e.currentTarget,async()=>{const stop=think($("#sm"),["Читаю все работы…","Ищу общие ошибки…","Пишу сводку…"]);try{
    const s=(await api(`/api/checks/${id}/summary`,{})).summary;stop();
    $("#sm").innerHTML=md(s);$("#sm").classList.remove("fade");void $("#sm").offsetWidth;$("#sm").classList.add("fade")}
    catch(x){stop();$("#sm").innerHTML=ch.summary?md(ch.summary):"";toast(x.message)}})}catch(x){$("#detail").innerHTML=`<p class="err">${esc(x.message)}</p>`}
}
async function pAsk(){
  let hist=[];
  $("#main").innerHTML=`<h1>Спросить ИИ</h1><p class="mute" style="margin:0 0 16px">Про класс или конкретного ученика</p>
  <select id="sel"><option value="">Все последние проверки</option></select>
  <div class="chips" id="chips">${["Кто хуже всех справился?","Какие частые ошибки?","Кому нужна помощь?"].map(t=>`<button class="chip">${t}</button>`).join("")}</div>
  <div class="chat" id="chat"></div>
  <div class="ask"><input id="q" placeholder="Кто хуже всех справился?" enterkeyhint="send"><button class="btn" id="s">Спросить</button></div>`;
  api("/api/checks").then(cs=>{$("#sel").insertAdjacentHTML("beforeend",cs.map(c=>`<option value="${c.id}">${esc(c.title)}</option>`).join(""))}).catch(()=>{});
  const add=(c,t,h)=>{$("#chat").insertAdjacentHTML("beforeend",`<div class="msg ${c}">${h?md(t):esc(t)}</div>`);$("#chat").lastElementChild.scrollIntoView({block:"nearest",behavior:"smooth"})};
  const go=()=>busy($("#s"),async()=>{const q=$("#q").value.trim();if(!q)return;$("#q").value="";$("#chips").classList.add("hide");add("u",q);
    $("#chat").insertAdjacentHTML("beforeend",`<div class="msg a typing" id="ty"><i></i><i></i><i></i></div>`);$("#ty").scrollIntoView({block:"nearest",behavior:"smooth"});
    try{const r=await api("/api/ask",{question:q,check_id:$("#sel").value||null,history:hist});
      $("#ty").remove();add("a",r.answer,true);hist.push({role:"user",content:q},{role:"assistant",content:r.answer})}catch(x){$("#ty")?.remove();add("a","Ошибка: "+x.message)}});
  document.querySelectorAll(".chip").forEach(c=>c.onclick=()=>{$("#q").value=c.textContent;go()});
  $("#s").onclick=go;$("#q").onkeydown=e=>{if(e.key==="Enter")go()};
}
