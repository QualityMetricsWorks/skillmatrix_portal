const state = {
  machines: [
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
  ],

  operators: [
    {
      id: "OP-001",
      name: "Juan Pérez",
      role: "Operador CNC",
      shift: "Turno A",
      scores: {}
    },
    {
      id: "OP-002",
      name: "Luis Martínez",
      role: "Setup Technician",
      shift: "Turno A",
      scores: {}
    },
    {
      id: "OP-003",
      name: "Marco Rodríguez",
      role: "Operador CNC",
      shift: "Turno B",
      scores: {}
    },
    {
      id: "OP-004",
      name: "Alejandro Torres",
      role: "Entrenador",
      shift: "Turno B",
      scores: {}
    },
    {
      id: "OP-005",
      name: "José Hernández",
      role: "Operador CNC",
      shift: "Turno C",
      scores: {}
    },
    {
      id: "OP-006",
      name: "Miguel Sánchez",
      role: "Operador CNC",
      shift: "Turno C",
      scores: {}
    }
  ],

  selectedOperatorId: null,
  previousView: "dashboard"
};

const baseScoreRows = [
  [3, 3, 2, 1, 3, 2, 1, 2, 0, 0, 1, 1, 0, 0],
  [4, 4, 3, 3, 4, 3, 2, 3, 2, 2, 3, 3, 2, 2],
  [2, 2, 1, 0, 2, 1, 0, 1, 0, 0, 1, 1, 1, 0],
  [4, 4, 4, 3, 4, 4, 3, 4, 3, 3, 4, 4, 3, 3],
  [1, 2, 1, 0, 2, 1, 0, 1, 0, 0, 0, 1, 0, 0],
  [3, 2, 2, 1, 3, 2, 1, 2, 1, 1, 2, 2, 1, 1]
];

state.operators.forEach((operator, operatorIndex) => {
  state.machines.forEach((machine, machineIndex) => {
    operator.scores[machine] =
      baseScoreRows[operatorIndex]?.[machineIndex] ?? 0;
  });
});

const pageTitles = {
  dashboard: "Dashboard",
  matrix: "Matriz de habilidades",
  operators: "Operadores",
  operatorProfile: "Perfil del operador",
  machines: "Máquinas",
  training: "Capacitación"
};

const levelNames = {
  0: "No entrenado",
  1: "En entrenamiento",
  2: "Con supervisión",
  3: "Certificado",
  4: "Experto / Entrenador"
};

function getElement(id) {
  return document.getElementById(id);
}

function familyOf(machine) {
  return machine.split("-")[0];
}

