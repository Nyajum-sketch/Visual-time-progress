const path = require('path');
const { app, BrowserWindow, ipcMain, screen } = require('electron');

let mainWindow = null;

ipcMain.on('set-ignore-mouse-events', (_event, ignore) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setIgnoreMouseEvents(Boolean(ignore), { forward: true });
  }
});

function createWindow() {
  const { x, y, width, height } = screen.getPrimaryDisplay().workArea;

  mainWindow = new BrowserWindow({
    x,
    y,
    width,
    height,
    minWidth: 520,
    minHeight: 260,
    frame: false,
    transparent: true,
    hasShadow: false,
    alwaysOnTop: true,
    resizable: true,
    icon: path.join(__dirname, 'bar-icon.avif'),
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.setIgnoreMouseEvents(false);
  mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
