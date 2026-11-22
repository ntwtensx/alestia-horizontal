const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const CafeSession = require('../../models/CafeSession');
const UserDB = require('../../models/User');
const memory = require('../../utils/sharedMemory');
const priceCatalog = require('../../utils/menuPriceCatalog');
const theme = require('../../config/theme');

const CAFE_CHANNEL_ID = theme.discordConfig?.cafeVoiceChannelId || '995629374722297946';
const FOOTER_ICON_URL = 'https://i.ibb.co/nMzNwcw0/119111-softbunnyinlove.png';
const COOKIE_EMOJI_ID = '1562622101427323002';
const COOKIE_EMOJI_TAG = '<a:59632cookie:1562622101427323002>';

const TOPPING_CHANCE = 0.55; // โอกาสสุ่มมีท็อปปิ้งติดมากับเครื่องดื่ม (55%)
const DESSERT_CHANCE = 0.50; // โอกาสสุ่มมีขนม/ของทานเล่นติดมาด้วย (50%)

const REROLL_ANGRY_CHANCES = [0.50, 0.75, 0.90]; // โอกาสไม่พอใจ: ครั้งที่ 1 (20%), ครั้งที่ 2 (35%), ครั้งที่ 3 (50%)
const MAX_REROLLS = REROLL_ANGRY_CHANCES.length; // ขอเปลี่ยนเมนูได้สูงสุด 3 ครั้ง
const CONFIRM_DELETE_MS = 7000; // ลบข้อความยืนยันออเดอร์หลัง 7 วินาที
const KICK_NOTICE_DELETE_MS = 10000; // ลบข้อความแจ้งเตือนอเลสเทียไม่พอใจหลัง 10 วินาที
const MIN_VALID_STAY_MS = 60 * 1000; // อยู่ต่ำกว่า 1 นาทีถือเป็นข้อมูลขยะ -> ลบประวัติทิ้ง
const MAX_EMBED_FIELDS = 25; // ขีดจำกัดสูงสุดของ Discord Embed Fields

const ANGRY_KICK_LINES = [
  'อเลสเทียไม่พอใจที่เรื่องมากและเปลี่ยนเมนูค่ะ! เชิญออกไปนั่งด้านนอกก่อนนะคะ~✦',
  'อเลสเทียรู้สึกเบื่อขี้หน้าแล้วค่ะ สุ่มเมนูใหม่แล้วยังไม่ถูกใจ เชิญออกจากคาเฟ่ไปก่อนเลยค่ะ~✦',
  'ขอเปลี่ยนเมนูทำไมคะ? ไม่ชอบก็ขอเชิญออกไปนั่งด้านนอกก่อนนะคะ~✦'
];

const { COIN_EMOJI, COIN_TEXT, DEFAULT_SWEETNESS } = priceCatalog;

if (!memory.sessionMsgCache) memory.sessionMsgCache = new Map();
if (!memory.draftSessionEmbeds) memory.draftSessionEmbeds = new Map();
if (!memory.pendingOrders) memory.pendingOrders = new Map();
if (!memory.pendingUnmuteUsers) memory.pendingUnmuteUsers = new Set();

let trackerQueue = Promise.resolve();

const getDashboardUrl = () => {
  const rawUrl =
    process.env.PUBLIC_URL ||
    theme.publicUrl ||
    (process.env.KOYEB_PUBLIC_DOMAIN ? `https://${process.env.KOYEB_PUBLIC_DOMAIN}` : 'https://cheerful-sande-ntwtensx-49047ca7.apps.mistral.run');
  return rawUrl.replace(/\/$/, '');
};

const createWebButtonRow = () => {
  const btn = new ButtonBuilder()
    .setLabel('📖 เปิดบอร์ดสมุดบันทึก & ใบเสร็จคาเฟ่ (Web)')
    .setStyle(ButtonStyle.Link)
    .setURL(getDashboardUrl());
  return new ActionRowBuilder().addComponents(btn);
};

const getThaiDateTime = () => {
  const now = new Date();
  const dateKey = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }); // YYYY-MM-DD
  const dateDisplay = now.toLocaleDateString('en-GB', { timeZone: 'Asia/Bangkok' }); // DD/MM/YYYY
  const timeText = now.toLocaleTimeString('th-TH', {
    timeZone: 'Asia/Bangkok',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  return { now, dateKey, dateDisplay, timeText };
};

const formatDateKeyToDDMMYYYY = (dateKey) => {
  if (!dateKey || typeof dateKey !== 'string') return getThaiDateTime().dateDisplay;
  const parts = dateKey.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateKey;
};

const toUnixSec = (dateVal) => {
  const ms = dateVal ? new Date(dateVal).getTime() : Date.now();
  return Math.floor((Number.isNaN(ms) ? Date.now() : ms) / 1000);
};

const sendWithRetry = async (channel, payload, maxRetries = 2) => {
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await channel.send(payload);
    } catch (err) {
      if (attempt > maxRetries) throw err;
      await new Promise((res) => setTimeout(res, 1000 * attempt));
    }
  }
};

