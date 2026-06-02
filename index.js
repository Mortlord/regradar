import 'dotenv/config';
import cron from 'node-cron';
import http from 'http';
import { fetchLatestBriefing } from './drive.js';
import { sendMessage } from './telegram.js';

// Minimaler HTTP-Server damit Railway den Prozess nicht beendet
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200);
  res.end('briefing-pusher running');
}).listen(PORT, () => console.log(`[briefing-pusher] healthcheck auf Port ${PORT}`));

function extractTop3(content) {
  const lines = content.split('\n');
  const kwLine = lines.find(l => l.includes('WEEKLY REGULATORY BRIEFING'));
  const header = kwLine ? kwLine.replace(/^#+\s*/, '').trim() : 'Weekly Briefing';

  const radarStart = lines.findIndex(l => l.includes('Consulting-Radar'));
  if (radarStart === -1) return { header, topics: [] };

  const topics = [];
  let current = null;

  for (let i = radarStart + 1; i < lines.length && topics.length < 3; i++) {
    const line = lines[i].trim();
    if (line.startsWith('### Thema:')) {
      if (current) topics.push(current);
      current = { titel: line.replace('### Thema:', '').trim(), details: [] };
      continue;
    }
    if (line.startsWith('## ') && current) { topics.push(current); break; }
    if (current && (
      line.startsWith('Warum jetzt') ||
      line.startsWith('Schmerz') ||
      line.startsWith('Gesprächseinstieg')
    )) current.details.push(line);
  }
  if (current && topics.length < 3) topics.push(current);
  return { header, topics };
}

function buildMessage(header, topics) {
  let msg = `📋 *${header}*\n\n*Top-3 Themen diese Woche:*\n\n`;
  topics.forEach((t, i) => {
    msg += `*${i + 1}. ${t.titel}*\n`;
    t.details.forEach(d => { msg += `${d}\n`; });
    msg += '\n';
  });
  msg += `_Vollständiges Briefing in Google Drive unter /Briefings/Regulatory_`;
  return msg;
}

let pollingJob = null;
let delivered = false;

async function checkAndPush() {
  const now = new Date();
  const hourBerlin = new Date(
    now.toLocaleString('en-US', { timeZone: 'Europe/Berlin' })
  ).getHours();

  if (hourBerlin >= 20) {
    console.log('[briefing-pusher] 20:00 Uhr erreicht, stoppe Polling');
    pollingJob?.stop();
    await sendMessage('⚠️ Kein Briefing bis 20:00 Uhr gefunden. Bitte Cowork prüfen.');
    return;
  }

  console.log('[briefing-pusher] prüfe Drive...', now.toISOString());
  try {
    const briefing = await fetchLatestBriefing();
    if (!briefing) {
      console.log('[briefing-pusher] noch nicht da');
      return;
    }

    const { header, topics } = extractTop3(briefing.content);
    const msg = topics.length
      ? buildMessage(header, topics)
      : `📋 *${header}*\n\nNeues Briefing verfügbar in Google Drive.`;

    await sendMessage(msg);
    console.log('[briefing-pusher] erfolgreich gepusht, stoppe Polling');
    delivered = true;
    pollingJob?.stop();

  } catch (err) {
    console.error('[briefing-pusher] Fehler beim Prüfen:', err.message);
  }
}

// Montag 09:00 Uhr MEZ: Polling starten
cron.schedule('0 9 * * 1', () => {
  if (delivered) delivered = false;
  console.log('[briefing-pusher] Montag 09:00 – starte Polling');
  pollingJob = cron.schedule('*/15 * * * *', checkAndPush, {
    timezone: 'Europe/Berlin',
  });
}, { timezone: 'Europe/Berlin' });

// TEST: beim Start einmal sofort prüfen
if (process.env.TEST_ON_START === 'true') {
  console.log('[briefing-pusher] TEST_ON_START aktiv – prüfe sofort');
  checkAndPush();
}

console.log('[briefing-pusher] läuft, wartet auf Montag 09:00 MEZ');
