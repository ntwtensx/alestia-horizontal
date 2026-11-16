const {
  ActivityType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const theme = require('../../config/theme');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`🌸 [Alestia] บาริสต้า ${client.user.tag} พร้อมเสิร์ฟกาแฟใน Horizontal แล้ว!`);

    client.user.setActivity('กำลังดริปกาแฟที่ Horizontal ☕', {
      type: ActivityType.Custom,
      state: '☕ กำลังชงเครื่องดื่มต้อนรับสมาชิก Horizontal'
    });

    // 1. ลงทะเบียน Slash Commands ทั้งหมดอัตโนมัติ
    try {
      const commandsData = client.commands.map(cmd => cmd.data.toJSON());
      const existingCommands = await client.application.commands.fetch();
      const entryPoints = existingCommands.filter(cmd => cmd.type === 4);

      if (entryPoints.size > 0) {
        try {
          const payload = [
            ...commandsData,
            ...entryPoints.map(cmd => ({
              name: cmd.name,
              description: cmd.description || '',
              type: cmd.type
            }))
          ];
          await client.application.commands.set(payload);
        } catch (innerError) {
          if (innerError.code === 50240) {
            for (const [id] of entryPoints) {
              await client.application.commands.delete(id);
            }
            await client.application.commands.set(commandsData);
          } else {
            throw innerError;
          }
        }
      } else {
        await client.application.commands.set(commandsData);
      }

      console.log(`📋 [Alestia] อัปเดต Slash Commands จำนวน ${commandsData.length} คำสั่งเรียบร้อย!`);
    } catch (error) {
      console.error('❌ [Alestia] ไม่สามารถลงทะเบียน Slash Commands ได้:', error);
    }

    // 2. ซิงก์รายชื่อสมาชิกในเซิร์ฟเวอร์ Horizontal และเชื่อมปุ่มรับบัตรสมาชิกที่ข้อความเป้าหมาย
    try {
      const { guildId, registerChannelId, registerMessageId, registerButtonEmoji, registerButtonLabel } = theme.discordConfig;
      const guild = client.guilds.cache.get(guildId) || client.guilds.cache.first();

      if (guild) {
        await guild.members.fetch().catch(() => null);
        console.log(`👥 [Alestia] ซิงก์รายชื่อสมาชิกเซิร์ฟเวอร์ ${guild.name} เข้าสู่ระบบเรียบร้อย!`);
      }

      const channel = await client.channels.fetch(registerChannelId).catch(() => null);
      if (channel && channel.isTextBased()) {
        const targetMsg = await channel.messages.fetch(registerMessageId).catch(() => null);

        if (targetMsg && targetMsg.author.id === client.user.id) {
          const registerBtn = new ButtonBuilder()
            .setCustomId('alestia_open_register')
            .setLabel(registerButtonLabel)
            .setEmoji(registerButtonEmoji)
            .setStyle(ButtonStyle.Primary);

          const row = new ActionRowBuilder().addComponents(registerBtn);
          await targetMsg.edit({ components: [row] });
          console.log(`🪪 [Alestia] ติดตั้งปุ่ม "${registerButtonLabel}" บนข้อความ ${registerMessageId} เรียบร้อยแล้ว!`);
        } else if (targetMsg) {
          console.log(`ℹ️ [Alestia] พบข้อความ ${registerMessageId} แล้ว พร้อมดักจับการกดปุ่มรับบัตรสมาชิก!`);
        }
      }
    } catch (err) {
      console.warn('⚠️ [Alestia] ไม่สามารถตรวจสอบข้อความปุ่มรับบัตรสมาชิกอัตโนมัติได้:', err.message);
    }
  }
};