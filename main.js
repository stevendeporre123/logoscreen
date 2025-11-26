const { app, BrowserWindow, ipcMain, dialog, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let isKioskMode = false;

// Path to store the logo persistently
const userDataPath = app.getPath('userData');
const logoStoragePath = path.join(userDataPath, 'stored-logo');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 600,
    fullscreen: false,
    kiosk: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    backgroundColor: '#000000',
    show: false
  });

  mainWindow.loadFile('index.html');

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // Load stored logo if exists
    loadStoredLogo();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Register keyboard shortcuts
  registerShortcuts();
}

function registerShortcuts() {
  // F11 - Toggle kiosk/fullscreen mode
  globalShortcut.register('F11', () => {
    toggleKioskMode();
  });

  // Escape - Exit kiosk mode
  globalShortcut.register('Escape', () => {
    if (isKioskMode) {
      exitKioskMode();
    }
  });

  // Ctrl+Shift+K - Toggle kiosk mode (alternative shortcut)
  globalShortcut.register('CommandOrControl+Shift+K', () => {
    toggleKioskMode();
  });

  // Ctrl+O - Open file dialog to upload logo
  globalShortcut.register('CommandOrControl+O', () => {
    openFileDialog();
  });
}

function toggleKioskMode() {
  if (isKioskMode) {
    exitKioskMode();
  } else {
    enterKioskMode();
  }
}

function enterKioskMode() {
  if (mainWindow) {
    mainWindow.setKiosk(true);
    isKioskMode = true;
    mainWindow.webContents.send('kiosk-status', true);
  }
}

function exitKioskMode() {
  if (mainWindow) {
    mainWindow.setKiosk(false);
    isKioskMode = false;
    mainWindow.webContents.send('kiosk-status', false);
  }
}

async function openFileDialog() {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Logo Image',
    filters: [
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'] }
    ],
    properties: ['openFile']
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    loadAndStoreLogo(filePath);
  }
}

function loadAndStoreLogo(filePath) {
  try {
    // Read the file
    const imageBuffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const base64 = imageBuffer.toString('base64');
    
    // Determine mime type
    let mimeType = 'image/png';
    if (ext === '.jpg' || ext === '.jpeg') {
      mimeType = 'image/jpeg';
    } else if (ext === '.gif') {
      mimeType = 'image/gif';
    } else if (ext === '.bmp') {
      mimeType = 'image/bmp';
    } else if (ext === '.webp') {
      mimeType = 'image/webp';
    }

    const dataUrl = `data:${mimeType};base64,${base64}`;
    
    // Store the logo for persistence
    const logoData = { dataUrl, originalPath: filePath };
    fs.writeFileSync(logoStoragePath, JSON.stringify(logoData), 'utf8');
    
    // Send to renderer
    mainWindow.webContents.send('logo-loaded', dataUrl);
  } catch (error) {
    console.error('Error loading logo:', error);
  }
}

function loadStoredLogo() {
  try {
    if (fs.existsSync(logoStoragePath)) {
      const logoData = JSON.parse(fs.readFileSync(logoStoragePath, 'utf8'));
      mainWindow.webContents.send('logo-loaded', logoData.dataUrl);
    }
  } catch (error) {
    console.error('Error loading stored logo:', error);
  }
}

// IPC handlers
ipcMain.handle('open-file-dialog', async () => {
  await openFileDialog();
});

ipcMain.handle('toggle-kiosk', () => {
  toggleKioskMode();
});

ipcMain.handle('get-kiosk-status', () => {
  return isKioskMode;
});

ipcMain.handle('clear-logo', () => {
  try {
    if (fs.existsSync(logoStoragePath)) {
      fs.unlinkSync(logoStoragePath);
    }
    mainWindow.webContents.send('logo-cleared');
  } catch (error) {
    console.error('Error clearing logo:', error);
  }
});

// App lifecycle
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
