// --- CUBE MODE VARIABLES ---
let cubeMaskPixels = [];
let quadtreeRects = [];
let minRectSize = 4;     
let maxRectSize = 100;    
let densityBoost = 0.85; 
let cubePg; // Graphics buffer re-use

let bgColor = '#FFFFFF';       
let lineColor = '#0077FF';     
let fillColor = '#00AAFF';     
let accentColor = '#00DDFF';   
let strokeC, fillC, accentC;

function setupCube() {
  strokeC = color(lineColor);
  fillC = color(fillColor);
  accentC = color(accentColor);
  
  // Re-use graphics buffer if it exists
  if (!cubePg) {
    cubePg = createGraphics(width, height);
    cubePg.pixelDensity(1); 
  }
  
  processCubeMask();
  generateQuadtreePattern();
}

function windowResizedCube() {
  if (cubePg) cubePg.resizeCanvas(width, height);
  processCubeMask();
  generateQuadtreePattern();
}

function processCubeMask() {
  // SAFEGUARD: image size check
  let imgW = max(logoImg.width, 1);
  let imgH = max(logoImg.height, 1);

  // Moderate scale to balance size and detail
  let baseScale = min(width / imgW, height / imgH) * 0.55;
  let minScale = 280 / imgW; 
  let scaleFactor = max(baseScale, minScale);

  let hrW = floor(imgW * scaleFactor);
  let hrH = floor(imgH * scaleFactor);
  let hrX = floor((width - hrW) / 2);
  let hrY = floor((height - hrH) / 2);

  let totalPixels = width * height;
  cubeMaskPixels = new Uint8Array(totalPixels);
  
  if (isWholePageMode) {
    // WHOLE PAGE boundary logic: Treat entire page as valid mask
    for (let i = 0; i < totalPixels; i++) {
        cubeMaskPixels[i] = 1;
    }
  } else {
    // MASKED logic (existing)
    cubePg.clear();
    cubePg.background(0); 
    cubePg.image(logoImg, hrX, hrY, hrW, hrH);
    cubePg.loadPixels();

    for (let i = 0; i < totalPixels; i++) {
        cubeMaskPixels[i] = cubePg.pixels[i * 4] > 128 ? 1 : 0;
    }
  }
}

function generateQuadtreePattern() {
  quadtreeRects = [];
  // Increase depth variability slightly for whole page immersive grid
  let targetMaxRectSize = isWholePageMode ? 80 : maxRectSize;
  
  for (let y = 0; y < height; y += targetMaxRectSize) {
    for (let x = 0; x < width; x += targetMaxRectSize) {
      let currentW = min(targetMaxRectSize, width - x);
      let currentH = min(targetMaxRectSize, height - y);
      subdivide(x, y, currentW, currentH);
    }
  }
}

function subdivide(x, y, w, h) {
  if (w <= 0 || h <= 0) return;

  let averageCoverage = checkAreaCoverage(x, y, w, h);
  let complexity = checkAreaComplexity(x, y, w, h);

  // Boundary constraint: Coverage check skipped always true for whole page mode
  if (averageCoverage < 0.05) return;

  // Decide whether to create rectangle or recurse deeper.
  // Whole page mode pushes subdivision further to fill screen by assuming coverage logic met.
  if ((averageCoverage > 0.95 && complexity < 0.1) || w <= minRectSize || h <= minRectSize) {
    quadtreeRects.push({ 
      x: x, y: y, w: w, h: h, 
      avgCov: averageCoverage,
      baseDotSize: random(2.5, 5),
      phase: random(TWO_PI),
      solidAlpha: random(28, 72),
      strokeAlpha: random(45, 105),
      dotAlpha: random(90, 150)
    });
    return;
  }

  let halfW = floor(w / 2);
  let halfH = floor(h / 2);
  
  subdivide(x, y, halfW, halfH);                 
  subdivide(x + halfW, y, halfW, halfH);         
  subdivide(x, y + halfH, halfW, halfH);         
  subdivide(x + halfW, y + halfH, halfW, halfH); 
}

