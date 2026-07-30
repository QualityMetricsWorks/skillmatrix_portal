"use strict";

/* =========================================================
   CNC SKILLS PORTAL · VERSIÓN 1.1
========================================================= */

const STORAGE_KEY = "cncSkillsPortalData_v1";

const defaultMachineIds = [
  "CMV-003", "CMV-004", "CMV-005", "CMV-006",
  "TCN-001", "TCN-002", "TCN-005", "CMH-004",
  "RV-001", "RV-002", "TCN-009", "TCN-010",
  "TCN-011", "TCN-012"
];

const defaultOperators = [
  ["OP-001", "Juan Pérez", "Operador CNC", "Turno A", "Supervisor A", "2024-01-15"],
  ["OP-002", "Luis Martínez", "Setup Technician", "Turno A", "Supervisor A", "2022-08-10"],
  ["OP-003", "Marco Rodríguez", "Operador CNC", "Turno B", "Supervisor B", "2025-02-03"],
  ["OP-004", "Alejandro Torres", "Entrenador", "Turno B", "Supervisor B", "2020-05-18"],
  ["OP-005", "José Hernández", "Operador CNC", "Turno C", "Supervisor C", "2025-09-01"],
  ["OP-006", "Miguel Sánchez", "Operador CNC", "Turno C", "Supervisor C", "2023-11-20"]
];

const baseScoreRows = [
  [3,3,2,1,3,2,1,2,0,0,1,1,0,0],
  [4,4,3,3,4,3,2,3,2,2,3,3,2,2],
  [2,2,1,0,2,1,0,1,0,0,1,1,1,0],
  [4,4,4,3,4,4,3,4,3,3,4,4,3,3],
  [1,2,1,0,2,1,0,1,0,0,0,1,0,0],
  [3,2,2,1,3,2,1,2,1,1,2,2,1,1]
];

const pageTitles = {
  dashboard: "Dashboard",
  matrix: "Matriz de habilidades",
  operators: "Operadores",
  machines: "Máquinas",
  training: "Capacitación",
  operatorProfile: "Perfil del operador",
  history: "Historial de cambios",
  settings: "Configuración"
};

const levelNames = [
  "No entrenado",
  "En entrenamiento",
  "Con supervisión",
  "Certificado",
  "Experto / Entrenador"
];

let operatorFormMode = "create";
let machineFormMode = "create";
let matrixSearchFilter = "";

/* =========================================================
   UTILIDADES
========================================================= */

