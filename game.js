(() => {
  const canvas = document.getElementById("c");
  const ctx = canvas.getContext("2d");

  const scoreEl = document.getElementById("score");
  const bestEl  = document.getElementById("best");
  const spdEl   = document.getElementById("spd");

  const overlay = document.getElementById("overlay");
  const ovTitle = document.getElementById("ovTitle");
  const ovText  = document.getElementById("ovText");
  const btn     = document.getElementById("btn");

  // ---------- helpers ----------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand  = (a, b) => a + Math.random() * (b - a);

  // ---------- game constants ----------
  const W = canvas.width, H = canvas.height;
  const GROUND_Y = H * 0.78;

  // physics feel (tweakable)
  const GRAVITY = 2800;
  const JUMP_V  = 980;
  const MAX_FALL = 1600;

  // Quality-of-life platformer tech
  const COYOTE_TIME = 0.085;     // seconds after leaving ground
  const JUMP_BUFFER = 0.11;      // seconds before landing to queue jump

  // ---------- state ----------
  let running = false;
  let gameOver = false;

  let best = Number(localStorage.getItem("miniDashBest") || 0);
  bestEl.textContent = best;

  const player = {
    x: W * 0.22,
    y: GROUND_Y - 44,
    w: 44,
    h: 44,
    vy: 0,
    onGround: true,
    coyote: 0,
    jumpBuf: 0
  };

  const world = {
    speed: 520,          // px/s at start
    speedMul: 1.0,
    dist: 0,
    score: 0,
    obstacles: [],
    nextSpawn: 0
  };

  // ---------- input ----------
  let jumpHeld = false;
  function pressJump() {
    jumpHeld = true;
    // buffer jump
    player.jumpBuf = JUMP_BUFFER;
    if (!running && !gameOver) start();
    if (gameOver) restart();
  }
  function releaseJump() { jumpHeld = false; }

  window.addEventListener("keydown", (e) => {
    if (e.code === "Space" || e.code === "ArrowUp") { e.preventDefault(); pressJump(); }
    if (e.code === "KeyR") restart();
  }, { passive:false });

  window.addEventListener("keyup", (e) => {
    if (e.code === "Space" || e.code === "ArrowUp") releaseJump();
  });

  canvas.addEventListener("pointerdown", pressJump);
  canvas.addEventListener("pointerup", releaseJump);

  btn.addEventListener("click", () => {
    if (gameOver) restart();
    else start();
  });

  function showOverlay(title, text, buttonLabel) {
    ovTitle.textContent = title;
    ovText.textContent = text;
    btn.textContent = buttonLabel;
    overlay.classList.remove("hidden");
  }
  function hideOverlay() { overlay.classList.add("hidden"); }

  showOverlay("Mini Dash", "Press Space / Click to start", "Start");

  // ---------- obstacles ----------
  // Types: spike (triangle) and block (rectangle)
  function spawnObstacle() {
    const type = Math.random() < 0.78 ? "spike" : "block";
    const baseGap = rand(0.72, 1.10); // seconds of travel between spawns
    const gap = baseGap * clamp(1.18 - (world.speedMul - 1) * 0.22, 0.62, 1.2);

    world.nextSpawn = world.dist + (world.speed * world.speedMul) * gap;

    if (type === "spike") {
      // sometimes double spikes later
      const count = (world.speedMul > 1.45 && Math.random() < 0.35) ? 2 : 1;
      const spacing = 42;
      for (let i = 0; i < count; i++) {
        world.obstacles.push({
          type: "spike",
          x: W + 40 + i * spacing,
          y: GROUND_Y,
          w: 40,
          h: 40
        });
      }
    } else {
      const h = Math.random() < 0.55 ? 56 : 84;
      world.obstacles.push({
        type: "block",
        x: W + 40,
        y: GROUND_Y - h,
        w: 52,
        h
      });
    }
  }

  // ---------- collision ----------
  function aabb(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  function hitTestSpike(px, py, pw, ph, s) {
    // quick AABB reject vs bounding box
    const bx = s.x, by = s.y - s.h, bw = s.w, bh = s.h;
    if (!aabb(px, py, pw, ph, bx, by, bw, bh)) return false;

    // triangle vertices (isosceles)
    const ax = s.x,         ay = s.y;
    const cx = s.x + s.w,   cy = s.y;
    const tx = s.x + s.w/2, ty = s.y - s.h;

    // sample a few points from player's bottom edge (simple + fast)
    const samples = 5;
    for (let i = 0; i <= samples; i++) {
      const x = px + (pw * i) / samples;
      const y = py + ph; // bottom
      if (pointInTriangle(x, y, ax, ay, tx, ty, cx, cy)) return true;
      // also test player's front-right corner
      const y2 = py + ph * 0.65;
      if (pointInTriangle(px + pw, y2, ax, ay, tx, ty, cx, cy)) return true;
    }
    return false;
  }

  function sign(px, py, ax, ay, bx, by) {
    return (px - bx) * (ay - by) - (ax - bx) * (py - by);
  }
  function pointInTriangle(px, py, ax, ay, bx, by, cx, cy) {
    const b1 = sign(px, py, ax, ay, bx, by) < 0;
    const b2 = sign(px, py, bx, by, cx, cy) < 0;
    const b3 = sign(px, py, cx, cy, ax, ay) < 0;
    return (b1 === b2) && (b2 === b3);
  }

  // ---------- loop ----------
  let last = performance.now();

  function start() {
    running = true;
    hideOverlay();
    last = performance.now();
  }

  function restart() {
    running = true;
    gameOver = false;
    hideOverlay();

    // reset
    player.y = GROUND_Y - player.h;
    player.vy = 0;
    player.onGround = true;
    player.coyote = 0;
    player.jumpBuf = 0;

    world.speed = 520;
    world.speedMul = 1.0;
    world.dist = 0;
    world.score = 0;
    world.obstacles.length = 0;
    world.nextSpawn = 0;

    last = performance.now();
  }

  function endGame() {
    running = false;
    gameOver = true;

    best = Math.max(best, Math.floor(world.score));
    localStorage.setItem("miniDashBest", best);
    bestEl.textContent = best;

    showOverlay("Game Over", `Score: ${Math.floor(world.score)} • Press Space/Click to restart`, "Restart");
  }

  function update(dt) {
    // ramp difficulty
    world.speedMul = 1.0 + Math.min(1.15, world.score / 850); // up to ~2.15x
    const spd = world.speed * world.speedMul;

    // spawn logic
    if (world.dist >= world.nextSpawn) spawnObstacle();

    // move obstacles
    for (const o of world.obstacles) o.x -= spd * dt;
    // cleanup
    world.obstacles = world.obstacles.filter(o => o.x > -120);

    // player coyote + buffer timers
    player.coyote = Math.max(0, player.coyote - dt);
    player.jumpBuf = Math.max(0, player.jumpBuf - dt);

    // apply gravity
    player.vy += GRAVITY * dt;
    player.vy = Math.min(player.vy, MAX_FALL);
    player.y += player.vy * dt;

    // ground collision
    if (player.y + player.h >= GROUND_Y) {
      player.y = GROUND_Y - player.h;
      player.vy = 0;
      if (!player.onGround) {
        player.onGround = true;
      }
      player.coyote = COYOTE_TIME;
    } else {
      if (player.onGround) {
        player.onGround = false;
      }
    }

    // jump if buffered and can jump
    const canJump = player.onGround || player.coyote > 0;
    if (player.jumpBuf > 0 && canJump) {
      player.jumpBuf = 0;
      player.onGround = false;
      player.coyote = 0;
      player.vy = -JUMP_V;
    }

    // score by distance
    world.dist += spd * dt;
    world.score += (spd * dt) * 0.02;

    // collisions
    const px = player.x, py = player.y, pw = player.w, ph = player.h;
    for (const o of world.obstacles) {
      if (o.type === "block") {
        if (aabb(px, py, pw, ph, o.x, o.y, o.w, o.h)) { endGame(); break; }
      } else {
        if (hitTestSpike(px, py, pw, ph, o)) { endGame(); break; }
      }
    }

    // UI
    scoreEl.textContent = Math.floor(world.score);
    spdEl.textContent = world.speedMul.toFixed(2);
  }

  function draw() {
    // background
    ctx.clearRect(0, 0, W, H);

    // subtle grid
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 48) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += 48) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // ground
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    ctx.fillRect(0, GROUND_Y, W, 8);

    // parallax dots
    ctx.globalAlpha = 0.18;
    for (let i = 0; i < 80; i++) {
      const x = (i * 140 - (world.dist * 0.2) % (140 * 80));
      const y = 60 + (i * 37) % 240;
      ctx.fillRect(x, y, 3, 3);
    }
    ctx.globalAlpha = 1;

    // obstacles
    for (const o of world.obstacles) {
      if (o.type === "block") {
        ctx.fillStyle = "rgba(255,255,255,0.75)";
        roundRect(ctx, o.x, o.y, o.w, o.h, 10);
        ctx.fill();
      } else {
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.beginPath();
        ctx.moveTo(o.x, o.y);
        ctx.lineTo(o.x + o.w/2, o.y - o.h);
        ctx.lineTo(o.x + o.w, o.y);
        ctx.closePath();
        ctx.fill();
      }
    }

    // player (little "cube")
    ctx.save();
    // tiny rotation vibe based on vertical speed (Geometry Dash-ish)
    const rot = clamp(player.vy / 1400, -0.9, 0.9) * 0.35;
    const cx = player.x + player.w/2;
    const cy = player.y + player.h/2;
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.translate(-cx, -cy);

    ctx.fillStyle = "rgba(124, 255, 255, 0.95)";
    roundRect(ctx, player.x, player.y, player.w, player.h, 12);
    ctx.fill();

    // face
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(player.x + 12, player.y + 14, 6, 6);
    ctx.fillRect(player.x + 26, player.y + 14, 6, 6);
    ctx.restore();

    // vignette
    const g = ctx.createRadialGradient(W/2, H/2, 80, W/2, H/2, 520);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.35)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w/2, h/2);
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.arcTo(x+w, y, x+w, y+h, r);
    ctx.arcTo(x+w, y+h, x, y+h, r);
    ctx.arcTo(x, y+h, x, y, r);
    ctx.arcTo(x, y, x+w, y, r);
    ctx.closePath();
  }

  function loop(t) {
    const dt = Math.min(0.033, (t - last) / 1000);
    last = t;

    if (running && !gameOver) update(dt);
    draw();

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();