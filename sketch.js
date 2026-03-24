let modes = ['cube', 'mesh', 'flow', 'lines', 'shader', 'bio'];
let currentModeIndex = 0;
let currentMode = modes[currentModeIndex]; 
let logoImg;
let needsClear = true; 
let cycleInterval; 
let isWholePageMode = false; 

function preload() {
  logoImg = loadImage('resources/CursorLogoRevised.png');
}

function setup() {
  let safeW = max(windowWidth, 100);
  let safeH = max(windowHeight, 100);
  let canvas = createCanvas(safeW, safeH);
  canvas.position(0, 0);
  canvas.style('z-index', '-1'); 
  
  pixelDensity(2); 
  
  setupCube();
  setupMesh();
  setupFlow(); 
  setupLines(); 
  setupShader();
  setupBio();

  updateUITheme(currentMode);
  
  const initialDropdownText = document.querySelector('#bucket-toggle span').textContent.trim();
  if (initialDropdownText === 'Logo') {
     resumeCycle(); 
  }
}

function draw() {
  if (!logoImg || logoImg.width === 0 || logoImg.height === 0) return;

  // NEW: Handle the blank state
  if (currentMode === 'none') {
    clear(); // Leaves the canvas completely transparent
    return;
  }

  if (currentMode === 'cube') {
    needsClear = false; 
    drawCube();
  } else if (currentMode === 'mesh') {
    needsClear = false; 
    drawMesh();
  } else if (currentMode === 'flow') {
    drawFlow();
  } else if (currentMode === 'lines') { 
    drawLines();
  } else if (currentMode === 'shader') {
    needsClear = true; 
    drawShader();
  } else if (currentMode === 'bio') {
    needsClear = false; 
    drawBio();
  }
}

function windowResized() {
  let safeW = max(windowWidth, 100);
  let safeH = max(windowHeight, 100);
  resizeCanvas(safeW, safeH);
  
  windowResizedCube();
  windowResizedMesh();
  windowResizedFlow(); 
  windowResizedLines(); 
  windowResizedShader();
  windowResizedBio();
}

// --- MODE CONTROLS (Toggled by HTML clicks) ---

window.enableWholePageMode = function() {
  if (!isWholePageMode) {
    isWholePageMode = true;
    clearInterval(cycleInterval); 
    needsClear = true; 
    
    // Re-initialize arrays for all sketches so they know to render full page
    if (typeof setupBio === 'function') setupBio();
    if (typeof setupCube === 'function') setupCube();
    if (typeof setupFlow === 'function') setupFlow();
    if (typeof setupLines === 'function') setupLines();
    if (typeof setupMesh === 'function') setupMesh();
    if (typeof setupShader === 'function') setupShader();
    
    updateUITheme(currentMode);
  }
};

window.disableWholePageMode = function() {
  if (isWholePageMode) {
    isWholePageMode = false;
    needsClear = true; 
    
    // Re-initialize arrays for all sketches so they know to mask to the logo
    if (typeof setupBio === 'function') setupBio();
    if (typeof setupCube === 'function') setupCube();
    if (typeof setupFlow === 'function') setupFlow();
    if (typeof setupLines === 'function') setupLines();
    if (typeof setupMesh === 'function') setupMesh();
    if (typeof setupShader === 'function') setupShader();
    
    updateUITheme(currentMode);
  }
};

// --- LOOP CONTROLS ---
function pauseCycle() {
  clearInterval(cycleInterval);
}

function resumeCycle() {
  clearInterval(cycleInterval); 
  cycleInterval = setInterval(cycleMode, 2000);
}
// -------------------------

function cycleMode() {
  currentModeIndex = (currentModeIndex + 1) % modes.length;
  setMode(modes[currentModeIndex], false); // Auto-cycle is always masked
}

function updateUITheme(modeName) {
  const darkBackgroundModes = ['mesh', 'flow', 'lines'];
  const logoElement = document.querySelector('.main-logo');
  
  if (darkBackgroundModes.includes(modeName)) {
    document.body.classList.add('dark-ui');
    if (logoElement) {
      logoElement.src = 'resources/CursorCreativeLight.png';
    }
  } else {
    document.body.classList.remove('dark-ui');
    if (logoElement) {
      logoElement.src = 'resources/CursorCreativeDark.png';
    }
  }
}

// Rewritten setMode to force the background arrays to update even if you click the mode you're already looking at
function setMode(newMode, preserveWholePage = false) {
  let modeChanged = (currentMode !== newMode);
  
  currentMode = newMode;
  
  // Only update index if it's a valid mode (not our 'none' blank state)
  let newIdx = modes.indexOf(newMode);
  if (newIdx !== -1) {
      currentModeIndex = newIdx; 
  }
  
  // Force the rendering state to match the selection
  if (preserveWholePage) {
      enableWholePageMode();
  } else {
      disableWholePageMode();
  }
  
  if (modeChanged) {
    needsClear = true; 
    updateUITheme(newMode);
  }
}