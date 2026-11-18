const router = require('express').Router();
const CafeSession = require('../../models/CafeSession');
const UserDB = require('../../models/User');
const theme = require('../../config/theme');
const menuCatalog = require('../../utils/menuPriceCatalog');

const {
  guildId: TARGET_GUILD_ID,
  cafeVoiceChannelId: CAFE_CHANNEL_ID,
  memberRoleId: MEMBER_ROLE_ID
} = theme.discordConfig;

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

function extractMemberPresence(member) {
  if (!member || !member.presence) {
    return { status: 'offline', customStatus: '', activityText: '', activityType: '' };
  }
  const status = member.presence.status || 'offline';
  const activities = member.presence.activities || [];
  let customStatus = '';
  let activityText = '';
  let activityType = '';

  for (const act of activities) {
    if (act.type === 4 && act.state) {
      const emojiStr = act.emoji?.name ? `${act.emoji.name} ` : '';
      customStatus = `${emojiStr}${act.state}`.trim();
    } else if (!activityText && act.name) {
      if (act.type === 2) {
        activityType = 'LISTENING';
        activityText = `🎵 ฟังเพลง ${act.details || act.name}${act.state ? ` - ${act.state}` : ''}`;
      } else if (act.type === 0) {
        activityType = 'PLAYING';
        activityText = `🎮 เล่น ${act.name}${act.details ? ` (${act.details})` : ''}`;
      } else if (act.type === 3) {
        activityType = 'WATCHING';
        activityText = `📺 รับชม ${act.name}`;
      } else if (act.type === 1) {
        activityType = 'STREAMING';
        activityText = `🔴 กำลังสตรีม ${act.name}`;
      }
    }
  }

  return { status, customStatus, activityText, activityType };
}

function decorateReceiptItem(r) {
  const drinkPrice = Number(r.drinkPrice || 0);
  const tier = menuCatalog.getItemTier
    ? menuCatalog.getItemTier(drinkPrice, 'drink', r.drinkName || '')
    : { code: drinkPrice >= 300 ? 'SSR' : drinkPrice >= 200 ? 'SR' : 'C', label: 'Signature' };

  return {
    ...r,
    tierCode: tier?.code || 'C',
    tierLabel: tier?.label || 'Classic'
  };
}

