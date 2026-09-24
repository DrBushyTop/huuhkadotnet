import {chromium} from 'playwright';

export async function requestUmamiExport({email, password, websiteName}) {
  if (!email || !password || !websiteName) throw new Error('Umami login and website name are required.');
  const browser = await chromium.launch({headless: true});
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(20000);

    // An unhydrated login form can submit its fields in the URL. Prevent the
    // native submit while allowing Umami's client-side handler to process it.
    await page.addInitScript(() => document.addEventListener('submit', event => {
      if (event.target?.querySelector?.('input[type=password]')) event.preventDefault();
    }, true));
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.searchParams.has('password') || url.searchParams.has('email')) return route.abort();
      return route.continue();
    });

    await page.goto('https://cloud.umami.is/login', {waitUntil: 'networkidle'});
    await page.locator('input[name=email]').fill(email);
    await page.locator('input[name=password]').fill(password);
    await page.getByRole('button', {name: 'Log in'}).click();
    await page.waitForURL('**/websites');
    await page.locator('button[data-slot="menu-trigger"]').first().waitFor();
    await page.goto('https://cloud.umami.is/settings/data', {waitUntil: 'networkidle'});
    await page.getByRole('button', {name: 'Export', exact: true}).first().click();
    const dialog = page.locator('[role=dialog]');
    await dialog.waitFor();
    await dialog.locator('button[role=combobox]').first().click();
    await page.getByRole('option', {name: websiteName, exact: true}).click();
    await dialog.locator('button[role=combobox]').last().click();
    await page.getByRole('option', {name: 'Last 6 months', exact: true}).click();
    await dialog.getByRole('button', {name: 'Export'}).click();
    await page.getByText('Export requested. A download link will be emailed to you.').waitFor();
  } finally {
    await browser.close();
  }
}
