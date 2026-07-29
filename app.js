"use strict";

/* =========================================================
   CONFIGURACIÓN
========================================================= */

const STORAGE_KEY = "cncSkillsPortalData_v1";

const defaultMachines = [
  "CMV-003",
  "CMV-004",
  "CMV-005",
  "CMV-006",
  "TCN-001",
  "TCN-002",
  "TCN-005",
  "CMH-004",
  "RV-001",
  "RV-002",
  "TCN-009",
  "TCN-010",
  "TCN-011",
  "TCN-012"
];

const defaultOperators = [
  {
    id: "OP-001",
    name: "Juan Pérez",
    role: "Operador CNC",
    shift: "Turno A",
    area: "Maquinado CNC",
    supervisor: "Supervisor A",
    entryDate: "2024-01-15",
    status: "Activo",
    scores: {}
  },
  {
    id: "OP-002",
    name: "Luis Martínez",
    role: "Setup Technician",
    shift: "Turno A",
    area: "Maquinado CNC",
    supervisor: "Supervisor A",
    entryDate: "2022-08-10",
    status: "Activo",
    scores: {}
  },
  {
    id: "OP-003",
    name: "Marco Rodríguez",
    role: "Operador CNC",
    shift: "Turno B",
    area: "Maquinado CNC",
    supervisor: "Supervisor B",
    entryDate: "2025-02-03",
    status: "Activo",
    scores: {}
  },
  {
    id: "OP-004",
    name: "Alejandro Torres",
    role: "Entrenador",
    shift: "Turno B",
    area: "Maquinado CNC",
    supervisor: "Supervisor B",
    entryDate: "2020-05-18",
    status: "Activo",
    scores: {}
  },
  {
    id: "OP-005",
    name: "José Hernández",
    role: "Operador CNC",
    shift: "Turno C",
    area: "Maquinado CNC",
    supervisor: "Supervisor C",
    entryDate: "2025-09-01",
    status: "Activo",
    scores: {}
  },
  {
    id: "OP-006",
    name: "Miguel Sánchez",
    role: "Operador CNC",
    shift: "Turno C",
    area: "Maquinado CNC",
    supervisor: "Supervisor C",
    entryDate: "2023-11-20",
    status: "Activo",
    scores: {}
  }
];

const baseScoreRows = [
  [3, 3, 2, 1, 3, 2, 1, 2, 0, 0, 1, 1, 0, 0],
  [4, 4, 3, 3, 4, 3, 2, 3, 2, 2, 3, 3, 2, 2],
  [2, 2, 1, 0, 2, 1, 0, 1, 0, 0, 1, 1, 1, 0],
  [4, 4, 4, 3, 4, 4, 3, 4, 3, 3, 4, 4, 3, 3],
  [1, 2, 1, 0, 2, 1, 0, 1, 0, 0, 0, 1, 0, 0],
  [3, 2, 2, 1, 3, 2, 1, 2, 1, 1, 2, 2, 1, 1]
];

const pageTitles = {
  dashboard: "Dashboard",
  matrix: "Matriz de habilidades",
  operators: "Operadores",
  machines: "Máquinas",
  training: "Capacitación",
  operatorProfile: "Perfil del operador"
};

const levelNames = [
  "No entrenado",
  "En entrenamiento",
  "Con supervisión",
  "Certificado",
  "Experto / Entrenador"
];

/* =========================================================
   CREACIÓN Y CARGA DEL ESTADO
========================================================= */

function createInitialState() {
  const operators = defaultOperators.map((operator, operatorIndex) => {
    const scores = {};

    defaultMachines.forEach((machine, machineIndex) => {
      scores[machine] =
        baseScoreRows[operatorIndex]?.[machineIndex] ?? 0;
    });

    return {
      ...operator,
      scores,
      certifications: {},
      trainingHistory: [],
      developmentPlan: []
    };
  });

  return {
    machines: [...defaultMachines],
    operators,
    selectedOperatorId: null,
    previousView: "dashboard"
  };
}

function normalizeStoredState(savedState) {
  const machines =
    Array.isArray(savedState.machines) && savedState.machines.length
      ? savedState.machines
          .map(machine => String(machine).trim())
          .filter(Boolean)
      : [...defaultMachines];

  const operators = Array.isArray(savedState.operators)
    ? savedState.operators
        .map(operator => {
          const scores = {};

          machines.forEach(machine => {
            const level = Number(operator.scores?.[machine] ?? 0);

            scores[machine] =
              Number.isInteger(level) && level >= 0 && level <= 4
                ? level
                : 0;
          });

          return {
            id: String(operator.id ?? "").trim(),
            name: String(operator.name ?? "").trim(),
            role: operator.role || "Operador CNC",
            shift: operator.shift || "Turno A",
            area: operator.area || "Maquinado CNC",
            supervisor: operator.supervisor || "Por asignar",
            entryDate:
              operator.entryDate ||
              operator.hireDate ||
              new Date().toISOString().slice(0, 10),
            status: operator.status || "Activo",
            scores,
            certifications:
              operator.certifications &&
              typeof operator.certifications === "object"
                ? operator.certifications
                : {},
            trainingHistory: Array.isArray(operator.trainingHistory)
              ? operator.trainingHistory
              : [],
            developmentPlan: Array.isArray(operator.developmentPlan)
              ? operator.developmentPlan
              : []
          };
        })
        .filter(operator => operator.id && operator.name)
    : [];

  return {
    machines,
    operators,
    selectedOperatorId: null,
    previousView: "dashboard"
  };
}

