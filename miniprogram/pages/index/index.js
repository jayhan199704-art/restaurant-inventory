const api = require('../../utils/api');

Page({
  data: {
    currentDateTime: '',
    totalTodayCount: 0,
    lowStockCount: 0,
    recentRecords: []
  },

  timer: null,

  onLoad() {
    // 初始化时间并每分钟自动刷新一次
    this.updateDateTime();
    this.timer = setInterval(() => {
      this.updateDateTime();
    }, 60 * 1000);
  },

  onShow() {
    // 每次页面可见时重新拉取数据
    this.loadTodayRecords();
  },

  onUnload() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  },

  updateDateTime() {
    const now = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[now.getMonth()];
    const day = now.getDate();
    const year = now.getFullYear();
    const hour = `${now.getHours()}`.padStart(2, '0');
    const minute = `${now.getMinutes()}`.padStart(2, '0');

    this.setData({
      currentDateTime: `${month} ${day} , ${year}  ${hour}:${minute}`
    });
  },

  async loadTodayRecords() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dateText = `${today.getFullYear()}-${`${today.getMonth() + 1}`.padStart(2, '0')}-${`${today.getDate()}`.padStart(2, '0')}`;

      const { result } = await api.getRecords({ date: dateText });
      const rows = (result && result.data ? result.data : []);

      const totalTodayCount = rows.length;
      const lowStockCount = rows.filter((item) => Number(item.quantity) < 10).length;
      const recentRecords = rows.slice(0, 10).map((item) => ({
        ...item,
        quantity: Number(item.quantity) || 0,
        status: Number(item.quantity) < 10 ? 'low' : 'ok'
      }));

      this.setData({
        totalTodayCount,
        lowStockCount,
        recentRecords
      });
    } catch (error) {
      wx.showToast({ title: '数据加载失败', icon: 'none' });
      console.error('loadTodayRecords error:', error);
    }
  },

  onTapRecord(e) {
    const { id } = e.detail;
    if (!id) return;
    wx.navigateTo({ url: `/pages/add/add?id=${id}` });
  },

  goStats() { wx.switchTab({ url: '/pages/stats/stats' }); },
  goSettings() { wx.switchTab({ url: '/pages/settings/settings' }); },
  goHome() { wx.switchTab({ url: '/pages/index/index' }); },
  goAdd() { wx.navigateTo({ url: '/pages/add/add' }); }
});
