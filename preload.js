const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Open file dialog to select logo
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  
  // Toggle kiosk mode
  toggleKiosk: () => ipcRenderer.invoke('toggle-kiosk'),
  
  // Get current kiosk status
  getKioskStatus: () => ipcRenderer.invoke('get-kiosk-status'),
  
  // Clear stored logo
  clearLogo: () => ipcRenderer.invoke('clear-logo'),
  
  // Get recent logos
  getRecentLogos: () => ipcRenderer.invoke('get-recent-logos'),
  
  // Open a recent logo by path
  openRecentLogo: (filePath) => ipcRenderer.invoke('open-recent-logo', filePath),
  
  // Get settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  
  // Set background color
  setBackgroundColor: (color) => ipcRenderer.invoke('set-background-color', color),
  
  // Listen for logo loaded event
  onLogoLoaded: (callback) => {
    ipcRenderer.on('logo-loaded', (event, dataUrl) => callback(dataUrl));
  },
  
  // Listen for logo cleared event
  onLogoCleared: (callback) => {
    ipcRenderer.on('logo-cleared', () => callback());
  },
  
  // Listen for kiosk status changes
  onKioskStatus: (callback) => {
    ipcRenderer.on('kiosk-status', (event, status) => callback(status));
  },
  
  // Listen for settings loaded event
  onSettingsLoaded: (callback) => {
    ipcRenderer.on('settings-loaded', (event, settings) => callback(settings));
  },
  
  // Listen for background color changes
  onBackgroundColorChanged: (callback) => {
    ipcRenderer.on('background-color-changed', (event, color) => callback(color));
  }
});
