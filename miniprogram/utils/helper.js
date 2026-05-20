// 日期格式化
function formatDate(date = new Date()) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// 班次判断：可按餐厅营业时间调整
function getShiftByHour(hour = new Date().getHours()) {
  if (hour >= 6 && hour < 11) return '早班';
  if (hour >= 11 && hour < 17) return '中班';
  return '晚班';
}

module.exports = { formatDate, getShiftByHour };