function getElement(id) {
  return document.getElementById(id);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function nowIso() {
  return new Date().toISOString();
}

function familyOf(machineId) {
  return String(machineId || "").split("-")[0].toUpperCase();
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  })[character]);
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function initials(name) {
  return String(name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join("")
    .toUpperCase();
}

function formatDate(value) {
  if (!value) return "Sin registrar";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

function formatDateTime(value) {
  if (!value) return "Sin registrar";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function uid(prefix = "ID") {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function pctFromLevel(level) {
  return Math.round((Number(level || 0) / 4) * 100);
}

function scoreClass(percent) {
  if (percent >= 80) return "score-good";
  if (percent >= 60) return "score-mid";
  return "score-low";
}

function downloadText(filename, content, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function csvEscape(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function exportRows(filename, headers, rows) {
  const csv = [
    headers.map(csvEscape).join(","),
    ...rows.map(row => row.map(csvEscape).join(","))
  ].join("\n");

  downloadText(filename, "\uFEFF" + csv, "text/csv;charset=utf-8");
}

function getCurrentView() {
  return document.querySelector(".view.active")?.id || "dashboard";
}

function fileSizeLabel(bytes) {
  const size = Number(bytes || 0);
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

/* =========================================================
   ARCHIVOS LOCALES · INDEXEDDB
========================================================= */

const FILE_DB_NAME = "cncSkillsPortalFiles";
const FILE_DB_VERSION = 1;
const FILE_STORE_NAME = "files";

function openFileDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(FILE_DB_NAME, FILE_DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(FILE_STORE_NAME)) {
        database.createObjectStore(FILE_STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveLocalFile(file, category, operatorId) {
  if (!file) return null;

  const record = {
    id: uid("FILE"),
    category,
    operatorId,
    name: file.name,
    type: file.type || "application/octet-stream",
    size: file.size,
    createdAt: nowIso(),
    blob: file
  };

  const database = await openFileDatabase();

  await new Promise((resolve, reject) => {
    const transaction = database.transaction(FILE_STORE_NAME, "readwrite");
    transaction.objectStore(FILE_STORE_NAME).put(record);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });

  database.close();

  return {
    id: record.id,
    name: record.name,
    type: record.type,
    size: record.size
  };
}

async function getLocalFile(fileId) {
  if (!fileId) return null;

  const database = await openFileDatabase();

  const record = await new Promise((resolve, reject) => {
    const transaction = database.transaction(FILE_STORE_NAME, "readonly");
    const request = transaction.objectStore(FILE_STORE_NAME).get(fileId);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });

  database.close();
  return record;
}

async function deleteLocalFile(fileId) {
  if (!fileId) return;

  const database = await openFileDatabase();

  await new Promise((resolve, reject) => {
    const transaction = database.transaction(FILE_STORE_NAME, "readwrite");
    transaction.objectStore(FILE_STORE_NAME).delete(fileId);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });

  database.close();
}

async function openStoredFile(fileId) {
  try {
    const record = await getLocalFile(fileId);

    if (!record?.blob) {
      window.alert("El archivo no se encontró en este navegador. Puede pertenecer a otro equipo o haber sido eliminado.");
      return;
    }

    const url = URL.createObjectURL(record.blob);
    window.open(url, "_blank", "noopener");

    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (error) {
    console.error("Error al abrir archivo:", error);
    window.alert("No fue posible abrir el archivo.");
  }
}

/* =========================================================
   ESTADO Y MIGRACIÓN
========================================================= */

function machineRecord(id, source = {}) {
  return {
    id: String(id || source.id || "").trim().toUpperCase(),
    family: String(source.family || familyOf(id || source.id)).trim().toUpperCase(),
    minimumCoverage: Math.max(1, Number(source.minimumCoverage || 2)),
    status: source.status || "Activa"
  };
}

function createInitialState() {
  const machines = defaultMachineIds.map(id => machineRecord(id));

  const operators = defaultOperators.map((row, operatorIndex) => {
    const [id, name, role, shift, supervisor, entryDate] = row;
    const scores = {};

    machines.forEach((machine, machineIndex) => {
      scores[machine.id] = baseScoreRows[operatorIndex]?.[machineIndex] ?? 0;
    });

    return {
      id,
      name,
      role,
      shift,
      area: "Maquinado CNC",
      supervisor,
      entryDate,
      status: "Activo",
      scores,
      certifications: {},
      trainingHistory: [],
      documents: [],
      developmentPlan: []
    };
  });

  return {
    machines,
    operators,
    catalogs: {
      roles: ["Operador CNC", "Setup Technician", "Líder de producción", "Entrenador"],
      shifts: ["Turno A", "Turno B", "Turno C"],
      areas: ["Maquinado CNC"]
    },
    auditLog: [],
    selectedOperatorId: null,
    previousView: "dashboard"
  };
}

function normalizeStoredState(savedState = {}) {
  const rawMachines = Array.isArray(savedState.machines) && savedState.machines.length
    ? savedState.machines
    : defaultMachineIds;

  const machines = rawMachines
    .map(item => typeof item === "string" ? machineRecord(item) : machineRecord(item.id, item))
    .filter(machine => machine.id);

  const machineIds = machines.map(machine => machine.id);

  const operators = Array.isArray(savedState.operators)
    ? savedState.operators.map(operator => {
        const scores = {};

        machineIds.forEach(machineId => {
          const level = Number(operator.scores?.[machineId] ?? 0);
          scores[machineId] = Number.isInteger(level) && level >= 0 && level <= 4 ? level : 0;
        });

        return {
          id: String(operator.id ?? "").trim(),
          name: String(operator.name ?? "").trim(),
          role: operator.role || "Operador CNC",
          shift: operator.shift || "Turno A",
          area: operator.area || "Maquinado CNC",
          supervisor: operator.supervisor || "Por asignar",
          entryDate: operator.entryDate || operator.hireDate || today(),
          status: operator.status || "Activo",
          scores,
          certifications:
            operator.certifications && typeof operator.certifications === "object"
              ? operator.certifications
              : {},
          trainingHistory: Array.isArray(operator.trainingHistory)
            ? operator.trainingHistory
            : [],
          documents: Array.isArray(operator.documents)
            ? operator.documents
            : [],
          developmentPlan: Array.isArray(operator.developmentPlan)
            ? operator.developmentPlan
            : []
        };
      }).filter(operator => operator.id && operator.name)
    : [];

  const savedCatalogs = savedState.catalogs || {};

  return {
    machines,
    operators,
    catalogs: {
      roles: Array.isArray(savedCatalogs.roles) && savedCatalogs.roles.length
        ? savedCatalogs.roles
        : ["Operador CNC", "Setup Technician", "Líder de producción", "Entrenador"],
      shifts: Array.isArray(savedCatalogs.shifts) && savedCatalogs.shifts.length
        ? savedCatalogs.shifts
        : ["Turno A", "Turno B", "Turno C"],
      areas: Array.isArray(savedCatalogs.areas) && savedCatalogs.areas.length
        ? savedCatalogs.areas
        : ["Maquinado CNC"]
    },
    auditLog: Array.isArray(savedState.auditLog) ? savedState.auditLog : [],
    selectedOperatorId: null,
    previousView: "dashboard"
  };
}

function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? normalizeStoredState(JSON.parse(stored)) : createInitialState();
  } catch (error) {
    console.error("Error al cargar localStorage:", error);
    return createInitialState();
  }
}

let state = loadState();

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      machines: state.machines,
      operators: state.operators,
      catalogs: state.catalogs,
      auditLog: state.auditLog
    }));
  } catch (error) {
    console.error("Error al guardar localStorage:", error);
    window.alert("No fue posible guardar la información en este navegador.");
  }
}

function logChange(action, entity, detail) {
  state.auditLog.unshift({
    id: uid("LOG"),
    timestamp: nowIso(),
    user: "Usuario local",
    action,
    entity,
    detail
  });

  state.auditLog = state.auditLog.slice(0, 500);
}

if (!localStorage.getItem(STORAGE_KEY)) {
  saveState();
}

/* =========================================================
   CONSULTAS
========================================================= */

function machineIds() {
  return state.machines.map(machine => machine.id);
}

function getMachine(machineId) {
  return state.machines.find(machine => machine.id === machineId);
}

function operatorAverage(operator, machines = machineIds()) {
  if (!operator || !machines.length) return 0;

  const ids = machines.map(machine => typeof machine === "string" ? machine : machine.id);

  return ids.reduce((sum, machineId) => {
    return sum + Number(operator.scores?.[machineId] ?? 0);
  }, 0) / ids.length;
}

function levelCounts(operators = state.operators) {
  const counts = [0, 0, 0, 0, 0];

  operators.forEach(operator => {
    machineIds().forEach(machineId => {
      const level = Number(operator.scores?.[machineId] ?? 0);
      if (level >= 0 && level <= 4) counts[level] += 1;
    });
  });

  return counts;
}

/* =========================================================
   NAVEGACIÓN
========================================================= */

function setView(viewId) {
  const selectedView = getElement(viewId);
  if (!selectedView) return;

  document.querySelectorAll(".view").forEach(view => {
    view.classList.toggle("active", view.id === viewId);
  });

  document.querySelectorAll(".nav-item").forEach(button => {
    button.classList.toggle("active", button.dataset.view === viewId);
  });

  const pageTitle = getElement("pageTitle");
  if (pageTitle) pageTitle.textContent = pageTitles[viewId] || "Skills Matrix";

  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* =========================================================
   DASHBOARD
========================================================= */

function renderDashboard() {
  const operatorCount = getElement("operatorCount");
  const globalScore = getElement("globalScore");
  const criticalGapCount = getElement("criticalGapCount");

  if (operatorCount) operatorCount.textContent = state.operators.length;

  const overall = state.operators.length
    ? state.operators.reduce((sum, operator) => sum + operatorAverage(operator), 0)
      / state.operators.length
    : 0;

  if (globalScore) globalScore.textContent = `${pctFromLevel(overall)}%`;

  const counts = levelCounts();

  counts.forEach((count, index) => {
    const element = getElement(`level${index}Count`);
    if (element) element.textContent = count;
  });

  const total = counts.reduce((sum, count) => sum + count, 0);
  const distribution = getElement("levelDistribution");

  if (distribution) {
    distribution.innerHTML = counts.map((count, index) => {
      const percentage = total ? Math.round((count / total) * 100) : 0;

      return `
        <div class="level-distribution-row">
          <div class="level-distribution-label">
            <i class="level-dot level-${index}"></i>
            <span>Nivel ${index}</span>
          </div>
          <div class="level-bar-track">
            <div class="level-bar-fill level-${index}" style="width:${percentage}%"></div>
          </div>
          <div class="level-distribution-value">${count}</div>
        </div>
      `;
    }).join("");
  }

  const gaps = state.machines.map(machine => {
    const average = state.operators.length
      ? state.operators.reduce((sum, operator) => {
          return sum + Number(operator.scores?.[machine.id] ?? 0);
        }, 0) / state.operators.length
      : 0;

    return { machine: machine.id, avg: average };
  }).filter(item => item.avg < 2);

  if (criticalGapCount) criticalGapCount.textContent = gaps.length;

  renderFamilyCoverage();
  renderPriorityList(gaps);
  renderOperatorSummary();
}

function renderFamilyCoverage() {
  const container = getElement("familyCoverage");
  if (!container) return;

  const families = [...new Set(state.machines.map(machine => machine.family))];

  container.innerHTML = families.map(family => {
    const machines = state.machines.filter(machine => machine.family === family);
    const average = state.operators.length
      ? state.operators.reduce((sum, operator) => {
          return sum + operatorAverage(operator, machines);
        }, 0) / state.operators.length
      : 0;

    const percentage = pctFromLevel(average);

    return `
      <div class="coverage-row">
        <strong>${escapeHtml(family)}</strong>
        <div class="progress-track">
          <div class="progress-fill" style="width:${percentage}%"></div>
        </div>
        <span>${percentage}%</span>
      </div>
    `;
  }).join("");
}

function renderPriorityList(gaps) {
  const container = getElement("priorityList");
  if (!container) return;

  const ordered = [...gaps].sort((a, b) => a.avg - b.avg).slice(0, 5);

  container.innerHTML = ordered.length
    ? ordered.map(item => `
        <div class="priority-item">
          <div>
            <strong>${escapeHtml(item.machine)}</strong>
            <small>Nivel promedio ${item.avg.toFixed(1)} de 4</small>
          </div>
          <span class="priority-badge">ALTA</span>
        </div>
      `).join("")
    : `<div class="empty-state">No se detectaron brechas críticas.</div>`;
}

function renderOperatorSummary() {
  const container = getElement("operatorSummary");
  if (!container) return;

  container.innerHTML = state.operators.map(operator => {
    const percentage = pctFromLevel(operatorAverage(operator));

    return `
      <button
        class="summary-row clickable"
        data-summary-operator-id="${escapeHtml(operator.id)}"
        type="button"
      >
        <span class="operator-meta">
          <span class="avatar">${initials(operator.name)}</span>
          <span>
            <strong>${escapeHtml(operator.name)}</strong>
            <small>${escapeHtml(operator.role)} · ${escapeHtml(operator.shift)}</small>
          </span>
        </span>
        <span class="score-pill ${scoreClass(percentage)}">${percentage}%</span>
      </button>
    `;
  }).join("");

  container.querySelectorAll("[data-summary-operator-id]").forEach(button => {
    button.addEventListener("click", () => openOperatorProfile(button.dataset.summaryOperatorId));
  });
}

/* =========================================================
   MATRIZ EDITABLE
========================================================= */

function refreshMatrixFilters() {
  const operatorFilter = getElement("matrixOperatorFilter");
  if (!operatorFilter) return;

  const current = operatorFilter.value || "all";

  operatorFilter.innerHTML = `
    <option value="all">Todos los operadores</option>
    ${state.operators.map(operator => `
      <option value="${escapeHtml(operator.id)}">${escapeHtml(operator.name)}</option>
    `).join("")}
  `;

  operatorFilter.value = state.operators.some(operator => operator.id === current) ? current : "all";
}

function renderMatrix() {
  const familyFilter = getElement("matrixFamilyFilter");
  const operatorFilter = getElement("matrixOperatorFilter");
  const shiftFilter = getElement("matrixShiftFilter");
  const matrixHead = getElement("matrixHead");
  const matrixBody = getElement("matrixBody");

  if (!familyFilter || !matrixHead || !matrixBody) return;

  refreshMatrixFilters();

  const selectedFamily = familyFilter.value;
  const selectedOperator = operatorFilter?.value || "all";
  const selectedShift = shiftFilter?.value || "all";

  const machines = state.machines.filter(machine => {
    return selectedFamily === "all" || machine.family === selectedFamily;
  });

  const operators = state.operators.filter(operator => {
    const matchesOperator = selectedOperator === "all" || operator.id === selectedOperator;
    const matchesShift = selectedShift === "all" || operator.shift === selectedShift;
    const matchesSearch = !matrixSearchFilter ||
      normalizeText([operator.name, operator.id].join(" ")).includes(normalizeText(matrixSearchFilter));

    return matchesOperator && matchesShift && matchesSearch;
  });

  matrixHead.innerHTML = `
    <tr>
      <th>Operador</th>
      ${machines.map(machine => `<th>${escapeHtml(machine.id)}</th>`).join("")}
      <th>Promedio</th>
    </tr>
  `;

  matrixBody.innerHTML = operators.map(operator => `
    <tr>
      <td class="operator-cell">
        <button
          class="operator-profile-link"
          data-matrix-operator-id="${escapeHtml(operator.id)}"
          type="button"
        >
          <span class="operator-name">${escapeHtml(operator.name)}</span>
          <small>${escapeHtml(operator.id)} · ${escapeHtml(operator.shift)}</small>
        </button>
      </td>

      ${machines.map(machine => {
        const level = Number(operator.scores?.[machine.id] ?? 0);

        return `
          <td class="matrix-level-cell">
            <select
              class="matrix-level-select level-${level}"
              data-score-operator="${escapeHtml(operator.id)}"
              data-score-machine="${escapeHtml(machine.id)}"
              aria-label="Nivel de ${escapeHtml(operator.name)} en ${escapeHtml(machine.id)}"
            >
              ${levelNames.map((name, index) => `
                <option value="${index}" ${index === level ? "selected" : ""}>
                  ${index}
                </option>
              `).join("")}
            </select>
          </td>
        `;
      }).join("")}

      <td><strong>${operatorAverage(operator, machines).toFixed(1)}</strong></td>
    </tr>
  `).join("");

  matrixBody.querySelectorAll("[data-matrix-operator-id]").forEach(button => {
    button.addEventListener("click", () => openOperatorProfile(button.dataset.matrixOperatorId));
  });

  matrixBody.querySelectorAll("[data-score-operator]").forEach(select => {
    select.addEventListener("change", () => {
      const operator = state.operators.find(item => item.id === select.dataset.scoreOperator);
      const machineId = select.dataset.scoreMachine;
      if (!operator || !machineId) return;

      const oldLevel = Number(operator.scores?.[machineId] ?? 0);
      const newLevel = Number(select.value);

      operator.scores[machineId] = newLevel;

      logChange(
        "Actualizó competencia",
        operator.name,
        `${machineId}: Nivel ${oldLevel} → Nivel ${newLevel}`
      );

      saveState();
      renderAll();
    });
  });
}

/* =========================================================
   OPERADORES
========================================================= */

function renderOperators(filter = "") {
  const container = getElement("operatorCards");
  if (!container) return;

  const query = normalizeText(filter);

  const operators = state.operators.filter(operator => {
    return normalizeText([
      operator.name, operator.id, operator.role, operator.shift,
      operator.area, operator.supervisor, operator.status
    ].join(" ")).includes(query);
  });

  container.innerHTML = operators.length
    ? operators.map(operator => {
        const average = operatorAverage(operator);
        const percentage = pctFromLevel(average);
        const certified = machineIds().filter(machineId => {
          return Number(operator.scores?.[machineId] ?? 0) >= 3;
        }).length;

        return `
          <article
            class="person-card clickable-card"
            data-card-operator-id="${escapeHtml(operator.id)}"
            tabindex="0"
            role="button"
          >
            <div class="person-header">
              <div class="avatar">${initials(operator.name)}</div>
              <div>
                <h4>${escapeHtml(operator.name)}</h4>
                <div class="card-subtitle">
                  ${escapeHtml(operator.id)} · ${escapeHtml(operator.role)}
                </div>
              </div>
            </div>

            <div class="card-subtitle">
              ${escapeHtml(operator.area)} · ${escapeHtml(operator.shift)}
            </div>

            <div class="card-subtitle">
              Supervisor: ${escapeHtml(operator.supervisor)}
            </div>

            <div class="card-subtitle">
              Ingreso: ${formatDate(operator.entryDate)} · ${escapeHtml(operator.status)}
            </div>

            <div class="card-metrics">
              <div class="metric-box">
                <span>Competencia</span>
                <strong>${percentage}%</strong>
                <small>Nivel promedio ${average.toFixed(1)}</small>
              </div>
              <div class="metric-box">
                <span>Certificaciones</span>
                <strong>${certified}</strong>
                <small>de ${state.machines.length} máquinas</small>
              </div>
            </div>
          </article>
        `;
      }).join("")
    : `<div class="empty-state">No se encontraron operadores.</div>`;

  container.querySelectorAll("[data-card-operator-id]").forEach(card => {
    const open = () => openOperatorProfile(card.dataset.cardOperatorId);
    card.addEventListener("click", open);
    card.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    });
  });
}

/* =========================================================
   MÁQUINAS
========================================================= */

function renderMachines(filter = "") {
  const familyFilter = getElement("machineFamilyFilter");
  const container = getElement("machineCards");
  if (!familyFilter || !container) return;

  const selectedFamily = familyFilter.value;
  const query = normalizeText(filter);

  const machines = state.machines.filter(machine => {
    const matchesFamily = selectedFamily === "all" || machine.family === selectedFamily;
    const matchesSearch = normalizeText([machine.id, machine.family, machine.status].join(" ")).includes(query);
    return matchesFamily && matchesSearch;
  });

  container.innerHTML = machines.length
    ? machines.map(machine => {
        const certifiedOperators = state.operators.filter(operator => {
          return Number(operator.scores?.[machine.id] ?? 0) >= 3;
        });

        const average = state.operators.length
          ? state.operators.reduce((sum, operator) => {
              return sum + Number(operator.scores?.[machine.id] ?? 0);
            }, 0) / state.operators.length
          : 0;

        const shiftsCovered = [...new Set(certifiedOperators.map(operator => operator.shift))];
        const trainer = certifiedOperators.find(operator => Number(operator.scores?.[machine.id] ?? 0) >= 4);

        let risk = "Bajo";
        if (certifiedOperators.length < machine.minimumCoverage) risk = "Alto";
        else if (certifiedOperators.length === machine.minimumCoverage) risk = "Medio";

        return `
          <article class="machine-card">
            <div class="machine-header">
              <div class="machine-family">${escapeHtml(machine.family)}</div>

              <div>
                <h4>${escapeHtml(machine.id)}</h4>
                <div class="card-subtitle">Máquina CNC</div>
              </div>

              <span class="machine-status">${escapeHtml(machine.status).toUpperCase()}</span>
            </div>

            <div class="machine-card-actions">
              <button
                class="text-btn"
                data-edit-machine="${escapeHtml(machine.id)}"
                type="button"
              >
                Editar
              </button>

              <button
                class="text-btn danger-text"
                data-delete-machine="${escapeHtml(machine.id)}"
                type="button"
              >
                Eliminar
              </button>
            </div>

            <div class="card-metrics">
              <div class="metric-box">
                <span>Operadores certificados</span>
                <strong>${certifiedOperators.length}</strong>
                <small>Cobertura mínima: ${machine.minimumCoverage}</small>
              </div>

              <div class="metric-box">
                <span>Nivel promedio</span>
                <strong>${average.toFixed(1)}</strong>
                <small>Escala de 0 a 4</small>
              </div>

              <div class="metric-box">
                <span>Turnos cubiertos</span>
                <strong>${shiftsCovered.length}</strong>
                <small>${shiftsCovered.length ? escapeHtml(shiftsCovered.join(", ")) : "Sin cobertura"}</small>
              </div>

              <div class="metric-box">
                <span>Riesgo de respaldo</span>
                <strong>${risk}</strong>
                <small>${trainer ? `Entrenador: ${escapeHtml(trainer.name)}` : "Sin entrenador disponible"}</small>
              </div>
            </div>
          </article>
        `;
      }).join("")
    : `<div class="empty-state">No se encontraron máquinas.</div>`;

  container.querySelectorAll("[data-edit-machine]").forEach(button => {
    button.addEventListener("click", () => openEditMachineDialog(button.dataset.editMachine));
  });

  container.querySelectorAll("[data-delete-machine]").forEach(button => {
    button.addEventListener("click", () => deleteMachine(button.dataset.deleteMachine));
  });
}

/* =========================================================
   CAPACITACIÓN
========================================================= */

function trainingRows() {
  const rows = [];

  state.operators.forEach(operator => {
    const explicitPlans = operator.developmentPlan || [];

    explicitPlans.forEach(plan => {
      rows.push({
        operator: operator.name,
        operatorId: operator.id,
        machine: plan.machine,
        current: Number(operator.scores?.[plan.machine] ?? 0),
        target: Number(plan.targetLevel ?? 2),
        responsible: plan.responsible || operator.supervisor,
        targetDate: plan.targetDate || "",
        status: plan.status || "Pendiente",
        evidence: plan.evidence || "Sin evidencia",
        priority: plan.priority || "Media",
        source: "plan"
      });
    });

    machineIds().forEach(machineId => {
      const current = Number(operator.scores?.[machineId] ?? 0);
      const alreadyPlanned = explicitPlans.some(plan => plan.machine === machineId);

      if (current < 2 && !alreadyPlanned) {
        rows.push({
          operator: operator.name,
          operatorId: operator.id,
          machine: machineId,
          current,
          target: 2,
          responsible: operator.supervisor,
          targetDate: "",
          status: "Pendiente",
          evidence: "Sin evidencia",
          priority: current === 0 ? "Alta" : "Media",
          source: "brecha"
        });
      }
    });
  });

  return rows.sort((a, b) => {
    const priorityOrder = { Alta: 0, Media: 1, Baja: 2 };
    return (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9)
      || a.operator.localeCompare(b.operator);
  });
}

function renderTraining() {
  const container = getElement("trainingTable");
  if (!container) return;

  const statusFilter = getElement("trainingStatusFilter")?.value || "all";
  const rows = trainingRows().filter(row => statusFilter === "all" || row.status === statusFilter);

  container.innerHTML = rows.length
    ? rows.map(row => `
        <div class="training-item">
          <div>
            <strong>${escapeHtml(row.operator)} · ${escapeHtml(row.machine)}</strong>
            <br>
            <small>Nivel actual: ${row.current} · Nivel objetivo: ${row.target}</small>
            <br>
            <small>
              Responsable: ${escapeHtml(row.responsible)}
              · Estado: ${escapeHtml(row.status)}
              ${row.targetDate ? `· Fecha: ${formatDate(row.targetDate)}` : ""}
            </small>
            <br>
            <small>Evidencia: ${escapeHtml(row.evidence)}</small>
          </div>

          <span class="training-status ${
            row.priority === "Alta" ? "status-high" :
            row.priority === "Media" ? "status-medium" : "status-low"
          }">
            ${escapeHtml(row.priority)}
          </span>
        </div>
      `).join("")
    : `<div class="empty-state">No existen necesidades de capacitación con este filtro.</div>`;
}

/* =========================================================
   PERFIL DEL OPERADOR
========================================================= */

function openOperatorProfile(operatorId) {
  const operator = state.operators.find(item => item.id === operatorId);
  if (!operator) return;

  const currentView = getCurrentView();
  if (currentView !== "operatorProfile") state.previousView = currentView;

  state.selectedOperatorId = operatorId;
  renderOperatorProfile(operator);
  setView("operatorProfile");
  hideSearchResults();
}

function renderOperatorProfile(operator) {
  const average = operatorAverage(operator);
  const percentage = pctFromLevel(average);
  const counts = [0, 0, 0, 0, 0];

  machineIds().forEach(machineId => {
    const level = Number(operator.scores?.[machineId] ?? 0);
    counts[level] += 1;
  });

  const mappings = {
    profileInitials: initials(operator.name),
    profileName: operator.name,
    profileEmployeeId: `ID: ${operator.id}`,
    profileRole: `Puesto: ${operator.role}`,
    profileShift: `Turno: ${operator.shift}`,
    profileArea: operator.area,
    profileSupervisor: operator.supervisor,
    profileEntryDate: formatDate(operator.entryDate),
    profileStatus: operator.status,
    profileScore: `${percentage}%`,
    profileCertifiedCount: counts[3] + counts[4],
    profileTrainingCount: counts[1] + counts[2],
    profileExpertCount: counts[4]
  };

  Object.entries(mappings).forEach(([id, value]) => {
    const element = getElement(id);
    if (element) element.textContent = value;
  });

  const levelSummary = getElement("profileLevelSummary");
  if (levelSummary) {
    levelSummary.innerHTML = counts.map((count, level) => `
      <div class="profile-level-item">
        <i class="level-dot level-${level}"></i>
        <div>
          <strong>Nivel ${level}</strong>
          <small>${escapeHtml(levelNames[level])}</small>
        </div>
        <strong>${count}</strong>
      </div>
    `).join("");
  }

  const machineSkills = getElement("profileMachineSkills");
  if (machineSkills) {
    machineSkills.innerHTML = state.machines.map(machine => {
      const level = Number(operator.scores?.[machine.id] ?? 0);

      return `
        <div class="profile-machine-row">
          <div>
            <strong>${escapeHtml(machine.id)}</strong>
            <small>${escapeHtml(levelNames[level])}</small>
          </div>

          <div class="progress-track">
            <div class="level-bar-fill level-${level}" style="width:${pctFromLevel(level)}%"></div>
          </div>

          <span class="profile-level-badge level-${level}">
            Nivel ${level}
          </span>
        </div>
      `;
    }).join("");
  }

  renderProfileCertifications(operator);
  renderProfileHistory(operator);
  renderProfileDocuments(operator);
  renderProfileDevelopmentPlan(operator);
  renderProfileGaps(operator);
}

function renderProfileCertifications(operator) {
  const container = getElement("profileCertifications");
  if (!container) return;

  const certifications = Object.entries(operator.certifications || {});

  container.innerHTML = certifications.length
    ? certifications.map(([machine, cert]) => `
        <div class="profile-record-item">
          <div>
            <strong>${escapeHtml(machine)}</strong>
            <small>Evaluador: ${escapeHtml(cert.evaluator || "Sin registrar")}</small>
            <small>
              Certificación: ${formatDate(cert.date)}
              · Vence: ${cert.expiration ? formatDate(cert.expiration) : "Sin vencimiento"}
            </small>
            <small>Evidencia: ${escapeHtml(cert.evidence || "Sin evidencia")}</small>
          </div>

          <button
            class="icon-btn"
            data-delete-certification="${escapeHtml(machine)}"
            type="button"
            aria-label="Eliminar certificación"
          >
            ×
          </button>
        </div>
      `).join("")
    : `<div class="empty-state">No hay certificaciones registradas.</div>`;

  container.querySelectorAll("[data-delete-certification]").forEach(button => {
    button.addEventListener("click", () => {
      if (!window.confirm(`¿Eliminar la certificación de ${button.dataset.deleteCertification}?`)) return;
      delete operator.certifications[button.dataset.deleteCertification];
      logChange("Eliminó certificación", operator.name, button.dataset.deleteCertification);
      saveState();
      renderAll();
    });
  });
}

function openRecordDetail(title, html) {
  const dialog = getElement("recordDetailDialog");
  const titleElement = getElement("recordDetailTitle");
  const content = getElement("recordDetailContent");

  if (!dialog || !titleElement || !content) return;

  titleElement.textContent = title;
  content.innerHTML = html;
  dialog.showModal();

  content.querySelectorAll("[data-open-file]").forEach(button => {
    button.addEventListener("click", () => openStoredFile(button.dataset.openFile));
  });
}

function renderProfileHistory(operator) {
  const container = getElement("profileHistory");
  if (!container) return;

  const records = [...(operator.trainingHistory || [])]
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));

  container.innerHTML = records.length
    ? records.map(record => `
        <div class="profile-record-item clickable-record" data-history-detail="${escapeHtml(record.id)}">
          <div>
            <strong>${escapeHtml(record.type || "Capacitación")} · ${escapeHtml(record.machine || "General")}</strong>
            <small>${formatDate(record.date)} · Responsable: ${escapeHtml(record.responsible || "Sin registrar")}</small>
            <small>
              ${record.level ? `Nivel ${record.level}` : "Sin nivel"}
              · ${escapeHtml(record.result || "Sin resultado")}
              ${record.file?.name ? `· Archivo: ${escapeHtml(record.file.name)}` : ""}
            </small>
            <small>${escapeHtml(record.description || "")}</small>
          </div>

          <button
            class="icon-btn"
            data-delete-history="${escapeHtml(record.id)}"
            type="button"
            aria-label="Eliminar registro"
          >
            ×
          </button>
        </div>
      `).join("")
    : `<div class="empty-state">No hay historial registrado.</div>`;

  container.querySelectorAll("[data-history-detail]").forEach(row => {
    row.addEventListener("click", event => {
      if (event.target.closest("[data-delete-history]")) return;

      const record = records.find(item => item.id === row.dataset.historyDetail);
      if (!record) return;

      openRecordDetail(
        `${record.type || "Registro"} · ${record.machine || "General"}`,
        `
          <div class="record-detail-grid">
            <div><span>Fecha</span><strong>${formatDate(record.date)}</strong></div>
            <div><span>Máquina</span><strong>${escapeHtml(record.machine || "General")}</strong></div>
            <div><span>Nivel evaluado</span><strong>${record.level ? `Nivel ${record.level}` : "No aplica"}</strong></div>
            <div><span>Resultado</span><strong>${escapeHtml(record.result || "Sin resultado")}</strong></div>
            <div><span>Responsable</span><strong>${escapeHtml(record.responsible || "Sin registrar")}</strong></div>
            <div><span>Archivo</span><strong>${escapeHtml(record.file?.name || "Sin archivo")}</strong></div>
          </div>
          <div class="record-detail-notes">
            <span>Descripción</span>
            <p>${escapeHtml(record.description || "Sin descripción")}</p>
          </div>
          ${record.file?.id ? `
            <button class="secondary-btn" type="button" data-open-file="${escapeHtml(record.file.id)}">
              Abrir evidencia
            </button>
          ` : ""}
        `
      );
    });
  });

  container.querySelectorAll("[data-delete-history]").forEach(button => {
    button.addEventListener("click", async () => {
      const record = operator.trainingHistory.find(item => item.id === button.dataset.deleteHistory);
      if (!record) return;
      if (!window.confirm("¿Eliminar este registro de capacitación o evaluación?")) return;

      if (record.file?.id) await deleteLocalFile(record.file.id);
      operator.trainingHistory = operator.trainingHistory.filter(item => item.id !== record.id);
      logChange("Eliminó registro de capacitación", operator.name, record.id);
      saveState();
      renderAll();
    });
  });
}