function initials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0))
    .join("")
    .toUpperCase();
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function operatorAverage(operator, machines = state.machines) {
  if (!operator || !machines.length) {
    return 0;
  }

  const total = machines.reduce((sum, machine) => {
    return sum + Number(operator.scores[machine] ?? 0);
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

function getCurrentView() {
  const activeView = document.querySelector(".view.active");
  return activeView ? activeView.id : "dashboard";
}

function setView(viewId) {
  const targetView = getElement(viewId);

  if (!targetView) {
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

function getLevelCounts(operators = state.operators) {
  const counts = {
    0: 0,
    1: 0,
    2: 0,
    3: 0,
    4: 0
  };

  operators.forEach(operator => {
    state.machines.forEach(machine => {
      const level = Number(operator.scores[machine] ?? 0);

      if (Object.prototype.hasOwnProperty.call(counts, level)) {
        counts[level] += 1;
      }
    });
  });

  return counts;
}

function getOperatorLevelCounts(operator) {
  const counts = {
    0: 0,
    1: 0,
    2: 0,
    3: 0,
    4: 0
  };

  state.machines.forEach(machine => {
    const level = Number(operator.scores[machine] ?? 0);

    if (Object.prototype.hasOwnProperty.call(counts, level)) {
      counts[level] += 1;
    }
  });

  return counts;
}

function renderDashboard() {
  const machineCount = getElement("machineCount");
  const operatorCount = getElement("operatorCount");
  const certifiedCount = getElement("certifiedCount");
  const criticalGapCount = getElement("criticalGapCount");
  const globalScore = getElement("globalScore");

  if (machineCount) {
    machineCount.textContent = state.machines.length;
  }

  if (operatorCount) {
    operatorCount.textContent = state.operators.length;
  }

  const averages = state.operators.map(operator => {
    return operatorAverage(operator);
  });

  const overall = averages.length
    ? averages.reduce((sum, value) => sum + value, 0) /
      averages.length
    : 0;

  if (globalScore) {
    globalScore.textContent = `${pctFromLevel(overall)}%`;
  }

  const certifiedOperators = state.operators.filter(operator => {
    return operatorAverage(operator) >= 3;
  }).length;

  if (certifiedCount) {
    certifiedCount.textContent = certifiedOperators;
  }

  const gaps = [];

  state.machines.forEach(machine => {
    const total = state.operators.reduce((sum, operator) => {
      return sum + Number(operator.scores[machine] ?? 0);
    }, 0);

    const average = state.operators.length
      ? total / state.operators.length
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

  renderLevelCounters();
  renderLevelDistribution();
  renderFamilyCoverage();
  renderPriorityList(gaps);
  renderOperatorSummary();
}

function renderLevelCounters() {
  const counts = getLevelCounts();

  for (let level = 0; level <= 4; level += 1) {
    const element = getElement(`level${level}Count`);

    if (element) {
      element.textContent = counts[level];
    }
  }
}

function renderLevelDistribution() {
  const container = getElement("levelDistribution");

  if (!container) {
    return;
  }

  const counts = getLevelCounts();
  const total = Object.values(counts).reduce(
    (sum, count) => sum + count,
    0
  );

  container.innerHTML = Object.keys(counts)
    .map(levelKey => {
      const level = Number(levelKey);
      const count = counts[level];
      const percentage = total
        ? Math.round((count / total) * 100)
        : 0;

      return `
        <div class="level-distribution-row">
          <div class="level-distribution-label">
            <i class="level-dot level-${level}"></i>
            <span>Nivel ${level}</span>
          </div>

          <div class="level-bar-track">
            <div
              class="level-bar-fill level-${level}"
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

function renderFamilyCoverage() {
  const coverage = getElement("familyCoverage");

  if (!coverage) {
    return;
  }

  const families = [
    ...new Set(state.machines.map(familyOf))
  ];

  coverage.innerHTML = families
    .map(family => {
      const familyMachines = state.machines.filter(machine => {
        return familyOf(machine) === family;
      });

      const total = state.operators.reduce((sum, operator) => {
        return (
          sum + operatorAverage(operator, familyMachines)
        );
      }, 0);

      const average = state.operators.length
        ? total / state.operators.length
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
  const priorityList = getElement("priorityList");

  if (!priorityList) {
    return;
  }

  const orderedGaps = [...gaps]
    .sort((first, second) => first.avg - second.avg)
    .slice(0, 5);

  if (!orderedGaps.length) {
    priorityList.innerHTML = `
      <div class="empty-state">
        No se detectaron brechas críticas.
      </div>
    `;

    return;
  }

  priorityList.innerHTML = orderedGaps
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
      const percent = pctFromLevel(
        operatorAverage(operator)
      );

      return `
        <div
          class="summary-row clickable"
          data-operator-id="${operator.id}"
          role="button"
          tabindex="0"
        >
          <div class="operator-meta">
            <div class="avatar">
              ${initials(operator.name)}
            </div>

            <div>
              <strong>${operator.name}</strong>
              <small>
                ${operator.role} · ${operator.shift}
              </small>
            </div>
          </div>

          <span class="score-pill ${scoreClass(percent)}">
            ${percent}%
          </span>
        </div>
      `;
    })
    .join("");

  container
    .querySelectorAll("[data-operator-id]")
    .forEach(element => {
      element.addEventListener("click", () => {
        openOperatorProfile(element.dataset.operatorId);
      });

      element.addEventListener("keydown", event => {
        if (
          event.key === "Enter" ||
          event.key === " "
        ) {
          event.preventDefault();
          openOperatorProfile(
            element.dataset.operatorId
          );
        }
      });
    });
}

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
        .map(machine => `<th>${machine}</th>`)
        .join("")}
      <th>Promedio</th>
    </tr>
  `;

  matrixBody.innerHTML = state.operators
    .map(operator => {
      const average = operatorAverage(
        operator,
        machines
      );

      return `
        <tr>
          <td>
            <button
              class="matrix-operator-link text-btn"
              type="button"
              data-operator-id="${operator.id}"
            >
              ${operator.name}
            </button>

            <br>

            <small>
              ${operator.id} · ${operator.shift}
            </small>
          </td>

          ${machines
            .map(machine => {
              const level =
                operator.scores[machine] ?? 0;

              return `
                <td>
                  <span class="skill-level level-${level}">
                    ${level}
                  </span>
                </td>
              `;
            })
            .join("")}

          <td>
            <strong>${average.toFixed(1)}</strong>
          </td>
        </tr>
      `;
    })
    .join("");

  matrixBody
    .querySelectorAll("[data-operator-id]")
    .forEach(button => {
      button.addEventListener("click", () => {
        openOperatorProfile(button.dataset.operatorId);
      });
    });
}

function renderOperators(operators = state.operators) {
  const operatorCards = getElement("operatorCards");

  if (!operatorCards) {
    return;
  }

  if (!operators.length) {
    operatorCards.innerHTML = `
      <div class="empty-state">
        No se encontraron operadores.
      </div>
    `;

    return;
  }

  operatorCards.innerHTML = operators
    .map(operator => {
      const average = operatorAverage(operator);
      const percentage = pctFromLevel(average);

      const certifiedMachines = state.machines.filter(
        machine => {
          return operator.scores[machine] >= 3;
        }
      ).length;

      return `
        <article
          class="person-card"
          data-operator-id="${operator.id}"
          role="button"
          tabindex="0"
        >
          <div class="person-header">
            <div class="avatar">
              ${initials(operator.name)}
            </div>

            <div>
              <h4>${operator.name}</h4>

              <div class="card-subtitle">
                ${operator.id} · ${operator.role}
              </div>
            </div>
          </div>

          <div class="card-metrics">
            <div class="metric-box">
              <span>Competencia</span>
              <strong>${percentage}%</strong>
              <small>
                Nivel promedio ${average.toFixed(1)}
              </small>
            </div>

            <div class="metric-box">
              <span>Certificaciones</span>
              <strong>${certifiedMachines}</strong>
              <small>
                de ${state.machines.length} máquinas
              </small>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  operatorCards
    .querySelectorAll("[data-operator-id]")
    .forEach(card => {
      card.addEventListener("click", () => {
        openOperatorProfile(card.dataset.operatorId);
      });

      card.addEventListener("keydown", event => {
        if (
          event.key === "Enter" ||
          event.key === " "
        ) {
          event.preventDefault();
          openOperatorProfile(card.dataset.operatorId);
        }
      });
    });
}

function renderMachines(machinesToRender = null) {
  const machineCards = getElement("machineCards");
  const familyFilter = getElement("machineFamilyFilter");

  if (!machineCards || !familyFilter) {
    return;
  }

  let machines;

  if (Array.isArray(machinesToRender)) {
    machines = machinesToRender;
  } else {
    const selectedFamily = familyFilter.value;

    machines =
      selectedFamily === "all"
        ? state.machines
        : state.machines.filter(machine => {
            return familyOf(machine) === selectedFamily;
          });
  }

  if (!machines.length) {
    machineCards.innerHTML = `
      <div class="empty-state">
        No se encontraron máquinas.
      </div>
    `;

    return;
  }

  machineCards.innerHTML = machines
    .map(machine => {
      const competentOperators =
        state.operators.filter(operator => {
          return operator.scores[machine] >= 3;
        }).length;

      const total = state.operators.reduce(
        (sum, operator) => {
          return (
            sum +
            Number(operator.scores[machine] ?? 0)
          );
        },
        0
      );

      const average = state.operators.length
        ? total / state.operators.length
        : 0;

      return `
        <article class="machine-card">
          <div class="machine-header">
            <div class="machine-family">
              ${familyOf(machine)}
            </div>

            <div>
              <h4>${machine}</h4>

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
              <span>Operadores competentes</span>
              <strong>${competentOperators}</strong>
              <small>Nivel 3 o superior</small>
            </div>

            <div class="metric-box">
              <span>Nivel promedio</span>
              <strong>${average.toFixed(1)}</strong>
              <small>Escala de 0 a 4</small>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderTraining() {
  const trainingTable = getElement("trainingTable");

  if (!trainingTable) {
    return;
  }

  const rows = [];

  state.operators.forEach(operator => {
    state.machines.forEach(machine => {
      const currentLevel =
        operator.scores[machine] ?? 0;

      if (currentLevel < 2) {
        rows.push({
          operatorId: operator.id,
          operatorName: operator.name,
          machine,
          current: currentLevel,
          priority:
            currentLevel === 0 ? "Alta" : "Media"
        });
      }
    });
  });

  rows.sort((first, second) => {
    if (first.current !== second.current) {
      return first.current - second.current;
    }

    return first.machine.localeCompare(
      second.machine
    );
  });

  if (!rows.length) {
    trainingTable.innerHTML = `
      <div class="empty-state">
        No existen necesidades de capacitación pendientes.
      </div>
    `;

    return;
  }

  trainingTable.innerHTML = rows
    .slice(0, 18)
    .map(row => {
      return `
        <div class="training-item">
          <div>
            <strong>
              ${row.operatorName} · ${row.machine}
            </strong>

            <br>

            <small>
              Nivel actual: ${row.current}
              · Objetivo inicial: 2
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
  closeSearchResults();
  setView("operatorProfile");
}

function renderOperatorProfile(operator) {
  if (!operator) {
    return;
  }

  const average = operatorAverage(operator);
  const percentage = pctFromLevel(average);
  const levelCounts = getOperatorLevelCounts(operator);

  const profileInitials = getElement("profileInitials");
  const profileName = getElement("profileName");
  const profileEmployeeId = getElement(
    "profileEmployeeId"
  );
  const profileRole = getElement("profileRole");
  const profileShift = getElement("profileShift");
  const profileScore = getElement("profileScore");

  if (profileInitials) {
    profileInitials.textContent = initials(
      operator.name
    );
  }

  if (profileName) {
    profileName.textContent = operator.name;
  }

  if (profileEmployeeId) {
    profileEmployeeId.textContent =
      `ID: ${operator.id}`;
  }

  if (profileRole) {
    profileRole.textContent =
      `Puesto: ${operator.role}`;
  }

  if (profileShift) {
    profileShift.textContent =
      `Turno: ${operator.shift}`;
  }

  if (profileScore) {
    profileScore.textContent = `${percentage}%`;
  }

  renderProfileLevelSummary(levelCounts);
  renderProfileMachineSkills(operator);
  renderProfileTraining(operator);
}

function renderProfileLevelSummary(levelCounts) {
  const container = getElement("profileLevelSummary");

  if (!container) {
    return;
  }

  container.innerHTML = Object.keys(levelCounts)
    .map(levelKey => {
      const level = Number(levelKey);

      return `
        <div class="profile-level-item">
          <i class="level-dot level-${level}"></i>

          <div>
            <strong>Nivel ${level}</strong>
            <small>${levelNames[level]}</small>
          </div>

          <strong>${levelCounts[level]}</strong>
        </div>
      `;
    })
    .join("");
}

function renderProfileMachineSkills(operator) {
  const container = getElement(
    "profileMachineSkills"
  );

  if (!container) {
    return;
  }

  const orderedMachines = [...state.machines].sort(
    (firstMachine, secondMachine) => {
      const firstLevel =
        operator.scores[firstMachine] ?? 0;
      const secondLevel =
        operator.scores[secondMachine] ?? 0;

      if (firstLevel !== secondLevel) {
        return secondLevel - firstLevel;
      }

      return firstMachine.localeCompare(
        secondMachine
      );
    }
  );

  container.innerHTML = orderedMachines
    .map(machine => {
      const level = operator.scores[machine] ?? 0;
      const percentage = pctFromLevel(level);

      return `
        <div class="profile-machine-row">
          <strong>${machine}</strong>

          <div class="progress-track">
            <div
              class="level-bar-fill level-${level}"
              style="width: ${percentage}%"
            ></div>
          </div>

          <span
            class="profile-level-badge level-${level}"
          >
            Nivel ${level}
          </span>
        </div>
      `;
    })
    .join("");
}

function renderProfileTraining(operator) {
  const container = getElement("profileTraining");

  if (!container) {
    return;
  }

  const trainingNeeds = state.machines
    .map(machine => {
      return {
        machine,
        level: operator.scores[machine] ?? 0
      };
    })
    .filter(item => item.level < 2)
    .sort((first, second) => {
      if (first.level !== second.level) {
        return first.level - second.level;
      }

      return first.machine.localeCompare(
        second.machine
      );
    });

  if (!trainingNeeds.length) {
    container.innerHTML = `
      <div class="empty-state">
        El operador no presenta brechas críticas
        de capacitación.
      </div>
    `;

    return;
  }

  container.innerHTML = trainingNeeds
    .map(item => {
      const priority =
        item.level === 0 ? "Alta" : "Media";

      return `
        <div class="profile-training-item">
          <div>
            <strong>${item.machine}</strong>

            <br>

            <small>
              Nivel actual: ${item.level}
              · Objetivo recomendado: 2
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
    .join("");
}

function searchOperators(query) {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    return [];
  }

  return state.operators.filter(operator => {
    const machineText = state.machines
      .filter(machine => {
        return operator.scores[machine] > 0;
      })
      .join(" ");

    const searchableText = normalizeText(
      [
        operator.name,
        operator.id,
        operator.role,
        operator.shift,
        machineText
      ].join(" ")
    );

    return searchableText.includes(normalizedQuery);
  });
}

function searchMachines(query) {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    return [];
  }

  return state.machines.filter(machine => {
    return normalizeText(machine).includes(
      normalizedQuery
    );
  });
}

function renderSearchResults(query) {
  const searchResults = getElement("searchResults");

  if (!searchResults) {
    return;
  }

  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    closeSearchResults();
    return;
  }

  const matchingOperators = searchOperators(query);
  const matchingMachines = searchMachines(query);

  const operatorResults = matchingOperators
    .slice(0, 6)
    .map(operator => {
      return `
        <button
          type="button"
          class="search-result-item"
          data-result-type="operator"
          data-result-id="${operator.id}"
        >
          <span class="search-result-avatar">
            ${initials(operator.name)}
          </span>

          <span class="search-result-info">
            <strong>${operator.name}</strong>
            <small>
              ${operator.id} · ${operator.role}
              · ${operator.shift}
            </small>
          </span>
        </button>
      `;
    })
    .join("");

  const machineResults = matchingMachines
    .slice(0, 4)
    .map(machine => {
      return `
        <button
          type="button"
          class="search-result-item"
          data-result-type="machine"
          data-result-id="${machine}"
        >
          <span class="search-result-avatar">
            ${familyOf(machine)}
          </span>

          <span class="search-result-info">
            <strong>${machine}</strong>
            <small>Máquina CNC activa</small>
          </span>
        </button>
      `;
    })
    .join("");

  if (!operatorResults && !machineResults) {
    searchResults.innerHTML = `
      <div class="search-no-results">
        No se encontraron resultados.
      </div>
    `;

    searchResults.classList.add("active");
    return;
  }

  searchResults.innerHTML =
    operatorResults + machineResults;

  searchResults.classList.add("active");

  searchResults
    .querySelectorAll("[data-result-type]")
    .forEach(result => {
      result.addEventListener("click", () => {
        const resultType =
          result.dataset.resultType;
        const resultId = result.dataset.resultId;

        if (resultType === "operator") {
          openOperatorProfile(resultId);
        }

        if (resultType === "machine") {
          showMachineSearchResult(resultId);
        }
      });
    });
}

function showMachineSearchResult(machine) {
  const familyFilter = getElement(
    "machineFamilyFilter"
  );

  if (familyFilter) {
    familyFilter.value = "all";
  }

  renderMachines([machine]);
  closeSearchResults();
  setView("machines");
}

function closeSearchResults() {
  const searchResults = getElement("searchResults");

  if (!searchResults) {
    return;
  }

  searchResults.classList.remove("active");
  searchResults.innerHTML = "";
}

function clearGlobalSearch() {
  const globalSearch = getElement("globalSearch");

  if (globalSearch) {
    globalSearch.value = "";
  }

  closeSearchResults();
}

function renderAll() {
  renderDashboard();
  renderMatrix();
  renderOperators();
  renderMachines();
  renderTraining();

  if (state.selectedOperatorId) {
    const selectedOperator = state.operators.find(
      operator => {
        return (
          operator.id === state.selectedOperatorId
        );
      }
    );

    if (selectedOperator) {
      renderOperatorProfile(selectedOperator);
    }
  }
}

document
  .querySelectorAll(".nav-item")
  .forEach(button => {
    button.addEventListener("click", () => {
      clearGlobalSearch();
      setView(button.dataset.view);
    });
  });

document
  .querySelectorAll("[data-go]")
  .forEach(button => {
    button.addEventListener("click", () => {
      clearGlobalSearch();
      setView(button.dataset.go);
    });
  });

const matrixFamilyFilter = getElement(
  "matrixFamilyFilter"
);

if (matrixFamilyFilter) {
  matrixFamilyFilter.addEventListener(
    "change",
    renderMatrix
  );
}

const machineFamilyFilter = getElement(
  "machineFamilyFilter"
);

if (machineFamilyFilter) {
  machineFamilyFilter.addEventListener(
    "change",
    () => renderMachines()
  );
}

const dialog = getElement("operatorDialog");

["addOperatorBtn", "addOperatorBtn2"].forEach(id => {
  const button = getElement(id);

  if (button && dialog) {
    button.addEventListener("click", () => {
      dialog.showModal();
    });
  }
});

const operatorForm = getElement("operatorForm");

if (operatorForm && dialog) {
  operatorForm.addEventListener(
    "submit",
    event => {
      const submitter = event.submitter;

      if (
        !submitter ||
        submitter.value === "cancel"
      ) {
        return;
      }

      event.preventDefault();

      const operatorId = getElement("operatorId");
      const operatorName = getElement(
        "operatorName"
      );
      const operatorRole = getElement(
        "operatorRole"
      );
      const operatorShift = getElement(
        "operatorShift"
      );

      const newOperator = {
        id: operatorId.value.trim(),
        name: operatorName.value.trim(),
        role: operatorRole.value,
        shift: operatorShift.value,
        scores: {}
      };

      if (!newOperator.id || !newOperator.name) {
        return;
      }

      const duplicateId = state.operators.some(
        operator => {
          return (
            normalizeText(operator.id) ===
            normalizeText(newOperator.id)
          );
        }
      );

      if (duplicateId) {
        window.alert(
          "Ya existe un operador con ese número de empleado."
        );
        return;
      }

      state.machines.forEach(machine => {
        newOperator.scores[machine] = 0;
      });

      state.operators.push(newOperator);

      operatorForm.reset();
      dialog.close();

      renderAll();
      setView("operators");
    }
  );
}

const globalSearch = getElement("globalSearch");

if (globalSearch) {
  globalSearch.addEventListener("input", event => {
    renderSearchResults(event.target.value);
  });

  globalSearch.addEventListener(
    "keydown",
    event => {
      if (event.key === "Escape") {
        clearGlobalSearch();
      }

      if (event.key === "Enter") {
        const firstResult = document.querySelector(
          ".search-result-item"
        );

        if (firstResult) {
          event.preventDefault();
          firstResult.click();
        }
      }
    }
  );
}

document.addEventListener("click", event => {
  const searchContainer =
    document.querySelector(".search-container");

  if (
    searchContainer &&
    !searchContainer.contains(event.target)
  ) {
    closeSearchResults();
  }
});

const backToOperatorsButton = getElement(
  "backToOperatorsBtn"
);

if (backToOperatorsButton) {
  backToOperatorsButton.addEventListener(
    "click",
    () => {
      const returnView =
        state.previousView === "operatorProfile"
          ? "operators"
          : state.previousView;

      setView(returnView || "operators");
    }
  );
}

const editOperatorButton = getElement(
  "editOperatorBtn"
);

if (editOperatorButton) {
  editOperatorButton.addEventListener(
    "click",
    () => {
      window.alert(
        "La edición del operador se habilitará en la siguiente etapa."
      );
    }
  );
}

renderAll();
