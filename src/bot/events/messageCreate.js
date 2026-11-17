const priceCatalog = require('../../utils/menuPriceCatalog');

module.exports = {
  name: 'messageCreate',
  once: false,
  async execute(message) {
    if (!message || message.author?.bot || !message.content) return;
    const content = message.content.trim();
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