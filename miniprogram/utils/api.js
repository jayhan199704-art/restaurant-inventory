// 云函数 API 统一封装
function invoke(action, data = {}) {
  return wx.cloud.callFunction({
    name: 'inventory',
    data: { action, ...data }
  });
}

function addRecord(payload) {
  return invoke('addRecord', { payload });
}

function getRecords(filters = {}) {
  return invoke('getRecords', { filters });
}

function getStats() {
  return invoke('getStats');
}

function removeRecord(id) {
  return invoke('removeRecord', { id });
}

module.exports = { addRecord, getRecords, getStats, removeRecord };
