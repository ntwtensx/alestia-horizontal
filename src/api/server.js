const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

let theme = {};
try {
  theme = require('../config/theme');
} catch (_) {}

function joinUrlPath(base, sub) {
  const cleanBase = String(base || '').replace(/\/+$/, '');
  const cleanSub = String(sub || '').replace(/^\/+/, '');
  if (!cleanSub) return cleanBase || '/';
  return `${cleanBase}/${cleanSub}`;
}

function resolveBaseUrl(port = process.env.PORT || 8000) {
  let raw = process.env.PUBLIC_URL || '';
  if (!raw && process.env.KOYEB_PUBLIC_DOMAIN) {
    raw = process.env.KOYEB_PUBLIC_DOMAIN.startsWith('http')
      ? process.env.KOYEB_PUBLIC_DOMAIN
      : `https://${process.env.KOYEB_PUBLIC_DOMAIN}`;
  }
  if (!raw && theme?.publicUrl) {
    raw = theme.publicUrl;
  }
  if (!raw) {
    raw = `http://localhost:${port}`;
  }
  return String(raw).replace(/\/+$/, '');
}

function extractRouterEndpoints(basePath, router) {
  const endpoints = [];
  if (!router || !Array.isArray(router.stack)) return endpoints;

  for (const layer of router.stack) {
    if (!layer.route) continue;
    const methods = Object.keys(layer.route.methods || {})
      .filter((m) => layer.route.methods[m])
      .map((m) => m.toUpperCase());

    const paths = Array.isArray(layer.route.path) ? layer.route.path : [layer.route.path];
    for (const subPath of paths) {
      const fullPath = joinUrlPath(basePath, subPath);
      for (const method of methods) {
        endpoints.push({ method, path: fullPath });
      }
    }
  }
  return endpoints;
}