function loadState() {
  try {
    const storedData = localStorage.getItem(STORAGE_KEY);

    if (!storedData) {
      return createInitialState();
    }

    const parsedData = JSON.parse(storedData);

    return normalizeStoredState(parsedData);
  } catch (error) {
    console.error("Error al cargar localStorage:", error);

    return createInitialState();
  }
}

let state = loadState();

let operatorFormMode = "create";

function saveState() {
  try {
    const persistentState = {
      machines: state.machines,
      operators: state.operators
    };

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(persistentState)
    );
  } catch (error) {
    console.error("Error al guardar localStorage:", error);

    window.alert(
      "No fue posible guardar la información en este navegador."
    );
  }
}

/*
  Guarda los datos iniciales únicamente cuando todavía
  no existe información en localStorage.
*/
if (!localStorage.getItem(STORAGE_KEY)) {
  saveState();
}

/* =========================================================
   FUNCIONES GENERALES
========================================================= */

function getElement(id) {
  return document.getElementById(id);
}

function familyOf(machine) {
  return String(machine).split("-")[0];
}

function initials(name) {
  return String(name)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0))
    .join("")
    .toUpperCase();
}

function operatorAverage(operator, machines = state.machines) {
  if (!operator || !machines.length) {
    return 0;
  }

  const total = machines.reduce((sum, machine) => {
    return sum + Number(operator.scores?.[machine] ?? 0);
  }, 0);

  return total / machines.length;
}

function pctFromLevel(level) {
  return Math.round((Number(level) / 4) * 100);
}

