const CafeEvent = require('../models/CafeEvent');

// 🪙 อิโมจิเหรียญทองประจำระบบ (ใช้ในข้อความแชทและ Embed Description)
const COIN_EMOJI = '<a:coin:1563947103032713268>';
// 🏷️ ชื่อเรียกสกุลเงินสำหรับส่วน Footer
const COIN_TEXT = 'เหรียญทอง';

// ==========================================
// ☕ 1. หมวดกาแฟ (Coffee: เฟส 1 [28 เมนู] + เฟส 2 [12 เมนู] = 40 เมนู)
// ==========================================
const COFFEE_PRICES = {
  // --- เฟสที่ 1 (28 เมนู) ---
  'เอสเพรสโซ่ซิกเนเจอร์เบลนด์': 80,
  'ริสเทรตโต้เพียวช็อต': 85,
  'อเมริกาโน่เฮาส์เบลนด์': 85,
  'พิคโคโล่ลาเต้คั่วอ่อน': 95,
  'คาปูชิโน่คลาสสิกฟองนมกำมะหยี่': 100,
  'แฟลตไวท์ละมุนลิ้น': 105,
  'ลาเต้อาร์ตมาสเตอร์พีซ': 110,
  'มอคค่าดาร์กช็อกโกแลต': 115,
  'วานิลลาบีนลาเต้': 120,
  'คาราเมลมัคคิอาโต้ครัมเบิล': 125,
  'แบล็คออเรนจ์ซันไรส์': 125,
  'เดอร์ตี้คอฟฟี่สกัดเย็น': 130,
  'โรสแมรี่ฮันนี่แบล็ค': 130,
  'เฮเซลนัทพราลีนคอฟฟี่': 135,
  'พีชบลอสซั่มอเมริกาโน่': 135,
  'โคโคนัทคลาวด์คอฟฟี่': 140,
  'ลิ้นจี่เอสเพรสโซ่โทนิค': 140,
  'ยูซุอเมริกาโน่สปาร์คกลิ้ง': 145,
  'แมคคาเดเมียทอฟฟี่นัทลาเต้': 145,
  'ทีรามิสุคอฟฟี่ครีม': 150,
  'อูจิมัทฉะพรีเมียมลาเต้': 150,
  'อัฟโฟกาโต้มาดากัสการ์วานิลลา': 155,
  'โคลอมเบียซูพรีโม่โคลด์บรูว์': 160,
  'คอสตาริกาทาร์ราซูดริปเย็น': 170,
  'เอธิโอเปียเยอร์กาเชฟฟ์ดริป': 180,
  'เคนยาเอเอฟิลเตอร์': 185,
  'กัวเตมาลาแอนติกัวไซฟอน': 210,
  'ปานามาเกอิชาสเปเชียลตี้': 350,

  // --- ✨ เฟสที่ 2: กาแฟสเปเชียลตี้ & แรร์ออริจิน (+12 เมนู) ---
  'ซอลท์เท็ดคาราเมลเอสเพรสโซ่เชคเกอร์ราโต้': 135,
  'เมเปิ้ลพีแคนสโมคกี้ลาเต้': 155,
  'ดาร์กช็อกโกแลตออเรนจ์คอนยัคคอฟฟี่': 160,
  'พิสตาชิโอครีมบรูเล่ลาเต้': 165,
  'แซฟฟรอนโกลเด้นลาเต้หญ้าฝรั่น': 175,
  'รวันดาเบอร์บอนเรดฮันนี่ฟิลเตอร์': 190,
  'เยเมนมอคค่ามาตารีดริปโบราณ': 220,
  'ฮาวายโคน่าเอ็กซ์ตร้าแฟนซีไซฟอน': 240,
  'โคลอมเบียวิสกี้บาร์เรลเอจโคลด์บรูว์': 260,
  'เอสเพรสโซ่ไวท์ทรัฟเฟิลคาเวียร์': 290,
  'ปานามาเกอิชาออโรร่าสกัดเย็น': 340,
  'จาเมกาบลูเมาท์เทนดริปทองคำ': 380
};

