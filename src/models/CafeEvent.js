const mongoose = require('mongoose');

const cafeEventSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      index: true,
      trim: true
    },
    text: {
      type: String,
      required: true,
      trim: true
    },
    price: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

cafeEventSchema.index({ category: 1, text: 1 }, { unique: true });

if (mongoose.models && mongoose.models.CafeEvent) {
  delete mongoose.models.CafeEvent;
}

module.exports = mongoose.model('CafeEvent', cafeEventSchema);