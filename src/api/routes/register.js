const router = require('express').Router();
const UserDB = require('../../models/User');
const theme = require('../../config/theme');
const menuCatalog = require('../../utils/menuPriceCatalog');

const {
  guildId: TARGET_GUILD_ID,
  cafeVoiceChannelId: CAFE_CHANNEL_ID,
  memberRoleId: MEMBER_ROLE_ID,
  pinRoleId: PIN_ROLE_ID
} = theme.discordConfig;

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

function formatMemberPayload(discordId, member, dbDoc, inCafeVoice = false) {
  const topRole = member?.roles?.highest;
  const roleColor = topRole?.hexColor && topRole.hexColor !== '#000000' ? topRole.hexColor : '#AA817E';
  const storedPin = String(dbDoc?.pin || dbDoc?.casinoPin || '').trim();
  const hasMemberRole = Boolean(member?.roles?.cache?.has(MEMBER_ROLE_ID));

  return {
    discordId,
    username: member?.user?.username || dbDoc?.username || dbDoc?.name || `User-${discordId.slice(-4)}`,
    displayName: member?.displayName || dbDoc?.name || `User-${discordId.slice(-4)}`,
    nickname: (dbDoc?.nickname || '').trim(),
    birthdayDay: dbDoc?.birthdayDay || null,
    birthdayMonth: dbDoc?.birthdayMonth || null,
    birthdayText: (dbDoc?.birthdayText || '').trim(),
    favoriteMenu: (dbDoc?.favoriteMenu || '').trim(),
    likedMenu1: (dbDoc?.likedMenu1 || '').trim(),
    likedMenu2: (dbDoc?.likedMenu2 || '').trim(),
    avatarUrl: member ? member.displayAvatarURL({ extension: 'png', size: 256 }) : (dbDoc?.avatarUrl || 'https://cdn.discordapp.com/embed/avatars/0.png'),
    roleName: topRole && topRole.name !== '@everyone' ? topRole.name : 'ผู้มาเยือนคาเฟ่',
    roleColor,
    inCafeVoice,
    hasMemberRole,
    hasPin: Boolean(storedPin !== ''),
    isRegistered: hasMemberRole || Boolean(dbDoc?.nickname && String(dbDoc.nickname).trim() !== '')
  };
}

async function buildUnregisteredMembers(client) {
  const guild = client?.guilds?.cache?.get(TARGET_GUILD_ID) || client?.guilds?.cache?.first();
  const dbUsers = await UserDB.find({}).lean().catch(() => []);
  const dbMap = new Map(dbUsers.filter(u => u.discordId).map(u => [u.discordId, u]));
  const resultList = [];

  if (guild?.members?.cache) {
    const cafeChannel = guild.channels?.cache?.get(CAFE_CHANNEL_ID);
    for (const [memberId, member] of guild.members.cache.entries()) {
      if (member.user?.bot) continue;
      // กรองเฉพาะคนที่ไม่มียศ 995343114854211654 เท่านั้น
      if (member.roles?.cache?.has(MEMBER_ROLE_ID)) continue;

      const dbDoc = dbMap.get(memberId) || {};
      const inCafeVoice = Boolean(cafeChannel?.members?.has(memberId) || member.voice?.channelId === CAFE_CHANNEL_ID);
      resultList.push(formatMemberPayload(memberId, member, dbDoc, inCafeVoice));
    }
  }

  resultList.sort((a, b) => {
    if (a.inCafeVoice !== b.inCafeVoice) return a.inCafeVoice ? -1 : 1;
    return a.displayName.localeCompare(b.displayName, 'th');
  });

  return resultList;
}

router.get('/catalog', async (req, res) => {
  try {
    await menuCatalog.syncMysteryMenusFromDB();
    res.json({ ok: true, categories: menuCatalog.getStructuredMenuCatalog() });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'โหลดสมุดเมนูไม่สำเร็จค่ะ' });
  }
});

router.get('/members', async (req, res) => {
  try {
    const members = await buildUnregisteredMembers(req.app.get('bot'));
    res.json({ ok: true, count: members.length, members });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'โหลดรายชื่อไม่สำเร็จค่ะ' });
  }
});

