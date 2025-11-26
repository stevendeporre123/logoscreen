// DOM Elements
const logoImage = document.getElementById('logoImage');
const placeholder = document.getElementById('placeholder');
const uploadBtn = document.getElementById('uploadBtn');
const kioskBtn = document.getElementById('kioskBtn');
const clearBtn = document.getElementById('clearBtn');
const kioskIndicator = document.getElementById('kioskIndicator');
const kioskStatus = document.getElementById('kioskStatus');
const controls = document.getElementById('controls');

let hasLogo = false;
let isKiosk = false;

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

kioskBtn.addEventListener('click', () => {
  window.electronAPI.toggleKiosk();
});

clearBtn.addEventListener('click', () => {
  window.electronAPI.clearLogo();
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

// Prevent default drag and drop behavior (files can't be dropped due to security)
document.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.stopPropagation();
});

document.addEventListener('drop', (e) => {
  e.preventDefault();
  e.stopPropagation();
});

// Prevent context menu in kiosk mode
document.addEventListener('contextmenu', (e) => {
  if (isKiosk) {
    e.preventDefault();
  }
});

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);

// Also initialize immediately if DOM is already loaded
if (document.readyState !== 'loading') {
  init();
}
