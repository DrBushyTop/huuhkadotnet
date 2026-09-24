const number = new Intl.NumberFormat('en');
const monthName = value => new Intl.DateTimeFormat('en', {month: 'short', year: 'numeric', timeZone: 'UTC'}).format(new Date(`${value}-01T00:00:00Z`));

function showRows(target, rows, kind) {
  target.replaceChildren();
  if (!rows.length) {
    const tr = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 2;
    cell.textContent = 'No data in this period.';
    tr.append(cell);
    target.append(tr);
    return;
  }
  for (const row of rows.slice(0, 12)) {
    const tr = document.createElement('tr');
    const label = document.createElement('td');
    const destination = kind === 'page' && /^\/(?!\/)/.test(row.path)
      ? new URL(row.path, 'https://www.huuhka.net') : null;
    if (destination?.origin === 'https://www.huuhka.net') {
      const link = document.createElement('a');
      link.className = 'page-link';
      link.href = destination.href;
      link.textContent = row.path;
      label.append(link);
    } else {
      label.textContent = kind === 'page' ? row.path : row.domain;
    }
    const count = document.createElement('td');
    count.textContent = number.format(row.count);
    tr.append(label, count);
    target.append(tr);
  }
}

function showTrend(months) {
  const target = document.querySelector('#trend-bars');
  target.replaceChildren();
  const ordered = [...months].reverse();
  const maximum = Math.max(1, ...ordered.map(item => item.views));
  for (const item of ordered) {
    const column = document.createElement('div');
    column.className = 'trend-item';
    const value = document.createElement('span');
    value.className = 'trend-number';
    value.textContent = number.format(item.views);
    const track = document.createElement('div');
    track.className = 'trend-track';
    const fill = document.createElement('div');
    fill.className = 'trend-fill';
    fill.style.width = `${Math.max(2, item.views / maximum * 100)}%`;
    track.append(fill);
    const label = document.createElement('span');
    label.textContent = monthName(item.month);
    column.append(label, track, value);
    target.append(column);
  }
  document.querySelector('#trend-note').textContent = `${months.length} ${months.length === 1 ? 'month' : 'months'} archived`;
}

async function main() {
  const response = await fetch('/report.json', {cache: 'no-store'});
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const report = await response.json();
  const period = document.querySelector('#period');
  period.replaceChildren(new Option('Archive total', 'all'), ...report.months.map(item => new Option(monthName(item.month), item.month)));
  period.disabled = false;
  showTrend(report.months);
  function render() {
    const selected = period.value === 'all' ? report.all : report.months.find(item => item.month === period.value);
    document.querySelector('#views').textContent = number.format(selected.views);
    document.querySelector('#visits').textContent = number.format(selected.visits);
    document.querySelector('#visitors').textContent = number.format(selected.visitors);
    showRows(document.querySelector('#pages'), selected.pages, 'page');
    showRows(document.querySelector('#referrers'), selected.referrers, 'referrer');
  }
  period.addEventListener('change', render);
  render();
  const through = report.coverage.through?.slice(0, 10) ?? 'unknown';
  const updated = new Date(report.generatedAt).toLocaleDateString('en', {year: 'numeric', month: 'short', day: 'numeric'});
  document.querySelector('#footnote').textContent = `Data through ${through} UTC. Updated ${updated} from Umami Cloud exports. Referrers count the first page view in each visit.`;
  document.querySelector('#status').textContent = '';
  document.querySelector('#report').hidden = false;
}

main().catch(() => {
  document.querySelector('#status').textContent = 'Could not load the traffic archive. Reload the page or sign in again.';
});
