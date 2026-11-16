const theme = require('../../config/theme');

module.exports = {
  name: 'interactionCreate',
  once: false,
  async execute(interaction, client) {
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