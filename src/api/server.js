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

  // 3. เสิร์ฟหน้าเว็บ /register โดยตรงจากไฟล์ src/public/register.html (ไม่ต้องพึ่งการ Build ของ React)
  const publicPath = path.join(__dirname, '../public');
  const registerHtmlFile = path.join(publicPath, 'register.html');

  if (fs.existsSync(publicPath)) {
    app.use('/public', express.static(publicPath));
  }

  app.get(['/register', '/register/*'], (req, res) => {
    if (fs.existsSync(registerHtmlFile)) {
      return res.sendFile(registerHtmlFile);
    }
    res.status(404).send('⚠️ ไม่พบไฟล์ src/public/register.html บนเซิร์ฟเวอร์ค่ะ');
  });

  // 4. เสิร์ฟหน้าเว็บ React สำหรับหน้าแรก (หากมีโฟลเดอร์ client/dist) หรือส่งไปหน้า /register อัตโนมัติหากไม่ได้ Build React
  const clientDistPath = path.join(__dirname, '../../client/dist');
  const clientIndexHtml = path.join(clientDistPath, 'index.html');

  if (fs.existsSync(clientIndexHtml)) {
    app.use(express.static(clientDistPath));
    app.get('*', (req, res) => {
      res.sendFile(clientIndexHtml);
    });
  } else {
    app.get('/', (req, res) => {
      if (fs.existsSync(registerHtmlFile)) {
        return res.sendFile(registerHtmlFile);
      }
      res.status(200).send('🌸 Alestia Horizontal Server is running! เข้าใช้งานหน้าลงทะเบียนได้ที่ /register');
    });
  }

  return app;
}

module.exports = createWebServer;