// ==========================================
// 🍵 2. หมวดชา (Tea: เฟส 1 [10 เมนู] + เฟส 2 [14 เมนู] = 24 เมนู)
// ==========================================
const TEA_PRICES = {
  // --- เฟสที่ 1 (10 เมนู) ---
  'อิงลิชเบรกฟาสต์ออริจินัล': 85,
  'ชานมไต้หวันรอยัล': 95,
  'เกียวโตเก็นไมฉะ': 100,
  'เอิร์ลเกรย์ลาเวเดอร์': 105,
  'เอิร์ลเกรย์ลาเวนเดอร์': 105,
  'ชาไทยสเลอปี้ซิกเนเจอร์': 110,
  'โฮจิฉะคั่วไฟอ่อน': 115,
  'ชาคาโมมายล์น้ำผึ้งป่า': 120,
  'ชาพีชขาวสกัดเย็น': 125,
  'อู่หลงทิอินกวนอิม': 135,
  'ไวท์ช็อกโกแลตมัทฉะ': 145,

  // --- ✨ เฟสที่ 2: ชาจักรพรรดิ & มัทฉะเกรดพิธีการ (+14 เมนู) ---
  'ชาเขียวมะลิไข่มุกมังกรขาว': 130,
  'ชาขาวลูกแพรหิมะน้ำผึ้งป่า': 140,
  'มัทฉะสตรอว์เบอร์รีฮอกไกโดเลเยอร์': 150,
  'ชาเอิร์ลเกรย์เบอร์กาม็อตครีมชีส': 155,
  'ชากุหลาบดามัสก์ลิ้นจี่จักรพรรดิ': 160,
  'ชาอู่หลงหอมหมื่นลี้ทองคำสกัดเย็น': 165,
  'โฮจิฉะคุโรมิตสึคินาโกะครีมลาเต้': 170,
  'มัทฉะไวท์ทรัฟเฟิลฟองนมฮอกไกโด': 185,
  'ชาเขียวหลงจิ่งทะเลสาบซีหูพรีเมียม': 200,
  'ชาดาร์จีลิ่งเฟิร์สฟลัชหิมาลัย': 225,
  'ชาขาวเข็มเงินจักรพรรดิไป๋หาวอิ๋นเจิน': 250,
  'ชาผู่เอ๋อร์วินเทจบ่มยี่สิบปี': 280,
  'ชาอู่หลงต้าหงเผาผาหินโบราณ': 310,
  'อูจิเกียวคุโระมัทฉะเกรดจักรพรรดิ': 360
};

// ==========================================
// 🍹 3. หมวดน้ำหวาน คราฟต์ม็อกเทล & สมูทตี้ (Other Drinks: เฟส 1 [12 เมนู] + เฟส 2 [14 เมนู] = 26 เมนู)
// ==========================================
const OTHER_DRINK_PRICES = {
  // --- เฟสที่ 1 (12 เมนู) ---
  'พลัมสไปรท์สแปลช': 85,
  'บลูฮาวายโอเชียน': 90,
  'แอปเปิ้ลกีวีพาราไดซ์': 95,
  'มิกซ์เบอร์รี่โรสโซดา': 105,
  'แพชชั่นฟรุตซันเซ็ตทวิสต์': 110,
  'เกรปฟรุตเอลเดอร์ฟลาวเวอร์': 115,
  'ซิกเนเจอร์ดาร์กโกโก้': 120,
  'ยูซุฮันนี่เลมอนสปาร์คกลิ้ง': 125,
  'ทรอปิคอลแมงโก้สมูทตี้': 130,
  'มิ้นต์ช็อกโกแลตชิปเฟรปเป้': 135,
  'สตรอว์เบอร์รีชีสเค้กเฟรปเป้': 145,
  'เบลเยียมช็อกโกแลตฟองดูว์': 160,

  // --- ✨ เฟสที่ 2: คราฟต์ม็อกเทล สมูทตี้ & ช็อกโกแลตพรีเมียม (+14 เมนู) ---
  'น้ำผึ้งมะนาวโซดาโรสแมรี่สกัดเย็น': 125,
  'ราสป์เบอร์รีโรสเลมอนทวิสต์': 135,
  'แบล็คฟอเรสต์เชอร์รีช็อกโกแลตสมูทตี้': 150,
  'ดาร์กช็อกโกแลตเฮเซลนัทเฟอร์เรโร่เฟรปเป้': 155,
  'แมงโก้เสาวรสชีสพายเฟรปเป้': 160,
  'ไวท์พีชซากุระคริสตัลโซดา': 165,
  'บลูคูราโซ่กาแล็กซีอัญชันเลมอนเนด': 175,
  'อะโวคาโดพิตาชิโอฮอกไกโดมิลค์เชค': 185,
  'ทับทิมสยามโรสโกลด์สปาร์คกลิ้ง': 195,
  'ยูซุโกลด์บลอสซั่มเอลเดอร์ฟลาวเวอร์ฟิซ': 215,
  'สตรอว์เบอร์รีขาวโคโตกะสมูทตี้ครีมสด': 235,
  'ไชน์มัสแคทแชมเปญคราฟต์ม็อกเทล': 265,
  'เมล่อนคราวน์ฮอกไกโดโฟลตพรีเมียม': 295,
  'วัลโรนาช็อกโกแลตโกลด์ทรัฟเฟิลฟองดูว์': 330
};

