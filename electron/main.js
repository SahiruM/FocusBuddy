const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#09090b',   // matches your dark theme, avoids white flash on load
    webPreferences: {
      nodeIntegration: false,      // security best practice
      contextIsolation: true,      // security best practice
      webSecurity: true,
    },
    // Optional: remove default menu bar for a cleaner app look
    autoHideMenuBar: true,
    titleBarStyle: 'default',
    icon: path.join(__dirname, '../public/icon.png'), // add your icon here
  });

  // Load your built React app
  win.loadFile(path.join(__dirname, '../dist/index.html'));

  // Open external links in the system browser, not Electron
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Uncomment to open DevTools during development
  // win.webContents.openDevTools();
}

// ── App Lifecycle ──────────────────────────────────────────
app.whenReady().then(() => {
  createWindow();

  // macOS: re-create window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Windows/Linux: quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});