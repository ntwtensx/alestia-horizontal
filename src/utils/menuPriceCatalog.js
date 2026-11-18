const CafeEvent = require('../models/CafeEvent');

// 🪙 อิโมจิเหรียญทองประจำระบบ (ใช้ในข้อความแชทและ Embed Description)
const COIN_EMOJI = '<a:coin:1563947103032713268>';
// 🏷️ ชื่อเรียกสกุลเงินสำหรับส่วน Footer
const COIN_TEXT = 'เหรียญทอง';
// 🍯 ค่าเริ่มต้นความหวานเมื่อสมาชิกไม่ได้ระบุ
const DEFAULT_SWEETNESS = 'หวานปกติ';

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

// ==========================================
// 🧠 6. ระบบวิเคราะห์บริบทประโยคและจับคู่เมนูอัจฉริยะ (Thai Fuzzy NLP Parser v4 - 2-Tier Short Toppings)
// ==========================================

// ปรับรูปคำภาษาไทยสำหรับใช้เปรียบเทียบ (ตัดวรรณยุกต์/ไม้ไต่คู้/การันต์ + รวมคำทับศัพท์ที่สะกดได้หลายแบบ)
function normalizeThaiFuzzy(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .replace(/[\u0E47-\u0E4E]/g, '')
    .replace(/[.,!?~()[\]{}"'`/\\-]/g, ' ')
    .replace(/ชอคโกแลต|ชอกโกแลต|ชอคโคแลต|ชอกโคแลต|ชอคแลต/g, 'ชอกโกแลต')
    .replace(/สตรอวเบอรี|สตรอเบอรี|สตอเบอรี|สตรอวเบอริ|สตรอเบอริ|สตอเบอริ/g, 'สตอเบอรี')
    .replace(/ราสปเบอรี|ราสเบอรี|ราสปเบอริ|ราสเบอริ/g, 'ราสเบอรี')
    .replace(/เบอรี|เบอริ/g, 'เบอรี')
    .replace(/พิสตาชิโอ|พิตาชิโอ|พิซตาชิโอ/g, 'พิตาชิโอ')
    .replace(/ทีรามิสุ|ทิรามิสุ|ทีรามิซู/g, 'ทีรามิสุ')
    .replace(/วานิลลา|วานิลา|วนิลา/g, 'วานิลา')
    .replace(/มัทฉะ|มัจฉะ|มัตฉะ|มัทชะ/g, 'มัทฉะ')
    .replace(/เอสเพรสโซ|เอสเปรสโซ|เอสเย็น/g, 'เอสเพรสโซ')
    .replace(/คาปูชิโน|คาปุชิโน|คาปู/g, 'คาปูชิโน')
    .replace(/อเมริกาโน|อะเมอริกาโน/g, 'อเมริกาโน')
    .replace(/ลาเวนเดอร|ลาเวเดอร/g, 'ลาเวนเดอร')
    .replace(/คุกกี|คุกกิ|cookie/g, 'คุกกี')
    .replace(/เยลลี|เจลลี|เยลลิ|เจลลิ/g, 'เจลลี')
    .replace(/ยูซุ|ยุสุ|ยูสุ/g, 'ยูซุ')
    .replace(/นิวหยอก|นิวยอก|นิวยอรก|new\s*york/g, 'นิวยอรก')
    .replace(/ครัวซองต|ครัวซอง/g, 'ครัวซอง')
    .replace(/ฮันนีโทสต|ฮันนีโทส|โทสต/g, 'ฮันนีโทส')
    .replace(/วิปปิงครีม|วิปครีม/g, 'วิปครีม')
    .replace(/ไอศกรีม|ไอติม/g, 'ไอศกรีม')
    .replace(/บราวนี|บราวนิ/g, 'บราวนี')
    .replace(/เชอรี|เชอริ/g, 'เชอรี')
    .replace(/สไปรท|สไปรต/g, 'สไปรท')
    .replace(/บราวนชูการ|บราวชูการ/g, 'บราวนชูการ')
    .replace(/\s+/g, ' ')
    .trim();
}

const RAW_DRINK_TOKENS = [
  'เอสเพรสโซ่', 'ริสเทรตโต้', 'อเมริกาโน่', 'พิคโคโล่', 'คาปูชิโน่', 'แฟลตไวท์', 'ลาเต้', 'มอคค่า',
  'วานิลลา', 'คาราเมล', 'มัคคิอาโต้', 'ออเรนจ์', 'เดอร์ตี้', 'โรสแมรี่', 'เฮเซลนัท', 'พีช', 'โคโคนัท',
  'ลิ้นจี่', 'ยูซุ', 'แมคคาเดเมีย', 'ทีรามิสุ', 'มัทฉะ', 'อัฟโฟกาโต้', 'โคลอมเบีย', 'โคลด์บรูว์', 'ดริป',
  'เอธิโอเปีย', 'เคนยา', 'กัวเตมาลา', 'ไซฟอน', 'ปานามา', 'เกอิชา', 'เชคเกอร์ราโต้', 'เมเปิ้ล', 'พิสตาชิโอ',
  'แซฟฟรอน', 'หญ้าฝรั่น', 'รวันดา', 'เยเมน', 'ฮาวายโคน่า', 'วิสกี้', 'ทรัฟเฟิล', 'จาเมกา', 'บลูเมาท์เทน',
  'อิงลิชเบรกฟาสต์', 'ชานม', 'ไต้หวัน', 'เก็นไมฉะ', 'เอิร์ลเกรย์', 'ลาเวนเดอร์', 'ชาไทย', 'สเลอปี้',
  'โฮจิฉะ', 'คาโมมายล์', 'ชาพีช', 'อู่หลง', 'กวนอิม', 'ไวท์ช็อกโกแลต', 'ชาเขียวมะลิ', 'มังกรขาว',
  'ลูกแพร', 'สตรอว์เบอร์รี', 'ครีมชีส', 'ชากุหลาบ', 'หอมหมื่นลี้', 'คุโรมิตสึ', 'คินาโกะ', 'หลงจิ่ง',
  'ดาร์จีลิ่ง', 'เข็มเงิน', 'ผู่เอ๋อร์', 'ต้าหงเผา', 'เกียวคุโระ', 'พลัม', 'สไปรท์', 'บลูฮาวาย',
  'แอปเปิ้ล', 'กีวี', 'มิกซ์เบอร์รี่', 'แพชชั่นฟรุต', 'เสาวรส', 'เกรปฟรุต', 'โกโก้', 'เลมอน', 'มะนาว',
  'แมงโก้', 'มะม่วง', 'สมูทตี้', 'มิ้นต์', 'เฟรปเป้', 'ฟองดูว์', 'น้ำผึ้งมะนาว', 'ราสป์เบอร์รี',
  'แบล็คฟอเรสต์', 'เชอร์รี', 'เฟอร์เรโร่', 'ซากุระ', 'บลูคูราโซ่', 'อัญชัน', 'อะโวคาโด', 'มิลค์เชค',
  'ทับทิม', 'โคโตกะ', 'ไชน์มัสแคท', 'เมล่อน', 'วัลโรนา', 'ช็อกโกแลต', 'กาแฟ', 'ชาเขียว', 'ชาขาว', 'ชาเย็น', 'ชา', 'ส้ม', 'มะพร้าว', 'โซดา'
];

// ระดับที่ 1: คีย์เวิร์ดท็อปปิ้งทั้งหมด (รวมคำสั้น เช่น ชีส, วิป, คาราเมล, ฟองนม, ทอง ที่จับเมื่อมีคำเชื่อมนำหน้า)
const RAW_TOPPING_TOKENS = [
  'ซินนามอน', 'เลมอนสไลซ์', 'โอรีโอ้', 'คอร์นเฟลกส์', 'คาราเมลซอส', 'คาราเมล',
  'ไข่มุกป๊อปยูซุ', 'ไข่มุกป๊อปสตรอว์เบอร์รี', 'ไข่มุกบราวน์ชูการ์', 'ไข่มุกป๊อป', 'ไข่มุก',
  'บราวน์ชูการ์', 'บุก', 'คอฟฟี่เจลลี่', 'เอิร์ลเกรย์เจลลี่', 'เจลลี่', 'อโลเวร่า',
  'คริสตัลเพิร์ล', 'เพิร์ล', 'กานาช', 'บิสคอฟ', 'โกโก้นิบส์', 'มาร์ชเมลโลว์', 'เพียวเร่',
  'อัลมอนด์พราลีน', 'อัลมอนด์', 'ช็อกโกแลตวิปครีม', 'วิปปิ้งครีม', 'วิป',
  'มัคคิอาโต้โฟม', 'มิลค์โฟม', 'ฟองนม', 'โฟมนม', 'ครีมชีสโฟม', 'โฟมชีส', 'ชีสโฟม', 'ครีมชีส', 'ชีส', 'โฟม',
  'มัทฉะครีมสด', 'มัทฉะครีม', 'ครีมสด', 'แมคคาเดเมียอบ', 'แมคคาเดเมีย',
  'ไอศกรีมมัทฉะ', 'ไอศกรีมวานิลลา', 'ไอศกรีม', 'รังผึ้ง',
  'ทองคำเปลว', 'แผ่นทอง', 'ทองคำ', 'ทอง',
  'ครัมเบิลเนย', 'ครัมเบิล', 'ซอสพิตาชิโอ', 'พิตาชิโอ',
  'มินิมาการอง', 'สตรอว์เบอร์รีขาว', 'ครีมไวท์ทรัฟเฟิล', 'ทรัฟเฟิล',
  'ช็อกโกแลต', 'โกโก้', 'เลมอน'
];

// ระดับที่ 2: ท็อปปิ้งที่จับได้ทันทีแม้ไม่มีคำเชื่อม "ใส่/เพิ่ม" นำหน้า (ไม่ซ้ำกับชื่อน้ำและขนม)
const UNAMBIGUOUS_TOPPING_TOKENS = [
  'ไข่มุกป๊อปยูซุ', 'ไข่มุกป๊อปสตรอว์เบอร์รี', 'ไข่มุกบราวน์ชูการ์', 'ไข่มุกป๊อป', 'ไข่มุก',
  'บุก', 'คอฟฟี่เจลลี่', 'เอิร์ลเกรย์เจลลี่', 'เจลลี่', 'วิปปิ้งครีม', 'บิสคอฟ', 'โอรีโอ้',
  'มาร์ชเมลโลว์', 'รังผึ้ง', 'ทองคำเปลว', 'แผ่นทอง', 'ครีมชีสโฟม', 'โฟมชีส', 'ชีสโฟม',
  'ฟองนม', 'โฟมนม', 'มิลค์โฟม', 'โกโก้นิบส์', 'คอร์นเฟลกส์', 'ซินนามอน',
  'อโลเวร่า', 'เพิร์ล', 'กานาช', 'ไอศกรีม'
].map(normalizeThaiFuzzy).sort((a, b) => b.length - a.length);

const RAW_DESSERT_TOKENS = [
  'ซอฟต์คุกกี้', 'คุกกี้', 'มาการอง', 'แคนเนเล่', 'อัลมอนด์ครัวซองต์', 'บัตเตอร์ครัวซองต์', 'ครัวซองต์',
  'ครัฟเฟิล', 'บราวนี่', 'เอแคลร์', 'สโคน', 'ควินญ่าอามัน', 'พานาคอตต้า', 'ทาร์ตเลมอน', 'เลมอนยูซุทาร์ต',
  'ทาร์ตผลไม้', 'ทาร์ต', 'แครอทเค้ก', 'แซนด์วิช', 'แฮมชีส', 'พานินี่', 'บาสก์ชีสเค้ก', 'ชีสเค้กหน้าไหม้',
  'หน้าไหม้', 'นิวยอร์กชีสเค้ก', 'ชีสเค้ก', 'คร็อกเมอซิเยอร์', 'ทิรามิสุมาสคาโปน', 'ชอร์ตเค้ก',
  'ปารีสเบรสต์', 'บริยอช', 'ฮันนี่โทสต์', 'มงบล็อง', 'เกาลัด', 'มิลเฟย', 'เค้ก'
];

const FUZZY_DRINK_TOKENS = [...new Set(RAW_DRINK_TOKENS.map(normalizeThaiFuzzy))].sort((a, b) => b.length - a.length);
const FUZZY_TOPPING_TOKENS = [...new Set(RAW_TOPPING_TOKENS.map(normalizeThaiFuzzy))].sort((a, b) => b.length - a.length);
const FUZZY_DESSERT_TOKENS = [...new Set(RAW_DESSERT_TOKENS.map(normalizeThaiFuzzy))].sort((a, b) => b.length - a.length);
const ALL_NEGATABLE_TOKENS = [...new Set([...FUZZY_TOPPING_TOKENS, ...FUZZY_DESSERT_TOKENS, ...FUZZY_DRINK_TOKENS])]
  .filter(t => t.length >= 2)
  .sort((a, b) => b.length - a.length);

const SYNONYM_GROUPS = [
  ['เลมอน', 'มะนาว', 'เลมอนเนด'],
  ['สม', 'ออเรนจ', 'ยูซุ'],
  ['มะพราว', 'โคโคนัท'],
  ['มะมวง', 'แมงโก'],
  ['เสาวรส', 'แพชชันฟรุต'],
  ['ชาเย็น', 'ชาไทย'],
  ['ชาเขียว', 'มัทฉะ'],
  ['ชอกโกแลต', 'โกโก'],
  ['กาแฟดำ', 'อเมริกาโน'],
  ['เบอรี', 'สตอเบอรี', 'ราสเบอรี'],
  ['ฟองนม', 'โฟมนม', 'มิลคโฟม'],
  ['โฟมชีส', 'ชีสโฟม', 'ครีมชีสโฟม'],
  ['วิป', 'วิปครีม'],
  ['ทอง', 'แผนทอง', 'ทองคำ', 'ทองคำเปลว']
].map(group => group.map(normalizeThaiFuzzy));

// เมนูมาตรฐาน (Default Classic) สำหรับท็อปปิ้งคำสั้นหรือคำกว้าง
const DEFAULT_TOPPING_BY_TOKEN = {
  [normalizeThaiFuzzy('ไข่มุก')]: 'เพิ่มไข่มุกบราวน์ชูการ์อุ่น',
  [normalizeThaiFuzzy('วิปปิ้งครีม')]: 'ท็อปด้วยวิปปิ้งครีมวานิลลาบีน',
  [normalizeThaiFuzzy('วิป')]: 'ท็อปด้วยวิปปิ้งครีมวานิลลาบีน',
  [normalizeThaiFuzzy('เจลลี่')]: 'ใส่คอฟฟี่เจลลี่สกัดเย็น',
  [normalizeThaiFuzzy('ไอศกรีม')]: 'ท็อปด้วยไอศกรีมวานิลลามาดากัสการ์',
  [normalizeThaiFuzzy('ชีส')]: 'ราดซีซอลท์ครีมชีสโฟม',
  [normalizeThaiFuzzy('ครีมชีส')]: 'ราดซีซอลท์ครีมชีสโฟม',
  [normalizeThaiFuzzy('โฟมชีส')]: 'ราดซีซอลท์ครีมชีสโฟม',
  [normalizeThaiFuzzy('ชีสโฟม')]: 'ราดซีซอลท์ครีมชีสโฟม',
  [normalizeThaiFuzzy('ครีมชีสโฟม')]: 'ราดซีซอลท์ครีมชีสโฟม',
  [normalizeThaiFuzzy('คาราเมล')]: 'ราดโฮมเมดคาราเมลซอส',
  [normalizeThaiFuzzy('คาราเมลซอส')]: 'ราดโฮมเมดคาราเมลซอส',
  [normalizeThaiFuzzy('ฟองนม')]: 'ราดฮอกไกโดมิลค์โฟม',
  [normalizeThaiFuzzy('โฟมนม')]: 'ราดฮอกไกโดมิลค์โฟม',
  [normalizeThaiFuzzy('โฟม')]: 'ราดฮอกไกโดมิลค์โฟม',
  [normalizeThaiFuzzy('มิลค์โฟม')]: 'ราดฮอกไกโดมิลค์โฟม',
  [normalizeThaiFuzzy('ครีมสด')]: 'ท็อปด้วยมัทฉะครีมสด',
  [normalizeThaiFuzzy('ครัมเบิล')]: 'โรยครัมเบิลเนยฝรั่งเศสเกรียงเดอเซล',
  [normalizeThaiFuzzy('อัลมอนด์')]: 'โรยอัลมอนด์พราลีน',
  [normalizeThaiFuzzy('แมคคาเดเมีย')]: 'ท็อปด้วยแมคคาเดเมียอบคาราเมล',
  [normalizeThaiFuzzy('พิตาชิโอ')]: 'ราดซอสพิตาชิโอคั่วบดเข้มข้น',
  [normalizeThaiFuzzy('ทอง')]: 'ตกแต่งด้วยแผ่นทองคำเปลวออร์แกนิก',
  [normalizeThaiFuzzy('แผ่นทอง')]: 'ตกแต่งด้วยแผ่นทองคำเปลวออร์แกนิก',
  [normalizeThaiFuzzy('ทองคำ')]: 'ตกแต่งด้วยแผ่นทองคำเปลวออร์แกนิก',
  [normalizeThaiFuzzy('ทองคำเปลว')]: 'ตกแต่งด้วยแผ่นทองคำเปลวออร์แกนิก',
  [normalizeThaiFuzzy('ทรัฟเฟิล')]: 'ท็อปด้วยครีมไวท์ทรัฟเฟิลอิตาเลียน',
  [normalizeThaiFuzzy('ช็อกโกแลต')]: 'ราดดาร์กช็อกโกแลตกานาชดริซเซิล',
  [normalizeThaiFuzzy('โกโก้')]: 'ราดดาร์กช็อกโกแลตกานาชดริซเซิล',
  [normalizeThaiFuzzy('เลมอน')]: 'ประดับเลมอนสไลซ์ดีไฮเดรต'
};

const DEFAULT_DESSERT_BY_TOKEN = {
  [normalizeThaiFuzzy('ชีสเค้ก')]: 'นิวยอร์กชีสเค้กซอสเบอร์รีรวม',
  [normalizeThaiFuzzy('ครัวซองต์')]: 'บัตเตอร์ครัวซองต์ฝรั่งเศส',
  [normalizeThaiFuzzy('ทาร์ต')]: 'ทาร์ตเลมอนเมอแรงก์'
};

const MOOD_POOLS = {
  AWAKE: {
    keywords: ['ตื่น', 'ง่วง', 'ดีด', 'เข้ม', 'แก้ง่วง', 'ตาค้าง', 'โต้รุ่ง', 'ขม', 'ทำงาน', 'คาเฟอีน'].map(normalizeThaiFuzzy),
    drinks: [
      'เอสเพรสโซ่ซิกเนเจอร์เบลนด์', 'ริสเทรตโต้เพียวช็อต', 'อเมริกาโน่เฮาส์เบลนด์',
      'เดอร์ตี้คอฟฟี่สกัดเย็น', 'โคลอมเบียซูพรีโม่โคลด์บรูว์', 'ยูซุอเมริกาโน่สปาร์คกลิ้ง',
      'ลิ้นจี่เอสเพรสโซ่โทนิค', 'ซอลท์เท็ดคาราเมลเอสเพรสโซ่เชคเกอร์ราโต้', 'อูจิมัทฉะพรีเมียมลาเต้'
    ]
  },
  SOUR_FRESH: {
    keywords: ['เปรี้ยว', 'สดชื่น', 'ซ่า', 'จี๊ด', 'แก้เลี่ยน', 'คลายร้อน', 'ผลไม้', 'ชุ่มคอ'].map(normalizeThaiFuzzy),
    drinks: [
      'ยูซุฮันนี่เลมอนสปาร์คกลิ้ง', 'น้ำผึ้งมะนาวโซดาโรสแมรี่สกัดเย็น', 'แพชชั่นฟรุตซันเซ็ตทวิสต์',
      'มิกซ์เบอร์รี่โรสโซดา', 'พลัมสไปรท์สแปลช', 'ราสป์เบอร์รีโรสเลมอนทวิสต์',
      'แอปเปิ้ลกีวีพาราไดซ์', 'ไวท์พีชซากุระคริสตัลโซดา', 'ยูซุโกลด์บลอสซั่มเอลเดอร์ฟลาวเวอร์ฟิซ'
    ]
  },
  SWEET_COZY: {
    keywords: ['หวาน', 'ละมุน', 'นุ่ม', 'นม', 'ฮีลใจ', 'เหนื่อย', 'อ้อน', 'ครีมมี่'].map(normalizeThaiFuzzy),
    drinks: [
      'คาราเมลมัคคิอาโต้ครัมเบิล', 'ซิกเนเจอร์ดาร์กโกโก้', 'ชานมไต้หวันรอยัล',
      'ชาไทยสเลอปี้ซิกเนเจอร์', 'วานิลลาบีนลาเต้', 'สตรอว์เบอร์รีชีสเค้กเฟรปเป้',
      'ไวท์ช็อกโกแลตมัทฉะ', 'ดาร์กช็อกโกแลตเฮเซลนัทเฟอร์เรโร่เฟรปเป้', 'เบลเยียมช็อกโกแลตฟองดูว์'
    ]
  },
  LIGHT_RELAX: {
    keywords: ['เบาๆ', 'เบา', 'ใสๆ', 'หอม', 'ผ่อนคลาย', 'สบายท้อง', 'อุ่นๆ', 'ชาใส', 'หลับสบาย'].map(normalizeThaiFuzzy),
    drinks: [
      'ชาคาโมมายล์น้ำผึ้งป่า', 'เอิร์ลเกรย์ลาเวนเดอร์', 'ชาพีชขาวสกัดเย็น',
      'ชากุหลาบดามัสก์ลิ้นจี่จักรพรรดิ', 'ชาอู่หลงหอมหมื่นลี้ทองคำสกัดเย็น', 'ชาขาวลูกแพรหิมะน้ำผึ้งป่า'
    ]
  },
  LUXURY: {
    keywords: ['แพง', 'หรู', 'จัดเต็ม', 'สุลต่าน', 'พรีเมียม', 'พิเศษสุด', 'แรร์'].map(normalizeThaiFuzzy),
    drinks: [
      'จาเมกาบลูเมาท์เทนดริปทองคำ', 'อูจิเกียวคุโระมัทฉะเกรดจักรพรรดิ',
      'ปานามาเกอิชาสเปเชียลตี้', 'ปานามาเกอิชาออโรร่าสกัดเย็น', 'วัลโรนาช็อกโกแลตโกลด์ทรัฟเฟิลฟองดูว์'
    ]
  }
};

// คำคั่นที่ใช้หยุดการสกัดความหวานแบบกำหนดเอง (ป้องกันไม่ให้กินคำท็อปปิ้ง ขนม หรือคำลงท้ายติดมาด้วย)
const SWEETNESS_STOP_REGEX = /(?:ไม่ใส่|ไม่เพิ่ม|ใส่|เพิ่ม|ท็อปด้วย|ท็อป|โรย|ราด|ประดับ|ครับ|ค่ะ|คะ|นะครับ|นะคะ|นะ|ด้วย|้ดวย|หน่อย|กับ|และ|แล้วก็|ทานคู่|กินคู่|เอา|ขอ|สั่ง|ขนม|ไข่มุก|ชีสเค้ก|ชีส|โฟม|ฟองนม|คุกกี้|คุ้กกี้|บราวนี่|ครัวซอง|วิปครีม|วิปปิ้ง|วิป|เจลลี่|เยลลี่|เค้ก|ทาร์ต|มาการอง|บุก|ไอศกรีม|ไอติม|พานาคอตต้า|สโคน|เอแคลร์|ครัฟเฟิล|ฮันนี่โทสต์|แซนด์วิช|แผ่นทอง|ครัมเบิล|คาราเมล)/;

// 🍯 ดึงระดับความหวานตามคำที่สมาชิกพิมพ์จริง (เช่น หวานมากกกก, หวานน้อย 25%, ไม่หวานเลย)
function extractCustomSweetness(originalText) {
  let sweetWordUsedAsMood = false;
  let customSweetness = '';
  let textWithoutSweetness = originalText;

  const pattern = /(ไม่เอาหวาน|ไม่หวาน|ไม่ใส่น้ำตาล|ไม่เอาน้ำตาล|หวาน)([^\s]*)(?:\s+(?:(\d+\s*%?)|((?:น้อย|มาก|ปกติ|กำลังดี|ปานกลาง|กลาง|ฉ่ำ|เจี๊ยบ|ตัดขา|จัด|สุดๆ|พิเศษ|นิดเดียว|นิดนึง|นิดหน่อย|เบาๆ|เลย)[^\s]*)))?/g;

  const matches = [...originalText.matchAll(pattern)];
  for (const m of matches) {
    const base = m[1];
    let tail = m[2] || '';
    const spacedNum = m[3] || '';
    const spacedMod = m[4] || '';

    let combinedRest = tail;
    if (spacedNum) combinedRest += ` ${spacedNum}`;
    else if (spacedMod) combinedRest += ` ${spacedMod}`;

    const stopMatch = combinedRest.match(SWEETNESS_STOP_REGEX);
    if (stopMatch) {
      combinedRest = combinedRest.slice(0, stopMatch.index);
    }

    const cleanRest = combinedRest.replace(/[.,!?~()[\]{}"'`]+$/g, '').trimEnd();
    const candidatePhrase = `${base}${cleanRest}`.trim();

    const beforeStr = originalText.slice(Math.max(0, m.index - 12), m.index);
    const isAfterMoodCue = /(?:อะไร|แนว|แบบ)\s*$/.test(beforeStr);

    if (isAfterMoodCue && base === 'หวาน') {
      sweetWordUsedAsMood = true;
      if (!cleanRest || /^ๆ+$/.test(cleanRest)) {
        continue;
      }
    }

    if (!customSweetness && candidatePhrase) {
      customSweetness = candidatePhrase;
      const cutStart = m.index;
      const cutEnd = m.index + candidatePhrase.length;
      textWithoutSweetness = (
        textWithoutSweetness.slice(0, cutStart) +
        ' ' +
        textWithoutSweetness.slice(cutEnd)
      ).replace(/\s+/g, ' ').trim();
      break;
    }
  }

  return {
    customSweetness,
    sweetWordUsedAsMood,
    textWithoutSweetness
  };
}

function getBigrams(str) {
  const s = str.replace(/\s+/g, '');
  const bigrams = [];
  for (let i = 0; i < s.length - 1; i++) {
    bigrams.push(s.slice(i, i + 2));
  }
  return bigrams;
}

function diceSimilarity(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const bg1 = getBigrams(a);
  const bg2 = getBigrams(b);
  if (!bg1.length || !bg2.length) return 0;
  const set2 = new Map();
  bg2.forEach(g => set2.set(g, (set2.get(g) || 0) + 1));
  let matches = 0;
  for (const g of bg1) {
    const count = set2.get(g) || 0;
    if (count > 0) {
      matches++;
      set2.set(g, count - 1);
    }
  }
  return (2 * matches) / (bg1.length + bg2.length);
}

function pickRandomFromList(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function extractDistinctTokens(fuzzyQuery, sortedTokens) {
  const found = [];
  let temp = fuzzyQuery;
  for (const tok of sortedTokens) {
    if (tok && temp.includes(tok)) {
      found.push(tok);
      temp = temp.replace(new RegExp(tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), ' ');
    }
  }
  return found;
}

function stripNegatedPhrases(fuzzyText) {
  let result = fuzzyText;
  const negPrefixes = ['ไมใส', 'ไมเอา', 'ไมเพิม', 'ไมรับ', 'ไมกิน', 'ไมดืม'];
  for (const prefix of negPrefixes) {
    let searchFrom = 0;
    let guard = 0;
    while (guard < 10) {
      guard++;
      const idx = result.indexOf(prefix, searchFrom);
      if (idx === -1) break;
      const afterStart = idx + prefix.length;
      const rawAfter = result.slice(afterStart);
      const afterTrimmed = rawAfter.replace(/^\s+/, '');
      const leadingSpaces = rawAfter.length - afterTrimmed.length;

      let matchedTok = '';
      for (const tok of ALL_NEGATABLE_TOKENS) {
        if (afterTrimmed.startsWith(tok)) {
          matchedTok = tok;
          break;
        }
      }
      if (matchedTok) {
        result = result.slice(0, idx) + ' ' + result.slice(afterStart + leadingSpaces + matchedTok.length);
        searchFrom = idx;
      } else {
        searchFrom = afterStart;
      }
    }
  }
  return result.replace(/\s+/g, ' ').trim();
}

function getSynonymsForToken(tok) {
  for (const group of SYNONYM_GROUPS) {
    if (group.includes(tok)) return group.filter(t => t !== tok);
  }
  return [];
}

function stripSafeFillers(fuzzyText) {
  return fuzzyText
    .replace(/อยากได|อยากกิน|อยากดืม|ขอสัง|ขอรับ|เอาเมนู|รับเมนู|สังเมนู|ทานคูกับ|กินคูกับ|แลวก็|แลวก|ดวยนะ|ดวยคะ|ดวยครับ|หนอยนะ|หนอยคะ|หนอยครับ|นะครับ|นะคะ|ครับ|หนอย|ดวย|ขอ|เอา|รับ|สัง|กับ|และ|คะ|นะ|เมนู|แกวนึง|แกว|อะไรก็ได|อะไร|สุม|แนะนำ|เลือกให|จัดมาเลย|จัดมา|ตามใจ|แลวแต/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findBestCatalogMatch(fuzzyQuery, candidateNames, sortedTokens, options = {}) {
  const {
    stripToppingActionPrefix = false,
    defaultByToken = null,
    preferredNames = [],
    minScore = 30
  } = options;

  const cleanQuery = (fuzzyQuery || '').trim();
  if (!cleanQuery || !candidateNames.length) return null;

  const queryTokens = extractDistinctTokens(cleanQuery, sortedTokens);

  // หากผู้ใช้พิมพ์คำสั้นคำเดียวตรงกับเมนูมาตรฐานใน Default Classic ให้เลือกเมนูนั้นทันทีอย่างแม่นยำ
  if (defaultByToken && queryTokens.length === 1) {
    const bareQuery = stripSafeFillers(cleanQuery);
    const defName = defaultByToken[queryTokens[0]];
    if (defName && candidateNames.includes(defName) && (bareQuery === queryTokens[0] || cleanQuery === queryTokens[0])) {
      return { name: defName, score: 120, matchedTokens: [queryTokens[0]] };
    }
  }

  const scoredList = [];

  for (const name of candidateNames) {
    if (name === 'เอิร์ลเกรย์ลาเวเดอร์') continue;
    let fuzzyName = normalizeThaiFuzzy(name);
    if (stripToppingActionPrefix) {
      fuzzyName = fuzzyName.replace(/^(เพิม|ใส|ทอปดวย|โรย|ราด|ประดับ|ตกแตงดวย)/, '');
    }

    let score = 0;
    const matchedTokens = [];

    if (cleanQuery === fuzzyName) {
      score += 220;
    } else if (cleanQuery.includes(fuzzyName) && fuzzyName.length >= 4) {
      score += 160 + fuzzyName.length;
    } else if (fuzzyName.includes(cleanQuery) && cleanQuery.length >= 3) {
      score += 75;
    }

    for (const tok of queryTokens) {
      if (fuzzyName.includes(tok)) {
        score += 48 + tok.length * 4;
        matchedTokens.push(tok);
      } else {
        const syns = getSynonymsForToken(tok);
        const synHit = syns.find(s => fuzzyName.includes(s));
        if (synHit) {
          score += 34 + tok.length * 2;
          matchedTokens.push(tok);
        }
      }
    }

    const sim = diceSimilarity(cleanQuery, fuzzyName);
    if (matchedTokens.length > 0) {
      score += sim * 8;
    } else {
      score += sim * 45;
    }

    if (score >= minScore) {
      scoredList.push({ name, score, matchedTokens });
    }
  }

  if (!scoredList.length) return null;

  scoredList.sort((a, b) => b.score - a.score);
  const topScore = scoredList[0].score;
  const topCandidates = scoredList.filter(c => topScore - c.score <= 6);

  if (defaultByToken && queryTokens.length === 1) {
    const defName = defaultByToken[queryTokens[0]];
    const foundDef = topCandidates.find(c => c.name === defName);
    if (foundDef) return foundDef;
  }

  if (preferredNames.length > 0) {
    const favCandidates = topCandidates.filter(c => preferredNames.includes(c.name));
    if (favCandidates.length > 0) return pickRandomFromList(favCandidates);
  }

  return pickRandomFromList(topCandidates);
}

function maskTokensFromText(text, tokens) {
  let out = text;
  const sorted = [...tokens].sort((a, b) => b.length - a.length);
  for (const tok of sorted) {
    if (!tok) continue;
    out = out.replace(new RegExp(tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), ' ');
  }
  return out.replace(/\s+/g, ' ').trim();
}

let isSyncedWithDB = false;

module.exports = {
  COIN_EMOJI,
  COIN_TEXT,
  DEFAULT_SWEETNESS,
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

  // 🧠 ฟังก์ชันหลักสำหรับตีความข้อความสั่งเมนูในห้องแชทคาเฟ่ (v4 - ความหวานกำหนดเอง + ท็อปปิ้ง 2 ระดับ)
  parseNaturalOrder(rawMessage, userDataDB = null) {
    if (!rawMessage || typeof rawMessage !== 'string') {
      return { intent: 'UNRECOGNIZED' };
    }

    const originalText = rawMessage.trim();
    if (!originalText || originalText.startsWith('!')) {
      return { intent: 'IGNORE' };
    }

    const userFavPool = [
      userDataDB?.favoriteMenu,
      userDataDB?.likedMenu1,
      userDataDB?.likedMenu2
    ].filter(m => m && m !== 'ขอคิดดูก่อน');

    // 1. สกัดคำความหวานตามที่สมาชิกพิมพ์จริง (หากไม่ระบุจะเป็น "หวานปกติ")
    const {
      customSweetness,
      sweetWordUsedAsMood,
      textWithoutSweetness
    } = extractCustomSweetness(originalText);

    const fuzzyWithoutSweetness = normalizeThaiFuzzy(textWithoutSweetness);

    // 2. เช็กเจตนาปฏิเสธล้วน
    const isPureRefusal =
      !customSweetness &&
      /^(ไมรับ|ไมสัง|ไมเปนไร|ไมเอา|ไมกิน|ไมดืม|ไมหิว|ขีเกียจสัง|ขีเกียจ|ไมเอาอะไรเลย|ไมสังเมนู|ไมรับเมนู|ไมเอาแลว)(ครับ|คะ|นะ|นะครับ|นะคะ|เลย|หรอก|\s)*$/.test(fuzzyWithoutSweetness);
    if (isPureRefusal) {
      return { intent: 'REFUSE_KICK' };
    }

    const hasRandomKeyword = /อะไรก็ได|สุม|แลวแต|เลือกให|จัดมา|ตามใจ|แนะนำ/.test(fuzzyWithoutSweetness);
    const hasHesitateKeyword = /ไมรู|คิดไมออก|เลือกไมถูก|เอาไรดี|เอาอะไรดี|นึกไมออก/.test(fuzzyWithoutSweetness);

    // 3. ลบช่วงคำปฏิเสธส่วนผสมออกก่อนค้นหา เช่น "ชาไทยไม่ใส่ไข่มุก"
    let workingText = stripNegatedPhrases(fuzzyWithoutSweetness);

    const allDrinkNames = [...Object.keys(DRINK_PRICES), ...Array.from(MYSTERY_MENU_SET)];
    const allToppingNames = Object.keys(TOPPING_PRICES);
    const allDessertNames = Object.keys(DESSERT_PRICES);

    let matchedDrink = null;
    let matchedTopping = null;
    let matchedDessert = null;

    // 4. กรณีพิเศษ: "ชานมไข่มุก"
    if (workingText.includes('ชานมไขมุก')) {
      matchedDrink = 'ชานมไต้หวันรอยัล';
      matchedTopping = 'เพิ่มไข่มุกบราวน์ชูการ์อุ่น';
      workingText = workingText.replace(/ชานมไขมุก/g, ' ').replace(/\s+/g, ' ').trim();
    }

    // 5. (Step A: Longest-First) ตรวจจับชื่อเครื่องดื่มเต็มๆ ก่อน
    if (!matchedDrink) {
      const sortedDrinksByLen = [...allDrinkNames]
        .filter(n => n !== 'เอิร์ลเกรย์ลาเวเดอร์')
        .sort((a, b) => normalizeThaiFuzzy(b).length - normalizeThaiFuzzy(a).length);

      for (const dName of sortedDrinksByLen) {
        const fDrink = normalizeThaiFuzzy(dName);
        if (fDrink.length >= 6 && workingText.includes(fDrink)) {
          matchedDrink = dName;
          workingText = workingText.replace(fDrink, ' ').replace(/\s+/g, ' ').trim();
          break;
        }
      }
    }

    // 6. (Step B) ตรวจจับท็อปปิ้งเสริม 2 ระดับ
    // ระดับที่ 1: จับคำสั้นทั้งหมดเมื่อมีคำเชื่อม ("ใส่", "เพิ่ม", "ท็อป", "โรย", "ราด", "ประดับ") นำหน้า
    if (!matchedTopping) {
      const toppingCueRegex = /(?:ใส|เพิม|ทอปดวย|ทอป|โรย|ราด|ประดับ)\s*([^\s]+)/g;
      let cueMatch;
      while ((cueMatch = toppingCueRegex.exec(workingText)) !== null) {
        const candidateChunk = cueMatch[1];
        // ป้องกันกรณีพิมพ์คำขนมติดคำเชื่อม เช่น "ใส่ชีสเค้ก" ไม่ให้ไปจับเป็นท็อปปิ้งชีส
        if (candidateChunk.startsWith('ชีสเคก')) continue;

        const topTokensInChunk = extractDistinctTokens(candidateChunk, FUZZY_TOPPING_TOKENS);
        if (topTokensInChunk.length > 0) {
          const topRes = findBestCatalogMatch(candidateChunk, allToppingNames, FUZZY_TOPPING_TOKENS, {
            stripToppingActionPrefix: true,
            defaultByToken: DEFAULT_TOPPING_BY_TOKEN,
            minScore: 34
          });
          if (topRes) {
            matchedTopping = topRes.name;
            const cleanedChunk = maskTokensFromText(candidateChunk, topTokensInChunk);
            workingText = workingText.replace(cueMatch[0], cleanedChunk ? ` ${cleanedChunk} ` : ' ').replace(/\s+/g, ' ').trim();
            break;
          }
        }
      }
    }

    // ระดับที่ 2: ท็อปปิ้งที่ชัดเจนในตัวเอง (จับได้ทันทีแม้ไม่มีคำเชื่อม "ใส่/เพิ่ม")
    if (!matchedTopping) {
      const directTopTokens = extractDistinctTokens(workingText, UNAMBIGUOUS_TOPPING_TOKENS);
      if (directTopTokens.length > 0) {
        const topRes = findBestCatalogMatch(directTopTokens.join(' '), allToppingNames, FUZZY_TOPPING_TOKENS, {
          stripToppingActionPrefix: true,
          defaultByToken: DEFAULT_TOPPING_BY_TOKEN,
          minScore: 34
        });
        if (topRes) {
          matchedTopping = topRes.name;
          workingText = maskTokensFromText(workingText, directTopTokens);
        }
      }
    }

    // 7. (Step C) ตรวจจับขนมหวาน / ของทานเล่น
    const dessertTokensInText = extractDistinctTokens(workingText, FUZZY_DESSERT_TOKENS);
    if (dessertTokensInText.length > 0) {
      const desRes = findBestCatalogMatch(dessertTokensInText.join(' '), allDessertNames, FUZZY_DESSERT_TOKENS, {
        defaultByToken: DEFAULT_DESSERT_BY_TOKEN,
        minScore: 34
      });
      if (desRes) {
        matchedDessert = desRes.name;
        workingText = maskTokensFromText(workingText, [...dessertTokensInText, 'ขนม', 'ของวาง', 'ของทานเลน']);
      }
    } else if (/ขนม|ของวาง|ของทานเลน/.test(workingText)) {
      matchedDessert = pickRandomFromList(allDessertNames);
      workingText = workingText.replace(/ขนม|ของวาง|ของทานเลน/g, ' ').replace(/\s+/g, ' ').trim();
    }

    // 8. (Step D) ค้นหาเครื่องดื่มหลักจากข้อความที่เหลือ
    const drinkSearchText = stripSafeFillers(workingText);

    if (!matchedDrink && drinkSearchText) {
      const directDrinkMatch = findBestCatalogMatch(drinkSearchText, allDrinkNames, FUZZY_DRINK_TOKENS, {
        preferredNames: userFavPool,
        minScore: 34
      });
      if (directDrinkMatch) {
        matchedDrink = directDrinkMatch.name;
      }
    }

    // 9. (Step E) เช็กหมวดรสชาติและอารมณ์ ("หวานๆ", "ตื่นๆ", "เปรี้ยวๆ", "เบาๆ", "หรูๆ")
    if (!matchedDrink) {
      for (const mood of Object.values(MOOD_POOLS)) {
        if (mood.keywords.some(kw => workingText.includes(kw) || fuzzyWithoutSweetness.includes(kw))) {
          const favInMood = userFavPool.filter(m => mood.drinks.includes(m));
          matchedDrink = favInMood.length > 0 ? pickRandomFromList(favInMood) : pickRandomFromList(mood.drinks);
          break;
        }
      }
    }

    if (!matchedDrink && sweetWordUsedAsMood) {
      const favInSweet = userFavPool.filter(m => MOOD_POOLS.SWEET_COZY.drinks.includes(m));
      matchedDrink = favInSweet.length > 0 ? pickRandomFromList(favInSweet) : pickRandomFromList(MOOD_POOLS.SWEET_COZY.drinks);
    }

    // 10. (Step F) กรณีขอให้สุ่ม
    if (!matchedDrink && hasRandomKeyword) {
      const validUserPool = userFavPool.filter(m => allDrinkNames.includes(m));
      if (validUserPool.length > 0 && Math.random() <= 0.65) {
        matchedDrink = pickRandomFromList(validUserPool);
      } else {
        matchedDrink = pickRandomFromList(allDrinkNames.filter(n => n !== 'เอิร์ลเกรย์ลาเวเดอร์'));
      }

      if (!matchedTopping && Math.random() <= 0.45) {
        matchedTopping = pickRandomFromList(allToppingNames);
      }
      if (!matchedDessert && Math.random() <= 0.45) {
        matchedDessert = pickRandomFromList(allDessertNames);
      }
    }

    // 11. ตรวจสอบกรณีลังเลโดยไม่ขอสุ่ม
    if (!matchedDrink && !matchedDessert && !matchedTopping) {
      if (hasHesitateKeyword && !hasRandomKeyword) {
        return { intent: 'HESITATE_KICK' };
      }
      return { intent: 'UNRECOGNIZED' };
    }

    // 12. (Step G) ป้องกันการแอบเอาเมนูโปรดมาเสียบแทนชื่อน้ำที่อ่านไม่ออก
    let autoPairedDrink = false;
    if (!matchedDrink && (matchedDessert || matchedTopping)) {
      const leftoverText = drinkSearchText
        .replace(/อยางเดียว|แค|เทานัน|พอแลว|พอ|ไมเอานำ/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (leftoverText.length >= 2) {
        return {
          intent: 'UNKNOWN_DRINK',
          unknownText: leftoverText,
          matchedTopping,
          matchedDessert
        };
      }

      matchedDrink = userFavPool.find(m => allDrinkNames.includes(m)) || 'ชาไทยสเลอปี้ซิกเนเจอร์';
      autoPairedDrink = true;
    }

    // 13. คำนวณราคาและต่อระดับความหวานติดท้ายชื่อเครื่องดื่มโดยตรง (ไม่มีวงเล็บ)
    const drinkPrice = this.getItemPrice(matchedDrink, 'drink', 0) || 120;
    const toppingName = matchedTopping || '';
    const toppingPrice = toppingName ? (this.getItemPrice(toppingName, 'topping', 0) || 25) : 0;
    const dessertName = matchedDessert || '';
    const dessertPrice = dessertName ? (this.getItemPrice(dessertName, 'dessert', 0) || 95) : 0;
    const sweetness = customSweetness || DEFAULT_SWEETNESS;
    const totalPrice = drinkPrice + toppingPrice + dessertPrice;

    const drinkWithSweetness = `${matchedDrink}${sweetness}`;
    const toppingPhrase = toppingName ? ` ${toppingName}` : '';
    const dessertPhrase = dessertName ? ` ทานคู่กับ${dessertName}` : '';
    const orderText = `${drinkWithSweetness}${toppingPhrase}${dessertPhrase}`.replace(/\s+/g, ' ').trim();

    // บรรทัดย่อยสำหรับแสดงใน Embed: - {เมนู}{ความหวาน} -{ท็อปปิ้ง} -{ขนม}
    const embedSubParts = [`- ${drinkWithSweetness}`];
    if (toppingName) embedSubParts.push(`-${toppingName}`);
    if (dessertName) embedSubParts.push(`-${dessertName}`);
    const embedOrderLine = embedSubParts.join(' ');

    return {
      intent: hasRandomKeyword ? 'RANDOM_ORDER' : 'ORDER',
      autoPairedDrink,
      orderDetails: {
        orderText,
        embedOrderLine,
        drinkName: matchedDrink,
        sweetness,
        drinkPrice,
        toppingName,
        toppingPrice,
        dessertName,
        dessertPrice,
        totalPrice
      }
    };
  },

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