function renderProfileDocuments(operator) {
  const container = getElement("profileDocuments");
  if (!container) return;

  const documents = [...(operator.documents || [])]
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));

  container.innerHTML = documents.length
    ? documents.map(documentRecord => `
        <div class="profile-record-item clickable-record" data-document-detail="${escapeHtml(documentRecord.id)}">
          <div>
            <strong>${escapeHtml(documentRecord.type)} · ${escapeHtml(documentRecord.name)}</strong>
            <small>${formatDate(documentRecord.date)} · Responsable: ${escapeHtml(documentRecord.responsible)}</small>
            <small>
              Archivo: ${escapeHtml(documentRecord.file?.name || "Sin archivo")}
              ${documentRecord.expiration ? `· Vence: ${formatDate(documentRecord.expiration)}` : ""}
            </small>
          </div>

          <button
            class="icon-btn"
            data-delete-document="${escapeHtml(documentRecord.id)}"
            type="button"
            aria-label="Eliminar documento"
          >
            ×
          </button>
        </div>
      `).join("")
    : `<div class="empty-state">No hay documentos registrados.</div>`;

  container.querySelectorAll("[data-document-detail]").forEach(row => {
    row.addEventListener("click", event => {
      if (event.target.closest("[data-delete-document]")) return;

      const documentRecord = documents.find(item => item.id === row.dataset.documentDetail);
      if (!documentRecord) return;

      openRecordDetail(
        documentRecord.name,
        `
          <div class="record-detail-grid">
            <div><span>Tipo</span><strong>${escapeHtml(documentRecord.type)}</strong></div>
            <div><span>Fecha</span><strong>${formatDate(documentRecord.date)}</strong></div>
            <div><span>Responsable</span><strong>${escapeHtml(documentRecord.responsible)}</strong></div>
            <div><span>Vencimiento</span><strong>${documentRecord.expiration ? formatDate(documentRecord.expiration) : "Sin vencimiento"}</strong></div>
            <div><span>Archivo</span><strong>${escapeHtml(documentRecord.file?.name || "Sin archivo")}</strong></div>
            <div><span>Tamaño</span><strong>${documentRecord.file?.size ? fileSizeLabel(documentRecord.file.size) : "—"}</strong></div>
          </div>
          <div class="record-detail-notes">
            <span>Observaciones</span>
            <p>${escapeHtml(documentRecord.notes || "Sin observaciones")}</p>
          </div>
          ${documentRecord.file?.id ? `
            <button class="secondary-btn" type="button" data-open-file="${escapeHtml(documentRecord.file.id)}">
              Abrir documento
            </button>
          ` : ""}
        `
      );
    });
  });

  container.querySelectorAll("[data-delete-document]").forEach(button => {
    button.addEventListener("click", async () => {
      const documentRecord = operator.documents.find(item => item.id === button.dataset.deleteDocument);
      if (!documentRecord) return;
      if (!window.confirm(`¿Eliminar el documento "${documentRecord.name}"?`)) return;

      if (documentRecord.file?.id) await deleteLocalFile(documentRecord.file.id);
      operator.documents = operator.documents.filter(item => item.id !== documentRecord.id);
      logChange("Eliminó documento", operator.name, documentRecord.name);
      saveState();
      renderAll();
    });
  });
}

