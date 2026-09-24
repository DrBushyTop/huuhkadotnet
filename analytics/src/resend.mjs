const api = 'https://api.resend.com';
const exportSender = 'support@umami.is';
const exportSubject = 'Website export completed';
const downloadHost = 'umami-public.s3.eu-central-1.amazonaws.com';

async function getJson(path, key) {
  const response = await fetch(`${api}${path}`, {headers: {Authorization: `Bearer ${key}`}});
  if (!response.ok) throw new Error(`Resend returned HTTP ${response.status}.`);
  return response.json();
}

export async function findExportEmail(key, requestedAt, inbox) {
  let cursor;
  for (;;) {
    const page = await getJson(`/emails/receiving?limit=100${cursor ? `&after=${encodeURIComponent(cursor)}` : ''}`, key);
    const candidates = page.data.filter(email =>
      email.from?.toLowerCase() === exportSender &&
      email.subject === exportSubject &&
      Date.parse(email.created_at) >= Date.parse(requestedAt) &&
      email.to?.some(address => address.toLowerCase() === inbox.toLowerCase()),
    );
    if (candidates.length) return candidates.sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    if (!page.has_more || !page.data.length) return null;
    cursor = page.data.at(-1).id;
  }
}

export function exportUrl(message) {
  const urls = [...(message.text ?? '').matchAll(/https:\/\/[^\s<>"']+/g)]
    .map(match => { try { return new URL(match[0]); } catch { return null; } })
    .filter(Boolean);
  const url = urls.find(url => url.hostname === downloadHost && url.pathname.endsWith('.zip'));
  if (!url) throw new Error('Umami email has no expected ZIP download link.');
  if (!url.searchParams.has('X-Amz-Signature')) throw new Error('Umami download link is unsigned.');
  return url;
}

export async function downloadExport(key, emailId) {
  const message = await getJson(`/emails/receiving/${encodeURIComponent(emailId)}`, key);
  if (message.from?.toLowerCase() !== exportSender || message.subject !== exportSubject) {
    throw new Error('Resend message is not an Umami export.');
  }
  const url = exportUrl(message);
  const response = await fetch(url, {redirect: 'error'});
  if (!response.ok) throw new Error(`Umami download returned HTTP ${response.status}.`);
  const size = Number(response.headers.get('content-length') ?? 0);
  if (size > 100 * 1024 * 1024) throw new Error('Umami export exceeds 100 MB.');
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > 100 * 1024 * 1024) throw new Error('Umami export exceeds 100 MB.');
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new Error('Umami download is not a ZIP file.');
  return bytes;
}
