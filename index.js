// --------------------------------------------------------
// 3. CONFIGURATION: SCENES AND CHOICES (10 DILEMMAS)
// --------------------------------------------------------

// --------------------------------------------------------
// 1. MODEL CLASSES
// --------------------------------------------------------

class MetricDefinition {
  constructor({ id, label, description, value, min = 0, max = 100, idealDirection = "high" }) {
    this.id = id;
    this.label = label;
    this.description = description;
    this.value = value;
    this.min = min;
    this.max = max;
    this.idealDirection = idealDirection;
  }
}

class Employee {
  constructor({ name, role, initials }) {
    this.name = name;
    this.role = role;
    this.initials = initials;
  }
}

class Choice {
  constructor({ text, tags = [], effects = {}, nextSceneId = null, endMessage = null }) {
    this.text = text;
    this.tags = tags;
    this.effects = effects;
    this.nextSceneId = nextSceneId;
    this.endMessage = endMessage;
  }
}

class Scene {
  constructor({ id, title, quarter, area, employee, objectives = [], text, choices = [] }) {
    this.id = id;
    this.title = title;
    this.quarter = quarter;
    this.area = area;
    this.employee = employee;
    this.objectives = objectives;
    this.text = text;
    this.choices = choices;
  }

  isTerminal() {
    return this.choices.length > 0 && this.choices.every(choice => choice.nextSceneId === null);
  }
}

class GameState {
  constructor({ metricDefinitions, startingSceneId }) {
    this.startingSceneId = startingSceneId;
    this.metricDefinitions = metricDefinitions;
    this.metrics = {};
    this.logEntries = [];
    this.currentSceneId = startingSceneId;
    this.initializeMetrics();
  }

  initializeMetrics() {
    this.metrics = {};
    this.metricDefinitions.forEach(def => {
      this.metrics[def.id] = def.value;
    });
    this.logEntries = [];
  }

  reset() {
    this.currentSceneId = this.startingSceneId;
    this.initializeMetrics();
  }
}

class GameEngine {
  constructor({ scenes, metricDefinitions, learningObjectives, startingSceneId, elements }) {
    this.scenes = scenes;
    this.metricDefinitions = metricDefinitions;
    this.learningObjectives = learningObjectives;
    this.state = new GameState({ metricDefinitions, startingSceneId });
    this.elements = elements;

    if (this.elements.resetButton) {
      this.elements.resetButton.addEventListener("click", () => this.reset());
    }
  }

  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  renderStats() {
    const { statsList, summaryNote } = this.elements;
    statsList.innerHTML = "";

    this.metricDefinitions.forEach(def => {
      const value = this.state.metrics[def.id];
      const percentage = this.clamp(((value - def.min) / (def.max - def.min)) * 100, 0, 100);

      const row = document.createElement("div");
      row.className = "stat-row";

      const top = document.createElement("div");
      top.className = "stat-top";

      const label = document.createElement("div");
      label.className = "stat-label";
      label.textContent = def.label;

      const valueEl = document.createElement("div");
      valueEl.className = "stat-value";
      valueEl.textContent = `${value}`;

      top.appendChild(label);
      top.appendChild(valueEl);

      const track = document.createElement("div");
      track.className = "bar-track";

      const fill = document.createElement("div");
      fill.className = "bar-fill";
      if (def.id === "securityRisk") fill.classList.add("risk");
      fill.style.width = `${percentage}%`;

      track.appendChild(fill);
      row.appendChild(top);
      row.appendChild(track);
      statsList.appendChild(row);
    });

    const risk = this.state.metrics.securityRisk;
    const productivity = this.state.metrics.productivity;
    const client = this.state.metrics.clientHappiness;

    let note = "Balance productivity, people, clients, and risk to succeed.";
    if (risk >= 75) note = "Security risk is high – consider decisions that strengthen controls and resilience.";
    else if (productivity >= 75 && client >= 75 && risk <= 40)
      note = "You are operating as a high-performing, secure digital firm.";

    summaryNote.textContent = note;
  }