function renderProfileDevelopmentPlan(operator) {
  const container = getElement("profileDevelopmentPlan");
  if (!container) return;

  const plans = operator.developmentPlan || [];

  container.innerHTML = plans.length
    ? plans.map(plan => `
        <div class="development-plan-item">
          <div>
            <strong>${escapeHtml(plan.machine)} · Objetivo nivel ${plan.targetLevel}</strong>
            <small>
              Responsable: ${escapeHtml(plan.responsible)}
              · Fecha: ${formatDate(plan.targetDate)}
              · Estado: ${escapeHtml(plan.status)}
            </small>
            <small>Evidencia: ${escapeHtml(plan.evidence || "Sin evidencia definida")}</small>
          </div>

          <span class="training-status ${
            plan.priority === "Alta" ? "status-high" :
            plan.priority === "Media" ? "status-medium" : "status-low"
          }">
            ${escapeHtml(plan.priority)}
          </span>

          <button
            class="icon-btn"
            data-delete-plan="${escapeHtml(plan.id)}"
            type="button"
            aria-label="Eliminar objetivo"
          >
            ×
          </button>
        </div>
      `).join("")
    : `<div class="empty-state">No hay objetivos de desarrollo registrados.</div>`;

  container.querySelectorAll("[data-delete-plan]").forEach(button => {
    button.addEventListener("click", () => {
      operator.developmentPlan = operator.developmentPlan.filter(item => item.id !== button.dataset.deletePlan);
      logChange("Eliminó objetivo de desarrollo", operator.name, button.dataset.deletePlan);
      saveState();
      renderAll();
    });
  });
}

