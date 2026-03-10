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
  const btn = document.getElementById("btn");
  const levelList = document.getElementById("levelList");

  const menuBtn = document.getElementById("menuBtn");
  const levelBtn = document.getElementById("levelBtn");
  const practiceBtn = document.getElementById("practiceBtn");
  const fsBtn = document.getElementById("fsBtn");

  const W = canvas.width;
  const H = canvas.height;
  const GROUND_Y = H * 0.80;
  const START_X = 180;
  const CEIL_Y = 0;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  let last = performance.now();
  let selectedLevelIndex = 0;
  let objects = [];
  let particles = [];
  let checkpoint = null;

  const saveKey = "miniDashDeluxeBest2";
  const coinKey = "miniDashDeluxeCoins2";
  const levelBestKey = "miniDashDeluxeLevelBests";

  let best = Number(localStorage.getItem(saveKey) || 0);
  let totalCoins = Number(localStorage.getItem(coinKey) || 0);
  let levelBests = JSON.parse(localStorage.getItem(levelBestKey) || "{}");

  bestEl.textContent = best;
  coinsEl.textContent = totalCoins;

  const state = {
    running: false,
    paused: false,
    gameOver: false,
    win: false,
    practice: false,
    scrollX: 0,
    beatWidth: 115,
    levelPixelLength: 0,
    flash: 0,
    coinsThisRun: 0
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

  const CUBE_GRAVITY = 2550;
  const JUMP_V =1100;
  const MAX_FALL = 1600;
  const COYOTE = 0.09;
  const JUMP_BUFFER = 0.12;

  const SHIP_THRUST = 1650;
  const SHIP_GRAVITY = 1050;
  const SHIP_MAX = 650;

  function yPreset(name) {
    if (name === "high") return H * 0.30;
    if (name === "mid") return H * 0.52;
    if (name === "low") return H * 0.67;

    // reachable upside-down positions
    if (name === "invLow") return 86;      // close to ceiling
    if (name === "invMid") return 125;
    if (name === "invHigh") return 165;

    return H * 0.68;
  }

  const LEVELS = [
    {
      name: "Starter Path",
      bpm: 124,
      speed: 300,
      background: ["#102034", "#070c16"],
      lengthBeats: 96,
      difficulty: "Easy",
      description: "Intro level with clean jumps, one gravity section and a simple ship part.",
      sequence: [
        { beat: 5, type: "spike" },
        { beat: 8, type: "spike" },
        { beat: 11, type: "coin", y: "mid" },
        { beat: 12, type: "doubleSpike" },
        { beat: 16, type: "orb", y: "mid" },
        { beat: 18, type: "spike" },
        { beat: 22, type: "block", h: 54 },
        { beat: 24, type: "checkpoint" },
        { beat: 28, type: "doubleSpike" },
        { beat: 32, type: "orb", y: "high" },

        // fixed inverted section
        { beat: 36, type: "gravityPortal", y: "mid" },
        { beat: 39, type: "spikeCeil" },
        { beat: 41, type: "orb", y: "invMid" },
        { beat: 44, type: "spikeCeil" },
        { beat: 48, type: "gravityPortal", y: "mid" },

        { beat: 52, type: "shipPortal" },
        { beat: 56, type: "shipGateTop" },
        { beat: 60, type: "shipGateBottom" },
        { beat: 64, type: "coin", y: "high" },
        { beat: 68, type: "shipGateTop" },
        { beat: 72, type: "shipGateBottom" },
        { beat: 76, type: "cubePortal" },
        { beat: 80, type: "doubleJumpPickup" },
        { beat: 84, type: "doubleSpike" },
        { beat: 88, type: "orb", y: "mid" },
        { beat: 92, type: "tripleSpike" }
      ]
    },
    {
      name: "Circuit Flow",
      bpm: 132,
      speed: 325,
      background: ["#1a1633", "#0b0817"],
      lengthBeats: 112,
      difficulty: "Medium",
      description: "More precise timing, speed changes and a longer but readable ship section.",
      sequence: [
        { beat: 5, type: "spike" },
        { beat: 7, type: "doubleSpike" },
        { beat: 12, type: "orb", y: "mid" },
        { beat: 16, type: "block", h: 62 },
        { beat: 18, type: "coin", y: "high" },
        { beat: 20, type: "doubleSpike" },
        { beat: 24, type: "checkpoint" },

        { beat: 27, type: "gravityPortal", y: "mid" },
        { beat: 30, type: "spikeCeil" },
        { beat: 33, type: "orb", y: "invMid" },
        { beat: 36, type: "spikeCeil" },
        { beat: 40, type: "gravityPortal", y: "mid" },

        { beat: 44, type: "speedPortalFast" },
        { beat: 48, type: "shipPortal" },
        { beat: 52, type: "shipGateTop" },
        { beat: 56, type: "shipGateBottom" },
        { beat: 60, type: "shipGateTop" },
        { beat: 64, type: "shipGateBottom" },
        { beat: 68, type: "coin", y: "mid" },
        { beat: 72, type: "shipGateTop" },
        { beat: 76, type: "shipGateBottom" },
        { beat: 80, type: "cubePortal" },
        { beat: 84, type: "speedPortalNormal" },
        { beat: 86, type: "doubleJumpPickup" },
        { beat: 90, type: "tripleSpike" },
        { beat: 95, type: "orb", y: "high" },
        { beat: 100, type: "doubleSpike" },
        { beat: 104, type: "checkpoint" },
        { beat: 108, type: "tripleSpike" }
      ]
    },
    {
      name: "Neon Drop",
      bpm: 140,
      speed: 348,
      background: ["#1e0f1f", "#09060e"],
      lengthBeats: 126,
      difficulty: "Hard",
      description: "Faster flow, mini mode and cleaner upside-down routes.",
      sequence: [
        { beat: 5, type: "spike" },
        { beat: 8, type: "doubleSpike" },
        { beat: 12, type: "orb", y: "mid" },
        { beat: 16, type: "block", h: 68 },
        { beat: 20, type: "tripleSpike" },
        { beat: 24, type: "checkpoint" },

        { beat: 28, type: "gravityPortal", y: "mid" },
        { beat: 31, type: "spikeCeil" },
        { beat: 34, type: "orb", y: "invMid" },
        { beat: 38, type: "spikeCeil" },
        { beat: 42, type: "gravityPortal", y: "mid" },

        { beat: 46, type: "coin", y: "high" },
        { beat: 48, type: "miniPortal" },
        { beat: 52, type: "doubleSpike" },
        { beat: 56, type: "orb", y: "mid" },
        { beat: 60, type: "shipPortal" },
        { beat: 64, type: "shipGateTop" },
        { beat: 67, type: "shipGateBottom" },
        { beat: 70, type: "shipGateTop" },
        { beat: 73, type: "shipGateBottom" },
        { beat: 76, type: "coin", y: "mid" },
        { beat: 79, type: "shipGateTop" },
        { beat: 82, type: "shipGateBottom" },
        { beat: 86, type: "cubePortal" },
        { beat: 89, type: "miniPortal" },
        { beat: 92, type: "doubleJumpPickup" },
        { beat: 96, type: "tripleSpike" },
        { beat: 101, type: "orb", y: "high" },
        { beat: 106, type: "gravityPortal", y: "mid" },
        { beat: 109, type: "spikeCeil" },
        { beat: 112, type: "orb", y: "invLow" },
        { beat: 116, type: "gravityPortal", y: "mid" },
        { beat: 120, type: "tripleSpike" }
      ]
    },
    {
      name: "Pulse Reactor",
      bpm: 146,
      speed: 370,
      background: ["#0c2230", "#071018"],
      lengthBeats: 140,
      difficulty: "Hard+",
      description: "Longer level with more speed shifts, practice checkpoints and coin routes.",
      sequence: [
        { beat: 5, type: "spike" },
        { beat: 8, type: "doubleSpike" },
        { beat: 12, type: "orb", y: "mid" },
        { beat: 16, type: "block", h: 58 },
        { beat: 18, type: "coin", y: "high" },
        { beat: 20, type: "tripleSpike" },
        { beat: 24, type: "checkpoint" },
        { beat: 28, type: "speedPortalFast" },
        { beat: 30, type: "gravityPortal", y: "mid" },
        { beat: 33, type: "spikeCeil" },
        { beat: 36, type: "orb", y: "invMid" },
        { beat: 40, type: "spikeCeil" },
        { beat: 44, type: "gravityPortal", y: "mid" },
        { beat: 48, type: "shipPortal" },
        { beat: 52, type: "shipGateTop" },
        { beat: 55, type: "shipGateBottom" },
        { beat: 58, type: "shipGateTop" },
        { beat: 61, type: "shipGateBottom" },
        { beat: 64, type: "coin", y: "mid" },
        { beat: 67, type: "shipGateTop" },
        { beat: 70, type: "shipGateBottom" },
        { beat: 74, type: "shipGateTop" },
        { beat: 78, type: "cubePortal" },
        { beat: 82, type: "miniPortal" },
        { beat: 86, type: "doubleSpike" },
        { beat: 90, type: "orb", y: "mid" },
        { beat: 94, type: "doubleJumpPickup" },
        { beat: 98, type: "tripleSpike" },
        { beat: 102, type: "checkpoint" },
        { beat: 106, type: "speedPortalNormal" },
        { beat: 110, type: "gravityPortal", y: "mid" },
        { beat: 113, type: "spikeCeil" },
        { beat: 116, type: "orb", y: "invLow" },
        { beat: 120, type: "spikeCeil" },
        { beat: 124, type: "gravityPortal", y: "mid" },
        { beat: 128, type: "coin", y: "high" },
        { beat: 132, type: "tripleSpike" },
        { beat: 136, type: "orb", y: "mid" }
      ]
    },
    {
      name: "Sky Fracture",
      bpm: 152,
      speed: 388,
      background: ["#241028", "#0b0710"],
      lengthBeats: 154,
      difficulty: "Very Hard",
      description: "Final level with mini sections, multiple gravity flips and the tightest ship route.",
      sequence: [
        { beat: 5, type: "spike" },
        { beat: 8, type: "doubleSpike" },
        { beat: 12, type: "orb", y: "mid" },
        { beat: 16, type: "block", h: 64 },
        { beat: 20, type: "tripleSpike" },
        { beat: 24, type: "checkpoint" },
        { beat: 28, type: "miniPortal" },
        { beat: 32, type: "doubleSpike" },
        { beat: 36, type: "orb", y: "mid" },
        { beat: 40, type: "gravityPortal", y: "mid" },
        { beat: 43, type: "spikeCeil" },
        { beat: 46, type: "orb", y: "invMid" },
        { beat: 50, type: "spikeCeil" },
        { beat: 54, type: "orb", y: "invLow" },
        { beat: 58, type: "gravityPortal", y: "mid" },
        { beat: 62, type: "coin", y: "high" },
        { beat: 64, type: "speedPortalFast" },
        { beat: 68, type: "shipPortal" },
        { beat: 72, type: "shipGateTop" },
        { beat: 75, type: "shipGateBottom" },
        { beat: 78, type: "shipGateTop" },
        { beat: 81, type: "shipGateBottom" },
        { beat: 84, type: "shipGateTop" },
        { beat: 87, type: "shipGateBottom" },
        { beat: 90, type: "coin", y: "mid" },
        { beat: 93, type: "shipGateTop" },
        { beat: 96, type: "shipGateBottom" },
        { beat: 100, type: "cubePortal" },
        { beat: 104, type: "speedPortalNormal" },
        { beat: 108, type: "doubleJumpPickup" },
        { beat: 112, type: "tripleSpike" },
        { beat: 117, type: "orb", y: "high" },
        { beat: 122, type: "gravityPortal", y: "mid" },
        { beat: 125, type: "spikeCeil" },
        { beat: 128, type: "orb", y: "invLow" },
        { beat: 132, type: "spikeCeil" },
        { beat: 136, type: "gravityPortal", y: "mid" },
        { beat: 140, type: "checkpoint" },
        { beat: 144, type: "coin", y: "mid" },
        { beat: 148, type: "tripleSpike" }
      ]
    }
  ];

  function getLevel() {
    return LEVELS[selectedLevelIndex];
  }

  function getLevelBest() {
    return Number(levelBests[getLevel().name] || 0);
  }

  function setLevelBest(value) {
    levelBests[getLevel().name] = Math.max(getLevelBest(), value);
    localStorage.setItem(levelBestKey, JSON.stringify(levelBests));
  }

  function updateHudCoins() {
    coinsEl.textContent = totalCoins;
  }

  function showOverlay(title, text, buttonLabel = "Start") {
    ovTitle.textContent = title;
    ovText.innerHTML = text;
    btn.textContent = buttonLabel;
    buildLevelList();
    overlay.classList.remove("hidden");
  }

  function hideOverlay() {
    overlay.classList.add("hidden");
  }

  function buildLevelList() {
    levelList.innerHTML = "";
    LEVELS.forEach((lvl, i) => {
      const bestForLevel = Number(levelBests[lvl.name] || 0);
      const el = document.createElement("div");
      el.className = "levelItem" + (i === selectedLevelIndex ? " active" : "");
      el.innerHTML = `
        <div class="name">${lvl.name} • ${lvl.difficulty}</div>
        <div class="meta">${lvl.description}</div>
        <div class="meta">Best: ${bestForLevel}% • Speed: ${lvl.speed}</div>
      `;
      el.addEventListener("click", () => {
        selectedLevelIndex = i;
        levelNameEl.textContent = getLevel().name;
        buildLevelList();
        resetLevel(false);
      });
      levelList.appendChild(el);
    });
  }

  function resetPlayer() {
    player.mini = false;
    player.w = 42;
    player.h = 42;
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

  function makePortalY(item) {
    if (item.y === "top") return 55;
    if (item.y === "bottom") return GROUND_Y - 150;
    return H * 0.5 - 46;
  }

  function buildObjects() {
    const level = getLevel();
    objects = [];

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
      } else if (item.type === "gravityPortal") {
        objects.push({ kind: "gravityPortal", x, y: makePortalY(item), w: 30, h: 92, used: false });
      } else if (item.type === "shipPortal") {
        objects.push({ kind: "shipPortal", x, y: H * 0.5 - 50, w: 30, h: 100, used: false });
      } else if (item.type === "cubePortal") {
        objects.push({ kind: "cubePortal", x, y: H * 0.5 - 50, w: 30, h: 100, used: false });
      } else if (item.type === "doubleJumpPickup") {
        objects.push({ kind: "doubleJumpPickup", x, y: H * 0.58, r: 12, used: false });
      } else if (item.type === "spikeCeil") {
        objects.push({ kind: "spikeCeil", x, y: 0, w: 36, h: 34, used: false });
      } else if (item.type === "shipGateTop") {
        objects.push({ kind: "shipGateTop", x, y: 0, w: 50, h: 72, used: false });
      } else if (item.type === "shipGateBottom") {
        objects.push({ kind: "shipGateBottom", x, y: GROUND_Y, w: 50, h: 72, used: false });
      } else if (item.type === "coin") {
        objects.push({ kind: "coin", x, y: yPreset(item.y), r: 10, used: false });
      } else if (item.type === "checkpoint") {
        objects.push({ kind: "checkpoint", x, y: GROUND_Y - 90, w: 18, h: 90, used: false });
      } else if (item.type === "miniPortal") {
        objects.push({ kind: "miniPortal", x, y: H * 0.5 - 42, w: 28, h: 84, used: false });
      } else if (item.type === "speedPortalFast") {
        objects.push({ kind: "speedPortalFast", x, y: H * 0.5 - 42, w: 28, h: 84, used: false });
      } else if (item.type === "speedPortalNormal") {
        objects.push({ kind: "speedPortalNormal", x, y: H * 0.5 - 42, w: 28, h: 84, used: false });
      }
    }

    state.levelPixelLength = getLevel().lengthBeats * state.beatWidth + W;
  }

  function resetLevel(keepOverlay = true) {
    const level = getLevel();
    state.beatWidth = clamp(6100 / level.bpm, 95, 125);
    state.scrollX = 0;
    state.flash = 0;
    state.running = false;
    state.paused = false;
    state.gameOver = false;
    state.win = false;
    state.coinsThisRun = 0;
    checkpoint = null;
    particles = [];
    levelNameEl.textContent = level.name;
    scoreEl.textContent = "0";
    resetPlayer();
    buildObjects();
    if (!keepOverlay) draw();
  }

  function currentPercent() {
    return clamp(Math.floor((state.scrollX / state.levelPixelLength) * 100), 0, 100);
  }

  function saveCheckpoint() {
    checkpoint = {
      scrollX: state.scrollX,
      y: player.y,
      vy: 0,
      gravity: player.gravity,
      mode: player.mode,
      mini: player.mini,
      coinsThisRun: state.coinsThisRun,
      objectStates: objects.map(o => !!o.used)
    };
  }

  function applyMini(isMini) {
    player.mini = isMini;
    if (isMini) {
      player.w = 30;
      player.h = 30;
    } else {
      player.w = 42;
      player.h = 42;
    }
    player.y = clamp(player.y, 0, GROUND_Y - player.h);
  }

  function loadCheckpoint() {
    if (!checkpoint) return false;

    state.scrollX = checkpoint.scrollX;
    player.y = checkpoint.y;
    player.vy = checkpoint.vy;
    player.gravity = checkpoint.gravity;
    player.mode = checkpoint.mode;
    applyMini(checkpoint.mini);
    player.doubleJumpAvailable = false;
    player.shipThrust = false;
    player.rotation = 0;
    player.x = START_X;
    modeEl.textContent = player.mode;
    state.coinsThisRun = checkpoint.coinsThisRun;

    objects.forEach((o, i) => {
      o.used = checkpoint.objectStates[i];
    });

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

  function spawnDeathParticles() {
    for (let i = 0; i < 20; i++) {
      particles.push({
        x: player.x + player.w / 2,
        y: player.y + player.h / 2,
        vx: (Math.random() - 0.5) * 380,
        vy: (Math.random() - 0.5) * 380,
        life: 0.7 + Math.random() * 0.4,
        size: 3 + Math.random() * 5
      });
    }
  }

  function finishRun(win) {
    const score = currentPercent();
    best = Math.max(best, score);
    localStorage.setItem(saveKey, best);
    bestEl.textContent = best;
    setLevelBest(score);

    if (win) {
      showOverlay(
        "Level Complete",
        `${getLevel().name} • ${score}%<br>Coins this run: ${state.coinsThisRun}<br>Level best: ${getLevelBest()}%`,
        "Play Again"
      );
    } else {
      showOverlay(
        "Game Over",
        `${getLevel().name} • ${score}%<br>Level best: ${getLevelBest()}%`,
        "Retry"
      );
    }
  }

  function endGame(win) {
    if (win) {
      state.running = false;
      state.gameOver = false;
      state.win = true;
      finishRun(true);
      return;
    }

    spawnDeathParticles();

    if (state.practice && checkpoint) {
      loadCheckpoint();
      return;
    }

    state.running = false;
    state.gameOver = true;
    state.win = false;
    finishRun(false);
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

  function findOrbInRange() {
    for (const o of objects) {
      if (o.kind !== "orb" || o.used) continue;
      const sx = o.x - state.scrollX;
      const dx = Math.abs((player.x + player.w / 2) - sx);
      const dy = Math.abs((player.y + player.h / 2) - o.y);
      const rangeX = player.mini ? 36 : 44;
      const rangeY = player.mini ? 34 : 42;
      if (dx < rangeX && dy < rangeY) return o;
    }
    return null;
  }

  function pressJump() {
    if (!state.running) {
      if (state.gameOver || state.win) restartGame();
      else if (!state.paused) startGame();
      return;
    }

    if (state.paused) return;

    if (player.mode === "ship") {
      player.shipThrust = true;
      return;
    }

    const orb = findOrbInRange();
    if (orb) {
      orb.used = true;
      const power = player.mini ? 0.98 : 1.05;
      player.vy = -JUMP_V * power * player.gravity;
      player.onGround = false;
      state.flash = 0.5;
      return;
    }

    if (!player.onGround && player.doubleJumpAvailable) {
      player.doubleJumpAvailable = false;
      player.vy = -JUMP_V * 0.88 * player.gravity;
      return;
    }

    player.jumpBuffer = JUMP_BUFFER;
  }

  function releaseJump() {
    if (player.mode === "ship") player.shipThrust = false;
  }

  function currentGravityScale() {
    return player.mini ? 0.92 : 1;
  }

  function currentJumpPower() {
    return player.mini ? 0.90 : 1;
  }

  function updateCube(dt) {
    player.coyote = Math.max(0, player.coyote - dt);
    player.jumpBuffer = Math.max(0, player.jumpBuffer - dt);

    player.vy += CUBE_GRAVITY * currentGravityScale() * player.gravity * dt;
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
      if (player.y <= CEIL_Y) {
        player.y = CEIL_Y;
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
      player.vy = -JUMP_V * currentJumpPower() * player.gravity;
    }

    player.rotation = lerp(player.rotation, clamp(player.vy / 900, -1, 1) * 0.75, 0.2);
  }

  function updateShip(dt) {
    const thrust = player.mini ? SHIP_THRUST * 0.92 : SHIP_THRUST;
    const grav = player.mini ? SHIP_GRAVITY * 0.92 : SHIP_GRAVITY;
    const maxShip = player.mini ? SHIP_MAX * 0.9 : SHIP_MAX;

    if (player.shipThrust) {
      player.vy -= thrust * player.gravity * dt;
    } else {
      player.vy += grav * player.gravity * dt;
    }

    player.vy = clamp(player.vy, -maxShip, maxShip);
    player.y += player.vy * dt;

    if (player.y < 0) {
      player.y = 0;
      player.vy = 0;
    }
    if (player.y + player.h > GROUND_Y) {
      player.y = GROUND_Y - player.h;
      player.vy = 0;
    }

    player.rotation = lerp(player.rotation, clamp(player.vy / 700, -0.65, 0.65), 0.12);
  }

  function updateParticles(dt) {
    for (const p of particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 500 * dt;
    }
    particles = particles.filter(p => p.life > 0);
  }

  function currentLevelSpeed() {
    const level = getLevel();
    let mult = 1;
    for (const o of objects) {
      if ((o.kind === "speedPortalFast" || o.kind === "speedPortalNormal") && o.used) {
        mult = o.kind === "speedPortalFast" ? 1.18 : 1;
      }
    }
    return level.speed * mult;
  }

  function update(dt) {
    if (state.paused) {
      updateParticles(dt);
      return;
    }

    state.scrollX += currentLevelSpeed() * dt;
    state.flash = Math.max(0, state.flash - dt * 3);

    const beatNow = state.scrollX / state.beatWidth;
    if (Math.abs(beatNow - Math.round(beatNow)) < 0.035) {
      state.flash = 0.45;
    }

    if (player.mode === "cube") updateCube(dt);
    else updateShip(dt);

    const px = player.x;
    const py = player.y;
    const pw = player.w;
    const ph = player.h;

    for (const o of objects) {
      const sx = o.x - state.scrollX;

      if (o.kind === "block") {
        if (rectsOverlap(px + 4, py + 4, pw - 8, ph - 8, sx, o.y, o.w, o.h)) {
          endGame(false);
          return;
        }
      }

      if (o.kind === "spike") {
        if (hitSpike(px, py, pw, ph, sx, o.y, o.w, o.h, false)) {
          endGame(false);
          return;
        }
      }

      if (o.kind === "spikeCeil") {
        if (hitSpike(px, py, pw, ph, sx, o.y, o.w, o.h, true)) {
          endGame(false);
          return;
        }
      }

      if (o.kind === "shipGateTop") {
        if (hitSpike(px, py, pw, ph, sx, o.y, o.w, o.h, true)) {
          endGame(false);
          return;
        }
      }

      if (o.kind === "shipGateBottom") {
        if (hitSpike(px, py, pw, ph, sx, o.y, o.w, o.h, false)) {
          endGame(false);
          return;
        }
      }

      if (
        (
          o.kind === "gravityPortal" ||
          o.kind === "shipPortal" ||
          o.kind === "cubePortal" ||
          o.kind === "miniPortal" ||
          o.kind === "speedPortalFast" ||
          o.kind === "speedPortalNormal"
        ) && !o.used
      ) {
        if (rectsOverlap(px, py, pw, ph, sx, o.y, o.w, o.h)) {
          o.used = true;
          state.flash = 0.8;

          if (o.kind === "gravityPortal") {
            player.gravity *= -1;
            player.vy *= 0.35;

            // important fix: snap safely to reachable lane after flip
            if (player.gravity === -1) {
              player.y = Math.min(player.y, 135);
            } else {
              player.y = Math.max(player.y, GROUND_Y - player.h - 135);
            }
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
          }
        }
      }

      if (o.kind === "doubleJumpPickup" && !o.used) {
        const d = o.r * 2;
        if (rectsOverlap(px, py, pw, ph, sx - o.r, o.y - o.r, d, d)) {
          o.used = true;
          player.doubleJumpAvailable = true;
        }
      }

      if (o.kind === "coin" && !o.used) {
        const d = o.r * 2;
        if (rectsOverlap(px, py, pw, ph, sx - o.r, o.y - o.r, d, d)) {
          o.used = true;
          totalCoins += 1;
          state.coinsThisRun += 1;
          localStorage.setItem(coinKey, totalCoins);
          updateHudCoins();
          state.flash = 0.7;
        }
      }

      if (o.kind === "checkpoint" && !o.used) {
        if (rectsOverlap(px, py, pw, ph, sx, o.y, o.w, o.h)) {
          o.used = true;
          saveCheckpoint();
        }
      }
    }

    if (state.scrollX >= state.levelPixelLength) {
      endGame(true);
      return;
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
    const level = getLevel();
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, level.background[0]);
    g.addColorStop(1, level.background[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // moving glow dots
    for (let i = 0; i < 22; i++) {
      const x = ((i * 170 - state.scrollX * 0.25) % (W + 180)) - 90;
      const y = 50 + ((i * 77) % 260);
      ctx.globalAlpha = 0.08;
      ctx.beginPath();
      ctx.arc(x, y, 18 + (i % 3) * 6, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (state.flash > 0) {
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

    if (state.paused) {
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.font = "bold 36px system-ui";
      ctx.fillText("PAUSED", W / 2 - 70, H / 2);
    }
  }

  function drawPortal(sx, y, w, h, fill) {
    ctx.fillStyle = fill;
    ctx.fillRect(sx, y, w, h);
    ctx.strokeStyle = "rgba(255,255,255,0.95)";
    ctx.lineWidth = 3;
    ctx.strokeRect(sx, y, w, h);
  }

  function drawObjects() {
    for (const o of objects) {
      const sx = o.x - state.scrollX;
      if (sx < -120 || sx > W + 120) continue;

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
        ctx.beginPath();
        ctx.arc(sx, o.y, o.r * 0.45, 0, Math.PI * 2);
        ctx.fillStyle = o.used ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.95)";
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
      } else if (o.kind === "doubleJumpPickup") {
        ctx.beginPath();
        ctx.arc(sx, o.y, o.r, 0, Math.PI * 2);
        ctx.fillStyle = o.used ? "rgba(255,255,255,0.15)" : "rgba(130,255,130,0.95)";
        ctx.fill();
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fillRect(sx - 6, o.y - 2, 5, 10);
        ctx.fillRect(sx + 1, o.y - 8, 5, 16);
      } else if (o.kind === "coin") {
        ctx.beginPath();
        ctx.arc(sx, o.y, o.r, 0, Math.PI * 2);
        ctx.fillStyle = o.used ? "rgba(255,255,255,0.12)" : "rgba(255,200,40,0.95)";
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.85)";
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (o.kind === "checkpoint") {
        ctx.fillStyle = o.used ? "rgba(120,255,140,0.95)" : "rgba(120,200,255,0.85)";
        ctx.fillRect(sx, o.y, o.w, o.h);
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.beginPath();
        ctx.moveTo(sx + o.w, o.y + 8);
        ctx.lineTo(sx + o.w + 20, o.y + 18);
        ctx.lineTo(sx + o.w, o.y + 28);
        ctx.closePath();
        ctx.fill();
      }
    }
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

      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.fillRect(player.x + 6, player.y + player.h / 2 - 3, 10, 6);
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
    drawBackground();
    drawObjects();
    drawParticles();
    drawPlayer();
    drawProgressBar();

    const vignette = ctx.createRadialGradient(W / 2, H / 2, 120, W / 2, H / 2, 560);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,0,0.34)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);
  }

  function loop(t) {
    const dt = Math.min(0.033, (t - last) / 1000);
    last = t;

    if (state.running || particles.length > 0) update(dt);
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

  menuBtn.addEventListener("click", () => {
    state.running = false;
    state.paused = false;
    showOverlay(
      "Mini Dash Deluxe+",
      `Pick a level and press start.<br>Total coins: ${totalCoins}<br>Global best: ${best}%`,
      "Start"
    );
  });

  levelBtn.addEventListener("click", () => {
    state.running = false;
    state.paused = false;
    showOverlay("Select Level", "Each level gets harder. Practice mode is recommended for the last two.", "Start");
  });

  practiceBtn.addEventListener("click", () => {
    state.practice = !state.practice;
    practiceBtn.textContent = `Practice: ${state.practice ? "On" : "Off"}`;
  });

  fsBtn.addEventListener("click", async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error(err);
    }
  });

  resetLevel();
  showOverlay(
    "Mini Dash Deluxe+",
    `Pick a level and press start.<br>Total coins: ${totalCoins}<br>Global best: ${best}%`,
    "Start"
  );
  requestAnimationFrame(loop);
})();

