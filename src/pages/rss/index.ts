import rss from '@astrojs/rss';
import {getPosts} from '../../lib/posts';
export async function GET() {
  return rss({title:'Huuhka.net',description:'Articles by Pasi Huuhka on DevOps, Azure, and building software with AI.',site:'https://www.huuhka.net',items:(await getPosts()).map(({data})=>({title:data.title,description:data.description,pubDate:new Date(data.publishedAt),link:`/${data.slug}/`,categories:data.tags})),customData:'<language>en</language>'});
}
