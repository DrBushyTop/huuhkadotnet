import {test} from 'node:test';
import assert from 'node:assert/strict';
import {activeHeadingIndex,contentsHeadings} from '../src/lib/reading.ts';
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
