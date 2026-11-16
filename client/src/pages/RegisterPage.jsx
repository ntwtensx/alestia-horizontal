import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  fetchRegisterMembers,
  fetchMenuCatalog,
  lookupDiscordMember,
  submitMemberRegistration
} from '../services/api';

const THAI_MONTHS = [
  { num: 1, full: 'มกราคม', short: 'ม.ค.', days: 31 },
  { num: 2, full: 'กุมภาพันธ์', short: 'ก.พ.', days: 29 },
  { num: 3, full: 'มีนาคม', short: 'มี.ค.', days: 31 },
  { num: 4, full: 'เมษายน', short: 'เม.ย.', days: 30 },
  { num: 5, full: 'พฤษภาคม', short: 'พ.ค.', days: 31 },
  { num: 6, full: 'มิถุนายน', short: 'มิ.ย.', days: 30 },
  { num: 7, full: 'กรกฎาคม', short: 'ก.ค.', days: 31 },
  { num: 8, full: 'สิงหาคม', short: 'ส.ค.', days: 31 },
  { num: 9, full: 'กันยายน', short: 'ก.ย.', days: 30 },
  { num: 10, full: 'ตุลาคม', short: 'ต.ค.', days: 31 },
  { num: 11, full: 'พฤศจิกายน', short: 'พ.ย.', days: 30 },
  { num: 12, full: 'ธันวาคม', short: 'ธ.ค.', days: 31 }
];

