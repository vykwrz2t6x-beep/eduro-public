/* ---------- ВХОД ---------- */
function home(){
  view(`<div class="wrap fade"><h1>Проверка домашки</h1><p class="mute" style="margin:0 0 24px">Введи код, который прислал учитель</p>
  <div class="card"><label class="lbl">Код проверки</label><input id="code" placeholder="K7P2QX" autocapitalize="characters" autocomplete="off">
  <label class="lbl">Имя и фамилия</label><input id="name" autocomplete="name">
  <button class="btn block" id="go">Продолжить</button><div class="err" id="e"></div></div>
  <p style="text-align:center"><a href="#" id="tl" class="link">Я учитель</a></p></div>`);
  $("#tl").onclick=e=>{e.preventDefault();teacherLogin()};
  const q=new URLSearchParams(location.search).get("id");if(q)$("#code").value=q.toUpperCase();
  $("#go").onclick=e=>busy(e.currentTarget,async()=>{try{$("#e").textContent="";
    const code=$("#code").value.trim().toUpperCase(),name=$("#name").value.trim();
    if(!code)throw new Error("Введи код проверки");if(!name)throw new Error("Напиши имя");
    student(code,name,await api("/api/public/"+encodeURIComponent(code)))}catch(x){$("#e").textContent=x.message}});
}

/* ---------- ЗАКРЕПЛЁННОЕ УСЛОВИЕ ----------
   Ученик сам решает, когда пришпилить условие к верху экрана: кнопка в шапке задачи.
   Размер и смещение считаются по ВИДИМОЙ области (visualViewport), поэтому клавиатура
   на телефоне не съедает плашку и она остаётся видимой во время набора.
   Дёрганье убрано: смещение рисуется через transform (композитор, без layout),
   scroll/resize/focus схлопнуты в один rAF-кадр, will-change живёт только на время анимации. */
const ICON_PIN='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 17.5V22"/><path d="M8 3h8l-1 6.5 3 3V15H6v-2.5l3-3z"/></svg>';
const ICON_CHECK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>';

