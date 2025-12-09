// DOM Elements
const logoImage = document.getElementById('logoImage');
const placeholder = document.getElementById('placeholder');
const uploadBtn = document.getElementById('uploadBtn');
const recentBtn = document.getElementById('recentBtn');
const recentDropdown = document.getElementById('recentDropdown');
const noRecentLogos = document.getElementById('noRecentLogos');
const kioskBtn = document.getElementById('kioskBtn');
const clearBtn = document.getElementById('clearBtn');
const kioskIndicator = document.getElementById('kioskIndicator');
const kioskStatus = document.getElementById('kioskStatus');
const controls = document.getElementById('controls');
const statusBar = document.getElementById('statusBar');
const shortcutsHelp = document.getElementById('shortcutsHelp');
const bgBlackBtn = document.getElementById('bgBlackBtn');
const bgWhiteBtn = document.getElementById('bgWhiteBtn');
const container = document.querySelector('.container');

let hasLogo = false;
let isKiosk = false;
let currentBgColor = 'black';

// Initialize
async function init() {
  // Get initial kiosk status
  isKiosk = await window.electronAPI.getKioskStatus();
  updateKioskUI(isKiosk);
  updateControlsVisibility();
}

// Event Listeners for buttons
uploadBtn.addEventListener('click', () => {
  window.electronAPI.openFileDialog();
});

recentBtn.addEventListener('click', async (e) => {
  e.stopPropagation();
  await loadRecentLogos();
  recentDropdown.classList.toggle('visible');
});

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  if (!recentBtn.contains(e.target) && !recentDropdown.contains(e.target)) {
    recentDropdown.classList.remove('visible');
  }
});

kioskBtn.addEventListener('click', () => {
  window.electronAPI.toggleKiosk();
});

clearBtn.addEventListener('click', () => {
  window.electronAPI.clearLogo();
});

bgBlackBtn.addEventListener('click', () => {
  setBackgroundColor('black');
});

bgWhiteBtn.addEventListener('click', () => {
  setBackgroundColor('white');
});

// Fallback keyboard shortcuts for environments where global shortcuts are
// unavailable (e.g., Raspberry Pi builds without a global X server keyboard
// hook). These mirror the main-process shortcuts so users have a consistent
// experience.
document.addEventListener('keydown', (event) => {
  const isCtrlOrCmd = event.ctrlKey || event.metaKey;
  const isShift = event.shiftKey;

  if (event.code === 'F11') {
    event.preventDefault();
    window.electronAPI.toggleKiosk();
    return;
  }

  if (event.code === 'Escape' && isKiosk) {
    event.preventDefault();
    window.electronAPI.exitKiosk();
    return;
  }

  if (isCtrlOrCmd && isShift && (event.code === 'KeyK')) {
    event.preventDefault();
    window.electronAPI.toggleKiosk();
    return;
  }

  if (isCtrlOrCmd && event.code === 'KeyO') {
    event.preventDefault();
    window.electronAPI.openFileDialog();
    return;
  }

  if (isCtrlOrCmd && event.code === 'KeyB') {
    event.preventDefault();
    const nextColor = currentBgColor === 'black' ? 'white' : 'black';
    setBackgroundColor(nextColor);
  }
});

// Listen for logo loaded from main process
window.electronAPI.onLogoLoaded((dataUrl) => {
  logoImage.src = dataUrl;
  logoImage.classList.add('visible');
  placeholder.classList.add('hidden');
  hasLogo = true;
  updateControlsVisibility();
});

// Listen for logo cleared
window.electronAPI.onLogoCleared(() => {
  logoImage.src = '';
  logoImage.classList.remove('visible');
  placeholder.classList.remove('hidden');
  hasLogo = false;
  updateControlsVisibility();
});

// Listen for kiosk status changes
window.electronAPI.onKioskStatus((status) => {
  isKiosk = status;
  updateKioskUI(status);
  updateKioskVisibility(status);
});

// Listen for settings loaded
window.electronAPI.onSettingsLoaded((settings) => {
  if (settings && settings.backgroundColor) {
    applyBackgroundColor(settings.backgroundColor);
  }
});

// Listen for background color changes
window.electronAPI.onBackgroundColorChanged((color) => {
  applyBackgroundColor(color);
});

// Update UI based on kiosk status
function updateKioskUI(isKioskMode) {
  if (isKioskMode) {
    kioskIndicator.classList.add('active');
    kioskStatus.textContent = 'Kiosk Mode';
    kioskBtn.textContent = '🖥️ Exit Kiosk Mode';
  } else {
    kioskIndicator.classList.remove('active');
    kioskStatus.textContent = 'Normal Mode';
    kioskBtn.textContent = '🖥️ Enter Kiosk Mode';
  }
}

// Update controls visibility
function updateControlsVisibility() {
  if (!hasLogo) {
    controls.classList.add('always-visible');
  } else {
    controls.classList.remove('always-visible');
  }
}

// Update kiosk visibility - hide all UI elements immediately in kiosk mode
function updateKioskVisibility(isKioskMode) {
  if (isKioskMode) {
    controls.classList.add('kiosk-hidden');
    statusBar.classList.add('kiosk-hidden');
    shortcutsHelp.classList.add('kiosk-hidden');
  } else {
    controls.classList.remove('kiosk-hidden');
    statusBar.classList.remove('kiosk-hidden');
    shortcutsHelp.classList.remove('kiosk-hidden');
  }
}

// Load recent logos into the dropdown
async function loadRecentLogos() {
  const recentLogos = await window.electronAPI.getRecentLogos();
  
  // Clear existing items (except the empty message)
  const existingItems = recentDropdown.querySelectorAll('.recent-logo-item');
  existingItems.forEach(item => item.remove());
  
  if (recentLogos.length === 0) {
    noRecentLogos.style.display = 'block';
  } else {
    noRecentLogos.style.display = 'none';
    recentLogos.forEach(logo => {
      const item = document.createElement('div');
      item.className = 'recent-logo-item';
      item.textContent = logo.name;
      item.title = logo.path;
      item.addEventListener('click', async () => {
        await window.electronAPI.openRecentLogo(logo.path);
        recentDropdown.classList.remove('visible');
      });
      recentDropdown.appendChild(item);
    });
  }
}

// Set background color
function setBackgroundColor(color) {
  window.electronAPI.setBackgroundColor(color);
}

// Apply background color to the UI
function applyBackgroundColor(color) {
  currentBgColor = color;
  document.body.classList.remove('bg-white', 'bg-black');
  document.body.classList.add(`bg-${color}`);
  
  // Update button states
  bgBlackBtn.classList.toggle('active', color === 'black');
  bgWhiteBtn.classList.toggle('active', color === 'white');
}

// Prevent default drag and drop behavior (files can't be dropped due to security)
document.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.stopPropagation();
});

document.addEventListener('drop', (e) => {
  e.preventDefault();
  e.stopPropagation();
});

// Replace default context menu with app actions
document.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  window.electronAPI.showContextMenu();
});

// Allow exiting kiosk mode with a double click/tap
container.addEventListener('dblclick', () => {
  if (isKiosk) {
    window.electronAPI.exitKiosk();
  }
});

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);

// Also initialize immediately if DOM is already loaded
if (document.readyState !== 'loading') {
  init();
}
