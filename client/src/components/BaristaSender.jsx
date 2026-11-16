import React, { useState, useEffect } from 'react';
import { fetchGuildChannels, sendBaristaMessage } from '../services/api';

export default function BaristaSender() {
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [colorKey, setColorKey] = useState('pastelPink');
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchGuildChannels()
      .then(data => {
        if (data.channels && data.channels.length > 0) {
          setChannels(data.channels);
          setSelectedChannel(data.channels[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    try {
      const result = await sendBaristaMessage({
        channelId: selectedChannel,
        title,
        message,
        colorKey
      });
      setFeedback({ type: 'success', text: result.message });
      setMessage('');
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="cafe-card">
      <h2 style={{ marginBottom: '16px' }}>☕ เคาน์เตอร์บาริสต้า: ส่งข้อความเข้า Discord</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>เลือกห้องแชทในเซิร์ฟเวอร์ Horizontal</label>
          <select
            className="cafe-select"
            value={selectedChannel}
            onChange={(e) => setSelectedChannel(e.target.value)}
            required
          >
            {channels.length === 0 ? (
              <option value="">กำลังโหลดห้องแชท (หรือบอทยังไม่ออนไลน์)...</option>
            ) : (
              channels.map(ch => (
                <option key={ch.id} value={ch.id}>
                  #{ch.name} ({ch.guildName})
                </option>
              ))
            )}
          </select>
        </div>

        <div className="form-group">
          <label>เลือกโทนสีการ์ดเมนู (Aesthetic Theme)</label>
          <select
            className="cafe-select"
            value={colorKey}
            onChange={(e) => setColorKey(e.target.value)}
          >
            <option value="pastelPink">🌸 Sakura Pink (ชมพูพาสเทล)</option>
            <option value="matchaGreen">🍵 Matcha Latte (เขียวมัทฉะ)</option>
            <option value="caramelWarm">🍮 Warm Caramel (น้ำตาลคาราเมล)</option>
            <option value="lavenderMist">🪻 Lavender Mist (ม่วงลาเวนเดอร์)</option>
            <option value="latteCream">🥛 Vanilla Cream (ครีมนมสด)</option>
          </select>
        </div>

        <div className="form-group">
          <label>หัวข้อประกาศ / ชื่อเมนูวันนี้</label>
          <input
            type="text"
            className="cafe-input"
            placeholder="เช่น เมนูพิเศษประจำวันจาก Alestia 🍰"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>ข้อความที่ต้องการให้ Alestia เสิร์ฟ</label>
          <textarea
            rows="4"
            className="cafe-textarea"
            placeholder="พิมพ์ข้อความพูดคุยหรือประกาศที่ต้องการส่งเข้าห้องแชท..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="cafe-btn" disabled={loading || !selectedChannel}>
          {loading ? 'กำลังชงข้อความ...' : 'เสิร์ฟข้อความเข้า Discord ☕'}
        </button>

        {feedback && (
          <div className={`toast-alert ${feedback.type === 'error' ? 'toast-error' : ''}`}>
            {feedback.text}
          </div>
        )}
      </form>
    </section>
  );
}