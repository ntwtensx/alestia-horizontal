import React from 'react';

export default function TopNavBar({ currentPath, onNavigate }) {
  const handleNav = (e, path) => {
    e.preventDefault();
    onNavigate(path);
  };

  return (
    <nav className="top-nav-bar alx-glass-panel">
      <div className="brand-cluster">
        <div className="brand-logo-orb">☕</div>
        <div className="brand-title">
          <h1>Horizontal Cafe & Barista Portal</h1>
          <p>ศูนย์ดูแลคาเฟ่อเลสเทีย & ระบบบัตรสมาชิก / รหัส PIN</p>
        </div>
      </div>

      <div className="nav-links">
        <a
          href="/"
          onClick={(e) => handleNav(e, '/')}
          className={`nav-pill ${currentPath === '/' ? 'active' : ''}`}
        >
          ☕ หน้าแรกบาริสต้า
        </a>
        <a
          href="/register"
          onClick={(e) => handleNav(e, '/register')}
          className={`nav-pill ${currentPath.startsWith('/register') ? 'active' : ''}`}
        >
          🪪 ลงทะเบียน / ตั้งรหัส PIN
        </a>
      </div>
    </nav>
  );
}