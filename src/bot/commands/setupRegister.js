const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits
} = require('discord.js');
const theme = require('../../config/theme');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-register')
    .setDescription('ติดตั้งหรือส่งปุ่ม "รับบัตรสมาชิก" สำหรับเชื่อมไปหน้าเว็บ /register')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(opt =>
      opt
        .setName('mode')
        .setDescription('เลือกรูปแบบการติดตั้งปุ่ม')
        .setRequired(true)
        .addChoices(
          { name: 'เชื่อมปุ่มเข้ากับข้อความเดิม (ID: 1524654022475120716)', value: 'edit_target' },
          { name: 'ส่งการ์ดพร้อมปุ่มรับบัตรสมาชิกใบใหม่ในห้องนี้', value: 'send_new' }
        )
    ),

  async execute(interaction, client) {
    const mode = interaction.options.getString('mode');
    const { registerChannelId, registerMessageId, registerButtonEmoji, registerButtonLabel } = theme.discordConfig;
    const baseUrl = (process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 8000}`).replace(/\/+$/, '');

    const interactiveBtn = new ButtonBuilder()
      .setCustomId('alestia_open_register')
      .setLabel(registerButtonLabel)
      .setEmoji(registerButtonEmoji)
      .setStyle(ButtonStyle.Primary);

    const directLinkBtn = new ButtonBuilder()
      .setLabel('เปิดหน้าเว็บ /register ทันที')
      .setStyle(ButtonStyle.Link)
      .setURL(`${baseUrl}/register`);

    const row = new ActionRowBuilder().addComponents(interactiveBtn, directLinkBtn);

    if (mode === 'edit_target') {
      try {
        const channel = await client.channels.fetch(registerChannelId);
        const msg = await channel.messages.fetch(registerMessageId);
        await msg.edit({ components: [row] });
        return interaction.reply({
          content: `✅ อัปเดตปุ่ม **${registerButtonLabel}** บนข้อความ \`${registerMessageId}\` เรียบร้อยแล้วค่ะ!`,
          ephemeral: true
        });
      } catch (err) {
        return interaction.reply({
          content: `⚠️ ไม่สามารถแก้ไขข้อความ \`${registerMessageId}\` ได้ (ข้อความนั้นอาจไม่ได้ถูกส่งโดยบอทตัวนี้ค่ะ แนะนำให้เลือกโหมด **"ส่งการ์ดพร้อมปุ่มรับบัตรสมาชิกใบใหม่"** แทนนะคะ)`,
          ephemeral: true
        });
      }
    }

    const embed = new EmbedBuilder()
      .setColor(theme.colors.pastelPink)
      .setTitle(`🪪 จุดทำบัตรสมาชิกคาเฟ่ ${theme.serverName}`)
      .setDescription(
        `ยินดีต้อนรับสู่ **${theme.serverName} Cafe** ค่ะ! ☕\n` +
        `กรุณากดที่ปุ่ม **${registerButtonLabel}** ด้านล่าง เพื่อเข้าสู่หน้าเว็บตั้งชื่อเล่นประจำร้านและรหัส PIN ของคุณ\n\n` +
        `🎁 **เมื่อลงทะเบียนสำเร็จจะได้รับ:**\n` +
        `• ยศสมาชิกประจำร้าน <@&${theme.discordConfig.memberRoleId}>\n` +
        `• ยศยืนยันรหัส PIN <@&${theme.discordConfig.pinRoleId}>`
      )
      .setFooter({ text: theme.footerText })
      .setTimestamp();

    await interaction.channel.send({ embeds: [embed], components: [row] });
    return interaction.reply({
      content: '🌸 ส่งการ์ดรับบัตรสมาชิกในห้องนี้เรียบร้อยแล้วค่ะ!',
      ephemeral: true
    });
  }
};