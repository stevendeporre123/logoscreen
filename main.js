const { app, BrowserWindow, ipcMain, dialog, globalShortcut, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let isKioskMode = false;

// Path to store the logo persistently
const userDataPath = app.getPath('userData');
const logoStoragePath = path.join(userDataPath, 'stored-logo');
const recentLogosPath = path.join(userDataPath, 'recent-logos');
const settingsPath = path.join(userDataPath, 'settings');
const logosFolderPath = path.join(userDataPath, 'logos');

const MAX_RECENT_LOGOS = 10;

function createWindow() {
  ensureDirectory(logosFolderPath);

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

  // Ctrl+B - Toggle background color
  globalShortcut.register('CommandOrControl+B', () => {
    toggleBackgroundColor();
  });
}

function toggleBackgroundColor() {
  const settings = loadSettings();
  const newColor = settings.backgroundColor === 'black' ? 'white' : 'black';
  settings.backgroundColor = newColor;
  saveSettings(settings);
  if (mainWindow) {
    mainWindow.webContents.send('background-color-changed', newColor);
  }
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
    // Send kiosk status first to hide controls immediately
    mainWindow.webContents.send('kiosk-status', true);
    mainWindow.setKiosk(true);
    isKioskMode = true;
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
    const destinationPath = await getDestinationPath(filePath);

    if (!destinationPath) {
      return;
    }

    copyLogoFile(filePath, destinationPath);
    loadAndStoreLogo(destinationPath);
  }
}

function ensureDirectory(directoryPath) {
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }
}

async function getDestinationPath(originalPath) {
  ensureDirectory(logosFolderPath);
  const defaultName = path.basename(originalPath);
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Save logo to local library',
    buttonLabel: 'Save Logo',
    defaultPath: path.join(logosFolderPath, defaultName),
    filters: [
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'] }
    ]
  });

  if (canceled) {
    return null;
  }

  const chosenName = filePath ? path.basename(filePath) : defaultName;
  return path.join(logosFolderPath, chosenName);
}

function copyLogoFile(sourcePath, destinationPath) {
  ensureDirectory(path.dirname(destinationPath));
  fs.copyFileSync(sourcePath, destinationPath);
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
    
    // Add to recent logos
    addToRecentLogos(filePath, path.basename(filePath));
    
    // Send to renderer
    mainWindow.webContents.send('logo-loaded', dataUrl);
  } catch (error) {
    console.error('Error loading logo:', error);
  }
}

function addToRecentLogos(filePath, fileName) {
  try {
    let recentLogos = [];
    if (fs.existsSync(recentLogosPath)) {
      recentLogos = JSON.parse(fs.readFileSync(recentLogosPath, 'utf8'));
    }
    
    // Remove duplicate if exists
    recentLogos = recentLogos.filter(logo => logo.path !== filePath);
    
    // Add new logo at the beginning
    recentLogos.unshift({ path: filePath, name: fileName, timestamp: Date.now() });
    
    // Keep only MAX_RECENT_LOGOS
    recentLogos = recentLogos.slice(0, MAX_RECENT_LOGOS);
    
    fs.writeFileSync(recentLogosPath, JSON.stringify(recentLogos), 'utf8');
  } catch (error) {
    console.error('Error saving recent logos:', error);
  }
}

function getRecentLogos() {
  try {
    if (fs.existsSync(recentLogosPath)) {
      const recentLogos = JSON.parse(fs.readFileSync(recentLogosPath, 'utf8'));
      // Filter out logos that no longer exist on disk
      return recentLogos.filter(logo => fs.existsSync(logo.path));
    }
  } catch (error) {
    console.error('Error reading recent logos:', error);
  }
  return [];
}

function loadSettings() {
  try {
    if (fs.existsSync(settingsPath)) {
      return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    }
  } catch (error) {
    console.error('Error reading settings:', error);
  }
  return { backgroundColor: 'black' };
}

function saveSettings(settings) {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings), 'utf8');
  } catch (error) {
    console.error('Error saving settings:', error);
  }
}

function loadStoredLogo() {
  try {
    if (fs.existsSync(logoStoragePath)) {
      const logoData = JSON.parse(fs.readFileSync(logoStoragePath, 'utf8'));
      mainWindow.webContents.send('logo-loaded', logoData.dataUrl);
    }
    // Also send initial settings
    const settings = loadSettings();
    mainWindow.webContents.send('settings-loaded', settings);
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

ipcMain.handle('get-recent-logos', () => {
  return getRecentLogos();
});

ipcMain.handle('open-recent-logo', (event, filePath) => {
  if (fs.existsSync(filePath)) {
    loadAndStoreLogo(filePath);
    return true;
  }
  return false;
});

ipcMain.handle('get-settings', () => {
  return loadSettings();
});

ipcMain.handle('set-background-color', (event, color) => {
  const settings = loadSettings();
  settings.backgroundColor = color;
  saveSettings(settings);
  mainWindow.webContents.send('background-color-changed', color);
});

ipcMain.handle('show-context-menu', () => {
  showContextMenu();
});

ipcMain.handle('exit-kiosk', () => {
  if (isKioskMode) {
    exitKioskMode();
  }
});

function showContextMenu() {
  const settings = loadSettings();
  const template = [
    {
      label: 'Upload logo…',
      click: () => openFileDialog()
    },
    {
      label: isKioskMode ? 'Exit kiosk mode' : 'Enter kiosk mode',
      click: () => toggleKioskMode()
    },
    {
      label: 'Toggle background',
      submenu: [
        {
          label: 'Black',
          type: 'radio',
          checked: settings.backgroundColor === 'black',
          click: () => {
            settings.backgroundColor = 'black';
            saveSettings(settings);
            mainWindow.webContents.send('background-color-changed', 'black');
          }
        },
        {
          label: 'White',
          type: 'radio',
          checked: settings.backgroundColor === 'white',
          click: () => {
            settings.backgroundColor = 'white';
            saveSettings(settings);
            mainWindow.webContents.send('background-color-changed', 'white');
          }
        }
      ]
    },
    {
      label: 'Clear logo',
      click: () => {
        if (fs.existsSync(logoStoragePath)) {
          fs.unlinkSync(logoStoragePath);
        }
        mainWindow.webContents.send('logo-cleared');
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => app.quit()
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  menu.popup({ window: mainWindow });
}

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
