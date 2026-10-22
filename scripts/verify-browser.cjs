/* Run with Playwright available: node scripts/verify-browser.cjs [base URL].
 * Chromium mobile emulation verifies browser behavior, never real-device audio. */
const { chromium } = require('playwright');
const fs = require('node:fs/promises');
const assert = require('node:assert/strict');
const base = process.argv[2] || 'https://nijoow-launchpad.vercel.app';
const out = process.env.VERIFY_OUTPUT || '/tmp/launchpad-verification';
(async () => {
  await fs.mkdir(out, { recursive: true });
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    headless: true,
    args: ['--no-sandbox'],
    ignoreDefaultArgs: ['--autoplay-policy=no-user-gesture-required'],
  });
  const evidence = {
    base,
    date: new Date().toISOString(),
    browser: browser.version(),
    checks: [],
    errors: [],
    failures: [],
  };
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    acceptDownloads: true,
  });
  await context.addInitScript(() => {
    window.__audio = { contexts: [], starts: [] };
    const Native = window.AudioContext;
    window.AudioContext = class extends Native {
      constructor(...args) {
        super(...args);
        window.__audio.contexts.push(this);
      }
      createBufferSource() {
        const source = super.createBufferSource();
        const start = source.start.bind(source);
        source.start = (...args) => {
          window.__audio.starts.push({
            state: this.state,
            duration: source.buffer?.duration,
          });
          return start(...args);
        };
        return source;
      }
    };
  });
  const watch = page => {
    page.on('pageerror', e => evidence.errors.push(e.message));
    page.on('response', r => {
      if (r.status() >= 400) evidence.failures.push(`${r.status()} ${r.url()}`);
    });
  };
  const page = await context.newPage();
  watch(page);
  const check = (name, detail) => {
    evidence.checks.push({ name, detail });
    console.log('PASS', name, JSON.stringify(detail));
  };
  const ready = async p => {
    await p.locator('.audio-status').filter({ hasText: 'Ready' }).waitFor();
    await p.locator('[data-pad]').first().waitFor();
    await p.waitForFunction(
      () => !document.querySelector('[data-pad]').disabled,
    );
  };
  try {
    await page.goto(base);
    await ready(page);
    const before = await page.evaluate(() =>
      window.__audio.contexts.map(c => c.state),
    );
    await page.locator('[data-pad]').first().tap();
    await page.waitForFunction(() => window.__audio.starts.length > 0);
    const first = await page.evaluate(() => ({
      states: window.__audio.contexts.map(c => c.state),
      starts: window.__audio.starts,
    }));
    assert.deepEqual(before, ['suspended']);
    assert(first.starts.every(s => s.state === 'running'));
    check('first trusted touch starts native audio graph', {
      before,
      ...first,
    });
    await page.reload();
    await ready(page);
    assert.deepEqual(
      await page.evaluate(() => window.__audio.contexts.map(c => c.state)),
      ['suspended'],
    );
    await page
      .getByRole('button', { name: '소리 시작 · 모바일에서 먼저 눌러 주세요' })
      .tap();
    await page.getByText('소리가 준비됐어요. 패드를 연주해 주세요.').waitFor();
    assert.deepEqual(
      await page.evaluate(() => window.__audio.contexts.map(c => c.state)),
      ['running'],
    );
    check('explicit mobile sound start', 'native AudioContext running');
    const cdp = await context.newCDPSession(page);
    const pads = page.locator('[data-pad]');
    await pads.nth(0).scrollIntoViewIfNeeded();
    const a = await pads.nth(0).boundingBox(),
      b = await pads.nth(1).boundingBox();
    const points = [a, b].map((r, i) => ({
      x: r.x + r.width / 2,
      y: r.y + r.height / 2,
      id: i + 1,
    }));
    const startCount = await page.evaluate(() => window.__audio.starts.length);
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: points,
    });
    await page.waitForFunction(
      () =>
        document.querySelectorAll('[data-pad][data-active="true"]').length ===
        2,
    );
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [points[1]],
    });
    await page.waitForFunction(
      () =>
        document.querySelectorAll('[data-pad][data-active="true"]').length ===
        1,
    );
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchCancel',
      touchPoints: [],
    });
    await page.waitForFunction(
      () => !document.querySelector('[data-pad][data-active="true"]'),
    );
    assert.equal(
      await page.evaluate(() => window.__audio.starts.length),
      startCount + 2,
    );
    check(
      'trusted two-finger touch, independent release and cancel',
      '2 → 1 → 0 active pads; exactly two sample starts',
    );
    await page.getByText('루프 편집 · Drum', { exact: true }).tap();
    await page.getByRole('button', { name: '1마디 1칸', exact: true }).tap();
    await page.getByRole('button', { name: 'Piano · 0', exact: true }).tap();
    await page.getByRole('button', { name: '1마디 5칸', exact: true }).tap();
    await page.getByLabel('루프 이름').fill('Cloud mobile validation');
    await page.getByLabel('BPM', { exact: true }).fill('120');
    await page.getByRole('button', { name: '저장', exact: true }).tap();
    await page
      .getByText('루프를 이 기기에 저장했어요.', { exact: true })
      .waitFor();
    const readDB = p =>
      p.evaluate(
        () =>
          new Promise((resolve, reject) => {
            const r = indexedDB.open('nijoow-launchpad', 1);
            r.onsuccess = () => {
              const db = r.result;
              const q = db
                .transaction('projects')
                .objectStore('projects')
                .getAll();
              q.onsuccess = () => {
                db.close();
                resolve(q.result);
              };
              q.onerror = () => reject(q.error);
            };
            r.onerror = () => reject(r.error);
          }),
      );
    const saved = (await readDB(page))[0];
    assert.equal(saved.events.length, 2);
    await page.reload();
    await ready(page);
    assert.equal(
      await page.getByLabel('루프 이름').inputValue(),
      'Cloud mobile validation',
    );
    assert.equal(
      await page
        .getByRole('button', { name: 'Piano · 1', exact: true })
        .getAttribute('aria-pressed'),
      'true',
    );
    assert.equal(await page.locator('.note-count').innerText(), '2개 음');
    check('IndexedDB save and reload restoration', {
      version: saved.version,
      events: saved.events,
      bpm: saved.bpm,
    });
    await page
      .getByRole('button', { name: '공유 링크 만들기', exact: true })
      .tap();
    const link = await page
      .getByLabel('공유 링크', { exact: true })
      .inputValue();
    assert(!link.includes('Cloud'));
    assert(link.includes('#loop='));
    const fresh = await browser.newContext({
      viewport: { width: 360, height: 800 },
      isMobile: true,
      hasTouch: true,
      acceptDownloads: true,
    });
    const shared = await fresh.newPage();
    watch(shared);
    await shared.goto(link);
    await ready(shared);
    await shared
      .getByRole('button', { name: '공유 루프 열기', exact: true })
      .waitFor();
    assert.equal(await shared.locator('.note-count').innerText(), '0개 음');
    assert.equal((await readDB(shared)).length, 0);
    await shared
      .getByRole('button', { name: '공유 루프 열기', exact: true })
      .tap();
    assert.equal(await shared.locator('.note-count').innerText(), '2개 음');
    assert.equal((await readDB(shared)).length, 0);
    await shared.getByRole('button', { name: '저장', exact: true }).tap();
    await shared
      .getByText('루프를 이 기기에 저장했어요.', { exact: true })
      .waitFor();
    const imported = (await readDB(shared))[0];
    assert.deepEqual(imported.events, saved.events);
    assert.notEqual(imported.id, saved.id);
    check('fresh browser share preview → explicit import → separate save', {
      events: imported.events,
      distinctId: true,
      fragmentRemoved: !shared.url().includes('#'),
    });
    await shared.getByRole('button', { name: '재생', exact: true }).tap();
    await shared.locator('[data-transport-status="playing"]').waitFor();
    await shared.getByRole('button', { name: '정지', exact: true }).tap();
    await shared.locator('[data-transport-status="idle"]').waitFor();
    const downloadPromise = shared.waitForEvent('download');
    await shared
      .getByRole('button', { name: 'WAV 내보내기', exact: true })
      .tap();
    const download = await downloadPromise;
    assert.equal(await download.failure(), null);
    const wavPath = out + '/launchpad-loop.wav';
    await download.saveAs(wavPath);
    const wav = await fs.readFile(wavPath);
    assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
    assert.equal(wav.toString('ascii', 8, 12), 'WAVE');
    const channels = wav.readUInt16LE(22),
      rate = wav.readUInt32LE(24),
      bits = wav.readUInt16LE(34),
      bytes = wav.readUInt32LE(40);
    assert.equal(channels, 2);
    assert.equal(rate, 44100);
    assert.equal(bits, 16);
    assert.equal(bytes / ((channels * bits) / 8), 352800);
    let nonzero = 0;
    for (let i = 44; i < wav.length; i += 2)
      if (wav.readInt16LE(i) !== 0) nonzero++;
    assert(nonzero > 0);
    check('shared loop playback and actual WAV download', {
      channels,
      rate,
      bits,
      frames: 352800,
      nonzero,
      bytes: wav.length,
    });
    for (const p of [page, shared]) {
      assert(
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await p.screenshot({
        path: out + `/mobile-${p === page ? 390 : 360}.png`,
        fullPage: true,
      });
    }
    check('390px and 360px mobile viewport', 'no horizontal document overflow');
    await fresh.close();
    assert.deepEqual(evidence.errors, []);
    assert.deepEqual(evidence.failures, []);
    check('browser errors and HTTP failures', {
      errors: evidence.errors,
      failures: evidence.failures,
    });
    evidence.result = 'passed';
  } catch (error) {
    evidence.result = 'failed';
    evidence.error = error.stack;
    console.error(error);
    process.exitCode = 1;
  } finally {
    await fs.writeFile(
      out + '/results.json',
      JSON.stringify(evidence, null, 2) + '\n',
    );
    await browser.close();
  }
})();
