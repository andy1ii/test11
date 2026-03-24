// --- FLOW MODE VARIABLES ---
let flowMaskPixels = [];
let particles = [];
let flowLogoScale = 1;
let flowZOff = 0;
let flowColors;
let flowPg; // Graphics buffer re-use

function setupFlow() {
  // Boundary: Re-use graphics buffer if it exists
  if (!flowPg) {
    flowPg = createGraphics(width, height);
    flowPg.pixelDensity(1); 
  }

  // Deep blue, bright blue, cyan, and vibrant orange to pop on the dark indigo background
  flowColors = [color('#0033aa'), color('#0077ff'), color('#00ddff'), color('#ff6600')];
  processFlowMask();
  initParticles();
}

function windowResizedFlow() {
  if (flowPg) flowPg.resizeCanvas(width, height);
  processFlowMask();
  initParticles();
  needsClear = true; // Use global needsClear to wipe canvas on resize
}

function processFlowMask() {
  let baseScale = min(width / logoImg.width, height / logoImg.height) * 0.55;
  let minScale = 280 / max(logoImg.width, 1);
  flowLogoScale = max(baseScale, minScale);

  let hrW = floor(logoImg.width * flowLogoScale);
  let hrH = floor(logoImg.height * flowLogoScale);
  let hrX = floor((width - hrW) / 2);
  let hrY = floor((height - hrH) / 2);

  let totalPixels = width * height;
  flowMaskPixels = new Uint8Array(totalPixels);

  if (isWholePageMode) {
    // WHOLE PAGE boundary logic: Treat entire page as valid mask
    for (let i = 0; i < totalPixels; i++) {
        flowMaskPixels[i] = 1;
    }
  } else {
    // MASKED logic (existing)
    flowPg.clear();
    flowPg.background(0);
    flowPg.image(logoImg, hrX, hrY, hrW, hrH);
    flowPg.loadPixels();

    for (let i = 0; i < totalPixels; i++) {
        flowMaskPixels[i] = flowPg.pixels[i * 4] > 128 ? 1 : 0;
    }
  }
}

function initParticles() {
  particles = [];
  // Increase particle count for immersive whole-page flow
  let numParticles = isWholePageMode ? 12000 : 6000; 
  for (let i = 0; i < numParticles; i++) {
    particles.push(spawnParticle(true)); // Pass true to randomize starting life
  }
}

function spawnParticle(randomizeLife = false) {
  let x, y, tries = 0;
  
  // Conditionally only check mask constraint if NOT whole page mode
  if (isWholePageMode) {
    // Random spots across whole page are always valid
    x = random(width);
    y = random(height);
  } else {
    // Try to find a random spot INSIDE the logo mask
    do {
        x = random(width);
        y = random(height);
        tries++;
    } while (flowMaskPixels[floor(x) + floor(y) * width] === 0 && tries < 100);
  }

  let isThick = random(1) > 0.9;
  
  // MASSIVELY INCREASED LIFESPAN for longer flow paths, adding more variability for whole page
  let maxL = isWholePageMode ? random(400, 1200) : random(300, 800); 
  let mSpeed = isThick ? random(1.0, 2.0) : random(2.0, 4.0);

  // PRE-CALCULATE INITIAL VELOCITY: 
  // Particles now spawn already moving at full speed instead of easing in from a standstill.
  let scl = 0.0015 / flowLogoScale; 
  let angle = noise(x * scl, y * scl, flowZOff) * TWO_PI * 2.5;
  let startVel = p5.Vector.fromAngle(angle).mult(mSpeed);

  return {
    pos: createVector(x, y),
    prev: createVector(x, y),
    vel: startVel, // Start at full speed immediately
    c: random(flowColors),
    w: isThick ? random(1.5, 3.0) : random(0.2, 1.0), 
    maxSpeed: mSpeed,
    life: randomizeLife ? random(0, maxL) : maxL, 
    maxLife: maxL
  };
}

function drawFlow() {
  // 1. Instant mode-switch fix: Wipe the canvas to deep indigo when initializing
  if (needsClear) {
    background('#080C22'); // Deep midnight indigo background
    initParticles(); // Respawn all particles so they don't carry over weird velocities
    needsClear = false;
  }

  // Draw a semi-transparent background to create smooth motion blur trails
  push();
  noStroke();
  // RGB values for #080C22 (8, 12, 34) with low opacity (15) for elegant trails
  fill(19, 28, 81, 15); 
  rectMode(CORNER);
  rect(0, 0, width, height);
  pop();

  flowZOff += 0.002; // Slower evolution for calmer, longer paths
  let scl = 0.0015 / flowLogoScale; 

  for (let p of particles) {
    // Smoothed out the angle multiplier for wider, longer arcs
    let angle = noise(p.pos.x * scl, p.pos.y * scl, flowZOff) * TWO_PI * 2.5;
    
    let dir = p5.Vector.fromAngle(angle);
    p.vel.lerp(dir, 0.08); 
    p.vel.limit(p.maxSpeed);

    p.prev.x = p.pos.x;
    p.prev.y = p.pos.y;

    p.pos.add(p.vel);
    p.life--;

    // Check bounds against the screen (safeguard)
    let safeX = constrain(floor(p.pos.x), 0, width - 1);
    let safeY = constrain(floor(p.pos.y), 0, height - 1);
    
    // Boundary constraint: Skip mask check always true for whole page mode
    let isOutsideMask = flowMaskPixels[safeX + safeY * width] === 0;

    // If particle dies or conditionally leaves the mask, respawn it with full life
    if (p.life <= 0 || isOutsideMask) {
      Object.assign(p, spawnParticle(false));
    } else {
      // 🚀 NO FADE LOGIC: Particles remain 100% opaque for their entire lifespan
      stroke(p.c);
      strokeWeight(p.w);
      line(p.prev.x, p.prev.y, p.pos.x, p.pos.y);
    }
  }
}