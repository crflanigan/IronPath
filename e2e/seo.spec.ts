import { test, expect } from '@playwright/test';

/**
 * What a crawler sees.
 *
 * These deliberately use `request` rather than `page`: the point is the raw
 * HTML, with no JavaScript executed. The app is entirely client-rendered, so
 * before this suite existed the most substantial text a non-JS crawler could
 * read on the homepage was a code comment about `controllerchange`.
 *
 * Most LLM crawlers do not run JavaScript, so everything asserted here is the
 * difference between the app being describable and being invisible.
 */

test.describe('the crawlable surface', () => {
  test('the homepage HTML describes the app without running JavaScript', async ({ request }) => {
    const html = await (await request.get('/')).text();

    // Content, not markup. What matters is that the description is present in
    // the raw HTML, which is all a non-JS agent ever sees.
    expect(html).toContain('No account, no signup');
    expect(html).toMatch(/works entirely offline/i);
    expect(html).toContain('Log weight, reps and rest set by set');

    // It lives in <noscript> rather than in #root. An earlier version put it
    // in #root, where crawlers read it — and so did users, as a full screen of
    // text during a cold start, because inline styles need nothing to paint.
    const noscript = html.match(/<noscript>([\s\S]*?)<\/noscript>/);
    expect(noscript, 'no <noscript> fallback found').not.toBeNull();
    expect(noscript![1]).toContain('No account, no signup');
  });

  test('nothing visible paints before the app does', async ({ page }) => {
    // The regression that prompted this: dark text on a white page, full
    // screen, for as long as the bundle took to arrive.
    await page.goto('/', { waitUntil: 'commit' });

    const strayText = await page.evaluate(() => {
      const root = document.getElementById('root');
      return (root?.textContent ?? '').trim();
    });

    expect(strayText, 'markup outside the app is painting on load').toBe('');
  });

  test('structured data is present and parses', async ({ request }) => {
    const html = await (await request.get('/')).text();

    const match = html.match(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
    );
    expect(match, 'no JSON-LD block found').not.toBeNull();

    const data = JSON.parse(match![1]);
    expect(data['@type']).toBe('SoftwareApplication');
    expect(data.name).toBe('IronPath');
    expect(data.offers.price).toBe('0');
    expect(Array.isArray(data.featureList)).toBe(true);
    expect(data.featureList.length).toBeGreaterThan(5);
  });

  test('the title and description carry the differentiators, not the tech stack', async ({
    request,
  }) => {
    const html = await (await request.get('/')).text();

    const title = html.match(/<title>(.*?)<\/title>/)![1];
    expect(title).toMatch(/offline/i);
    expect(title).toMatch(/no account/i);

    const description = html.match(
      /<meta name="description" content="(.*?)"/,
    )![1];
    expect(description).toMatch(/no account/i);
    expect(description).toMatch(/offline/i);
    // "Progressive web app with offline capabilities" is what it used to say.
    expect(description).not.toMatch(/progressive web app/i);
  });

  test('social previews use absolute image URLs', async ({ request }) => {
    const html = await (await request.get('/')).text();

    // Relative og:image is why link previews came back blank in some scrapers.
    for (const prop of ['og:image', 'twitter:image']) {
      const value = html.match(
        new RegExp(`(?:property|name)="${prop}" content="(.*?)"`),
      )![1];
      expect(value, `${prop} must be absolute`).toMatch(/^https:\/\//);
    }
  });

  test('the sitemap lists only routes that exist', async ({ request }) => {
    const xml = await (await request.get('/sitemap.xml')).text();

    // The app has exactly three routes: /, /workout/:id and /history.
    // These four were advertised and never existed; the SPA fallback returned
    // 200 for them, so they were soft 404s duplicating the homepage.
    for (const fake of ['/calendar', '/custom-workout', '/settings', '/workout<']) {
      expect(xml, `${fake} is not a route`).not.toContain(
        `https://ironpath.app${fake}`,
      );
    }

    expect(xml).toContain('<loc>https://ironpath.app/</loc>');
  });

  test('robots.txt allows crawlers and points at the sitemap', async ({ request }) => {
    const txt = await (await request.get('/robots.txt')).text();

    expect(txt).toContain('Sitemap: https://ironpath.app/sitemap.xml');
    expect(txt).toMatch(/User-agent:\s*\*/);
    expect(txt).not.toMatch(/^\s*Disallow:\s*\/\s*$/m);
  });

  test('llms.txt is served and states the trade-off honestly', async ({ request }) => {
    const res = await request.get('/llms.txt');
    expect(res.status()).toBe(200);

    const txt = await res.text();
    expect(txt).toContain('# IronPath');
    // The section that keeps a recommendation accurate rather than flattering.
    expect(txt).toMatch(/poor match/i);
    // Whitespace-tolerant: the file is hard-wrapped, so this phrase spans a
    // line break.
    expect(txt).toMatch(/does not\s+sync/i);
  });
});
