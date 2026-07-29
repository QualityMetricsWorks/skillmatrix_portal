const state = {
  machines: ["CMV-003","CMV-004","CMV-005","CMV-006","TCN-001","TCN-002","TCN-005","CMH-004","RV-001","RV-002","TCN-009","TCN-010","TCN-011","TCN-012"],
  operators: [
    { id:"OP-001", name:"Juan Pérez", role:"Operador CNC", shift:"Turno A", area:"Maquinado CNC", supervisor:"Supervisor A", entryDate:"2024-01-15", scores:{} },
    { id:"OP-002", name:"Luis Martínez", role:"Setup Technician", shift:"Turno A", area:"Maquinado CNC", supervisor:"Supervisor A", entryDate:"2022-08-10", scores:{} },
    { id:"OP-003", name:"Marco Rodríguez", role:"Operador CNC", shift:"Turno B", area:"Maquinado CNC", supervisor:"Supervisor B", entryDate:"2025-02-03", scores:{} },
    { id:"OP-004", name:"Alejandro Torres", role:"Entrenador", shift:"Turno B", area:"Maquinado CNC", supervisor:"Supervisor B", entryDate:"2020-05-18", scores:{} },
    { id:"OP-005", name:"José Hernández", role:"Operador CNC", shift:"Turno C", area:"Maquinado CNC", supervisor:"Supervisor C", entryDate:"2025-09-01", scores:{} },
    { id:"OP-006", name:"Miguel Sánchez", role:"Operador CNC", shift:"Turno C", area:"Maquinado CNC", supervisor:"Supervisor C", entryDate:"2023-11-20", scores:{} }
  ]
};

const baseScoreRows = [
  [3,3,2,1,3,2,1,2,0,0,1,1,0,0],
  [4,4,3,3,4,3,2,3,2,2,3,3,2,2],
  [2,2,1,0,2,1,0,1,0,0,1,1,1,0],
  [4,4,4,3,4,4,3,4,3,3,4,4,3,3],
  [1,2,1,0,2,1,0,1,0,0,0,1,0,0],
  [3,2,2,1,3,2,1,2,1,1,2,2,1,1]
];
state.operators.forEach((op, i) => state.machines.forEach((m, j) => op.scores[m] = baseScoreRows[i][j] ?? 0));

const pageTitles = { dashboard:"Dashboard", matrix:"Matriz de habilidades", operators:"Operadores", machines:"Máquinas", training:"Capacitación", operatorProfile:"Perfil del operador" };
const levelNames = ["No entrenado","En entrenamiento","Con supervisión","Certificado","Experto / Entrenador"];

function familyOf(machine){ return machine.split("-")[0]; }
function initials(name){ return name.split(" ").slice(0,2).map(x=>x[0]).join("").toUpperCase(); }
function operatorAverage(op, machines=state.machines){ return machines.length ? machines.reduce((s,m)=>s+(op.scores[m]||0),0)/machines.length : 0; }
function pctFromLevel(level){ return Math.round(level/4*100); }
function scoreClass(p){ return p>=80?"score-good":p>=60?"score-mid":"score-low"; }
function escapeHtml(value){ return String(value).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c])); }

function setView(viewId){
  document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id===viewId));
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.view===viewId));
  document.getElementById("pageTitle").textContent=pageTitles[viewId]||"Skills Matrix";
  window.scrollTo({top:0,behavior:"smooth"});
}

function levelCounts(){
  const counts=[0,0,0,0,0];
  state.operators.forEach(op=>state.machines.forEach(m=>counts[op.scores[m]??0]++));
  return counts;
}