function createWebServer(botClient) {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.set('bot', botClient);

  const registeredSystemLinks = [];
  const registeredWebLinks = [];
  const registeredApiLinks = [];
  const failedRouteFiles = [];

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
  registeredSystemLinks.push({
    method: 'GET',
    path: '/health',
    label: 'Keep-Alive / Cron-job'
  });

  // 2. โหลด API ทั้งหมดจาก src/api/routes/ อัตโนมัติ พร้อมเก็บรายการลิงก์ที่โหลดสำเร็จ
  const routesPath = path.join(__dirname, 'routes');
  if (fs.existsSync(routesPath)) {
    const routeFiles = fs.readdirSync(routesPath).filter((file) => file.endsWith('.js'));
    for (const file of routeFiles) {
      try {
        const routeModule = require(path.join(routesPath, file));
        if (routeModule.basePath && routeModule.router) {
          app.use(routeModule.basePath, routeModule.router);
          const endpoints = extractRouterEndpoints(routeModule.basePath, routeModule.router);
          endpoints.forEach((ep) => {
            registeredApiLinks.push({ ...ep, sourceFile: file });
          });
          console.log(`🌐 [Loader] โหลด Web API: ${routeModule.basePath} (${endpoints.length} endpoints)`);
        }
      } catch (err) {
        failedRouteFiles.push({ file, error: err.message });
        console.error(`❌ [Loader] โหลดไฟล์ ${file} ไม่สำเร็จ:`, err.message);
      }
    }
  }

  // 3. เสิร์ฟไฟล์หน้าเว็บจาก src/public/
  const publicPath = path.join(__dirname, '../public');
  const registerHtmlFile = path.join(publicPath, 'register.html');
  const dashboardHtmlFile = path.join(publicPath, 'dashboard.html');
  const menuHtmlFile = path.join(publicPath, 'menu.html');

  if (fs.existsSync(publicPath)) {
    app.use(express.static(publicPath));
  }

  // หน้าสมุดเมนูพิเศษสำหรับกดคัดลอกออเดอร์ (/menu)
  app.get(['/menu', '/menu/*'], (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (fs.existsSync(menuHtmlFile)) return res.sendFile(menuHtmlFile);
    res.status(404).send('⚠️ ไม่พบไฟล์ src/public/menu.html');
  });

  if (fs.existsSync(menuHtmlFile)) {
    registeredWebLinks.push({ path: '/menu', label: 'หน้าสมุดเมนูพิเศษ & คัดลอกออเดอร์ด่วน' });
  }

  // หน้าลงทะเบียนบัตรสมาชิก (/register)
  app.get(['/register', '/register/*'], (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (fs.existsSync(registerHtmlFile)) return res.sendFile(registerHtmlFile);
    res.status(404).send('⚠️ ไม่พบไฟล์ src/public/register.html');
  });

  if (fs.existsSync(registerHtmlFile)) {
    registeredWebLinks.push({ path: '/register', label: 'หน้าลงทะเบียนบัตรสมาชิกโฮโลแกรม' });
  }

  // หน้าบอร์ดสมุดบันทึก & ใบเสร็จคาเฟ่ + ทำเนียบสมาชิก (/, /members)
  app.get(['/', '/members'], (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (fs.existsSync(dashboardHtmlFile)) return res.sendFile(dashboardHtmlFile);
    if (fs.existsSync(registerHtmlFile)) return res.sendFile(registerHtmlFile);
    res.status(200).send('☕ Horizontal Cafe Server is running!');
  });

  if (fs.existsSync(dashboardHtmlFile)) {
    registeredWebLinks.push(
      { path: '/', label: 'หน้าหลัก บอร์ดใบเสร็จคาเฟ่' },
      { path: '/members', label: 'หน้าทำเนียบสมาชิกโฮโลแกรม' }
    );
  }

  // 4. ฟังก์ชันพิมพ์สรุปลิงก์ทั้งหมดที่ทำงานสำเร็จลงใน Console
  app.getBaseUrl = resolveBaseUrl;
  app.printStartupSummary = (port = process.env.PORT || 8000) => {
    const baseUrl = resolveBaseUrl(port);
    const localUrl = `http://localhost:${port}`;
    const line = '═'.repeat(62);

    console.log(`\n╔${line}╗`);
    console.log(`║ ☕ HORIZONTAL CAFE — ACTIVE LINKS & ENDPOINTS SUMMARY        ║`);
    console.log(`╚${line}╝`);
    console.log(`🌐 Base URL (โดเมนหลัก): ${baseUrl}`);
    if (!baseUrl.includes('localhost')) {
      console.log(`🏠 Local URL (ภายใน):    ${localUrl}`);
    }

    console.log(`\n💓 [System & Keep-Alive] (ใช้ลิงก์นี้ตั้ง Cron-job ปลุกบอท)`);
    registeredSystemLinks.forEach((item) => {
      console.log(`   ✅ [${item.method.padEnd(4)}] ${baseUrl}${item.path}  (${item.label})`);
    });

    console.log(`\n🖥️  [Web Pages] (${registeredWebLinks.length} หน้าพร้อมใช้งาน)`);
    if (registeredWebLinks.length === 0) {
      console.log(`   ⚠️ ไม่พบไฟล์หน้าเว็บใน src/public/`);
    } else {
      registeredWebLinks.forEach((item) => {
        console.log(`   ✅ [PAGE] ${baseUrl}${item.path}  — ${item.label}`);
      });
    }

    console.log(`\n🔌 [API Endpoints] (${registeredApiLinks.length} เส้นทางที่โหลดสำเร็จ)`);
    if (registeredApiLinks.length === 0) {
      console.log(`   ⚠️ ไม่พบ API Endpoints`);
    } else {
      registeredApiLinks.forEach((item) => {
        console.log(`   ✅ [${item.method.padEnd(4)}] ${baseUrl}${item.path}  (${item.sourceFile})`);
      });
    }

    if (failedRouteFiles.length > 0) {
      console.log(`\n⚠️ [Failed Routes] (${failedRouteFiles.length} ไฟล์โหลดไม่สำเร็จ)`);
      failedRouteFiles.forEach((f) => {
        console.log(`   ❌ ${f.file}: ${f.error}`);
      });
    }

    console.log(`${'─'.repeat(64)}\n`);
  };

  return app;
}

module.exports = createWebServer;