const DRINK_PRICES = {
  ...COFFEE_PRICES,
  ...TEA_PRICES,
  ...OTHER_DRINK_PRICES
};

// ==========================================
// 🍯 4. หมวดท็อปปิ้งเพิ่มเติม (Toppings: เฟส 1 [30 เมนู] + เฟส 2 [5 เมนู] = 35 เมนู)
// ==========================================
const TOPPING_PRICES = {
  'โรยซินนามอนดัสต์': 10,
  'ประดับเลมอนสไลซ์ดีไฮเดรต': 15,
  'โรยโอรีโอ้ครัช': 15,
  'โรยคอร์นเฟลกส์อบเนยน้ำผึ้ง': 15,
  'ราดโฮมเมดคาราเมลซอส': 20,
  'เพิ่มไข่มุกบราวน์ชูการ์อุ่น': 20,
  'เพิ่มบราวน์ชูการ์บุกกรุบ': 20,
  'ใส่คอฟฟี่เจลลี่สกัดเย็น': 25,
  'ใส่เอิร์ลเกรย์เจลลี่': 25,
  'ใส่อโลเวร่าฮันนี่เลมอน': 25,
  'ท็อปด้วยโกลเด้นคริสตัลเพิร์ล': 25,
  'เพิ่มไข่มุกป๊อปสตรอว์เบอร์รี': 25,
  'ราดดาร์กช็อกโกแลตกานาชดริซเซิล': 25,
  'โรยโลตัสบิสคอฟครัมเบิล': 25,
  'โรยออร์แกนิกโกโก้นิบส์': 25,
  'ท็อปด้วยมาร์ชเมลโลว์เบิร์นไฟ': 25,
  'เพิ่มไข่มุกป๊อปยูซุ': 30,
  'ราดสตรอว์เบอร์รีเพียวเร่เข้มข้น': 30,
  'โรยอัลมอนด์พราลีน': 30,
  'ท็อปด้วยวิปปิ้งครีมวานิลลาบีน': 30,
  'ท็อปด้วยดาร์กช็อกโกแลตวิปครีม': 35,
  'ราดคาราเมลมัคคิอาโต้โฟม': 35,
  'ราดฮอกไกโดมิลค์โฟม': 35,
  'ราดซีซอลท์ครีมชีสโฟม': 40,
  'ท็อปด้วยมัทฉะครีมสด': 40,
  'ท็อปด้วยแมคคาเดเมียอบคาราเมล': 45,
  'ท็อปด้วยไอศกรีมวานิลลามาดากัสการ์': 55,
  'ท็อปด้วยไอศกรีมมัทฉะเกียวโต': 60,
  'ประดับรังผึ้งป่าแท้': 65,
  'ตกแต่งด้วยแผ่นทองคำเปลวออร์แกนิก': 90,

  // --- ✨ เฟสที่ 2: ท็อปปิ้งกูร์เมต์พรีเมียม (+5 เมนู) ---
  'โรยครัมเบิลเนยฝรั่งเศสเกรียงเดอเซล': 40,
  'ราดซอสพิตาชิโอคั่วบดเข้มข้น': 50,
  'ท็อปด้วยมินิมาการองเคลือบทองคำ': 65,
  'ประดับสตรอว์เบอร์รีขาวฮอกไกโดสด': 75,
  'ท็อปด้วยครีมไวท์ทรัฟเฟิลอิตาเลียน': 85
};

