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