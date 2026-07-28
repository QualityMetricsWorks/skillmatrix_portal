const state = {
  machines: ["CMV-003", "CMV-004", "CMV-005", "CMV-006", "TCN-001", "TCN-002", "TCN-005", "CMH-004", "RV-001", "RV-002", "TCN-009", "TCN-010", "TCN-011", "TCN-012"],
  operators: [
    { id: "OP-001", name: "Juan Pérez", role: "Operador CNC", shift: "Turno A", scores: {} },
    { id: "OP-002", name: "Luis Martínez", role: "Setup Technician", shift: "Turno A", scores: {} },
    { id: "OP-003", name: "Marco Rodríguez", role: "Operador CNC", shift: "Turno B", scores: {} },
    { id: "OP-004", name: "Alejandro Torres", role: "Entrenador", shift: "Turno B", scores: {} },
    { id: "OP-005", name: "José Hernández", role: "Operador CNC", shift: "Turno C", scores: {} },
    { id: "OP-006", name: "Miguel Sánchez", role: "Operador CNC", shift: "Turno C", scores: {} }
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

state.operators.forEach((operator, opIndex) => {
  state.machines.forEach((machine, machineIndex) => {
    operator.scores[machine] = baseScoreRows[opIndex][machineIndex] ?? 0;
  });
});

const pageTitles = {
  dashboard: "Dashboard",
  matrix: "Matriz de habilidades",
  operators: "Operadores",
  machines: "Máquinas",
  training: "Capacitación"
};

function familyOf(machine) {
  return machine.split("-")[0];
}

function initials(name) {
  return name.split(" ").slice(0, 2).map(part => part[0]).join("").toUpperCase();
}

function operatorAverage(operator, machines = state.machines) {
  if (!machines.length) return 0;
  const total = machines.reduce((sum, machine) => sum + (operator.scores[machine] || 0), 0);
  return total / machines.length;
}

function pctFromLevel(level) {
  return Math.round((level / 4) * 100);
}

function scoreClass(percent) {
  if (percent >= 80) return "score-good";
  if (percent >= 60) return "score-mid";
  return "score-low";
}

function setView(viewId) {
  document.querySelectorAll(".view").forEach(v => v.classList.toggle("active", v.id === viewId));
  document.querySelectorAll(".nav-item").forEach(btn => btn.classList.toggle("active", btn.dataset.view === viewId));
  document.getElementById("pageTitle").textContent = pageTitles[viewId] || "Skills Matrix";
}

function renderDashboard() {
  document.getElementById("machineCount").textContent = state.machines.length;
  document.getElementById("operatorCount").textContent = state.operators.length;

  const averages = state.operators.map(op => operatorAverage(op));
  const overall = averages.reduce((a,b) => a+b, 0) / averages.length;
  document.getElementById("globalScore").textContent = pctFromLevel(overall) + "%";

  const certified = state.operators.filter(op => operatorAverage(op) >= 3).length;
  document.getElementById("certifiedCount").textContent = certified;

  const gaps = [];
  state.machines.forEach(machine => {
    const avg = state.operators.reduce((sum, op) => sum + op.scores[machine], 0) / state.operators.length;
    if (avg < 2) gaps.push({ machine, avg });
  });
  document.getElementById("criticalGapCount").textContent = gaps.length;

  const families = [...new Set(state.machines.map(familyOf))];
  const coverage = document.getElementById("familyCoverage");
  coverage.innerHTML = families.map(family => {
    const familyMachines = state.machines.filter(m => familyOf(m) === family);
    const avg = state.operators.reduce((sum, op) => sum + operatorAverage(op, familyMachines), 0) / state.operators.length;
    const pct = pctFromLevel(avg);
    return `
      <div class="coverage-row">
        <strong>${family}</strong>
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
        <span>${pct}%</span>
      </div>`;
  }).join("");

  document.getElementById("priorityList").innerHTML = gaps
    .sort((a,b) => a.avg - b.avg)
    .slice(0, 5)
    .map(item => `
      <div class="priority-item">
        <div>
          <strong>${item.machine}</strong>
          <small>Nivel promedio ${item.avg.toFixed(1)} de 4</small>
        </div>
        <span class="priority-badge">ALTA</span>
      </div>
    `).join("") || `<p class="card-subtitle">No se detectaron brechas críticas.</p>`;

  document.getElementById("operatorSummary").innerHTML = state.operators.map(op => {
    const percent = pctFromLevel(operatorAverage(op));
    return `
      <div class="summary-row">
        <div class="operator-meta">
          <div class="avatar">${initials(op.name)}</div>
          <div>
            <strong>${op.name}</strong>
            <small>${op.role} · ${op.shift}</small>
          </div>
        </div>
        <span class="score-pill ${scoreClass(percent)}">${percent}%</span>
      </div>`;
  }).join("");
}

function renderMatrix() {
  const family = document.getElementById("matrixFamilyFilter").value;
  const machines = family === "all" ? state.machines : state.machines.filter(m => familyOf(m) === family);

  document.getElementById("matrixHead").innerHTML = `
    <tr>
      <th>Operador</th>
      ${machines.map(m => `<th>${m}</th>`).join("")}
      <th>Promedio</th>
    </tr>`;

  document.getElementById("matrixBody").innerHTML = state.operators.map(op => {
    const avg = operatorAverage(op, machines);
    return `
      <tr>
        <td>
          <strong>${op.name}</strong><br>
          <small>${op.id} · ${op.shift}</small>
        </td>
        ${machines.map(machine => {
          const level = op.scores[machine] ?? 0;
          return `<td><span class="skill-level level-${level}">${level}</span></td>`;
        }).join("")}
        <td><strong>${avg.toFixed(1)}</strong></td>
      </tr>`;
  }).join("");
}

function renderOperators() {
  document.getElementById("operatorCards").innerHTML = state.operators.map(op => {
    const avg = operatorAverage(op);
    const percent = pctFromLevel(avg);
    const certifiedMachines = state.machines.filter(m => op.scores[m] >= 3).length;
    return `
      <article class="person-card">
        <div class="person-header">
          <div class="avatar">${initials(op.name)}</div>
          <div>
            <h4>${op.name}</h4>
            <div class="card-subtitle">${op.id} · ${op.role}</div>
          </div>
        </div>
        <div class="card-metrics">
          <div class="metric-box">
            <span>Competencia</span>
            <strong>${percent}%</strong>
            <small>Nivel promedio ${avg.toFixed(1)}</small>
          </div>
          <div class="metric-box">
            <span>Certificaciones</span>
            <strong>${certifiedMachines}</strong>
            <small>de ${state.machines.length} máquinas</small>
          </div>
        </div>
      </article>`;
  }).join("");
}

function renderMachines() {
  const family = document.getElementById("machineFamilyFilter").value;
  const machines = family === "all" ? state.machines : state.machines.filter(m => familyOf(m) === family);

  document.getElementById("machineCards").innerHTML = machines.map(machine => {
    const competent = state.operators.filter(op => op.scores[machine] >= 3).length;
    const avg = state.operators.reduce((sum, op) => sum + op.scores[machine], 0) / state.operators.length;
    return `
      <article class="machine-card">
        <div class="machine-header">
          <div class="machine-family">${familyOf(machine)}</div>
          <div>
            <h4>${machine}</h4>
            <div class="card-subtitle">Máquina CNC activa</div>
          </div>
          <span class="machine-status">ACTIVA</span>
        </div>
        <div class="card-metrics">
          <div class="metric-box">
            <span>Operadores competentes</span>
            <strong>${competent}</strong>
            <small>Nivel 3 o superior</small>
          </div>
          <div class="metric-box">
            <span>Nivel promedio</span>
            <strong>${avg.toFixed(1)}</strong>
            <small>Escala de 0 a 4</small>
          </div>
        </div>
      </article>`;
  }).join("");
}

function renderTraining() {
  const rows = [];
  state.operators.forEach(op => {
    state.machines.forEach(machine => {
      const current = op.scores[machine];
      if (current < 2) {
        rows.push({ operator: op.name, machine, current, priority: current === 0 ? "Alta" : "Media" });
      }
    });
  });

  document.getElementById("trainingTable").innerHTML = rows.slice(0, 18).map(row => `
    <div class="training-item">
      <div>
        <strong>${row.operator} · ${row.machine}</strong><br>
        <small>Nivel actual: ${row.current} · Objetivo inicial: 2</small>
      </div>
      <span class="training-status ${row.priority === "Alta" ? "status-high" : "status-medium"}">${row.priority}</span>
    </div>
  `).join("");
}

function renderAll() {
  renderDashboard();
  renderMatrix();
  renderOperators();
  renderMachines();
  renderTraining();
}

document.querySelectorAll(".nav-item").forEach(btn => {
  btn.addEventListener("click", () => setView(btn.dataset.view));
});

document.querySelectorAll("[data-go]").forEach(btn => {
  btn.addEventListener("click", () => setView(btn.dataset.go));
});

document.getElementById("matrixFamilyFilter").addEventListener("change", renderMatrix);
document.getElementById("machineFamilyFilter").addEventListener("change", renderMachines);

const dialog = document.getElementById("operatorDialog");
["addOperatorBtn", "addOperatorBtn2"].forEach(id => {
  document.getElementById(id).addEventListener("click", () => dialog.showModal());
});

document.getElementById("operatorForm").addEventListener("submit", event => {
  const submitter = event.submitter;
  if (!submitter || submitter.value === "cancel") return;

  event.preventDefault();
  const operator = {
    id: document.getElementById("operatorId").value.trim(),
    name: document.getElementById("operatorName").value.trim(),
    role: document.getElementById("operatorRole").value,
    shift: document.getElementById("operatorShift").value,
    scores: {}
  };

  if (!operator.id || !operator.name) return;

  state.machines.forEach(machine => operator.scores[machine] = 0);
  state.operators.push(operator);
  event.target.reset();
  dialog.close();
  renderAll();
  setView("operators");
});

document.getElementById("globalSearch").addEventListener("input", event => {
  const value = event.target.value.trim().toLowerCase();
  if (!value) {
    renderOperators();
    renderMachines();
    return;
  }

  const operatorCards = document.getElementById("operatorCards");
  operatorCards.innerHTML = state.operators
    .filter(op => `${op.name} ${op.id} ${op.role}`.toLowerCase().includes(value))
    .map(op => {
      const avg = operatorAverage(op);
      const percent = pctFromLevel(avg);
      return `
        <article class="person-card">
          <div class="person-header">
            <div class="avatar">${initials(op.name)}</div>
            <div><h4>${op.name}</h4><div class="card-subtitle">${op.id} · ${op.role}</div></div>
          </div>
          <div class="card-metrics">
            <div class="metric-box"><span>Competencia</span><strong>${percent}%</strong></div>
            <div class="metric-box"><span>Turno</span><strong>${op.shift}</strong></div>
          </div>
        </article>`;
    }).join("");

  const machineCards = document.getElementById("machineCards");
  machineCards.innerHTML = state.machines
    .filter(machine => machine.toLowerCase().includes(value))
    .map(machine => `
      <article class="machine-card">
        <div class="machine-header">
          <div class="machine-family">${familyOf(machine)}</div>
          <div><h4>${machine}</h4><div class="card-subtitle">Máquina CNC activa</div></div>
          <span class="machine-status">ACTIVA</span>
        </div>
      </article>`).join("");
});

renderAll();
