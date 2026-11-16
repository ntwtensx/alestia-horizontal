const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

function createWebServer(botClient) {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // แชร์ตัวบอท Alestia ให้ทุกไฟล์ในฝั่ง API เรียกใช้งานได้ผ่าน req.app.get('bot')
  app.set('bot', botClient);

  // 1. จุดเช็กสถานะสำหรับ Koyeb และ Cron-job กันบอทหลับ (Anti-Sleep)
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'awake',
      bot: 'Alestia',
      online: botClient.isReady(),
      timestamp: new Date().toISOString()
    });
  });

  // 2. โหลดไฟล์ API ทั้งหมดจาก src/api/routes/ อัตโนมัติ
  const routesPath = path.join(__dirname, 'routes');
  if (fs.existsSync(routesPath)) {
    const routeFiles = fs.readdirSync(routesPath).filter(file => file.endsWith('.js'));
    for (const file of routeFiles) {
      const routeModule = require(path.join(routesPath, file));
      if (routeModule.basePath && routeModule.router) {
        app.use(routeModule.basePath, routeModule.router);
        console.log(`🌐 [Loader] โหลด Web API: ${routeModule.basePath}`);
      }
    }
  }

  // 3. เสิร์ฟหน้าเว็บ React (เมื่อสั่ง Build ในโฟลเดอร์ client/dist แล้ว)
  const clientDistPath = path.join(__dirname, '../../client/dist');
  if (fs.existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(clientDistPath, 'index.html'));
    });
  }

  return app;
}

module.exports = createWebServer;