function setupTaskPeek(){
  const card=$("#task-card"),btn=$("#pin");
  if(!card||!btn)return;
  const src=card.querySelector(".tk-body");
  if(!src)return;
  // закреплять нечего: пустое условие (нет ни текста, ни картинок)
  if(!src.textContent.trim()&&!src.querySelector("img")){btn.remove();return}

  // страховка от двойной инициализации: старая плашка и её слушатели не должны остаться
  if(typeof window.peekDestroy==="function"){try{window.peekDestroy()}catch(e){}}
  document.querySelectorAll(".peek").forEach(x=>x.remove());

  const p=document.createElement("div");
  p.className="peek";p.setAttribute("aria-hidden","true");p.setAttribute("inert","");
  p.innerHTML='<div class="peek-head"><span class="peek-t">Условие</span><span class="peek-acts">'+
    '<button class="peek-up" type="button">↓ к заданию</button>'+
    '<button class="peek-off" type="button">Открепить</button></span></div><div class="peek-body"></div>';
  // клон без id: дубли id ломают getElementById и селекторы
  const clone=src.cloneNode(true);
  clone.querySelectorAll("[id]").forEach(n=>n.removeAttribute("id"));
  p.querySelector(".peek-body").appendChild(clone);
  document.body.appendChild(p);

  const pb=p.querySelector(".peek-body");
  let pinned=sessionStorage.getItem("peek")==="1";
  let raf=0,animT=0;

  // Читаем visualViewport и пишем переменные только по факту изменения.
  // --peek-top уходит в transform, а не в top: элемент с backdrop-filter не пересчитывает layout.
  const sync=()=>{
    raf=0;
    if(!pinned)return;
    const vv=window.visualViewport;
    const h=Math.max(120,Math.round((vv?vv.height:innerHeight)*0.34));
    const top=vv?Math.round(vv.offsetTop):0;
    if(p.style.getPropertyValue("--peek-h")!==h+"px")p.style.setProperty("--peek-h",h+"px");
    if(p.style.getPropertyValue("--peek-top")!==top+"px")p.style.setProperty("--peek-top",top+"px");
  };
  const queue=()=>{if(!raf)raf=requestAnimationFrame(sync)};
  const upd=()=>{p.classList.toggle("scrolled",pb.scrollTop>4)};
  let uraf=0;
  const queueUpd=()=>{if(!uraf)uraf=requestAnimationFrame(()=>{uraf=0;upd()})};

  const render=()=>{
    p.classList.toggle("on",pinned);
    p.setAttribute("aria-hidden",String(!pinned));
    if(pinned)p.removeAttribute("inert");else p.setAttribute("inert","");
    btn.innerHTML=pinned?ICON_CHECK+"Закреплено":ICON_PIN+"Закрепить сверху";
    btn.classList.toggle("on",pinned);
    btn.setAttribute("aria-pressed",String(pinned));
    const v=pinned?"1":"0";
    if(sessionStorage.getItem("peek")!==v)sessionStorage.setItem("peek",v);
    // will-change только на время перехода — иначе blur-слой висит в памяти постоянно
    p.classList.add("anim");
    clearTimeout(animT);animT=setTimeout(()=>p.classList.remove("anim"),380);
    sync();upd();
  };
  const toggle=()=>{pinned=!pinned;if(pinned)pb.scrollTop=0;render()};

  const toCard=()=>{
    const off=(pinned?p.getBoundingClientRect().height:0)+12;
    const y=card.getBoundingClientRect().top+window.scrollY-off;
    window.scrollTo({top:y,behavior:"smooth"});
  };

  btn.onclick=toggle;
  p.querySelector(".peek-up").onclick=toCard;
  p.querySelector(".peek-off").onclick=()=>{pinned=false;render()};
  pb.addEventListener("scroll",queueUpd,{passive:true});

  // клавиатура: iOS/Android меняют visualViewport (resize) и панорамируют его (scroll)
  const vv=window.visualViewport;
  if(vv){vv.addEventListener("resize",queue,{passive:true});vv.addEventListener("scroll",queue,{passive:true})}
  addEventListener("resize",queue,{passive:true});
  document.addEventListener("focusin",queue);
  document.addEventListener("focusout",queue);

  // снятие слушателей при уходе с экрана (иначе они копятся при каждом входе)
  window.peekDestroy=function(){
    clearTimeout(animT);
    if(raf)cancelAnimationFrame(raf);
    if(uraf)cancelAnimationFrame(uraf);
    raf=uraf=0;
    if(vv){vv.removeEventListener("resize",queue);vv.removeEventListener("scroll",queue)}
    removeEventListener("resize",queue);
    document.removeEventListener("focusin",queue);
    document.removeEventListener("focusout",queue);
    p.classList.remove("anim");
    p.remove();
    window.peekDestroy=null;
  };

  render();
}

