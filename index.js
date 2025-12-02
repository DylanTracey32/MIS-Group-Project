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

    // Capture original background and define hacked background
    this.originalBackgroundImage = getComputedStyle(document.documentElement).backgroundImage;
    this.hackedBackgroundImage = 'url("images/triceratops.png")';

    if (this.elements.resetButton) {
      this.elements.resetButton.addEventListener("click", () => this.reset());
    }
  }

  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  setBackgroundOriginal() {
    document.documentElement.style.backgroundImage = this.originalBackgroundImage;
  }

  setBackgroundHacked() {
    document.documentElement.style.backgroundImage = this.hackedBackgroundImage;
  }

  showHackedOverlay(message) {
    // Hide the main game container (everything except background and overlay)
    const shell = document.querySelector(".game-shell");
    if (shell) {
      shell.style.visibility = "hidden";
    }

    // Create overlay once
    let overlay = document.getElementById("hackOverlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "hackOverlay";
      overlay.style.position = "fixed";
      overlay.style.inset = "0";
      overlay.style.display = "flex";
      overlay.style.alignItems = "center";
      overlay.style.justifyContent = "center";
      overlay.style.textAlign = "center";
      overlay.style.padding = "1.5rem";
      overlay.style.boxSizing = "border-box";
      overlay.style.zIndex = "9999";
      overlay.style.background = "transparent"; // Let background image show
      overlay.style.pointerEvents = "none";     // No interaction; pure status view

      const box = document.createElement("div");
      box.id = "hackOverlayMessage";
      box.style.maxWidth = "800px";
      box.style.fontSize = "1.4rem";
      box.style.fontWeight = "700";
      box.style.color = "#ffe8d5";
      box.style.textShadow = "0 0 16px rgba(0,0,0,0.9)";
      box.style.padding = "1.5rem 2rem";
      box.style.borderRadius = "14px";
      box.style.border = "1px solid rgba(255,120,60,0.9)";
      box.style.background = "rgba(5,4,9,0.85)";
      overlay.appendChild(box);

      document.body.appendChild(overlay);
    }

    const box = document.getElementById("hackOverlayMessage");
    if (box) {
      box.textContent = message;
    }
  }

  clearHackedOverlay() {
    const shell = document.querySelector(".game-shell");
    if (shell) {
      shell.style.visibility = ""; // restore default
    }

    const overlay = document.getElementById("hackOverlay");
    if (overlay) {
      overlay.remove();
    }
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
      if (def.id === "security") fill.classList.add("risk");
      fill.style.width = `${percentage}%`;

      track.appendChild(fill);
      row.appendChild(top);
      row.appendChild(track);
      statsList.appendChild(row);
    });

    const risk = this.state.metrics.security;
    const productivity = this.state.metrics.productivity;
    const client = this.state.metrics.clientHappiness;

    let note = "Balance productivity, people, clients, and risk to succeed.";
    if (risk <= 25) {
      note = "Security risk is low – consider decisions that strengthen controls and resilience.";
    } else if (productivity >= 75 && client >= 75 && risk <= 40) {
      note = "You are operating as a high-performing, secure digital firm.";
    }

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
      } else {
        delta.textContent = "±0";
      }

      div.appendChild(metric);
      div.appendChild(delta);

      logContainer.appendChild(div);
    });

    logContainer.scrollTop = logContainer.scrollHeight;
  }

  renderScene() {
    const scene = this.scenes[this.state.currentSceneId];
    if (!scene) {
      console.error("Scene not found:", this.state.currentSceneId);
      return;
    }

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

    if (currentSceneIdLabel) {
      currentSceneIdLabel.textContent = scene.id;
    }

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

  // Unified fail-state logic (formerly separate)
  checkFailState(gameOver) {
    const profitability = this.state.metrics.profitability;
    const productivity = this.state.metrics.productivity;
    const employeeHappiness = this.state.metrics.employeeHappiness;
    const clientHappiness = this.state.metrics.clientHappiness;
    const security = this.state.metrics.security;
    const innovation = this.state.metrics.innovation;

    // Immediate failures (≤ 0)
    if (profitability <= 0) {
      return "The company goes bankrupt, you lose.";
    } else if (productivity <= 0) {
      return "The employees at the company are too bogged down in busy work to provide value to the company, you lose.";
    } else if (employeeHappiness <= 0) {
      return "The employees at the company are unhappy and turnover rate is high, you lose.";
    } else if (clientHappiness <= 0) {
      return "The clients are dissatisfied with our services and have abandoned us for our competitors, you lose.";
    } else if (security <= 0) {
      const msg = "YOU HAVE BEEN HACKED BY THE TRICERATOPS GROUP! YOU LOSE!";
      this.setBackgroundHacked();
      this.showHackedOverlay(msg);
      return msg;
    } else if (innovation <= 0) {
      return "We have failed to adapt to new industry tools and have been rendered obsolete, you lose.";
    }

    // Only check soft win/lose thresholds on true gameOver
    if (gameOver === true) {
      const anyBelow70 =
        profitability < 70 ||
        productivity < 70 ||
        employeeHappiness < 70 ||
        clientHappiness < 70 ||
        security < 70 ||
        innovation < 70;

      const allAtLeast70 =
        profitability >= 70 &&
        productivity >= 70 &&
        employeeHappiness >= 70 &&
        clientHappiness >= 70 &&
        security >= 70 &&
        innovation >= 70;

      if (anyBelow70) {
        return "The company's earnings report shows modest gains, you win!";
      } else if (allAtLeast70) {
        return "The company's earnings report shows substantial growth and profitability, your company gains international recognition and your company credits it to your excellent-decision making! You win!";
      }
    }

    return null;
  }

  handleChoice(scene, choice) {
    this.applyEffects(choice.effects);
    this.renderStats();
    this.renderLog();

    // Check for immediate failure after applying effects
    const failMessage = this.checkFailState(false);
    if (failMessage) {
      this.elements.choicesContainer.innerHTML = "";
      this.elements.endMessage.style.display = "block";
      this.elements.endMessage.textContent = failMessage;
      return;
    }

    // If no next scene, this is an end-of-storyline choice
    if (choice.nextSceneId === null) {
      this.elements.choicesContainer.innerHTML = "";
      this.elements.endMessage.style.display = "block";

      // Final evaluation of win/lose with thresholds
      const finalMessage = this.checkFailState(true);
      this.elements.endMessage.textContent =
        finalMessage || choice.endMessage || "This storyline has ended.";
      return;
    }

    // Continue to next scene
    this.state.currentSceneId = choice.nextSceneId;
    this.renderScene();
  }

  reset() {
    this.state.reset();
    this.setBackgroundOriginal();
    this.clearHackedOverlay();
    this.renderScene();
  }

  start() {
    this.setBackgroundOriginal();
    this.clearHackedOverlay();
    this.renderScene();
  }
}

