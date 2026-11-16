const router = require('express').Router();
const UserDB = require('../../models/User');
const theme = require('../../config/theme');

const {
  guildId: TARGET_GUILD_ID,
  cafeVoiceChannelId: CAFE_CHANNEL_ID,
  memberRoleId: MEMBER_ROLE_ID,
  pinRoleId: PIN_ROLE_ID
} = theme.discordConfig;

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
        const storedPin = String(dbDoc.pin || dbDoc.casinoPin || '').trim();
        const inCafeVoice = Boolean(
          cafeChannel?.members?.has(memberId) || member.voice?.channelId === CAFE_CHANNEL_ID
        );
        const topRole = member.roles?.highest;
        const roleColor =
          topRole && topRole.hexColor && topRole.hexColor !== '#000000'
            ? topRole.hexColor
            : '#AA817E';

        resultList.push({
          discordId: memberId,
          username: member.user.username,
          displayName: member.displayName || member.user.username,
          nickname: (dbDoc.nickname || '').trim(),
          avatarUrl: member.displayAvatarURL({ extension: 'png', size: 256 }),
          roleName: topRole && topRole.name !== '@everyone' ? topRole.name : 'ลูกค้าประจำคาเฟ่',
          roleColor,
          inCafeVoice,
          walletBalance: typeof dbDoc.walletBalance === 'number' ? dbDoc.walletBalance : 0,
          hasPin: Boolean(storedPin !== ''),
          isRegistered: Boolean(dbDoc.nickname && String(dbDoc.nickname).trim() !== '')
        });
      }
    }
  }

  // กรณีมีข้อมูลใน DB แต่ไม่อยู่ในแคชของ Guild
  for (const dbDoc of dbUsers) {
    if (!dbDoc.discordId || seenIds.has(dbDoc.discordId)) continue;
    const storedPin = String(dbDoc.pin || dbDoc.casinoPin || '').trim();
    resultList.push({
      discordId: dbDoc.discordId,
      username: dbDoc.username || dbDoc.name || dbDoc.nickname || `User-${dbDoc.discordId.slice(-4)}`,
      displayName: dbDoc.name || dbDoc.nickname || `User-${dbDoc.discordId.slice(-4)}`,
      nickname: (dbDoc.nickname || '').trim(),
      avatarUrl: dbDoc.avatarUrl || 'https://cdn.discordapp.com/embed/avatars/0.png',
      roleName: 'สมาชิกคาเฟ่',
      roleColor: '#AA817E',
      inCafeVoice: false,
      walletBalance: typeof dbDoc.walletBalance === 'number' ? dbDoc.walletBalance : 0,
      hasPin: Boolean(storedPin !== ''),
      isRegistered: Boolean(dbDoc.nickname && String(dbDoc.nickname).trim() !== '')
    });
  }

  // เรียงลำดับ: 1) คนที่อยู่ในห้องเสียงคาเฟ่ -> 2) คนที่ลงทะเบียนแล้ว -> 3) เรียงตามตัวอักษรภาษาไทย
  resultList.sort((a, b) => {
    if (a.inCafeVoice !== b.inCafeVoice) return a.inCafeVoice ? -1 : 1;
    if (a.isRegistered !== b.isRegistered) return a.isRegistered ? -1 : 1;
    return (a.nickname || a.displayName).localeCompare(b.nickname || b.displayName, 'th');
  });

  return resultList;
}

// 1. GET /api/register/members - ดึงรายชื่อสมาชิกทั้งหมด
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

