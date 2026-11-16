module.exports = {
  botName: 'Alestia',
  serverName: 'Horizontal',
  roleTitle: 'Barista & Server Concierge ☕',

  // โดเมนหน้าเว็บจริงบน Koyeb ของโปรเจกต์
  publicUrl: (
    process.env.PUBLIC_URL || 'https://cheerful-sande-ntwtensx-49047ca7.apps.mistral.run'
  ).replace(/\/+$/, ''),

  // ตั้งค่าระบบลงทะเบียน ยศ และห้องประจำคาเฟ่ Horizontal
  discordConfig: {
    guildId: process.env.GUILD_ID || '995310629562875984',
    registerChannelId: process.env.REGISTER_CHANNEL_ID || '995314291043479602',
    registerMessageId: process.env.REGISTER_MESSAGE_ID || '1524654022475120716',
    cafeVoiceChannelId: process.env.CAFE_CHANNEL_ID || '995629374722297946',
    memberRoleId: process.env.MEMBER_ROLE_ID || '995343114854211654',
    pinRoleId: process.env.PIN_ROLE_ID || '1565847680893063278',
    registerButtonEmoji: {
      id: '1513650594546712706',
      name: 'spkran',
      animated: true
    },
    registerButtonLabel: 'รับบัตรสมาชิก'
  },

  // โทนสี Aesthetic Pastel (ใช้ได้ทั้ง Discord Embed และส่งให้หน้าเว็บ React)
  colors: {
    latteCream: 0xFDFBF7,   // สีครีมนม
    pastelPink: 0xFFD1DC,   // สีชมพูพาสเทลซากุระ
    matchaGreen: 0xC1E1C1,  // สีเขียวมัทฉะพาสเทล
    caramelWarm: 0xE6CCB2,  // สีน้ำตาลคาราเมลอบอุ่น
    lavenderMist: 0xE2D1F9, // สีม่วงลาเวนเดอร์ชิลๆ
    berryAlert: 0xFFB7B2    // สีชมพูอมแดงพาสเทลสำหรับแจ้งเตือน
  },

  // สีสำหรับส่งไปให้ฝั่ง React (Hex String)
  webPalette: {
    background: '#FDFBF7',
    cardBg: '#FFF8F5',
    primaryAccent: '#FFD1DC',
    secondaryAccent: '#C1E1C1',
    textMain: '#504027'
  },

  // ข้อความมาตรฐานท้ายกล่องข้อความของ Alestia
  footerText: '☕ Alestia Barista • Horizontal Chill & Aesthetic Cafe'
};