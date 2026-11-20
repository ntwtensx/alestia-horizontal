const priceCatalog = require('../../utils/menuPriceCatalog');
const memory = require('../../utils/sharedMemory');
const voiceTracker = require('../modules/voiceTracker');
const theme = require('../../config/theme');

const CAFE_CHANNEL_ID = theme.discordConfig?.cafeVoiceChannelId || '995629374722297946';
const WARN_DELETE_MS = 3000;

async function replyAndCleanupIn3s(message, warnText) {
  const warnMsg = await message.reply(warnText).catch(() => null);
  setTimeout(() => {
    if (warnMsg) warnMsg.delete().catch(() => null);
    message.delete().catch(() => null);
  }, WARN_DELETE_MS);
}

module.exports = {
  name: 'messageCreate',
  once: false,
  async execute(message, client) {
    if (!message || message.author?.bot || !message.content) return;
    const content = message.content.trim();
    const activeClient = client || message.client;

    // ==========================================
    // 🎯 1. ตรวจจับการสั่งเมนูแบบเข้มงวดในห้องแชทคาเฟ่
    // ==========================================
    if (
      message.channel.id === CAFE_CHANNEL_ID &&
      memory.pendingOrders &&
      memory.pendingOrders.has(message.author.id) &&
      !content.startsWith('!')
    ) {
      const parsed = priceCatalog.parseStrictOrder(content);

      if (parsed.intent === 'ORDER') {
        await voiceTracker.confirmMemberOrder(message.author.id, parsed.orderDetails, activeClient, message);
        return;
      }

      if (parsed.intent === 'RANDOM_DENIED') {
        await replyAndCleanupIn3s(
          message,
          'ไม่มีการสุ่มแล้วค่ะ ขี้เกียจคิดเอง กรุณาพิมพ์ออเดอร์มาด้วยค่ะ'
        );
        return;
      }

      if (parsed.intent === 'HESITATE_KICK') {
        await replyAndCleanupIn3s(
          message,
          'ไม่รู้จะสั่งอะไรดี งั้นลองออกไปคิดดูก่อนนะคะ'
        );
        await voiceTracker.rejectAndKickMember(message.author.id, 'HESITATE', activeClient);
        return;
      }

      if (parsed.intent === 'REFUSE_KICK') {
        await replyAndCleanupIn3s(
          message,
          'เข้ามาแล้วไม่ยอมสั่งเมนู อเลสเทียของดให้บริการนะคะ'
        );
        await voiceTracker.rejectAndKickMember(message.author.id, 'REFUSE', activeClient);
        return;
      }

      // กรณีเขียนชื่อเมนูไม่ตรงทุกตัวอักษร
      await replyAndCleanupIn3s(
        message,
        'เขียนชื่อเมนูไม่ถูกต้องนะคะ กรุณาพิมพ์ชื่อเมนูให้ตรงตามรายการทุกตัวอักษรแล้วเขียนใหม่ค่ะ!'
      );
      return;
    }

    // ==========================================
    // 🌈 2. คำสั่งจัดการเมนูพิเศษ (!cafe add / !cafe remove)
    // ==========================================
    if (!/^!cafe(?:\s+|$)/i.test(content)) return;

    const args = content.replace(/^!cafe/i, '').trim();
    const [subCmd, ...rest] = args.split(/\s+/);
    const menuName = rest.join(' ').trim();

    if (!subCmd || subCmd.toLowerCase() === 'help') {
      return message.reply('🌈 **คำสั่งจัดการเมนูพิเศษ:**\n`!cafe add {ชื่อเมนู}` — เพิ่มเมนูระดับ **? • Create one**\n`!cafe remove {ชื่อเมนู}` — ลบเมนูระดับ **? • Create one**');
    }

    if (subCmd.toLowerCase() === 'add') {
      const res = await priceCatalog.addMysteryMenuToCatalog(menuName);
      if (!res.ok) return message.reply(`⚠️ ${res.error}`);
      return message.reply(`🌈 เพิ่มเมนูพิเศษ **"${res.name}"** เข้าสู่หมวด **[ ? • Create one ]** (สุ่มราคา 199 - 999 เหรียญทอง) เรียบร้อยแล้วค่ะ!`);
    }

    if (subCmd.toLowerCase() === 'remove' || subCmd.toLowerCase() === 'del') {
      const res = await priceCatalog.removeMysteryMenuFromCatalog(menuName);
      if (!res.ok) return message.reply(`⚠️ ${res.error}`);
      return message.reply(`🗑️ ลบเมนู **"${res.name}"** ออกจากหมวด **[ ? • Create one ]** เรียบร้อยแล้วค่ะ!`);
    }
  }
};