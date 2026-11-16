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
  const roleColor =
    topRole && topRole.hexColor && topRole.hexColor !== '#000000'
      ? topRole.hexColor
      : '#AA817E';
  const storedPin = String(dbDoc?.pin || dbDoc?.casinoPin || '').trim();

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
    inviter: (dbDoc?.inviter || '').trim(),
    avatarUrl: member
      ? member.displayAvatarURL({ extension: 'png', size: 256 })
      : dbDoc?.avatarUrl || 'https://cdn.discordapp.com/embed/avatars/0.png',
    roleName: topRole && topRole.name !== '@everyone' ? topRole.name : 'ลูกค้าประจำคาเฟ่',
    roleColor,
    inCafeVoice,
    walletBalance: typeof dbDoc?.walletBalance === 'number' ? dbDoc.walletBalance : 0,
    hasPin: Boolean(storedPin !== ''),
    isRegistered: Boolean(dbDoc?.nickname && String(dbDoc.nickname).trim() !== '')
  };
}

// ฟังก์ชันดึงข้อมูลสมาชิกจากแคชของ Discord ร่วมกับฐานข้อมูล MongoDB
async function buildMemberDirectorySnapshot(client) {
  const guild = client?.guilds?.cache?.get(TARGET_GUILD_ID) || client?.guilds?.cache?.first();
  const dbUsers = await UserDB.find({}).lean().catch(() => []);
  const dbMap = new Map(dbUsers.filter(u => u.discordId).map(u => [u.discordId, u]));

  const resultList = [];
  const seenIds = new Set();

  if (guild) {
    const cafeChannel = guild.channels?.cache?.get(CAFE_CHANNEL_ID);
    const membersCol = guild.members?.cache;

    if (membersCol) {
      for (const [memberId, member] of membersCol.entries()) {
        if (member.user?.bot) continue;
        seenIds.add(memberId);

        const dbDoc = dbMap.get(memberId) || {};
        const inCafeVoice = Boolean(
          cafeChannel?.members?.has(memberId) || member.voice?.channelId === CAFE_CHANNEL_ID
        );

        resultList.push(formatMemberPayload(memberId, member, dbDoc, inCafeVoice));
      }
    }
  }

  for (const dbDoc of dbUsers) {
    if (!dbDoc.discordId || seenIds.has(dbDoc.discordId)) continue;
    resultList.push(formatMemberPayload(dbDoc.discordId, null, dbDoc, false));
  }

  resultList.sort((a, b) => {
    if (a.inCafeVoice !== b.inCafeVoice) return a.inCafeVoice ? -1 : 1;
    if (a.isRegistered !== b.isRegistered) return a.isRegistered ? -1 : 1;
    return (a.nickname || a.displayName).localeCompare(b.nickname || b.displayName, 'th');
  });

  return resultList;
}

// 1. GET /api/register/catalog - ดึงสมุดเมนูทั้ง 150 รายการพร้อมระดับ Tier
router.get('/catalog', async (req, res) => {
  try {
    await menuCatalog.syncMysteryMenusFromDB();
    const categories = menuCatalog.getStructuredMenuCatalog();
    res.json({
      ok: true,
      coinText: menuCatalog.COIN_TEXT,
      categories
    });
  } catch (err) {
    console.error('❌ [API /api/register/catalog Error]:', err.message);
    res.status(500).json({ ok: false, error: 'ไม่สามารถโหลดสมุดเมนูคาเฟ่ได้ในขณะนี้ค่ะ' });
  }
});

// 2. GET /api/register/members - ดึงรายชื่อสมาชิกทั้งหมด
router.get('/members', async (req, res) => {
  try {
    const client = req.app.get('bot');
    const members = await buildMemberDirectorySnapshot(client);
    res.json({ ok: true, count: members.length, members });
  } catch (err) {
    console.error('❌ [API /api/register/members Error]:', err.message);
    res.status(500).json({ ok: false, error: 'ไม่สามารถดึงรายชื่อสมาชิกได้ในขณะนี้ค่ะ' });
  }
});