// ==========================================
// 🥐 5. หมวดของทานเล่นและเบเกอรี (Desserts: เฟส 1 [20 เมนู] + เฟส 2 [5 เมนู] = 25 เมนู)
// ==========================================
const DESSERT_PRICES = {
  'ซอฟต์คุกกี้แมคคาเดเมียไวท์ช็อก': 65,
  'มาการองราสป์เบอร์รีโรส': 75,
  'แคนเนเล่เดอบอร์กโดซ์': 80,
  'บัตเตอร์ครัวซองต์ฝรั่งเศส': 85,
  'ครัฟเฟิลเคลือบน้ำตาลคาราเมล': 85,
  'ฟัดจ์บราวนี่เนื้อหนึบหน้าฟิล์ม': 90,
  'เอแคลร์วานิลลาบีน': 95,
  'สโคนแครนเบอร์รีครีมสด': 95,
  'ควินญ่าอามันคลาสสิก': 105,
  'อัลมอนด์ครัวซองต์ครีมมี่': 115,
  'ดาร์กช็อกโกแลตพานาคอตต้า': 115,
  'ทาร์ตเลมอนเมอแรงก์': 125,
  'แครอทเค้กครีมชีสฟรอสติ้ง': 130,
  'ทาร์ตผลไม้รวมสดใหม่': 135,
  'แซนด์วิชแฮมชีสพานินี่': 135,
  'บาสก์ชีสเค้กหน้าไหม้': 140,
  'คร็อกเมอซิเยอร์ทราดิชันแนล': 145,
  'นิวยอร์กชีสเค้กซอสเบอร์รีรวม': 150,
  'ทิรามิสุมาสคาโปนแท้': 155,
  'สตรอว์เบอร์รีชอร์ตเค้กฮอกไกโด': 165,

  // --- ✨ เฟสที่ 2: พาทิสเซอรีและของทานเล่นไฟน์ไดนิ่ง (+5 เมนู) ---
  'เลมอนยูซุทาร์ตเมอแรงก์เบิร์นไฟ': 140,
  'ปารีสเบรสต์เฮเซลนัทพราลีนครีมมี่': 165,
  'บริยอชฮันนี่โทสต์ไอศกรีมวานิลลาทรัฟเฟิล': 185,
  'มงบล็องเกาลัดฝรั่งเศสครีมสดฮอกไกโด': 195,
  'มิลเฟยวานิลลามาดากัสการ์ครีมทองคำ': 220
};

const MASTER_PRICE_MAP = new Map([
  ...Object.entries(DRINK_PRICES),
  ...Object.entries(TOPPING_PRICES),
  ...Object.entries(DESSERT_PRICES)
]);

const OFFICIAL_SSR_DRINK_PRICES = new Set(
  Object.values(DRINK_PRICES).filter((p) => p >= 180)
);

const MYSTERY_MENU_SET = new Set();

const rollMysteryPrice = () => {
  let rolled = Math.floor(Math.random() * (999 - 199 + 1)) + 199;
  while (OFFICIAL_SSR_DRINK_PRICES.has(rolled)) {
    rolled += 1;
  }
  return rolled;
};

const isMysteryMenu = (itemName) => {
  if (!itemName || typeof itemName !== 'string') return false;
  const clean = itemName.trim();
  if (!clean) return false;
  if (MYSTERY_MENU_SET.has(clean)) return true;
  if (!MASTER_PRICE_MAP.has(clean)) {
    for (const knownName of MASTER_PRICE_MAP.keys()) {
      if (clean.includes(knownName)) return false;
    }
    return true;
  }
  return false;
};

const getItemTier = (price, type = 'drink', itemName = '') => {
  const p = Number(price || 0);
  const cleanName = itemName ? itemName.trim() : '';

  const isOfficialMenu = cleanName && MASTER_PRICE_MAP.has(cleanName);

  if (
    p === -1 ||
    (cleanName && isMysteryMenu(cleanName)) ||
    (!isOfficialMenu && type === 'drink' && p >= 199 && !OFFICIAL_SSR_DRINK_PRICES.has(p))
  ) {
    return { code: '?', label: '? • Create one', rank: 5 };
  }

  if (type === 'topping') {
    if (p >= 55) return { code: 'SSR', label: 'SSR • Grand Reserve', rank: 4 };
    if (p >= 35) return { code: 'SR', label: 'SR • Specialty', rank: 3 };
    if (p >= 25) return { code: 'R', label: 'R • Barista Craft', rank: 2 };
    return { code: 'C', label: 'C • Classic House', rank: 1 };
  }

  if (type === 'dessert') {
    if (p >= 150) return { code: 'SSR', label: 'SSR • Grand Reserve', rank: 4 };
    if (p >= 125) return { code: 'SR', label: 'SR • Specialty', rank: 3 };
    if (p >= 95) return { code: 'R', label: 'R • Barista Craft', rank: 2 };
    return { code: 'C', label: 'C • Classic House', rank: 1 };
  }

  if (p >= 180) return { code: 'SSR', label: 'SSR • Grand Reserve', rank: 4 };
  if (p >= 145) return { code: 'SR', label: 'SR • Specialty', rank: 3 };
  if (p >= 115) return { code: 'R', label: 'R • Barista Craft', rank: 2 };
  return { code: 'C', label: 'C • Classic House', rank: 1 };
};

