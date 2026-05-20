Component({
  properties: {
    id: { type: String, value: '' },
    name: { type: String, value: '' },
    quantity: { type: Number, value: 0 },
    note: { type: String, value: '' },
    status: { type: String, value: 'ok' }
  },
  methods: {
    // 点击组件时向父页面抛出事件，便于跳转到编辑页
    onTapItem() {
      this.triggerEvent('itemtap', { id: this.properties.id });
    }
  }
});
