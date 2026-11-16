const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.log('⚠️ [Database] ยังไม่ได้ตั้งค่า MONGO_URI ใน .env (บอทจะทำงานในโหมดไม่ใช้ฐานข้อมูลชั่วคราว)');
    return;
  }

  try {
    await mongoose.connect(uri);
    console.log('🍵 [Database] เชื่อมต่อฐานข้อมูล MongoDB สำหรับคาเฟ่ Horizontal สำเร็จ!');
  } catch (error) {
    console.error('❌ [Database] เชื่อมต่อ MongoDB ไม่สำเร็จ:', error.message);
  }
}

module.exports = connectDB;