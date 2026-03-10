(() => {
  const canvas = document.getElementById("c");
  const ctx = canvas.getContext("2d");

  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const modeEl = document.getElementById("mode");
  const levelNameEl = document.getElementById("levelName");

  const overlay = document.getElementById("overlay");
  const ovTitle = document.getElementById("ovTitle");
  const ovText = document.getElementById("ovText");
  const btn = document.getElementById("btn");
  const levelList = document.getElementById("levelList");
  const levelBtn = document.getElementById("levelBtn");
  const fsBtn = document.getElementById("fsBtn");

  const W = canvas.width;
  const H = canvas.height;
  const START_X = 180;
  const GROUND_Y = H * 0.8;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  let best = Number(localStorage.getItem("miniDashPlusBest") || 0);
  bestEl.textContent = best;

  const LEVELS = [
    {
      name: "Stereo Run",
      bpm: 128,
      speed: 320,
      background: ["#0d1320", "#070a10"],
      lengthBeats: 120,
      sequence: [
        { beat: 4, type: "spike" },
        { beat: 6, type: "spike" },
        { beat: 8, type: "spike" },
        { beat: 10, type: "orb", y: "mid" },
        { beat: 12, type: "spike" },
        { beat: 14, type: "doubleSpike" },
        { beat: 18, type: "block", h: 70 },
        { beat: 22, type: "orb", y: "high" },
        { beat: 24, type: "doubleSpike" },
        { beat: 28, type: "gravityPortal" },
        { beat: 30, type: "spikeCeil" },
        { beat: 32, type: "spikeCeil" },
        { beat: 36, type: "spikeCeil" },
        { beat: 40, type: "gravityPortal" },
        { beat: 44, type: "shipPortal" },
        { beat: 48, type: "shipSpikeTop" },
        { beat: 50, type: "shipSpikeBottom" },
        { beat: 52, type: "shipSpikeTop" },
        { beat: 54, type: "shipSpikeBottom" },
        { beat: 58, type: "shipSpikeTop" },
        { beat: 60, type: "shipSpikeBottom" },
        { beat: 64, type: "cubePortal" },
        { beat: 68, type: "doubleSpike" },
        { beat: 70, type: "orb", y: "mid" },
        { beat: 72, type: "spike" },
        { beat: 76, type: "doubleJumpPickup" },
        { beat: 80, type: "tripleSpike" },
        { beat: 84, type: "orb", y: "high" },
        { beat: 88, type: "gravityPortal" },
        { beat: 92, type: "spikeCeil" },
        { beat: 96, type: "gravityPortal" },
        { beat: 100, type: "tripleSpike" },
        { beat: 104, type: "orb", y: "mid" },
        { beat: 108, type: "doubleSpike" }
      ]
    },
    {
      name: "Pulse Flight",
      bpm: 142,
      speed: 360,
      background: ["#1a1028", "#0a0814"],
      lengthBeats: 118,
      sequence: [
        { beat: 4, type: "spike" },
        { beat: 5, type: "spike" },
        { beat: 8, type: "doubleSpike" },
        { beat: 12, type: "orb", y: "mid" },
        { beat: 16, type: "block", h: 90 },
        { beat: 20, type: "doubleJumpPickup" },
        { beat: 24, type: "tripleSpike" },
        { beat: 28, type: "shipPortal" },
        { beat: 32, type: "shipSpikeTop" },
        { beat: 34, type: "shipSpikeBottom" },
        { beat: 36, type: "shipSpikeTop" },
        { beat: 38, type: "shipSpikeBottom" },
        { beat: 40, type: "shipSpikeTop" },
        { beat: 44, type: "gravityPortal" },
        { beat: 48, type: "shipSpikeBottom" },
        { beat: 50, type: "shipSpikeTop" },
        { beat: 54, type: "gravityPortal" },
        { beat: 58, type: "cubePortal" },
        { beat: 62, type: "spike" },
        { beat: 64, type: "doubleSpike" },
        { beat: 66, type: "orb", y: "high" },
        { beat: 70, type: "spike" },
        { beat: 74, type: "gravityPortal" },
        { beat: 76, type: "spikeCeil" },
        { beat: 80, type: "spikeCeil" },
        { beat: 84, type: "gravityPortal" },
        { beat: 88, type: "doubleSpike" },
        { beat: 92, type: "tripleSpike" },
        { beat: 96, type: "orb", y: "mid" },
        { beat: 102, type: "shipPortal" },
        { beat: 104, type: "shipSpikeTop" },
        { beat: 106, type: "shipSpikeBottom" },
        { beat: 108, type: "shipSpikeTop" },
        { beat: 110, type: "cubePortal" },
        { beat: 114, type: "tripleSpike" }
      ]
    }
  ];

  let selectedLevelIndex = 0;
  let objects = [];
  let last = performance.now();

  const state = {
    running: false,
    gameOver: false,
    win: false,
    scrollX: 0,
    beatWidth: 110,
    levelPixelLength: 0,
    flash: 0
  };

  const player = {
    x: START_X,
    y: GROUND_Y - 44,
    w: 44,
    h: 44,
    vy: 0,
    gravity: 1,
    mode: "cube",
    onGround: true,
    coyote: 0,
    jumpBuffer: 0,
    doubleJumpAvailable: false,
    shipThrust: false,
    rotation: 0
  };

  const CUBE_GRAVITY = 2800;
  const JUMP_V = 980;
  const MAX_FALL = 1700;
  const COYOTE = 0.08;
  const JUMP_BUFFER = 0.12;

  const SHIP_THRUST = 1750;
  const SHIP_GRAVITY = 1200;
  const SHIP_MAX = 720;

  function getLevel() {
    return LEVELS[selectedLevelIndex];
  }

  function showOverlay(title, text, buttonLabel = "Start") {
    ovTitle.textContent = title;
    ovText.textContent = text;
    btn.textContent = buttonLabel;
    overlay.classList.remove("hidden");
    buildLevelList();
  }

  function hideOverlay() {
    overlay.classList.add("hidden");
  }

  function buildLevelList() {
    levelList.innerHTML = "";
    LEVELS.forEach((lvl, i) => {
      const el = document.createElement("div");
      el.className = "levelItem" + (i === selectedLevelIndex ? " active" : "");
      el.innerHTML = `
        <div class="name">${lvl.name}</div>
        <div class="meta">${lvl.bpm} BPM • ${lvl.lengthBeats} beats</div>
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

  function yPreset(name) {
    if (name === "high") return H * 0.3;
    if (name === "mid") return H * 0.52;
    return H * 0.68;
  }

  function resetPlayer() {
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

  function buildObjects() {
    const level = getLevel();
    objects = [];

    for (const item of level.sequence) {
      const x = item.beat * state.beatWidth + W * 0.9;

      if (item.type === "spike") {
        objects.push({ kind: "spike", x, y: GROUND_Y, w: 38, h: 38, used: false });
      } else if (item.type === "doubleSpike") {
        objects.push({ kind: "spike", x, y: GROUND_Y, w: 38, h: 38, used: false });
        objects.push({ kind: "spike", x: x + 36, y: GROUND_Y, w: 38, h: 38, used: false });
      } else if (item.type === "tripleSpike") {
        for (let i = 0; i < 3; i++) {
          objects.push({ kind: "spike", x: x + i * 34, y: GROUND_Y, w: 36, h: 36, used: false });
        }
      } else if (item.type === "block") {
        objects.push({ kind: "block", x, y: GROUND_Y - item.h, w: 54, h: item.h, used: false });
      } else if (item.type === "orb") {
        objects.push({ kind: "orb", x, y: yPreset(item.y), r: 14, used: false });
      } else if (item.type === "gravityPortal") {
        objects.push({ kind: "gravityPortal", x, y: H * 0.5 - 45, w: 28, h: 90, used: false });
      } else if (item.type === "shipPortal") {
        objects.push({ kind: "shipPortal", x, y: H * 0.5 - 50, w: 28, h: 100, used: false });
      } else if (item.type === "cubePortal") {
        objects.push({ kind: "cubePortal", x, y: H * 0.5 - 50, w: 28, h: 100, used: false });
      } else if (item.type === "doubleJumpPickup") {
        objects.push({ kind: "doubleJumpPickup", x, y: H * 0.58, r: 13, used: false });
      } else if (item.type === "spikeCeil") {
        objects.push({ kind: "spikeCeil", x, y: 0, w: 38, h: 38, used: false });
      } else if (item.type === "shipSpikeTop") {
        objects.push({ kind: "shipSpikeTop", x, y: 0, w: 46, h: 70, used: false });
      } else if (item.type === "shipSpikeBottom") {
        objects.push({ kind: "shipSpikeBottom", x, y: GROUND_Y, w: 46, h: 70, used: false });
      }
    }

    state.levelPixelLength = level.lengthBeats * state.beatWidth + W;
  }

  function resetLevel(keepOverlay = true) {
    const level = getLevel();
    state.beatWidth = clamp(6000 / level.bpm, 90, 125);
    state.scrollX = 0;
    state.flash = 0;
    state.running = false;
    state.gameOver = false;
    state.win = false;
    levelNameEl.textContent = level.name;
    scoreEl.textContent = "0";
    resetPlayer();
    buildObjects();
    if (!keepOverlay) draw();
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

  function currentPercent() {
    return clamp(Math.floor((state.scrollX / state.levelPixelLength) * 100), 0, 100);
  }

  function endGame(win) {
    state.running = false;
    state.gameOver = !win;
    state.win = win;

    const score = currentPercent();
    best = Math.max(best, score);
    localStorage.setItem("miniDashPlusBest", best);
    bestEl.textContent = best;

    if (win) {
      showOverlay("Level Complete", `${getLevel().name} • ${score}%`, "Play Again");
    } else {
      showOverlay("Game Over", `${getLevel().name} • ${score}%`, "Retry");
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
    const boxY = upsideDown ? sy : sy - sh;
    if (!rectsOverlap(px, py, pw, ph, sx, boxY, sw, sh)) return false;

    const tri = upsideDown
      ? [[sx, sy], [sx + sw / 2, sy + sh], [sx + sw, sy]]
      : [[sx, sy], [sx + sw / 2, sy - sh], [sx + sw, sy]];

    const points = [
      [px, py],
      [px + pw, py],
      [px, py + ph],
      [px + pw, py + ph],
      [px + pw / 2, py + ph / 2]
    ];

    for (const [x, y] of points) {
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
      if (dx < 48 && dy < 50) return o;
    }
    return null;
  }

  function pressJump() {
    if (!state.running) {
      if (state.gameOver || state.win) restartGame();
      else startGame();
      return;
    }

    if (player.mode === "ship") {
      player.shipThrust = true;
      return;
    }

    const orb = findOrbInRange();
    if (orb) {
      orb.used = true;
      player.vy = -JUMP_V * 1.05 * player.gravity;
      player.onGround = false;
      return;
    }

    if (!player.onGround && player.doubleJumpAvailable) {
      player.doubleJumpAvailable = false;
      player.vy = -JUMP_V * 0.9 * player.gravity;
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

    player.vy += CUBE_GRAVITY * player.gravity * dt;
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
      player.vy = -JUMP_V * player.gravity;
    }

    player.rotation = lerp(player.rotation, clamp(player.vy / 900, -1, 1) * 0.75, 0.2);
  }

  function updateShip(dt) {
    if (player.shipThrust) {
      player.vy -= SHIP_THRUST * player.gravity * dt;
    } else {
      player.vy += SHIP_GRAVITY * player.gravity * dt;
    }

    player.vy = clamp(player.vy, -SHIP_MAX, SHIP_MAX);
    player.y += player.vy * dt;

    if (player.y < 0) {
      player.y = 0;
      player.vy = 0;
    }
    if (player.y + player.h > GROUND_Y) {
      player.y = GROUND_Y - player.h;
      player.vy = 0;
    }

    player.rotation = lerp(player.rotation, clamp(player.vy / 650, -0.6, 0.6), 0.14);
  }

  function update(dt) {
    const level = getLevel();

    state.scrollX += level.speed * dt;
    state.flash = Math.max(0, state.flash - dt * 3);

    const beatNow = state.scrollX / state.beatWidth;
    if (Math.abs(beatNow - Math.round(beatNow)) < 0.035) {
      state.flash = 0.8;
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
        if (rectsOverlap(px, py, pw, ph, sx, o.y, o.w, o.h)) {
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

      if (o.kind === "shipSpikeTop") {
        if (hitSpike(px, py, pw, ph, sx, o.y, o.w, o.h, true)) {
          endGame(false);
          return;
        }
      }

      if (o.kind === "shipSpikeBottom") {
        if (hitSpike(px, py, pw, ph, sx, o.y, o.w, o.h, false)) {
          endGame(false);
          return;
        }
      }

      if ((o.kind === "gravityPortal" || o.kind === "shipPortal" || o.kind === "cubePortal") && !o.used) {
        if (rectsOverlap(px, py, pw, ph, sx, o.y, o.w, o.h)) {
          o.used = true;

          if (o.kind === "gravityPortal") {
            player.gravity *= -1;
            player.vy *= 0.35;
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
    }

    if (state.scrollX >= state.levelPixelLength) {
      endGame(true);
      return;
    }

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

    if (state.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${state.flash * 0.08})`;
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
      } else if (o.kind === "shipSpikeTop") {
        ctx.fillStyle = "rgba(255,120,120,0.94)";
        drawSpike(sx, o.y, o.w, o.h, true);
      } else if (o.kind === "shipSpikeBottom") {
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
        ctx.fillStyle = "rgba(255,120,210,0.65)";
        ctx.fillRect(sx, o.y, o.w, o.h);
        ctx.strokeStyle = "rgba(255,255,255,0.95)";
        ctx.lineWidth = 3;
        ctx.strokeRect(sx, o.y, o.w, o.h);
      } else if (o.kind === "shipPortal") {
        ctx.fillStyle = "rgba(90,255,180,0.65)";
        ctx.fillRect(sx, o.y, o.w, o.h);
        ctx.strokeStyle = "rgba(255,255,255,0.95)";
        ctx.lineWidth = 3;
        ctx.strokeRect(sx, o.y, o.w, o.h);
      } else if (o.kind === "cubePortal") {
        ctx.fillStyle = "rgba(90,170,255,0.65)";
        ctx.fillRect(sx, o.y, o.w, o.h);
        ctx.strokeStyle = "rgba(255,255,255,0.95)";
        ctx.lineWidth = 3;
        ctx.strokeRect(sx, o.y, o.w, o.h);
      } else if (o.kind === "doubleJumpPickup") {
        ctx.beginPath();
        ctx.arc(sx, o.y, o.r, 0, Math.PI * 2);
        ctx.fillStyle = o.used ? "rgba(255,255,255,0.15)" : "rgba(130,255,130,0.95)";
        ctx.fill();

        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fillRect(sx - 6, o.y - 2, 5, 10);
        ctx.fillRect(sx + 1, o.y - 8, 5, 16);
      }
    }
  }

  function drawPlayer() {
    ctx.save();

    const cx = player.x + player.w / 2;
    const cy = player.y + player.h / 2;
    ctx.translate(cx, cy);
    ctx.rotate(player.rotation);
    ctx.translate(-cx, -cy);

    if (player.mode === "cube") {
      ctx.fillStyle = "rgba(124,255,255,0.96)";
      roundRect(player.x, player.y, player.w, player.h, 12);
      ctx.fill();

      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(player.x + 11, player.y + 14, 6, 6);
      ctx.fillRect(player.x + 27, player.y + 14, 6, 6);
    } else {
      ctx.fillStyle = "rgba(140,255,180,0.95)";
      ctx.beginPath();
      ctx.moveTo(player.x, player.y + player.h / 2);
      ctx.lineTo(player.x + player.w * 0.78, player.y);
      ctx.lineTo(player.x + player.w, player.y + player.h / 2);
      ctx.lineTo(player.x + player.w * 0.78, player.y + player.h);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.fillRect(player.x + 8, player.y + player.h / 2 - 4, 12, 8);
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

    if (state.running) update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  document.addEventListener("keydown", (e) => {
    if (e.code === "Space" || e.code === "ArrowUp") {
      e.preventDefault();
      pressJump();
    }
    if (e.code === "KeyR") {
      restartGame();
    }
  }, { passive: false });

  document.addEventListener("keyup", (e) => {
    if (e.code === "Space" || e.code === "ArrowUp") {
      releaseJump();
    }
  });

  canvas.addEventListener("pointerdown", pressJump);
  canvas.addEventListener("pointerup", releaseJump);

  btn.addEventListener("click", () => {
    if (state.gameOver || state.win) restartGame();
    else startGame();
  });

  levelBtn.addEventListener("click", () => {
    state.running = false;
    showOverlay("Select Level", "Pick a level and press start.", "Start");
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
  showOverlay("Mini Dash+", "Choose a level and start.", "Start");
  requestAnimationFrame(loop);
})();