function checkAreaCoverage(x, y, w, h) {
  if (w < 1 || h < 1) return 0;
  let count = 0;
  let sampleStep = (w > 16 || h > 16) ? 2 : 1; 

  let sampleCount = 0;
  for (let dy = 0; dy < h; dy += sampleStep) {
    for (let dx = 0; dx < w; dx += sampleStep) {
      let pxIdx = (floor(x + dx) + floor(y + dy) * width);
      // Conditionally handle mask pixel constraint check (pixels array always 1 in wholePageMode)
      if (cubeMaskPixels[pxIdx] === 1) count++;
      sampleCount++;
    }
  }
  return count / sampleCount;
}

function checkAreaComplexity(x, y, w, h) {
  if (w < 4 || h < 4) return 0;
  let count = 0;
  let totalChecks = 0;
  let sampleStep = 2; 

  for (let dy = 0; dy < h - sampleStep; dy += sampleStep) {
    for (let dx = 0; dx < w - sampleStep; dx += sampleStep) {
      let currIdx = (floor(x + dx) + floor(y + dy) * width);
      let nextIdx = (floor(x + dx + 1) + floor(y + dy) * width);
      if (cubeMaskPixels[currIdx] !== cubeMaskPixels[nextIdx]) count++;
      totalChecks++;
    }
  }
  return count / totalChecks;
}

function drawCube() {
  background(bgColor);
  if (quadtreeRects.length === 0) return;

  let t = frameCount * 0.045; 
  let breath = 0.5 + 0.5 * sin(frameCount * 0.06);

  ellipseMode(CENTER);

  for (let qBox of quadtreeRects) {
    let r = qBox.x, c = qBox.y, w = qBox.w, h = qBox.h;
    let n = noise(r * 0.005, c * 0.005, t);
    let stateN = noise(r * 0.02, c * 0.02, t * 2.0); 
    let mappedState = map(stateN, 0.2, 0.8, 0, 1);

    // Boundary logic: condition check removed so rectangles can render solid across entire grid in wholePageMode
    let isSolid = mappedState < densityBoost && (isWholePageMode || qBox.avgCov > 0.8);
    let hasDot = !isSolid && w > 12 && mappedState > 0.7; 
    
    push();
    translate(r + w / 2, c + h / 2);
    
    let localBreath = 0.65 * breath + 0.35 * n;
    let scaleOffset = map(localBreath, 0, 1, 0.82, 1.12); 
    scale(scaleOffset);

    rectMode(CENTER); 
    
    if (isSolid) {
      let alphaMod = qBox.solidAlpha;
      fill(red(fillC), green(fillC), blue(fillC), alphaMod);
      stroke(red(strokeC), green(strokeC), blue(strokeC), min(140, alphaMod + 35));
      strokeWeight(1);
      drawingRect(0, 0, w, h, 2);
    } else {
      noFill();
      let weight = map(qBox.w, minRectSize, maxRectSize, 0.5, 2.5);
      weight = weight < 0.5 ? 0.5 : weight;
      strokeWeight(weight);
      
      let strokeAlpha = qBox.strokeAlpha;
      stroke(red(strokeC), green(strokeC), blue(strokeC), strokeAlpha);
      drawingRect(0, 0, w, h, 0);

      if (hasDot) {
        let pulse = sin((frameCount * 0.15) + qBox.phase);
        let currentSize = qBox.baseDotSize + (pulse * 2.0);
        let dotAlpha = qBox.dotAlpha;
        
        fill(red(accentC), green(accentC), blue(accentC), dotAlpha);
        noStroke();
        ellipse(-w / 2, -h / 2, max(1, currentSize));
      }
    }
    pop();
  }
}

function drawingRect(x, y, w, h, radius) {
  if (radius > 0) rect(x, y, w, h, radius);
  else rect(x, y, w, h);
}