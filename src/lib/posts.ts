import thumbnails from '../data/thumbnails.json';
import { getCollection, type CollectionEntry } from 'astro:content';
import { isPublished } from './publishing';
// Posts with a future publishedAt stay out until a build runs after that time.
// PUBLISH_NOW=2026-11-20T09:00:00Z builds the site as it will look then.
export const buildTime = Date.parse(import.meta.env.PUBLISH_NOW ?? '') || Date.now();
export async function getPosts() {
  return (await getCollection('blog', ({data}) => isPublished(data, buildTime)))
    .sort((a,b) => Date.parse(b.data.publishedAt) - Date.parse(a.data.publishedAt));
}
export function cardPost(post: CollectionEntry<'blog'>) {
  return {...post.data, image:(thumbnails as Record<string,string>)[post.data.slug] || post.data.image, url:`/${post.data.slug}/`};
}
export const dateFormat = new Intl.DateTimeFormat('en-GB', {day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'});
