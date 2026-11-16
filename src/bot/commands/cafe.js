const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const theme = require('../../config/theme');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cafe')
    .setDescription('แวะทักทาย Alestia และเช็กบรรยากาศคาเฟ่ Horizontal'),

  async execute(interaction, client) {
    const embed = new EmbedBuilder()
      .setColor(theme.colors.pastelPink)
      .setTitle(`🌸 ยินดีต้อนรับสู่ ${theme.serverName} Cafe ค่ะ!`)
      .setDescription(
        `สวัสดีค่ะคุณ **${interaction.user.displayName}** 🍵\n` +
        `ดิฉัน **${theme.botName}** บาริสต้าและผู้ดูแลประจำเซิร์ฟเวอร์ พร้อมให้บริการแล้วค่ะ\n\n` +
        `> *"รับลาเต้เย็นหวานน้อย หรือมัทฉะอุ่นๆ นั่งฟังเพลงชิลๆ ดีคะวันนี้?"*`
      )
      .addFields(
        { name: '🏠 เซิร์ฟเวอร์', value: `${interaction.guild ? interaction.guild.name : theme.serverName}`, inline: true },
        { name: '👥 ลูกค้าในร้านตอนนี้', value: `${interaction.guild ? interaction.guild.memberCount : 1} ท่าน`, inline: true },
        { name: '✨ ความไวในการเสิร์ฟ (Ping)', value: `${client.ws.ping} ms`, inline: true }
      )
      .setFooter({ text: theme.footerText })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};