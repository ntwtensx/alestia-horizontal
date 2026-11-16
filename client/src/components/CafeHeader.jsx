import React from 'react';

export default function CafeHeader({ status }) {
  const defaultAvatar = 'https://cdn.discordapp.com/embed/avatars/0.png';

  return (
    <header className="cafe-header">
      <img
        src={status?.avatarUrl || defaultAvatar}
        alt="Alestia Avatar"
        className="bot-avatar"
      />
      <div>
        <h1>🌸 {status?.botName || 'Alestia'} • {status?.serverName || 'Horizontal'}</h1>
        <p>{status?.roleTitle || 'Barista & Server Concierge ☕'}</p>
        <div className={`badge-status ${status?.isOnline ? 'badge-online' : 'badge-offline'}`}>
          <span>{status?.isOnline ? '🍵 ร้านเปิดให้บริการ (Online)' : '💤 กำลังพักร้าน (Offline)'}</span>
          {status?.botTag && <span>• {status.botTag}</span>}
        </div>
      </div>
    </header>
  );
}