require('dotenv').config();
const connectDB = require('./config/db');
const createBotClient = require('./bot/botClient');
const createWebServer = require('./api/server');

async function startAlestiaSystem() {
  console.log('☕ กำลังเปิดร้านคาเฟ่ Horizontal และปลุกบาริสต้า Alestia...');

  // 1. เชื่อมต่อฐานข้อมูล MongoDB
  await connectDB();

  // 2. สร้างและเตรียมตัวบอท Alestia
  const botClient = createBotClient();

  // 3. สร้างและเปิด Web Server (Express) พร้อมส่งตัวบอทเข้าไปเชื่อมกัน
  const app = createWebServer(botClient);
  const PORT = process.env.PORT || 8000;

  app.listen(PORT, () => {
    console.log(`🍰 [Web Server] หน้าเว็บและ API รันอยู่ที่ http://localhost:${PORT}`);
    console.log(`🍵 [API Check] ทดสอบดูข้อมูลบอทได้ที่ http://localhost:${PORT}/api/status`);
  });

  // 4. ล็อกอินบอทเข้าสู่ระบบ Discord
  if (!process.env.DISCORD_TOKEN || process.env.DISCORD_TOKEN === 'your_discord_bot_token_here') {
    console.warn('⚠️ [คำเตือน] กรุณาใส่ DISCORD_TOKEN ของจริงในไฟล์ .env เพื่อให้ Alestia ออนไลน์');
  } else {
    await botClient.login(process.env.DISCORD_TOKEN);
  }
}

startAlestiaSystem();