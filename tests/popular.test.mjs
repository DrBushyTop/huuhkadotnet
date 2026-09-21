import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseHTML} from 'linkedom';

const {document} = parseHTML(readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8'));

test('popular articles follow the supplied ranking, excluding the front page', () => {
  const cards = [...document.querySelectorAll('.popular-card')];
  assert.deepEqual(cards.map(card => card.getAttribute('href')), [
    '/building-your-own-pr-reviewer-with-coding-agents/',
    '/connecting-opencode-with-microsoft-foundry-models/',
    '/browser-verification-for-coding-agents-chrome-devtools-mcp-vs-agent-browser/',
    '/azure-devops-agents-in-azure-container-apps/',
  ]);
  assert.deepEqual(cards.map(card => card.querySelector('h3').textContent), [
    'Building your own PR reviewer with coding agents',
    'Connecting OpenCode with Microsoft Foundry Models',
    'Browser verification for coding agents: Chrome DevTools MCP vs agent-browser',
    'Azure DevOps Agents in Azure Container Apps',
  ]);
  for (const card of cards) {
    assert.ok(card.querySelector('img[src]'));
    assert.ok(document.querySelector(`.article-card a[href="${card.getAttribute('href')}"]`));
  }
});