export default function RegisterPage() {
  const [allMembers, setAllMembers] = useState([]);
  const [catalogCategories, setCatalogCategories] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [memberCountText, setMemberCountText] = useState('กำลังโหลดรายชื่อ...');

  const [discordId, setDiscordId] = useState('');
  const [nickname, setNickname] = useState('');
  const [birthdayDay, setBirthdayDay] = useState(null);
  const [birthdayMonth, setBirthdayMonth] = useState(1);

  const [favoriteMenu, setFavoriteMenu] = useState('');
  const [likedMenu1, setLikedMenu1] = useState('');
  const [likedMenu2, setLikedMenu2] = useState('');

  const [activeMenuSlot, setActiveMenuSlot] = useState('favorite');
  const [activeCategoryId, setActiveCategoryId] = useState('coffee');
  const [menuSearch, setMenuSearch] = useState('');

  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [requireOldPin, setRequireOldPin] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const cardRef = useRef(null);
  const [cardTransform, setCardTransform] = useState('perspective(900px) rotateX(0deg) rotateY(0deg)');

  const menuInfoMap = useMemo(() => {
    const map = new Map();
    if (Array.isArray(catalogCategories)) {
      catalogCategories.forEach(cat => {
        if (Array.isArray(cat.items)) {
          cat.items.forEach(item => {
            if (item && item.name) map.set(item.name, item);
          });
        }
      });
    }
    return map;
  }, [catalogCategories]);

  const resolveMenuMeta = (menuName) => {
    const clean = (menuName || '').trim();
    if (!clean || clean === 'ขอคิดดูก่อน') {
      return { name: 'ยังไม่ได้เลือกเมนู', tierCode: 'NONE', icon: '🍵', priceText: '' };
    }
    if (menuInfoMap.has(clean)) {
      const found = menuInfoMap.get(clean);
      return {
        name: found.name,
        tierCode: found.tierCode || 'C',
        icon: found.icon || '☕',
        priceText: found.isMystery ? '199-999 🪙' : `${found.price || 0} 🪙`
      };
    }
    return {
      name: clean,
      tierCode: '?',
      icon: '🌈',
      priceText: '199-999 🪙'
    };
  };

  const handleSelectMember = (userObj) => {
    if (!userObj) return;
    setSelectedUser(userObj);
    setDiscordId(userObj.discordId || '');
    setNickname(userObj.nickname || '');
    setBirthdayDay(userObj.birthdayDay || null);
    setBirthdayMonth(userObj.birthdayMonth || 1);
    setFavoriteMenu(
      userObj.favoriteMenu && userObj.favoriteMenu !== 'ขอคิดดูก่อน' ? userObj.favoriteMenu : ''
    );
    setLikedMenu1(
      userObj.likedMenu1 && userObj.likedMenu1 !== 'ขอคิดดูก่อน' ? userObj.likedMenu1 : ''
    );
    setLikedMenu2(
      userObj.likedMenu2 && userObj.likedMenu2 !== 'ขอคิดดูก่อน' ? userObj.likedMenu2 : ''
    );
    setRequireOldPin(Boolean(userObj.hasPin));
    setToast(null);

    try {
      localStorage.setItem('alestia_last_discord_id', userObj.discordId);
    } catch (e) {}
  };

  const loadInitialData = async () => {
    try {
      const [membersData, catalogData] = await Promise.all([
        fetchRegisterMembers().catch(() => ({ members: [] })),
        fetchMenuCatalog().catch(() => ({ categories: [] }))
      ]);

      if (catalogData && Array.isArray(catalogData.categories) && catalogData.categories.length > 0) {
        setCatalogCategories(catalogData.categories);
        setActiveCategoryId(catalogData.categories[0].id);
      }

      const members = membersData?.members || [];
      setAllMembers(members);
      setMemberCountText(`สมาชิกในร้าน ${members.length} ท่าน`);

      const urlParams = new URLSearchParams(window.location.search);
      const targetId = urlParams.get('id') || localStorage.getItem('alestia_last_discord_id');

      if (targetId) {
        const found = members.find(m => m.discordId === targetId);
        if (found) {
          handleSelectMember(found);
          return;
        }
        try {
          const singleRes = await lookupDiscordMember(targetId);
          if (singleRes && singleRes.user) {
            handleSelectMember(singleRes.user);
            return;
          }
        } catch (e) {}
      }

      if (members.length > 0) {
        handleSelectMember(members[0]);
      }
    } catch (err) {
      setMemberCountText('กรอกรหัส ID ด้านขวาได้เลยค่ะ');
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const currentMonthMeta =
    THAI_MONTHS.find(m => m.num === Number(birthdayMonth)) || THAI_MONTHS[0];

  const handleSelectMonth = (monthNum) => {
    setBirthdayMonth(monthNum);
    const meta = THAI_MONTHS.find(m => m.num === monthNum);
    if (birthdayDay && meta && birthdayDay > meta.days) {
      setBirthdayDay(meta.days);
    }
  };

  const handlePickMenuFromCatalog = (menuName) => {
    if (activeMenuSlot === 'favorite') {
      setFavoriteMenu(menuName);
      if (!likedMenu1) setActiveMenuSlot('liked1');
    } else if (activeMenuSlot === 'liked1') {
      setLikedMenu1(menuName);
      if (!likedMenu2) setActiveMenuSlot('liked2');
    } else {
      setLikedMenu2(menuName);
    }
  };

  const handleCardMouseMove = (e) => {
    if (!window.matchMedia('(hover: hover)').matches || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const rotateY = ((x / rect.width) - 0.5) * 8;
    const rotateX = (0.5 - (y / rect.height)) * 8;
    setCardTransform(
      `perspective(900px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg)`
    );
  };

  const handleCardMouseLeave = () => {
    setCardTransform('perspective(900px) rotateX(0deg) rotateY(0deg)');
  };

  const handleLookupId = async () => {
    const cleanId = discordId.trim();
    if (!cleanId) {
      setToast({ ok: false, text: 'กรุณากรอกรหัส Discord ID ก่อนกดดึงข้อมูลค่ะ' });
      return;
    }
    try {
      const data = await lookupDiscordMember(cleanId);
      if (data && data.user) {
        handleSelectMember(data.user);
        setToast({ ok: true, text: `ดึงโปรไฟล์ของ ${data.user.displayName} สำเร็จแล้วค่ะ!` });
      }
    } catch (err) {
      setToast({ ok: false, text: err.message || 'ไม่พบข้อมูลสมาชิกค่ะ' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!birthdayDay || !birthdayMonth) {
      setToast({ ok: false, text: 'กรุณาคลิกเลือกวันและเดือนเกิดจากปฏิทินจำลองก่อนบันทึกนะคะ 🎂' });
      return;
    }

    setSubmitting(true);
    setToast(null);

    try {
      const data = await submitMemberRegistration({
        discordId: discordId.trim(),
        nickname: nickname.trim(),
        birthdayDay,
        birthdayMonth,
        favoriteMenu: favoriteMenu.trim() || 'ขอคิดดูก่อน',
        likedMenu1: likedMenu1.trim() || 'ขอคิดดูก่อน',
        likedMenu2: likedMenu2.trim() || 'ขอคิดดูก่อน',
        currentPin: currentPin.trim(),
        newPin: newPin.trim()
      });

      if (!data || !data.ok) {
        if (data && data.requireCurrentPin) {
          setRequireOldPin(true);
        }
        setToast({ ok: false, text: data?.error || 'บันทึกข้อมูลไม่สำเร็จค่ะ' });
      } else {
        setToast({ ok: true, text: `🎉 ${data.message || 'บันทึกสำเร็จ'}` });
        setCurrentPin('');
        setNewPin('');
        if (data.user) {
          setSelectedUser(data.user);
          setRequireOldPin(Boolean(data.user.hasPin));
        }
        const refreshed = await fetchRegisterMembers().catch(() => null);
        if (refreshed?.members) setAllMembers(refreshed.members);
      }
    } catch (err) {
      setToast({
        ok: false,
        text: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้งค่ะ'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredMembers = (Array.isArray(allMembers) ? allMembers : [])
    .filter(m => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      return (
        (m.nickname && m.nickname.toLowerCase().includes(q)) ||
        (m.displayName && m.displayName.toLowerCase().includes(q)) ||
        (m.username && m.username.toLowerCase().includes(q)) ||
        (m.discordId && m.discordId.includes(q))
      );
    })
    .slice(0, 60);

  const displayedCatalogItems = useMemo(() => {
    const q = menuSearch.trim().toLowerCase();
    if (q) {
      const all = [];
      if (Array.isArray(catalogCategories)) {
        catalogCategories.forEach(cat => {
          if (Array.isArray(cat.items)) {
            cat.items.forEach(item => {
              if (
                item &&
                item.name &&
                (item.name.toLowerCase().includes(q) || (item.tierCode && item.tierCode.toLowerCase().includes(q)))
              ) {
                all.push(item);
              }
            });
          }
        });
      }
      return all;
    }
    const activeCat = (Array.isArray(catalogCategories) ? catalogCategories : []).find(c => c.id === activeCategoryId);
    return activeCat && Array.isArray(activeCat.items) ? activeCat.items : [];
  }, [catalogCategories, activeCategoryId, menuSearch]);

  const roleColor = selectedUser?.roleColor || '#AA817E';
  const serverDisplayName = selectedUser?.displayName || 'ยังไม่ได้เลือกสมาชิกในเซิร์ฟเวอร์';
  const liveNickname = nickname.trim() || selectedUser?.nickname || 'รอตั้งชื่อเล่น...';
  const liveBirthdayText = birthdayDay
    ? `${birthdayDay} ${currentMonthMeta.full}`
    : selectedUser?.birthdayText || 'ยังไม่ได้เลือกวันเกิด';

  const favMeta = resolveMenuMeta(favoriteMenu);
  const like1Meta = resolveMenuMeta(likedMenu1);
  const like2Meta = resolveMenuMeta(likedMenu2);

  return (
    <div className="portal-grid">
      <div className="sticky-preview-column">
        <div
          ref={cardRef}
          onMouseMove={handleCardMouseMove}
          onMouseLeave={handleCardMouseLeave}
          className="preview-card-wrapper alx-glass-card"
          style={{
            '--preview-role-color': roleColor,
            transform: cardTransform
          }}
        >
          <div className="preview-card-aura" />

          <div className="card-badge-header">
            <span className={`voice-live-pill ${selectedUser?.inCafeVoice ? 'in-voice' : ''}`}>
              {selectedUser?.inCafeVoice ? '🎙️ กำลังนั่งอยู่ในคาเฟ่' : '🪪 บัตรสมาชิก Horizontal Cafe'}
            </span>
            <span className={`pin-shield-pill ${requireOldPin || newPin ? 'locked' : ''}`}>
              {requireOldPin || newPin ? '🔒 ตั้งรหัส PIN แล้ว' : '🔓 ยังไม่ตั้ง PIN'}
            </span>
          </div>

          <div className="avatar-stage">
            <img
              src={selectedUser?.avatarUrl || 'https://cdn.discordapp.com/embed/avatars/0.png'}
              alt="Discord Avatar"
            />
          </div>

          <div className="preview-server-name">{serverDisplayName}</div>
          <div className="preview-discord-tag">
            @{selectedUser?.username || discordId || 'discord_member'}
          </div>

          <div className="preview-role-chip">
            <span className="role-dot" />
            <span>{selectedUser?.roleName || 'ลูกค้าประจำคาเฟ่'}</span>
          </div>

          <div className="live-identity-grid">
            <div className="live-identity-box">
              <div className="preview-stat-label">🏷️ ชื่อเล่นประจำคาเฟ่</div>
              <div className="live-identity-value highlight-nick">{liveNickname}</div>
            </div>
            <div className="live-identity-box">
              <div className="preview-stat-label">🎂 วันเกิดสมาชิก</div>
              <div className="live-identity-value">{liveBirthdayText}</div>
            </div>
          </div>

          <div className="live-menu-showcase">
            <div className="showcase-header">☕ เมนูประจำตัวสำหรับเสิร์ฟในห้องเสียง</div>

            <div className="showcase-menu-row">
              <span className="slot-tag">⭐ เมนูโปรด</span>
              <div className="slot-detail">
                <span className="slot-name">
                  {favMeta.icon} {favMeta.name}
                </span>
                {favMeta.tierCode !== 'NONE' && (
                  <span className={`tier-pill tier-${favMeta.tierCode === '?' ? 'MYSTERY' : favMeta.tierCode}`}>
                    {favMeta.tierCode}
                  </span>
                )}
              </div>
            </div>

            <div className="showcase-menu-row">
              <span className="slot-tag">💖 เมนูที่ชอบ</span>
              <div className="slot-detail">
                <span className="slot-name">
                  {like1Meta.icon} {like1Meta.name}
                </span>
                {like1Meta.tierCode !== 'NONE' && (
                  <span className={`tier-pill tier-${like1Meta.tierCode === '?' ? 'MYSTERY' : like1Meta.tierCode}`}>
                    {like1Meta.tierCode}
                  </span>
                )}
              </div>
            </div>

            <div className="showcase-menu-row">
              <span className="slot-tag">🎲 อาจจะสั่ง</span>
              <div className="slot-detail">
                <span className="slot-name">
                  {like2Meta.icon} {like2Meta.name}
                </span>
                {like2Meta.tierCode !== 'NONE' && (
                  <span className={`tier-pill tier-${like2Meta.tierCode === '?' ? 'MYSTERY' : like2Meta.tierCode}`}>
                    {like2Meta.tierCode}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="quick-picker-panel alx-glass-panel">
          <div className="picker-header">
            <h3>⚡ คลิกเลือกชื่อ Discord ของคุณ</h3>
            <span className="field-hint">{memberCountText}</span>
          </div>

          <input
            type="text"
            className="search-input-box"
            placeholder="🔍 ค้นหาชื่อในเซิร์ฟเวอร์, ชื่อเล่น หรือ Discord ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <div className="member-chips-scroll">
            {filteredMembers.map(m => (
              <div
                key={m.discordId}
                onClick={() => handleSelectMember(m)}
                className={`member-pick-item ${
                  selectedUser?.discordId === m.discordId ? 'selected' : ''
                }`}
              >
                <div className="pick-left">
                  <img src={m.avatarUrl} alt={m.displayName} />
                  <div className="pick-names">
                    <div className="p-main">{m.displayName}</div>
                    <div className="p-sub">
                      @{m.username} {m.nickname ? `• (${m.nickname})` : ''}
                    </div>
                  </div>
                </div>
                <div className="pick-badges">
                  {m.inCafeVoice && <span className="mini-tag voice">🎙️ ในคาเฟ่</span>}
                  {m.isRegistered && <span className="mini-tag reg">🪪 สมาชิก</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="form-card-panel alx-glass-panel">
        <div className="form-header">
          <h2>🪪 แบบฟอร์มลงทะเบียนบัตรสมาชิก Horizontal Cafe</h2>
          <p>
            กรอกชื่อเล่น เลือกวันเกิดจากปฏิทินจำลอง และเลือกเมนูประจำตัวของคุณ
            ข้อมูลจะอัปเดตขึ้นบัตรตัวอย่างด้านซ้ายแบบสดๆ และบันทึกลงฐานข้อมูลพร้อมมอบยศสมาชิกทันทีค่ะ
          </p>
        </div>

        <form onSubmit={handleSubmit} autoComplete="off">
          <div className="field-group">
            <label className="field-label">
              <span>1️⃣ โปรไฟล์ Discord ของผู้สมัคร</span>
              <span className="field-hint">คลิกจากรายชื่อด้านซ้าย หรือวางรหัส ID</span>
            </label>
            <div className="input-row-wrap">
              <input
                type="text"
                className="glass-input"
                placeholder="รหัส Discord ID เช่น 995629374722297946"
                value={discordId}
                onChange={(e) => setDiscordId(e.target.value)}
                required
              />
              <button type="button" onClick={handleLookupId} className="lookup-btn">
                ดึงโปรไฟล์
              </button>
            </div>
          </div>

          <div className="field-group">
            <label className="field-label">
              <span>2️⃣ ชื่อเล่นประจำคาเฟ่ (แสดงสดบนบัตรสมาชิก)</span>
              <span className="field-hint">1–35 ตัวอักษร</span>
            </label>
            <input
              type="text"
              className="glass-input"
              maxLength={35}
              placeholder="พิมพ์ชื่อเล่นที่ต้องการให้อเลสเทียเรียก เช่น เอ, มาย, เมฆ..."
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              required
            />
          </div>

          <div className="field-group">
            <label className="field-label">
              <span>3️⃣ วันเกิดของคุณ (ปฏิทินจำลอง วันที่ & เดือน)</span>
              <span className="birthday-live-pill">
                🎂 {birthdayDay ? `${birthdayDay} ${currentMonthMeta.full}` : 'คลิกเลือกวันที่ด้านล่าง'}
              </span>
            </label>

            <div className="calendar-simulator-box">
              <div className="calendar-step-title">เลือกเดือนเกิด (Month)</div>
              <div className="month-grid">
                {THAI_MONTHS.map(m => (
                  <button
                    key={m.num}
                    type="button"
                    onClick={() => handleSelectMonth(m.num)}
                    className={`month-btn ${Number(birthdayMonth) === m.num ? 'active' : ''}`}
                  >
                    <span className="m-short">{m.short}</span>
                    <span className="m-full">{m.full}</span>
                  </button>
                ))}
              </div>

              <div className="calendar-step-title" style={{ marginTop: '14px' }}>
                เลือกวันที่เกิดในเดือน{currentMonthMeta.full} (1 – {currentMonthMeta.days})
              </div>
              <div className="days-grid">
                {Array.from({ length: currentMonthMeta.days }, (_, idx) => idx + 1).map(day => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setBirthdayDay(day)}
                    className={`day-cell-btn ${Number(birthdayDay) === day ? 'active' : ''}`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="field-group">
            <label className="field-label">
              <span>4️⃣ เมนูประจำตัว 3 ลำดับ (เลือกจากสมุดเมนูด้านล่าง หรือพิมพ์เองได้เลย)</span>
              <span className="field-hint">คลิกช่องที่ต้องการแล้วจิ้มเมนูจากแคตตาล็อก</span>
            </label>

            <div className="menu-slots-selector">
              <div
                onClick={() => setActiveMenuSlot('favorite')}
                className={`menu-slot-card ${activeMenuSlot === 'favorite' ? 'active-slot' : ''}`}
              >
                <div className="slot-card-header">
                  <span>⭐ 1. เมนูโปรด (Favorite Menu)</span>
                  {favMeta.tierCode !== 'NONE' && (
                    <span className={`tier-pill tier-${favMeta.tierCode === '?' ? 'MYSTERY' : favMeta.tierCode}`}>
                      {favMeta.tierCode} {favMeta.priceText}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  className="glass-input slot-input"
                  placeholder="คลิกเลือกจากสมุดเมนู หรือพิมพ์ชื่อเมนูโปรด..."
                  value={favoriteMenu}
                  onFocus={() => setActiveMenuSlot('favorite')}
                  onChange={(e) => setFavoriteMenu(e.target.value)}
                />
              </div>

              <div
                onClick={() => setActiveMenuSlot('liked1')}
                className={`menu-slot-card ${activeMenuSlot === 'liked1' ? 'active-slot' : ''}`}
              >
                <div className="slot-card-header">
                  <span>💖 2. เมนูที่ชอบ (Liked Menu)</span>
                  {like1Meta.tierCode !== 'NONE' && (
                    <span className={`tier-pill tier-${like1Meta.tierCode === '?' ? 'MYSTERY' : like1Meta.tierCode}`}>
                      {like1Meta.tierCode} {like1Meta.priceText}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  className="glass-input slot-input"
                  placeholder="คลิกเลือกจากสมุดเมนู หรือพิมพ์ชื่อเมนูที่ชอบ..."
                  value={likedMenu1}
                  onFocus={() => setActiveMenuSlot('liked1')}
                  onChange={(e) => setLikedMenu1(e.target.value)}
                />
              </div>

              <div
                onClick={() => setActiveMenuSlot('liked2')}
                className={`menu-slot-card ${activeMenuSlot === 'liked2' ? 'active-slot' : ''}`}
              >
                <div className="slot-card-header">
                  <span>🎲 3. เมนูที่อาจจะสั่ง (Alternative Menu)</span>
                  {like2Meta.tierCode !== 'NONE' && (
                    <span className={`tier-pill tier-${like2Meta.tierCode === '?' ? 'MYSTERY' : like2Meta.tierCode}`}>
                      {like2Meta.tierCode} {like2Meta.priceText}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  className="glass-input slot-input"
                  placeholder="คลิกเลือกจากสมุดเมนู หรือพิมพ์ชื่อเมนูที่อาจจะสั่ง..."
                  value={likedMenu2}
                  onFocus={() => setActiveMenuSlot('liked2')}
                  onChange={(e) => setLikedMenu2(e.target.value)}
                />
              </div>
            </div>

            <div className="catalog-browser-box">
              <div className="catalog-browser-top">
                <span className="catalog-target-indicator">
                  📖 กำลังเลือกใส่ช่อง:{' '}
                  <strong>
                    {activeMenuSlot === 'favorite'
                      ? '⭐ เมนูโปรด'
                      : activeMenuSlot === 'liked1'
                      ? '💖 เมนูที่ชอบ'
                      : '🎲 เมนูที่อาจจะสั่ง'}
                  </strong>
                </span>
                <input
                  type="text"
                  className="catalog-search-input"
                  placeholder="🔍 ค้นหาจาก 150 เมนู (เช่น มัทฉะ, ลาเต้, SSR)..."
                  value={menuSearch}
                  onChange={(e) => setMenuSearch(e.target.value)}
                />
              </div>

              {!menuSearch.trim() && Array.isArray(catalogCategories) && catalogCategories.length > 0 && (
                <div className="catalog-category-tabs">
                  {catalogCategories.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveCategoryId(cat.id)}
                      className={`cat-tab-btn ${activeCategoryId === cat.id ? 'active' : ''}`}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.title ? cat.title.split('(')[0].trim() : ''}</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="catalog-items-grid">
                {displayedCatalogItems.map(item => {
                  const isSelectedInActiveSlot =
                    (activeMenuSlot === 'favorite' && favoriteMenu === item.name) ||
                    (activeMenuSlot === 'liked1' && likedMenu1 === item.name) ||
                    (activeMenuSlot === 'liked2' && likedMenu2 === item.name);

                  return (
                    <button
                      key={`${item.categoryId}-${item.name}`}
                      type="button"
                      onClick={() => {
                        if (item && item.name) handlePickMenuFromCatalog(item.name);
                      }}
                      className={`catalog-item-chip ${isSelectedInActiveSlot ? 'picked' : ''}`}
                    >
                      <div className="chip-left">
                        <span className="chip-icon">{item.icon}</span>
                        <span className="chip-name">{item.name}</span>
                      </div>
                      <div className="chip-right">
                        <span className="chip-price">
                          {item.isMystery ? '199-999' : item.price} 🪙
                        </span>
                        <span
                          className={`tier-pill tier-${
                            item.tierCode === '?' ? 'MYSTERY' : item.tierCode
                          }`}
                        >
                          {item.tierCode}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {requireOldPin && (
            <div className="current-pin-alert-box">
              <label className="field-label">
                <span>🔐 ยืนยันรหัส PIN เดิมของคุณ</span>
                <span className="field-hint">จำเป็นต้องกรอกเพื่ออัปเดตข้อมูลบัตรสมาชิก</span>
              </label>
              <input
                type={showPin ? 'text' : 'password'}
                className="glass-input pin-input-letter"
                inputMode="numeric"
                maxLength={6}
                placeholder="••••"
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
              />
            </div>
          )}

          <div className="field-group">
            <label className="field-label">
              <span>
                {requireOldPin
                  ? '5️⃣ เปลี่ยนรหัส PIN ใหม่ (เว้นว่างได้หากใช้รหัสเดิม)'
                  : '5️⃣ ตั้งรหัส PIN ประจำตัว 4–6 หลัก (เพื่อรับยศ PIN พิเศษ)'}
              </span>
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="toggle-pin-btn"
              >
                {showPin ? '🙈 ซ่อนตัวเลข' : '👁️ แสดงตัวเลข'}
              </button>
            </label>
            <input
              type={showPin ? 'text' : 'password'}
              className="glass-input pin-input-letter"
              inputMode="numeric"
              maxLength={6}
              placeholder="••••"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
            />
          </div>

          <button type="submit" disabled={submitting} className="submit-hero-btn">
            {submitting
              ? '⏳ อเลสเทียกำลังบันทึกบัตรสมาชิกและมอบยศ...'
              : '✨ บันทึกข้อมูลบัตรสมาชิก & รับยศใน Discord ✨'}
          </button>

          {toast && (
            <div className={`status-toast ${toast.ok ? 'success' : 'error'}`}>
              {toast.text}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}