const voiceManager = require('../modules/voiceManager');
const voiceTracker = require('../modules/voiceTracker');
const UserDB = require('../../models/User');
const memory = require('../../utils/sharedMemory');
const theme = require('../../config/theme');

const CAFE_CHANNEL_ID = theme.discordConfig?.cafeVoiceChannelId || '995629374722297946';
const GATEKEEPER_NOTICE_DELETE_MS = 8000;

// รายชื่อห้องเสียงที่ยกเว้นไม่ต้องเช็กอินคาเฟ่ (เช่น ห้องนอน หรือห้องที่กำหนดเพิ่มใน config/theme.js)
const EXEMPT_VOICE_IDS = new Set(
  [
    theme.discordConfig?.sleepVoiceChannelId,
    ...(Array.isArray(theme.discordConfig?.exemptVoiceChannelIds) ? theme.discordConfig.exemptVoiceChannelIds : [])
  ].filter(Boolean)
);

if (!memory.cafeVerifiedUsers) memory.cafeVerifiedUsers = new Set();
if (!memory.gatekeeperBounceUsers) memory.gatekeeperBounceUsers = new Set();
if (!memory.pendingOrders) memory.pendingOrders = new Map();
if (!memory.pendingUnmuteUsers) memory.pendingUnmuteUsers = new Set();

async function sendTempCafeNotice(guild, client, text) {
  try {
    let cafeChannel =
      guild?.channels?.cache?.get(CAFE_CHANNEL_ID) ||
      client?.channels?.cache?.get(CAFE_CHANNEL_ID);
    if (!cafeChannel && guild) {
      cafeChannel = await guild.channels.fetch(CAFE_CHANNEL_ID).catch(() => null);
    }
    if (!cafeChannel) return;

    const msg = await cafeChannel.send(text).catch(() => null);
    if (msg) {
      setTimeout(() => msg.delete().catch(() => null), GATEKEEPER_NOTICE_DELETE_MS);
    }
  } catch (_) {}
}

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

      // ข้ามบอทตัวอื่น และข้ามเหตุการณ์ที่ไม่ได้เปลี่ยนห้อง (เช่น เปิด-ปิดไมค์/หูฟัง)
      if (member.user?.bot) return;
      if (oldState.channelId === newState.channelId) return;

      // 🚪 1. หากสมาชิกตัดการเชื่อมต่อออกจากห้องเสียงทั้งหมด -> เพิกถอนสิทธิ์การใช้ห้องเสียงอื่น
      if (!newState.channelId) {
        memory.cafeVerifiedUsers.delete(member.id);
        memory.gatekeeperBounceUsers.delete(member.id);
      }

      // 🔁 2. หากเป็นจังหวะที่บอทเพิ่งดีดสมาชิกที่แอบย้ายออกระหว่างรอความหวานกลับเข้าคาเฟ่ -> คงออเดอร์เดิมไว้ ไม่ต้องสุ่มใหม่
      if (newState.channelId === CAFE_CHANNEL_ID && memory.gatekeeperBounceUsers.has(member.id)) {
        memory.gatekeeperBounceUsers.delete(member.id);
        return;
      }

      const userDataDB = await UserDB.findOne({ discordId: member.id }).lean().catch(() => null);
      const userName = (
        userDataDB?.nickname ||
        member.displayName ||
        member.user?.username ||
        'ลูกค้าคาเฟ่'
      ).trim();

      // 🚧 3. ด่านเช็กอินคาเฟ่: ตรวจสอบเมื่อมีการเข้าหรือย้ายไปห้องเสียงอื่นที่ไม่ใช่คาเฟ่
      if (newState.channelId && newState.channelId !== CAFE_CHANNEL_ID) {
        const isAfkChannel = Boolean(newState.guild?.afkChannelId && newState.channelId === newState.guild.afkChannelId);
        const isExemptChannel = isAfkChannel || EXEMPT_VOICE_IDS.has(newState.channelId);
        const isBeingSentToSleep = Boolean(memory.sleepingUsers?.has(member.id));

        if (!isExemptChannel && !isBeingSentToSleep) {
          const isPendingSweetness = memory.pendingOrders.has(member.id);
          const hasCafePass = memory.cafeVerifiedUsers.has(member.id) && !isPendingSweetness;

          if (!hasCafePass) {
            const snuckOutWhilePending = oldState.channelId === CAFE_CHANNEL_ID && isPendingSweetness;

            if (snuckOutWhilePending) {
              memory.gatekeeperBounceUsers.add(member.id);
              setTimeout(() => memory.gatekeeperBounceUsers.delete(member.id), 5000);
            }

            try {
              await member.voice.setChannel(
                CAFE_CHANNEL_ID,
                'กรุณาเช็กอินและยืนยันเมนูที่ห้องคาเฟ่ก่อนใช้งานห้องเสียงอื่น'
              );

              const noticeText = snuckOutWhilePending
                ? `-# <@${member.id}>\n🔒 คุณ${userName} ยังไม่ได้ระบุความหวานเลยค่ะ กรุณายืนยันเมนูให้เรียบร้อยก่อนย้ายไปห้องเสียงอื่นนะคะ~✦`
                : `-# <@${member.id}>\n🚪 พาคุณ${userName} มาเช็กอินที่คาเฟ่ก่อนนะคะ~✦ กรุณายืนยันเมนูและระบุความหวานให้เรียบร้อยก่อนย้ายไปใช้ห้องเสียงอื่นค่ะ`;

              sendTempCafeNotice(newState.guild, client, noticeText).catch(() => null);
              return;
            } catch (moveErr) {
              memory.gatekeeperBounceUsers.delete(member.id);
              console.warn(`⚠️ [Voice Gatekeeper] ย้ายคุณ${userName} ไปห้องคาเฟ่ไม่สำเร็จ:`, moveErr.message);
            }
          }
        }

        // 🔊 ปลด Server Mute ค้างอัตโนมัติ (เฉพาะผู้ที่ได้รับอนุญาตหรือเข้าห้องยกเว้น)
        if (memory.pendingUnmuteUsers.has(member.id)) {
          memory.pendingUnmuteUsers.delete(member.id);
          await member.voice.setMute(false, 'ปลดไมค์อัตโนมัติหลังพ้นคิวคาเฟ่').catch(() => null);
        }
      }

      // 🔊 4. เล่นเสียงต้อนรับเมื่อลูกค้าเดินเข้าห้องคาเฟ่
      if (newState.channelId === CAFE_CHANNEL_ID) {
        setTimeout(() => {
          voiceManager.playWelcomeSound(client);
        }, 700);
      }

      await voiceTracker.handleCafeWelcome(oldState, newState, userName, userDataDB, client);
    } catch (err) {
      console.error('❌ [voiceStateUpdate Error]:', err.message);
    }
  }
};