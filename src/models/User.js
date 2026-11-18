const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    discordId: { type: String, required: true, unique: true, index: true },
    name: { type: String, default: '' },
    username: { type: String, default: '' },
    avatarUrl: { type: String, default: '' },
    nickname: { type: String, default: '' },
    inviter: { type: String, default: '' },
    birthdayDay: { type: Number, default: null },
    birthdayMonth: { type: Number, default: null },
    birthdayText: { type: String, default: '' },
    favoriteMenu: { type: String, default: 'ขอคิดดูก่อน' },
    likedMenu1: { type: String, default: 'ขอคิดดูก่อน' },
    likedMenu2: { type: String, default: 'ขอคิดดูก่อน' },
    likedMenus: { type: [String], default: [] },
    walletBalance: { type: Number, default: 0 },
    pin: { type: String, default: '' },
    casinoPin: { type: String, default: '' }
  },
  { timestamps: true }
);

if (mongoose.models && mongoose.models.User) {
  delete mongoose.models.User;
}

module.exports = mongoose.model('User', userSchema);