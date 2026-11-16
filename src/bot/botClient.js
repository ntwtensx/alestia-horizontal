const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');

function createBotClient() {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent
    ]
  });

  // เก็บรายการคำสั่งทั้งหมดไว้ใน client.commands
  client.commands = new Collection();

  // 1. โหลดไฟล์คำสั่งทั้งหมดจาก src/bot/commands/
  const commandsPath = path.join(__dirname, 'commands');
  if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
      const command = require(path.join(commandsPath, file));
      if (command.data && command.execute) {
        client.commands.set(command.data.name, command);
        console.log(`🧁 [Loader] โหลดคำสั่งบอท: /${command.data.name}`);
      }
    }
  }

  // 2. โหลดไฟล์เหตุการณ์ทั้งหมดจาก src/bot/events/
  const eventsPath = path.join(__dirname, 'events');
  if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    for (const file of eventFiles) {
      const event = require(path.join(eventsPath, file));
      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
      } else {
        client.on(event.name, (...args) => event.execute(...args, client));
      }
      console.log(`✨ [Loader] โหลดเหตุการณ์บอท: ${event.name}`);
    }
  }

  return client;
}

module.exports = createBotClient;