const buildCategoryItems = (dict, typeKey, categoryId, categoryTitle, icon) => {
  return Object.entries(dict)
    .filter(([name]) => name !== 'เอิร์ลเกรย์ลาเวเดอร์')
    .map(([name, price]) => {
      const tier = getItemTier(price, typeKey, name);
      return {
        name,
        price,
        isMystery: false,
        categoryId,
        categoryTitle,
        icon,
        tierCode: tier.code,
        tierLabel: tier.label,
        tierRank: tier.rank
      };
    })
    .sort((a, b) => b.price - a.price);
};

const buildMysteryCategoryItems = () => {
  return Array.from(MYSTERY_MENU_SET).map((name) => ({
    name,
    price: 999,
    priceRangeText: '199 - 999',
    isMystery: true,
    categoryId: 'create_one',
    categoryTitle: 'Create one (?)',
    icon: '🌈',
    tierCode: '?',
    tierLabel: '? • Create one',
    tierRank: 5
  }));
};

const getStructuredMenuCatalog = () => {
  const mysteryItems = buildMysteryCategoryItems();
  const categories = [];

  if (mysteryItems.length > 0) {
    categories.push({
      id: 'create_one',
      title: 'เมนูปริศนาสร้างสรรค์ (? • Create one)',
      icon: '🌈',
      typeKey: 'drink',
      items: mysteryItems
    });
  }

  categories.push(
    {
      id: 'coffee',
      title: 'กาแฟสเปเชียลตี้ & แรร์ออริจิน (Coffee)',
      icon: '☕',
      typeKey: 'drink',
      items: buildCategoryItems(COFFEE_PRICES, 'drink', 'coffee', 'กาแฟ (Coffee)', '☕')
    },
    {
      id: 'tea',
      title: 'ชาจักรพรรดิ & มัทฉะเกรดพิธีการ (Artisan Tea)',
      icon: '🍵',
      typeKey: 'drink',
      items: buildCategoryItems(TEA_PRICES, 'drink', 'tea', 'ชา (Tea)', '🍵')
    },
    {
      id: 'other_drink',
      title: 'คราฟต์ม็อกเทล สมูทตี้ & ช็อกโกแลต (Craft & Refreshers)',
      icon: '🍹',
      typeKey: 'drink',
      items: buildCategoryItems(OTHER_DRINK_PRICES, 'drink', 'other_drink', 'น้ำหวาน/คราฟต์ม็อกเทล', '🍹')
    },
    {
      id: 'dessert',
      title: 'ของทานเล่น & พาทิสเซอรีฝรั่งเศส (Desserts)',
      icon: '🥐',
      typeKey: 'dessert',
      items: buildCategoryItems(DESSERT_PRICES, 'dessert', 'dessert', 'ของทานเล่น (Desserts)', '🥐')
    },
    {
      id: 'topping',
      title: 'ท็อปปิ้งกูร์เมต์เพิ่มเติม (Toppings)',
      icon: '🍯',
      typeKey: 'topping',
      items: buildCategoryItems(TOPPING_PRICES, 'topping', 'topping', 'ท็อปปิ้ง (Toppings)', '🍯')
    }
  );

  return categories;
};

let isSyncedWithDB = false;

