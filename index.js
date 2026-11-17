require('dotenv').config();
const connectDB = require('./src/config/db');
const botModule = require('./src/bot/botClient');
const createWebServer = require('./src/api/server');

const PORT = process.env.PORT || 8000;

async function startHorizontalCafe() {
  try {
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
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🌐 [Web Server] เปิดให้บริการที่พอร์ต ${PORT} เรียบร้อยแล้ว!`);
    });

    // 4. ล็อกอินบอทเข้าสู่ Discord
    const token = process.env.DISCORD_TOKEN || process.env.TOKEN;
    if (!token) {
      console.error('❌ [Bot Error] ไม่พบค่า DISCORD_TOKEN ใน Environment Variables!');
    } else {
      await client.login(token);
    }
  } catch (err) {
    console.error('❌ [Startup Error]:', err);
  }
}

// ป้องกันเซิร์ฟเวอร์ดับกรณีเกิด Error ไม่คาดคิด
process.on('unhandledRejection', (err) => {
  console.warn('⚠️ [Unhandled Rejection]:', err?.message || err);
});

process.on('uncaughtException', (err) => {
  console.warn('⚠️ [Uncaught Exception]:', err?.message || err);
});

startHorizontalCafe();