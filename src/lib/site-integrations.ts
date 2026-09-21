export const measurementId = 'G-X678YYBF80';

// Do not send preview traffic or create comment threads from staging hosts.
export function isPublicSite(location: Pick<Location, 'protocol' | 'hostname'>): boolean {
  return location.protocol === 'https:' &&
    ['huuhka.net', 'www.huuhka.net', 'blog.huuhka.net'].includes(location.hostname);
}