module.exports = {
  COIN_EMOJI,
  COIN_TEXT,
  COFFEE_PRICES,
  TEA_PRICES,
  OTHER_DRINK_PRICES,
  DRINK_PRICES,
  TOPPING_PRICES,
  DESSERT_PRICES,
  OFFICIAL_SSR_DRINK_PRICES,
  MYSTERY_MENU_SET,
  rollMysteryPrice,
  isMysteryMenu,
  getItemTier,
  getStructuredMenuCatalog,

  async addMysteryMenuToCatalog(rawMenuName) {
    if (!rawMenuName || typeof rawMenuName !== 'string') {
      return { ok: false, error: 'กรุณาระบุชื่อเมนูที่ต้องการเพิ่มค่ะ' };
    }

    const cleanName = rawMenuName
      .replace(/^\{+|\}+$/g, '')
      .replace(/^"+|"+$/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 60);

    if (!cleanName) {
      return { ok: false, error: 'ชื่อเมนูไม่ถูกต้องค่ะ' };
    }

    if (MASTER_PRICE_MAP.has(cleanName)) {
      return { ok: false, error: `เมนู **"${cleanName}"** มีอยู่ในสมุดเมนูหลักของคาเฟ่อยู่แล้วค่ะ!` };
    }

    const alreadyInMystery = MYSTERY_MENU_SET.has(cleanName);
    MYSTERY_MENU_SET.add(cleanName);

    try {
      await CafeEvent.findOneAndUpdate(
        { category: 'drink', text: cleanName },
        { $set: { price: -1 } },
        { upsert: true, new: true }
      );
      return { ok: true, name: cleanName, isUpdate: alreadyInMystery };
    } catch (err) {
      return { ok: false, error: 'เกิดข้อผิดพลาดในการบันทึกลงฐานข้อมูลค่ะ' };
    }
  },

  async removeMysteryMenuFromCatalog(rawMenuName) {
    if (!rawMenuName || typeof rawMenuName !== 'string') {
      return { ok: false, error: 'กรุณาระบุชื่อเมนูที่ต้องการลบค่ะ' };
    }
    const cleanName = rawMenuName.replace(/^\{+|\}+$/g, '').trim();
    if (MASTER_PRICE_MAP.has(cleanName)) {
      return { ok: false, error: 'ไม่สามารถลบเมนูหลักของคาเฟ่ได้ค่ะ (ลบได้เฉพาะเมนูระดับ ? • Create one)' };
    }

    MYSTERY_MENU_SET.delete(cleanName);
    try {
      const res = await CafeEvent.deleteOne({ category: 'drink', text: cleanName, price: -1 });
      return { ok: true, name: cleanName, deletedCount: res.deletedCount || 0 };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },

  async syncMysteryMenusFromDB() {
    try {
      const docs = await CafeEvent.find({ category: 'drink', price: -1 }).select('text').lean();
      if (Array.isArray(docs)) {
        docs.forEach(d => {
          if (d.text && d.text.trim() && !MASTER_PRICE_MAP.has(d.text.trim())) {
            MYSTERY_MENU_SET.add(d.text.trim());
          }
        });
      }
    } catch (err) {}
  },

  getItemPrice(itemText, category = 'drink', dbPrice = 0) {
    if (!itemText || typeof itemText === 'number') return 0;
    const cleanText = String(itemText).trim();
    if (cleanText === '') return 0;

    if (MASTER_PRICE_MAP.has(cleanText)) {
      return MASTER_PRICE_MAP.get(cleanText);
    }

    if (dbPrice === -1 || MYSTERY_MENU_SET.has(cleanText)) {
      return rollMysteryPrice();
    }

    if (typeof dbPrice === 'number' && dbPrice > 0) return dbPrice;

    for (const [menuName, price] of MASTER_PRICE_MAP.entries()) {
      if (cleanText.includes(menuName)) {
        return price;
      }
    }

    if (category === 'drink') {
      return rollMysteryPrice();
    }
    if (category === 'topping') return 25;
    if (category === 'dessert') return 95;
    return 0;
  },

  async syncPricesToDatabase() {
    await this.syncMysteryMenusFromDB();
    if (isSyncedWithDB) return;
    isSyncedWithDB = true;

    try {
      const operations = [];

      const addOps = (dict, category) => {
        for (const [text, price] of Object.entries(dict)) {
          if (text === 'เอิร์ลเกรย์ลาเวเดอร์') continue;
          operations.push({
            updateOne: {
              filter: { category, text },
              update: { $set: { price } },
              upsert: true
            }
          });
        }
      };

      addOps(DRINK_PRICES, 'drink');
      addOps(TOPPING_PRICES, 'topping');
      addOps(DESSERT_PRICES, 'dessert');

      if (operations.length > 0) {
        await CafeEvent.bulkWrite(operations, { ordered: false });
        console.log(
          `[Cafe Economy] 🪙 ซิงก์ข้อมูลเมนูหลัก ${operations.length} รายการ และเมนู Create one (?) ${MYSTERY_MENU_SET.size} รายการสำเร็จ!`
        );
      }
    } catch (err) {
      console.warn('[Cafe Economy Warning] ⚠️ ซิงก์ราคาเข้า DB บางส่วนไม่สำเร็จ:', err.message);
    }
  }
};