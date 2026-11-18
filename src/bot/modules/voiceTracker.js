const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const CafeEvent = require('../../models/CafeEvent');
const CafeSession = require('../../models/CafeSession');
const UserDB = require('../../models/User');
const memory = require('../../utils/sharedMemory');
const priceCatalog = require('../../utils/menuPriceCatalog');
const theme = require('../../config/theme');

const CAFE_CHANNEL_ID = theme.discordConfig?.cafeVoiceChannelId || '995629374722297946';
const FOOTER_ICON_URL = 'https://i.ibb.co/nMzNwcw0/119111-softbunnyinlove.png';
const ORDER_TIMEOUT_MS = 60 * 1000; // 1 นาที
const { COIN_TEXT } = priceCatalog;

const FALLBACK_TEXTS = {
  leave_normal: ['เดินโบกมือลา', 'เก็บของเดินยิ้มออก', 'อิ่มอร่อยแล้วเดินออก', 'จิบกาแฟหยดสุดท้ายแล้วเดินออก'],
  leave_rare: ['แอบวางทิปทองคำไว้บนโต๊ะแล้ววาร์ปหายไป', 'ได้รับการ์ดเชิญลับแล้วเดินยิ้มออก']
};

if (!memory.sessionMsgCache) memory.sessionMsgCache = new Map();
if (!memory.pendingOrders) memory.pendingOrders = new Map();
if (!memory.kickedOrderReasons) memory.kickedOrderReasons = new Map();

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
  const dateKey = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
  const timeText = now.toLocaleTimeString('th-TH', {
    timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hour12: false
  });
  return { now, dateKey, timeText };
};

const getUnixTimestampStr = () => `[<t:${Math.floor(Date.now() / 1000)}:t>]`;

const sendWithRetry = async (channel, payload, maxRetries = 2) => {
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await channel.send(payload);
    } catch (err) {
      if (attempt > maxRetries) throw err;
      await new Promise(res => setTimeout(res, 1000 * attempt));
    }
  }
};

