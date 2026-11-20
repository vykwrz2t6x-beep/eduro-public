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
   Размер считается по ВИДИМОЙ области (visualViewport), поэтому клавиатура
   на телефоне не съедает плашку и она остаётся видимой во время набора. */
const ICON_PIN='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 17.5V22"/><path d="M8 3h8l-1 6.5 3 3V15H6v-2.5l3-3z"/></svg>';
const ICON_CHECK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>';

function setupTaskPeek(){
  const card=$("#task-card"),btn=$("#pin");
  if(!card||!btn)return;
  const src=card.querySelector(".tk-body");
  if(!src)return;

  const p=document.createElement("div");
  p.className="peek";p.id="peek";p.setAttribute("aria-hidden","true");
  p.innerHTML='<div class="peek-head"><span class="peek-t">Условие</span><span class="peek-acts">'+
    '<button class="peek-up" type="button">↓ к заданию</button>'+
    '<button class="peek-off" type="button">Открепить</button></span></div><div class="peek-body"></div>';
  p.querySelector(".peek-body").appendChild(src.cloneNode(true));
  document.body.appendChild(p);

  const pb=p.querySelector(".peek-body");
  let pinned=sessionStorage.getItem("peek")==="1";

  // размер и позиция — по видимой области: клавиатура уменьшает vv.height и плашка сжимается.
  // Пишем переменные ТОЛЬКО при реальном изменении: иначе каждый кадр скролла вызывал
  // пересчёт layout у элемента с backdrop-filter, и анимация шла в 30 fps.
  let lastH=0,lastT=-1;
  const sync=()=>{
    if(!pinned)return;
    const vv=window.visualViewport;
    const h=Math.max(120,Math.round((vv?vv.height:innerHeight)*0.34));
    const top=vv?Math.round(vv.offsetTop):0;
    if(h!==lastH){lastH=h;p.style.setProperty("--peek-h",h+"px")}
    if(top!==lastT){lastT=top;p.style.setProperty("--peek-top",top+"px")}
  };
  const upd=()=>{const end=pb.scrollTop+pb.clientHeight>=pb.scrollHeight-4;
    p.classList.toggle("has-more",!end);p.classList.toggle("scrolled",pb.scrollTop>4)};

  const render=()=>{
    p.classList.toggle("on",pinned);
    p.setAttribute("aria-hidden",String(!pinned));
    btn.innerHTML=pinned?ICON_CHECK+"Закреплено":ICON_PIN+"Закрепить сверху";
    btn.classList.toggle("on",pinned);
    sessionStorage.setItem("peek",pinned?"1":"0");
    lastH=0;lastT=-1;sync();upd();
  };
  const toggle=()=>{pinned=!pinned;render();if(pinned)pb.scrollTop=0};

  btn.onclick=toggle;
  p.querySelector(".peek-up").onclick=()=>{card.scrollIntoView({behavior:"smooth",block:"start"})};
  p.querySelector(".peek-off").onclick=()=>{pinned=false;render()};
  pb.addEventListener("scroll",upd,{passive:true});

  // клавиатура: iOS/Android меняют visualViewport, а не layout — ловим и то и это
  if(window.visualViewport){
    visualViewport.addEventListener("resize",sync,{passive:true});
  }
  addEventListener("resize",sync,{passive:true});
  addEventListener("orientationchange",()=>setTimeout(sync,250));
  document.addEventListener("focusin",()=>setTimeout(sync,300));
  document.addEventListener("focusout",()=>setTimeout(sync,300));

  render();
}

