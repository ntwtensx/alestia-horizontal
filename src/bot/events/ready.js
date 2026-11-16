const { ActivityType } = require('discord.js');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`🌸 [Alestia] บาริสต้า ${client.user.tag} พร้อมเสิร์ฟกาแฟใน Horizontal แล้ว!`);

    // ตั้งสถานะบอทสไตล์คาเฟ่ชิลๆ
    client.user.setActivity('กำลังดริปกาแฟที่ Horizontal ☕', {
      type: ActivityType.Custom,
      state: '☕ กำลังชงเครื่องดื่มต้อนรับสมาชิก Horizontal'
    });

    // ลงทะเบียน Slash Commands ทั้งหมดที่มีในโฟลเดอร์ commands ให้อัตโนมัติ
    try {
      const commandsData = client.commands.map(cmd => cmd.data.toJSON());

      // ดึงรายการคำสั่งเดิมบน Discord เพื่อตรวจสอบว่ามี Entry Point Command (Type 4) ค้างอยู่หรือไม่
      const existingCommands = await client.application.commands.fetch();
      const entryPoints = existingCommands.filter(cmd => cmd.type === 4);

      if (entryPoints.size > 0) {
        try {
          // วิธีที่ 1: แนบ Entry Point Command เดิมกลับเข้าไปในการอัปเดตพร้อมคำสั่งใหม่
          const payload = [
            ...commandsData,
            ...entryPoints.map(cmd => ({
              name: cmd.name,
              description: cmd.description || '',
              type: cmd.type
            }))
          ];
          await client.application.commands.set(payload);
        } catch (innerError) {
          // วิธีที่ 2: หาก Discord บังคับให้ลบแยกต่างหาก (Error 50240) ให้ลบ Entry Point ออกก่อนแล้วลงทะเบียนใหม่
          if (innerError.code === 50240) {
            console.log('🧹 [Alestia] กำลังเคลียร์ Entry Point Command ที่ค้างอยู่ออกให้ก่อน...');
            for (const [id] of entryPoints) {
              await client.application.commands.delete(id);
            }
            await client.application.commands.set(commandsData);
          } else {
            throw innerError;
          }
        }
      } else {
        await client.application.commands.set(commandsData);
      }

      console.log(`📋 [Alestia] อัปเดต Slash Commands จำนวน ${commandsData.length} คำสั่งเรียบร้อย!`);
    } catch (error) {
      console.error('❌ [Alestia] ไม่สามารถลงทะเบียน Slash Commands ได้:', error);
    }
  }
};