function renderDashboard(){
  document.getElementById("operatorCount").textContent=state.operators.length;
  const overall=state.operators.reduce((s,op)=>s+operatorAverage(op),0)/state.operators.length;
  document.getElementById("globalScore").textContent=pctFromLevel(overall)+"%";

  const counts=levelCounts();
  counts.forEach((count,i)=>document.getElementById(`level${i}Count`).textContent=count);
  const total=counts.reduce((a,b)=>a+b,0);
  document.getElementById("assignmentTotal").textContent=`${total} asignaciones`;
  document.getElementById("levelDistribution").innerHTML=counts.map((count,i)=>`<div class="distribution-segment level-${i}" style="width:${total?count/total*100:0}%" data-label="Nivel ${i}: ${count} (${total?Math.round(count/total*100):0}%)"></div>`).join("");

  const gaps=[];
  state.machines.forEach(machine=>{
    const avg=state.operators.reduce((s,op)=>s+op.scores[machine],0)/state.operators.length;
    if(avg<2) gaps.push({machine,avg});
  });
  document.getElementById("criticalGapCount").textContent=gaps.length;

  const families=[...new Set(state.machines.map(familyOf))];
  document.getElementById("familyCoverage").innerHTML=families.map(f=>{
    const ms=state.machines.filter(m=>familyOf(m)===f);
    const avg=state.operators.reduce((s,op)=>s+operatorAverage(op,ms),0)/state.operators.length;
    const pct=pctFromLevel(avg);
    return `<div class="coverage-row"><strong>${f}</strong><div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div><span>${pct}%</span></div>`;
  }).join("");

  document.getElementById("priorityList").innerHTML=gaps.sort((a,b)=>a.avg-b.avg).slice(0,5).map(x=>`<div class="priority-item"><div><strong>${x.machine}</strong><small>Nivel promedio ${x.avg.toFixed(1)} de 4</small></div><span class="priority-badge">ALTA</span></div>`).join("") || `<p class="card-subtitle">No se detectaron brechas críticas.</p>`;

  document.getElementById("operatorSummary").innerHTML=state.operators.map(op=>{
    const p=pctFromLevel(operatorAverage(op));
    return `<button class="summary-row clickable" data-operator-id="${op.id}"><span class="operator-meta"><span class="avatar">${initials(op.name)}</span><span><strong>${escapeHtml(op.name)}</strong><small>${escapeHtml(op.role)} · ${escapeHtml(op.shift)}</small></span></span><span class="score-pill ${scoreClass(p)}">${p}%</span></button>`;
  }).join("");
  document.querySelectorAll("[data-operator-id]").forEach(btn=>btn.addEventListener("click",()=>openOperatorProfile(btn.dataset.operatorId)));
}

function renderMatrix(){
  const family=document.getElementById("matrixFamilyFilter").value;
  const machines=family==="all"?state.machines:state.machines.filter(m=>familyOf(m)===family);
  document.getElementById("matrixHead").innerHTML=`<tr><th>Operador</th>${machines.map(m=>`<th>${m}</th>`).join("")}<th>Promedio</th></tr>`;
  document.getElementById("matrixBody").innerHTML=state.operators.map(op=>`<tr><td><button class="operator-link" data-operator-id="${op.id}"><strong>${escapeHtml(op.name)}</strong><br><small>${op.id} · ${escapeHtml(op.shift)}</small></button></td>${machines.map(m=>`<td><span class="skill-level level-${op.scores[m]}">${op.scores[m]}</span></td>`).join("")}<td><strong>${operatorAverage(op,machines).toFixed(1)}</strong></td></tr>`).join("");
  document.querySelectorAll(".operator-link").forEach(btn=>btn.addEventListener("click",()=>openOperatorProfile(btn.dataset.operatorId)));
}

function renderOperators(filter=""){
  const q=filter.toLowerCase();
  const rows=state.operators.filter(op=>`${op.name} ${op.id} ${op.role} ${op.shift}`.toLowerCase().includes(q));
  document.getElementById("operatorCards").innerHTML=rows.map(op=>{
    const avg=operatorAverage(op), p=pctFromLevel(avg), certified=state.machines.filter(m=>op.scores[m]>=3).length;
    return `<article class="person-card clickable-card" data-operator-id="${op.id}"><div class="person-header"><div class="avatar">${initials(op.name)}</div><div><h4>${escapeHtml(op.name)}</h4><div class="card-subtitle">${op.id} · ${escapeHtml(op.role)}</div></div></div><div class="card-metrics"><div class="metric-box"><span>Competencia</span><strong>${p}%</strong><small>Nivel promedio ${avg.toFixed(1)}</small></div><div class="metric-box"><span>Certificaciones</span><strong>${certified}</strong><small>de ${state.machines.length} máquinas</small></div></div></article>`;
  }).join("") || `<div class="search-empty">No se encontraron operadores.</div>`;
  document.querySelectorAll(".clickable-card").forEach(card=>card.addEventListener("click",()=>openOperatorProfile(card.dataset.operatorId)));
}

