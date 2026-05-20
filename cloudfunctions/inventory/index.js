const cloud = require('wx-server-sdk');
const fetch = require('node-fetch');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const COLLECTION = 'inventory_records';

// 时间工具：格式化 YYYY-MM-DD
function formatDate(date = new Date()) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// 班次工具：可根据门店营业时间调整
function getShiftByHour(hour = new Date().getHours()) {
  if (hour >= 6 && hour < 11) return '早班';
  if (hour >= 11 && hour < 17) return '中班';
  return '晚班';
}

// 解析通义千问返回文本中的 JSON
function extractJSON(text = '') {
  const trimmed = `${text}`.trim();
  // 优先直接 parse
  try {
    return JSON.parse(trimmed);
  } catch (e) {
    // 忽略，继续兜底提取
  }

  // 兜底：提取首个 {...}
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error('AI 返回内容无法解析为 JSON');
  }
  return JSON.parse(match[0]);
}

// 调用通义千问 VL
async function recognizeByQwenVL(imageUrl) {
  // 在微信云函数控制台中配置环境变量：
  // 变量名：DASHSCOPE_API_KEY
  // 变量值：你的 DashScope API Key
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    throw new Error('缺少 DASHSCOPE_API_KEY，请在云函数环境变量中配置');
  }

  const endpoint =
    'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';
  const prompt =
    '请识别图片中数量最多的餐厅物品，只返回 JSON 格式：{"name":"物品名称（中文）","quantity":数量（整数）}，不要返回任何其他内容。';

  const payload = {
    model: 'qwen-vl-plus',
    input: {
      messages: [
        {
          role: 'user',
          content: [
            { image: imageUrl },
            { text: prompt }
          ]
        }
      ]
    },
    parameters: {
      result_format: 'message'
    }
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  const result = await res.json();
  if (!res.ok) {
    const message = result && (result.message || result.code || JSON.stringify(result));
    throw new Error(`通义千问调用失败: ${message}`);
  }

  const outputText =
    result &&
    result.output &&
    result.output.choices &&
    result.output.choices[0] &&
    result.output.choices[0].message &&
    result.output.choices[0].message.content &&
    result.output.choices[0].message.content[0] &&
    result.output.choices[0].message.content[0].text;

  if (!outputText) {
    throw new Error('AI 返回为空');
  }

  const parsed = extractJSON(outputText);
  const name = parsed && parsed.name ? `${parsed.name}`.trim() : '';
  const quantity = Number(parsed && parsed.quantity);

  if (!name || Number.isNaN(quantity)) {
    throw new Error('AI 识别结果缺少有效 name 或 quantity');
  }

  return {
    name,
    quantity: Math.max(0, Math.floor(quantity))
  };
}

exports.main = async (event) => {
  const { action } = event || {};

  try {
    switch (action) {
      case 'recognize': {
        const { fileID } = event;
        if (!fileID) throw new Error('fileID 不能为空');

        const tempRes = await cloud.getTempFileURL({ fileList: [fileID] });
        const fileObj = tempRes.fileList && tempRes.fileList[0];
        const tempFileURL = fileObj && fileObj.tempFileURL;

        if (!tempFileURL) throw new Error('获取图片临时链接失败');

        const aiData = await recognizeByQwenVL(tempFileURL);
        return { code: 0, data: aiData };
      }

      case 'getRecords': {
        const { date } = event;
        let query = db.collection(COLLECTION);
        if (date) {
          query = query.where({ date });
        }
        const res = await query.orderBy('createdAt', 'desc').get();
        return { code: 0, data: res.data || [] };
      }

      case 'addRecord': {
        const input = event.data || {};
        const now = new Date();
        const record = {
          name: input.name || '',
          quantity: Number(input.quantity || 0),
          note: input.note || '',
          imageUrl: input.imageUrl || '',
          date: formatDate(now),
          shift: getShiftByHour(now.getHours()),
          createdAt: now
        };

        if (!record.name) throw new Error('name 不能为空');

        const addRes = await db.collection(COLLECTION).add({ data: record });
        return { code: 0, data: { _id: addRes._id } };
      }

      case 'updateRecord': {
        const { id } = event;
        const input = event.data || {};
        if (!id) throw new Error('id 不能为空');

        const updateData = {
          ...input,
          updatedAt: new Date()
        };
        if (updateData.quantity !== undefined) {
          updateData.quantity = Number(updateData.quantity);
        }

        await db.collection(COLLECTION).doc(id).update({ data: updateData });
        return { code: 0 };
      }

      case 'deleteRecord': {
        const { id } = event;
        if (!id) throw new Error('id 不能为空');

        await db.collection(COLLECTION).doc(id).remove();
        return { code: 0 };
      }

      case 'getStats': {
        const now = new Date();
        const start = new Date(now);
        start.setDate(now.getDate() - 6);
        start.setHours(0, 0, 0, 0);

        const recordsRes = await db
          .collection(COLLECTION)
          .where({ createdAt: db.command.gte(start) })
          .orderBy('createdAt', 'asc')
          .get();

        const list = recordsRes.data || [];

        // 先构建最近 7 天骨架，确保空日期也返回
        const map = {};
        for (let i = 0; i < 7; i += 1) {
          const d = new Date(start);
          d.setDate(start.getDate() + i);
          const key = formatDate(d);
          map[key] = { date: key, count: 0, totalQuantity: 0 };
        }

        list.forEach((item) => {
          const key = item.date || formatDate(new Date(item.createdAt));
          if (!map[key]) return;
          map[key].count += 1;
          map[key].totalQuantity += Number(item.quantity || 0);
        });

        const data = Object.keys(map)
          .sort()
          .map((k) => map[k]);

        return { code: 0, data };
      }

      default:
        throw new Error(`未知 action: ${action}`);
    }
  } catch (error) {
    return {
      code: -1,
      message: error.message || '服务异常'
    };
  }
};
