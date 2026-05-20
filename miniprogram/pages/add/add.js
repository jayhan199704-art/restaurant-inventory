const { formatDate, getShiftByHour } = require('../../utils/helper');

Page({
  data: {
    id: '',
    isEditMode: false,
    loading: false,
    imageUrl: '',
    imageFileID: '',
    isAIName: false,
    isAIQuantity: false,
    form: {
      name: '',
      quantity: '',
      note: ''
    }
  },

  onLoad(options) {
    const id = (options && options.id) || '';
    if (id) {
      this.setData({ id, isEditMode: true });
      this.loadRecordDetail(id);
    }
  },

  async loadRecordDetail(id) {
    try {
      wx.showLoading({ title: '加载中' });
      const { result } = await wx.cloud.callFunction({
        name: 'inventory',
        data: {
          action: 'getRecords',
          filters: { _id: id }
        }
      });
      const detail = result && result.data && result.data[0];
      if (!detail) {
        wx.showToast({ title: '记录不存在', icon: 'none' });
        return;
      }
      this.setData({
        imageUrl: detail.imageUrl || '',
        imageFileID: detail.imageUrl || '',
        form: {
          name: detail.name || '',
          quantity: detail.quantity != null ? `${detail.quantity}` : '',
          note: detail.note || ''
        }
      });
    } catch (error) {
      wx.showToast({ title: '加载失败', icon: 'none' });
      console.error('loadRecordDetail error:', error);
    } finally {
      wx.hideLoading();
    }
  },

  onInput(e) {
    const key = e.currentTarget.dataset.key;
    const value = e.detail.value;
    this.setData({ [`form.${key}`]: value });
    if (key === 'name') this.setData({ isAIName: false });
    if (key === 'quantity') this.setData({ isAIQuantity: false });
  },

  async chooseImage() {
    try {
      const media = await wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['camera', 'album'],
        sizeType: ['compressed']
      });

      const tempFilePath = media.tempFiles[0].tempFilePath;
      this.setData({ imageUrl: tempFilePath, loading: true });

      const cloudPath = `inventory/${Date.now()}_${Math.floor(Math.random() * 10000)}.jpg`;
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath,
        filePath: tempFilePath
      });
      const fileID = uploadRes.fileID;

      this.setData({ imageFileID: fileID });

      const { result } = await wx.cloud.callFunction({
        name: 'inventory',
        data: {
          action: 'recognize',
          fileID
        }
      });

      const recognizedName = result && result.name ? `${result.name}` : '';
      const recognizedQuantity =
        result && result.quantity !== undefined && result.quantity !== null
          ? `${result.quantity}`
          : '';

      this.setData({
        'form.name': recognizedName || this.data.form.name,
        'form.quantity': recognizedQuantity || this.data.form.quantity,
        isAIName: !!recognizedName,
        isAIQuantity: !!recognizedQuantity
      });
    } catch (error) {
      if (error && error.errMsg && error.errMsg.includes('cancel')) return;
      wx.showToast({ title: '识别失败，请重试', icon: 'none' });
      console.error('chooseImage/recognize error:', error);
    } finally {
      this.setData({ loading: false });
    }
  },


  onBack() {
    wx.navigateBack();
  },

  async save() {
    const { id, isEditMode, form, imageFileID } = this.data;
    const name = (form.name || '').trim();
    const quantityText = `${form.quantity || ''}`.trim();
    const note = (form.note || '').trim();

    if (!name) return wx.showToast({ title: '请输入名称', icon: 'none' });
    if (quantityText === '') return wx.showToast({ title: '请输入数量', icon: 'none' });

    const quantity = Number(quantityText);
    if (Number.isNaN(quantity)) return wx.showToast({ title: '数量格式不正确', icon: 'none' });

    try {
      wx.showLoading({ title: '保存中' });
      if (isEditMode) {
        await wx.cloud.callFunction({
          name: 'inventory',
          data: {
            action: 'updateRecord',
            id,
            payload: {
              name,
              quantity,
              note,
              imageUrl: imageFileID || this.data.imageUrl,
              date: formatDate(),
              shift: getShiftByHour()
            }
          }
        });
      } else {
        await wx.cloud.callFunction({
          name: 'inventory',
          data: {
            action: 'addRecord',
            payload: {
              name,
              quantity,
              note,
              imageUrl: imageFileID,
              date: formatDate(),
              shift: getShiftByHour()
            }
          }
        });
      }

      wx.showToast({ title: '保存成功' });
      setTimeout(() => {
        wx.navigateBack();
      }, 300);
    } catch (error) {
      wx.showToast({ title: '保存失败', icon: 'none' });
      console.error('save error:', error);
    } finally {
      wx.hideLoading();
    }
  }
});
