const api = require('../../utils/api');

Page({
  data: { total: 0, lowCount: 0, emptyCount: 0 },
  onShow() { this.loadStats(); },
  async loadStats() {
    const { result } = await api.getStats();
    this.setData(result || {});
  },
  goHome() { wx.switchTab({ url: '/pages/index/index' }); },
  goStats() { wx.switchTab({ url: '/pages/stats/stats' }); },
  goSettings() { wx.switchTab({ url: '/pages/settings/settings' }); },
  goAdd() { wx.navigateTo({ url: '/pages/add/add' }); }
});
