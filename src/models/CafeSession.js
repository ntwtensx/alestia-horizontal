const mongoose = require('mongoose');

const receiptSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    userName: { type: String, default: 'ไม่ทราบชื่อ' },
    userAvatar: { type: String, default: '' },
    enterTimeText: { type: String, default: '' },
    enteredAt: { type: Date, default: Date.now },
    exitTimeText: { type: String, default: '' },
    exitedAt: { type: Date, default: null },
    exitReason: { type: String, default: '' },
    isPresent: { type: Boolean, default: true },
    drinkName: { type: String, default: '' },
    sweetness: { type: String, default: 'หวานปกติ' },
    drinkPrice: { type: Number, default: 0 },
    toppingName: { type: String, default: '' },
    toppingPrice: { type: Number, default: 0 },
    dessertName: { type: String, default: '' },
    dessertPrice: { type: Number, default: 0 },
    totalPrice: { type: Number, default: 0 }
  },
  { _id: false }
);

const cafeSessionSchema = new mongoose.Schema(
  {
    channelId: { type: String, required: true, index: true },
    messageId: { type: String, default: '' },
    dateKey: { type: String, index: true },
    isActive: { type: Boolean, default: true, index: true },
    logLines: { type: [String], default: [] },
    startTimeText: { type: String, default: '' },
    endTimeText: { type: String, default: '' },
    endedAt: { type: Date, default: null },
    authorName: { type: String, default: '' },
    authorAvatar: { type: String, default: '' },
    totalRevenue: { type: Number, default: 0 },
    receipts: { type: [receiptSchema], default: [] }
  },
  { timestamps: true }
);

if (mongoose.models && mongoose.models.CafeSession) {
  delete mongoose.models.CafeSession;
}

module.exports = mongoose.model('CafeSession', cafeSessionSchema);