router.get('/overview', async (req, res) => {
  try {
    const client = req.app.get('bot');
    const requestedDate = String(req.query.date || '').trim();

    const [allSessions, dbUsers] = await Promise.all([
      CafeSession.find({}).sort({ createdAt: -1 }).limit(120).lean().catch(() => []),
      UserDB.find({}).lean().catch(() => [])
    ]);

    // 1. สรุป Heatmap ปฏิทินรายวันและยอดขายสะสมจากทุกเซสชัน
    const dateStatsMap = new Map();
    const userSpendMap = new Map();
    let grandTotalRevenue = 0;
    let grandTotalOrders = 0;

    for (const s of allSessions) {
      const dKey = s.dateKey || new Date(s.createdAt || Date.now()).toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
      const rev = Number(s.totalRevenue || 0);
      const receipts = Array.isArray(s.receipts) ? s.receipts : [];

      grandTotalRevenue += rev;
      grandTotalOrders += receipts.length;

      const prevDateStat = dateStatsMap.get(dKey) || { dateKey: dKey, revenue: 0, orders: 0, sessions: 0, hasActive: false };
      prevDateStat.revenue += rev;
      prevDateStat.orders += receipts.length;
      prevDateStat.sessions += 1;
      if (s.isActive) prevDateStat.hasActive = true;
      dateStatsMap.set(dKey, prevDateStat);

      for (const r of receipts) {
        if (!r.userId) continue;
        const prevUser = userSpendMap.get(r.userId) || { spent: 0, visits: 0 };
        prevUser.spent += Number(r.totalPrice || 0);
        prevUser.visits += 1;
        userSpendMap.set(r.userId, prevUser);
      }
    }

    const calendarDates = Array.from(dateStatsMap.values()).sort((a, b) => b.dateKey.localeCompare(a.dateKey));
    const activeDateKey = requestedDate || (calendarDates[0]?.dateKey || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }));

    const filteredSessions = allSessions
      .filter(s => !requestedDate || s.dateKey === requestedDate)
      .slice(0, 35)
      .map(s => ({
        _id: String(s._id),
        dateKey: s.dateKey,
        isActive: Boolean(s.isActive),
        startTimeText: s.startTimeText || '',
        endTimeText: s.endTimeText || '',
        createdAt: s.createdAt,
        endedAt: s.endedAt,
        authorName: s.authorName || 'ลูกค้าคาเฟ่',
        authorAvatar: s.authorAvatar || 'https://cdn.discordapp.com/embed/avatars/0.png',
        totalRevenue: Number(s.totalRevenue || 0),
        logLines: Array.isArray(s.logLines) ? s.logLines : [],
        receipts: (Array.isArray(s.receipts) ? s.receipts : []).map(decorateReceiptItem)
      }));

    // 2. ข้อมูลสมาชิกและห้องเสียงสดจาก Discord
    const guild = client?.guilds?.cache?.get(TARGET_GUILD_ID) || client?.guilds?.cache?.first();
    if (guild && guild.members.cache.size <= 2) {
      await guild.members.fetch().catch(() => null);
    }

    const cafeChannel = guild?.channels?.cache?.get(CAFE_CHANNEL_ID);
    const liveVoiceMembers = [];
    const dbUserMap = new Map(dbUsers.filter(u => u.discordId).map(u => [u.discordId, u]));
    const directoryMembers = [];
    let unregisteredCount = 0;

    if (guild?.members?.cache) {
      for (const [memberId, member] of guild.members.cache.entries()) {
        const inCafeVoice = Boolean(cafeChannel?.members?.has(memberId) || member.voice?.channelId === CAFE_CHANNEL_ID);

        if (member.user?.bot) {
          if (memberId === client?.user?.id && inCafeVoice) {
            liveVoiceMembers.unshift({
              discordId: memberId,
              displayName: member.displayName || 'Alestia Barista',
              nickname: 'บาริสต้าอเลสเทีย',
              avatarUrl: member.displayAvatarURL({ extension: 'png', size: 256 }),
              isBotBarista: true
            });
          }
          continue;
        }

        const hasMemberRole = Boolean(member.roles?.cache?.has(MEMBER_ROLE_ID));
        if (!hasMemberRole) unregisteredCount += 1;

        const dbDoc = dbUserMap.get(memberId) || {};
        const spendStat = userSpendMap.get(memberId) || { spent: 0, visits: 0 };
        const topRole = member.roles?.highest;
        const roleColor = topRole?.hexColor && topRole.hexColor !== '#000000' ? topRole.hexColor : '#F4978E';
        const presence = extractMemberPresence(member);
        const cleanNick = (dbDoc.nickname || '').trim().replace(/^คุณ\s*/, '');

        const memberObj = {
          discordId: memberId,
          username: member.user.username,
          displayName: member.displayName || member.user.username,
          nickname: cleanNick,
          inviter: (dbDoc.inviter || '').trim(),
          birthdayDay: dbDoc.birthdayDay || null,
          birthdayMonth: dbDoc.birthdayMonth || null,
          birthdayText: dbDoc.birthdayText || (dbDoc.birthdayDay && dbDoc.birthdayMonth ? `${dbDoc.birthdayDay} ${THAI_MONTHS[dbDoc.birthdayMonth - 1]}` : ''),
          favoriteMenu: dbDoc.favoriteMenu && dbDoc.favoriteMenu !== 'ขอคิดดูก่อน' ? dbDoc.favoriteMenu : '',
          likedMenu1: dbDoc.likedMenu1 && dbDoc.likedMenu1 !== 'ขอคิดดูก่อน' ? dbDoc.likedMenu1 : '',
          likedMenu2: dbDoc.likedMenu2 && dbDoc.likedMenu2 !== 'ขอคิดดูก่อน' ? dbDoc.likedMenu2 : '',
          walletBalance: typeof dbDoc.walletBalance === 'number' ? dbDoc.walletBalance : 0,
          totalSpent: spendStat.spent,
          visitCount: spendStat.visits,
          avatarUrl: member.displayAvatarURL({ extension: 'png', size: 256 }),
          roleName: topRole && topRole.name !== '@everyone' ? topRole.name : 'ชาวคาเฟ่',
          roleColor,
          hasMemberRole,
          hasPin: Boolean((dbDoc.pin || dbDoc.casinoPin || '').trim()),
          inCafeVoice,
          ...presence
        };

        if (inCafeVoice) {
          liveVoiceMembers.push({
            discordId: memberId,
            displayName: memberObj.displayName,
            nickname: cleanNick ? `คุณ${cleanNick}` : memberObj.displayName,
            avatarUrl: memberObj.avatarUrl,
            isBotBarista: false
          });
        }

        if (hasMemberRole || cleanNick || spendStat.visits > 0) {
          directoryMembers.push(memberObj);
        }
      }
    }

    // จัดอันดับสุลต่าน (พิจารณาจากยอดใช้จ่ายในร้าน + เหรียญในกระเป๋า)
    const rankedByWealth = [...directoryMembers].sort((a, b) => (b.totalSpent + b.walletBalance) - (a.totalSpent + a.walletBalance));
    const sultanTopIds = rankedByWealth.slice(0, 3).filter(m => (m.totalSpent + m.walletBalance) > 0).map(m => m.discordId);

    directoryMembers.forEach(m => {
      const sIdx = sultanTopIds.indexOf(m.discordId);
      m.sultanRank = sIdx !== -1 ? sIdx + 1 : null;
    });

    directoryMembers.sort((a, b) => {
      if (a.inCafeVoice !== b.inCafeVoice) return a.inCafeVoice ? -1 : 1;
      if ((a.sultanRank || 99) !== (b.sultanRank || 99)) return (a.sultanRank || 99) - (b.sultanRank || 99);
      return a.displayName.localeCompare(b.displayName, 'th');
    });

    res.json({
      ok: true,
      activeDateKey,
      stats: {
        grandTotalRevenue,
        grandTotalOrders,
        totalSessions: allSessions.length,
        registeredCount: directoryMembers.length,
        unregisteredCount,
        liveVoiceCount: liveVoiceMembers.length
      },
      liveVoiceStage: {
        channelName: cafeChannel?.name || 'Horizontal Cafe Voice',
        members: liveVoiceMembers
      },
      calendarDates,
      sessions: filteredSessions,
      members: directoryMembers
    });
  } catch (err) {
    console.error('❌ [Ledger Overview Error]:', err.message);
    res.status(500).json({ ok: false, error: 'ไม่สามารถดึงข้อมูลบอร์ดคาเฟ่ได้ค่ะ' });
  }
});

