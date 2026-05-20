// app.js
App({
  globalData: {
    themeColor: '#6482f0',
    collectionName: 'inventory_records'
  },
  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用基础库 2.2.3 及以上版本以支持云开发');
      return;
    }
    wx.cloud.init({
      traceUser: true
    });
  }
});
