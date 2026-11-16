import React, { useState, useEffect, useRef } from 'react';
import {
  fetchRegisterMembers,
  lookupDiscordMember,
  submitMemberRegistration
} from '../services/api';

export default function RegisterPage() {
  const [allMembers, setAllMembers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [memberCountText, setMemberCountText] = useState('กำลังโหลดรายชื่อ...');

  // สถานะฟอร์มลงทะเบียน
  const [discordId, setDiscordId] = useState('');
  const [nickname, setNickname] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [requireOldPin, setRequireOldPin] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  // เอฟเฟกต์เอียงการ์ด 3D (ทำงานเฉพาะบนคอมพิวเตอร์ เพื่อความเสถียรเวลาเลื่อนจอบนมือถือ)
  const cardRef = useRef(null);
  const [cardTransform, setCardTransform] = useState('perspective(900px) rotateX(0deg) rotateY(0deg)');

  const handleSelectMember = (userObj) => {
    if (!userObj) return;
    setSelectedUser(userObj);
    setDiscordId(userObj.discordId || '');
    setNickname(userObj.nickname || userObj.displayName || '');
    setRequireOldPin(Boolean(userObj.hasPin));
    setToast(null);

    try {
      localStorage.setItem('alestia_last_discord_id', userObj.discordId);
    } catch (e) {}
  };

  const loadSnapshot = async () => {
    try {
      const data = await fetchRegisterMembers();
      const members = data.members || [];
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
        // หากไม่เจอในแคช ให้ดึงตรงจาก API รายบุคคลทันที
        try {
          const singleRes = await lookupDiscordMember(targetId);
          if (singleRes.user) {
            handleSelectMember(singleRes.user);
            return;
          }
        } catch (e) {}
      }

      if (members.length > 0 && !selectedUser) {
        handleSelectMember(members[0]);
      }
    } catch (err) {
      setMemberCountText('กรอกรหัส ID ด้านขวาได้เลยค่ะ');
    }
  };

  useEffect(() => {
    loadSnapshot();
  }, []);

  const handleCardMouseMove = (e) => {
    if (!window.matchMedia('(hover: hover)').matches || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const rotateY = ((x / rect.width) - 0.5) * 10;
    const rotateX = ((0.5 - (y / rect.height)) * 10);
    setCardTransform(`perspective(900px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg)`);
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
      handleSelectMember(data.user);
      setToast({ ok: true, text: `ดึงข้อมูลของ @${data.user.username} สำเร็จแล้วค่ะ!` });
    } catch (err) {
      setToast({ ok: false, text: err.message });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setToast(null);

    try {
      const data = await submitMemberRegistration({
        discordId: discordId.trim(),
        nickname: nickname.trim(),
        currentPin: currentPin.trim(),
        newPin: newPin.trim()
      });

      if (!data.ok) {
        if (data.requireCurrentPin) {
          setRequireOldPin(true);
        }
        setToast({ ok: false, text: data.error || 'บันทึกข้อมูลไม่สำเร็จค่ะ' });
      } else {
        setToast({ ok: true, text: `🎉 ${data.message}` });
        setCurrentPin('');
        setNewPin('');
        setRequireOldPin(true);
        await loadSnapshot();
      }
    } catch (err) {
      setToast({ ok: false, text: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้งค่ะ' });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredMembers = allMembers
    .filter(m => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      return (
        (m.nickname && m.nickname.toLowerCase().includes(q)) ||
        (m.displayName && m.displayName.toLowerCase().includes(q)) ||
        (m.username && m.username.toLowerCase().includes(q)) ||
        m.discordId.includes(q)
      );
    })
    .slice(0, 60);

  const roleColor = selectedUser?.roleColor || '#AA817E';
  const liveNickname =
    nickname.trim() || selectedUser?.nickname || selectedUser?.displayName || 'เลือกโปรไฟล์ของคุณ';

  return (
    <div className="portal-grid">
      {/* 🃏 คอลัมน์ซ้าย: บัตรสมาชิกจำลอง 3 มิติ + รายชื่อเลือกด่วน */}
      <div>
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
              {selectedUser?.inCafeVoice ? '🎙️ กำลังนั่งอยู่ในคาเฟ่' : '☕ บัตรประจำตัวคาเฟ่'}
            </span>
            <span className={`pin-shield-pill ${requireOldPin ? 'locked' : ''}`}>
              {requireOldPin ? '🔒 มีรหัส PIN คุ้มกันแล้ว' : '🔓 ยังไม่ตั้ง PIN'}
            </span>
          </div>

          <div className="avatar-stage">
            <img
              src={selectedUser?.avatarUrl || 'https://cdn.discordapp.com/embed/avatars/0.png'}
              alt="Member Avatar"
            />
          </div>

          <div className="preview-nickname">{liveNickname}</div>
          <div className="preview-discord-tag">
            @{selectedUser?.username || discordId || 'discord_member'}
          </div>

          <div className="preview-role-chip">
            <span className="role-dot" />
            <span>{selectedUser?.roleName || 'ลูกค้าประจำคาเฟ่'}</span>
          </div>

          <div className="preview-stats-row">
            <div className="preview-stat-box">
              <div className="preview-stat-label">👛 ยอดเงินในกระเป๋า</div>
              <div className="preview-stat-value">
                {(selectedUser?.walletBalance || 0).toLocaleString('th-TH')} ฿
              </div>
            </div>
            <div className="preview-stat-box">
              <div className="preview-stat-label">🛡️ สถานะลงทะเบียน</div>
              <div className="preview-stat-value">
                {selectedUser?.isRegistered ? '✅ ลงทะเบียนแล้ว' : '✨ สมาชิกใหม่'}
              </div>
            </div>
          </div>
        </div>

        {/* 🔍 กล่องเลือกโปรไฟล์ด่วนจากรายชื่อในเซิร์ฟเวอร์ */}
        <div className="quick-picker-panel alx-glass-panel">
          <div className="picker-header">
            <h3>⚡ เลือกโปรไฟล์ของคุณจากรายชื่อในร้าน</h3>
            <span className="field-hint">{memberCountText}</span>
          </div>

          <input
            type="text"
            className="search-input-box"
            placeholder="🔍 พิมพ์ค้นหาชื่อเล่น, ชื่อ Discord หรือเลข ID..."
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
                    <div className="p-main">{m.nickname || m.displayName}</div>
                    <div className="p-sub">@{m.username}</div>
                  </div>
                </div>
                <div className="pick-badges">
                  {m.inCafeVoice && <span className="mini-tag voice">🎙️ ในคาเฟ่</span>}
                  {m.hasPin && <span className="mini-tag reg">🔒 PIN</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 📝 คอลัมน์ขวา: แบบฟอร์มลงทะเบียนและตั้งรหัส PIN */}
      <div className="form-card-panel alx-glass-panel">
        <div className="form-header">
          <h2>✨ ลงทะเบียนชื่อเล่น & ตั้งรหัส PIN</h2>
          <p>
            เมื่อลงทะเบียนสำเร็จ อเลสเทียจะมอบยศสมาชิกและยศรหัส PIN ในเซิร์ฟเวอร์ Horizontal ให้ทันที
            พร้อมใช้ชื่อเล่นนี้ในการต้อนรับและแสดงบนบัตรสมาชิกค่ะ
          </p>
        </div>

        <form onSubmit={handleSubmit} autoComplete="off">
          {/* 1. รหัส Discord ID */}
          <div className="field-group">
            <label className="field-label">
              <span>🆔 รหัส Discord ID ของคุณ</span>
              <span className="field-hint">คลิกเลือกชื่อด้านซ้าย หรือวางเลข ID</span>
            </label>
            <div className="input-row-wrap">
              <input
                type="text"
                className="glass-input"
                placeholder="เช่น 995629374722297946"
                value={discordId}
                onChange={(e) => setDiscordId(e.target.value)}
                required
              />
              <button type="button" onClick={handleLookupId} className="lookup-btn">
                ดึงข้อมูล
              </button>
            </div>
          </div>

          {/* 2. ชื่อเล่นประจำคาเฟ่ */}
          <div className="field-group">
            <label className="field-label">
              <span>🏷️ ชื่อเล่นที่ต้องการให้อเลสเทียเรียก</span>
              <span className="field-hint">1–35 ตัวอักษร</span>
            </label>
            <input
              type="text"
              className="glass-input"
              maxLength={35}
              placeholder="เช่น เอผู้รักสันโดษ, มาย, เมฆ"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              required
            />
          </div>

          {/* 3. กล่องยืนยันรหัส PIN เดิม (แสดงเฉพาะคนที่มี PIN แล้ว) */}
          {requireOldPin && (
            <div className="current-pin-alert-box">
              <label className="field-label">
                <span>🔐 ยืนยันรหัส PIN เดิมของคุณ</span>
                <span className="field-hint">จำเป็นต้องกรอกเพื่อแก้ไขข้อมูล</span>
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

          {/* 4. ตั้งรหัส PIN ใหม่ */}
          <div className="field-group">
            <label className="field-label">
              <span>
                {requireOldPin
                  ? '🔑 เปลี่ยนรหัส PIN ใหม่ (เว้นว่างได้หากใช้รหัสเดิม)'
                  : '🔑 ตั้งรหัส PIN ประจำตัว (ตัวเลข 4–6 หลัก)'}
              </span>
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#7A6352',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  fontWeight: 600
                }}
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
              ? '⏳ อเลสเทียกำลังบันทึกข้อมูลและมอบยศ...'
              : '✨ ยืนยันบันทึกข้อมูลและรับยศสมาชิก ✨'}
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