function renderMachines(filter=""){
  const family=document.getElementById("machineFamilyFilter").value;
  const q=filter.toLowerCase();
  const machines=state.machines.filter(m=>(family==="all"||familyOf(m)===family)&&m.toLowerCase().includes(q));
  document.getElementById("machineCards").innerHTML=machines.map(machine=>{
    const competent=state.operators.filter(op=>op.scores[machine]>=3).length;
    const avg=state.operators.reduce((s,op)=>s+op.scores[machine],0)/state.operators.length;
    return `<article class="machine-card"><div class="machine-header"><div class="machine-family">${familyOf(machine)}</div><div><h4>${machine}</h4><div class="card-subtitle">Máquina CNC activa</div></div><span class="machine-status">ACTIVA</span></div><div class="card-metrics"><div class="metric-box"><span>Operadores competentes</span><strong>${competent}</strong><small>Nivel 3 o superior</small></div><div class="metric-box"><span>Nivel promedio</span><strong>${avg.toFixed(1)}</strong><small>Escala de 0 a 4</small></div></div></article>`;
  }).join("") || `<div class="search-empty">No se encontraron máquinas.</div>`;
}

function renderTraining(){
  const rows=[];
  state.operators.forEach(op=>state.machines.forEach(machine=>{ const current=op.scores[machine]; if(current<2) rows.push({operator:op.name,machine,current,priority:current===0?"Alta":"Media"}); }));
  document.getElementById("trainingTable").innerHTML=rows.slice(0,24).map(r=>`<div class="training-item"><div><strong>${escapeHtml(r.operator)} · ${r.machine}</strong><br><small>Nivel actual: ${r.current} · Objetivo inicial: 2</small></div><span class="training-status ${r.priority==="Alta"?"status-high":"status-medium"}">${r.priority}</span></div>`).join("");
}

function openOperatorProfile(id){
  const op=state.operators.find(x=>x.id===id); if(!op) return;
  const avg=operatorAverage(op), p=pctFromLevel(avg), counts=[0,0,0,0,0];
  state.machines.forEach(m=>counts[op.scores[m]]++);
  document.getElementById("operatorProfileContent").innerHTML=`
    <div class="profile-hero"><div class="profile-person"><div class="profile-avatar">${initials(op.name)}</div><div><h3>${escapeHtml(op.name)}</h3><p>${op.id} · ${escapeHtml(op.role)} · ${escapeHtml(op.shift)}</p></div></div><div class="profile-score"><span>Competencia general</span><strong>${p}%</strong><small>Nivel promedio ${avg.toFixed(1)} de 4</small></div></div>
    <div class="profile-grid">
      <article class="panel"><div class="panel-header"><div><span class="section-kicker">Información</span><h3>Datos del operador</h3></div></div><div class="profile-info-list"><div class="profile-info-row"><span>Número de empleado</span><strong>${op.id}</strong></div><div class="profile-info-row"><span>Puesto</span><strong>${escapeHtml(op.role)}</strong></div><div class="profile-info-row"><span>Área</span><strong>${escapeHtml(op.area)}</strong></div><div class="profile-info-row"><span>Turno</span><strong>${escapeHtml(op.shift)}</strong></div><div class="profile-info-row"><span>Supervisor</span><strong>${escapeHtml(op.supervisor)}</strong></div><div class="profile-info-row"><span>Fecha de ingreso</span><strong>${op.entryDate}</strong></div></div></article>
      <article class="panel"><div class="panel-header"><div><span class="section-kicker">Distribución</span><h3>Niveles por máquina</h3></div></div><div class="profile-level-grid">${counts.map((c,i)=>`<div class="profile-level-box"><strong>${c}</strong><span>Nivel ${i}</span></div>`).join("")}</div></article>
    </div>
    <article class="panel" style="margin-top:20px"><div class="panel-header"><div><span class="section-kicker">Competencias</span><h3>Detalle por máquina</h3></div></div><div class="machine-skill-list">${state.machines.map(m=>`<div class="machine-skill-item"><div><strong>${m}</strong><small>${levelNames[op.scores[m]]}</small></div><span class="profile-level-badge level-${op.scores[m]}">${op.scores[m]}</span></div>`).join("")}</div></article>`;
  setView("operatorProfile");
  hideSearchResults();
}

