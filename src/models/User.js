const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    // 🆔 รหัสประจำตัวผู้ใช้จาก Discord (Primary Lookup Key)
    discordId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true
    },

    // 👤 ชื่ออ้างอิงจากระบบ Discord
    name: {
      type: String,
      default: '',
      trim: true
    },
    username: {
      type: String,
      default: '',
      trim: true
    },
    avatarUrl: {
      type: String,
      default: '',
      trim: true
    },

    // 🏷️ ข้อมูลส่วนตัวและบัตรสมาชิกคาเฟ่ (Registration & Identity)
    nickname: {
      type: String,
      default: '',
      trim: true
    },
    inviter: {
      type: String,
      default: 'ไม่มีผู้เชิญ / เดินหลงเข้ามาเอง',
      trim: true
    },
    birthdayDay: {
      type: Number,
      default: null,
      min: 1,
      max: 31
    },
    birthdayMonth: {
      type: Number,
      default: null,
      min: 1,
      max: 12
    },
    birthdayText: {
      type: String,
      default: '',
      trim: true
    },

    // ☕ ข้อมูลเมนูประจำตัวสำหรับเสิร์ฟอัตโนมัติในห้องเสียงคาเฟ่
    favoriteMenu: {
      type: String,
      default: 'ขอคิดดูก่อน',
      trim: true
    },
    likedMenu1: {
      type: String,
      default: 'ขอคิดดูก่อน',
      trim: true
    },
    likedMenu2: {
      type: String,
      default: 'ขอคิดดูก่อน',
      trim: true
    },
    likedMenus: {
      type: [String],
      default: []
    },

    // 👛 ระบบการเงิน กระเป๋าตังค์ และรหัสผ่านปลอดภัย PIN (รองรับทั้ง pin และ casinoPin)
    walletBalance: {
      type: Number,
      default: 0,
      index: true
    },
    pin: {
      type: String,
      default: '',
      trim: true
    },
    casinoPin: {
      type: String,
      default: '',
      trim: true
    },

    // 🎰 สถิติการเล่นคาสิโนบัตรขูด
    scratchCount: {
      type: Number,
      default: 0
    },
    lastScratchAt: {
      type: Date,
      default: null
    },

    // 📖 สมุดสะสมแสตมป์อีเวนต์พิเศษ
    collectedStamps: {
      type: [String],
      default: []
    }
  },
  {
    timestamps: true
  }
);

if (mongoose.models && mongoose.models.User) {
  delete mongoose.models.User;
}

module.exports = mongoose.model('User', userSchema);