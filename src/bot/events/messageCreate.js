const priceCatalog = require('../../utils/menuPriceCatalog');
const memory = require('../../utils/sharedMemory');
const voiceTracker = require('../modules/voiceTracker');
const theme = require('../../config/theme');

const CAFE_CHANNEL_ID = theme.discordConfig?.cafeVoiceChannelId || '995629374722297946';

module.exports = {
  name: 'messageCreate',
  once: false,
  async execute(message, client) {
    if (!message || message.author?.bot || !message.content) return;
    const content = message.content.trim();
    const activeClient = client || message.client;

    // ==========================================
    // 🍹 1. ตรวจจับการสั่งเมนูของสมาชิกที่เพิ่งเข้าห้องเสียงคาเฟ่ (เฉพาะในห้องแชทคาเฟ่ภายใน 1 นาที)
    // ==========================================
    if (
      message.channel.id === CAFE_CHANNEL_ID &&
      memory.pendingOrders &&
      memory.pendingOrders.has(message.author.id) &&
      !content.startsWith('!')
    ) {
      const pending = memory.pendingOrders.get(message.author.id);
      const parsed = priceCatalog.parseNaturalOrder(content, pending.userDataDB);

      if (parsed.intent === 'ORDER' || parsed.intent === 'RANDOM_ORDER') {
        await voiceTracker.confirmMemberOrder(message.author.id, parsed.orderDetails, activeClient);
        return;
      }

      if (parsed.intent === 'HESITATE_KICK') {
        await voiceTracker.rejectAndKickMember(message.author.id, 'HESITATE', activeClient);
        return;
      }

      if (parsed.intent === 'REFUSE_KICK') {
        await voiceTracker.rejectAndKickMember(message.author.id, 'REFUSE', activeClient);
        return;
      }

      if (parsed.intent === 'UNKNOWN_DRINK') {
        const extras = [parsed.matchedTopping, parsed.matchedDessert].filter(Boolean).join(' + ');
        const extraNote = extras ? ` (จดส่วนเสริม **${extras}** ไว้ให้แล้วค่ะ)` : '';
        const unknownHint = await message
          .reply(`☕ อเลสเทียไม่แน่ใจว่า **"${parsed.unknownText}"** คือเมนูเครื่องดื่มตัวไหนค่ะ${extraNote} ลองพิมพ์ชื่อน้ำอีกครั้ง หรือพิมพ์ว่า **"สุ่มเลย"** ให้บอทเลือกให้ได้นะคะ!`)
          .catch(() => null);
        if (unknownHint) {
          setTimeout(() => unknownHint.delete().catch(() => null), 8000);
        }
        return;
      }

      // กรณีพิมพ์ข้อความคุยทั่วไปที่ยังหาเมนูไม่เจอ ให้กระซิบแนะนำสั้นๆ แล้วลบออกใน 6 วินาที
      const hintMsg = await message
        .reply('☕ อเลสเทียยังหาชื่อเมนูในข้อความไม่เจอค่ะ ลองพิมพ์ชื่อเครื่องดื่ม (เช่น *ชาไทย, เลมอน, โกโก้ใส่ไข่มุก, ชีสเค้ก*) บอกแนวรสชาติ (*หวานๆ, ตื่นๆ, เปรี้ยวๆ*) หรือพิมพ์ว่า **"สุ่มเลย"** ได้นะคะ!')
        .catch(() => null);
      if (hintMsg) {
        setTimeout(() => hintMsg.delete().catch(() => null), 6000);
      }
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