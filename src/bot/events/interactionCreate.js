const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const theme = require('../../config/theme');

module.exports = {
  name: 'interactionCreate',
  once: false,
  async execute(interaction, client) {
    // 1. จัดการเมื่อมีคนกดปุ่ม (Button Interaction)
    if (interaction.isButton()) {
      const { registerMessageId, registerButtonEmoji, registerButtonLabel } = theme.discordConfig;
      const isTargetRegisterMsg = interaction.message?.id === registerMessageId;
      const isRegisterCustomId =
        interaction.customId === 'alestia_open_register' ||
        interaction.customId.toLowerCase().includes('register') ||
        interaction.customId.toLowerCase().includes('member');

      if (isTargetRegisterMsg || isRegisterCustomId) {
        const baseUrl = (process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 8000}`).replace(/\/+$/, '');
        const personalRegisterUrl = `${baseUrl}/register?id=${interaction.user.id}`;

        const embed = new EmbedBuilder()
          .setColor(theme.colors.pastelPink)
          .setTitle(`🪪 บัตรเชิญลงทะเบียนสมาชิก ${theme.serverName} Cafe`)
          .setDescription(
            `สวัสดีค่ะคุณ **${interaction.user.displayName}** 🌸\n` +
            `คลิกที่ปุ่มด้านล่างเพื่อเข้าสู่หน้าเว็บ **ลงทะเบียนชื่อเล่นประจำคาเฟ่ & ตั้งรหัส PIN** ได้เลยนะคะ\n\n` +
            `✨ **สิทธิพิเศษเมื่อลงทะเบียนเสร็จสิ้น:**\n` +
            `• รับยศสมาชิก <@&${theme.discordConfig.memberRoleId}> อัตโนมัติ\n` +
            `• รับยศกุญแจนิรภัย <@&${theme.discordConfig.pinRoleId}> เมื่อตั้งรหัส PIN\n` +
            `• ระบบกรอกรหัส Discord ID (\`${interaction.user.id}\`) ให้คุณอัตโนมัติแล้วค่ะ!`
          )
          .setThumbnail(interaction.user.displayAvatarURL({ extension: 'png', size: 256 }))
          .setFooter({ text: theme.footerText })
          .setTimestamp();

        const linkBtn = new ButtonBuilder()
          .setLabel(`${registerButtonLabel} (เปิดหน้าเว็บลงทะเบียน)`)
          .setEmoji(registerButtonEmoji)
          .setStyle(ButtonStyle.Link)
          .setURL(personalRegisterUrl);

        const row = new ActionRowBuilder().addComponents(linkBtn);

        return interaction.reply({
          embeds: [embed],
          components: [row],
          ephemeral: true
        });
      }
      return;
    }

    // 2. จัดการคำสั่ง Slash Commands (/...)
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction, client);
    } catch (error) {
      console.error(`❌ [Command Error] /${interaction.commandName}:`, error);
      const errorMessage = {
        content: `🍓 ขออภัยค่ะคุณลูกค้า ดูเหมือนเครื่องชงกาแฟของ ${theme.botName} จะสะดุดนิดหน่อย ลองใหม่อีกครั้งนะคะ`,
        ephemeral: true
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage);
      } else {
        await interaction.reply(errorMessage);
      }
    }
  }
};