// 3. GET /api/register/user/:discordId - ค้นหาสมาชิกรายบุคคลจาก Discord ID
router.get('/user/:discordId', async (req, res) => {
  try {
    const client = req.app.get('bot');
    const discordId = String(req.params.discordId || '').trim();

    if (!/^\d{15,21}$/.test(discordId)) {
      return res.status(400).json({
        ok: false,
        error: 'รูปแบบรหัส Discord ID ไม่ถูกต้องค่ะ (ต้องเป็นตัวเลข 15-21 หลัก)'
      });
    }

    const guild = client?.guilds?.cache?.get(TARGET_GUILD_ID) || client?.guilds?.cache?.first();
    let member = guild?.members?.cache?.get(discordId);
    if (!member && guild) {
      member = await guild.members.fetch(discordId).catch(() => null);
    }

    const dbDoc = await UserDB.findOne({ discordId }).lean().catch(() => null);

    if (!member && !dbDoc) {
      return res.status(404).json({
        ok: false,
        error: 'ไม่พบสมาชิกที่ใช้รหัส Discord ID นี้ในเซิร์ฟเวอร์ Horizontal ค่ะ'
      });
    }

    const inCafeVoice = Boolean(member?.voice?.channelId === CAFE_CHANNEL_ID);
    return res.json({
      ok: true,
      user: formatMemberPayload(discordId, member, dbDoc, inCafeVoice)
    });
  } catch (err) {
    console.error('❌ [API /api/register/user Error]:', err.message);
    res.status(500).json({ ok: false, error: 'เกิดข้อผิดพลาดในการค้นหาข้อมูลสมาชิกค่ะ' });
  }
});

