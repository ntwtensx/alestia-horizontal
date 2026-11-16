const { ActivityType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const theme = require('../../config/theme');
const menuCatalog = require('../../utils/menuPriceCatalog');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`🌸 [Alestia] ${client.user.tag} ออนไลน์แล้ว!`);
    client.user.setActivity('กำลังดริปกาแฟที่ Horizontal ☕', {
      type: ActivityType.Custom,
      state: '☕ กำลังชงเครื่องดื่มต้อนรับสมาชิก Horizontal'
    });

    await menuCatalog.syncPricesToDatabase();

    try {
      const commandsData = client.commands.map(cmd => cmd.data.toJSON());
      const existing = await client.application.commands.fetch();
      const entryPoints = existing.filter(cmd => cmd.type === 4);

      if (entryPoints.size > 0) {
        try {
          await client.application.commands.set([
            ...commandsData,
            ...entryPoints.map(c => ({ name: c.name, description: c.description || '', type: c.type }))
          ]);
        } catch (e) {
          if (e.code === 50240) {
            for (const [id] of entryPoints) await client.application.commands.delete(id);
            await client.application.commands.set(commandsData);
          } else throw e;
        }
      } else {
        await client.application.commands.set(commandsData);
      }
    } catch (err) {
      console.error('❌ [Slash Error]:', err.message);
    }

    try {
      const { guildId, registerChannelId, registerMessageId, registerButtonEmoji, registerButtonLabel } = theme.discordConfig;
      const guild = client.guilds.cache.get(guildId) || client.guilds.cache.first();
      if (guild) await guild.members.fetch().catch(() => null);

      const channel = await client.channels.fetch(registerChannelId).catch(() => null);
      if (channel?.isTextBased()) {
        const targetMsg = await channel.messages.fetch(registerMessageId).catch(() => null);
        if (targetMsg && targetMsg.author.id === client.user.id) {
          const btn = new ButtonBuilder()
            .setCustomId('alestia_open_register')
            .setLabel(registerButtonLabel)
            .setEmoji(registerButtonEmoji)
            .setStyle(ButtonStyle.Primary);
          await targetMsg.edit({ components: [new ActionRowBuilder().addComponents(btn)] });
        }
      }
    } catch (err) {
      console.warn('⚠️ [Init Button]:', err.message);
    }
  }
};