/* ---------- УЧЕНИК ---------- */
function student(code,name,c){
  const taskHtml=`${md(c.task||"")}${(c.task_imgs||[]).map(u=>`<img class="prev" src="${u}" alt="Задача" style="margin-top:12px">`).join("")}`;
  if(c.closed){
    view(`<div class="wrap fade"><h1>${esc(c.title)}</h1><p class="mute" style="margin:0 0 6px">${esc(name)}</p>
    <div class="card"><span class="lbl">Задача</span><div>${taskHtml}</div></div>
    <div class="card"><h2>Сдача завершена</h2><p class="mute" style="margin:0">Учитель закрыл приём работ по этой задаче.</p></div></div>`);
    return;
  }
  view(`<div class="wrap fade"><h1>${esc(c.title)}</h1><p class="mute" style="margin:0 0 6px">${esc(name)}</p>
  <div class="card" id="task-card"><div class="tk-head"><span class="lbl">Задача</span><button class="pin-btn" id="pin" type="button">Закрепить сверху</button></div><div class="tk-body">${taskHtml}</div></div>
  <div class="card" id="s1"><span class="lbl">1. Фото решения</span>
  <label class="file"><input type="file" id="file" accept="image/*" multiple><span id="ft">Сфотографировать или выбрать фото (можно несколько)</span></label>
  <div class="thumbs" id="thumbs"></div>
  <button class="btn block" id="save" disabled>Распознать фото</button><div class="err" id="e1"></div>
  <p style="text-align:center;margin:14px 0 0"><a href="#" id="typeit" class="link">Или написать решение без фото</a></p></div>
  <div class="card hide" id="s2"><span class="lbl">2. Проверь текст</span><p id="hint" class="mute" style="margin:0 0 12px;font-size:15px">Если я ошибся при чтении, исправь.</p>
  <textarea id="txt" placeholder="Напиши решение"></textarea><button class="btn block" id="send">Отправить на проверку</button><div class="err" id="e2"></div></div>
  <div class="hide" id="res"></div></div>`);

  setupTaskPeek();

  const photos=[];
  const thumbs=$("#thumbs");
  const refresh=()=>{$("#save").disabled=!photos.length;$("#save").textContent=photos.length?`Распознать фото (${photos.length})`:"Распознать фото";
    $("#ft").textContent=photos.length?"Добавить ещё фото":"Сфотографировать или выбрать фото (можно несколько)"};
  thumbs.onchange=refresh;

  $("#file").onchange=async e=>{const files=[...e.target.files];e.target.value="";
    for(const f of files){try{photos.push(await shrink(f))}catch(x){$("#e1").textContent=x.message}}
    drawThumbs(thumbs,photos);refresh()};
  $("#typeit").onclick=e=>{e.preventDefault();$("#hint").textContent="Напиши решение текстом.";
    $("#s2").classList.remove("hide");$("#s2").classList.add("fade");$("#s2").scrollIntoView({behavior:"smooth",block:"start"});setTimeout(()=>$("#txt").focus(),300)};
  const tx=$("#txt");
  const nope=e=>{e.preventDefault();toast("Вставка отключена, напиши решение сам");};
  tx.addEventListener("paste",nope);
  tx.addEventListener("drop",nope);
  tx.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="v")nope(e)});
  $("#save").onclick=e=>busy(e.currentTarget,async()=>{try{$("#e1").textContent="";
    thumbs.classList.add("scan");$("#save").textContent="Читаю почерк…";
    const r=await api("/api/ocr",{images_b64:photos.map(u=>u.split(",")[1])});
    $("#txt").value=r.text;$("#s2").classList.remove("hide");$("#s2").classList.add("fade");$("#s2").scrollIntoView({behavior:"smooth",block:"start"})}catch(x){$("#e1").textContent=x.message}finally{thumbs.classList.remove("scan");refresh()}});
  $("#send").onclick=e=>busy(e.currentTarget,async()=>{const R=$("#res");let stop;try{$("#e2").textContent="";
    $("#s1").classList.add("hide");$("#s2").classList.add("hide");R.className="result fade";stop=think(R,["Читаю решение…","Сверяю с критериями…","Считаю оценку…"]);
    const r=await api("/api/submit",{code,name,text:$("#txt").value,student_id:sessionStorage.getItem("sid")||null});
    stop();sessionStorage.setItem("sid",r.student_id);
    R.className="result fade";
    R.innerHTML=`<span class="lbl">Твоя оценка</span><div class="score">${r.score}<span style="font-size:28px">/10</span></div>
    <p style="font-size:18px;margin:12px 0 20px">${esc(r.verdict)}</p>
    <h2>Сильные стороны</h2><ul>${r.strengths.map(s=>`<li>${esc(s)}</li>`).join("")||"<li>—</li>"}</ul>
    <h2>Над чем поработать</h2><ul>${r.weaknesses.map(s=>`<li>${esc(s)}</li>`).join("")||"<li>—</li>"}</ul>
    <p class="mute" style="margin:0">Работа отправлена учителю.</p>`;window.scrollTo({top:0,behavior:"smooth"})}
    catch(x){stop&&stop();R.className="hide";$("#s1").classList.remove("hide");$("#s2").classList.remove("hide");$("#e2").textContent=x.message}});
}

