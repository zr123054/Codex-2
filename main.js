const path = require('node:path');
const { app, BrowserWindow, Menu } = require('electron');

const isMac = process.platform === 'darwin';

// FE25 桌面应用入口：只加载本地前端资源，不启用 Node 注入，后续真实能力通过受控桥接接入。
function createMainWindow() {
  const window = new BrowserWindow({
    width: 430,
    height: 930,
    minWidth: 430,
    minHeight: 860,
    title: 'FE25 Test APP',
    backgroundColor: '#eef2f7',
    autoHideMenuBar: true,
    useContentSize: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  Menu.setApplicationMenu(null);
  window.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (!isMac) {
    app.quit();
  }
});