function renderProfileGaps(operator) {
  const container = getElement("profileTraining");
  if (!container) return;

  const needs = machineIds()
    .map(machine => ({ machine, level: Number(operator.scores?.[machine] ?? 0) }))
    .filter(item => item.level < 2);

  container.innerHTML = needs.length
    ? needs.map(item => {
        const priority = item.level === 0 ? "Alta" : "Media";

        return `
          <div class="profile-training-item">
            <div>
              <strong>${escapeHtml(item.machine)}</strong>
              <br>
              <small>Nivel actual: ${item.level} · Objetivo recomendado: 2</small>
              <br>
              <small>Responsable: ${escapeHtml(operator.supervisor)}</small>
            </div>

            <span class="training-status ${priority === "Alta" ? "status-high" : "status-medium"}">
              ${priority}
            </span>
          </div>
        `;
      }).join("")
    : `<div class="empty-state">El operador no presenta brechas críticas.</div>`;
}

/* =========================================================
   HISTORIAL Y CONFIGURACIÓN
========================================================= */

function renderAuditLog() {
  const container = getElement("auditLog");
  if (!container) return;

  container.innerHTML = state.auditLog.length
    ? state.auditLog.map(entry => `
        <div class="audit-item">
          <div>
            <strong>${escapeHtml(entry.action)}</strong>
            <small>${escapeHtml(entry.entity)} · ${formatDateTime(entry.timestamp)}</small>
            <small>${escapeHtml(entry.detail)}</small>
          </div>
          <span>${escapeHtml(entry.user)}</span>
        </div>
      `).join("")
    : `<div class="empty-state">Todavía no hay cambios registrados.</div>`;
}

function renderCatalogs() {
  const mappings = [
    ["roleCatalog", "roles"],
    ["shiftCatalog", "shifts"],
    ["areaCatalog", "areas"]
  ];

  mappings.forEach(([elementId, type]) => {
    const container = getElement(elementId);
    if (!container) return;

    container.innerHTML = state.catalogs[type].map(value => `
      <div class="catalog-item">
        <span>${escapeHtml(value)}</span>
        <button
          class="icon-btn"
          data-delete-catalog="${type}"
          data-catalog-value="${escapeHtml(value)}"
          type="button"
          aria-label="Eliminar"
        >
          ×
        </button>
      </div>
    `).join("");
  });

  document.querySelectorAll("[data-delete-catalog]").forEach(button => {
    button.addEventListener("click", () => {
      const type = button.dataset.deleteCatalog;
      const value = button.dataset.catalogValue;

      const inUse = type === "roles"
        ? state.operators.some(operator => operator.role === value)
        : type === "shifts"
          ? state.operators.some(operator => operator.shift === value)
          : state.operators.some(operator => operator.area === value);

      if (inUse) {
        window.alert("Este valor está asignado a uno o más operadores y no puede eliminarse.");
        return;
      }

      state.catalogs[type] = state.catalogs[type].filter(item => item !== value);
      logChange("Eliminó elemento de catálogo", type, value);
      saveState();
      renderAll();
    });
  });

  populateOperatorCatalogInputs();
}

