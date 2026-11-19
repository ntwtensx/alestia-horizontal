require('dotenv').config();
const ffmpegPath = require('ffmpeg-static');
if (ffmpegPath) {
  process.env.FFMPEG_PATH = ffmpegPath;
}

const { Events } = require('discord.js');
const connectDB = require('./src/config/db');
const botModule = require('./src/bot/botClient');
const createWebServer = require('./src/api/server');

const PORT = process.env.PORT || 8000;

function printBotIdentityUrls(client, baseUrl) {
  if (!client?.user) return;
  const botId = client.user.id;
  const botTag = client.user.tag || client.user.username;
  const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${botId}&permissions=8&scope=bot%20applications.commands`;
  const avatarUrl = client.user.displayAvatarURL({ extension: 'png', size: 256 });
  const guildCount = client.guilds?.cache?.size || 0;

  console.log(`\n🤖 ═══════════════ ALESTIA DISCORD BOT ONLINE ═══════════════`);
  console.log(`   ✨ ชื่อบอท:       ${botTag} (ID: ${botId})`);
  console.log(`   🏰 เซิร์ฟเวอร์:    ${guildCount} เซิร์ฟเวอร์`);
  console.log(`   🌐 Web Portal:   ${baseUrl}`);
  console.log(`   💓 Health Check: ${baseUrl}/health`);
  console.log(`   🔗 Bot Invite:   ${inviteUrl}`);
  console.log(`   🖼️  Bot Avatar:   ${avatarUrl}`);
  console.log(`════════════════════════════════════════════════════════════════\n`);
}

async function startHorizontalCafe() {
  try {
    console.log('☕ กำลังเปิดร้านคาเฟ่ Horizontal และปลุกบาริสต้า Alestia...');

    // 1. เชื่อมต่อฐานข้อมูล MongoDB
    if (typeof connectDB === 'function') {
      await connectDB();
    } else if (connectDB && typeof connectDB.connectDB === 'function') {
      await connectDB.connectDB();
    }

    // 2. เตรียมตัวบอท Alestia
    const client =
      typeof botModule === 'function'
        ? await botModule()
        : botModule.createBotClient
        ? await botModule.createBotClient()
        : botModule.client || botModule;

    // 3. เปิดระบบ Web Server สำหรับหน้าบอร์ดใบเสร็จ (/) หน้าลงทะเบียน (/register) และ Health Check (/health)
    const app = createWebServer(client);
    const baseUrl = typeof app.getBaseUrl === 'function' ? app.getBaseUrl(PORT) : `http://localhost:${PORT}`;

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🌐 [Web Server] เปิดให้บริการที่พอร์ต ${PORT} เรียบร้อยแล้ว!`);
      if (typeof app.printStartupSummary === 'function') {
        app.printStartupSummary(PORT);
      }
    });

    // 4. แสดง URL ของบอทและสถานะทันทีเมื่อเชื่อมต่อ Discord สำเร็จ
    client.once(Events.ClientReady, () => {
      printBotIdentityUrls(client, baseUrl);
    });

    // 5. ล็อกอินบอทเข้าสู่ Discord
    const token = process.env.DISCORD_TOKEN || process.env.TOKEN;
    if (!token) {
      console.error('❌ [Bot Error] ไม่พบค่า DISCORD_TOKEN ใน Environment Variables!');
    } else {
      await client.login(token);
      if (client.isReady()) {
        printBotIdentityUrls(client, baseUrl);
      }
    }
  } catch (err) {
    console.error('❌ [Startup Error]:', err);
  }
}

process.on('unhandledRejection', (err) => {
  console.warn('⚠️ [Unhandled Rejection]:', err?.message || err);
});

process.on('uncaughtException', (err) => {
  console.warn('⚠️ [Uncaught Exception]:', err?.message || err);
});

startHorizontalCafe();