/* ---------- УЧЕНИК ---------- */
function student(code,name,c){
  const taskHtml=`${md(c.task||"")}${(c.task_imgs||[]).map(u=>`<img class="prev" src="${esc(u)}" alt="Задача" loading="lazy" decoding="async" style="margin-top:12px">`).join("")}`;
  if(c.closed){
    view(`<div class="wrap fade"><h1>${esc(c.title)}</h1><p class="mute" style="margin:0 0 6px">${esc(name)}</p>
    <div class="card"><span class="lbl">Задача</span><div>${taskHtml}</div></div>
    <div class="card"><h2>Сдача завершена</h2><p class="mute" style="margin:0">Учитель закрыл приём работ по этой задаче.</p></div></div>`);
    return;
  }
  view(`<div class="wrap fade"><h1>${esc(c.title)}</h1><p class="mute" style="margin:0 0 6px">${esc(name)}</p>
  <div class="card" id="task-card"><div class="tk-head"><span class="lbl">Задача</span><button class="pin-btn" id="pin" type="button" aria-pressed="false">Закрепить сверху</button></div><div class="tk-body">${taskHtml}</div></div>
  <div class="card" id="s1"><span class="lbl">1. Фото решения</span>
  <label class="file"><input type="file" id="file" accept="image/*" multiple><span id="ft">Сфотографировать или выбрать фото (можно несколько)</span></label>
  <div class="thumbs" id="thumbs"></div>
  <button class="btn block" id="save" disabled>Распознать фото</button><div class="err" id="e1"></div>
  <p style="text-align:center;margin:14px 0 0"><a href="#" id="typeit" class="link">Или написать решение без фото</a></p></div>
  <div class="card hide" id="s2"><span class="lbl">2. Проверь текст</span><p id="hint" class="mute" style="margin:0 0 12px;font-size:15px">Если я ошибся при чтении, исправь.</p>
  <textarea id="txt" placeholder="Напиши решение"></textarea><button class="btn block" id="send">Отправить на проверку</button><div class="err" id="e2"></div></div>
  <div class="hide" id="res"></div></div>`);

  setupTaskPeek();

  // sid привязан к коду задачи: иначе id из прошлой домашки уезжает в следующую
  const sidKey="sid:"+code;
  const sid=()=>sessionStorage.getItem(sidKey);

  const photos=[];
  const MAXP=3; // сервер режет на 3 фото за 3 минуты — больше за раз и не нужно
  const thumbs=$("#thumbs");
  const refresh=()=>{$("#save").disabled=!photos.length;$("#save").textContent=photos.length?`Распознать фото (${photos.length})`:"Распознать фото";
    $("#ft").textContent=photos.length?"Добавить ещё фото":"Сфотографировать или выбрать фото (можно несколько)"};
  thumbs.onchange=refresh;

  $("#file").onchange=async e=>{let files=[...e.target.files];e.target.value="";
    if(photos.length+files.length>MAXP){
      files=files.slice(0,Math.max(0,MAXP-photos.length));
      if(!files.length){toast(`За раз — ${MAXP} фото. Сначала распознай эти`);return}
      toast(`Больше ${MAXP} фото за раз не нужно — взял первые`);
    }
    for(const f of files){try{photos.push(await shrink(f))}catch(x){$("#e1").textContent=x.message}}
    drawThumbs(thumbs,photos);refresh()};
  $("#typeit").onclick=e=>{e.preventDefault();$("#hint").textContent="Напиши решение текстом.";
    $("#s2").classList.remove("hide");$("#s2").classList.add("fade");$("#s2").scrollIntoView({behavior:"smooth",block:"start"});setTimeout(()=>$("#txt").focus(),300)};
  const tx=$("#txt");
  const nope=e=>{e.preventDefault();toast("Вставка отключена, напиши решение сам");};
  tx.addEventListener("paste",nope);
  tx.addEventListener("drop",nope);
  tx.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&String(e.key).toLowerCase()==="v")nope(e)});
  $("#save").onclick=e=>busy(e.currentTarget,async()=>{try{$("#e1").textContent="";
    thumbs.classList.add("scan");$("#save").textContent="Читаю почерк…";
    const r=await api("/api/ocr",{images_b64:photos.map(u=>u.split(",")[1])});
    $("#txt").value=r.text;
    // фото уже распознаны — освобождаем место под следующую порцию (лимит 3 за 3 минуты)
    photos.length=0;drawThumbs(thumbs,photos);
    $("#s2").classList.remove("hide");$("#s2").classList.add("fade");$("#s2").scrollIntoView({behavior:"smooth",block:"start"})}catch(x){$("#e1").textContent=x.message}finally{thumbs.classList.remove("scan");refresh()}});
  $("#send").onclick=e=>busy(e.currentTarget,async()=>{const R=$("#res");let stop;try{$("#e2").textContent="";
    $("#s1").classList.add("hide");$("#s2").classList.add("hide");R.className="result fade";stop=think(R,["Читаю решение…","Сверяю с критериями…","Считаю оценку…"]);
    const r=await api("/api/submit",{code,name,text:$("#txt").value,student_id:sid()});
    stop();stop=null;
    if(r.student_id)sessionStorage.setItem(sidKey,r.student_id);
    R.className="result fade";
    const score=(r.score===0||r.score)?r.score:"—",verdict=r.verdict||"",strong=r.strengths||[],weak=r.weaknesses||[];
    R.innerHTML=`<span class="lbl">Твоя оценка</span><div class="score">${esc(score)}<span style="font-size:28px">/10</span></div>
    <p style="font-size:18px;margin:12px 0 20px">${esc(verdict)}</p>
    <h2>Сильные стороны</h2><ul>${strong.map(s=>`<li>${esc(s)}</li>`).join("")||"<li>—</li>"}</ul>
    <h2>Над чем поработать</h2><ul>${weak.map(s=>`<li>${esc(s)}</li>`).join("")||"<li>—</li>"}</ul>
    <p class="mute" style="margin:0">Работа отправлена учителю.</p>`;window.scrollTo({top:0,behavior:"smooth"})}
    catch(x){stop&&stop();R.className="hide";$("#s1").classList.remove("hide");$("#s2").classList.remove("hide");$("#e2").textContent=x.message}});
}