// 4. POST /api/register/submit - บันทึกข้อมูลบัตรสมาชิก วันเกิด เมนูประจำตัว และรหัส PIN ลง MongoDB
async function handleRegistrationSubmit(req, res) {
  try {
    const client = req.app.get('bot');
    const discordId = String(req.body?.discordId || '').trim();
    const nickname = String(req.body?.nickname || '').trim();
    const birthdayDay = req.body?.birthdayDay ? Number(req.body.birthdayDay) : null;
    const birthdayMonth = req.body?.birthdayMonth ? Number(req.body.birthdayMonth) : null;
    const favoriteMenu = String(req.body?.favoriteMenu || 'ขอคิดดูก่อน').trim() || 'ขอคิดดูก่อน';
    const likedMenu1 = String(req.body?.likedMenu1 || 'ขอคิดดูก่อน').trim() || 'ขอคิดดูก่อน';
    const likedMenu2 = String(req.body?.likedMenu2 || 'ขอคิดดูก่อน').trim() || 'ขอคิดดูก่อน';
    const currentPin = String(req.body?.currentPin || '').trim();
    const newPin = String(req.body?.newPin || req.body?.pin || '').trim();

    if (!/^\d{15,21}$/.test(discordId)) {
      return res.status(400).json({
        ok: false,
        error: 'กรุณาเลือกโปรไฟล์ของคุณจากรายชื่อ หรือระบุรหัส Discord ID ให้ถูกต้องค่ะ'
      });
    }

    if (!nickname || nickname.length < 1 || nickname.length > 35) {
      return res.status(400).json({
        ok: false,
        error: 'กรุณาตั้งชื่อเล่นความยาวระหว่าง 1 ถึง 35 ตัวอักษรค่ะ'
      });
    }

    if (
      !birthdayDay ||
      !birthdayMonth ||
      birthdayDay < 1 ||
      birthdayDay > 31 ||
      birthdayMonth < 1 ||
      birthdayMonth > 12
    ) {
      return res.status(400).json({
        ok: false,
        error: 'กรุณาเลือกวันที่และเดือนเกิดจากปฏิทินจำลองให้ครบถ้วนค่ะ 🎂'
      });
    }

    const birthdayText = `${birthdayDay} ${THAI_MONTHS[birthdayMonth - 1]}`;

    const existingUser = await UserDB.findOne({ discordId });
    const existingPin = String(existingUser?.pin || existingUser?.casinoPin || '').trim();

    // ตรวจสอบรหัส PIN เดิม หากบัญชีนี้เคยตั้งรหัส PIN ไว้แล้ว
    if (existingPin !== '') {
      if (!currentPin) {
        return res.status(401).json({
          ok: false,
          requireCurrentPin: true,
          error: 'บัญชีนี้มีรหัส PIN คุ้มกันอยู่ กรุณากรอกรหัส PIN เดิมเพื่อยืนยันการแก้ไขข้อมูลค่ะ'
        });
      }
      if (existingPin !== currentPin) {
        return res.status(401).json({
          ok: false,
          requireCurrentPin: true,
          error: 'รหัส PIN เดิมไม่ถูกต้อง! ไม่อนุญาตให้แก้ไขข้อมูลบัตรสมาชิกค่ะ'
        });
      }
    }

    // จัดการรหัส PIN ใหม่ (ถ้ามีการกรอกเข้ามา ต้องเป็นตัวเลข 4-6 หลัก)
    let finalPinToSave = existingPin;
    if (newPin !== '') {
      if (!/^\d{4,6}$/.test(newPin)) {
        return res.status(400).json({
          ok: false,
          error: 'รหัส PIN ต้องเป็นตัวเลข 4 ถึง 6 หลักเท่านั้นค่ะ (เช่น 1234)'
        });
      }
      finalPinToSave = newPin;
    }

    const guild = client?.guilds?.cache?.get(TARGET_GUILD_ID) || client?.guilds?.cache?.first();
    let member = guild?.members?.cache?.get(discordId);
    if (!member && guild) {
      member = await guild.members.fetch(discordId).catch(() => null);
    }

    const discordDisplayName =
      member?.displayName || member?.user?.username || existingUser?.name || nickname;
    const discordUsername = member?.user?.username || existingUser?.username || '';
    const avatarUrl = member
      ? member.displayAvatarURL({ extension: 'png', size: 256 })
      : existingUser?.avatarUrl || 'https://cdn.discordapp.com/embed/avatars/0.png';

    const likedMenusArray = [favoriteMenu, likedMenu1, likedMenu2].filter(
      m => m && m !== 'ขอคิดดูก่อน'
    );

    const updatedDoc = await UserDB.findOneAndUpdate(
      { discordId },
      {
        $set: {
          discordId,
          name: discordDisplayName,
          username: discordUsername,
          avatarUrl,
          nickname,
          birthdayDay,
          birthdayMonth,
          birthdayText,
          favoriteMenu,
          likedMenu1,
          likedMenu2,
          likedMenus: likedMenusArray,
          pin: finalPinToSave,
          casinoPin: finalPinToSave
        },
        $setOnInsert: {
          walletBalance: 0
        }
      },
      { upsert: true, new: true }
    );

    // มอบยศใน Discord อัตโนมัติ (MEMBER_ROLE_ID และ PIN_ROLE_ID)
    const rolesGranted = [];
    if (member) {
      if (MEMBER_ROLE_ID && !member.roles.cache.has(MEMBER_ROLE_ID)) {
        const addedMember = await member.roles.add(MEMBER_ROLE_ID).catch(() => null);
        if (addedMember) rolesGranted.push('ยศสมาชิก');
      }
      if (PIN_ROLE_ID && finalPinToSave && !member.roles.cache.has(PIN_ROLE_ID)) {
        const addedPin = await member.roles.add(PIN_ROLE_ID).catch(() => null);
        if (addedPin) rolesGranted.push('ยศรหัส PIN');
      }
    }

    const roleMsg =
      rolesGranted.length > 0 ? ` (มอบ${rolesGranted.join(' และ ')}ใน Discord เรียบร้อย ✨)` : '';

    return res.json({
      ok: true,
      message: `บันทึกบัตรสมาชิกของคุณ "${nickname}" (เกิดวันที่ ${birthdayText}) และเมนูประจำตัวลงฐานข้อมูลเรียบร้อยแล้วค่ะ!${roleMsg}`,
      user: formatMemberPayload(
        discordId,
        member,
        updatedDoc,
        Boolean(member?.voice?.channelId === CAFE_CHANNEL_ID)
      )
    });
  } catch (err) {
    console.error('❌ [API /api/register/submit Error]:', err.message);
    res.status(500).json({ ok: false, error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูลลงฐานข้อมูลค่ะ' });
  }
}

router.post('/submit', handleRegistrationSubmit);
router.post('/', handleRegistrationSubmit);

module.exports = {
  basePath: '/api/register',
  router
};