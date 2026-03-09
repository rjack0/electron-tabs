// main.js
const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 840,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      height: 38,
      color: '#111111',
      symbolColor: '#ffffff'
    },
    backgroundColor: '#111111',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false // Bypassing all security constraints per request
    }
  })

  win.loadFile('index.html')
  win.webContents.openDevTools()
}

app.whenReady().then(createWindow)
