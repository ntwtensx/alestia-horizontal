const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const CafeEvent = require('../../models/CafeEvent');
const CafeSession = require('../../models/CafeSession');
const memory = require('../../utils/sharedMemory');
const priceCatalog = require('../../utils/menuPriceCatalog');
const theme = require('../../config/theme');

const CAFE_CHANNEL_ID = theme.discordConfig?.cafeVoiceChannelId || '995629374722297946';
const FOOTER_ICON_URL = 'https://i.ibb.co/nMzNwcw0/119111-softbunnyinlove.png';
const { COIN_TEXT } = priceCatalog;

const FALLBACK_TEXTS = {
  sweetness: ['หวานน้อย 25%', 'หวานกำลังดี 50%', 'หวานปกติ 100%', 'ไม่ใส่น้ำตาล 0%', 'หวานละมุนสูตรบาริสต้า'],
  leave_normal: ['เดินโบกมือลา', 'เก็บของเดินยิ้มออก', 'อิ่มอร่อยแล้วเดินออก', 'จิบกาแฟหยดสุดท้ายแล้วเดินออก'],
  leave_rare: ['แอบวางทิปทองคำไว้บนโต๊ะแล้ววาร์ปหายไป', 'ได้รับการ์ดเชิญลับแล้วเดินยิ้มออก']
};

if (!memory.sessionMsgCache) memory.sessionMsgCache = new Map();
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