const calculateDurationText = (session, stTimeFallback = '') => {
  if (!session) return stTimeFallback ? `เพิ่งเริ่มบริการ (เปิดรอบ ${stTimeFallback} น.)` : 'เพิ่งเริ่มบริการ';
  let startMs = session.createdAt ? new Date(session.createdAt).getTime() : null;
  if (!startMs && session.messageId && /^\d+$/.test(session.messageId)) {
    try { startMs = Number((BigInt(session.messageId) >> 22n) + 1420070400000n); } catch (e) {}
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

async function renderAndSaveSessionEmbed(cafeChannel, session, isClosing = false) {
  const defAvatar = 'https://cdn.discordapp.com/embed/avatars/0.png';
  const defName = 'ไม่ทราบชื่อ';
  const activeColor = '#C89670';
  const closingColor = '#535294';
  const webButtonRow = createWebButtonRow();

  const formattedRevenue = (session.totalRevenue || 0).toLocaleString('en-US');
  const safeName = session.authorName || defName;
  const safeAvatar = session.authorAvatar?.startsWith('http') ? session.authorAvatar : defAvatar;
  const durationStr = calculateDurationText(session, session.startTimeText);

  const embed = new EmbedBuilder()
    .setColor(isClosing ? closingColor : activeColor)
    .setTitle(`<a:spkran:1513650594546712706>${cafeChannel.name}<:694406valentinecupcake:1561353493984313424>บันทึกการเข้าใช้งาน`)
    .setAuthor({ name: safeName, iconURL: safeAvatar })
    .setDescription((session.logLines || []).join('\n'))
    .setFooter({
      text: `สถานะ: ${isClosing ? 'ปิดรอบบริการแล้ว' : 'กำลังให้บริการ'} | ยอดขายรวม ${formattedRevenue} ${COIN_TEXT}\n[ ใช้เวลาทั้งสิ้น ${durationStr} ]`,
      iconURL: FOOTER_ICON_URL
    });

  try {
    let targetMsg = memory.sessionMsgCache.get(CAFE_CHANNEL_ID);
    if (!targetMsg || targetMsg.id !== session.messageId) {
      targetMsg = await cafeChannel.messages.fetch(session.messageId);
      memory.sessionMsgCache.set(CAFE_CHANNEL_ID, targetMsg);
    }
    await targetMsg.edit({ embeds: [embed], components: [webButtonRow] });
  } catch (e) {
    embed.setTitle(`<a:spkran:1513650594546712706>${cafeChannel.name}<:694406valentinecupcake:1561353493984313424>บันทึกการเข้าใช้งาน (ข้อมูลกู้คืน)`);
    const newMsg = await sendWithRetry(cafeChannel, { embeds: [embed], components: [webButtonRow] });
    session.messageId = newMsg.id;
    memory.sessionMsgCache.set(CAFE_CHANNEL_ID, newMsg);
  }

  if (isClosing) memory.sessionMsgCache.delete(CAFE_CHANNEL_ID);
  await session.save();
}

const updateSessionLog = async ({ cafeChannel, cId, cName, txt, isClosing = false, actorUser = null, isFirstMember = false, orderDetails = null, insertBelowEntryLine = '', leaveReasonText = '' }) => {
  try {
    const { now, dateKey, timeText } = getThaiDateTime();
    const defAvatar = 'https://cdn.discordapp.com/embed/avatars/0.png';
    const defName = 'ไม่ทราบชื่อ';

    let session = await CafeSession.findOne({ channelId: cId, isActive: { $ne: false } }).sort({ createdAt: -1 });

    if (session && isFirstMember) {
      if (!session.dateKey) session.dateKey = dateKey;
      session.isActive = false;
      session.endTimeText = timeText;
      session.endedAt = now;
      if (Array.isArray(session.receipts)) {
        session.receipts.forEach(r => {
          if (r.isPresent) {
            r.isPresent = false;
            r.exitTimeText = timeText;
            r.exitedAt = now;
            r.exitReason = 'ปิดรอบระบบอัตโนมัติ';
          }
        });
      }
      await session.save().catch(() => null);
      memory.sessionMsgCache.delete(cId);
      session = null;
    }

    const activeColor = '#C89670';
    const closingColor = '#535294';
    const webButtonRow = createWebButtonRow();

    const newReceiptObj = orderDetails
      ? {
          userId: actorUser?.id || 'unknown',
          userName: actorUser?.name || defName,
          userAvatar: actorUser?.avatar || defAvatar,
          enterTimeText: timeText,
          enteredAt: now,
          exitTimeText: '',
          exitedAt: null,
          exitReason: '',
          isPresent: true,
          drinkName: orderDetails.drinkName,
          sweetness: orderDetails.sweetness,
          drinkPrice: orderDetails.drinkPrice,
          toppingName: orderDetails.toppingName,
          toppingPrice: orderDetails.toppingPrice,
          dessertName: orderDetails.dessertName,
          dessertPrice: orderDetails.dessertPrice,
          totalPrice: orderDetails.totalPrice
        }
      : null;

    if (!session) {
      const aName = actorUser?.name || defName;
      const aAvatar = actorUser?.avatar?.startsWith('http') ? actorUser.avatar : defAvatar;
      const durationStr = calculateDurationText(null, timeText);
      const initialRevenue = orderDetails ? orderDetails.totalPrice : 0;

      const embed = new EmbedBuilder()
        .setColor(isClosing ? closingColor : activeColor)
        .setTitle(`<a:spkran:1513650594546712706>${cName}<:694406valentinecupcake:1561353493984313424>บันทึกการเข้าใช้งาน`)
        .setAuthor({ name: aName, iconURL: aAvatar })
        .setDescription(txt)
        .setFooter({
          text: `สถานะ: ${isClosing ? 'ปิดรอบบริการแล้ว' : 'กำลังให้บริการ'} | ยอดขายรวม ${initialRevenue.toLocaleString('en-US')} ${COIN_TEXT}\n[ ใช้เวลาทั้งสิ้น ${durationStr} ]`,
          iconURL: FOOTER_ICON_URL
        });

      const msg = await sendWithRetry(cafeChannel, { embeds: [embed], components: [webButtonRow] });

      await CafeSession.create({
        channelId: cId,
        messageId: msg.id,
        dateKey,
        isActive: !isClosing,
        logLines: [txt],
        startTimeText: timeText,
        endTimeText: isClosing ? timeText : '',
        endedAt: isClosing ? now : null,
        authorName: aName,
        authorAvatar: aAvatar,
        totalRevenue: initialRevenue,
        receipts: newReceiptObj ? [newReceiptObj] : []
      });

      if (!isClosing) memory.sessionMsgCache.set(cId, msg);
    } else {
      if (!session.dateKey) session.dateKey = dateKey;
      if (!Array.isArray(session.receipts)) session.receipts = [];
      if (!Array.isArray(session.logLines)) session.logLines = [];

      // กรณีสั่งเมนูสำเร็จ ให้แทรกบรรทัด - {เมนู} -{ท็อปปิ้ง} -{ขนม} ถัดจากบรรทัดแจ้งเข้าคาเฟ่ของคนนั้น
      if (insertBelowEntryLine) {
        let targetIdx = -1;
        for (let i = session.logLines.length - 1; i >= 0; i--) {
          if (session.logLines[i] === insertBelowEntryLine || (actorUser?.name && session.logLines[i].includes(`**${actorUser.name}** ได้เข้ามานั่งในคาเฟ่`))) {
            targetIdx = i;
            break;
          }
        }
        if (targetIdx !== -1) {
          session.logLines.splice(targetIdx + 1, 0, txt);
        } else {
          session.logLines.push(txt);
        }
      } else {
        session.logLines.push(txt);
      }

      if (session.logLines.length > 26) {
        session.logLines = session.logLines.slice(-26);
      }

      if (newReceiptObj) {
        session.receipts.push(newReceiptObj);
        session.totalRevenue = (session.totalRevenue || 0) + newReceiptObj.totalPrice;
      }

      if (!orderDetails && actorUser?.id && session.receipts.length > 0) {
        for (let i = session.receipts.length - 1; i >= 0; i--) {
          if (session.receipts[i].userId === actorUser.id && session.receipts[i].isPresent) {
            session.receipts[i].isPresent = false;
            session.receipts[i].exitTimeText = timeText;
            session.receipts[i].exitedAt = now;
            session.receipts[i].exitReason = leaveReasonText || 'ออกจากคาเฟ่';
            break;
          }
        }
      }

      if (isClosing) {
        session.isActive = false;
        session.endTimeText = timeText;
        session.endedAt = now;
        session.receipts.forEach(r => {
          if (r.isPresent) {
            r.isPresent = false;
            r.exitTimeText = timeText;
            r.exitedAt = now;
            r.exitReason = leaveReasonText || 'ปิดรอบบริการ';
          }
        });
      } else {
        session.isActive = true;
      }

      await renderAndSaveSessionEmbed(cafeChannel, session, isClosing);
    }
  } catch (err) {
    console.error('[DB Update Session Error] ❌:', err.message);
  }
};

// ✅ ฟังก์ชันยืนยันออเดอร์เมื่อสมาชิกพิมพ์สั่งเมนูในแชทสำเร็จ
async function confirmMemberOrder(userId, orderDetails, client) {
  const pending = memory.pendingOrders.get(userId);
  if (!pending) return false;

  if (pending.timer) clearTimeout(pending.timer);
  memory.pendingOrders.delete(userId);

  return (trackerQueue = trackerQueue.then(async () => {
    try {
      const cafeChannel = await getCafeChannel(client);
      if (!cafeChannel) return false;

      // 1. แก้ไขข้อความทวงออเดอร์ของอเลสเทียให้เป็นข้อความยืนยันถาวร
      if (pending.promptMsg) {
        await pending.promptMsg
          .edit(`☕ **คุณ${pending.userName}** ได้ทำการสั่ง **${orderDetails.orderText}** เรียบร้อยแล้วค่ะ~✦`)
          .catch(() => null);
      }

      // 2. หักเหรียญทองจากกระเป๋าจริง (หากลงทะเบียนไว้แล้ว)
      if (orderDetails.totalPrice > 0) {
        const userDoc = await UserDB.findOne({ discordId: userId }).lean().catch(() => null);
        if (userDoc && typeof userDoc.walletBalance === 'number') {
          const nextBal = Math.max(0, userDoc.walletBalance - orderDetails.totalPrice);
          await UserDB.updateOne({ discordId: userId }, { $set: { walletBalance: nextBal } }).catch(() => null);
        }
      }

      // 3. บันทึกบรรทัดย่อย - {เมนู} -{ท็อปปิ้ง} -{ขนม} ลงใน Embed ถัดจากบรรทัดเข้าคาเฟ่
      await updateSessionLog({
        cafeChannel,
        cId: CAFE_CHANNEL_ID,
        cName: cafeChannel.name,
        txt: orderDetails.embedOrderLine,
        isClosing: false,
        actorUser: pending.actorUser,
        isFirstMember: false,
        orderDetails,
        insertBelowEntryLine: pending.entryLogLine
      });

      return true;
    } catch (err) {
      console.error('❌ [confirmMemberOrder Error]:', err.message);
      return false;
    }
  }));
}

// 🚫 ฟังก์ชันปฏิเสธการให้บริการและดีดสมาชิกออกจากห้องเสียง (หมดเวลา 1 นาที / บอกไม่รู้ / บอกไม่สั่ง)
async function rejectAndKickMember(userId, reasonType, client) {
  const pending = memory.pendingOrders.get(userId);
  if (!pending) return false;

  if (pending.timer) clearTimeout(pending.timer);
  memory.pendingOrders.delete(userId);

  // ลบข้อความทวงออเดอร์ของบอทออกทันที
  if (pending.promptMsg) {
    await pending.promptMsg.delete().catch(() => null);
  }

  let reasonPhrase = 'ไม่ยอมสั่งเมนูอะไรเลยจึงของดให้บริการ';
  if (reasonType === 'HESITATE') {
    reasonPhrase = 'ไม่รู้จะสั่งเมนูอะไรดี งั้นลองออกไปคิดดูก่อนนะคะ';
  } else if (reasonType === 'REFUSE') {
    reasonPhrase = 'ปฏิเสธการสั่งเมนูจึงของดให้บริการ';
  }

  // เก็บสาเหตุไว้ให้ event leftCafe นำไปลงบันทึกใน Embed ตอนถูกดีดออก
  memory.kickedOrderReasons.set(userId, reasonPhrase);

  try {
    const cafeChannel = await getCafeChannel(client);
    const guild = cafeChannel?.guild || client?.guilds?.cache?.first();
    const member = guild?.members?.cache?.get(userId) || (guild ? await guild.members.fetch(userId).catch(() => null) : null);

    if (member?.voice?.channelId === CAFE_CHANNEL_ID) {
      await member.voice.disconnect(reasonPhrase);
      return true;
    }
  } catch (kickErr) {
    // กรณีเตะไม่ได้ (เช่น เป็นเจ้าของเซิร์ฟเวอร์) ให้ลงบันทึกงดให้บริการใน Embed ทันทีโดยไม่ค้าง
    memory.kickedOrderReasons.delete(userId);
    trackerQueue = trackerQueue.then(async () => {
      const cafeChannel = await getCafeChannel(client);
      if (!cafeChannel) return;
      const timeStr = getUnixTimestampStr();
      const logText = `${timeStr} <a:1162greytick:1562617731583311872>**${pending.userName}** ${reasonPhrase}ค่ะ~✦`;
      await updateSessionLog({
        cafeChannel,
        cId: CAFE_CHANNEL_ID,
        cName: cafeChannel.name,
        txt: logText,
        isClosing: false,
        actorUser: pending.actorUser,
        leaveReasonText: reasonPhrase
      });
    });
  }
  return true;
}

const processCafeEvent = async (oldState, newState, userName, userDataDB, client) => {
  const isChannelChange = oldState.channelId !== newState.channelId;
  const joinedCafe = isChannelChange && newState.channelId === CAFE_CHANNEL_ID;
  const leftCafe = isChannelChange && oldState.channelId === CAFE_CHANNEL_ID;
  if (!joinedCafe && !leftCafe) return;

  priceCatalog.syncPricesToDatabase().catch(() => null);

  const guild = newState.guild || oldState.guild;
  const cafeChannel = await getCafeChannel(client, guild);
  if (!cafeChannel) return;

  const getMenuPartObj = async (category) => {
    try {
      const res = await CafeEvent.aggregate([{ $match: { category } }, { $sample: { size: 1 } }]);
      if (res.length > 0 && res[0].text) {
        return { text: res[0].text, price: 0 };
      }
    } catch (e) {}
    if (FALLBACK_TEXTS[category]) {
      const arr = FALLBACK_TEXTS[category];
      return { text: arr[Math.floor(Math.random() * arr.length)], price: 0 };
    }
    return { text: '', price: 0 };
  };

  const memberObj = newState.member || oldState.member;
  const userId = memberObj?.id || '';
  const actorUser = {
    id: userId,
    name: userName,
    avatar: memberObj?.user?.displayAvatarURL({ extension: 'png', size: 128 }) || 'https://cdn.discordapp.com/embed/avatars/0.png'
  };

  // ==========================================
  // 🌸 1. เมื่อสมาชิกเดินเข้าห้องเสียงคาเฟ่
  // ==========================================
  if (joinedCafe) {
    // ล้างคิวเก่าถ้าเคยค้างอยู่
    if (memory.pendingOrders.has(userId)) {
      const oldPending = memory.pendingOrders.get(userId);
      if (oldPending.timer) clearTimeout(oldPending.timer);
      if (oldPending.promptMsg) oldPending.promptMsg.delete().catch(() => null);
      memory.pendingOrders.delete(userId);
    }
    memory.kickedOrderReasons.delete(userId);

    const hMembers = cafeChannel.members.filter(m => !m.user.bot);
    const isFirstMember = hMembers.size <= 1;
    const timeStr = getUnixTimestampStr();

    // ข้อความต้อนรับหลักใน Embed แจ้งเฉพาะว่าเดินเข้ามานั่งในคาเฟ่แล้ว
    const entryLogLine = isFirstMember
      ? `${timeStr} <a:9887greentick:1562617728005705799>**${userName}** ได้เข้ามานั่งในคาเฟ่เป็นคนแรกค่ะ~✦`
      : `${timeStr} <a:9887greentick:1562617728005705799>**${userName}** ได้เข้ามานั่งในคาเฟ่แล้วค่ะ~✦`;

    await updateSessionLog({
      cafeChannel,
      cId: CAFE_CHANNEL_ID,
      cName: cafeChannel.name,
      txt: entryLogLine,
      isClosing: false,
      actorUser,
      isFirstMember,
      orderDetails: null
    });

    // ส่งข้อความแท็กสมาชิกพร้อมเวลานับถอยหลังไดนามิก 1 นาที (<t:TIMESTAMP:R>)
    const deadlineUnix = Math.floor((Date.now() + ORDER_TIMEOUT_MS) / 1000);
    const promptText = `<@${userId}> รับอะไรดีคะ เข้ามาแล้วต้องสั่งเมนูนะคะไม่งั้นจะไม่ให้ใช้บริการค่ะ กรุณาให้ออเดอร์ภายใน <t:${deadlineUnix}:R> นี้ด้วยค่ะ`;
    const promptMsg = await sendWithRetry(cafeChannel, promptText).catch(() => null);

    // ตั้งเวลา 1 นาที หากไม่สั่งเมนูจะดีดออกจากห้องเสียงทันที
    const timer = setTimeout(() => {
      rejectAndKickMember(userId, 'TIMEOUT', client).catch(() => null);
    }, ORDER_TIMEOUT_MS);

    memory.pendingOrders.set(userId, {
      userId,
      userName,
      userDataDB,
      actorUser,
      promptMsg,
      entryLogLine,
      timer,
      joinedAt: Date.now()
    });
  }

  // ==========================================
  // 🚪 2. เมื่อสมาชิกออกจากห้องเสียงคาเฟ่ (หรือถูกบอทดีดออก)
  // ==========================================
  if (leftCafe) {
    // กรณีเดินออกเองระหว่างที่ยังไม่ได้สั่งเมนู ให้ยกเลิกตัวจับเวลาและลบข้อความทวงออเดอร์
    let leftBeforeOrdering = false;
    if (memory.pendingOrders.has(userId)) {
      const pending = memory.pendingOrders.get(userId);
      if (pending.timer) clearTimeout(pending.timer);
      if (pending.promptMsg) await pending.promptMsg.delete().catch(() => null);
      memory.pendingOrders.delete(userId);
      leftBeforeOrdering = true;
    }

    const hMembers = cafeChannel.members.filter(m => !m.user.bot);
    const isLastMember = hMembers.size === 0;
    const suffix = isLastMember ? 'เป็นคนสุดท้ายค่ะ~✦' : 'ค่ะ~✦';
    const timeStr = getUnixTimestampStr();
    let logText = '';
    let isClosing = isLastMember;
    let leaveReasonText = '';

    // ตรวจสอบว่าถูกบอทดีดออกเพราะไม่สั่งเมนู / บอกไม่รู้ / ปฏิเสธ หรือไม่
    if (memory.kickedOrderReasons.has(userId)) {
      const kickReason = memory.kickedOrderReasons.get(userId);
      memory.kickedOrderReasons.delete(userId);
      logText = `${timeStr} <a:1162greytick:1562617731583311872>**${userName}** ${kickReason}${isLastMember ? ' (ปิดรอบบริการค่ะ)' : ''}~✦`;
      leaveReasonText = kickReason;
    } else if (memory.sleepingUsers.has(userId)) {
      memory.sleepingUsers.delete(userId);
      const sleepSuffix = isLastMember ? ' เป็นคนสุดท้ายค่ะ' : '';
      logText = `${timeStr} <a:1162greytick:1562617731583311872>**${userName}** หลับแล้วค่ะอเลสเทียจึงส่งไปห้องนอน${sleepSuffix}~✦`;
      leaveReasonText = `หลับแล้วค่ะอเลสเทียจึงส่งไปห้องนอน${sleepSuffix}~✦`;
    } else if (leftBeforeOrdering) {
      logText = `${timeStr} <a:1162greytick:1562617731583311872>**${userName}** เดินออกจากคาเฟ่ไปก่อนสั่งเมนู${suffix}`;
      leaveReasonText = `เดินออกจากคาเฟ่ไปก่อนสั่งเมนู${suffix}`;
    } else {
      const isRareEvent = Math.random() <= 0.10;
      const leaveObj = await getMenuPartObj(isRareEvent ? 'leave_rare' : 'leave_normal');
      const leaveData = leaveObj.text || 'เดินโบกมือลา';

      if (isLastMember) {
        logText = `${timeStr} <a:1162greytick:1562617731583311872>**${userName}** ${leaveData}จากคาเฟ่เป็นคนสุดท้ายค่ะ~✦`;
        leaveReasonText = `${leaveData}จากคาเฟ่เป็นคนสุดท้ายค่ะ~✦`;
      } else {
        logText = `${timeStr} <a:1162greytick:1562617731583311872>**${userName}** ${leaveData}จากคาเฟ่แล้วค่ะ~✦`;
        leaveReasonText = `${leaveData}จากคาเฟ่แล้วค่ะ~✦`;
      }
    }

    await updateSessionLog({
      cafeChannel,
      cId: CAFE_CHANNEL_ID,
      cName: cafeChannel.name,
      txt: logText,
      isClosing,
      actorUser,
      isFirstMember: false,
      orderDetails: null,
      leaveReasonText
    });
  }
};

module.exports = {
  async handleCafeWelcome(oldState, newState, userName, userDataDB, client) {
    trackerQueue = trackerQueue
      .then(() => processCafeEvent(oldState, newState, userName, userDataDB, client))
      .catch(err => console.error('[Cafe Tracker Queue Error] ❌', err.message));
    return trackerQueue;
  },
  confirmMemberOrder,
  rejectAndKickMember
};