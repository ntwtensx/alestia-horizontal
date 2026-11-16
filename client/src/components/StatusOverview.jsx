import React from 'react';

export default function StatusOverview({ status }) {
  return (
    <section className="stats-grid">
      <div className="cafe-card">
        <div className="stat-label">🏠 คาเฟ่ที่ดูแลอยู่</div>
        <div className="stat-value">{status?.guildsCount ?? 0} เซิร์ฟเวอร์</div>
      </div>

      <div className="cafe-card">
        <div className="stat-label">⚡ ความไวในการเสิร์ฟ (Ping)</div>
        <div className="stat-value">
          {status?.ping >= 0 ? `${status.ping} ms` : 'กำลังวัดค่า...'}
        </div>
      </div>

      <div className="cafe-card">
        <div className="stat-label">🧁 โทนบรรยากาศร้าน</div>
        <div className="stat-value">Aesthetic Pastel</div>
      </div>
    </section>
  );
}