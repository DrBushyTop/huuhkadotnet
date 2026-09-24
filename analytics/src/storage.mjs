import {DefaultAzureCredential} from '@azure/identity';
import {BlobServiceClient} from '@azure/storage-blob';

export function archiveClient(accountName, containerName = 'umami') {
  if (!/^[a-z0-9]{3,24}$/.test(accountName)) throw new Error('Invalid storage account name.');
  const service = new BlobServiceClient(`https://${accountName}.blob.core.windows.net`, new DefaultAzureCredential());
  return service.getContainerClient(containerName);
}

export async function readJson(container, path, fallback) {
  const blob = container.getBlockBlobClient(path);
  try {
    const bytes = await blob.downloadToBuffer();
    return JSON.parse(bytes.toString('utf8'));
  } catch (error) {
    if (error.statusCode === 404) return fallback;
    throw error;
  }
}

export async function writeJson(container, path, value) {
  await container.getBlockBlobClient(path).uploadData(Buffer.from(JSON.stringify(value)), {
    blobHTTPHeaders: {blobContentType: 'application/json'},
  });
}

export async function saveArchive(container, path, bytes) {
  const blob = container.getBlockBlobClient(path);
  if (await blob.exists()) return;
  await blob.uploadData(bytes, {blobHTTPHeaders: {blobContentType: 'application/zip'}});
}

export async function readArchives(container, snapshots) {
  return Promise.all(snapshots.map(async snapshot => ({
    createdAt: snapshot.createdAt,
    bytes: await container.getBlockBlobClient(snapshot.path).downloadToBuffer(),
  })));
}
