import {DefaultAzureCredential} from '@azure/identity';
import {spawn} from 'node:child_process';
import {cpSync, mkdirSync, rmSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const source = fileURLToPath(new URL('../viewer/', import.meta.url));

export function writeViewer(report, target) {
  rmSync(target, {recursive: true, force: true});
  mkdirSync(target, {recursive: true});
  cpSync(source, target, {recursive: true});
  writeFileSync(join(target, 'report.json'), JSON.stringify(report));
}

async function deploymentToken(resourceId) {
  if (!/^\/subscriptions\/[^/]+\/resourceGroups\/[^/]+\/providers\/Microsoft\.Web\/staticSites\/[^/]+$/i.test(resourceId)) {
    throw new Error('Invalid Static Web App resource ID.');
  }
  const credential = new DefaultAzureCredential();
  const {token} = await credential.getToken('https://management.azure.com/.default');
  const response = await fetch(`https://management.azure.com${resourceId}/listSecrets?api-version=2024-11-01`, {
    method: 'POST', headers: {Authorization: `Bearer ${token}`},
  });
  if (!response.ok) throw new Error(`Static Web App token request returned HTTP ${response.status}.`);
  const result = await response.json();
  if (!result.properties?.apiKey) throw new Error('Static Web App deployment token missing.');
  return result.properties.apiKey;
}

export async function publishViewer(resourceId, directory) {
  const token = await deploymentToken(resourceId);
  const cli = fileURLToPath(new URL('../node_modules/.bin/swa', import.meta.url));
  await new Promise((resolve, reject) => {
    const child = spawn(cli, ['deploy', directory, '--env', 'production'], {
      stdio: 'inherit', env: {...process.env, SWA_CLI_DEPLOYMENT_TOKEN: token},
    });
    child.on('error', reject);
    child.on('exit', code => code === 0 ? resolve() : reject(new Error(`SWA deployment exited ${code}.`)));
  });
}