// 2. GET /api/register/user/:discordId - ค้นหาสมาชิกรายบุคคลจาก Discord ID
router.get('/user/:discordId', async (req, res) => {
  try {
    const client = req.app.get('bot');
    const discordId = String(req.params.discordId || '').trim();

    if (!/^\d{15,21}$/.test(discordId)) {
      return res.status(400).json({ ok: false, error: 'รูปแบบรหัส Discord ID ไม่ถูกต้องค่ะ (ต้องเป็นตัวเลข 15-21 หลัก)' });
    }

    const guild = client?.guilds?.cache?.get(TARGET_GUILD_ID) || client?.guilds?.cache?.first();
    let member = guild?.members?.cache?.get(discordId);
    if (!member && guild) {
      member = await guild.members.fetch(discordId).catch(() => null);
    }

    const dbDoc = await UserDB.findOne({ discordId }).lean().catch(() => null);

    if (!member && !dbDoc) {
      return res.status(404).json({ ok: false, error: 'ไม่พบสมาชิกที่ใช้รหัส Discord ID นี้ในเซิร์ฟเวอร์ Horizontal ค่ะ' });
    }

    const topRole = member?.roles?.highest;
    const roleColor =
      topRole && topRole.hexColor && topRole.hexColor !== '#000000'
        ? topRole.hexColor
        : '#AA817E';
    const storedPin = String(dbDoc?.pin || dbDoc?.casinoPin || '').trim();

    return res.json({
      ok: true,
      user: {
        discordId,
        username: member?.user?.username || dbDoc?.username || dbDoc?.name || `User-${discordId.slice(-4)}`,
        displayName: member?.displayName || dbDoc?.name || `User-${discordId.slice(-4)}`,
        nickname: (dbDoc?.nickname || '').trim(),
        avatarUrl: member
          ? member.displayAvatarURL({ extension: 'png', size: 256 })
          : dbDoc?.avatarUrl || 'https://cdn.discordapp.com/embed/avatars/0.png',
        roleName: topRole && topRole.name !== '@everyone' ? topRole.name : 'ลูกค้าประจำคาเฟ่',
        roleColor,
        inCafeVoice: Boolean(member?.voice?.channelId === CAFE_CHANNEL_ID),
        walletBalance: typeof dbDoc?.walletBalance === 'number' ? dbDoc.walletBalance : 0,
        hasPin: Boolean(storedPin !== ''),
        isRegistered: Boolean(dbDoc?.nickname && String(dbDoc.nickname).trim() !== '')
      }
    });
  } catch (err) {
    console.error('❌ [API /api/register/user Error]:', err.message);
    res.status(500).json({ ok: false, error: 'เกิดข้อผิดพลาดในการค้นหาข้อมูลสมาชิกค่ะ' });
  }
});

// 3. POST /api/register/verify-pin - ตรวจสอบรหัส PIN
router.post('/verify-pin', async (req, res) => {
  try {
    const discordId = String(req.body?.discordId || '').trim();
    const inputPin = String(req.body?.pin || '').trim();

    if (!discordId || !inputPin) {
      return res.status(400).json({ ok: false, error: 'กรุณาระบุ Discord ID และรหัส PIN ให้ครบถ้วนค่ะ' });
    }

    const dbDoc = await UserDB.findOne({ discordId }).select('pin casinoPin nickname walletBalance').lean();
    const savedPin = String(dbDoc?.pin || dbDoc?.casinoPin || '').trim();

    if (!dbDoc || !savedPin) {
      return res.json({ ok: true, verified: true, message: 'บัญชียังไม่ได้ตั้งรหัส PIN สามารถตั้งรหัสใหม่ได้เลยค่ะ' });
    }

    if (savedPin !== inputPin) {
      return res.status(401).json({ ok: false, verified: false, error: 'รหัส PIN ไม่ถูกต้องค่ะ! กรุณาลองใหม่อีกครั้งนะคะ' });
    }

    return res.json({
      ok: true,
      verified: true,
      nickname: dbDoc.nickname || '',
      walletBalance: dbDoc.walletBalance || 0
    });
  } catch (err) {
    console.error('❌ [API /api/register/verify-pin Error]:', err.message);
    res.status(500).json({ ok: false, error: 'ระบบตรวจสอบรหัส PIN ขัดข้องชั่วคราวค่ะ' });
  }
});

