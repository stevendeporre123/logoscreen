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
  }
});
