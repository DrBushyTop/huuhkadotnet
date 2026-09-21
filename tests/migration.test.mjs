import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildContent,buildFrontMatter,localLink,mdx} from '../scripts/migration/convert.mjs';
import YAML from 'yaml';
test('migration retains code language, whitespace, braces, and nested fences',()=>{
  const body=buildContent('<pre><code class="language-csharp">var x = new { Name = "test" };\n```\n</code></pre>');
  assert.ok(body.startsWith('````csharp\n'));
  assert.ok(body.includes('var x = new { Name = "test" };\n```\n````'));
});
test('ordinary MDX text escapes expressions without changing inline code',()=>{
  const body=buildContent('<p>Use {name} and &lt;value&gt;, or <code>{exact}</code>.</p>');
  assert.ok(body.includes('&#123;name&#125;'));
  assert.ok(body.includes('&lt;value>'));
  assert.ok(body.includes('`{exact}`'));
});
test('internal URLs become local while fragments and external URLs survive',()=>{
  assert.equal(localLink('https://www.huuhka.net/post/?ref=huuhka.net#part'),'/post/#part');
  assert.equal(localLink('#part'),'#part');
  assert.equal(localLink('https://example.com/docs?q=test'),'https://example.com/docs?q=test');
});
test('metadata preserves exact timestamps, slugs, tags, and explicit SEO overrides',()=>{
  const post={title:'A title',slug:'exact-slug',published_at:'2020-01-01T12:30:00.000+02:00',updated_at:'2020-01-02T12:30:00.000+02:00',html:'<p>Body</p>',custom_excerpt:'Original excerpt',canonical_url:'https://example.com/original/',meta_title:'SEO title',meta_description:'SEO description'};
  const fm=buildFrontMatter(post,'/images/a.png',[{name:'.NET',slug:'net'}]);
  const parsed=YAML.parse(mdx(fm,'Body').split('---')[1]);
  assert.equal(parsed.publishedAt,post.published_at);assert.equal(parsed.slug,'exact-slug');assert.equal(parsed.description,'Original excerpt');assert.equal(parsed.canonicalUrl,post.canonical_url);assert.equal(parsed.seoTitle,'SEO title');assert.deepEqual(parsed.tags,['.NET']);assert.deepEqual(parsed.tagSlugs,['net']);assert.equal(parsed.views,undefined);assert.equal(parsed.author,undefined);
});
test('missing content fails rather than generating a placeholder article',()=>{
  assert.throws(()=>buildFrontMatter({slug:'empty'},null,[]),/Incomplete post/);
});