// 4. POST /api/register/submit - บันทึกการลงทะเบียน ตั้งรหัส PIN และมอบยศใน Discord
async function handleRegistrationSubmit(req, res) {
  try {
    const client = req.app.get('bot');
    const discordId = String(req.body?.discordId || '').trim();
    const nickname = String(req.body?.nickname || '').trim();
    const currentPin = String(req.body?.currentPin || '').trim();
    const newPin = String(req.body?.newPin || req.body?.pin || '').trim();

    if (!/^\d{15,21}$/.test(discordId)) {
      return res.status(400).json({
        ok: false,
        error: 'กรุณาเลือกบัญชีของคุณจากรายชื่อ หรือระบุรหัส Discord ID 17-20 หลักให้ถูกต้องค่ะ'
      });
    }

    if (!nickname || nickname.length < 1 || nickname.length > 35) {
      return res.status(400).json({
        ok: false,
        error: 'กรุณาตั้งชื่อเล่นความยาวระหว่าง 1 ถึง 35 ตัวอักษรค่ะ'
      });
    }

    const existingUser = await UserDB.findOne({ discordId });
    const existingPin = String(existingUser?.pin || existingUser?.casinoPin || '').trim();

    // หากบัญชีนี้เคยมีรหัส PIN อยู่แล้ว ต้องยืนยัน currentPin ให้ตรงก่อนเสมอ
    if (existingPin !== '') {
      if (!currentPin) {
        return res.status(401).json({
          ok: false,
          requireCurrentPin: true,
          error: 'บัญชีนี้ตั้งรหัส PIN ไว้แล้ว กรุณากรอกรหัส PIN เดิมเพื่อยืนยันตัวตนด้วยค่ะ'
        });
      }
      if (existingPin !== currentPin) {
        return res.status(401).json({
          ok: false,
          requireCurrentPin: true,
          error: 'รหัส PIN เดิมไม่ถูกต้อง! ไม่อนุญาตให้แก้ไขข้อมูลค่ะ'
        });
      }
    }

    // ตรวจสอบความถูกต้องของรหัส PIN ใหม่ (ตัวเลข 4-6 หลัก)
    let finalPinToSave = existingPin;
    if (newPin !== '') {
      if (!/^\d{4,6}$/.test(newPin)) {
        return res.status(400).json({
          ok: false,
          error: 'รหัส PIN ต้องเป็นตัวเลข 4 ถึง 6 หลักเท่านั้นค่ะ (เช่น 1234)'
        });
      }
      finalPinToSave = newPin;
    } else if (!finalPinToSave) {
      return res.status(400).json({
        ok: false,
        error: 'กรุณาตั้งรหัส PIN ตัวเลข 4-6 หลักสำหรับใช้เข้าคาสิโนและปกป้องข้อมูลของคุณค่ะ'
      });
    }

    // ดึงข้อมูลสมาชิกจากเซิร์ฟเวอร์ Discord
    const guild = client?.guilds?.cache?.get(TARGET_GUILD_ID) || client?.guilds?.cache?.first();
    let member = guild?.members?.cache?.get(discordId);
    if (!member && guild) {
      member = await guild.members.fetch(discordId).catch(() => null);
    }

    const discordDisplayName = member?.displayName || member?.user?.username || existingUser?.name || nickname;
    const discordUsername = member?.user?.username || existingUser?.username || '';
    const avatarUrl = member
      ? member.displayAvatarURL({ extension: 'png', size: 256 })
      : existingUser?.avatarUrl || 'https://cdn.discordapp.com/embed/avatars/0.png';

    // บันทึกลงฐานข้อมูล MongoDB (บันทึกทั้ง pin และ casinoPin ให้ตรงกันเสมอ)
    const updatedDoc = await UserDB.findOneAndUpdate(
      { discordId },
      {
        $set: {
          discordId,
          name: discordDisplayName,
          username: discordUsername,
          avatarUrl,
          nickname,
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
        const addedMemberRole = await member.roles.add(MEMBER_ROLE_ID).catch(err => {
          console.warn(`⚠️ [Role Warning] มอบยศสมาชิก (${MEMBER_ROLE_ID}) ไม่สำเร็จ:`, err.message);
          return null;
        });
        if (addedMemberRole) rolesGranted.push('ยศสมาชิก');
      }

      if (PIN_ROLE_ID && finalPinToSave && !member.roles.cache.has(PIN_ROLE_ID)) {
        const addedPinRole = await member.roles.add(PIN_ROLE_ID).catch(err => {
          console.warn(`⚠️ [Role Warning] มอบยศ PIN (${PIN_ROLE_ID}) ไม่สำเร็จ:`, err.message);
          return null;
        });
        if (addedPinRole) rolesGranted.push('ยศรหัส PIN');
      }
    }

    const roleSuffix = rolesGranted.length > 0 ? ` (มอบ${rolesGranted.join(' และ ')}ใน Discord เรียบร้อย ✨)` : '';

    return res.json({
      ok: true,
      message: existingUser
        ? `อัปเดตข้อมูลและรหัส PIN ของคุณ "${nickname}" เรียบร้อยแล้วค่ะ!${roleSuffix}`
        : `ลงทะเบียนต้อนรับคุณ "${nickname}" เข้าสู่ครอบครัว Horizontal Cafe เรียบร้อยแล้วค่ะ!${roleSuffix}`,
      user: {
        discordId,
        nickname: updatedDoc.nickname,
        walletBalance: updatedDoc.walletBalance || 0,
        hasPin: true,
        isRegistered: true
      }
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