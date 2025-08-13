const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  // Expose APIs if needed, e.g., fs for tools
});