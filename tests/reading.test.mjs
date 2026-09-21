import {test} from 'node:test';
import assert from 'node:assert/strict';
import {activeHeadingIndex,contentsHeadings} from '../src/lib/reading.ts';
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
test('contents includes a lone section and its subheadings, preserving order and anchors',()=>{
  const headings = [
    {depth:2,slug:'my-agent-stack',text:'My Agent Stack'},
    {depth:3,slug:'the-three-agents',text:'The three agents'},
    {depth:3,slug:'quick-note-about-the-repo',text:'Quick Note About the Repo'},
  ];
  assert.deepEqual(contentsHeadings(headings),headings);
});
test('contents skips titles and deeper details, supports legacy heading levels and empty posts',()=>{
  assert.deepEqual(contentsHeadings([{depth:1},{depth:2},{depth:3},{depth:4},{depth:2}]),[{depth:2},{depth:3},{depth:2}]);
  assert.deepEqual(contentsHeadings([{depth:3},{depth:4},{depth:5}]),[{depth:3},{depth:4}]);
  assert.deepEqual(contentsHeadings([]),[]);
  assert.deepEqual(contentsHeadings([{depth:1}]),[]);
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