function populateOperatorCatalogInputs() {
  const roleSelect = getElement("operatorRole");
  const shiftSelect = getElement("operatorShift");

  if (roleSelect) {
    const current = roleSelect.value;
    roleSelect.innerHTML = state.catalogs.roles.map(value => `
      <option value="${escapeHtml(value)}">${escapeHtml(value)}</option>
    `).join("");
    if (state.catalogs.roles.includes(current)) roleSelect.value = current;
  }

  if (shiftSelect) {
    const current = shiftSelect.value;
    shiftSelect.innerHTML = state.catalogs.shifts.map(value => `
      <option value="${escapeHtml(value)}">${escapeHtml(value)}</option>
    `).join("");
    if (state.catalogs.shifts.includes(current)) shiftSelect.value = current;
  }
}

/* =========================================================
   BÚSQUEDA
========================================================= */

function renderSearchResults(query) {
  const container = getElement("searchResults");
  if (!container) return;

  const normalized = normalizeText(query);
  if (!normalized) {
    hideSearchResults();
    return;
  }

  const operators = state.operators.filter(operator => {
    return normalizeText([
      operator.name, operator.id, operator.role,
      operator.shift, operator.area, operator.supervisor
    ].join(" ")).includes(normalized);
  }).slice(0, 6);

  const machines = state.machines.filter(machine => {
    return normalizeText([machine.id, machine.family].join(" ")).includes(normalized);
  }).slice(0, 6);

  container.innerHTML = operators.map(operator => `
    <button
      class="search-result-item"
      data-result-type="operator"
      data-result-id="${escapeHtml(operator.id)}"
      type="button"
    >
      <span class="search-result-avatar">${initials(operator.name)}</span>
      <span class="search-result-info">
        <strong>${escapeHtml(operator.name)}</strong>
        <small>${escapeHtml(operator.id)} · ${escapeHtml(operator.role)} · ${escapeHtml(operator.shift)}</small>
      </span>
    </button>
  `).join("") + machines.map(machine => `
    <button
      class="search-result-item"
      data-result-type="machine"
      data-result-id="${escapeHtml(machine.id)}"
      type="button"
    >
      <span class="search-result-avatar">${escapeHtml(machine.family)}</span>
      <span class="search-result-info">
        <strong>${escapeHtml(machine.id)}</strong>
        <small>Máquina CNC · ${escapeHtml(machine.status)}</small>
      </span>
    </button>
  `).join("");

  if (!operators.length && !machines.length) {
    container.innerHTML = `<div class="search-no-results">No se encontraron coincidencias.</div>`;
  }

  container.hidden = false;
  container.classList.add("active");

  container.querySelectorAll(".search-result-item").forEach(button => {
    button.addEventListener("click", () => {
      if (button.dataset.resultType === "operator") {
        openOperatorProfile(button.dataset.resultId);
      } else {
        const familyFilter = getElement("machineFamilyFilter");
        if (familyFilter) familyFilter.value = "all";
        setView("machines");
        renderMachines(button.dataset.resultId);
        hideSearchResults();
      }
    });
  });
}

function hideSearchResults() {
  const container = getElement("searchResults");
  if (!container) return;
  container.hidden = true;
  container.classList.remove("active");
}

/* =========================================================
   RENDERIZADO GENERAL
========================================================= */

function renderAll() {
  renderDashboard();
  renderMatrix();
  renderOperators();
  renderMachines();
  renderTraining();
  renderAuditLog();
  renderCatalogs();

  if (state.selectedOperatorId) {
    const operator = state.operators.find(item => item.id === state.selectedOperatorId);
    if (operator) renderOperatorProfile(operator);
  }
}

/* =========================================================
   CRUD DE OPERADORES
========================================================= */

const operatorDialog = getElement("operatorDialog");
const operatorForm = getElement("operatorForm");
const editingOperatorIdInput = getElement("editingOperatorId");
const operatorIdInput = getElement("operatorId");
const operatorNameInput = getElement("operatorName");
const operatorRoleInput = getElement("operatorRole");
const operatorShiftInput = getElement("operatorShift");
const operatorAreaInput = getElement("operatorArea");
const operatorSupervisorInput = getElement("operatorSupervisor");
const operatorEntryDateInput = getElement("operatorEntryDate");
const operatorStatusInput = getElement("operatorStatus");

function setOperatorDialogText(mode) {
  const isEdit = mode === "edit";
  const title = getElement("operatorDialogTitle");
  const kicker = getElement("operatorDialogKicker");
  const saveButton = getElement("saveOperatorBtn");

  if (title) title.textContent = isEdit ? "Editar operador" : "Nuevo operador";
  if (kicker) kicker.textContent = isEdit ? "Actualización de personal" : "Alta de personal";
  if (saveButton) saveButton.textContent = isEdit ? "Guardar cambios" : "Guardar operador";
}

function openCreateOperatorDialog() {
  if (!operatorDialog || !operatorForm) return;

  operatorFormMode = "create";
  operatorForm.reset();
  populateOperatorCatalogInputs();

  editingOperatorIdInput.value = "";
  operatorIdInput.disabled = false;
  operatorAreaInput.value = state.catalogs.areas[0] || "Maquinado CNC";
  operatorSupervisorInput.value = "Por asignar";
  operatorEntryDateInput.value = today();
  operatorStatusInput.value = "Activo";

  setOperatorDialogText("create");
  operatorDialog.showModal();
  setTimeout(() => operatorNameInput?.focus(), 0);
}

function openEditOperatorDialog(operatorId) {
  if (!operatorDialog || !operatorForm) return;

  const operator = state.operators.find(item => item.id === operatorId);
  if (!operator) return;

  operatorFormMode = "edit";
  populateOperatorCatalogInputs();

  editingOperatorIdInput.value = operator.id;
  operatorNameInput.value = operator.name;
  operatorIdInput.value = operator.id;
  operatorIdInput.disabled = true;
  operatorRoleInput.value = operator.role;
  operatorShiftInput.value = operator.shift;
  operatorAreaInput.value = operator.area;
  operatorSupervisorInput.value = operator.supervisor;
  operatorEntryDateInput.value = operator.entryDate;
  operatorStatusInput.value = operator.status;

  setOperatorDialogText("edit");
  operatorDialog.showModal();
}

if (operatorForm && operatorDialog) {
  operatorForm.addEventListener("submit", event => {
    const submitter = event.submitter;
    if (!submitter || submitter.value === "cancel") return;

    event.preventDefault();

    const values = {
      id: operatorIdInput.value.trim(),
      name: operatorNameInput.value.trim(),
      role: operatorRoleInput.value || "Operador CNC",
      shift: operatorShiftInput.value || "Turno A",
      area: operatorAreaInput.value.trim() || "Maquinado CNC",
      supervisor: operatorSupervisorInput.value.trim() || "Por asignar",
      entryDate: operatorEntryDateInput.value || today(),
      status: operatorStatusInput.value || "Activo"
    };

    if (!values.id || !values.name) {
      window.alert("Ingresa el nombre y el número de empleado.");
      return;
    }

    if (operatorFormMode === "create") {
      const duplicate = state.operators.some(operator => normalizeText(operator.id) === normalizeText(values.id));
      if (duplicate) {
        window.alert("Ya existe un operador con ese número de empleado.");
        return;
      }

      const scores = {};
      machineIds().forEach(machineId => { scores[machineId] = 0; });

      state.operators.push({
        ...values,
        scores,
        certifications: {},
        trainingHistory: [],
        documents: [],
        developmentPlan: []
      });

      logChange("Creó operador", values.name, values.id);
      state.selectedOperatorId = null;
    } else {
      const operator = state.operators.find(item => item.id === editingOperatorIdInput.value);
      if (!operator) return;

      const before = `${operator.role}, ${operator.shift}, ${operator.supervisor}`;

      Object.assign(operator, {
        name: values.name,
        role: values.role,
        shift: values.shift,
        area: values.area,
        supervisor: values.supervisor,
        entryDate: values.entryDate,
        status: values.status
      });

      logChange(
        "Editó operador",
        operator.name,
        `${before} → ${operator.role}, ${operator.shift}, ${operator.supervisor}`
      );

      state.selectedOperatorId = operator.id;
    }

    saveState();
    renderAll();
    operatorDialog.close();

    if (operatorFormMode === "edit" && state.selectedOperatorId) {
      openOperatorProfile(state.selectedOperatorId);
    } else {
      setView("operators");
    }
  });

  operatorDialog.addEventListener("close", () => {
    operatorForm.reset();
    operatorIdInput.disabled = false;
    editingOperatorIdInput.value = "";
    operatorFormMode = "create";
    setOperatorDialogText("create");
  });
}

/* =========================================================
   CRUD DE MÁQUINAS
========================================================= */

const machineDialog = getElement("machineDialog");
const machineForm = getElement("machineForm");

function setMachineDialogText(mode) {
  const isEdit = mode === "edit";
  const title = getElement("machineDialogTitle");
  const saveButton = getElement("saveMachineBtn");

  if (title) title.textContent = isEdit ? "Editar máquina" : "Nueva máquina";
  if (saveButton) saveButton.textContent = isEdit ? "Guardar cambios" : "Guardar máquina";
}