const calculateDurationText = (session, stTimeFallback = '') => {
  if (!session) return stTimeFallback ? `เพิ่งเริ่มบริการ (เปิดรอบ ${stTimeFallback} น.)` : 'เพิ่งเริ่มบริการ';
  let startMs = session.createdAt ? new Date(session.createdAt).getTime() : null;
  if (!startMs && session.messageId && /^\d+$/.test(session.messageId)) {
    try {
      startMs = Number((BigInt(session.messageId) >> 22n) + 1420070400000n);
    } catch (_) {}
  }
  if (!startMs) return 'ไม่ทราบระยะเวลา';

  const endMs = session.endedAt ? new Date(session.endedAt).getTime() : Date.now();
  const totalSeconds = Math.floor(Math.max(0, endMs - startMs) / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (totalMinutes === 0) return `${Math.max(1, totalSeconds)} วินาที`;
  if (hours > 0 && minutes > 0) return `${hours} ชั่วโมง ${minutes} นาที`;
  if (hours > 0) return `${hours} ชั่วโมง`;
  return `${minutes} นาที`;
};

async function getCafeChannel(client, guildFallback = null) {
  let ch = guildFallback?.channels?.cache?.get(CAFE_CHANNEL_ID) || client?.channels?.cache?.get(CAFE_CHANNEL_ID);
  if (!ch && guildFallback) ch = await guildFallback.channels.fetch(CAFE_CHANNEL_ID).catch(() => null);
  if (!ch && client) ch = await client.channels.fetch(CAFE_CHANNEL_ID).catch(() => null);
  return ch;
}

function cleanupPendingEntry(pending) {
  if (!pending) return;
  if (pending.collector && !pending.collector.ended) {
    pending.collector.stop('cleanup');
  }
}

// 🧹 ลบ Embed เปล่าชั่วคราว (กรณีไม่มีใครยืนยันออเดอร์เลย)
async function cleanupDraftEmbed(cafeChannel) {
  const draft = memory.draftSessionEmbeds.get(CAFE_CHANNEL_ID);
  if (!draft) return;
  memory.draftSessionEmbeds.delete(CAFE_CHANNEL_ID);

  try {
    if (draft.message) {
      await draft.message.delete().catch(() => null);
    } else if (draft.messageId && cafeChannel) {
      const msg = await cafeChannel.messages.fetch(draft.messageId).catch(() => null);
      if (msg) await msg.delete().catch(() => null);
    }
    console.log('[Cafe Draft Purge] 🧹 ลบ Embed เปล่าที่ยังไม่มีการยืนยันออเดอร์เรียบร้อยแล้ว');
  } catch (err) {
    console.error('❌ [cleanupDraftEmbed Error]:', err.message);
  }
}

// ข้อความแจ้งเตือนขอความหวาน + คำแนะนำกดคุกกี้สุ่มเมนูน้ำใหม่
function buildSweetnessPromptText(userId, userName, drinkName, rerollCount = 0) {
  if (rerollCount === 0) {
    return [
      `-# <@${userId}>`,
      `<a:mloader:1570077645624971356> เครื่องดื่มของคุณ${userName} อเลสเทียได้เลือกเป็น\n- "${drinkName}" ค่ะ \nกรุณาระบุความหวานให้ด้วยนะคะ~✦`,
      `-# พิมพ์ข้อความระบุความหวานส่งมาในแชทได้เลยค่ะ`,
      `> -# สามารถกด ${COOKIE_EMOJI_TAG} เพื่อขอให้อเลสเทียสุ่มเครื่องดื่มของคุณใหม่ได้ค่ะ`
    ].join('\n');
  }

  if (rerollCount < MAX_REROLLS) {
    const remaining = MAX_REROLLS - rerollCount;
    return [
      `-# <@${userId}>`,
      `<a:mloader:1570077645624971356> อเลสเทียได้เลือกเครื่องดื่มใหม่ครั้งที่ ${rerollCount} ของคุณ${userName}เป็น\n- "${drinkName}"ค่ะ!\nกรุณาระบุความหวานให้ด้วยนะคะ~✦`,
      `-# พิมพ์ข้อความระบุความหวานส่งมาในแชทได้เลยค่ะ`,
      `> -# สามารถกด ${COOKIE_EMOJI_TAG} เพื่อขอให้อเลสเทียเลือกใหม่ได้อีก ${remaining} ครั้งค่ะ`
    ].join('\n');
  }

  return [
    `-# <@${userId}>`,
    `<a:mloader:1570077645624971356> อเลสเทียเลือกเครื่องดื่มให้คุณ${userName} ให้ทั้งสิ้น ${MAX_REROLLS} ครั้งแล้วค่ะ! กรุณาระบุความหวานให้กับ\n- "${drinkName}"ด้วยนะคะ~✦`,
    `-# พิมพ์ข้อความระบุความหวานส่งมาในแชทได้เลยค่ะ`
  ].join('\n');
}

// ==========================================
// 🎲 1. ระบบสุ่มเมนูอัตโนมัติ (เครื่องดื่ม + สุ่มท็อปปิ้ง + สุ่มขนมและของทานเล่น)
// ==========================================
function getAllDrinkNames() {
  return [
    ...Object.keys(priceCatalog.DRINK_PRICES || {}).filter((n) => n !== 'เอิร์ลเกรย์ลาเวเดอร์'),
    ...Array.from(priceCatalog.MYSTERY_MENU_SET || [])
  ];
}

// สุ่มท็อปปิ้ง (มีโอกาสติดมาด้วยหรือไม่มี ตาม TOPPING_CHANCE)
function rollOptionalTopping() {
  const allToppingNames = Object.keys(priceCatalog.TOPPING_PRICES || {});
  if (allToppingNames.length === 0 || Math.random() >= TOPPING_CHANCE) {
    return { toppingName: '', toppingPrice: 0 };
  }
  const toppingName = allToppingNames[Math.floor(Math.random() * allToppingNames.length)];
  const toppingPrice = priceCatalog.getItemPrice(toppingName, 'topping', 0) || 25;
  return { toppingName, toppingPrice };
}

// สุ่มขนมและของทานเล่น (สุ่มว่าจะมีติดมาด้วยหรือไม่มี หากมีติดมาด้วยจึงสุ่มรายการขนม)
function rollOptionalDessert() {
  const allDessertNames = Object.keys(priceCatalog.DESSERT_PRICES || {});
  if (allDessertNames.length === 0 || Math.random() >= DESSERT_CHANCE) {
    return { dessertName: '', dessertPrice: 0 };
  }
  const dessertName = allDessertNames[Math.floor(Math.random() * allDessertNames.length)];
  const dessertPrice = priceCatalog.getItemPrice(dessertName, 'dessert', 0) || 95;
  return { dessertName, dessertPrice };
}

function rollRandomCafeMenu(userDataDB = null) {
  const allDrinkNames = getAllDrinkNames();
  const pickRandom = (arr) => (arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)] : '');

  // โอกาส 20% สุ่มติดเมนูโปรดของสมาชิก (ถ้าลงทะเบียนไว้และมีชื่ออยู่ในคลัง)
  let drinkName = '';
  const fav = userDataDB?.favoriteMenu ? String(userDataDB.favoriteMenu).trim() : '';
  if (fav && fav !== 'ขอคิดดูก่อน' && allDrinkNames.includes(fav) && Math.random() < 0.2) {
    drinkName = fav;
  } else {
    drinkName = pickRandom(allDrinkNames) || 'ลาเต้อาร์ตมาสเตอร์พีซ';
  }

  const drinkPrice = priceCatalog.getItemPrice(drinkName, 'drink', 0) || 120;
  const { toppingName, toppingPrice } = rollOptionalTopping();
  const { dessertName, dessertPrice } = rollOptionalDessert();
  const totalPrice = drinkPrice + toppingPrice + dessertPrice;

  return {
    drinkName,
    drinkPrice,
    toppingName,
    toppingPrice,
    dessertName,
    dessertPrice,
    totalPrice
  };
}

