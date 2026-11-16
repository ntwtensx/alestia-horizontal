const router = require('express').Router();
const mongoose = require('mongoose');
const theme = require('../../config/theme');

router.get('/', (req, res) => {
  // ดึงตัวบอทที่แชร์มาจาก server.js
  const bot = req.app.get('bot');

  res.json({
    botName: theme.botName,
    serverName: theme.serverName,
    roleTitle: theme.roleTitle,
    palette: theme.webPalette,
    isOnline: bot.isReady(),
    dbConnected: mongoose.connection.readyState === 1,
    botTag: bot.user ? bot.user.tag : 'กำลังเตรียมเปิดร้าน...',
    avatarUrl: bot.user ? bot.user.displayAvatarURL({ size: 256 }) : null,
    guildsCount: bot.guilds.cache.size,
    ping: bot.ws.ping
  });
});

module.exports = {
  basePath: '/api/status',
  router
};