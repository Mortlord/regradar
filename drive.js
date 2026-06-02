import { google } from 'googleapis';

function getAuth() {
  const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  return new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
}

async function getFolderId(drive, name) {
  const res = await drive.files.list({
    q: `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
    spaces: 'drive',
  });
  if (!res.data.files.length) throw new Error(`Ordner "${name}" nicht gefunden`);
  return res.data.files[0].id;
}

async function getLatestFile(drive, folderId) {
  const res = await drive.files.list({
    q: `'${folderId}' in parents and name contains '.md' and trashed=false`,
    orderBy: 'createdTime desc',
    pageSize: 1,
    fields: 'files(id, name, createdTime)',
  });
  if (!res.data.files.length) throw new Error('Keine .md-Datei im Ordner gefunden');
  return res.data.files[0];
}

async function getFileContent(drive, fileId) {
  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'text' }
  );
  return res.data;
}

export async function fetchLatestBriefing() {
  const auth = getAuth();
  const drive = google.drive({ version: 'v3', auth });
  const folderId = await getFolderId(drive, process.env.DRIVE_FOLDER_NAME);
  const file = await getLatestFile(drive, folderId);

  // Prüfen: wurde die Datei heute erstellt?
  const created = new Date(file.createdTime);
  const now = new Date();
  const isToday =
    created.getUTCFullYear() === now.getUTCFullYear() &&
    created.getUTCMonth() === now.getUTCMonth() &&
    created.getUTCDate() === now.getUTCDate();

  if (!isToday) {
    console.log('[drive] Keine neue Datei heute:', file.name);
    return null;
  }

  const content = await getFileContent(drive, file.id);
  return { name: file.name, content };
}
