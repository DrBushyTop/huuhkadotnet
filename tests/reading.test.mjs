import {test} from 'node:test';
import assert from 'node:assert/strict';
import {activeHeadingIndex} from '../src/lib/reading.ts';
import {collectSeries,seriesCallouts} from '../scripts/migration/series.mjs';
import {documentFor} from '../scripts/migration/convert.mjs';
test('reading position selects the section above the reading line in either direction',()=>{
  const tops=[500,1100,2200];
  assert.equal(activeHeadingIndex(tops,0),0);
  assert.equal(activeHeadingIndex(tops,1000),1);
  assert.equal(activeHeadingIndex(tops,3000),2);
  assert.equal(activeHeadingIndex(tops,550),0);
  assert.equal(activeHeadingIndex(tops,2088),2);
});
const series='<div class="kg-callout-card"><div class="kg-callout-text">This post is part of a larger Agentic Dev theme:<br><a href="https://www.huuhka.net/one/">One</a><br><a href="https://www.huuhka.net/two/">Two</a></div></div>';
test('extracts original series order without assigning unrelated warnings to a series',()=>{
  const document=documentFor(series+'<div class="kg-callout-card"><div class="kg-callout-text">Warning: this needs a newer version.</div></div>');
  const blocks=seriesCallouts(document);
  assert.equal(blocks.length,1);blocks[0].node.remove();
  assert.match(document.body.textContent,/Warning: this needs a newer version/);
  assert.deepEqual(collectSeries([{slug:'one',html:series},{slug:'two',html:series}]),[{id:'agentic-dev',title:'Agentic Dev',posts:['one','two']}]);
});
test('series imports reject missing posts rather than generating dead links',()=>{
  assert.throws(()=>collectSeries([{slug:'one',html:series}]),/Invalid series membership/);
});