function openCreateMachineDialog() {
  if (!machineDialog || !machineForm) return;

  machineFormMode = "create";
  machineForm.reset();
  getElement("editingMachineId").value = "";
  getElement("machineId").disabled = false;
  getElement("machineMinimumCoverage").value = 2;
  getElement("machineStatus").value = "Activa";
  setMachineDialogText("create");
  machineDialog.showModal();
}

function openEditMachineDialog(machineId) {
  if (!machineDialog || !machineForm) return;

  const machine = getMachine(machineId);
  if (!machine) return;

  machineFormMode = "edit";
  getElement("editingMachineId").value = machine.id;
  getElement("machineId").value = machine.id;
  getElement("machineId").disabled = true;
  getElement("machineFamily").value = machine.family;
  getElement("machineMinimumCoverage").value = machine.minimumCoverage;
  getElement("machineStatus").value = machine.status;
  setMachineDialogText("edit");
  machineDialog.showModal();
}

function deleteMachine(machineId) {
  const machine = getMachine(machineId);
  if (!machine) return;

  if (!window.confirm(
    `¿Deseas eliminar ${machine.id}?\n\nSe eliminarán también sus niveles y certificaciones asociadas.`
  )) return;

  state.machines = state.machines.filter(item => item.id !== machineId);

  state.operators.forEach(operator => {
    delete operator.scores[machineId];
    delete operator.certifications[machineId];
    operator.developmentPlan = operator.developmentPlan.filter(plan => plan.machine !== machineId);
  });

  logChange("Eliminó máquina", machine.id, machine.family);
  saveState();
  renderAll();
}

if (machineForm && machineDialog) {
  machineForm.addEventListener("submit", event => {
    const submitter = event.submitter;
    if (!submitter || submitter.value === "cancel") return;

    event.preventDefault();

    const id = getElement("machineId").value.trim().toUpperCase();
    const family = getElement("machineFamily").value.trim().toUpperCase() || familyOf(id);
    const minimumCoverage = Math.max(1, Number(getElement("machineMinimumCoverage").value || 2));
    const status = getElement("machineStatus").value || "Activa";

    if (!id || !family) {
      window.alert("Ingresa el identificador y la familia.");
      return;
    }

    if (machineFormMode === "create") {
      if (state.machines.some(machine => normalizeText(machine.id) === normalizeText(id))) {
        window.alert("Ya existe una máquina con ese identificador.");
        return;
      }

      state.machines.push({ id, family, minimumCoverage, status });
      state.operators.forEach(operator => { operator.scores[id] = 0; });
      logChange("Creó máquina", id, family);
    } else {
      const machine = getMachine(getElement("editingMachineId").value);
      if (!machine) return;

      const before = `${machine.family}, cobertura ${machine.minimumCoverage}, ${machine.status}`;
      Object.assign(machine, { family, minimumCoverage, status });
      logChange("Editó máquina", machine.id, `${before} → ${family}, cobertura ${minimumCoverage}, ${status}`);
    }

    saveState();
    renderAll();
    machineDialog.close();
    setView("machines");
  });

  machineDialog.addEventListener("close", () => {
    machineForm.reset();
    getElement("machineId").disabled = false;
    machineFormMode = "create";
    setMachineDialogText("create");
  });
}

/* =========================================================
   CERTIFICACIONES, HISTORIAL Y DESARROLLO
========================================================= */

function populateMachineSelect(selectId, includeGeneral = false) {
  const select = getElement(selectId);
  if (!select) return;

  select.innerHTML = `
    ${includeGeneral ? '<option value="">General</option>' : ""}
    ${state.machines.map(machine => `
      <option value="${escapeHtml(machine.id)}">${escapeHtml(machine.id)}</option>
    `).join("")}
  `;
}

getElement("certificationForm")?.addEventListener("submit", event => {
  if (!event.submitter || event.submitter.value === "cancel") return;
  event.preventDefault();

  const operator = state.operators.find(item => item.id === state.selectedOperatorId);
  if (!operator) return;

  const machine = getElement("certificationMachine").value;

  operator.certifications[machine] = {
    evaluator: getElement("certificationEvaluator").value.trim(),
    date: getElement("certificationDate").value,
    expiration: getElement("certificationExpiration").value,
    evidence: getElement("certificationEvidence").value.trim()
  };

  if (Number(operator.scores[machine] ?? 0) < 3) operator.scores[machine] = 3;

  logChange("Registró certificación", operator.name, machine);
  saveState();
  renderAll();
  getElement("certificationDialog").close();
});

getElement("trainingHistoryForm")?.addEventListener("submit", async event => {
  if (!event.submitter || event.submitter.value === "cancel") return;
  event.preventDefault();

  const operator = state.operators.find(item => item.id === state.selectedOperatorId);
  if (!operator) return;

  const machine = getElement("historyMachine").value;
  const level = Number(getElement("historyLevel").value);
  const result = getElement("historyResult").value;
  const selectedFile = getElement("historyFile")?.files?.[0] || null;

  if (!machine) {
    window.alert("Selecciona la máquina relacionada con la capacitación o evaluación.");
    return;
  }

  if (!Number.isInteger(level) || level < 1 || level > 4) {
    window.alert("Selecciona el nivel evaluado.");
    return;
  }

  if (!result) {
    window.alert("Selecciona el resultado de la evaluación.");
    return;
  }

  let storedFile = null;

  try {
    storedFile = await saveLocalFile(selectedFile, "training-history", operator.id);
  } catch (error) {
    console.error(error);
    window.alert("No fue posible guardar el archivo. El registro no fue creado.");
    return;
  }

  const oldLevel = Number(operator.scores?.[machine] ?? 0);
  let matrixMessage = "La matriz no fue modificada.";

  if (result === "Apto") {
    if (level > oldLevel) {
      operator.scores[machine] = level;
      matrixMessage = `Matriz actualizada: ${machine}, Nivel ${oldLevel} → Nivel ${level}.`;
    } else if (level === oldLevel) {
      matrixMessage = `El operador ya se encontraba en Nivel ${level}.`;
    } else {
      matrixMessage = `Se conservó el Nivel ${oldLevel} porque es superior al nivel evaluado.`;
    }
  }

  operator.trainingHistory.push({
    id: uid("HIST"),
    date: getElement("historyDate").value,
    type: getElement("historyType").value,
    machine,
    level,
    result,
    responsible: getElement("historyResponsible").value.trim(),
    description: getElement("historyDescription").value.trim(),
    file: storedFile
  });

  logChange(
    result === "Apto" && level > oldLevel ? "Evaluó y actualizó competencia" : "Registró capacitación",
    operator.name,
    `${machine} · Nivel ${level} · ${result}. ${matrixMessage}`
  );

  saveState();
  renderAll();
  getElement("trainingHistoryDialog").close();
  window.alert(`Registro guardado correctamente.

${matrixMessage}`);
});

getElement("operatorDocumentForm")?.addEventListener("submit", async event => {
  if (!event.submitter || event.submitter.value === "cancel") return;
  event.preventDefault();

  const operator = state.operators.find(item => item.id === state.selectedOperatorId);
  if (!operator) return;

  const selectedFile = getElement("operatorDocumentFile")?.files?.[0];

  if (!selectedFile) {
    window.alert("Selecciona el archivo que deseas guardar.");
    return;
  }

  let storedFile;

  try {
    storedFile = await saveLocalFile(selectedFile, "operator-document", operator.id);
  } catch (error) {
    console.error(error);
    window.alert("No fue posible guardar el documento en este navegador.");
    return;
  }

  const documentRecord = {
    id: uid("DOC"),
    type: getElement("operatorDocumentType").value,
    date: getElement("operatorDocumentDate").value,
    name: getElement("operatorDocumentName").value.trim(),
    expiration: getElement("operatorDocumentExpiration").value,
    responsible: getElement("operatorDocumentResponsible").value.trim(),
    notes: getElement("operatorDocumentNotes").value.trim(),
    file: storedFile
  };

  operator.documents.push(documentRecord);

  logChange("Subió documento", operator.name, `${documentRecord.type}: ${documentRecord.name}`);
  saveState();
  renderAll();
  getElement("operatorDocumentDialog").close();
});

getElement("developmentPlanForm")?.addEventListener("submit", event => {
  if (!event.submitter || event.submitter.value === "cancel") return;
  event.preventDefault();

  const operator = state.operators.find(item => item.id === state.selectedOperatorId);
  if (!operator) return;

  operator.developmentPlan.push({
    id: uid("PLAN"),
    machine: getElement("developmentMachine").value,
    targetLevel: Number(getElement("developmentTargetLevel").value),
    responsible: getElement("developmentResponsible").value.trim(),
    targetDate: getElement("developmentTargetDate").value,
    priority: getElement("developmentPriority").value,
    status: getElement("developmentStatus").value,
    evidence: getElement("developmentEvidence").value.trim()
  });

  logChange("Agregó objetivo de desarrollo", operator.name, getElement("developmentMachine").value);
  saveState();
  renderAll();
  getElement("developmentPlanDialog").close();
});

