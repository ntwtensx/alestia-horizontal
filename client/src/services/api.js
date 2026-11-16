export async function fetchBotStatus() {
  const response = await fetch('/api/status');
  if (!response.ok) throw new Error('ไม่สามารถดึงข้อมูลสถานะบอทได้');
  return response.json();
}

export async function fetchGuildChannels() {
  const response = await fetch('/api/barista/channels');
  if (!response.ok) throw new Error('ไม่สามารถดึงรายชื่อห้องแชทได้');
  return response.json();
}

export async function sendBaristaMessage(payload) {
  const response = await fetch('/api/barista/announce', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'เกิดข้อผิดพลาดในการส่งข้อความ');
  return data;
}

// 🪪 API สำหรับหน้าลงทะเบียนสมาชิกและจัดการรหัส PIN (/register)
export async function fetchRegisterMembers() {
  const response = await fetch('/api/register/members');
  const data = await response.json();
  if (!response.ok || !data.ok) throw new Error(data.error || 'ไม่สามารถโหลดรายชื่อสมาชิกได้');
  return data;
}

export async function lookupDiscordMember(discordId) {
  const response = await fetch(`/api/register/user/${encodeURIComponent(discordId)}`);
  const data = await response.json();
  if (!response.ok || !data.ok) throw new Error(data.error || 'ไม่พบข้อมูลสมาชิกค่ะ');
  return data;
}

export async function submitMemberRegistration(payload) {
  const response = await fetch('/api/register/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  return data;
}