const processCafeEvent = async (oldState, newState, userName, userDataDB, client) => {
  const isChannelChange = oldState.channelId !== newState.channelId;
  const joinedCafe = isChannelChange && newState.channelId === CAFE_CHANNEL_ID;
  const leftCafe = isChannelChange && oldState.channelId === CAFE_CHANNEL_ID;
  if (!joinedCafe && !leftCafe) return;

  priceCatalog.syncPricesToDatabase().catch(() => null);

  const guild = newState.guild || oldState.guild;
  let cafeChannel = guild?.channels?.cache?.get(CAFE_CHANNEL_ID) || client?.channels?.cache?.get(CAFE_CHANNEL_ID);
  if (!cafeChannel && guild) cafeChannel = await guild.channels.fetch(CAFE_CHANNEL_ID).catch(() => null);
  if (!cafeChannel) return;

  const getUnixTimestampStr = () => `[<t:${Math.floor(Date.now() / 1000)}:t>]`;

  const sendGhostPing = async (text) => {
    try {
      const pingMsg = await sendWithRetry(cafeChannel, `> ${text}`);
      if (pingMsg) setTimeout(() => pingMsg.delete().catch(() => null), 5000);
    } catch (e) {}
  };

  const getMenuPartObj = async (category) => {
    try {
      const res = await CafeEvent.aggregate([{ $match: { category } }, { $sample: { size: 1 } }]);
      if (res.length > 0 && res[0].text) {
        const text = res[0].text;
        return { text, price: priceCatalog.getItemPrice(text, category, res[0].price) };
      }
    } catch (e) {}
    if (FALLBACK_TEXTS[category]) {
      const arr = FALLBACK_TEXTS[category];
      return { text: arr[Math.floor(Math.random() * arr.length)], price: 0 };
    }
    return { text: '', price: 0 };
  };

  const generateOrderDetails = async (uData) => {
    let selectedDrinkText = '';
    const dice = Math.floor(Math.random() * 100) + 1;
    const likedPool = [];

    if (uData) {
      if (uData.likedMenu1 && uData.likedMenu1 !== 'ขอคิดดูก่อน') likedPool.push(uData.likedMenu1.trim());
      if (uData.likedMenu2 && uData.likedMenu2 !== 'ขอคิดดูก่อน') likedPool.push(uData.likedMenu2.trim());
      if (Array.isArray(uData.likedMenus)) {
        uData.likedMenus.forEach(it => {
          if (it && it !== 'ขอคิดดูก่อน' && !likedPool.includes(it)) likedPool.push(it);
        });
      }
      if (uData.favoriteMenu && uData.favoriteMenu !== 'ขอคิดดูก่อน' && dice <= 50) {
        selectedDrinkText = uData.favoriteMenu.trim();
      } else if (likedPool.length > 0 && dice <= 80) {
        selectedDrinkText = likedPool[Math.floor(Math.random() * likedPool.length)];
      }
    }

    const [drinkObj, sweetnessObj, toppingObj, dessertObj] = await Promise.all([
      selectedDrinkText
        ? Promise.resolve({ text: selectedDrinkText, price: priceCatalog.getItemPrice(selectedDrinkText, 'drink', 0) })
        : getMenuPartObj('drink'),
      Math.random() <= 0.60 ? getMenuPartObj('sweetness') : Promise.resolve({ text: '', price: 0 }),
      Math.random() <= 0.40 ? getMenuPartObj('topping') : Promise.resolve({ text: '', price: 0 }),
      Math.random() <= 0.50 ? getMenuPartObj('dessert') : Promise.resolve({ text: '', price: 0 })
    ]);

    const drinkName = (drinkObj.text || 'เครื่องดื่มสูตรพิเศษของบาริสต้า').trim();
    const drinkPrice = drinkObj.price || 130;
    const sweetnessRaw = (sweetnessObj.text || '').trim();
    const sweetnessLabel = sweetnessRaw || 'หวานปกติ';
    const toppingName = (toppingObj.text || '').trim();
    const toppingPrice = toppingName ? toppingObj.price : 0;
    const dessertName = (dessertObj.text || '').trim();
    const dessertPrice = dessertName ? dessertObj.price : 0;
    const totalPrice = drinkPrice + toppingPrice + dessertPrice;

    const dessertPhrase = dessertName ? ` ทานคู่กับ${dessertName}` : '';
    const orderText = `${drinkName}${sweetnessRaw ? ' ' + sweetnessRaw : ''} ${toppingName}${dessertPhrase}`.replace(/\s+/g, ' ').trim();

    return {
      orderText, drinkName, sweetness: sweetnessLabel, drinkPrice,
      toppingName, toppingPrice, dessertName, dessertPrice, totalPrice
    };
  };

  const updateSessionLog = async ({ cId, cName, txt, isClosing = false, actorUser = null, isFirstMember = false, orderDetails = null, leaveReasonText = '' }) => {
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

        session.logLines.push(txt);
        if (session.logLines.length > 20) session.logLines.shift();

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

        const formattedRevenue = (session.totalRevenue || 0).toLocaleString('en-US');
        const safeName = session.authorName || defName;
        const safeAvatar = session.authorAvatar?.startsWith('http') ? session.authorAvatar : defAvatar;
        const durationStr = calculateDurationText(session, session.startTimeText);

        const embed = new EmbedBuilder()
          .setColor(isClosing ? closingColor : activeColor)
          .setTitle(`<a:spkran:1513650594546712706>${cName}<:694406valentinecupcake:1561353493984313424>บันทึกการเข้าใช้งาน`)
          .setAuthor({ name: safeName, iconURL: safeAvatar })
          .setDescription(session.logLines.join('\n'))
          .setFooter({
            text: `สถานะ: ${isClosing ? 'ปิดรอบบริการแล้ว' : 'กำลังให้บริการ'} | ยอดขายรวม ${formattedRevenue} ${COIN_TEXT}\n[ ใช้เวลาทั้งสิ้น ${durationStr} ]`,
            iconURL: FOOTER_ICON_URL
          });

        try {
          let targetMsg = memory.sessionMsgCache.get(cId);
          if (!targetMsg || targetMsg.id !== session.messageId) {
            targetMsg = await cafeChannel.messages.fetch(session.messageId);
            memory.sessionMsgCache.set(cId, targetMsg);
          }
          await targetMsg.edit({ embeds: [embed], components: [webButtonRow] });
        } catch (e) {
          embed.setTitle(`<a:spkran:1513650594546712706>${cName}<:694406valentinecupcake:1561353493984313424>บันทึกการเข้าใช้งาน (ข้อมูลกู้คืน)`);
          const newMsg = await sendWithRetry(cafeChannel, { embeds: [embed], components: [webButtonRow] });
          session.messageId = newMsg.id;
          memory.sessionMsgCache.set(cId, newMsg);
        }

        if (isClosing) memory.sessionMsgCache.delete(cId);
        await session.save();
      }
    } catch (err) {
      console.error('[DB Update Session Error] ❌:', err.message);
    }
  };

  const memberObj = newState.member || oldState.member;
  const actorUser = {
    id: memberObj?.id || '',
    name: userName,
    avatar: memberObj?.user?.displayAvatarURL({ extension: 'png', size: 128 }) || 'https://cdn.discordapp.com/embed/avatars/0.png'
  };

  if (joinedCafe) {
    const hMembers = cafeChannel.members.filter(m => !m.user.bot);
    const isFirstMember = hMembers.size <= 1;
    const orderDetails = await generateOrderDetails(userDataDB);
    const timeStr = getUnixTimestampStr();

    const logText = isFirstMember
      ? `${timeStr} <a:9887greentick:1562617728005705799>**${userName}** ได้ทำการสั่ง${orderDetails.orderText}เข้ามานั่งในคาเฟ่เป็นคนแรกค่ะ~✦`
      : `${timeStr} <a:9887greentick:1562617728005705799>**${userName}** ได้ทำการสั่ง${orderDetails.orderText}เข้ามานั่งในคาเฟ่แล้วค่ะ~✦`;

    await updateSessionLog({ cId: CAFE_CHANNEL_ID, cName: cafeChannel.name, txt: logText, isClosing: false, actorUser, isFirstMember, orderDetails });
    await sendGhostPing(logText);
  }

  if (leftCafe) {
    const hMembers = cafeChannel.members.filter(m => !m.user.bot);
    const timeStr = getUnixTimestampStr();
    let logText = '';
    let isClosing = false;
    let leaveReasonText = '';

    if (memory.sleepingUsers.has(memberObj?.id)) {
      memory.sleepingUsers.delete(memberObj?.id);
      const suffix = hMembers.size === 0 ? ' เป็นคนสุดท้ายค่ะ' : '';
      logText = `${timeStr} <a:1162greytick:1562617731583311872>**${userName}** หลับแล้วค่ะอเลสเทียจึงส่งไปห้องนอน${suffix}~✦`;
      leaveReasonText = `หลับแล้วค่ะอเลสเทียจึงส่งไปห้องนอน${suffix}~✦`;
      if (hMembers.size === 0) isClosing = true;
    } else {
      const isRareEvent = Math.random() <= 0.10;
      const leaveObj = await getMenuPartObj(isRareEvent ? 'leave_rare' : 'leave_normal');
      const leaveData = leaveObj.text || 'เดินโบกมือลา';

      if (hMembers.size === 0) {
        logText = `${timeStr} <a:1162greytick:1562617731583311872>**${userName}** ${leaveData}จากคาเฟ่เป็นคนสุดท้ายค่ะ~✦`;
        leaveReasonText = `${leaveData}จากคาเฟ่เป็นคนสุดท้ายค่ะ~✦`;
        isClosing = true;
      } else {
        logText = `${timeStr} <a:1162greytick:1562617731583311872>**${userName}** ${leaveData}จากคาเฟ่แล้วค่ะ~✦`;
        leaveReasonText = `${leaveData}จากคาเฟ่แล้วค่ะ~✦`;
      }
    }

    await updateSessionLog({ cId: CAFE_CHANNEL_ID, cName: cafeChannel.name, txt: logText, isClosing, actorUser, isFirstMember: false, orderDetails: null, leaveReasonText });
    await sendGhostPing(logText);
  }
};

module.exports = {
  async handleCafeWelcome(oldState, newState, userName, userDataDB, client) {
    trackerQueue = trackerQueue
      .then(() => processCafeEvent(oldState, newState, userName, userDataDB, client))
      .catch(err => console.error('[Cafe Tracker Queue Error] ❌', err.message));
    return trackerQueue;
  }
};