/* =========================================================
   CATÁLOGOS
========================================================= */

function openCatalogDialog(type, title) {
  const dialog = getElement("catalogDialog");
  const form = getElement("catalogForm");
  if (!dialog || !form) return;

  form.reset();
  getElement("catalogType").value = type;
  getElement("catalogDialogTitle").textContent = title;
  dialog.showModal();
}

getElement("catalogForm")?.addEventListener("submit", event => {
  if (!event.submitter || event.submitter.value === "cancel") return;
  event.preventDefault();

  const type = getElement("catalogType").value;
  const value = getElement("catalogValue").value.trim();

  if (!value || !state.catalogs[type]) return;

  if (state.catalogs[type].some(item => normalizeText(item) === normalizeText(value))) {
    window.alert("Ese elemento ya existe.");
    return;
  }

  state.catalogs[type].push(value);
  logChange("Agregó elemento de catálogo", type, value);
  saveState();
  renderAll();
  getElement("catalogDialog").close();
});

/* =========================================================
   EXPORTACIÓN Y RESPALDO
========================================================= */

function exportMatrix() {
  const headers = ["Empleado", "Nombre", "Puesto", "Turno", ...machineIds(), "Promedio"];
  const rows = state.operators.map(operator => [
    operator.id,
    operator.name,
    operator.role,
    operator.shift,
    ...machineIds().map(machineId => operator.scores?.[machineId] ?? 0),
    operatorAverage(operator).toFixed(2)
  ]);

  exportRows(`Skills_Matrix_${today()}.csv`, headers, rows);
  logChange("Exportó matriz", "Sistema", `${rows.length} operadores`);
  saveState();
  renderAuditLog();
}

function exportTraining() {
  const rows = trainingRows();
  exportRows(
    `Plan_Capacitacion_${today()}.csv`,
    ["Operador", "Máquina", "Nivel actual", "Nivel objetivo", "Responsable", "Fecha objetivo", "Estatus", "Evidencia", "Prioridad"],
    rows.map(row => [
      row.operator, row.machine, row.current, row.target, row.responsible,
      row.targetDate, row.status, row.evidence, row.priority
    ])
  );
}

function exportHistory() {
  exportRows(
    `Historial_Cambios_${today()}.csv`,
    ["Fecha", "Usuario", "Acción", "Entidad", "Detalle"],
    state.auditLog.map(entry => [
      formatDateTime(entry.timestamp), entry.user, entry.action, entry.entity, entry.detail
    ])
  );
}

function exportBackup() {
  downloadText(
    `CNC_Skills_Backup_${today()}.json`,
    JSON.stringify({
      version: "1.1",
      exportedAt: nowIso(),
      machines: state.machines,
      operators: state.operators,
      catalogs: state.catalogs,
      auditLog: state.auditLog
    }, null, 2),
    "application/json;charset=utf-8"
  );
}

function importBackup(file) {
  if (!file) return;

  const reader = new FileReader();

  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const imported = normalizeStoredState(parsed);

      if (!window.confirm(
        `Se importarán ${imported.operators.length} operadores y ${imported.machines.length} máquinas. ¿Continuar?`
      )) return;

      state = imported;
      logChange("Importó respaldo", "Sistema", file.name);
      saveState();
      renderAll();
      setView("dashboard");
      window.alert("Respaldo importado correctamente.");
    } catch (error) {
      console.error(error);
      window.alert("El archivo seleccionado no contiene un respaldo válido.");
    }
  };

  reader.readAsText(file);
}

/* =========================================================
   EVENTOS GENERALES
========================================================= */

document.querySelectorAll(".nav-item").forEach(button => {
  button.addEventListener("click", () => setView(button.dataset.view));
});

document.querySelectorAll("[data-go]").forEach(button => {
  button.addEventListener("click", () => setView(button.dataset.go));
});

["matrixFamilyFilter", "matrixOperatorFilter", "matrixShiftFilter"].forEach(id => {
  getElement(id)?.addEventListener("change", renderMatrix);
});

getElement("machineFamilyFilter")?.addEventListener("change", () => renderMachines());
getElement("trainingStatusFilter")?.addEventListener("change", renderTraining);

getElement("addOperatorBtn2")?.addEventListener("click", openCreateOperatorDialog);
getElement("addMachineBtn")?.addEventListener("click", openCreateMachineDialog);

getElement("editOperatorBtn")?.addEventListener("click", () => {
  if (state.selectedOperatorId) openEditOperatorDialog(state.selectedOperatorId);
});

getElement("deleteOperatorBtn")?.addEventListener("click", async () => {
  const operator = state.operators.find(item => item.id === state.selectedOperatorId);
  if (!operator) return;

  if (!window.confirm(
    `¿Deseas eliminar a ${operator.name} (${operator.id})?\n\nEsta acción no se puede deshacer.`
  )) return;

  const relatedFileIds = [
    ...(operator.trainingHistory || []).map(item => item.file?.id),
    ...(operator.documents || []).map(item => item.file?.id)
  ].filter(Boolean);

  await Promise.all(relatedFileIds.map(fileId => deleteLocalFile(fileId).catch(console.error)));

  state.operators = state.operators.filter(item => item.id !== operator.id);
  logChange("Eliminó operador", operator.name, operator.id);
  state.selectedOperatorId = null;
  state.previousView = "operators";
  saveState();
  renderAll();
  setView("operators");
});

getElement("backToOperatorsBtn")?.addEventListener("click", () => {
  const returnView = state.previousView && state.previousView !== "operatorProfile"
    ? state.previousView
    : "operators";

  setView(returnView);
});

getElement("addCertificationBtn")?.addEventListener("click", () => {
  const operator = state.operators.find(item => item.id === state.selectedOperatorId);
  if (!operator) return;

  const form = getElement("certificationForm");
  form.reset();
  populateMachineSelect("certificationMachine");
  getElement("certificationEvaluator").value = operator.supervisor;
  getElement("certificationDate").value = today();
  getElement("certificationDialog").showModal();
});

getElement("addTrainingHistoryBtn")?.addEventListener("click", () => {
  const operator = state.operators.find(item => item.id === state.selectedOperatorId);
  if (!operator) return;

  const form = getElement("trainingHistoryForm");
  form.reset();
  populateMachineSelect("historyMachine", false);
  getElement("historyDate").value = today();
  getElement("historyResponsible").value = operator.supervisor;
  getElement("historyLevel").value = "";
  getElement("historyResult").value = "";
  getElement("trainingHistoryDialog").showModal();
});

getElement("addOperatorDocumentBtn")?.addEventListener("click", () => {
  const operator = state.operators.find(item => item.id === state.selectedOperatorId);
  if (!operator) return;

  const form = getElement("operatorDocumentForm");
  form.reset();
  getElement("operatorDocumentDate").value = today();
  getElement("operatorDocumentResponsible").value = operator.supervisor;
  getElement("operatorDocumentDialog").showModal();
});

getElement("addDevelopmentPlanBtn")?.addEventListener("click", () => {
  const operator = state.operators.find(item => item.id === state.selectedOperatorId);
  if (!operator) return;

  const form = getElement("developmentPlanForm");
  form.reset();
  populateMachineSelect("developmentMachine");
  getElement("developmentResponsible").value = operator.supervisor;
  getElement("developmentTargetDate").value = today();
  getElement("developmentPlanDialog").showModal();
});

getElement("addRoleBtn")?.addEventListener("click", () => openCatalogDialog("roles", "Nuevo puesto"));
getElement("addShiftBtn")?.addEventListener("click", () => openCatalogDialog("shifts", "Nuevo turno"));
getElement("addAreaBtn")?.addEventListener("click", () => openCatalogDialog("areas", "Nueva área"));

getElement("exportMatrixBtn")?.addEventListener("click", exportMatrix);
getElement("exportTrainingBtn")?.addEventListener("click", exportTraining);
getElement("exportHistoryBtn")?.addEventListener("click", exportHistory);
getElement("exportBackupBtn")?.addEventListener("click", exportBackup);

getElement("importBackupBtn")?.addEventListener("click", () => {
  getElement("importBackupInput")?.click();
});

getElement("importBackupInput")?.addEventListener("change", event => {
  importBackup(event.target.files?.[0]);
  event.target.value = "";
});

const globalSearch = getElement("globalSearch");

globalSearch?.addEventListener("input", event => {
  renderSearchResults(event.target.value);
});

globalSearch?.addEventListener("focus", event => {
  if (event.target.value.trim()) renderSearchResults(event.target.value);
});

globalSearch?.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    globalSearch.value = "";
    hideSearchResults();
  }
});

document.addEventListener("click", event => {
  const searchContainer = document.querySelector(".search-container");
  if (searchContainer && !searchContainer.contains(event.target)) hideSearchResults();
});

/* =========================================================
   INICIALIZACIÓN
========================================================= */

renderAll();
