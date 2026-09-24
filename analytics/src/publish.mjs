import {gzipSync} from 'node:zlib';

export const REPORT_CONTAINER = 'reports';
export const UMAMI_REPORT = 'umami.json';

/**
 * Writes the report to the private reports container. The viewer reads it with
 * the owner's Entra token. Stored gzipped; browsers decode Content-Encoding.
 */
export async function publishReport(container, report, name = UMAMI_REPORT) {
  const body = gzipSync(Buffer.from(JSON.stringify(report)));
  await container.getBlockBlobClient(name).uploadData(body, {
    blobHTTPHeaders: {
      blobContentType: 'application/json',
      blobContentEncoding: 'gzip',
      blobCacheControl: 'no-cache',
    },
  });
}
