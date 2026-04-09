const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('overlayApi', {
  setIgnoreMouseEvents(ignore) {
    ipcRenderer.send('set-ignore-mouse-events', ignore);
  },
});