router.get('/user/:discordId', async (req, res) => {
  try {
    const client = req.app.get('bot');
    const discordId = String(req.params.discordId || '').trim();
    if (!/^\d{15,21}$/.test(discordId)) return res.status(400).json({ ok: false, error: 'รหัส Discord ID ไม่ถูกต้องค่ะ' });

    const guild = client?.guilds?.cache?.get(TARGET_GUILD_ID) || client?.guilds?.cache?.first();
    let member = guild?.members?.cache?.get(discordId) || (guild ? await guild.members.fetch(discordId).catch(() => null) : null);
    const dbDoc = await UserDB.findOne({ discordId }).lean().catch(() => null);

    if (!member && !dbDoc) return res.status(404).json({ ok: false, error: 'ไม่พบข้อมูลผู้ใช้ในเซิร์ฟเวอร์ค่ะ' });

    const inCafeVoice = Boolean(member?.voice?.channelId === CAFE_CHANNEL_ID);
    return res.json({ ok: true, user: formatMemberPayload(discordId, member, dbDoc, inCafeVoice) });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'ค้นหาข้อมูลไม่สำเร็จค่ะ' });
  }
});

async function handleRegistrationSubmit(req, res) {
  try {
    const client = req.app.get('bot');
    const discordId = String(req.body?.discordId || '').trim();
    const nickname = String(req.body?.nickname || '').trim();
    const birthdayDay = Number(req.body?.birthdayDay || 0);
    const birthdayMonth = Number(req.body?.birthdayMonth || 0);
    const favoriteMenu = String(req.body?.favoriteMenu || 'ขอคิดดูก่อน').trim() || 'ขอคิดดูก่อน';
    const likedMenu1 = String(req.body?.likedMenu1 || 'ขอคิดดูก่อน').trim() || 'ขอคิดดูก่อน';
    const likedMenu2 = String(req.body?.likedMenu2 || 'ขอคิดดูก่อน').trim() || 'ขอคิดดูก่อน';
    const pin = String(req.body?.newPin || req.body?.pin || '').trim();

    if (!/^\d{15,21}$/.test(discordId)) return res.status(400).json({ ok: false, error: 'ไม่พบรหัสผู้ใช้งาน Discord ค่ะ' });
    if (!nickname || nickname.length > 35) return res.status(400).json({ ok: false, error: 'กรุณาตั้งชื่อเล่น 1–35 ตัวอักษรค่ะ' });
    if (birthdayDay < 1 || birthdayDay > 31 || birthdayMonth < 1 || birthdayMonth > 12) {
      return res.status(400).json({ ok: false, error: 'กรุณาเลือกวันและเดือนเกิดจากปฏิทินค่ะ 🎂' });
    }
    if (!/^\d{4}$/.test(pin)) {
      return res.status(400).json({ ok: false, error: 'รหัส PIN ต้องเป็นตัวเลข 4 หลักเท่านั้นค่ะ' });
    }

    const guild = client?.guilds?.cache?.get(TARGET_GUILD_ID) || client?.guilds?.cache?.first();
    let member = guild?.members?.cache?.get(discordId) || (guild ? await guild.members.fetch(discordId).catch(() => null) : null);

    if (!member) return res.status(404).json({ ok: false, error: 'ไม่พบคุณในเซิร์ฟเวอร์ Horizontal ค่ะ' });
    if (member.roles.cache.has(MEMBER_ROLE_ID)) {
      return res.status(403).json({ ok: false, error: 'บัญชีนี้มียศสมาชิกอยู่แล้ว ไม่อนุญาตให้ลงทะเบียนซ้ำค่ะ' });
    }

    const birthdayText = `${birthdayDay} ${THAI_MONTHS[birthdayMonth - 1]}`;
    const likedMenus = [favoriteMenu, likedMenu1, likedMenu2].filter(m => m && m !== 'ขอคิดดูก่อน');

    const updatedDoc = await UserDB.findOneAndUpdate(
      { discordId },
      {
        $set: {
          discordId,
          name: member.displayName || member.user.username,
          username: member.user.username,
          avatarUrl: member.displayAvatarURL({ extension: 'png', size: 256 }),
          nickname,
          birthdayDay,
          birthdayMonth,
          birthdayText,
          favoriteMenu,
          likedMenu1,
          likedMenu2,
          likedMenus,
          pin,
          casinoPin: pin
        },
        $setOnInsert: { walletBalance: 0 }
      },
      { upsert: true, new: true }
    );

    if (MEMBER_ROLE_ID) await member.roles.add(MEMBER_ROLE_ID).catch(() => null);
    if (PIN_ROLE_ID) await member.roles.add(PIN_ROLE_ID).catch(() => null);

    return res.json({
      ok: true,
      message: `ลงทะเบียนบัตรสมาชิกของคุณ "${nickname}" และมอบยศเรียบร้อยแล้วค่ะ! 🎉`,
      user: formatMemberPayload(discordId, member, updatedDoc, Boolean(member.voice?.channelId === CAFE_CHANNEL_ID))
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'บันทึกข้อมูลไม่สำเร็จค่ะ' });
  }
}

router.post('/submit', handleRegistrationSubmit);
router.post('/', handleRegistrationSubmit);

module.exports = { basePath: '/api/register', router };