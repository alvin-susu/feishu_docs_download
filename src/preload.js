/**
 * OpenClaw预加载脚本
 * 在渲染进程加载前执行，为UI提供API接口
 */

const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('openclaw', {
  // 插件信息
  getPluginInfo: () => ipcRenderer.invoke('get-plugin-info'),

  // 账号管理
  accounts: {
    list: () => ipcRenderer.invoke('accounts-list'),
    add: (account) => ipcRenderer.invoke('accounts-add', account),
    remove: (id) => ipcRenderer.invoke('accounts-remove', id),
    switch: (id) => ipcRenderer.invoke('accounts-switch', id),
    validate: (id) => ipcRenderer.invoke('accounts-validate', id)
  },

  // 飞书操作
  feishu: {
    find: (query) => ipcRenderer.invoke('feishu-find', query),
    search: (query) => ipcRenderer.invoke('feishu-search', query),
    create: (title, content) => ipcRenderer.invoke('feishu-create', title, content),
    addTodo: (docId, todo) => ipcRenderer.invoke('feishu-add-todo', docId, todo)
  },

  // 系统操作
  system: {
    getStatus: () => ipcRenderer.invoke('system-get-status'),
    rebuildIndex: () => ipcRenderer.invoke('system-rebuild-index'),
    updateAllIndexes: () => ipcRenderer.invoke('system-update-all-indexes')
  },

  // 事件监听
  on: (channel, callback) => {
    const validChannels = [
      'account-status-changed',
      'index-updated',
      'sync-progress',
      'error-occurred'
    ];

    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    }
  },

  // 移除监听
  removeListener: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback);
  }
});

// 页面加载完成
window.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 飞书知识库智能助手已加载');
});
