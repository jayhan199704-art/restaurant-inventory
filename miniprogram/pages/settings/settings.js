Page({
  data: { collectionName: 'inventory_records', cloudFunc: 'inventory' },
  goHome() { wx.switchTab({ url: '/pages/index/index' }); },
  goStats() { wx.switchTab({ url: '/pages/stats/stats' }); },
  goSettings() { wx.switchTab({ url: '/pages/settings/settings' }); },
  goAdd() { wx.navigateTo({ url: '/pages/add/add' }); }
});
