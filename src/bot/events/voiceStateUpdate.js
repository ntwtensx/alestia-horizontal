const UserDB = require('../../models/User');
const voiceTracker = require('../modules/voiceTracker');

module.exports = {
  name: 'voiceStateUpdate',
  once: false,
  async execute(oldState, newState, client) {
    try {
      const member = newState.member || oldState.member;
      if (!member || member.user?.bot) return;
      if (oldState.channelId === newState.channelId) return;

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