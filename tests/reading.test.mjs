import {test} from 'node:test';
import assert from 'node:assert/strict';
import {activeHeadingIndex,contentsHeadings} from '../src/lib/reading.ts';
test('reading position selects the section above the reading line in either direction',()=>{
  const tops=[500,1100,2200];
  assert.equal(activeHeadingIndex(tops,0,900),0);
  assert.equal(activeHeadingIndex(tops,1000,900),1);
  assert.equal(activeHeadingIndex(tops,3000,900),2);
  assert.equal(activeHeadingIndex(tops,550,900),0);
  assert.equal(activeHeadingIndex(tops,1900,900),2);
  assert.equal(activeHeadingIndex(tops,1899,900),1);
});
test('reading position advances when the next section occupies the upper viewport',()=>{
  // Only the final line of the previous section remains above the next heading.
  assert.equal(activeHeadingIndex([0,180,720],0,900),1);
  // A heading near the bottom must not replace the section being read.
  assert.equal(activeHeadingIndex([0,720],0,900),0);
});
test('reading line adapts to viewport height and stays below the header with a 320px cap',()=>{
  assert.equal(activeHeadingIndex([0,250],0,600),0);
  assert.equal(activeHeadingIndex([0,250],0,900),1);
  assert.equal(activeHeadingIndex([0,321],0,1500),0);
  assert.equal(activeHeadingIndex([0,112],0,300),1);
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
