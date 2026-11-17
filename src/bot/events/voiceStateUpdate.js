const voiceManager = require('../modules/voiceManager');
const voiceTracker = require('../modules/voiceTracker');
const UserDB = require('../../models/User');
const theme = require('../../config/theme');

const CAFE_CHANNEL_ID = theme.discordConfig?.cafeVoiceChannelId || '995629374722297946';

module.exports = {
  name: 'voiceStateUpdate',
  once: false,
  async execute(oldState, newState, client) {
    try {
      const member = newState.member || oldState.member;
      if (!member) return;

      // 🛡️ กรณีตัวบอทถูกเตะออกจากห้องเสียง หรือถูกย้ายไปห้องอื่น ให้ดึงกลับเข้าห้องคาเฟ่ทันที
      if (member.id === client.user.id) {
        if (newState.channelId !== CAFE_CHANNEL_ID) {
          console.log('🛡️ [Voice Guard] ตรวจพบว่าบอทถูกเตะหรือย้ายห้อง กำลังดึงกลับเข้าห้องคาเฟ่...');
          setTimeout(() => {
            voiceManager.connectToCafeVoice(client, true).catch(() => null);
          }, 1200);
        }
        return;
      }

      // ข้ามบอทตัวอื่น
      if (member.user?.bot) return;
      if (oldState.channelId === newState.channelId) return;

      // 🔊 เล่นเสียงต้อนรับเมื่อมีลูกค้าเดินเข้าห้องคาเฟ่
      if (newState.channelId === CAFE_CHANNEL_ID) {
        setTimeout(() => {
          voiceManager.playWelcomeSound(client);
        }, 700);
      }

      const userDataDB = await UserDB.findOne({ discordId: member.id }).lean().catch(() => null);
      const userName = (
        userDataDB?.nickname ||
        member.displayName ||
        member.user?.username ||
        'ลูกค้าคาเฟ่'
      ).trim();

      await voiceTracker.handleCafeWelcome(oldState, newState, userName, userDataDB, client);
    } catch (err) {
      console.error('❌ [voiceStateUpdate Error]:', err.message);
    }
  }
};