// --------------------------------------------------------
// 2. LEARNING OBJECTIVES AND METRICS
// --------------------------------------------------------

const learningObjectives = {
  module1: "Module 1 – Information Systems in Global Business Today",
  module2: "Module 2 – Global E-business and Collaboration",
  module4: "Module 4 – Social, Ethical, and Legal Issues in the Digital Firm",
  module5: "Module 5 – IT Infrastructure and Emerging Technologies",
  module8: "Module 8 – Managing Knowledge and Artificial Intelligence"
};

const metricDefinitions = [
  new MetricDefinition({ id: "profitability", label: "Profitability", description: "...", value: 50 }),
  new MetricDefinition({ id: "productivity", label: "Operational productivity", description: "...", value: 50 }),
  new MetricDefinition({ id: "employeeHappiness", label: "Employee engagement", description: "...", value: 50 }),
  new MetricDefinition({ id: "clientHappiness", label: "Client satisfaction", description: "...", value: 50 }),
  new MetricDefinition({ id: "security", label: "Security", description: "...", value: 50 }),
  new MetricDefinition({ id: "innovation", label: "Innovation readiness", description: "...", value: 50 })
];

// --------------------------------------------------------
// 3. SCENES
// --------------------------------------------------------

const scenes = {
  // 1) INTRO (X)
  intro: new Scene({
    id: "intro",
    title: "Day 1 as Chief Information Officer",
    quarter: "Q1",
    area: "Strategy Zone",
    employee: new Employee({
      name: "Alex Chen (Ankylosaurus)",
      role: "IT Manager – Core Systems",
      initials: "A"
    }),
    objectives: ["module1"],
    text:
      "Welcome to TriceraTech Logistics! The board has hired you as the new Chief Information Officer (CIO) to modernize systems and improve performance. Alex, your Ankylosaurus Information Technology (IT) Manager, has scheduled an urgent meeting about the company's aging order management platform.",
    choices: [
      new Choice({
        text: "Approve an integrated cloud enterprise resource planning (ERP) rollout this year, or we'll be fossils!",
        tags: ["Enterprise applications", "Integration"],
        effects: {
          profitability: -14,
          productivity: +18,
          employeeHappiness: -7,
          clientHappiness: +7,
          security: 0,
          innovation: +20
        },
        nextSceneId: "dataAudit",
        endMessage: null
      }),
      new Choice({
        text: "Stabilize the existing on-premise system and plan gradual upgrades, slow and steady wins the race.",
        tags: ["Risk reduction", "Incremental change"],
        effects: {
          profitability: +10,
          productivity: +12,
          employeeHappiness: +10,
          clientHappiness: 0,
          security: +12,
          innovation: -8
        },
        nextSceneId: "securityAlert",
        endMessage: null
      })
    ]
  }),

  // 2) DATA AUDIT FOR ERP (X)
  dataAudit: new Scene({
    id: "dataAudit",
    title: "Data quality before integration",
    quarter: "Q1",
    area: "Integrated Systems",
    employee: new Employee({
      name: "Alex Chen (Ankylosaurus)",
      role: "IT Manager – Core Systems",
      initials: "A"
    }),
    objectives: ["module2"],
    text:
      "Before the ERP rollout, Alex reports that customer, inventory, and supplier data is inconsistent across departments. If you migrate now, the new system may simply automate bad data.",
    choices: [
      new Choice({
        text: "Launch a data audit and cleansing project before the ERP rollout, Data Cleanliness is next to Data Godliness!",
        tags: ["Data quality", "Long-term reliability"],
        effects: {
          profitability: -15,
          productivity: -12,
          employeeHappiness: -4,
          clientHappiness: +22,
          security: +30,
          innovation: +5
        },
        nextSceneId: "cloudVsOnPrem",
        endMessage: null
      }),
      new Choice({
        text: "Do minimal clean-up and rely on migration tools to handle mapping and transformation, no risk no reward!",
        tags: ["Short-term speed", "Higher risk"],
        effects: {
          profitability: +10,
          productivity: +4,
          employeeHappiness: +12,
          clientHappiness: 0,
          security: -35,
          innovation: +8
        },
        nextSceneId: "cloudVsOnPrem",
        endMessage: null
      })
    ]
  }),

  // 3) SECURITY ALERT (LEGACY SYSTEMS) (X)
  securityAlert: new Scene({
    id: "securityAlert",
    title: "Ransomware scare",
    quarter: "Q1",
    area: "Security Sector",
    employee: new Employee({
      name: "Jordan Singh (Stegostaurus)",
      role: "Chief Information Security Officer (CISO)",
      initials: "J"
    }),
    objectives: ["module4"],
    text:
      "Jordan informs you that competitors in your industry have been hit by ransomware attacks. Your legacy infrastructure has known vulnerabilities, and patching could disrupt operations.",
    choices: [
      new Choice({
        text: "Schedule an immediate security hardening window with partial, scheduled downtime. ",
        tags: ["Security-first", "Risk mitigation"],
        effects: {
          profitability: -12,
          productivity: -8,
          employeeHappiness: -10,
          clientHappiness: -10,
          security: +40,
          innovation: +15
        },
        nextSceneId: "incidentResponse",
        endMessage: null
      }),
      new Choice({
        text: "Delay major security work and rely on backups while you monitor threats.",
        tags: ["Business continuity", "Higher risk"],
        effects: {
          profitability: +5,
          productivity: +20,
          employeeHappiness: +20,
          clientHappiness: -20,
          security: -50,
          innovation: 0
        },
        nextSceneId: "incidentResponse",
        endMessage: null
      })
    ]
  }),

  // 4) CLOUD VS ON-PREMISE ARCHITECTURE (X)
  cloudVsOnPrem: new Scene({
    id: "cloudVsOnPrem",
    title: "Cloud or hybrid architecture?",
    quarter: "Q2",
    area: "Strategy Zone",
    employee: new Employee({
      name: "Alex Chen (Ankylosaurus)",
      role: "IT Manager – Core Systems",
      initials: "A"
    }),
    objectives: ["module5"],
    text:
      "Alex presents infrastructure options for the ERP platform. You can move fully to a cloud-based solution or deploy a hybrid model with some components on-site, some in the cloud.",
    choices: [
      new Choice({
        text: "Adopt a fully cloud-based ERP solution with managed services, so it's not just my head up there.",
        tags: ["Scalability", "Vendor dependency"],
        effects: {
          profitability: +15,
          productivity: +20,
          employeeHappiness: +27,
          clientHappiness: +44,
          security: -4,
          innovation: +60
        },
        nextSceneId: "changeManagement",
        endMessage: null
      }),
      new Choice({
        text: "Deploy a hybrid model with critical data and services kept on-premise, because the best offense is a good defense.",
        tags: ["Control", "Balanced approach"],
        effects: {
          profitability: -10,
          productivity: -8,
          employeeHappiness: -30,
          clientHappiness: +15,
          security: +50,
          innovation: +2
        },
        nextSceneId: "changeManagement",
        endMessage: null
      })
    ]
  }),

  // 5) INCIDENT RESPONSE APPROACH (X)
  incidentResponse: new Scene({
    id: "incidentResponse",
    title: "Incident response strategy",
    quarter: "Q2",
    area: "Security Sector",
    employee: new Employee({
      name: "Jordan Singh (Stegostaurus)",
      role: "Chief Information Security Officer (CISO)",
      initials: "J"
    }),
    objectives: ["module4"],
    text:
      "Shortly after the initial alerts, your monitoring system flags suspicious activity that might be a failed phishing attempt. Jordan asks how aggressive you want the incident response to be.",
    choices: [
      new Choice({
        text: "Run a full incident response, notify stakeholders, and conduct a formal post-incident review. Honesty is the best policy.",
        tags: ["Transparency", "Governance"],
        effects: {
          profitability: -10,
          productivity: -10,
          employeeHappiness: -65,
          clientHappiness: -20,
          security: +15,
          innovation: +1
        },
        nextSceneId: "changeManagement",
        endMessage: null
      }),
      new Choice({
        text: "Quietly remediate, avoid broad communication, and treat it as a minor event. Minimize and hope it goes away.",
        tags: ["Minimal disruption", "Reputational risk"],
        effects: {
          profitability: +10,
          productivity: +5,
          employeeHappiness: +2,
          clientHappiness: +10,
          security: -11,
          innovation: 0
        },
        nextSceneId: "changeManagement",
        endMessage: null
      })
    ]
  }),

  // 6) CHANGE MANAGEMENT (X)
  changeManagement: new Scene({
    id: "changeManagement",
    title: "Change management pushback",
    quarter: "Q2",
    area: "Integrated Systems",
    employee: new Employee({
      name: "Maria Lopez (T-rex)",
      role: "Human Resources (HR) Director",
      initials: "M"
    }),
    objectives: ["module2", "module4"],
    text:
      "Maria explains that employees feel anxious about the new ERP rollout. Training time will pull them away from daily work, and some fear automation may eliminate roles.",
    choices: [
      new Choice({
        text:
          "Invest heavily in training and communication, even if productivity dips short-term. You get training, and you get training, Everyone gets training!",
        tags: ["People-first", "Long-term value"],
        effects: {
          profitability: -12,
          productivity: -25,
          employeeHappiness: +35,
          clientHappiness: +20,
          security: +2,
          innovation: +18
        },
        nextSceneId: "vendorLockIn",
        endMessage: null
      }),
      new Choice({
        text: "Limit training to critical users to protect short-term performance. Only train those who need it.",
        tags: ["Short-term results", "Cost control"],
        effects: {
          profitability: +25,
          productivity: +12,
          employeeHappiness: -15,
          clientHappiness: 0,
          security: 0,
          innovation: -10
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
      name: "Alex Chen (Ankylosaurus)",
      role: "IT Manager – Core Systems",
      initials: "A"
    }),
    objectives: ["module5"],
    text:
      "Your ERP vendor offers a large discount if you sign a seven-year exclusive contract. Alternatively, you can maintain a more modular, multi-vendor architecture at a higher cost.",
    choices: [
      new Choice({
        text: "Sign the long-term exclusive contract to secure discounts and vendor services. A dance with th",
        tags: ["Cost savings", "Higher dependency"],
        effects: {
          profitability: +40,
          productivity: +15,
          employeeHappiness: -5,
          clientHappiness: 0,
          security: -6,
          innovation: -11
        },
        nextSceneId: "shadowIT",
        endMessage: null
      }),
      new Choice({
        text: "Keep a modular, multi-vendor strategy even if licensing costs are higher. Freedom comes at a cost.",
        tags: ["Flexibility", "Resilience"],
        effects: {
          profitability: -13,
          productivity: +2,
          employeeHappiness: +18,
          clientHappiness: +4,
          security: +20,
          innovation: +23
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
      name: "Maria Lopez (T-rex)",
      role: "Human Resources (HR) Director",
      initials: "M"
    }),
    objectives: ["module2", "module4"],
    text:
      "Several departments have adopted their own Software as a Service (SaaS) tools for task tracking and file sharing, outside the official enterprise resource planning (ERP) environment. This “shadow IT” makes some teams more productive but raises security and integration concerns.",
    choices: [
      new Choice({
        text: "Shut down unsupported tools and enforce a strict standard toolset.",
        tags: ["Standardization", "Stronger control"],
        effects: {
          profitability: -10,
          productivity: -5,
          employeeHappiness: -8,
          clientHappiness: 0,
          security: +31,
          innovation: -13
        },
        nextSceneId: "aiProposal",
        endMessage: null
      }),
      new Choice({
        text:
          "Assess popular tools and bring the best of them into the official portfolio with proper governance.",
        tags: ["Pragmatic", "Collaborative"],
        effects: {
          profitability: +28,
          productivity: +28,
          employeeHappiness: +33,
          clientHappiness: +15,
          security: -8,
          innovation: +29
        },
        nextSceneId: "aiProposal",
        endMessage: null
      })
    ]
  }),

  // 9) AI PROPOSAL (X)
  aiProposal: new Scene({
    id: "aiProposal",
    title: "Artificial Intelligence (AI) for decision support",
    quarter: "Q4",
    area: "AI Arena",
    employee: new Employee({
      name: "Priya Patel (Pterodactyl)",
      role: "Data and Analytics Lead",
      initials: "P"
    }),
    objectives: ["module5", "module8"],
    text:
      "Priya proposes a pilot Artificial Intelligence (AI) decision-support system to predict late shipments and recommend interventions. It requires clean integrated data and raises questions about transparency and bias.",
    choices: [
      new Choice({
        text: "Approve the AI pilot with strong governance and explainable models.",
        tags: ["AI & ethics", "Strategic advantage"],
        effects: {
          profitability: +18,
          productivity: +8,
          employeeHappiness: +3,
          clientHappiness: +45,
          security: -13,
          innovation: +26
        },
        nextSceneId: "knowledgeProgram",
        endMessage: null
      }),
      new Choice({
        text: "Delay AI and focus on improving manual analytics and reporting.",
        tags: ["Conservative", "Operational focus"],
        effects: {
          profitability: -3,
          productivity: +3,
          employeeHappiness: 0,
          clientHappiness: -12,
          security: +82,
          innovation: -8
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
      name: "Priya Patel (Pterodactyl)",
      role: "Data and Analytics Lead",
      initials: "P"
    }),
    objectives: ["module1", "module2", "module8"],
    text:
      "After a year of change, TriceraTech Logistics has new systems, processes, and data. Priya asks whether you want to formalize a knowledge management program to capture insights, decisions, and models for future improvement.",
    choices: [
      new Choice({
        text:
          "Create a formal knowledge management program with a centralized portal and clear ownership.",
        tags: ["Organizational learning", "Continuous improvement"],
        effects: {
          profitability: +13,
          productivity: +9,
          employeeHappiness: +16,
          clientHappiness: +6,
          security: +10,
          innovation: +5
        },
        nextSceneId: null,
        endMessage:
          "You consolidate TriceraTech Logistics into a learning organization. Knowledge from projects, analytics, and Artificial Intelligence (AI) pilots is captured and reused. Performance, morale, and innovation all trend upward, and the board sees you as a strategic digital leader."
      }),
      new Choice({
        text:
          "Leave knowledge in email, chat, and informal documents without a formal program.",
        tags: ["Low effort", "Missed opportunity"],
        effects: {
          profitability: -0,
          productivity: -0,
          employeeHappiness: -0,
          clientHappiness: -0,
          security: -100000000,
          innovation: -0
        },
        nextSceneId: null,
        endMessage:
          "Projects deliver some benefits, but lessons are often lost when people move roles or leave the company. Analytics and Artificial Intelligence (AI) initiatives remain isolated, and TriceraTech Logistics struggles to turn experience into a repeatable competitive advantage."
      })
    ]
  })
};

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
