const router = require('express').Router();
const CafeSession = require('../../models/CafeSession');
const UserDB = require('../../models/User');
const priceCatalog = require('../../utils/menuPriceCatalog');
const theme = require('../../config/theme');

const { guildId: TARGET_GUILD_ID, cafeVoiceChannelId: CAFE_CHANNEL_ID } = theme.discordConfig;

const setNoCacheHeaders = (res) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store'
  });
};

// GET /api/ledger — ดึงสมุดบันทึก ใบเสร็จ และแคตตาล็อกเมนูทั้งหมด
router.get('/', async (req, res) => {
  setNoCacheHeaders(res);
  try {
    const client = req.app.get('bot');
    await priceCatalog.syncMysteryMenusFromDB();

    const sessions = await CafeSession.find({}).sort({ createdAt: -1 }).limit(200).lean();

    const normalizedSessions = sessions.map((s) => {
      let dateKey = s.dateKey;
      if (!dateKey && s.createdAt) {
        dateKey = new Date(s.createdAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
      } else if (!dateKey) {
        dateKey = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
      }

      return {
        id: String(s._id),
        messageId: s.messageId || '',
        dateKey,
        isActive: Boolean(s.isActive),
        startTimeText: s.startTimeText || '--:--',
        endTimeText: s.endTimeText || '',
        authorName: s.authorName || 'ไม่ทราบชื่อ',
        authorAvatar: s.authorAvatar || 'https://cdn.discordapp.com/embed/avatars/0.png',
        totalRevenue: s.totalRevenue || 0,
        receipts: Array.isArray(s.receipts) ? s.receipts : [],
        logLines: Array.isArray(s.logLines) ? s.logLines : [],
        createdAt: s.createdAt || null,
        endedAt: s.endedAt || null
      };
    });

    const officialSsrPrices = priceCatalog.OFFICIAL_SSR_DRINK_PRICES
      ? Array.from(priceCatalog.OFFICIAL_SSR_DRINK_PRICES)
      : [180, 185, 190, 195, 200, 210, 215, 220, 225, 235, 240, 250, 260, 265, 280, 290, 295, 310, 330, 340, 350, 360, 380];

    res.status(200).json({
      ok: true,
      botReady: Boolean(client?.isReady()),
      botTag: client?.isReady() ? client.user.tag : 'กำลังซิงค์สัญญาณ...',
      serverDateKey: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }),
      sessions: normalizedSessions,
      menuCatalog: priceCatalog.getStructuredMenuCatalog(),
      mysteryMenus: Array.from(priceCatalog.MYSTERY_MENU_SET),
      officialSsrPrices
    });
  } catch (err) {
    console.error('[Web Ledger API Error] ❌', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/ledger/members — ดึงข้อมูลทำเนียบสมาชิก ยศ กระเป๋าตัง และสถิติใบเสร็จ
router.get('/members', async (req, res) => {
  setNoCacheHeaders(res);
  try {
    const client = req.app.get('bot');
    const guild = client?.guilds?.cache?.get(TARGET_GUILD_ID) || client?.guilds?.cache?.first();

    const [dbUsers, sessions] = await Promise.all([
      UserDB.find({}).lean().catch(() => []),
      CafeSession.find({}).select('dateKey receipts totalRevenue').lean().catch(() => [])
    ]);

    const spendMap = new Map();
    let totalCafeRevenue = 0;

    for (const s of sessions) {
      totalCafeRevenue += Number(s.totalRevenue || 0);
      if (!Array.isArray(s.receipts)) continue;
      for (const r of s.receipts) {
        if (!r.userId) continue;
        const cur = spendMap.get(r.userId) || { visits: 0, totalSpent: 0, receipts: [] };
        cur.visits += 1;
        cur.totalSpent += Number(r.totalPrice || 0);
        if (cur.receipts.length < 30) {
          cur.receipts.push({ ...r, dateKey: s.dateKey });
        }
        spendMap.set(r.userId, cur);
      }
    }

    const dbMap = new Map(dbUsers.filter(u => u.discordId).map(u => [u.discordId, u]));
    const seenIds = new Set();
    const membersList = [];
    const roleOptionsMap = new Map();

    if (guild?.members?.cache) {
      const cafeChannel = guild.channels?.cache?.get(CAFE_CHANNEL_ID);
      for (const [memberId, member] of guild.members.cache.entries()) {
        if (member.user?.bot) continue;
        seenIds.add(memberId);

        const dbDoc = dbMap.get(memberId) || {};
        const stat = spendMap.get(memberId) || { visits: 0, totalSpent: 0, receipts: [] };
        const inCafeVoice = Boolean(cafeChannel?.members?.has(memberId) || member.voice?.channelId === CAFE_CHANNEL_ID);

        const roles = member.roles.cache
          .filter(r => r.name !== '@everyone')
          .sort((a, b) => b.position - a.position)
          .map(r => {
            roleOptionsMap.set(r.id, r.name);
            return { id: r.id, name: r.name, color: r.hexColor !== '#000000' ? r.hexColor : '#BFA49A', position: r.position };
          });

        membersList.push({
          discordId: memberId,
          displayName: member.displayName || member.user.username,
          username: member.user.username,
          nickname: dbDoc.nickname || '',
          birthdayText: dbDoc.birthdayText || '',
          avatarUrl: member.displayAvatarURL({ extension: 'png', size: 256 }),
          joinedAt: member.joinedAt || dbDoc.createdAt || null,
          inCafeVoice,
          walletBalance: Number(dbDoc.walletBalance || 0),
          favoriteMenu: dbDoc.favoriteMenu || 'ขอคิดดูก่อน',
          likedMenu1: dbDoc.likedMenu1 || 'ขอคิดดูก่อน',
          likedMenu2: dbDoc.likedMenu2 || 'ขอคิดดูก่อน',
          visits: stat.visits,
          totalSpent: stat.totalSpent,
          recentReceipts: stat.receipts,
          highestRolePos: roles[0]?.position || 0,
          roles
        });
      }
    }

    for (const dbDoc of dbUsers) {
      if (!dbDoc.discordId || seenIds.has(dbDoc.discordId)) continue;
      const stat = spendMap.get(dbDoc.discordId) || { visits: 0, totalSpent: 0, receipts: [] };
      membersList.push({
        discordId: dbDoc.discordId,
        displayName: dbDoc.name || dbDoc.username || `User-${dbDoc.discordId.slice(-4)}`,
        username: dbDoc.username || '',
        nickname: dbDoc.nickname || '',
        birthdayText: dbDoc.birthdayText || '',
        avatarUrl: dbDoc.avatarUrl || 'https://cdn.discordapp.com/embed/avatars/0.png',
        joinedAt: dbDoc.createdAt || null,
        inCafeVoice: false,
        walletBalance: Number(dbDoc.walletBalance || 0),
        favoriteMenu: dbDoc.favoriteMenu || 'ขอคิดดูก่อน',
        likedMenu1: dbDoc.likedMenu1 || 'ขอคิดดูก่อน',
        likedMenu2: dbDoc.likedMenu2 || 'ขอคิดดูก่อน',
        visits: stat.visits,
        totalSpent: stat.totalSpent,
        recentReceipts: stat.receipts,
        highestRolePos: 0,
        roles: []
      });
    }

    res.json({
      ok: true,
      totalRevenue: totalCafeRevenue,
      roles: Array.from(roleOptionsMap.entries()).map(([id, name]) => ({ id, name })),
      members: membersList
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = {
  basePath: '/api/ledger',
  router
};