// สุ่มเปลี่ยนเฉพาะเมนูน้ำใหม่ (ไม่ให้ซ้ำแก้วเดิม) พร้อมคำนวณราคารวมใหม่
function rerollDrinkOnly(currentMenu) {
  const allDrinkNames = getAllDrinkNames();
  const candidates = allDrinkNames.filter((n) => n !== currentMenu.drinkName);
  const pool = candidates.length > 0 ? candidates : allDrinkNames;

  const newDrinkName = pool[Math.floor(Math.random() * pool.length)] || currentMenu.drinkName;
  const newDrinkPrice = priceCatalog.getItemPrice(newDrinkName, 'drink', 0) || 120;
  const newTotalPrice = newDrinkPrice + (currentMenu.toppingPrice || 0) + (currentMenu.dessertPrice || 0);

  return {
    ...currentMenu,
    drinkName: newDrinkName,
    drinkPrice: newDrinkPrice,
    totalPrice: newTotalPrice
  };
}

// ==========================================
// 🍯 2. ระบบจัดรูปแบบระดับความหวานแบบมือโปร
// ==========================================
function formatProfessionalSweetness(rawInput) {
  if (!rawInput || typeof rawInput !== 'string') return DEFAULT_SWEETNESS;

  const cleaned = rawInput
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^["'`]+|["'`]+$/g, '')
    .trim()
    .slice(0, 40);

  if (!cleaned) return DEFAULT_SWEETNESS;

  if (cleaned.includes('หวาน')) {
    return cleaned;
  }

  if (/^(น้ำตาล|ไม่ใส่|ไม่เอา|งด|จืด|ไร้)/.test(cleaned)) {
    return cleaned;
  }

  if (/^\d+\s*%?$/.test(cleaned)) {
    return `หวาน ${cleaned}`;
  }

  return `หวาน${cleaned}`;
}

// ==========================================
// 🧹 3. ลบเซสชันขยะออกจากทั้ง Discord Embed และ MongoDB
// ==========================================
async function purgeSessionNow(cafeChannel, sessionId, messageId) {
  try {
    if (messageId) {
      const cachedMsg = memory.sessionMsgCache.get(CAFE_CHANNEL_ID);
      if (cachedMsg && cachedMsg.id === messageId) {
        await cachedMsg.delete().catch(() => null);
        memory.sessionMsgCache.delete(CAFE_CHANNEL_ID);
      } else if (cafeChannel) {
        const targetMsg = await cafeChannel.messages.fetch(messageId).catch(() => null);
        if (targetMsg) await targetMsg.delete().catch(() => null);
      }
    }

    if (sessionId) {
      await CafeSession.deleteOne({ _id: sessionId }).catch(() => null);
    }

    console.log(`[Cafe Garbage Purge] 🧹 ลบเซสชันขยะ (${sessionId || '-'}) และ Embed (${messageId || '-'}) เรียบร้อยแล้ว`);
  } catch (err) {
    console.error('❌ [purgeSessionNow Error]:', err.message);
  }
}

// ==========================================
// 🎨 4. สร้าง Embed รูปแบบใหม่ (บรรทัดแรกเครื่องดื่ม+ความหวาน+ท็อปปิ้ง / บรรทัดสองขนมทานเล่นถ้าสุ่มติด)
// ==========================================
function buildSessionEmbed(cafeChannel, session, isClosing = false) {
  const activeColor = '#C89670';
  const closingColor = '#535294';
  const channelLabel = cafeChannel?.name || '☕⟆﹕ᴄᴀꜰᴇ・:';

  const receipts = Array.isArray(session.receipts) ? session.receipts : [];
  const presentCount = receipts.filter((r) => r.isPresent).length;
  const formattedRevenue = Number(session.totalRevenue || 0).toLocaleString('en-US');
  const durationStr = calculateDurationText(session, session.startTimeText);
  const dateDisplay = formatDateKeyToDDMMYYYY(session.dateKey);
  const startTimeDisplay = session.startTimeText || getThaiDateTime().timeText;

  const startIndex = Math.max(0, receipts.length - MAX_EMBED_FIELDS);
  const visibleReceipts = receipts.slice(startIndex);

  const fields = visibleReceipts.map((r, offset) => {
    const seqNumber = String(startIndex + offset + 1).padStart(2, '0');
    const userIdPrefix4 = String(r.userId || '0000').slice(0, 4);
    const enterUnix = toUnixSec(r.enteredAt || session.createdAt);
    const exitUnix = toUnixSec(r.exitedAt || Date.now());

    const fieldName = r.isPresent
      ? `<a:9887greentick:1562617728005705799>[<t:${enterUnix}:t>] กำลังอยู่ในคาเฟ่`
      : `<a:1162greytick:1562617731583311872>[<t:${enterUnix}:t>-<t:${exitUnix}:t>] ออกไปแล้ว`;

    // บรรทัดแรก: เครื่องดื่ม + ความหวาน (+ ท็อปปิ้งถ้าสุ่มติดมาด้วย)
    const drinkLine = `${r.drinkName || 'เมนูซิกเนเจอร์'}${r.sweetness || DEFAULT_SWEETNESS}${r.toppingName ? ` ${r.toppingName}` : ''}`;
    const valueLines = [
      `**"${r.userName || 'ลูกค้าคาเฟ่'}"**`,
      `> ~✦${drinkLine}`
    ];

    // บรรทัดสอง: ขนมทานเล่น (แสดงเฉพาะกรณีสุ่มมีขนมติดมาด้วย)
    if (r.dessertName) {
      valueLines.push(`> ~✦${r.dessertName}`);
    }

    valueLines.push(`**R#${seqNumber}${userIdPrefix4} ราคา ${Number(r.totalPrice || 0).toLocaleString('en-US')} ${COIN_EMOJI}**`);

    return {
      name: fieldName,
      value: valueLines.join('\n').slice(0, 1024),
      inline: true
    };
  });

  const embed = new EmbedBuilder()
    .setColor(isClosing ? closingColor : activeColor)
    .setTitle(`<a:spkran:1513650594546712706>${channelLabel}<a:greenrollingstar:1524672296344752128>บันทึกการเข้าใช้งาน`)
    .setDescription(
      `<:14618bunnyoutline:1570084097622155365>ประจำวันที่ ${dateDisplay} เวลา ${startTimeDisplay}\n- **สมาชิกที่อยู่ทั้งสิ้น ${presentCount} คน**`
    )
    .setFooter({
      text: `สถานะ : ${isClosing ? 'ปิดรอบบริการแล้ว' : 'กำลังให้บริการ'}\n| ยอดขายรวม ${formattedRevenue} ${COIN_TEXT}\n[ ใช้เวลาทั้งสิ้น ${durationStr} ]`,
      iconURL: FOOTER_ICON_URL
    });

  if (fields.length > 0) {
    embed.setFields(fields);
  }

  return embed;
}

async function renderAndSaveSessionEmbed(cafeChannel, session, isClosing = false) {
  const webButtonRow = createWebButtonRow();
  const embed = buildSessionEmbed(cafeChannel, session, isClosing);

  try {
    let targetMsg = memory.sessionMsgCache.get(CAFE_CHANNEL_ID);
    if (!targetMsg || targetMsg.id !== session.messageId) {
      targetMsg = await cafeChannel.messages.fetch(session.messageId);
      memory.sessionMsgCache.set(CAFE_CHANNEL_ID, targetMsg);
    }
    await targetMsg.edit({ embeds: [embed], components: [webButtonRow] });
  } catch (_) {
    const newMsg = await sendWithRetry(cafeChannel, { embeds: [embed], components: [webButtonRow] });
    session.messageId = newMsg.id;
    memory.sessionMsgCache.set(CAFE_CHANNEL_ID, newMsg);
  }

  if (isClosing) {
    memory.sessionMsgCache.delete(CAFE_CHANNEL_ID);
  }

  await session.save();
  return session;
}

// ตรวจสอบและปิดรอบเก่าค้าง (หากไม่มีสมาชิกในรอบเก่าอยู่ในห้องเสียงแล้ว)
async function getOrCloseStaleActiveSession(cafeChannel, joiningUserId = '') {
  const session = await CafeSession.findOne({ channelId: CAFE_CHANNEL_ID, isActive: { $ne: false } }).sort({ createdAt: -1 });
  if (!session) return null;

  const hasOtherPresentInVoice = (session.receipts || []).some(
    (r) => r.isPresent && r.userId !== joiningUserId && cafeChannel.members.has(r.userId)
  );
  const hMembers = cafeChannel.members.filter((m) => !m.user.bot);

  if (!hasOtherPresentInVoice && hMembers.size <= 1) {
    if (!session.receipts || session.receipts.length === 0) {
      await purgeSessionNow(cafeChannel, session._id, session.messageId);
      return null;
    }

    const { now, timeText } = getThaiDateTime();
    session.isActive = false;
    session.endTimeText = timeText;
    session.endedAt = now;
    session.receipts.forEach((r) => {
      if (r.isPresent) {
        r.isPresent = false;
        r.exitTimeText = timeText;
        r.exitedAt = now;
        r.exitReason = 'ปิดรอบระบบอัตโนมัติ';
      }
    });
    await renderAndSaveSessionEmbed(cafeChannel, session, true).catch(() => session.save().catch(() => null));
    return null;
  }

  return session;
}

// ==========================================
// 💢 5. กรณีอเลสเทียไม่พอใจจากการขอเปลี่ยนเมนู -> เตะออกพร้อมข้อความแจ้ง (ไม่บันทึกประวัติ)
// ==========================================
async function handleAletheaDispleasedKick(pending, attemptNum, cafeChannel, client) {
  const { userId, userName, promptMsg } = pending;

  cleanupPendingEntry(pending);
  memory.pendingOrders.delete(userId);

  if (promptMsg) {
    await promptMsg.delete().catch(() => null);
  }

  const angryLine = ANGRY_KICK_LINES[Math.floor(Math.random() * ANGRY_KICK_LINES.length)];
  const noticeText = [
    `-# <@${userId}>`,
    `-# <:xmark:1570079859454124082> รายงาน **คุณ${userName}** การขอเปลี่ยนเมนูครั้งที่ ${attemptNum} — **ไม่สำเร็จ** \n${angryLine}`
  ].join('\n');

  const noticeMsg = await sendWithRetry(cafeChannel, noticeText).catch(() => null);
  if (noticeMsg) {
    setTimeout(() => {
      noticeMsg.delete().catch(() => null);
    }, KICK_NOTICE_DELETE_MS);
  }

  memory.pendingUnmuteUsers.add(userId);

  try {
    const guild = cafeChannel.guild || client?.guilds?.cache?.first();
    const member =
      guild?.members?.cache?.get(userId) ||
      (guild ? await guild.members.fetch(userId).catch(() => null) : null);

    if (member?.voice?.channelId === CAFE_CHANNEL_ID) {
      await member.voice.disconnect(`อเลสเทียไม่พอใจจากการขอเปลี่ยนเมนูครั้งที่ ${attemptNum}`);
    } else if (memory.pendingOrders.size === 0) {
      await cleanupDraftEmbed(cafeChannel);
    }
  } catch (kickErr) {
    const guild = cafeChannel.guild || client?.guilds?.cache?.first();
    const member = guild?.members?.cache?.get(userId);
    if (member?.voice?.channelId) {
      await member.voice.setMute(false, 'ปลดไมค์คืนเมื่อไม่สามารถตัดการเชื่อมต่อได้').catch(() => null);
      memory.pendingUnmuteUsers.delete(userId);
    }

    if (memory.pendingOrders.size === 0 && memory.draftSessionEmbeds.has(CAFE_CHANNEL_ID)) {
      await cleanupDraftEmbed(cafeChannel);
    }
  }
}

// ==========================================
// ✅ 6. ยืนยันระดับความหวาน -> ปลด Mute -> ลบข้อความเดิม -> แจ้งยืนยัน 2 บรรทัด (ลบใน 7 วิ) -> บันทึก DB & อัปเดต Embed
// ==========================================
async function confirmMemberSweetness(userId, rawSweetnessText, client, memberMessage = null) {
  const pending = memory.pendingOrders.get(userId);
  if (!pending) return false;

  cleanupPendingEntry(pending);
  memory.pendingOrders.delete(userId);

  return (trackerQueue = trackerQueue.then(async () => {
    try {
      const cafeChannel = await getCafeChannel(client);
      if (!cafeChannel) return false;

      const sweetness = formatProfessionalSweetness(rawSweetnessText);
      const { rolledMenu, userName, actorUser, joinedAt } = pending;
      const drinkWithSweetness = `${rolledMenu.drinkName}${sweetness}`;
      const drinkWithTopping = rolledMenu.toppingName
        ? `${drinkWithSweetness} ${rolledMenu.toppingName}`
        : drinkWithSweetness;

      // 1. ปลด Server Mute ให้สมาชิกทันที
      const guild = cafeChannel.guild || client?.guilds?.cache?.first();
      const member =
        guild?.members?.cache?.get(userId) ||
        (guild ? await guild.members.fetch(userId).catch(() => null) : null);

      if (member?.voice?.channelId) {
        await member.voice.setMute(false, 'ระบุความหวานและรับเมนูคาเฟ่เรียบร้อยแล้ว').catch(() => null);
      }
      memory.pendingUnmuteUsers.delete(userId);

      // 2. ลบทั้งข้อความแจ้งเตือนของบอทและข้อความระบุความหวานของสมาชิก
      if (pending.promptMsg) {
        await pending.promptMsg.delete().catch(() => null);
      }
      if (memberMessage && typeof memberMessage.delete === 'function') {
        await memberMessage.delete().catch(() => null);
      }

      // เช็กเผื่อสมาชิกหลุดออกห้องเสียงไปพอดีในจังหวะพิมพ์ส่ง -> ไม่บันทึกประวัติ
      const stillInCafe = cafeChannel.members.has(userId) && member?.voice?.channelId === CAFE_CHANNEL_ID;
      if (!stillInCafe) {
        const hMembers = cafeChannel.members.filter((m) => !m.user.bot);
        if (hMembers.size === 0 && memory.draftSessionEmbeds.has(CAFE_CHANNEL_ID)) {
          await cleanupDraftEmbed(cafeChannel);
        }
        return false;
      }

      // 3. ส่งข้อความยืนยันรับออเดอร์ขึ้นใหม่ (บรรทัดแรกเครื่องดื่ม+ความหวาน+ท็อปปิ้ง / บรรทัดสองขนมทานเล่นถ้าสุ่มติด) และลบออกใน 7 วินาที
      const confirmLines = [
        `-# <@${userId}>`,
        `☕ ได้ทำการส่งเมนูให้คุณ${userName} เป็น ${drinkWithTopping} เรียบร้อยแล้วค่ะ~✦`
      ];
      if (rolledMenu.dessertName) {
        confirmLines.push(`🥐 พร้อมของทานเล่นเป็น ${rolledMenu.dessertName} ค่ะ~✦`);
      }

      const confirmMsg = await sendWithRetry(cafeChannel, confirmLines.join('\n')).catch(() => null);
      if (confirmMsg) {
        setTimeout(() => {
          confirmMsg.delete().catch(() => null);
        }, CONFIRM_DELETE_MS);
      }

      // 4. หักเหรียญทองจากกระเป๋าจริง (หากลงทะเบียนไว้แล้ว)
      let walletDeducted = 0;
      if (rolledMenu.totalPrice > 0) {
        const userDoc = await UserDB.findOne({ discordId: userId }).lean().catch(() => null);
        if (userDoc && typeof userDoc.walletBalance === 'number') {
          const nextBal = Math.max(0, userDoc.walletBalance - rolledMenu.totalPrice);
          walletDeducted = Math.max(0, userDoc.walletBalance - nextBal);
          await UserDB.updateOne({ discordId: userId }, { $set: { walletBalance: nextBal } }).catch(() => null);
        }
      }

      // 5. บันทึกลง MongoDB และอัปเดต Embed (สวมทับ Embed เปล่าที่สร้างรอไว้)
      const { now, dateKey } = getThaiDateTime();
      const enteredDate = joinedAt ? new Date(joinedAt) : now;
      const enterTimeText = enteredDate.toLocaleTimeString('th-TH', {
        timeZone: 'Asia/Bangkok',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });

      const receiptObj = {
        userId,
        userName,
        userAvatar: actorUser.avatar,
        enterTimeText,
        enteredAt: enteredDate,
        exitTimeText: '',
        exitedAt: null,
        exitReason: '',
        isPresent: true,
        drinkName: rolledMenu.drinkName,
        sweetness,
        drinkPrice: rolledMenu.drinkPrice,
        toppingName: rolledMenu.toppingName,
        toppingPrice: rolledMenu.toppingPrice,
        dessertName: rolledMenu.dessertName,
        dessertPrice: rolledMenu.dessertPrice,
        totalPrice: rolledMenu.totalPrice
      };

      const logSummaryLine = `• ${userName}: ${drinkWithTopping}${rolledMenu.dessertName ? ` | ขนม: ${rolledMenu.dessertName}` : ''} (${rolledMenu.totalPrice} ${COIN_TEXT})`;

      const session = await getOrCloseStaleActiveSession(cafeChannel, userId);

      if (!session) {
        const draft = memory.draftSessionEmbeds.get(CAFE_CHANNEL_ID);
        memory.draftSessionEmbeds.delete(CAFE_CHANNEL_ID);

        const sessionDateKey = draft?.dateKey || dateKey;
        const sessionStartTime = draft?.startTimeText || enterTimeText;
        const sessionCreatedAt = draft?.createdAt || enteredDate;

        const tempSession = {
          channelId: CAFE_CHANNEL_ID,
          dateKey: sessionDateKey,
          isActive: true,
          startTimeText: sessionStartTime,
          createdAt: sessionCreatedAt,
          authorName: actorUser.name,
          authorAvatar: actorUser.avatar,
          totalRevenue: rolledMenu.totalPrice,
          receipts: [receiptObj],
          logLines: [logSummaryLine]
        };

        const embed = buildSessionEmbed(cafeChannel, tempSession, false);
        const webButtonRow = createWebButtonRow();

        let sessionMsg = null;
        if (draft?.message) {
          sessionMsg = await draft.message.edit({ embeds: [embed], components: [webButtonRow] }).catch(() => null);
        }
        if (!sessionMsg) {
          sessionMsg = await sendWithRetry(cafeChannel, { embeds: [embed], components: [webButtonRow] });
        }

        await CafeSession.create({
          channelId: CAFE_CHANNEL_ID,
          messageId: sessionMsg.id,
          dateKey: sessionDateKey,
          isActive: true,
          logLines: [logSummaryLine],
          startTimeText: sessionStartTime,
          endTimeText: '',
          endedAt: null,
          authorName: actorUser.name,
          authorAvatar: actorUser.avatar,
          totalRevenue: rolledMenu.totalPrice,
          receipts: [receiptObj]
        });

        memory.sessionMsgCache.set(CAFE_CHANNEL_ID, sessionMsg);
      } else {
        if (!session.dateKey) session.dateKey = dateKey;
        if (!Array.isArray(session.receipts)) session.receipts = [];
        if (!Array.isArray(session.logLines)) session.logLines = [];

        session.receipts.push(receiptObj);
        session.logLines.push(logSummaryLine);
        if (session.logLines.length > 40) session.logLines = session.logLines.slice(-40);
        session.totalRevenue = Number(session.totalRevenue || 0) + rolledMenu.totalPrice;
        session.isActive = true;

        await renderAndSaveSessionEmbed(cafeChannel, session, false);
      }

      if (!memory.activeDeductions) memory.activeDeductions = new Map();
      memory.activeDeductions.set(userId, walletDeducted);

      return true;
    } catch (err) {
      console.error('❌ [confirmMemberSweetness Error]:', err.message);
      return false;
    }
  }));
}

// ==========================================
// 🚪 7. จัดการเหตุการณ์เข้า-ออกห้องเสียงคาเฟ่
// ==========================================
const processCafeEvent = async (oldState, newState, userName, userDataDB, client) => {
  const isChannelChange = oldState.channelId !== newState.channelId;
  const joinedCafe = isChannelChange && newState.channelId === CAFE_CHANNEL_ID;
  const leftCafe = isChannelChange && oldState.channelId === CAFE_CHANNEL_ID;
  if (!joinedCafe && !leftCafe) return;

  priceCatalog.syncPricesToDatabase().catch(() => null);

  const guild = newState.guild || oldState.guild;
  const cafeChannel = await getCafeChannel(client, guild);
  if (!cafeChannel) return;

  const memberObj = newState.member || oldState.member;
  const userId = memberObj?.id || '';
  const actorUser = {
    id: userId,
    name: userName,
    avatar:
      memberObj?.user?.displayAvatarURL({ extension: 'png', size: 128 }) ||
      'https://cdn.discordapp.com/embed/avatars/0.png'
  };

  // ==========================================
  // 🌸 ขาเข้า: สร้าง Embed เปล่า (ยังไม่ลง DB) -> Mute ไมค์ -> สุ่มเครื่องดื่ม+ท็อปปิ้ง+ขนม -> ถามความหวาน + คุกกี้รีโรล
  // ==========================================
  if (joinedCafe) {
    if (memory.pendingOrders.has(userId)) {
      const oldPending = memory.pendingOrders.get(userId);
      cleanupPendingEntry(oldPending);
      if (oldPending.promptMsg) await oldPending.promptMsg.delete().catch(() => null);
      memory.pendingOrders.delete(userId);
    }

    const stillInCafe = cafeChannel.members.has(userId) && memberObj?.voice?.channelId === CAFE_CHANNEL_ID;
    if (!stillInCafe) return;

    // 1. สั่ง Server Mute จนกว่าจะระบุความหวาน
    await memberObj.voice.setMute(true, 'รอระบุความหวานสำหรับเมนูคาเฟ่').catch(() => null);

    // 2. หากยังไม่มีรอบที่เปิดใช้งานและยังไม่มี Embed เปล่า ให้สร้าง Embed เปล่าขึ้นมาแสดงรอไว้ (ยังไม่บันทึก DB)
    const activeSession = await getOrCloseStaleActiveSession(cafeChannel, userId);
    if (!activeSession && !memory.draftSessionEmbeds.has(CAFE_CHANNEL_ID)) {
      const { now, dateKey, timeText } = getThaiDateTime();
      const draftData = {
        dateKey,
        startTimeText: timeText,
        createdAt: now,
        totalRevenue: 0,
        receipts: []
      };
      const blankEmbed = buildSessionEmbed(cafeChannel, draftData, false);
      const draftMsg = await sendWithRetry(cafeChannel, {
        embeds: [blankEmbed],
        components: [createWebButtonRow()]
      }).catch(() => null);

      if (draftMsg) {
        memory.draftSessionEmbeds.set(CAFE_CHANNEL_ID, {
          message: draftMsg,
          messageId: draftMsg.id,
          dateKey,
          startTimeText: timeText,
          createdAt: now
        });
      }
    }

    // 3. สุ่มเมนูเครื่องดื่ม + สุ่มท็อปปิ้ง + สุ่มขนมและของทานเล่น
    const rolledMenu = rollRandomCafeMenu(userDataDB);

    // 4. ส่งข้อความแจ้งเตือนถามระดับความหวานเฉพาะชื่อเครื่องดื่ม
    const promptText = buildSweetnessPromptText(userId, userName, rolledMenu.drinkName, 0);
    const promptMsg = await sendWithRetry(cafeChannel, promptText).catch(() => null);

    // เช็กซ้ำเผื่อหลุดออกระหว่างส่งข้อความ -> ลบข้อความแจ้งเตือน และลบ Embed เปล่าหากห้องว่างแล้ว
    const stillPresentAfterSend = cafeChannel.members.has(userId) && memberObj?.voice?.channelId === CAFE_CHANNEL_ID;
    if (!stillPresentAfterSend) {
      if (promptMsg) await promptMsg.delete().catch(() => null);
      memory.pendingUnmuteUsers.add(userId);

      const remainingHumans = cafeChannel.members.filter((m) => !m.user.bot);
      if (remainingHumans.size === 0 && memory.draftSessionEmbeds.has(CAFE_CHANNEL_ID)) {
        await cleanupDraftEmbed(cafeChannel);
      }
      return;
    }

    const pendingRecord = {
      userId,
      userName,
      userDataDB,
      actorUser,
      rolledMenu,
      promptMsg,
      collector: null,
      rerollCount: 0,
      isProcessingReroll: false,
      joinedAt: Date.now()
    };

    memory.pendingOrders.set(userId, pendingRecord);

    // 🍪 5. แนบอิโมจิคุกกี้และเปิด Reaction Collector สำหรับขอสุ่มเมนูน้ำใหม่ (สูงสุด 3 ครั้ง: 20% / 35% / 50%)
    if (promptMsg) {
      await promptMsg.react(COOKIE_EMOJI_ID).catch(() => null);

      const collector = promptMsg.createReactionCollector({
        filter: (reaction, user) =>
          !user.bot && (reaction.emoji.id === COOKIE_EMOJI_ID || reaction.emoji.name === '59632cookie'),
        time: 10 * 60 * 1000
      });

      pendingRecord.collector = collector;

      collector.on('collect', async (reaction, user) => {
        await reaction.users.remove(user.id).catch(() => null);

        if (user.id !== userId) return;

        const activePending = memory.pendingOrders.get(userId);
        if (!activePending || activePending !== pendingRecord) {
          collector.stop('stale');
          return;
        }
        if (activePending.isProcessingReroll || activePending.rerollCount >= MAX_REROLLS) {
          return;
        }

        activePending.isProcessingReroll = true;

        try {
          const attemptIdx = activePending.rerollCount; // 0, 1, 2
          const attemptNum = attemptIdx + 1; // 1, 2, 3
          const angryChance = REROLL_ANGRY_CHANCES[attemptIdx] ?? 0.50;

          if (Math.random() < angryChance) {
            await handleAletheaDispleasedKick(activePending, attemptNum, cafeChannel, client);
            return;
          }

          activePending.rerollCount += 1;
          activePending.rolledMenu = rerollDrinkOnly(activePending.rolledMenu);

          const updatedText = buildSweetnessPromptText(
            userId,
            userName,
            activePending.rolledMenu.drinkName,
            activePending.rerollCount
          );
          await promptMsg.edit(updatedText).catch(() => null);

          if (activePending.rerollCount >= MAX_REROLLS) {
            collector.stop('max_rerolls');
            await promptMsg.reactions.removeAll().catch(() => null);
          }
        } finally {
          activePending.isProcessingReroll = false;
        }
      });
    }
    return;
  }

  // ==========================================
  // 🚪 ขาออก: ลบคิวรอความหวาน / ลบ Embed เปล่าถ้าห้องว่าง / กรองประวัติขยะ (< 1 นาที) / อัปเดต Embed
  // ==========================================
  if (leftCafe) {
    if (memory.pendingOrders.has(userId)) {
      const pending = memory.pendingOrders.get(userId);
      cleanupPendingEntry(pending);
      if (pending.promptMsg) await pending.promptMsg.delete().catch(() => null);
      memory.pendingOrders.delete(userId);

      if (newState.channelId && newState.member?.voice?.channelId) {
        await newState.member.voice.setMute(false, 'ออกจากห้องคาเฟ่แล้ว').catch(() => null);
        memory.pendingUnmuteUsers.delete(userId);
      } else {
        memory.pendingUnmuteUsers.add(userId);
      }
    }

    const hMembers = cafeChannel.members.filter((m) => !m.user.bot);
    const isLastMember = hMembers.size === 0;

    if (isLastMember && memory.draftSessionEmbeds.has(CAFE_CHANNEL_ID)) {
      await cleanupDraftEmbed(cafeChannel);
    }

    const session = await CafeSession.findOne({ channelId: CAFE_CHANNEL_ID, isActive: { $ne: false } }).sort({ createdAt: -1 });
    if (!session) return;

    const { now, timeText } = getThaiDateTime();
    const isSleeping = memory.sleepingUsers?.has(userId);
    if (isSleeping) memory.sleepingUsers.delete(userId);

    if (!Array.isArray(session.receipts)) session.receipts = [];
    let targetIdx = -1;
    for (let i = session.receipts.length - 1; i >= 0; i--) {
      if (session.receipts[i].userId === userId && session.receipts[i].isPresent) {
        targetIdx = i;
        break;
      }
    }

    if (targetIdx !== -1) {
      const receipt = session.receipts[targetIdx];
      const enteredMs = receipt.enteredAt ? new Date(receipt.enteredAt).getTime() : Date.now();
      const stayDurationMs = Math.max(0, Date.now() - enteredMs);

      if (stayDurationMs < MIN_VALID_STAY_MS) {
        session.receipts.splice(targetIdx, 1);
        session.totalRevenue = Math.max(0, Number(session.totalRevenue || 0) - Number(receipt.totalPrice || 0));

        const refundAmount = memory.activeDeductions?.get(userId) || 0;
        if (memory.activeDeductions) memory.activeDeductions.delete(userId);
        if (refundAmount > 0) {
          await UserDB.updateOne({ discordId: userId }, { $inc: { walletBalance: refundAmount } }).catch(() => null);
        }

        console.log(
          `[Cafe Garbage Filter] 🧹 ลบประวัติของ ${userName} เนื่องจากอยู่ในห้องเสียงเพียง ${Math.round(stayDurationMs / 1000)} วินาที (< 1 นาที)`
        );
      } else {
        if (memory.activeDeductions) memory.activeDeductions.delete(userId);
        receipt.isPresent = false;
        receipt.exitTimeText = timeText;
        receipt.exitedAt = now;
        receipt.exitReason = isSleeping ? 'หลับแล้วจึงส่งไปห้องนอน' : 'ออกจากคาเฟ่แล้ว';
      }
    }

    if (session.receipts.length === 0) {
      await purgeSessionNow(cafeChannel, session._id, session.messageId);
      return;
    }

    if (isLastMember) {
      session.isActive = false;
      session.endTimeText = timeText;
      session.endedAt = now;
      session.receipts.forEach((r) => {
        if (r.isPresent) {
          r.isPresent = false;
          r.exitTimeText = timeText;
          r.exitedAt = now;
          r.exitReason = 'ปิดรอบบริการ';
        }
      });
    }

    await renderAndSaveSessionEmbed(cafeChannel, session, isLastMember);
  }
};

module.exports = {
  async handleCafeWelcome(oldState, newState, userName, userDataDB, client) {
    trackerQueue = trackerQueue
      .then(() => processCafeEvent(oldState, newState, userName, userDataDB, client))
      .catch((err) => console.error('[Cafe Tracker Queue Error] ❌', err.message));
    return trackerQueue;
  },
  confirmMemberSweetness,
  confirmMemberOrder: confirmMemberSweetness,
  formatProfessionalSweetness
};