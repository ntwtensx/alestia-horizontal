const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

function createWebServer(botClient) {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.set('bot', botClient);

  // 1. จุดเช็กสถานะ Keep-Alive สำหรับ Koyeb และ Cron-job
  app.get('/health', (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.status(200).json({
      status: 'AWAKE',
      botReady: botClient.isReady(),
      wsPing: botClient.ws?.ping || 0,
      dbReady: mongoose.connection.readyState === 1,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: Date.now()
    });
  });

  // 2. โหลด API ทั้งหมดจาก src/api/routes/ อัตโนมัติ
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

  // 3. เสิร์ฟไฟล์หน้าเว็บจาก src/public/
  const publicPath = path.join(__dirname, '../public');
  const registerHtmlFile = path.join(publicPath, 'register.html');
  const dashboardHtmlFile = path.join(publicPath, 'dashboard.html');

  if (fs.existsSync(publicPath)) {
    app.use(express.static(publicPath));
  }

  // หน้าลงทะเบียนบัตรสมาชิก (/register)
  app.get(['/register', '/register/*'], (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (fs.existsSync(registerHtmlFile)) return res.sendFile(registerHtmlFile);
    res.status(404).send('⚠️ ไม่พบไฟล์ src/public/register.html');
  });

  // หน้าบอร์ดสมุดบันทึก & ใบเสร็จคาเฟ่ + ทำเนียบสมาชิก (/, /members, /bank)
  app.get(['/', '/members', '/bank'], (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (fs.existsSync(dashboardHtmlFile)) return res.sendFile(dashboardHtmlFile);
    if (fs.existsSync(registerHtmlFile)) return res.sendFile(registerHtmlFile);
    res.status(200).send('☕ Horizontal Cafe Server is running!');
  });

  return app;
}

module.exports = createWebServer;