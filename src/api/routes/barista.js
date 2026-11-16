const router = require('express').Router();
const { ChannelType, EmbedBuilder } = require('discord.js');
const theme = require('../../config/theme');

// 1. ดึงรายชื่อเซิร์ฟเวอร์และห้องแชทที่ Alestia สามารถส่งข้อความได้
router.get('/channels', (req, res) => {
  const bot = req.app.get('bot');

  if (!bot.isReady()) {
    return res.status(503).json({ error: 'ขณะนี้ Alestia กำลังเตรียมเปิดร้าน ยังไม่พร้อมใช้งานค่ะ' });
  }

  const channelsList = [];

  bot.guilds.cache.forEach(guild => {
    guild.channels.cache
      .filter(ch => ch.type === ChannelType.GuildText)
      .forEach(ch => {
        channelsList.push({
          id: ch.id,
          name: ch.name,
          guildName: guild.name
        });
      });
  });

  res.json({ channels: channelsList });
});

// 2. รับคำสั่งจากหน้าเว็บเพื่อส่งการ์ดข้อความ (Embed) เข้าห้อง Discord
router.post('/announce', async (req, res) => {
  const bot = req.app.get('bot');
  const { channelId, title, message, colorKey } = req.body;

  if (!channelId || !message) {
    return res.status(400).json({ error: 'กรุณาเลือกห้องแชทและพิมพ์ข้อความที่ต้องการเสิร์ฟค่ะ' });
  }

  try {
    const channel = await bot.channels.fetch(channelId);
    if (!channel || !channel.isTextBased()) {
      return res.status(404).json({ error: 'ไม่พบห้องแชทที่ระบุ หรือห้องนี้ไม่รองรับข้อความค่ะ' });
    }

    const selectedColor = theme.colors[colorKey] || theme.colors.pastelPink;

    const embed = new EmbedBuilder()
      .setColor(selectedColor)
      .setTitle(title ? `☕ ${title}` : `🌸 ข้อความจากบาริสต้า ${theme.botName}`)
      .setDescription(message)
      .setFooter({ text: theme.footerText })
      .setTimestamp();

    await channel.send({ embeds: [embed] });

    res.json({
      success: true,
      message: `เสิร์ฟข้อความไปยังห้อง #${channel.name} เรียบร้อยแล้วค่ะ! 🍰`
    });
  } catch (error) {
    console.error('❌ [Barista API Error]:', error);
    res.status(500).json({ error: 'ไม่สามารถส่งข้อความเข้าห้องนั้นได้ (ตรวจสอบสิทธิ์บอทในห้องนั้นนะคะ)' });
  }
});

module.exports = {
  basePath: '/api/barista',
  router
};