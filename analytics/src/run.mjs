import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {archiveClient, readArchives, readJson, saveArchive, writeJson} from './storage.mjs';
import {requestUmamiExport} from './umami.mjs';
import {downloadExport, findExportEmail} from './resend.mjs';
import {buildReport} from './report.mjs';
import {publishViewer, writeViewer} from './publish.mjs';

const websiteId = '3f673ea9-160f-4880-8d92-226feaa1e6d9';
const websiteName = 'huuhkadotnet';

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function priorMonth(now) {
  const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return first.toISOString().slice(0, 7);
}

export async function run({bootstrap = false, now = new Date()} = {}) {
  const container = archiveClient(required('AZURE_STORAGE_ACCOUNT'));
  const state = await readJson(container, 'state.json', {months: {}, snapshots: []});
  const month = priorMonth(now);
  let run = state.months[month];

  const staleRequest = run?.status === 'requesting' && Date.parse(run.requestedAt) < now.getTime() - 60 * 60 * 1000;
  if (!bootstrap && now.getUTCDate() >= 2 && (!run || run.status === 'failed' || staleRequest)) {
    run = {status: 'requesting', requestedAt: now.toISOString()};
    state.months[month] = run;
    await writeJson(container, 'state.json', state);
    try {
      await requestUmamiExport({
        email: required('UMAMI_EMAIL'),
        password: required('UMAMI_PASSWORD'),
        websiteName,
      });
      run.status = 'requested';
      await writeJson(container, 'state.json', state);
      console.log(`Requested Umami export for ${month}.`);
    } catch (error) {
      run.status = 'failed';
      await writeJson(container, 'state.json', state);
      throw error;
    }
  }

  if (run?.status === 'completed' && !bootstrap) return;
  const requestedAt = bootstrap ? new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString() : run?.requestedAt;
  if (!requestedAt) return;
  const key = required('RESEND_API_KEY');
  const inbox = required('UMAMI_EMAIL');
  const email = await findExportEmail(key, requestedAt, inbox);
  if (!email) {
    if (!bootstrap && Date.parse(requestedAt) < now.getTime() - 48 * 60 * 60 * 1000) {
      run.status = 'failed';
      await writeJson(container, 'state.json', state);
      throw new Error(`No Umami export email arrived within 48 hours for ${month}.`);
    }
    console.log(`Export email pending for ${month}.`);
    return;
  }

  let bytes;
  try {
    bytes = await downloadExport(key, email.id);
  } catch (error) {
    if (!bootstrap && Date.parse(email.created_at) < now.getTime() - 48 * 60 * 60 * 1000) {
      run.status = 'failed';
      await writeJson(container, 'state.json', state);
    }
    throw error;
  }
  const hash = createHash('sha256').update(bytes).digest('hex');
  const path = `exports/${hash}.zip`;
  await saveArchive(container, path, bytes);
  if (!state.snapshots.some(snapshot => snapshot.hash === hash)) {
    state.snapshots.push({hash, path, createdAt: email.created_at, emailId: email.id});
    await writeJson(container, 'state.json', state);
  }
  const report = buildReport(await readArchives(container, state.snapshots), {websiteId});
  if (report.all.views === 0) throw new Error('Export has no page views; previous report remains published.');
  const directory = fileURLToPath(new URL('../.output/viewer/', import.meta.url));
  writeViewer(report, directory);
  await publishViewer(required('AZURE_STATIC_SITE_RESOURCE_ID'), directory);
  if (bootstrap) state.months[month] = {status: 'completed', requestedAt: email.created_at, completedAt: new Date().toISOString(), bootstrap: true};
  else {
    run.status = 'completed';
    run.completedAt = new Date().toISOString();
  }
  await writeJson(container, 'state.json', state);
  console.log(`Published ${report.all.views} deduplicated page views from ${state.snapshots.length} export(s).`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run({bootstrap: process.argv.includes('--bootstrap')}).catch(error => {
    console.error(error.message);
    const key = process.env.RESEND_API_KEY;
    const recipient = process.env.ALERT_EMAIL;
    if (key && recipient) {
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': `analytics-export-failed-${new Date().toISOString().slice(0, 10)}`,
        },
        body: JSON.stringify({
          from: 'Analytics archive <metrics@mail.huuhka.net>',
          to: [recipient],
          subject: 'huuhka.net analytics export failed',
          text: 'The scheduled Umami export job failed. Check the Container Apps job execution in huuhkadotnet-prod and rerun it after fixing the cause.',
        }),
      }).then(response => {
        if (!response.ok) console.error(`Could not send failure alert: HTTP ${response.status}.`);
      }).catch(() => console.error('Could not send failure alert.'))
        .finally(() => {process.exitCode = 1;});
    } else process.exitCode = 1;
  });
}