// รองรับการแก้ไขข้อมูลบัตรสมาชิกด้วยรหัสปลอดภัย PIN 4 หลัก
router.post('/update-member', async (req, res) => {
  try {
    const { discordId, pin, nickname, birthdayDay, birthdayMonth, favoriteMenu, likedMenu1, likedMenu2 } = req.body || {};
    if (!discordId || !/^\d{4}$/.test(String(pin || '').trim())) {
      return res.status(400).json({ ok: false, error: 'กรุณากรอกรหัสปลอดภัย PIN 4 หลักให้ถูกต้องค่ะ 🔐' });
    }

    const userDoc = await UserDB.findOne({ discordId }).lean();
    if (!userDoc) {
      return res.status(404).json({ ok: false, error: 'ไม่พบข้อมูลบัตรสมาชิกของคุณในระบบค่ะ' });
    }

    const savedPin = String(userDoc.pin || userDoc.casinoPin || '').trim();
    if (savedPin && savedPin !== String(pin).trim()) {
      return res.status(403).json({ ok: false, error: 'รหัสปลอดภัย PIN 4 หลักไม่ถูกต้องค่ะ ❌' });
    }

    const cleanNick = String(nickname || userDoc.nickname || '').trim().replace(/^คุณ\s*/, '').slice(0, 35);
    const bDay = Number(birthdayDay) || userDoc.birthdayDay || 1;
    const bMonth = Number(birthdayMonth) || userDoc.birthdayMonth || 1;
    const birthdayText = `${bDay} ${THAI_MONTHS[Math.max(0, Math.min(11, bMonth - 1))]}`;

    const cleanFav = String(favoriteMenu || 'ขอคิดดูก่อน').trim();
    const cleanLike1 = String(likedMenu1 || 'ขอคิดดูก่อน').trim();
    const cleanLike2 = String(likedMenu2 || 'ขอคิดดูก่อน').trim();
    const likedMenus = [cleanFav, cleanLike1, cleanLike2].filter(m => m && m !== 'ขอคิดดูก่อน');

    await UserDB.findOneAndUpdate(
      { discordId },
      {
        $set: {
          nickname: cleanNick,
          birthdayDay: bDay,
          birthdayMonth: bMonth,
          birthdayText,
          favoriteMenu: cleanFav,
          likedMenu1: cleanLike1,
          likedMenu2: cleanLike2,
          likedMenus,
          pin: String(pin).trim(),
          casinoPin: String(pin).trim()
        }
      },
      { new: true }
    );

    res.json({ ok: true, message: `อัปเดตบัตรสมาชิกของ "คุณ${cleanNick}" เรียบร้อยแล้วค่ะ ✨` });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'บันทึกการแก้ไขไม่สำเร็จค่ะ: ' + err.message });
  }
});

module.exports = { basePath: '/api/ledger', router };