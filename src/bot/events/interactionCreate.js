const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const theme = require('../../config/theme');

module.exports = {
  name: 'interactionCreate',
  once: false,
  async execute(interaction, client) {
    if (interaction.isButton()) {
      const { registerMessageId, memberRoleId, pinRoleId, registerButtonEmoji, registerButtonLabel } = theme.discordConfig;
      const isRegisterBtn =
        interaction.message?.id === registerMessageId ||
        interaction.customId === 'alestia_open_register' ||
        interaction.customId.toLowerCase().includes('register');

      if (isRegisterBtn) {
        if (interaction.member?.roles?.cache?.has(memberRoleId)) {
          return interaction.reply({
            content: `🪪 คุณมีบัตรสมาชิก <@&${memberRoleId}> อยู่แล้วค่ะ (สงวนสิทธิ์ลงทะเบียนเฉพาะผู้ที่ยังไม่มีบัตรสมาชิกนะคะ)`,
            ephemeral: true
          });
        }

        const personalUrl = `${theme.publicUrl}/register?id=${interaction.user.id}`;
        const embed = new EmbedBuilder()
          .setColor(theme.colors.pastelPink)
          .setTitle(`🪪 จุดลงทะเบียนบัตรสมาชิก ${theme.serverName} Cafe`)
          .setDescription(
            `สวัสดีค่ะคุณ **${interaction.user.displayName}** 🌸\n` +
            `กดปุ่มด้านล่างเพื่อเปิดหน้าลงทะเบียนส่วนตัวของคุณได้เลยค่ะ (ระบบดึงโปรไฟล์ให้เรียบร้อยแล้ว)\n\n` +
            `✨ **เมื่อบันทึกสำเร็จจะได้รับ:** <@&${memberRoleId}> และ <@&${pinRoleId}>`
          )
          .setThumbnail(interaction.user.displayAvatarURL({ extension: 'png', size: 256 }))
          .setFooter({ text: theme.footerText });

        const linkBtn = new ButtonBuilder()
          .setLabel(`${registerButtonLabel} (${interaction.user.displayName})`)
          .setEmoji(registerButtonEmoji)
          .setStyle(ButtonStyle.Link)
          .setURL(personalUrl);

        return interaction.reply({
          embeds: [embed],
          components: [new ActionRowBuilder().addComponents(linkBtn)],
          ephemeral: true
        });
      }
      return;
    }

    if (!interaction.isChatInputCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction, client);
    } catch (err) {
      const msg = { content: `🍓 ระบบขัดข้องชั่วคราว ลองใหม่อีกครั้งนะคะ`, ephemeral: true };
      if (interaction.replied || interaction.deferred) await interaction.followUp(msg);
      else await interaction.reply(msg);
    }
  }
};