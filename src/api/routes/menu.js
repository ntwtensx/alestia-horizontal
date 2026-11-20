const express = require('express');
const priceCatalog = require('../../utils/menuPriceCatalog');

const router = express.Router();

// 📖 GET /api/menu/catalog — ส่งข้อมูลสมุดเมนูทั้งหมดแบ่งตามหมวดหมู่และระดับความแรร์
router.get('/catalog', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    await priceCatalog.syncMysteryMenusFromDB().catch(() => null);

    const categories = priceCatalog.getStructuredMenuCatalog();

    let totalDrinks = 0;
    let totalToppings = 0;
    let totalDesserts = 0;
    let totalMystery = 0;

    categories.forEach((cat) => {
      const count = Array.isArray(cat.items) ? cat.items.length : 0;
      if (cat.id === 'create_one') {
        totalMystery += count;
        totalDrinks += count;
      } else if (cat.typeKey === 'drink') {
        totalDrinks += count;
      } else if (cat.typeKey === 'topping') {
        totalToppings += count;
      } else if (cat.typeKey === 'dessert') {
        totalDesserts += count;
      }
    });

    res.status(200).json({
      ok: true,
      coinText: priceCatalog.COIN_TEXT || 'เหรียญทอง',
      defaultSweetness: priceCatalog.DEFAULT_SWEETNESS || 'หวานปกติ',
      stats: {
        totalAll: totalDrinks + totalToppings + totalDesserts,
        totalDrinks,
        totalToppings,
        totalDesserts,
        totalMystery
      },
      categories,
      updatedAt: Date.now()
    });
  } catch (err) {
    console.error('❌ [Menu API Error]:', err.message);
    res.status(500).json({
      ok: false,
      error: 'ไม่สามารถโหลดข้อมูลสมุดเมนูคาเฟ่ได้ในขณะนี้ค่ะ'
    });
  }
});

module.exports = {
  basePath: '/api/menu',
  router
};