  renderObjectives(scene) {
    const { objectivesList } = this.elements;
    objectivesList.innerHTML = "";
    scene.objectives.forEach(key => {
      const pill = document.createElement("div");
      pill.className = "objective-pill";
      pill.textContent = this.learningObjectives[key] || key;
      objectivesList.appendChild(pill);
    });
  }

  renderLog() {
    const { logContainer } = this.elements;
    logContainer.innerHTML = "";

    this.state.logEntries.forEach(entry => {
      const div = document.createElement("div");
      div.className = "log-entry";

      const metric = document.createElement("span");
      metric.className = "metric";
      metric.textContent = entry.label;

      const delta = document.createElement("span");
      delta.className = "delta";
      if (entry.delta > 0) {
        delta.textContent = `+${entry.delta}`;
        delta.classList.add("positive");
      } else if (entry.delta < 0) {
        delta.textContent = `${entry.delta}`;
        delta.classList.add("negative");
      } else delta.textContent = "±0";

      div.appendChild(metric);
      div.appendChild(delta);

      logContainer.appendChild(div);
    });

    logContainer.scrollTop = logContainer.scrollHeight;
  }

  renderScene() {
    const scene = this.scenes[this.state.currentSceneId];
    if (!scene) return console.error("Scene not found:", this.state.currentSceneId);

    const {
      currentSceneIdLabel,
      sceneTitle,
      sceneMeta,
      employeeAvatar,
      employeeName,
      employeeRole,
      sceneText,
      choicesContainer,
      endMessage
    } = this.elements;

    
    sceneTitle.textContent = scene.title;
    sceneMeta.textContent = `${scene.quarter}`;

    employeeAvatar.textContent = scene.employee.initials;
    employeeName.textContent = scene.employee.name;
    employeeRole.textContent = scene.employee.role;

    sceneText.textContent = scene.text;

    this.renderObjectives(scene);
    this.renderStats();
    this.renderLog();

    choicesContainer.innerHTML = "";
    endMessage.style.display = "none";

    scene.choices.forEach(choice => {
      const btn = document.createElement("button");
      btn.className = "choice-btn";

      const main = document.createElement("div");
      main.className = "choice-main";
      main.textContent = choice.text;

      const tagWrap = document.createElement("div");
      tagWrap.className = "choice-tags";
      choice.tags.forEach(t => {
        const tag = document.createElement("div");
        tag.className = "choice-tag";
        tag.textContent = t;
        tagWrap.appendChild(tag);
      });

      btn.appendChild(main);
      btn.appendChild(tagWrap);
      btn.addEventListener("click", () => this.handleChoice(scene, choice));
      choicesContainer.appendChild(btn);
    });
  }

  applyEffects(effects) {
    for (const [id, delta] of Object.entries(effects)) {
      const def = this.metricDefinitions.find(d => d.id === id);
      if (!def) continue;

      const before = this.state.metrics[id];
      const after = this.clamp(before + delta, def.min, def.max);
      this.state.metrics[id] = after;

      this.state.logEntries.push({
        label: def.label,
        delta: after - before
      });
    }
  }

  handleChoice(scene, choice) {
    this.applyEffects(choice.effects);
    this.renderStats();
    this.renderLog();

    if (choice.nextSceneId === null) {
      this.elements.choicesContainer.innerHTML = "";
      this.elements.endMessage.style.display = "block";
      this.elements.endMessage.textContent =
        choice.endMessage || "This storyline has ended.";
      return;
    }
    
    this.state.currentSceneId = choice.nextSceneId;
    this.renderScene();
  }

  reset() {
    this.state.reset();
    this.renderScene();
  }

  start() {
    this.renderScene();
  }
}

// --------------------------------------------------------
// 2. LEARNING OBJECTIVES & METRICS
// --------------------------------------------------------

const learningObjectives = {
  module1: "Module 1 – Role of Information Systems (IS) in transforming businesses",
  module2: "Module 2 – Integrated systems and performance",
  module3: "Module 3 – Strategic models (Porter, value chain, etc.)",
  module4: "Module 4 – Ethical, social, and legal issues",
  module5: "Module 5 – Information Technology (IT) infrastructure trends",
  module6: "Module 6 – Security and control",
  module7: "Module 7 – Enterprise applications",
  module8: "Module 8 – Artificial Intelligence (AI) and knowledge management"
};

