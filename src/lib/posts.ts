import thumbnails from '../data/thumbnails.json';
import { getCollection, type CollectionEntry } from 'astro:content';
export async function getPosts() {
  return (await getCollection('blog', ({data}) => !data.draft))
    .sort((a,b) => Date.parse(b.data.publishedAt) - Date.parse(a.data.publishedAt));
}
export function cardPost(post: CollectionEntry<'blog'>) {
  return {...post.data, image:(thumbnails as Record<string,string>)[post.data.slug] || post.data.image, url:`/${post.data.slug}/`};
}
export const dateFormat = new Intl.DateTimeFormat('en-GB', {day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'});