function renderSearchResults(query){
  const box=document.getElementById("searchResults");
  const q=query.trim().toLowerCase();
  if(!q){ hideSearchResults(); return; }
  const ops=state.operators.filter(op=>`${op.name} ${op.id} ${op.role} ${op.shift}`.toLowerCase().includes(q)).slice(0,6);
  const machines=state.machines.filter(m=>m.toLowerCase().includes(q)).slice(0,6);
  const html=[...ops.map(op=>`<button class="search-result-item" data-result-type="operator" data-result-id="${op.id}"><span class="search-result-icon">${initials(op.name)}</span><span><strong>${escapeHtml(op.name)}</strong><small>${op.id} · ${escapeHtml(op.role)} · ${escapeHtml(op.shift)}</small></span></button>`),...machines.map(m=>`<button class="search-result-item" data-result-type="machine" data-result-id="${m}"><span class="search-result-icon">${familyOf(m)}</span><span><strong>${m}</strong><small>Máquina CNC activa</small></span></button>`)].join("");
  box.innerHTML=html||`<div class="search-empty">No se encontraron coincidencias.</div>`;
  box.hidden=false;
  box.querySelectorAll(".search-result-item").forEach(btn=>btn.addEventListener("click",()=>{
    if(btn.dataset.resultType==="operator") openOperatorProfile(btn.dataset.resultId);
    else { document.getElementById("machineFamilyFilter").value="all"; setView("machines"); renderMachines(btn.dataset.resultId); }
  }));
}
function hideSearchResults(){ document.getElementById("searchResults").hidden=true; }

function renderAll(){ renderDashboard(); renderMatrix(); renderOperators(); renderMachines(); renderTraining(); }

document.querySelectorAll(".nav-item").forEach(btn=>btn.addEventListener("click",()=>setView(btn.dataset.view)));
document.querySelectorAll("[data-go]").forEach(btn=>btn.addEventListener("click",()=>setView(btn.dataset.go)));
document.getElementById("matrixFamilyFilter").addEventListener("change",renderMatrix);
document.getElementById("machineFamilyFilter").addEventListener("change",()=>renderMachines());
document.getElementById("backToOperators").addEventListener("click",()=>setView("operators"));

const dialog=document.getElementById("operatorDialog");
["addOperatorBtn","addOperatorBtn2"].forEach(id=>document.getElementById(id).addEventListener("click",()=>dialog.showModal()));
document.getElementById("operatorForm").addEventListener("submit",event=>{
  if(!event.submitter||event.submitter.value==="cancel") return;
  event.preventDefault();
  const op={ id:document.getElementById("operatorId").value.trim(), name:document.getElementById("operatorName").value.trim(), role:document.getElementById("operatorRole").value, shift:document.getElementById("operatorShift").value, area:"Maquinado CNC", supervisor:"Por asignar", entryDate:new Date().toISOString().slice(0,10), scores:{} };
  if(!op.id||!op.name) return;
  state.machines.forEach(m=>op.scores[m]=0); state.operators.push(op); event.target.reset(); dialog.close(); renderAll(); openOperatorProfile(op.id);
});

const search=document.getElementById("globalSearch");
search.addEventListener("input",e=>renderSearchResults(e.target.value));
search.addEventListener("focus",e=>{if(e.target.value.trim()) renderSearchResults(e.target.value);});
document.addEventListener("click",e=>{if(!e.target.closest(".search-wrapper")) hideSearchResults();});

renderAll();