function scoreClass(percent) {
  if (percent >= 80) {
    return "score-good";
  }

  if (percent >= 60) {
    return "score-mid";
  }

  return "score-low";
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, character => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;"
    };

    return entities[character];
  });
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatDate(value) {
  if (!value) {
    return "Sin registrar";
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

function getCurrentView() {
  return document.querySelector(".view.active")?.id || "dashboard";
}

/* =========================================================
   NAVEGACIÓN
========================================================= */

function setView(viewId) {
  const selectedView = getElement(viewId);

  if (!selectedView) {
    return;
  }

  document.querySelectorAll(".view").forEach(view => {
    view.classList.toggle("active", view.id === viewId);
  });

  document.querySelectorAll(".nav-item").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.view === viewId
    );
  });

  const pageTitle = getElement("pageTitle");

  if (pageTitle) {
    pageTitle.textContent =
      pageTitles[viewId] || "Skills Matrix";
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

/* =========================================================
   CÁLCULOS
========================================================= */

function levelCounts(operators = state.operators) {
  const counts = [0, 0, 0, 0, 0];

  operators.forEach(operator => {
    state.machines.forEach(machine => {
      const level = Number(operator.scores?.[machine] ?? 0);

      if (level >= 0 && level <= 4) {
        counts[level] += 1;
      }
    });
  });

  return counts;
}

/* =========================================================
   DASHBOARD
========================================================= */

function renderDashboard() {
  const operatorCount = getElement("operatorCount");
  const globalScore = getElement("globalScore");
  const criticalGapCount = getElement("criticalGapCount");

  if (operatorCount) {
    operatorCount.textContent = state.operators.length;
  }

  const overall = state.operators.length
    ? state.operators.reduce((sum, operator) => {
        return sum + operatorAverage(operator);
      }, 0) / state.operators.length
    : 0;

  if (globalScore) {
    globalScore.textContent = `${pctFromLevel(overall)}%`;
  }

  const counts = levelCounts();

  counts.forEach((count, index) => {
    const counter = getElement(`level${index}Count`);

    if (counter) {
      counter.textContent = count;
    }
  });

  const total = counts.reduce((sum, count) => sum + count, 0);

  const assignmentTotal = getElement("assignmentTotal");

  if (assignmentTotal) {
    assignmentTotal.textContent = `${total} asignaciones`;
  }

  const levelDistribution = getElement("levelDistribution");

  if (levelDistribution) {
    levelDistribution.innerHTML = counts
      .map((count, index) => {
        const percentage = total
          ? Math.round((count / total) * 100)
          : 0;

        return `
          <div class="level-distribution-row">

            <div class="level-distribution-label">
              <i class="level-dot level-${index}"></i>
              <span>Nivel ${index}</span>
            </div>

            <div class="level-bar-track">
              <div
                class="level-bar-fill level-${index}"
                style="width: ${percentage}%"
              ></div>
            </div>

            <div class="level-distribution-value">
              ${count}
            </div>

          </div>
        `;
      })
      .join("");
  }

  const gaps = [];

  state.machines.forEach(machine => {
    const average = state.operators.length
      ? state.operators.reduce((sum, operator) => {
          return sum + Number(operator.scores?.[machine] ?? 0);
        }, 0) / state.operators.length
      : 0;

    if (average < 2) {
      gaps.push({
        machine,
        avg: average
      });
    }
  });

  if (criticalGapCount) {
    criticalGapCount.textContent = gaps.length;
  }

  renderFamilyCoverage();
  renderPriorityList(gaps);
  renderOperatorSummary();
}

function renderFamilyCoverage() {
  const container = getElement("familyCoverage");

  if (!container) {
    return;
  }

  const families = [
    ...new Set(state.machines.map(familyOf))
  ];

  container.innerHTML = families
    .map(family => {
      const machines = state.machines.filter(machine => {
        return familyOf(machine) === family;
      });

      const average = state.operators.length
        ? state.operators.reduce((sum, operator) => {
            return sum + operatorAverage(operator, machines);
          }, 0) / state.operators.length
        : 0;

      const percentage = pctFromLevel(average);

      return `
        <div class="coverage-row">

          <strong>${family}</strong>

          <div class="progress-track">
            <div
              class="progress-fill"
              style="width: ${percentage}%"
            ></div>
          </div>

          <span>${percentage}%</span>

        </div>
      `;
    })
    .join("");
}

function renderPriorityList(gaps) {
  const container = getElement("priorityList");

  if (!container) {
    return;
  }

  const orderedGaps = [...gaps]
    .sort((first, second) => first.avg - second.avg)
    .slice(0, 5);

  if (!orderedGaps.length) {
    container.innerHTML = `
      <div class="empty-state">
        No se detectaron brechas críticas.
      </div>
    `;

    return;
  }

  container.innerHTML = orderedGaps
    .map(item => {
      return `
        <div class="priority-item">

          <div>
            <strong>${item.machine}</strong>

            <small>
              Nivel promedio ${item.avg.toFixed(1)} de 4
            </small>
          </div>

          <span class="priority-badge">
            ALTA
          </span>

        </div>
      `;
    })
    .join("");
}

function renderOperatorSummary() {
  const container = getElement("operatorSummary");

  if (!container) {
    return;
  }

  container.innerHTML = state.operators
    .map(operator => {
      const percentage = pctFromLevel(
        operatorAverage(operator)
      );

      return `
        <button
          class="summary-row clickable"
          data-summary-operator-id="${escapeHtml(operator.id)}"
          type="button"
        >

          <span class="operator-meta">

            <span class="avatar">
              ${initials(operator.name)}
            </span>

            <span>
              <strong>${escapeHtml(operator.name)}</strong>

              <small>
                ${escapeHtml(operator.role)} ·
                ${escapeHtml(operator.shift)}
              </small>
            </span>

          </span>

          <span class="score-pill ${scoreClass(percentage)}">
            ${percentage}%
          </span>

        </button>
      `;
    })
    .join("");

  container
    .querySelectorAll("[data-summary-operator-id]")
    .forEach(button => {
      button.addEventListener("click", () => {
        openOperatorProfile(
          button.dataset.summaryOperatorId
        );
      });
    });
}

/* =========================================================
   MATRIZ
========================================================= */

function renderMatrix() {
  const familyFilter = getElement("matrixFamilyFilter");
  const matrixHead = getElement("matrixHead");
  const matrixBody = getElement("matrixBody");

  if (!familyFilter || !matrixHead || !matrixBody) {
    return;
  }

  const selectedFamily = familyFilter.value;

  const machines =
    selectedFamily === "all"
      ? state.machines
      : state.machines.filter(machine => {
          return familyOf(machine) === selectedFamily;
        });

  matrixHead.innerHTML = `
    <tr>
      <th>Operador</th>

      ${machines
        .map(machine => `<th>${escapeHtml(machine)}</th>`)
        .join("")}

      <th>Promedio</th>
    </tr>
  `;

  matrixBody.innerHTML = state.operators
    .map(operator => {
      return `
        <tr>

          <td>
            <button
              class="operator-link"
              data-matrix-operator-id="${escapeHtml(operator.id)}"
              type="button"
            >
              <strong>${escapeHtml(operator.name)}</strong>

              <br>

              <small>
                ${escapeHtml(operator.id)} ·
                ${escapeHtml(operator.shift)}
              </small>
            </button>
          </td>

          ${machines
            .map(machine => {
              const level = Number(
                operator.scores?.[machine] ?? 0
              );

              return `
                <td>
                  <span
                    class="skill-level level-${level}"
                    title="${escapeHtml(levelNames[level])}"
                  >
                    ${level}
                  </span>
                </td>
              `;
            })
            .join("")}

          <td>
            <strong>
              ${operatorAverage(operator, machines).toFixed(1)}
            </strong>
          </td>

        </tr>
      `;
    })
    .join("");

  matrixBody
    .querySelectorAll("[data-matrix-operator-id]")
    .forEach(button => {
      button.addEventListener("click", () => {
        openOperatorProfile(
          button.dataset.matrixOperatorId
        );
      });
    });
}

/* =========================================================
   OPERADORES
========================================================= */

function renderOperators(filter = "") {
  const container = getElement("operatorCards");

  if (!container) {
    return;
  }

  const query = normalizeText(filter);

  const operators = state.operators.filter(operator => {
    const searchableText = normalizeText(
      [
        operator.name,
        operator.id,
        operator.role,
        operator.shift,
        operator.area,
        operator.supervisor,
        operator.status
      ].join(" ")
    );

    return searchableText.includes(query);
  });

  if (!operators.length) {
    container.innerHTML = `
      <div class="empty-state">
        No se encontraron operadores.
      </div>
    `;

    return;
  }

  container.innerHTML = operators
    .map(operator => {
      const average = operatorAverage(operator);
      const percentage = pctFromLevel(average);

      const certified = state.machines.filter(machine => {
        return Number(operator.scores?.[machine] ?? 0) >= 3;
      }).length;

      return `
        <article
          class="person-card clickable-card"
          data-card-operator-id="${escapeHtml(operator.id)}"
          tabindex="0"
          role="button"
        >

          <div class="person-header">

            <div class="avatar">
              ${initials(operator.name)}
            </div>

            <div>
              <h4>${escapeHtml(operator.name)}</h4>

              <div class="card-subtitle">
                ${escapeHtml(operator.id)} ·
                ${escapeHtml(operator.role)}
              </div>
            </div>

          </div>

          <div class="card-subtitle">
            ${escapeHtml(operator.area)}
            · ${escapeHtml(operator.shift)}
          </div>

          <div class="card-subtitle">
            Supervisor:
            ${escapeHtml(operator.supervisor)}
          </div>

          <div class="card-subtitle">
            Ingreso:
            ${formatDate(operator.entryDate)}
            · ${escapeHtml(operator.status)}
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
    })
    .join("");

  container
    .querySelectorAll("[data-card-operator-id]")
    .forEach(card => {
      const openCard = () => {
        openOperatorProfile(
          card.dataset.cardOperatorId
        );
      };

      card.addEventListener("click", openCard);

      card.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openCard();
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

  if (!familyFilter || !container) {
    return;
  }

  const selectedFamily = familyFilter.value;
  const query = normalizeText(filter);

  const machines = state.machines.filter(machine => {
    const matchesFamily =
      selectedFamily === "all" ||
      familyOf(machine) === selectedFamily;

    const matchesSearch =
      normalizeText(machine).includes(query);

    return matchesFamily && matchesSearch;
  });

  if (!machines.length) {
    container.innerHTML = `
      <div class="empty-state">
        No se encontraron máquinas.
      </div>
    `;

    return;
  }

  container.innerHTML = machines
    .map(machine => {
      const certifiedOperators = state.operators.filter(operator => {
        return Number(operator.scores?.[machine] ?? 0) >= 3;
      });

      const average = state.operators.length
        ? state.operators.reduce((sum, operator) => {
            return sum + Number(operator.scores?.[machine] ?? 0);
          }, 0) / state.operators.length
        : 0;

      const shiftsCovered = [
        ...new Set(
          certifiedOperators.map(operator => operator.shift)
        )
      ];

      const trainer = certifiedOperators.find(operator => {
        return Number(operator.scores?.[machine] ?? 0) >= 4;
      });

      const minimumCoverage = 2;

      let risk = "Bajo";

      if (certifiedOperators.length < minimumCoverage) {
        risk = "Alto";
      } else if (certifiedOperators.length === minimumCoverage) {
        risk = "Medio";
      }

      return `
        <article class="machine-card">

          <div class="machine-header">

            <div class="machine-family">
              ${familyOf(machine)}
            </div>

            <div>
              <h4>${escapeHtml(machine)}</h4>

              <div class="card-subtitle">
                Máquina CNC activa
              </div>
            </div>

            <span class="machine-status">
              ACTIVA
            </span>

          </div>

          <div class="card-metrics">

            <div class="metric-box">
              <span>Operadores certificados</span>
              <strong>${certifiedOperators.length}</strong>
              <small>Cobertura mínima: ${minimumCoverage}</small>
            </div>

            <div class="metric-box">
              <span>Nivel promedio</span>
              <strong>${average.toFixed(1)}</strong>
              <small>Escala de 0 a 4</small>
            </div>

            <div class="metric-box">
              <span>Turnos cubiertos</span>
              <strong>${shiftsCovered.length}</strong>
              <small>
                ${shiftsCovered.length
                  ? escapeHtml(shiftsCovered.join(", "))
                  : "Sin cobertura"}
              </small>
            </div>

            <div class="metric-box">
              <span>Riesgo de respaldo</span>
              <strong>${risk}</strong>
              <small>
                ${
                  trainer
                    ? `Entrenador: ${escapeHtml(trainer.name)}`
                    : "Sin entrenador disponible"
                }
              </small>
            </div>

          </div>

        </article>
      `;
    })
    .join("");
}

/* =========================================================
   CAPACITACIÓN
========================================================= */

function renderTraining() {
  const container = getElement("trainingTable");

  if (!container) {
    return;
  }

  const rows = [];

  state.operators.forEach(operator => {
    state.machines.forEach(machine => {
      const current = Number(
        operator.scores?.[machine] ?? 0
      );

      if (current < 2) {
        rows.push({
          operator: operator.name,
          machine,
          current,
          target: 2,
          responsible: operator.supervisor,
          status: "Pendiente",
          evidence: "Sin evidencia",
          priority: current === 0 ? "Alta" : "Media"
        });
      }
    });
  });

  rows.sort((first, second) => {
    if (first.current !== second.current) {
      return first.current - second.current;
    }

    return first.machine.localeCompare(second.machine);
  });

  if (!rows.length) {
    container.innerHTML = `
      <div class="empty-state">
        No existen necesidades de capacitación pendientes.
      </div>
    `;

    return;
  }

  container.innerHTML = rows
    .slice(0, 24)
    .map(row => {
      return `
        <div class="training-item">

          <div>
            <strong>
              ${escapeHtml(row.operator)} ·
              ${escapeHtml(row.machine)}
            </strong>

            <br>

            <small>
              Nivel actual: ${row.current}
              · Nivel objetivo: ${row.target}
            </small>

            <br>

            <small>
              Responsable: ${escapeHtml(row.responsible)}
              · Estado: ${row.status}
            </small>

            <br>

            <small>
              Evidencia: ${row.evidence}
            </small>
          </div>

          <span
            class="training-status ${
              row.priority === "Alta"
                ? "status-high"
                : "status-medium"
            }"
          >
            ${row.priority}
          </span>

        </div>
      `;
    })
    .join("");
}

/* =========================================================
   PERFIL DEL OPERADOR
========================================================= */

function openOperatorProfile(operatorId) {
  const operator = state.operators.find(item => {
    return item.id === operatorId;
  });

  if (!operator) {
    return;
  }

  const currentView = getCurrentView();

  if (currentView !== "operatorProfile") {
    state.previousView = currentView;
  }

  state.selectedOperatorId = operatorId;

  renderOperatorProfile(operator);
  setView("operatorProfile");
  hideSearchResults();
}

function renderOperatorProfile(operator) {
  const average = operatorAverage(operator);
  const percentage = pctFromLevel(average);
  const counts = [0, 0, 0, 0, 0];

  state.machines.forEach(machine => {
    const level = Number(operator.scores?.[machine] ?? 0);
    counts[level] += 1;
  });

  /*
    Compatibilidad con el HTML más reciente.
  */
  const profileInitials = getElement("profileInitials");
  const profileName = getElement("profileName");
  const profileEmployeeId = getElement("profileEmployeeId");
  const profileRole = getElement("profileRole");
  const profileShift = getElement("profileShift");
  const profileArea = getElement("profileArea");
  const profileSupervisor = getElement("profileSupervisor");
  const profileEntryDate = getElement("profileEntryDate");
  const profileStatus = getElement("profileStatus");
  const profileScore = getElement("profileScore");
  const profileLevelSummary = getElement("profileLevelSummary");
  const profileMachineSkills = getElement("profileMachineSkills");
  const profileTraining = getElement("profileTraining");

  if (profileInitials) {
    profileInitials.textContent = initials(operator.name);
  }

  if (profileName) {
    profileName.textContent = operator.name;
  }

  if (profileEmployeeId) {
    profileEmployeeId.textContent = `ID: ${operator.id}`;
  }

  if (profileRole) {
    profileRole.textContent = `Puesto: ${operator.role}`;
  }

  if (profileShift) {
    profileShift.textContent = `Turno: ${operator.shift}`;
  }

  if (profileArea) {
    profileArea.textContent = operator.area;
  }

  if (profileSupervisor) {
    profileSupervisor.textContent = operator.supervisor;
  }

  if (profileEntryDate) {
    profileEntryDate.textContent = formatDate(operator.entryDate);
  }

  if (profileStatus) {
    profileStatus.textContent = operator.status;
  }

  if (profileScore) {
    profileScore.textContent = `${percentage}%`;
  }

  if (profileLevelSummary) {
    profileLevelSummary.innerHTML = counts
      .map((count, level) => {
        return `
          <div class="profile-level-item">

            <i class="level-dot level-${level}"></i>

            <div>
              <strong>Nivel ${level}</strong>
              <small>${levelNames[level]}</small>
            </div>

            <strong>${count}</strong>

          </div>
        `;
      })
      .join("");
  }

  if (profileMachineSkills) {
    profileMachineSkills.innerHTML = state.machines
      .map(machine => {
        const level = Number(
          operator.scores?.[machine] ?? 0
        );

        return `
          <div class="profile-machine-row">

            <div>
              <strong>${escapeHtml(machine)}</strong>

              <small>
                ${escapeHtml(levelNames[level])}
              </small>
            </div>

            <div class="progress-track">
              <div
                class="level-bar-fill level-${level}"
                style="width: ${pctFromLevel(level)}%"
              ></div>
            </div>

            <span class="profile-level-badge level-${level}">
              Nivel ${level}
            </span>

          </div>
        `;
      })
      .join("");
  }

  if (profileTraining) {
    const needs = state.machines
      .map(machine => ({
        machine,
        level: Number(operator.scores?.[machine] ?? 0)
      }))
      .filter(item => item.level < 2);

    profileTraining.innerHTML = needs.length
      ? needs
          .map(item => {
            const priority =
              item.level === 0 ? "Alta" : "Media";

            return `
              <div class="profile-training-item">

                <div>
                  <strong>${escapeHtml(item.machine)}</strong>

                  <br>

                  <small>
                    Nivel actual: ${item.level}
                    · Objetivo recomendado: 2
                  </small>

                  <br>

                  <small>
                    Responsable:
                    ${escapeHtml(operator.supervisor)}
                  </small>
                </div>

                <span
                  class="training-status ${
                    priority === "Alta"
                      ? "status-high"
                      : "status-medium"
                  }"
                >
                  ${priority}
                </span>

              </div>
            `;
          })
          .join("")
      : `
          <div class="empty-state">
            El operador no presenta brechas críticas.
          </div>
        `;
  }
}

/* =========================================================
   BÚSQUEDA
========================================================= */

function renderSearchResults(query) {
  const container = getElement("searchResults");

  if (!container) {
    return;
  }

  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    hideSearchResults();
    return;
  }

  const matchingOperators = state.operators
    .filter(operator => {
      const searchableText = normalizeText(
        [
          operator.name,
          operator.id,
          operator.role,
          operator.shift,
          operator.area,
          operator.supervisor
        ].join(" ")
      );

      return searchableText.includes(normalizedQuery);
    })
    .slice(0, 6);

  const matchingMachines = state.machines
    .filter(machine => {
      return normalizeText(machine).includes(normalizedQuery);
    })
    .slice(0, 6);

  const operatorResults = matchingOperators
    .map(operator => {
      return `
        <button
          class="search-result-item"
          data-result-type="operator"
          data-result-id="${escapeHtml(operator.id)}"
          type="button"
        >

          <span class="search-result-avatar">
            ${initials(operator.name)}
          </span>

          <span class="search-result-info">
            <strong>${escapeHtml(operator.name)}</strong>

            <small>
              ${escapeHtml(operator.id)} ·
              ${escapeHtml(operator.role)} ·
              ${escapeHtml(operator.shift)}
            </small>
          </span>

        </button>
      `;
    })
    .join("");

  const machineResults = matchingMachines
    .map(machine => {
      return `
        <button
          class="search-result-item"
          data-result-type="machine"
          data-result-id="${escapeHtml(machine)}"
          type="button"
        >

          <span class="search-result-avatar">
            ${familyOf(machine)}
          </span>

          <span class="search-result-info">
            <strong>${escapeHtml(machine)}</strong>
            <small>Máquina CNC activa</small>
          </span>

        </button>
      `;
    })
    .join("");

  container.innerHTML =
    operatorResults ||
    machineResults
      ? operatorResults + machineResults
      : `
          <div class="search-no-results">
            No se encontraron coincidencias.
          </div>
        `;

  container.hidden = false;
  container.classList.add("active");

  container
    .querySelectorAll(".search-result-item")
    .forEach(button => {
      button.addEventListener("click", () => {
        if (button.dataset.resultType === "operator") {
          openOperatorProfile(button.dataset.resultId);
          return;
        }

        const familyFilter = getElement("machineFamilyFilter");

        if (familyFilter) {
          familyFilter.value = "all";
        }

        setView("machines");
        renderMachines(button.dataset.resultId);
        hideSearchResults();
      });
    });
}

function hideSearchResults() {
  const container = getElement("searchResults");

  if (!container) {
    return;
  }

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

  if (state.selectedOperatorId) {
    const selectedOperator = state.operators.find(operator => {
      return operator.id === state.selectedOperatorId;
    });

    if (selectedOperator) {
      renderOperatorProfile(selectedOperator);
    }
  }
}

/* =========================================================
   EVENTOS
========================================================= */

document.querySelectorAll(".nav-item").forEach(button => {
  button.addEventListener("click", () => {
    setView(button.dataset.view);
  });
});

document.querySelectorAll("[data-go]").forEach(button => {
  button.addEventListener("click", () => {
    setView(button.dataset.go);
  });
});

const matrixFamilyFilter = getElement("matrixFamilyFilter");

if (matrixFamilyFilter) {
  matrixFamilyFilter.addEventListener("change", renderMatrix);
}

const machineFamilyFilter = getElement("machineFamilyFilter");

if (machineFamilyFilter) {
  machineFamilyFilter.addEventListener("change", () => {
    renderMachines();
  });
}

/* =========================================================
   CRUD DE OPERADORES
========================================================= */

const operatorDialog = getElement("operatorDialog");
const addOperatorButton = getElement("addOperatorBtn2");
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

const operatorDialogTitle = getElement("operatorDialogTitle");
const operatorDialogKicker = getElement("operatorDialogKicker");
const saveOperatorButton = getElement("saveOperatorBtn");

function setOperatorDialogText(mode) {
  const isEdit = mode === "edit";

  if (operatorDialogTitle) {
    operatorDialogTitle.textContent =
      isEdit ? "Editar operador" : "Nuevo operador";
  }

  if (operatorDialogKicker) {
    operatorDialogKicker.textContent =
      isEdit ? "Actualización de personal" : "Alta de personal";
  }

  if (saveOperatorButton) {
    saveOperatorButton.textContent =
      isEdit ? "Guardar cambios" : "Guardar operador";
  }
}

function openCreateOperatorDialog() {
  if (!operatorDialog || !operatorForm) {
    return;
  }

  operatorFormMode = "create";
  operatorForm.reset();

  if (editingOperatorIdInput) {
    editingOperatorIdInput.value = "";
  }

  if (operatorIdInput) {
    operatorIdInput.disabled = false;
    operatorIdInput.value = "";
  }

  if (operatorAreaInput) {
    operatorAreaInput.value = "Maquinado CNC";
  }

  if (operatorSupervisorInput) {
    operatorSupervisorInput.value = "Por asignar";
  }

  if (operatorEntryDateInput) {
    operatorEntryDateInput.value =
      new Date().toISOString().slice(0, 10);
  }

  if (operatorStatusInput) {
    operatorStatusInput.value = "Activo";
  }

  setOperatorDialogText("create");
  operatorDialog.showModal();

  window.setTimeout(() => {
    operatorNameInput?.focus();
  }, 0);
}

function openEditOperatorDialog(operatorId) {
  if (!operatorDialog || !operatorForm) {
    return;
  }

  const operator = state.operators.find(item => {
    return item.id === operatorId;
  });

  if (!operator) {
    window.alert("No fue posible encontrar al operador seleccionado.");
    return;
  }

  operatorFormMode = "edit";

  if (editingOperatorIdInput) {
    editingOperatorIdInput.value = operator.id;
  }

  if (operatorNameInput) {
    operatorNameInput.value = operator.name;
  }

  if (operatorIdInput) {
    operatorIdInput.value = operator.id;
    operatorIdInput.disabled = true;
  }

  if (operatorRoleInput) {
    operatorRoleInput.value = operator.role;
  }

  if (operatorShiftInput) {
    operatorShiftInput.value = operator.shift;
  }

  if (operatorAreaInput) {
    operatorAreaInput.value = operator.area;
  }

  if (operatorSupervisorInput) {
    operatorSupervisorInput.value = operator.supervisor;
  }

  if (operatorEntryDateInput) {
    operatorEntryDateInput.value = operator.entryDate;
  }

  if (operatorStatusInput) {
    operatorStatusInput.value = operator.status;
  }

  setOperatorDialogText("edit");
  operatorDialog.showModal();

  window.setTimeout(() => {
    operatorNameInput?.focus();
  }, 0);
}

if (addOperatorButton) {
  addOperatorButton.addEventListener("click", openCreateOperatorDialog);
}

if (operatorForm && operatorDialog) {
  operatorForm.addEventListener("submit", event => {
    const submitter = event.submitter;

    if (!submitter || submitter.value === "cancel") {
      return;
    }

    event.preventDefault();

    const operatorId = operatorIdInput?.value.trim() || "";
    const operatorName = operatorNameInput?.value.trim() || "";
    const operatorRole =
      operatorRoleInput?.value || "Operador CNC";
    const operatorShift =
      operatorShiftInput?.value || "Turno A";
    const operatorArea =
      operatorAreaInput?.value.trim() || "Maquinado CNC";
    const operatorSupervisor =
      operatorSupervisorInput?.value.trim() || "Por asignar";
    const operatorEntryDate =
      operatorEntryDateInput?.value ||
      new Date().toISOString().slice(0, 10);
    const operatorStatus =
      operatorStatusInput?.value || "Activo";

    if (!operatorId || !operatorName) {
      window.alert(
        "Ingresa el nombre y el número de empleado."
      );
      return;
    }

    if (operatorFormMode === "create") {
      const duplicate = state.operators.some(operator => {
        return (
          normalizeText(operator.id) === normalizeText(operatorId)
        );
      });

      if (duplicate) {
        window.alert(
          "Ya existe un operador con ese número de empleado."
        );
        return;
      }

      const scores = {};

      state.machines.forEach(machine => {
        scores[machine] = 0;
      });

      state.operators.push({
        id: operatorId,
        name: operatorName,
        role: operatorRole,
        shift: operatorShift,
        area: operatorArea,
        supervisor: operatorSupervisor,
        entryDate: operatorEntryDate,
        status: operatorStatus,
        scores,
        certifications: {},
        trainingHistory: [],
        developmentPlan: []
      });

      state.selectedOperatorId = null;
    } else {
      const editingOperatorId =
        editingOperatorIdInput?.value.trim() || "";

      const operator = state.operators.find(item => {
        return item.id === editingOperatorId;
      });

      if (!operator) {
        window.alert(
          "No fue posible encontrar al operador que deseas editar."
        );
        return;
      }

      operator.name = operatorName;
      operator.role = operatorRole;
      operator.shift = operatorShift;
      operator.area = operatorArea;
      operator.supervisor = operatorSupervisor;
      operator.entryDate = operatorEntryDate;
      operator.status = operatorStatus;

      state.selectedOperatorId = operator.id;
    }

    saveState();
    renderAll();

    operatorForm.reset();

    if (operatorIdInput) {
      operatorIdInput.disabled = false;
    }

    if (editingOperatorIdInput) {
      editingOperatorIdInput.value = "";
    }

    operatorDialog.close();

    if (
      operatorFormMode === "edit" &&
      state.selectedOperatorId
    ) {
      openOperatorProfile(state.selectedOperatorId);
    } else {
      setView("operators");
    }
  });

  operatorDialog.addEventListener("close", () => {
    operatorForm.reset();

    if (operatorIdInput) {
      operatorIdInput.disabled = false;
    }

    if (editingOperatorIdInput) {
      editingOperatorIdInput.value = "";
    }

    operatorFormMode = "create";
    setOperatorDialogText("create");
  });
}

/* =========================================================
   BÚSQUEDA GLOBAL
========================================================= */

const globalSearch = getElement("globalSearch");

if (globalSearch) {
  globalSearch.addEventListener("input", event => {
    renderSearchResults(event.target.value);
  });

  globalSearch.addEventListener("focus", event => {
    if (event.target.value.trim()) {
      renderSearchResults(event.target.value);
    }
  });

  globalSearch.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      globalSearch.value = "";
      hideSearchResults();
    }
  });
}

document.addEventListener("click", event => {
  const searchContainer = document.querySelector(
    ".search-container"
  );

  if (
    searchContainer &&
    !searchContainer.contains(event.target)
  ) {
    hideSearchResults();
  }
});

/* =========================================================
   REGRESAR DESDE PERFIL
========================================================= */

const backToOperatorsButton = getElement(
  "backToOperatorsBtn"
);

if (backToOperatorsButton) {
  backToOperatorsButton.addEventListener("click", () => {
    const returnView =
      state.previousView &&
      state.previousView !== "operatorProfile"
        ? state.previousView
        : "operators";

    setView(returnView);
  });
}

/* =========================================================
   EDITAR Y ELIMINAR OPERADOR
========================================================= */

const editOperatorButton = getElement("editOperatorBtn");
const deleteOperatorButton = getElement("deleteOperatorBtn");

if (editOperatorButton) {
  editOperatorButton.addEventListener("click", () => {
    if (!state.selectedOperatorId) {
      window.alert("Selecciona un operador para editar.");
      return;
    }

    openEditOperatorDialog(state.selectedOperatorId);
  });
}

if (deleteOperatorButton) {
  deleteOperatorButton.addEventListener("click", () => {
    const operator = state.operators.find(item => {
      return item.id === state.selectedOperatorId;
    });

    if (!operator) {
      window.alert("No fue posible encontrar al operador seleccionado.");
      return;
    }

    const confirmed = window.confirm(
      `¿Deseas eliminar a ${operator.name} (${operator.id})?\n\n` +
      "Esta acción eliminará también sus niveles de competencia " +
      "y no se puede deshacer."
    );

    if (!confirmed) {
      return;
    }

    state.operators = state.operators.filter(item => {
      return item.id !== operator.id;
    });

    state.selectedOperatorId = null;
    state.previousView = "operators";

    saveState();
    renderAll();
    setView("operators");
  });
}

/* =========================================================
   INICIALIZACIÓN
========================================================= */

renderAll();
