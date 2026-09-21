import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';
const schema = z.object({
  title: z.string(), slug: z.string(), description: z.string(),
  publishedAt: z.string().datetime({offset:true}), updatedAt: z.string().datetime({offset:true}),
  image: z.string().optional(), imageAlt: z.string().default(''), imageCaption: z.string().optional(),
  tags: z.array(z.string()).default([]), tagSlugs: z.array(z.string()).default([]),
  series: z.array(z.string()).default([]),
  draft: z.boolean().default(false), featured: z.boolean().default(false),
  canonicalUrl: z.string().url().optional(), seoTitle:z.string().optional(), seoDescription:z.string().optional(),
  ogTitle:z.string().optional(), ogDescription:z.string().optional(), ogImage:z.string().optional(),
  twitterTitle:z.string().optional(), twitterDescription:z.string().optional(), twitterImage:z.string().optional(),
});
export const collections = {
  blog: defineCollection({loader:glob({pattern:'**/*.mdx',base:'./src/content/blog'}),schema}),
  pages: defineCollection({loader:glob({pattern:'**/*.mdx',base:'./src/content/pages'}),schema}),
};
