import axios from 'axios';

const BASE = `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}`;

export async function sendMessage(text) {
  await axios.post(`${BASE}/sendMessage`, {
    chat_id: process.env.TELEGRAM_CHAT_ID,
    text,
    parse_mode: 'Markdown',
    disable_web_page_preview: true,
  });
}