const metricDefinitions = [
  new MetricDefinition({ id: "productivity", label: "Operational productivity", description: "...", value: 50 }),
  new MetricDefinition({ id: "employeeHappiness", label: "Employee engagement", description: "...", value: 50 }),
  new MetricDefinition({ id: "clientHappiness", label: "Client satisfaction", description: "...", value: 50 }),
  new MetricDefinition({ id: "securityRisk", label: "Security risk", description: "...", value: 50, idealDirection: "low" }),
  new MetricDefinition({ id: "innovation", label: "Innovation readiness", description: "...", value: 50 })
];

// --------------------------------------------------------
// 3. SCENES (10 TOTAL)
// --------------------------------------------------------

const scenes = {
  // 1) INTRO
  intro: new Scene({
    id: "intro",
    title: "Day 1 as Chief Information Officer",
    quarter: "Q1",
    area: "Strategy Zone",
    employee: new Employee({
      name: "Alex Chen",
      role: "IT Manager – Core Systems",
      initials: "A"
    }),
    objectives: ["module1", "module3", "module7"],
    text:
      "Welcome to NovaTech Logistics. The board has hired you as the new Chief Information Officer (CIO) to modernize systems and improve performance. Alex, your Information Technology (IT) Manager, has scheduled an urgent meeting about the company's aging order management platform.",
    choices: [
      new Choice({
        text: "Approve an integrated cloud enterprise resource planning (ERP) rollout this year.",
        tags: ["Enterprise applications", "Integration"],
        effects: {
          productivity: +10,
          employeeHappiness: -4,
          clientHappiness: +7,
          securityRisk: +4,
          innovation: +10
        },
        nextSceneId: "dataAudit",
        endMessage: null
      }),
      new Choice({
        text: "Stabilize the existing on-premise system and plan gradual upgrades.",
        tags: ["Risk reduction", "Incremental change"],
        effects: {
          productivity: +4,
          employeeHappiness: +3,
          clientHappiness: +2,
          securityRisk: -4,
          innovation: -3
        },
        nextSceneId: "securityAlert",
        endMessage: null
      })
    ]
  }),

  // 2) DATA AUDIT FOR ERP
  dataAudit: new Scene({
    id: "dataAudit",
    title: "Data quality before integration",
    quarter: "Q1",
    area: "Integrated Systems",
    employee: new Employee({
      name: "Alex Chen",
      role: "IT Manager – Core Systems",
      initials: "A"
    }),
    objectives: ["module2", "module7"],
    text:
      "Before the enterprise resource planning (ERP) rollout, Alex reports that customer, inventory, and supplier data is inconsistent across departments. If you migrate as-is, the new system may simply automate bad data.",
    choices: [
      new Choice({
        text: "Launch a cross-functional data audit and cleansing project before ERP go-live.",
        tags: ["Data quality", "Long-term reliability"],
        effects: {
          productivity: -4,
          employeeHappiness: -2,
          clientHappiness: +4,
          securityRisk: -6,
          innovation: +4
        },
        nextSceneId: "cloudVsOnPrem",
        endMessage: null
      }),
      new Choice({
        text: "Do minimal clean-up and rely on migration tools to handle mapping and transformation.",
        tags: ["Short-term speed", "Higher risk"],
        effects: {
          productivity: +4,
          employeeHappiness: +1,
          clientHappiness: 0,
          securityRisk: +5,
          innovation: -2
        },
        nextSceneId: "cloudVsOnPrem",
        endMessage: null
      })
    ]
  }),

  // 3) SECURITY ALERT (LEGACY SYSTEMS)
  securityAlert: new Scene({
    id: "securityAlert",
    title: "Ransomware scare",
    quarter: "Q1",
    area: "Security Sector",
    employee: new Employee({
      name: "Jordan Singh",
      role: "Chief Information Security Officer (CISO)",
      initials: "J"
    }),
    objectives: ["module4", "module6"],
    text:
      "Jordan informs you that competitors in your industry have been hit by ransomware attacks. Your legacy infrastructure has known vulnerabilities, and patching could disrupt operations.",
    choices: [
      new Choice({
        text: "Schedule an immediate security hardening window with partial downtime.",
        tags: ["Security-first", "Risk mitigation"],
        effects: {
          productivity: -6,
          employeeHappiness: -2,
          clientHappiness: -4,
          securityRisk: -18,
          innovation: +1
        },
        nextSceneId: "incidentResponse",
        endMessage: null
      }),
      new Choice({
        text: "Delay major security work and rely on backups while you monitor threats.",
        tags: ["Business continuity", "Higher risk"],
        effects: {
          productivity: +3,
          employeeHappiness: +1,
          clientHappiness: +2,
          securityRisk: +14,
          innovation: 0
        },
        nextSceneId: "incidentResponse",
        endMessage: null
      })
    ]
  }),

  // 4) CLOUD VS ON-PREMISE ARCHITECTURE
  cloudVsOnPrem: new Scene({
    id: "cloudVsOnPrem",
    title: "Cloud or hybrid architecture?",
    quarter: "Q2",
    area: "Strategy Zone",
    employee: new Employee({
      name: "Alex Chen",
      role: "IT Manager – Core Systems",
      initials: "A"
    }),
    objectives: ["module3", "module5"],
    text:
      "Alex presents infrastructure options for the new enterprise resource planning (ERP) platform. You can move fully to a cloud-based solution or deploy a hybrid model with some components on-premise.",
    choices: [
      new Choice({
        text: "Adopt a fully cloud-based ERP solution with managed services.",
        tags: ["Scalability", "Vendor dependency"],
        effects: {
          productivity: +6,
          employeeHappiness: +2,
          clientHappiness: +4,
          securityRisk: +4,
          innovation: +6
        },
        nextSceneId: "changeManagement",
        endMessage: null
      }),
      new Choice({
        text: "Deploy a hybrid model with critical data and services kept on-premise.",
        tags: ["Control", "Balanced approach"],
        effects: {
          productivity: +3,
          employeeHappiness: +1,
          clientHappiness: +3,
          securityRisk: -3,
          innovation: +2
        },
        nextSceneId: "changeManagement",
        endMessage: null
      })
    ]
  }),

  // 5) INCIDENT RESPONSE APPROACH
  incidentResponse: new Scene({
    id: "incidentResponse",
    title: "Incident response strategy",
    quarter: "Q2",
    area: "Security Sector",
    employee: new Employee({
      name: "Jordan Singh",
      role: "Chief Information Security Officer (CISO)",
      initials: "J"
    }),
    objectives: ["module4", "module6"],
    text:
      "Shortly after the initial alerts, your monitoring system flags suspicious activity that might be a failed phishing attempt. Jordan asks how aggressive you want the incident response to be.",
    choices: [
      new Choice({
        text: "Run a full incident response, notify stakeholders, and conduct a formal post-incident review.",
        tags: ["Transparency", "Governance"],
        effects: {
          productivity: -3,
          employeeHappiness: +1,
          clientHappiness: -1,
          securityRisk: -15,
          innovation: +1
        },
        nextSceneId: "changeManagement",
        endMessage: null
      }),
      new Choice({
        text: "Quietly remediate, avoid broad communication, and treat it as a minor event.",
        tags: ["Minimal disruption", "Reputational risk"],
        effects: {
          productivity: -1,
          employeeHappiness: -2,
          clientHappiness: +1,
          securityRisk: -5,
          innovation: 0
        },
        nextSceneId: "changeManagement",
        endMessage: null
      })
    ]
  }),

  // 6) CHANGE MANAGEMENT
  changeManagement: new Scene({
    id: "changeManagement",
    title: "Change management pushback",
    quarter: "Q2",
    area: "Integrated Systems",
    employee: new Employee({
      name: "Maria Lopez",
      role: "Human Resources (HR) Director",
      initials: "M"
    }),
    objectives: ["module2", "module4", "module7"],
    text:
      "Maria explains that employees feel anxious about the new enterprise resource planning (ERP) implementation. Training time will pull them away from daily work, and some fear automation may eliminate roles.",
    choices: [
      new Choice({
        text:
          "Invest heavily in training and communication, even if productivity dips short-term.",
        tags: ["People-first", "Long-term value"],
        effects: {
          productivity: -5,
          employeeHappiness: +15,
          clientHappiness: +5,
          securityRisk: -2,
          innovation: +8
        },
        nextSceneId: "vendorLockIn",
        endMessage: null
      }),
      new Choice({
        text: "Limit training to critical users to protect short-term performance.",
        tags: ["Short-term results", "Cost control"],
        effects: {
          productivity: +6,
          employeeHappiness: -10,
          clientHappiness: 0,
          securityRisk: 0,
          innovation: -3
        },
        nextSceneId: "vendorLockIn",
        endMessage: null
      })
    ]
  }),

  // 7) VENDOR LOCK-IN VS FLEXIBILITY
  vendorLockIn: new Scene({
    id: "vendorLockIn",
    title: "Vendor strategy and lock-in risk",
    quarter: "Q3",
    area: "Strategy Zone",
    employee: new Employee({
      name: "Alex Chen",
      role: "IT Manager – Core Systems",
      initials: "A"
    }),
    objectives: ["module3", "module5", "module7"],
    text:
      "Your enterprise resource planning (ERP) vendor offers a large discount if you sign a seven-year exclusive contract. Alternatively, you can maintain a more modular, multi-vendor architecture at a higher cost.",
    choices: [
      new Choice({
        text: "Sign the long-term exclusive contract to secure discounts and vendor services.",
        tags: ["Cost savings", "Higher dependency"],
        effects: {
          productivity: +4,
          employeeHappiness: +1,
          clientHappiness: +3,
          securityRisk: +2,
          innovation: -6
        },
        nextSceneId: "shadowIT",
        endMessage: null
      }),
      new Choice({
        text: "Keep a modular, multi-vendor strategy even if licensing costs are higher.",
        tags: ["Flexibility", "Resilience"],
        effects: {
          productivity: +2,
          employeeHappiness: 0,
          clientHappiness: +2,
          securityRisk: -2,
          innovation: +6
        },
        nextSceneId: "shadowIT",
        endMessage: null
      })
    ]
  }),

  // 8) SHADOW IT AND GOVERNANCE
  shadowIT: new Scene({
    id: "shadowIT",
    title: "Shadow IT and governance",
    quarter: "Q3",
    area: "Integrated Systems",
    employee: new Employee({
      name: "Maria Lopez",
      role: "Human Resources (HR) Director",
      initials: "M"
    }),
    objectives: ["module2", "module4", "module6", "module7"],
    text:
      "Several departments have adopted their own Software as a Service (SaaS) tools for task tracking and file sharing, outside the official enterprise resource planning (ERP) environment. This “shadow IT” makes some teams more productive but raises security and integration concerns.",
    choices: [
      new Choice({
        text: "Shut down unsupported tools and enforce a strict standard toolset.",
        tags: ["Standardization", "Stronger control"],
        effects: {
          productivity: -3,
          employeeHappiness: -8,
          clientHappiness: 0,
          securityRisk: -8,
          innovation: -4
        },
        nextSceneId: "aiProposal",
        endMessage: null
      }),
      new Choice({
        text:
          "Assess popular tools and bring the best of them into the official portfolio with proper governance.",
        tags: ["Pragmatic", "Collaborative"],
        effects: {
          productivity: +4,
          employeeHappiness: +6,
          clientHappiness: +2,
          securityRisk: -2,
          innovation: +5
        },
        nextSceneId: "aiProposal",
        endMessage: null
      })
    ]
  }),

  // 9) AI PROPOSAL
  aiProposal: new Scene({
    id: "aiProposal",
    title: "Artificial Intelligence (AI) for decision support",
    quarter: "Q4",
    area: "AI Arena",
    employee: new Employee({
      name: "Priya Patel",
      role: "Data and Analytics Lead",
      initials: "P"
    }),
    objectives: ["module3", "module5", "module8"],
    text:
      "Priya proposes a pilot Artificial Intelligence (AI) decision-support system to predict late shipments and recommend interventions. It requires clean integrated data and raises questions about transparency and bias.",
    choices: [
      new Choice({
        text: "Approve the AI pilot with strong governance and explainable models.",
        tags: ["AI & ethics", "Strategic advantage"],
        effects: {
          productivity: +8,
          employeeHappiness: +3,
          clientHappiness: +9,
          securityRisk: +3,
          innovation: +12
        },
        nextSceneId: "knowledgeProgram",
        endMessage: null
      }),
      new Choice({
        text: "Delay AI and focus on improving manual analytics and reporting.",
        tags: ["Conservative", "Operational focus"],
        effects: {
          productivity: +3,
          employeeHappiness: +1,
          clientHappiness: +3,
          securityRisk: -2,
          innovation: -5
        },
        nextSceneId: "knowledgeProgram",
        endMessage: null
      })
    ]
  }),

  // 10) KNOWLEDGE MANAGEMENT PROGRAM (FINAL)
  knowledgeProgram: new Scene({
    id: "knowledgeProgram",
    title: "Knowledge management and lessons learned",
    quarter: "Q4",
    area: "AI Arena",
    employee: new Employee({
      name: "Priya Patel",
      role: "Data and Analytics Lead",
      initials: "P"
    }),
    objectives: ["module1", "module2", "module8"],
    text:
      "After a year of change, NovaTech Logistics has new systems, processes, and data. Priya asks whether you want to formalize a knowledge management program to capture insights, decisions, and models for future improvement.",
    choices: [
      new Choice({
        text:
          "Create a formal knowledge management program with a centralized portal and clear ownership.",
        tags: ["Organizational learning", "Continuous improvement"],
        effects: {
          productivity: +5,
          employeeHappiness: +4,
          clientHappiness: +4,
          securityRisk: -2,
          innovation: +5
        },
        nextSceneId: null,
        endMessage:
          "You consolidate NovaTech Logistics into a learning organization. Knowledge from projects, analytics, and Artificial Intelligence (AI) pilots is captured and reused. Performance, morale, and innovation all trend upward, and the board sees you as a strategic digital leader."
      }),
      new Choice({
        text:
          "Leave knowledge in email, chat, and informal documents without a formal program.",
        tags: ["Low effort", "Missed opportunity"],
        effects: {
          productivity: -3,
          employeeHappiness: -2,
          clientHappiness: -2,
          securityRisk: +2,
          innovation: -4
        },
        nextSceneId: null,
        endMessage:
          "Projects deliver some benefits, but lessons are often lost when people move roles or leave the company. Analytics and Artificial Intelligence (AI) initiatives remain isolated, and NovaTech Logistics struggles to turn experience into a repeatable competitive advantage."
      })
    ]
  })
};

// startingSceneId already declared above; no redeclaration here.


// --------------------------------------------------------
// 4. DOM REFERENCES
// --------------------------------------------------------

const el = {
  currentSceneIdLabel: document.getElementById("currentSceneIdLabel"),
  sceneTitle: document.getElementById("sceneTitle"),
  sceneMeta: document.getElementById("sceneMeta"),
  employeeAvatar: document.getElementById("employeeAvatar"),
  employeeName: document.getElementById("employeeName"),
  employeeRole: document.getElementById("employeeRole"),
  sceneText: document.getElementById("sceneText"),
  objectivesList: document.getElementById("objectivesList"),
  choicesContainer: document.getElementById("choicesContainer"),
  statsList: document.getElementById("statsList"),
  summaryNote: document.getElementById("summaryNote"),
  logContainer: document.getElementById("logContainer"),
  endMessage: document.getElementById("endMessage"),
  resetButton: document.getElementById("resetButton")
};

// --------------------------------------------------------
// 5. START GAME
// --------------------------------------------------------

const startingSceneId = "intro";

const game = new GameEngine({
  scenes,
  metricDefinitions,
  learningObjectives,
  startingSceneId,
  elements: el
});

game.start();

