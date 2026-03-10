(() => {
  const canvas = document.getElementById("c");
  const ctx = canvas.getContext("2d");

  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const modeEl = document.getElementById("mode");
  const levelNameEl = document.getElementById("levelName");
  const coinsEl = document.getElementById("coins");

  const overlay = document.getElementById("overlay");
  const ovTitle = document.getElementById("ovTitle");
  const ovText = document.getElementById("ovText");
  const ovSmall = document.getElementById("ovSmall");
  const btn = document.getElementById("btn");
  const nextBtn = document.getElementById("nextBtn");
  const menuOverlayBtn = document.getElementById("menuOverlayBtn");
  const levelList = document.getElementById("levelList");
  const settingsPanel = document.getElementById("settingsPanel");
  const editorPanel = document.getElementById("editorPanel");

  const menuBtn = document.getElementById("menuBtn");
  const levelBtn = document.getElementById("levelBtn");
  const practiceBtn = document.getElementById("practiceBtn");
  const settingsBtn = document.getElementById("settingsBtn");
  const editorBtn = document.getElementById("editorBtn");
  const fsBtn = document.getElementById("fsBtn");

  const W = canvas.width;
  const H = canvas.height;
  const GROUND_Y = H * 0.80;
  const START_X = 180;

  const SAVE_BEST = "miniDashInfinityBest";
  const SAVE_COINS = "miniDashInfinityCoins";
  const SAVE_LEVEL_BESTS = "miniDashInfinityLevelBests";
  const SAVE_UNLOCKED = "miniDashInfinityUnlocked";
  const SAVE_SETTINGS = "miniDashInfinitySettings";
  const SAVE_EDITOR = "miniDashInfinityCustomLevel";

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  let best = Number(localStorage.getItem(SAVE_BEST) || 0);
  let totalCoins = Number(localStorage.getItem(SAVE_COINS) || 0);
  let levelBests = JSON.parse(localStorage.getItem(SAVE_LEVEL_BESTS) || "{}");
  let unlockedCount = Number(localStorage.getItem(SAVE_UNLOCKED) || 1);
  let settings = Object.assign({
    screenShake: true,
    trail: true,
    flashes: true,
    forgivingPortals: true
  }, JSON.parse(localStorage.getItem(SAVE_SETTINGS) || "{}"));

  bestEl.textContent = best;
  coinsEl.textContent = totalCoins;

  let selectedLevelIndex = 0;
  let last = performance.now();
  let objects = [];
  let particles = [];
  let trail = [];
  let stars = [];
  let checkpoint = null;
  let secretCoinsTotal = 0;

  const state = {
    running: false,
    paused: false,
    gameOver: false,
    win: false,
    practice: false,
    scrollX: 0,
    beatWidth: 112,
    levelPixelLength: 0,
    flash: 0,
    shake: 0,
    currentSpeedMul: 1,
    coinsThisRun: 0,
    secretCoinsThisRun: 0,
    ending: false,
    endingTimer: 0,
    uiMode: "menu"
  };

  const player = {
    x: START_X,
    y: GROUND_Y - 42,
    w: 42,
    h: 42,
    vy: 0,
    gravity: 1,
    mode: "cube",
    onGround: true,
    coyote: 0,
    jumpBuffer: 0,
    doubleJumpAvailable: false,
    shipThrust: false,
    rotation: 0,
    mini: false
  };

  const BASE_CUBE_GRAVITY = 2700;
  const BASE_JUMP_V = 960;
  const MAX_FALL = 1800;
  const COYOTE = 0.09;
  const JUMP_BUFFER = 0.12;

  const BASE_SHIP_THRUST = 1760;
  const BASE_SHIP_GRAVITY = 1120;
  const BASE_SHIP_MAX = 700;

  function yPreset(name) {
    if (name === "high") return H * 0.30;
    if (name === "mid") return H * 0.49;
    if (name === "low") return H * 0.66;
    if (name === "invLow") return 70;
    if (name === "invMid") return 105;
    if (name === "invHigh") return 145;
    return H * 0.66;
  }

  function makeLevel(name, difficulty, bpm, speed, lengthBeats, background, description, sequence) {
    return { name, difficulty, bpm, speed, lengthBeats, background, description, sequence };
  }

  const LEVELS = [
    makeLevel(
      "Starter Path",
      "Easy",
      128,
      310,
      112,
      ["#102034", "#070c16"],
      "Harder opener with real structure. Teaches every mechanic cleanly.",
      [
        { beat: 6, type: "spike" },
        { beat: 9, type: "doubleSpike" },
        { beat: 13, type: "orb", y: "mid" },
        { beat: 17, type: "pad" },
        { beat: 21, type: "block", h: 58 },
        { beat: 24, type: "coin", y: "high" },
        { beat: 28, type: "checkpoint" },
        { beat: 32, type: "doubleSpike" },
        { beat: 37, type: "gravityPortal" },
        { beat: 40, type: "spikeCeil" },
        { beat: 43, type: "orb", y: "invMid" },
        { beat: 47, type: "spikeCeil" },
        { beat: 50, type: "gravityPortal" },
        { beat: 56, type: "shipPortal" },
        { beat: 60, type: "shipGateTop" },
        { beat: 64, type: "shipGateBottom" },
        { beat: 68, type: "shipGateTop" },
        { beat: 72, type: "coin", y: "mid" },
        { beat: 76, type: "shipGateBottom" },
        { beat: 80, type: "cubePortal" },
        { beat: 84, type: "doubleJumpPickup" },
        { beat: 88, type: "doubleSpike" },
        { beat: 92, type: "orb", y: "high" },
        { beat: 96, type: "tripleSpike" },
        { beat: 100, type: "secretCoin", y: "high" },
        { beat: 104, type: "pad" }
      ]
    ),
    makeLevel(
      "Circuit Flow",
      "Medium",
      136,
      338,
      126,
      ["#1a1633", "#0b0817"],
      "Harder speed control, more precise jumps and more meaningful ship routing.",
      [
        { beat: 5, type: "spike" },
        { beat: 8, type: "doubleSpike" },
        { beat: 12, type: "orb", y: "mid" },
        { beat: 16, type: "block", h: 64 },
        { beat: 20, type: "pad" },
        { beat: 24, type: "coin", y: "high" },
        { beat: 28, type: "checkpoint" },
        { beat: 32, type: "gravityPortal" },
        { beat: 35, type: "spikeCeil" },
        { beat: 38, type: "orb", y: "invMid" },
        { beat: 42, type: "spikeCeil" },
        { beat: 46, type: "orb", y: "invLow" },
        { beat: 50, type: "gravityPortal" },
        { beat: 54, type: "speedPortalFast" },
        { beat: 58, type: "shipPortal" },
        { beat: 62, type: "shipGateTop" },
        { beat: 65, type: "shipGateBottom" },
        { beat: 68, type: "shipGateTop" },
        { beat: 71, type: "shipGateBottom" },
        { beat: 74, type: "coin", y: "mid" },
        { beat: 78, type: "shipGateTop" },
        { beat: 82, type: "shipGateBottom" },
        { beat: 86, type: "cubePortal" },
        { beat: 90, type: "speedPortalNormal" },
        { beat: 94, type: "doubleJumpPickup" },
        { beat: 98, type: "tripleSpike" },
        { beat: 102, type: "orb", y: "high" },
        { beat: 106, type: "pad" },
        { beat: 110, type: "checkpoint" },
        { beat: 114, type: "tripleSpike" },
        { beat: 119, type: "secretCoin", y: "mid" }
      ]
    ),
    makeLevel(
      "Neon Drop",
      "Hard",
      144,
      360,
      140,
      ["#1e0f1f", "#09060e"],
      "Mini mode, dense structures and much more disciplined mechanic placement.",
      [
        { beat: 6, type: "spike" },
        { beat: 10, type: "doubleSpike" },
        { beat: 14, type: "orb", y: "mid" },
        { beat: 18, type: "block", h: 70 },
        { beat: 22, type: "tripleSpike" },
        { beat: 26, type: "checkpoint" },
        { beat: 30, type: "gravityPortal" },
        { beat: 34, type: "spikeCeil" },
        { beat: 37, type: "orb", y: "invMid" },
        { beat: 41, type: "spikeCeil" },
        { beat: 45, type: "gravityPortal" },
        { beat: 49, type: "miniPortal" },
        { beat: 53, type: "doubleSpike" },
        { beat: 56, type: "pad" },
        { beat: 60, type: "orb", y: "mid" },
        { beat: 64, type: "shipPortal" },
        { beat: 68, type: "shipGateTop" },
        { beat: 71, type: "shipGateBottom" },
        { beat: 74, type: "shipGateTop" },
        { beat: 77, type: "shipGateBottom" },
        { beat: 80, type: "coin", y: "mid" },
        { beat: 84, type: "shipGateTop" },
        { beat: 88, type: "shipGateBottom" },
        { beat: 92, type: "cubePortal" },
        { beat: 96, type: "miniPortal" },
        { beat: 100, type: "doubleJumpPickup" },
        { beat: 104, type: "tripleSpike" },
        { beat: 108, type: "orb", y: "high" },
        { beat: 112, type: "gravityPortal" },
        { beat: 115, type: "spikeCeil" },
        { beat: 118, type: "orb", y: "invLow" },
        { beat: 122, type: "spikeCeil" },
        { beat: 126, type: "gravityPortal" },
        { beat: 130, type: "secretCoin", y: "high" },
        { beat: 134, type: "pad" }
      ]
    ),
    makeLevel(
      "Pulse Reactor",
      "Hard+",
      150,
      382,
      154,
      ["#0c2230", "#071018"],
      "Faster and harsher. Every prop now supports the route instead of feeling random.",
      [
        { beat: 6, type: "spike" },
        { beat: 10, type: "doubleSpike" },
        { beat: 14, type: "orb", y: "mid" },
        { beat: 18, type: "block", h: 60 },
        { beat: 22, type: "coin", y: "high" },
        { beat: 26, type: "checkpoint" },
        { beat: 30, type: "speedPortalFast" },
        { beat: 34, type: "gravityPortal" },
        { beat: 37, type: "spikeCeil" },
        { beat: 40, type: "orb", y: "invMid" },
        { beat: 44, type: "spikeCeil" },
        { beat: 48, type: "orb", y: "invLow" },
        { beat: 52, type: "gravityPortal" },
        { beat: 56, type: "shipPortal" },
        { beat: 60, type: "shipGateTop" },
        { beat: 63, type: "shipGateBottom" },
        { beat: 66, type: "shipGateTop" },
        { beat: 69, type: "shipGateBottom" },
        { beat: 72, type: "coin", y: "mid" },
        { beat: 75, type: "shipGateTop" },
        { beat: 78, type: "shipGateBottom" },
        { beat: 82, type: "shipGateTop" },
        { beat: 86, type: "cubePortal" },
        { beat: 90, type: "miniPortal" },
        { beat: 94, type: "doubleSpike" },
        { beat: 98, type: "pad" },
        { beat: 102, type: "doubleJumpPickup" },
        { beat: 106, type: "tripleSpike" },
        { beat: 110, type: "checkpoint" },
        { beat: 114, type: "speedPortalNormal" },
        { beat: 118, type: "gravityPortal" },
        { beat: 121, type: "spikeCeil" },
        { beat: 124, type: "orb", y: "invLow" },
        { beat: 128, type: "spikeCeil" },
        { beat: 132, type: "gravityPortal" },
        { beat: 136, type: "secretCoin", y: "mid" },
        { beat: 140, type: "pad" },
        { beat: 146, type: "tripleSpike" }
      ]
    ),
    makeLevel(
      "Sky Fracture",
      "Very Hard",
      156,
      404,
      174,
      ["#241028", "#0b0710"],
      "Final stage. Harder overall, but every route is now intentional and reachable.",
      [
        { beat: 6, type: "spike" },
        { beat: 10, type: "doubleSpike" },
        { beat: 14, type: "orb", y: "mid" },
        { beat: 18, type: "block", h: 66 },
        { beat: 22, type: "tripleSpike" },
        { beat: 26, type: "checkpoint" },
        { beat: 30, type: "miniPortal" },
        { beat: 34, type: "doubleSpike" },
        { beat: 38, type: "pad" },
        { beat: 42, type: "orb", y: "mid" },
        { beat: 46, type: "gravityPortal" },
        { beat: 49, type: "spikeCeil" },
        { beat: 52, type: "orb", y: "invMid" },
        { beat: 56, type: "spikeCeil" },
        { beat: 60, type: "orb", y: "invLow" },
        { beat: 64, type: "gravityPortal" },
        { beat: 68, type: "coin", y: "high" },
        { beat: 72, type: "speedPortalFast" },
        { beat: 76, type: "shipPortal" },
        { beat: 80, type: "shipGateTop" },
        { beat: 83, type: "shipGateBottom" },
        { beat: 86, type: "shipGateTop" },
        { beat: 89, type: "shipGateBottom" },
        { beat: 92, type: "shipGateTop" },
        { beat: 95, type: "shipGateBottom" },
        { beat: 98, type: "coin", y: "mid" },
        { beat: 102, type: "shipGateTop" },
        { beat: 106, type: "shipGateBottom" },
        { beat: 110, type: "cubePortal" },
        { beat: 114, type: "speedPortalNormal" },
        { beat: 118, type: "doubleJumpPickup" },
        { beat: 122, type: "tripleSpike" },
        { beat: 126, type: "orb", y: "high" },
        { beat: 130, type: "gravityPortal" },
        { beat: 133, type: "spikeCeil" },
        { beat: 136, type: "orb", y: "invLow" },
        { beat: 140, type: "spikeCeil" },
        { beat: 144, type: "gravityPortal" },
        { beat: 148, type: "checkpoint" },
        { beat: 152, type: "secretCoin", y: "mid" },
        { beat: 156, type: "pad" },
        { beat: 162, type: "tripleSpike" }
      ]
    )
  ];

  function getLevel() {
    if (selectedLevelIndex < LEVELS.length) return LEVELS[selectedLevelIndex];

    const custom = localStorage.getItem(SAVE_EDITOR);
    if (!custom) return LEVELS[0];

    try {
      return JSON.parse(custom);
    } catch {
      return LEVELS[0];
    }
  }

  function levelIsCustom() {
    return selectedLevelIndex >= LEVELS.length;
  }

  function getLevelBest(name = getLevel().name) {
    return Number(levelBests[name] || 0);
  }

  function setLevelBest(name, value) {
    levelBests[name] = Math.max(getLevelBest(name), value);
    localStorage.setItem(SAVE_LEVEL_BESTS, JSON.stringify(levelBests));
  }

  function isUnlocked(index) {
    if (index >= LEVELS.length) return true;
    return index < unlockedCount;
  }

  function applyMini(isMini) {
    player.mini = isMini;
    player.w = isMini ? 30 : 42;
    player.h = isMini ? 30 : 42;
    player.y = clamp(player.y, 0, GROUND_Y - player.h);
  }

  function resetPlayer() {
    applyMini(false);
    player.x = START_X;
    player.y = GROUND_Y - player.h;
    player.vy = 0;
    player.gravity = 1;
    player.mode = "cube";
    player.onGround = true;
    player.coyote = 0;
    player.jumpBuffer = 0;
    player.doubleJumpAvailable = false;
    player.shipThrust = false;
    player.rotation = 0;
    modeEl.textContent = player.mode;
  }

  function showOnlyPanel(name) {
    levelList.classList.toggle("hidden", name !== "levels");
    settingsPanel.classList.toggle("hidden", name !== "settings");
    editorPanel.classList.toggle("hidden", name !== "editor");
  }

  function renderSettingsPanel() {
    settingsPanel.innerHTML = `
      <div class="panelRow">
        <div>
          <label><input type="checkbox" id="setShake" ${settings.screenShake ? "checked" : ""}> Screen shake</label>
        </div>
        <div>
          <label><input type="checkbox" id="setTrail" ${settings.trail ? "checked" : ""}> Player trail</label>
        </div>
      </div>
      <div class="panelRow">
        <div>
          <label><input type="checkbox" id="setFlashes" ${settings.flashes ? "checked" : ""}> Flash effects</label>
        </div>
        <div>
          <label><input type="checkbox" id="setForgiving" ${settings.forgivingPortals ? "checked" : ""}> Huge portal hitboxes</label>
        </div>
      </div>
    `;

    settingsPanel.querySelector("#setShake").addEventListener("change", e => {
      settings.screenShake = e.target.checked; saveSettings();
    });
    settingsPanel.querySelector("#setTrail").addEventListener("change", e => {
      settings.trail = e.target.checked; saveSettings();
    });
    settingsPanel.querySelector("#setFlashes").addEventListener("change", e => {
      settings.flashes = e.target.checked; saveSettings();
    });
    settingsPanel.querySelector("#setForgiving").addEventListener("change", e => {
      settings.forgivingPortals = e.target.checked; saveSettings();
    });
  }

  function renderEditorPanel() {
    const saved = localStorage.getItem(SAVE_EDITOR);
    editorPanel.innerHTML = `
      <label>Custom level JSON</label>
      <textarea id="editorJson">${saved || JSON.stringify(makeLevel(
        "Custom Level",
        "Custom",
        140,
        340,
        100,
        ["#122032", "#081018"],
        "Your custom level.",
        [
          { beat: 8, type: "spike" },
          { beat: 12, type: "doubleSpike" },
          { beat: 18, type: "orb", y: "mid" },
          { beat: 24, type: "pad" },
          { beat: 30, type: "gravityPortal" },
          { beat: 33, type: "spikeCeil" },
          { beat: 36, type: "orb", y: "invMid" },
          { beat: 42, type: "gravityPortal" },
          { beat: 48, type: "shipPortal" },
          { beat: 54, type: "shipGateTop" },
          { beat: 58, type: "shipGateBottom" },
          { beat: 64, type: "cubePortal" },
          { beat: 70, type: "tripleSpike" }
        ]
      ), null, 2)}</textarea>
      <div class="overlayButtons" style="margin-top:10px;">
        <button id="saveEditorBtn">Save Custom Level</button>
        <button id="loadEditorBtn">Play Custom Level</button>
      </div>
    `;

    editorPanel.querySelector("#saveEditorBtn").addEventListener("click", () => {
      try {
        const obj = JSON.parse(editorPanel.querySelector("#editorJson").value);
        localStorage.setItem(SAVE_EDITOR, JSON.stringify(obj));
        ovSmall.textContent = "Custom level saved.";
      } catch {
        ovSmall.textContent = "Invalid JSON.";
      }
    });

    editorPanel.querySelector("#loadEditorBtn").addEventListener("click", () => {
      try {
        const obj = JSON.parse(editorPanel.querySelector("#editorJson").value);
        localStorage.setItem(SAVE_EDITOR, JSON.stringify(obj));
        selectedLevelIndex = LEVELS.length;
        resetLevel();
        startGame();
      } catch {
        ovSmall.textContent = "Invalid JSON.";
      }
    });
  }

  function saveSettings() {
    localStorage.setItem(SAVE_SETTINGS, JSON.stringify(settings));
  }

  function buildLevelList() {
    levelList.innerHTML = "";

    LEVELS.forEach((lvl, i) => {
      const unlocked = isUnlocked(i);
      const el = document.createElement("div");
      el.className = "levelItem" + (i === selectedLevelIndex ? " active" : "") + (!unlocked ? " locked" : "");
      el.innerHTML = `
        <div class="name">${lvl.name} • ${lvl.difficulty}${unlocked ? "" : " • Locked"}</div>
        <div class="meta">${lvl.description}</div>
        <div class="meta">Best: ${getLevelBest(lvl.name)}% • Speed: ${lvl.speed}</div>
      `;
      el.addEventListener("click", () => {
        if (!unlocked) return;
        selectedLevelIndex = i;
        levelNameEl.textContent = getLevel().name;
        buildLevelList();
        resetLevel(false);
      });
      levelList.appendChild(el);
    });

    if (localStorage.getItem(SAVE_EDITOR)) {
      const el = document.createElement("div");
      el.className = "levelItem" + (selectedLevelIndex === LEVELS.length ? " active" : "");
      el.innerHTML = `
        <div class="name">Custom Level • Custom</div>
        <div class="meta">Saved from the built-in editor.</div>
        <div class="meta">Best: ${getLevelBest("Custom Level")}%</div>
      `;
      el.addEventListener("click", () => {
        selectedLevelIndex = LEVELS.length;
        resetLevel(false);
      });
      levelList.appendChild(el);
    }
  }

  function showOverlay(title, text, startLabel = "Start", options = {}) {
    ovTitle.textContent = title;
    ovText.innerHTML = text;
    ovSmall.textContent = options.small || "Features: ship mode, gravity flip, mini mode, speed portals, coins, checkpoints, practice mode.";
    btn.textContent = startLabel;
    btn.classList.toggle("hidden", !!options.hideStart);
    nextBtn.classList.toggle("hidden", !options.showNext);
    menuOverlayBtn.classList.toggle("hidden", !options.showMenu);

    buildLevelList();
    renderSettingsPanel();
    renderEditorPanel();

    showOnlyPanel(options.panel || "levels");
    overlay.classList.remove("hidden");
    state.uiMode = options.panel || "levels";
  }

  function hideOverlay() {
    overlay.classList.add("hidden");
  }

  function buildStars() {
    stars = [];
    for (let i = 0; i < 42; i++) {
      stars.push({
        x: Math.random() * (state.levelPixelLength + W),
        y: 30 + Math.random() * 280,
        r: 1 + Math.random() * 3,
        a: 0.04 + Math.random() * 0.08
      });
    }
  }

  function buildObjects() {
    objects = [];
    const level = getLevel();

    for (const item of level.sequence) {
      const x = item.beat * state.beatWidth + W * 0.9;

      if (item.type === "spike") {
        objects.push({ kind: "spike", x, y: GROUND_Y, w: 36, h: 34, used: false });
      } else if (item.type === "doubleSpike") {
        objects.push({ kind: "spike", x, y: GROUND_Y, w: 36, h: 34, used: false });
        objects.push({ kind: "spike", x: x + 34, y: GROUND_Y, w: 36, h: 34, used: false });
      } else if (item.type === "tripleSpike") {
        for (let i = 0; i < 3; i++) {
          objects.push({ kind: "spike", x: x + i * 32, y: GROUND_Y, w: 34, h: 32, used: false });
        }
      } else if (item.type === "block") {
        objects.push({ kind: "block", x, y: GROUND_Y - item.h, w: 56, h: item.h, used: false });
      } else if (item.type === "orb") {
        objects.push({ kind: "orb", x, y: yPreset(item.y), r: 13, used: false });
      } else if (item.type === "coin") {
        objects.push({ kind: "coin", x, y: yPreset(item.y), r: 10, used: false });
      } else if (item.type === "secretCoin") {
        objects.push({ kind: "secretCoin", x, y: yPreset(item.y), r: 11, used: false });
      } else if (item.type === "gravityPortal") {
        objects.push({ kind: "gravityPortal", x, y: H * 0.5 - 84, w: 42, h: 168, used: false });
      } else if (item.type === "shipPortal") {
        objects.push({ kind: "shipPortal", x, y: H * 0.5 - 88, w: 42, h: 176, used: false });
      } else if (item.type === "cubePortal") {
        objects.push({ kind: "cubePortal", x, y: H * 0.5 - 88, w: 42, h: 176, used: false });
      } else if (item.type === "miniPortal") {
        objects.push({ kind: "miniPortal", x, y: H * 0.5 - 74, w: 36, h: 148, used: false });
      } else if (item.type === "speedPortalFast") {
        objects.push({ kind: "speedPortalFast", x, y: H * 0.5 - 74, w: 36, h: 148, used: false });
      } else if (item.type === "speedPortalNormal") {
        objects.push({ kind: "speedPortalNormal", x, y: H * 0.5 - 74, w: 36, h: 148, used: false });
      } else if (item.type === "doubleJumpPickup") {
        objects.push({ kind: "doubleJumpPickup", x, y: H * 0.58, r: 12, used: false });
      } else if (item.type === "pad") {
        objects.push({ kind: "pad", x, y: GROUND_Y - 10, w: 38, h: 10, used: false });
      } else if (item.type === "checkpoint") {
        objects.push({ kind: "checkpoint", x, y: GROUND_Y - 90, w: 18, h: 90, used: false });
      } else if (item.type === "spikeCeil") {
        objects.push({ kind: "spikeCeil", x, y: 0, w: 36, h: 34, used: false });
      } else if (item.type === "shipGateTop") {
        objects.push({ kind: "shipGateTop", x, y: 0, w: 50, h: 72, used: false });
      } else if (item.type === "shipGateBottom") {
        objects.push({ kind: "shipGateBottom", x, y: GROUND_Y, w: 50, h: 72, used: false });
      }
    }

    state.levelPixelLength = level.lengthBeats * state.beatWidth + W * 1.1;
    buildStars();
  }

  function resetLevel(keepOverlay = true) {
    const level = getLevel();
    state.beatWidth = clamp(6100 / level.bpm, 95, 125);
    state.scrollX = 0;
    state.flash = 0;
    state.shake = 0;
    state.currentSpeedMul = 1;
    state.running = false;
    state.paused = false;
    state.gameOver = false;
    state.win = false;
    state.ending = false;
    state.endingTimer = 0;
    state.coinsThisRun = 0;
    state.secretCoinsThisRun = 0;
    checkpoint = null;
    objects = [];
    particles = [];
    trail = [];
    secretCoinsTotal = 0;
    resetPlayer();
    buildObjects();
    levelNameEl.textContent = level.name;
    scoreEl.textContent = "0";
    if (!keepOverlay) draw();
  }

  function saveCheckpoint() {
    checkpoint = {
      scrollX: state.scrollX,
      y: player.y,
      vy: 0,
      gravity: player.gravity,
      mode: player.mode,
      mini: player.mini,
      speedMul: state.currentSpeedMul,
      coinsThisRun: state.coinsThisRun,
      secretCoinsThisRun: state.secretCoinsThisRun,
      objectStates: objects.map(o => !!o.used)
    };
  }

  function loadCheckpoint() {
    if (!checkpoint) return false;

    state.scrollX = checkpoint.scrollX;
    state.currentSpeedMul = checkpoint.speedMul;
    player.y = checkpoint.y;
    player.vy = checkpoint.vy;
    player.gravity = checkpoint.gravity;
    player.mode = checkpoint.mode;
    applyMini(checkpoint.mini);
    player.doubleJumpAvailable = false;
    player.shipThrust = false;
    player.rotation = 0;
    player.x = START_X;
    state.coinsThisRun = checkpoint.coinsThisRun;
    state.secretCoinsThisRun = checkpoint.secretCoinsThisRun;
    modeEl.textContent = player.mode;

    objects.forEach((o, i) => { o.used = checkpoint.objectStates[i]; });
    return true;
  }

  function startGame() {
    resetLevel();
    state.running = true;
    hideOverlay();
    last = performance.now();
  }

  function restartGame() {
    resetLevel();
    state.running = true;
    hideOverlay();
    last = performance.now();
  }

  function goToMainMenu() {
    state.running = false;
    state.paused = false;
    showOverlay(
      "Mini Dash Infinity",
      `Pick a level and press start.<br>Total coins: ${totalCoins}<br>Global best: ${best}%<br>Unlocked levels: ${Math.min(unlockedCount, LEVELS.length)}/${LEVELS.length}`,
      "Start",
      { panel: "levels", small: "Now with settings, secret coins, an editor, and a real ending sequence." }
    );
  }

  function goToNextLevel() {
    if (selectedLevelIndex < LEVELS.length - 1 && isUnlocked(selectedLevelIndex + 1)) {
      selectedLevelIndex++;
      restartGame();
    } else {
      goToMainMenu();
    }
  }

  function currentPercent() {
    return clamp(Math.floor((state.scrollX / state.levelPixelLength) * 100), 0, 100);
  }

  function expandedPortalHitbox(o) {
    const extra = settings.forgivingPortals ? 30 : 12;
    return {
      x: o.x - state.scrollX - extra,
      y: o.y - extra,
      w: o.w + extra * 2,
      h: o.h + extra * 2
    };
  }

  function spawnDeathParticles() {
    for (let i = 0; i < 24; i++) {
      particles.push({
        x: player.x + player.w / 2,
        y: player.y + player.h / 2,
        vx: (Math.random() - 0.5) * 420,
        vy: (Math.random() - 0.5) * 420,
        life: 0.7 + Math.random() * 0.4,
        size: 3 + Math.random() * 5,
      });
    }
  }

  function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  function pointInTri(px, py, ax, ay, bx, by, cx, cy) {
    const area = (x1, y1, x2, y2, x3, y3) =>
      x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2);

    const A = area(ax, ay, bx, by, cx, cy);
    const A1 = area(px, py, bx, by, cx, cy);
    const A2 = area(ax, ay, px, py, cx, cy);
    const A3 = area(ax, ay, bx, by, px, py);

    return (A >= 0 && A1 >= 0 && A2 >= 0 && A3 >= 0) || (A <= 0 && A1 <= 0 && A2 <= 0 && A3 <= 0);
  }

  function hitSpike(px, py, pw, ph, sx, sy, sw, sh, upsideDown = false) {
    const shrink = player.mini ? 3 : 5;
    const rx = px + shrink;
    const ry = py + shrink;
    const rw = pw - shrink * 2;
    const rh = ph - shrink * 2;
    const boxY = upsideDown ? sy : sy - sh;

    if (!rectsOverlap(rx, ry, rw, rh, sx, boxY, sw, sh)) return false;

    const tri = upsideDown
      ? [[sx, sy], [sx + sw / 2, sy + sh], [sx + sw, sy]]
      : [[sx, sy], [sx + sw / 2, sy - sh], [sx + sw, sy]];

    const pts = [
      [rx, ry],
      [rx + rw, ry],
      [rx, ry + rh],
      [rx + rw, ry + rh],
      [rx + rw / 2, ry + rh / 2]
    ];

    for (const [x, y] of pts) {
      if (pointInTri(x, y, tri[0][0], tri[0][1], tri[1][0], tri[1][1], tri[2][0], tri[2][1])) {
        return true;
      }
    }
    return false;
  }

  function currentJumpVelocity() {
    let v = BASE_JUMP_V;
    if (player.mini) v *= 0.90;
    if (player.gravity === -1) v *= 1.22;
    return v;
  }

  function currentCubeGravity() {
    let g = BASE_CUBE_GRAVITY;
    if (player.mini) g *= 0.92;
    if (player.gravity === -1) g *= 0.93;
    return g;
  }

  function currentShipPhysics() {
    let thrust = BASE_SHIP_THRUST;
    let gravity = BASE_SHIP_GRAVITY;
    let max = BASE_SHIP_MAX;
    if (player.mini) {
      thrust *= 0.92;
      gravity *= 0.92;
      max *= 0.9;
    }
    return { thrust, gravity, max };
  }

  function findOrbInRange() {
    for (const o of objects) {
      if (o.kind !== "orb" || o.used) continue;
      const sx = o.x - state.scrollX;
      const dx = Math.abs((player.x + player.w / 2) - sx);
      const dy = Math.abs((player.y + player.h / 2) - o.y);
      if (dx < (player.mini ? 40 : 50) && dy < (player.mini ? 38 : 48)) return o;
    }
    return null;
  }

  function pressJump() {
    if (!state.running) {
      if (state.gameOver || state.win) restartGame();
      else if (!state.paused) startGame();
      return;
    }

    if (state.paused || state.ending) return;

    if (player.mode === "ship") {
      player.shipThrust = true;
      return;
    }

    const orb = findOrbInRange();
    if (orb) {
      orb.used = true;
      player.vy = -currentJumpVelocity() * 1.06 * player.gravity;
      player.onGround = false;
      if (settings.flashes) state.flash = 0.55;
      if (settings.screenShake) state.shake = 6;
      return;
    }

    if (!player.onGround && player.doubleJumpAvailable) {
      player.doubleJumpAvailable = false;
      player.vy = -currentJumpVelocity() * 0.9 * player.gravity;
      return;
    }

    player.jumpBuffer = JUMP_BUFFER;
  }

  function releaseJump() {
    if (player.mode === "ship") player.shipThrust = false;
  }

  function updateCube(dt) {
    player.coyote = Math.max(0, player.coyote - dt);
    player.jumpBuffer = Math.max(0, player.jumpBuffer - dt);

    player.vy += currentCubeGravity() * player.gravity * dt;
    player.vy = clamp(player.vy, -MAX_FALL, MAX_FALL);
    player.y += player.vy * dt;

    let touchingSurface = false;

    if (player.gravity === 1) {
      if (player.y + player.h >= GROUND_Y) {
        player.y = GROUND_Y - player.h;
        player.vy = 0;
        touchingSurface = true;
      }
    } else {
      if (player.y <= 0) {
        player.y = 0;
        player.vy = 0;
        touchingSurface = true;
      }
    }

    if (touchingSurface) {
      player.onGround = true;
      player.coyote = COYOTE;
    } else {
      player.onGround = false;
    }

    if (player.jumpBuffer > 0 && (player.onGround || player.coyote > 0)) {
      player.jumpBuffer = 0;
      player.coyote = 0;
      player.onGround = false;
      player.vy = -currentJumpVelocity() * player.gravity;
    }

    player.rotation = lerp(player.rotation, clamp(player.vy / 900, -1, 1) * 0.75, 0.2);
  }

  function updateShip(dt) {
    const phys = currentShipPhysics();

    if (player.shipThrust) player.vy -= phys.thrust * player.gravity * dt;
    else player.vy += phys.gravity * player.gravity * dt;

    player.vy = clamp(player.vy, -phys.max, phys.max);
    player.y += player.vy * dt;

    if (player.y < 0) { player.y = 0; player.vy = 0; }
    if (player.y + player.h > GROUND_Y) { player.y = GROUND_Y - player.h; player.vy = 0; }

    player.rotation = lerp(player.rotation, clamp(player.vy / 700, -0.65, 0.65), 0.12);
  }

  function updateParticles(dt) {
    for (const p of particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 520 * dt;
    }
    particles = particles.filter(p => p.life > 0);
  }

  function updateTrail() {
    if (!settings.trail) return;
    trail.push({
      x: player.x + player.w / 2,
      y: player.y + player.h / 2,
      size: player.mini ? 8 : 12,
      life: 0.34
    });
    if (trail.length > 18) trail.shift();
    for (const t of trail) t.life -= 0.016;
    trail = trail.filter(t => t.life > 0);
  }

  function beginEnding() {
    state.ending = true;
    state.endingTimer = 1.8;
    player.vy = 0;
    player.shipThrust = false;
  }

  function finishLevelAfterEnding() {
    const score = 100;
    best = Math.max(best, score);
    bestEl.textContent = best;
    localStorage.setItem(SAVE_BEST, best);
    setLevelBest(getLevel().name, score);

    if (!levelIsCustom() && selectedLevelIndex + 1 > unlockedCount - 1 && selectedLevelIndex < LEVELS.length - 1) {
      unlockedCount = Math.max(unlockedCount, selectedLevelIndex + 2);
      localStorage.setItem(SAVE_UNLOCKED, unlockedCount);
    }

    state.running = false;
    state.win = true;
    state.gameOver = false;
    state.ending = false;

    const hasNext = !levelIsCustom() && selectedLevelIndex < LEVELS.length - 1 && isUnlocked(selectedLevelIndex + 1);

    showOverlay(
      "Level Complete",
      `${getLevel().name} finished.<br>Coins this run: ${state.coinsThisRun}<br>Secret coins this run: ${state.secretCoinsThisRun}<br>Level best: ${getLevelBest(getLevel().name)}%`,
      "Play Again",
      {
        showNext: hasNext,
        showMenu: true,
        panel: "levels",
        hideStart: false,
        small: "You can continue, replay, or go back to the menu."
      }
    );
  }

  function failLevel() {
    spawnDeathParticles();
    if (settings.flashes) state.flash = 0.9;
    if (settings.screenShake) state.shake = 12;

    if (state.practice && checkpoint) {
      loadCheckpoint();
      return;
    }

    const score = currentPercent();
    best = Math.max(best, score);
    bestEl.textContent = best;
    localStorage.setItem(SAVE_BEST, best);
    setLevelBest(getLevel().name, score);

    state.running = false;
    state.gameOver = true;
    state.win = false;
    state.ending = false;

    showOverlay(
      "Game Over",
      `${getLevel().name} • ${score}%<br>Level best: ${getLevelBest(getLevel().name)}%`,
      "Retry",
      {
        showMenu: true,
        panel: "levels",
        small: "Practice mode respawns at checkpoints."
      }
    );
  }

  function handlePortal(o) {
    if (o.kind === "gravityPortal") {
      player.gravity *= -1;
      player.vy *= 0.20;

      if (player.gravity === -1) player.y = Math.min(player.y, 46);
      else player.y = Math.max(player.y, GROUND_Y - player.h - 46);
    } else if (o.kind === "shipPortal") {
      player.mode = "ship";
      player.shipThrust = false;
      player.vy = 0;
      modeEl.textContent = player.mode;
    } else if (o.kind === "cubePortal") {
      player.mode = "cube";
      player.shipThrust = false;
      player.vy = 0;
      modeEl.textContent = player.mode;
    } else if (o.kind === "miniPortal") {
      applyMini(!player.mini);
    } else if (o.kind === "speedPortalFast") {
      state.currentSpeedMul = 1.18;
    } else if (o.kind === "speedPortalNormal") {
      state.currentSpeedMul = 1.0;
    }

    if (settings.flashes) state.flash = 0.8;
    if (settings.screenShake) state.shake = 7;
  }

  function update(dt) {
    if (state.paused) {
      updateParticles(dt);
      return;
    }

    if (state.ending) {
      state.endingTimer -= dt;
      state.scrollX += getLevel().speed * 0.9 * dt;
      player.rotation = lerp(player.rotation, 0, 0.05);
      player.y = lerp(player.y, H * 0.42, 0.03);
      if (settings.flashes) state.flash = Math.max(state.flash, 0.02);
      updateTrail();
      updateParticles(dt);

      if (state.endingTimer <= 0) {
        finishLevelAfterEnding();
      }
      return;
    }

    state.scrollX += getLevel().speed * state.currentSpeedMul * dt;
    state.flash = Math.max(0, state.flash - dt * 3);
    state.shake = Math.max(0, state.shake - dt * 26);

    const beatNow = state.scrollX / state.beatWidth;
    if (settings.flashes && Math.abs(beatNow - Math.round(beatNow)) < 0.035) {
      state.flash = Math.max(state.flash, 0.38);
    }

    if (player.mode === "cube") updateCube(dt);
    else updateShip(dt);

    updateTrail();

    const px = player.x;
    const py = player.y;
    const pw = player.w;
    const ph = player.h;

    for (const o of objects) {
      const sx = o.x - state.scrollX;

      if (o.kind === "block" && rectsOverlap(px + 4, py + 4, pw - 8, ph - 8, sx, o.y, o.w, o.h)) {
        failLevel(); return;
      }
      if (o.kind === "spike" && hitSpike(px, py, pw, ph, sx, o.y, o.w, o.h, false)) {
        failLevel(); return;
      }
      if (o.kind === "spikeCeil" && hitSpike(px, py, pw, ph, sx, o.y, o.w, o.h, true)) {
        failLevel(); return;
      }
      if (o.kind === "shipGateTop" && hitSpike(px, py, pw, ph, sx, o.y, o.w, o.h, true)) {
        failLevel(); return;
      }
      if (o.kind === "shipGateBottom" && hitSpike(px, py, pw, ph, sx, o.y, o.w, o.h, false)) {
        failLevel(); return;
      }

      if (o.kind === "pad" && !o.used) {
        if (rectsOverlap(px, py, pw, ph, sx, o.y - 8, o.w, o.h + 10)) {
          o.used = true;
          player.vy = -currentJumpVelocity() * 1.18 * player.gravity;
          player.onGround = false;
          if (settings.flashes) state.flash = 0.6;
          if (settings.screenShake) state.shake = 6;
        }
      }

      if (o.kind === "coin" && !o.used) {
        const d = o.r * 2;
        if (rectsOverlap(px, py, pw, ph, sx - o.r, o.y - o.r, d, d)) {
          o.used = true;
          totalCoins += 1;
          state.coinsThisRun += 1;
          localStorage.setItem(SAVE_COINS, totalCoins);
          coinsEl.textContent = totalCoins;
          if (settings.flashes) state.flash = 0.65;
        }
      }

      if (o.kind === "secretCoin" && !o.used) {
        const d = o.r * 2;
        if (rectsOverlap(px, py, pw, ph, sx - o.r, o.y - o.r, d, d)) {
          o.used = true;
          totalCoins += 3;
          state.secretCoinsThisRun += 1;
          localStorage.setItem(SAVE_COINS, totalCoins);
          coinsEl.textContent = totalCoins;
          if (settings.flashes) state.flash = 0.85;
        }
      }

      if (o.kind === "doubleJumpPickup" && !o.used) {
        const d = o.r * 2;
        if (rectsOverlap(px, py, pw, ph, sx - o.r, o.y - o.r, d, d)) {
          o.used = true;
          player.doubleJumpAvailable = true;
        }
      }

      if (o.kind === "checkpoint" && !o.used) {
        if (rectsOverlap(px, py, pw, ph, sx, o.y, o.w, o.h)) {
          o.used = true;
          saveCheckpoint();
        }
      }

      if (!o.used && ["gravityPortal", "shipPortal", "cubePortal", "miniPortal", "speedPortalFast", "speedPortalNormal"].includes(o.kind)) {
        const hb = expandedPortalHitbox(o);
        if (rectsOverlap(px, py, pw, ph, hb.x, hb.y, hb.w, hb.h)) {
          o.used = true;
          handlePortal(o);
        }
      }
    }

    const finishStart = state.levelPixelLength - 220;
    if (state.scrollX >= finishStart && !state.ending) {
      beginEnding();
    }

    updateParticles(dt);
    scoreEl.textContent = String(currentPercent());
  }

  function roundRect(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawSpike(x, y, w, h, top = false) {
    ctx.beginPath();
    if (top) {
      ctx.moveTo(x, y);
      ctx.lineTo(x + w / 2, y + h);
      ctx.lineTo(x + w, y);
    } else {
      ctx.moveTo(x, y);
      ctx.lineTo(x + w / 2, y - h);
      ctx.lineTo(x + w, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  function drawBackground() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, getLevel().background[0]);
    g.addColorStop(1, getLevel().background[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    for (const s of stars) {
      const sx = s.x - state.scrollX * 0.25;
      if (sx < -20 || sx > W + 20) continue;
      ctx.globalAlpha = s.a;
      ctx.beginPath();
      ctx.arc(sx, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (let i = 0; i < 18; i++) {
      const x = ((i * 200 - state.scrollX * 0.45) % (W + 220)) - 110;
      const y = 70 + ((i * 53) % 260);
      ctx.globalAlpha = 0.04;
      ctx.beginPath();
      ctx.arc(x, y, 26 + (i % 3) * 10, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (settings.flashes && state.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${state.flash * 0.1})`;
      ctx.fillRect(0, 0, W, H);
    }

    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1;
    const offset = state.scrollX % state.beatWidth;
    for (let x = -offset; x < W + state.beatWidth; x += state.beatWidth) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += 48) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = "rgba(255,255,255,0.14)";
    ctx.fillRect(0, GROUND_Y, W, 8);

    if (state.ending) {
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.font = "bold 34px system-ui";
      ctx.fillText("FINISH", W / 2 - 55, H * 0.22);
    }

    if (state.paused) {
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.font = "bold 36px system-ui";
      ctx.fillText("PAUSED", W / 2 - 70, H / 2);
    }
  }

  function drawPortal(x, y, w, h, fill) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "rgba(255,255,255,0.95)";
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);
  }

  function drawProps() {
    for (const o of objects) {
      const sx = o.x - state.scrollX;
      if (sx < -160 || sx > W + 160) continue;

      if (o.kind === "block") {
        ctx.fillStyle = "rgba(255,255,255,0.78)";
        roundRect(sx, o.y, o.w, o.h, 10);
        ctx.fill();
      } else if (o.kind === "spike") {
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        drawSpike(sx, o.y, o.w, o.h, false);
      } else if (o.kind === "spikeCeil") {
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        drawSpike(sx, o.y, o.w, o.h, true);
      } else if (o.kind === "shipGateTop") {
        ctx.fillStyle = "rgba(255,120,120,0.94)";
        drawSpike(sx, o.y, o.w, o.h, true);
      } else if (o.kind === "shipGateBottom") {
        ctx.fillStyle = "rgba(255,120,120,0.94)";
        drawSpike(sx, o.y, o.w, o.h, false);
      } else if (o.kind === "orb") {
        ctx.beginPath();
        ctx.arc(sx, o.y, o.r, 0, Math.PI * 2);
        ctx.fillStyle = o.used ? "rgba(255,255,255,0.15)" : "rgba(255,220,90,0.95)";
        ctx.fill();
      } else if (o.kind === "coin") {
        ctx.beginPath();
        ctx.arc(sx, o.y, o.r, 0, Math.PI * 2);
        ctx.fillStyle = o.used ? "rgba(255,255,255,0.10)" : "rgba(255,200,40,0.95)";
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (o.kind === "secretCoin") {
        ctx.beginPath();
        ctx.arc(sx, o.y, o.r, 0, Math.PI * 2);
        ctx.fillStyle = o.used ? "rgba(255,255,255,0.12)" : "rgba(255,100,220,0.95)";
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (o.kind === "doubleJumpPickup") {
        ctx.beginPath();
        ctx.arc(sx, o.y, o.r, 0, Math.PI * 2);
        ctx.fillStyle = o.used ? "rgba(255,255,255,0.12)" : "rgba(130,255,130,0.95)";
        ctx.fill();
      } else if (o.kind === "checkpoint") {
        ctx.fillStyle = o.used ? "rgba(120,255,140,0.95)" : "rgba(120,200,255,0.85)";
        ctx.fillRect(sx, o.y, o.w, o.h);
      } else if (o.kind === "pad") {
        ctx.fillStyle = o.used ? "rgba(255,255,255,0.2)" : "rgba(255,120,220,0.95)";
        roundRect(sx, o.y, o.w, o.h, 5);
        ctx.fill();
      } else if (o.kind === "gravityPortal") {
        drawPortal(sx, o.y, o.w, o.h, "rgba(255,120,210,0.65)");
      } else if (o.kind === "shipPortal") {
        drawPortal(sx, o.y, o.w, o.h, "rgba(90,255,180,0.65)");
      } else if (o.kind === "cubePortal") {
        drawPortal(sx, o.y, o.w, o.h, "rgba(90,170,255,0.65)");
      } else if (o.kind === "miniPortal") {
        drawPortal(sx, o.y, o.w, o.h, "rgba(255,200,90,0.65)");
      } else if (o.kind === "speedPortalFast") {
        drawPortal(sx, o.y, o.w, o.h, "rgba(255,120,120,0.65)");
      } else if (o.kind === "speedPortalNormal") {
        drawPortal(sx, o.y, o.w, o.h, "rgba(120,220,255,0.65)");
      }
    }
  }

  function drawTrail() {
    if (!settings.trail) return;
    for (const t of trail) {
      ctx.globalAlpha = Math.max(0, t.life) * 0.5;
      ctx.fillStyle = player.mini ? "rgba(255,220,120,0.8)" : "rgba(124,255,255,0.8)";
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.size * t.life, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawParticles() {
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = "rgba(124,255,255,0.9)";
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  function drawPlayer() {
    ctx.save();
    const cx = player.x + player.w / 2;
    const cy = player.y + player.h / 2;
    ctx.translate(cx, cy);
    ctx.rotate(player.rotation);
    ctx.translate(-cx, -cy);

    if (player.mode === "cube") {
      ctx.fillStyle = player.mini ? "rgba(255,220,120,0.96)" : "rgba(124,255,255,0.96)";
      roundRect(player.x, player.y, player.w, player.h, player.mini ? 8 : 10);
      ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(player.x + player.w * 0.23, player.y + player.h * 0.30, 5, 5);
      ctx.fillRect(player.x + player.w * 0.58, player.y + player.h * 0.30, 5, 5);
    } else {
      ctx.fillStyle = player.mini ? "rgba(255,220,120,0.95)" : "rgba(140,255,180,0.95)";
      ctx.beginPath();
      ctx.moveTo(player.x, player.y + player.h / 2);
      ctx.lineTo(player.x + player.w * 0.78, player.y);
      ctx.lineTo(player.x + player.w, player.y + player.h / 2);
      ctx.lineTo(player.x + player.w * 0.78, player.y + player.h);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();

    if (player.doubleJumpAvailable && player.mode === "cube") {
      ctx.beginPath();
      ctx.arc(player.x + player.w / 2, player.y - 12, 6, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(130,255,130,0.92)";
      ctx.fill();
    }
  }

  function drawProgressBar() {
    const x = 20;
    const y = 20;
    const w = W - 40;
    const h = 10;
    const pct = clamp(state.scrollX / state.levelPixelLength, 0, 1);

    ctx.fillStyle = "rgba(255,255,255,0.15)";
    roundRect(x, y, w, h, 5);
    ctx.fill();

    ctx.fillStyle = "rgba(124,255,255,0.9)";
    roundRect(x, y, w * pct, h, 5);
    ctx.fill();
  }

  function draw() {
    ctx.save();

    if (settings.screenShake && state.shake > 0) {
      const sx = (Math.random() - 0.5) * state.shake;
      const sy = (Math.random() - 0.5) * state.shake;
      ctx.translate(sx, sy);
    }

    drawBackground();
    drawProps();
    drawTrail();
    drawParticles();
    drawPlayer();
    drawProgressBar();

    const vignette = ctx.createRadialGradient(W / 2, H / 2, 120, W / 2, H / 2, 560);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,0,0.34)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);

    ctx.restore();
  }

  function loop(t) {
    const dt = Math.min(0.033, (t - last) / 1000);
    last = t;
    if (state.running || particles.length > 0 || state.ending) update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  document.addEventListener("keydown", (e) => {
    if (e.code === "Space" || e.code === "ArrowUp") {
      e.preventDefault();
      pressJump();
    }
    if (e.code === "KeyR") restartGame();
    if (e.code === "KeyP" && state.running) state.paused = !state.paused;
  }, { passive: false });

  document.addEventListener("keyup", (e) => {
    if (e.code === "Space" || e.code === "ArrowUp") releaseJump();
  });

  canvas.addEventListener("pointerdown", pressJump);
  canvas.addEventListener("pointerup", releaseJump);

  btn.addEventListener("click", () => {
    if (state.gameOver || state.win) restartGame();
    else startGame();
  });

  nextBtn.addEventListener("click", goToNextLevel);
  menuOverlayBtn.addEventListener("click", goToMainMenu);

  menuBtn.addEventListener("click", goToMainMenu);

  levelBtn.addEventListener("click", () => {
    state.running = false;
    state.paused = false;
    showOverlay(
      "Select Level",
      "Each level is harder now and the props are placed to support the route.",
      "Start",
      { panel: "levels", small: "The upside-down routes and portals are now much more forgiving." }
    );
  });

  settingsBtn.addEventListener("click", () => {
    state.running = false;
    state.paused = false;
    showOverlay(
      "Settings",
      "Adjust presentation features.",
      "Start",
      { panel: "settings", small: "Gameplay forgiveness can also be changed here." }
    );
  });

  editorBtn.addEventListener("click", () => {
    state.running = false;
    state.paused = false;
    showOverlay(
      "Level Editor",
      "Edit JSON and load a custom level.",
      "Start",
      { panel: "editor", small: "Save your custom level and play it immediately." }
    );
  });

  practiceBtn.addEventListener("click", () => {
    state.practice = !state.practice;
    practiceBtn.textContent = `Practice: ${state.practice ? "On" : "Off"}`;
  });

  fsBtn.addEventListener("click", async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch {}
  });

  resetLevel();
  goToMainMenu();
  requestAnimationFrame(loop);
})();
