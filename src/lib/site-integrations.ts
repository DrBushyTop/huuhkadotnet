export const umamiWebsiteId = '3f673ea9-160f-4880-8d92-226feaa1e6d9';
export const publicHostnames = ['huuhka.net', 'www.huuhka.net', 'blog.huuhka.net'];

// Do not send preview traffic or create comment threads from staging hosts.
export function isPublicSite(location: Pick<Location, 'protocol' | 'hostname'>): boolean {
  return location.protocol === 'https:' &&
    publicHostnames.includes(location.hostname);
}
