#!/usr/bin/env node

/**
 * KODAFLOW 2026 - TELEGRAM ALERT PLUGIN cho AI Agent
 * Agent có thể gọi script này để bắn thông báo về máy sếp (Board).
 * Cách gọi: node scripts/telegram_alert.js "Báo cáo sếp, em đã hoàn thành chiến dịch!"
 */

// Đọc token từ môi trường hoặc điền cứng (Nên dùng môi trường)
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'NHAP_TOKEN_CUA_BOT_NGAY_DAY';
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || 'NHAP_ID_CUA_SEP_NGAY_DAY';

const message = process.argv[2];

if (!message) {
  console.error('Lỗi: Bạn phải nhập nội dung tin nhắn. Ví dụ: node telegram_alert.js "Xin chào"');
  process.exit(1);
}

const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
const payload = {
  chat_id: CHAT_ID,
  text: `🤖 [AI BÁO CÁO]: ${message}`
};

try {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  });

  if (response.ok) {
    console.log('✅ Đã bắn tín hiệu Telegram về điện thoại của Sếp thành công!');
  } else {
    console.error('❌ Lỗi API khi bắn Telegram. Mã lỗi mã HTTP:', response.status);
    const text = await response.text();
    console.error('Chi tiết:', text);
  }
} catch (e) {
  console.error('❌ Có lỗi xảy ra trong quá trình gửi mạng:', e);
}
