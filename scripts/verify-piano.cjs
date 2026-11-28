// Run with Playwright available, against a running local production build.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { chromium } = require('playwright');
const base = process.argv[2] || 'http://127.0.0.1:3000';

async function verifySettings(page) {
  await page.goto(base);
  await page.locator('[data-pad]:enabled').first().click();
  await page.waitForFunction(() => window.sampleStarts === 1);
  const volume = page.getByRole('slider', { name: '볼륨' });
  const pitch = page.getByRole('checkbox', { name: '음 이름' });
  for (const control of [volume, pitch]) {
    await control.click();
    const starts = await page.evaluate(() => window.sampleStarts);
    await page.keyboard.down('g');
    assert.equal(await page.locator('[data-active=true]').count(), 1);
    assert.equal(await page.evaluate(() => window.sampleStarts), starts + 1);
    await page.keyboard.up('g');
    assert.equal(await page.locator('[data-active=true]').count(), 0);
  }
  const checked = await pitch.isChecked();
  await page.keyboard.press('Space');
  assert.notEqual(await pitch.isChecked(), checked);
  await volume.focus();
  const before = Number(await volume.inputValue());
  await page.keyboard.press(before > 0 ? 'ArrowLeft' : 'ArrowRight');
  assert.notEqual(Number(await volume.inputValue()), before);
  await page.keyboard.press('Tab');
  assert.equal(
    await volume.evaluate(el => el === document.activeElement),
    false,
  );

  await page.getByRole('button', { name: '노트 게임' }).click();
  await page.getByRole('button', { name: '게임 시작' }).click();
  await volume.focus();
  await page.waitForFunction(() =>
    document.querySelector('.note-cue[data-on-beat=true]'),
  );
  await page.keyboard.press('g');
  await page.getByText('1 / 15개 성공', { exact: false }).waitFor();

  await page.goto(new URL('/studio', base).href);
  const name = page.getByRole('textbox', { name: '루프 이름' });
  await name.fill('');
  await name.press('g');
  assert.equal(await name.inputValue(), 'g');
  assert.equal(await page.evaluate(() => window.sampleStarts), 0);
}

async function verifyPartialAudio(page) {
  // B5 is unused; C4 belongs only to the accompaniment; E5 is a melody note.
  for (const midi of [83, 60, 76]) {
    const path = `**/audio/piano/piano${midi}.wav`;
    await page.route(path, route => route.abort());
    await page.goto(base);
    await page.waitForFunction(
      () => document.querySelectorAll('[data-pad]:enabled').length === 35,
    );
    assert.equal(await page.locator('[data-pad]').count(), 36);
    assert.equal(
      await page.locator(`[data-pad$="piano${midi}.wav"]`).isDisabled(),
      true,
    );
    await page.locator('[data-pad]:enabled').first().click();
    await page.waitForFunction(() => window.sampleStarts === 1);
    assert.equal(await page.evaluate(() => window.sampleStarts), 1);
    await page.getByRole('button', { name: '노트 게임' }).click();
    const start = page.getByRole('button', { name: '게임 시작' });
    assert.equal(await start.isEnabled(), midi === 83);
    if (midi === 83) {
      await start.click();
      await page.getByText('준비 · 4', { exact: true }).waitFor();
      await page.getByRole('button', { name: '중지' }).click();
    } else {
      await page
        .getByText('이 곡에 필요한 음원을 다시 불러와 주세요.')
        .waitFor();
    }
    await page.unroute(path);
    const retried = [];
    const count = request => {
      if (request.url().endsWith('.wav')) retried.push(request.url());
    };
    page.on('request', count);
    await page.getByRole('button', { name: '다시 시도' }).click();
    await page.getByText('피아노 준비됨', { exact: true }).waitFor();
    page.off('request', count);
    assert.equal(retried.length, 1);
    assert.ok(retried[0].endsWith(`piano${midi}.wav`));
    assert.equal(await page.locator('[data-pad]:enabled').count(), 36);
    assert.equal(await start.isEnabled(), true);
  }
}

async function verifyInterruptions(page) {
  await page.goto(base);
  await page.getByRole('button', { name: '노트 게임' }).click();
  const start = page.getByRole('button', { name: '게임 시작', exact: true });
  const restart = page.getByRole('button', {
    name: '처음부터 다시 연주',
    exact: true,
  });
  await start.click();
  await page.getByText('준비 · 4', { exact: true }).waitFor();
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await restart.waitFor();
  await page.getByText('다른 화면으로 이동해 연주가 중단됐어요.').waitFor();
  const scheduled = await page.evaluate(() => window.sampleStarts);
  await restart.click();
  await page.getByText('준비 · 4', { exact: true }).waitFor();
  assert.equal(await page.evaluate(() => window.sampleStarts), scheduled * 2);
  await page.waitForFunction(() =>
    document.querySelector('.note-cue[data-on-beat=true]'),
  );
  await page.keyboard.press('g');
  await page.getByText('1 / 15개 성공', { exact: false }).waitFor();
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
    delete document.hidden;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await restart.waitFor();
  assert.equal(await page.locator('.note-cue').count(), 0);
  await restart.click();
  await page.getByText('준비 · 4', { exact: true }).waitFor();
  await page.getByRole('button', { name: '중지', exact: true }).click();
  await start.waitFor();
  assert.equal(await restart.count(), 0);
}

async function verifyTimingReport(browser) {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  await page.goto(new URL('/timing-test', base).href);
  await page.getByLabel('휴대폰 기종').fill('Browser test');
  await page.getByLabel('브라우저와 버전').fill('Chromium test');
  await page.getByLabel('현재 연결한 출력').selectOption('블루투스 이어폰');
  await page.getByRole('button', { name: '측정용 게임 열기' }).tap();
  await page.getByRole('button', { name: '게임 시작' }).tap();
  await page.getByText('준비 · 4', { exact: true }).waitFor();
  await page.getByRole('button', { name: '측정 조건으로 돌아가기' }).tap();
  assert.equal(
    await page.getByRole('heading', { name: /완주 기록/ }).count(),
    0,
  );

  await page.getByRole('button', { name: '측정용 게임 열기' }).tap();
  await page.getByRole('button', { name: '게임 시작' }).tap();
  await page.getByText('준비 · 4', { exact: true }).waitFor();
  // Deliberately rush the full phrase. These synthetic taps test data export only.
  for (const midi of [
    76, 76, 77, 79, 79, 77, 76, 74, 72, 72, 74, 76, 76, 74, 74,
  ]) {
    await page.locator(`[data-pad$="piano${midi}.wav"]`).tap();
  }
  await page.getByRole('heading', { name: '완주 기록 · 1회' }).waitFor();
  await page.getByLabel('연주 체감').fill('automated export check');
  await page.reload();
  await page.getByLabel('연주 체감').waitFor();
  assert.equal(
    await page.getByLabel('연주 체감').inputValue(),
    'automated export check',
  );
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: '결과 JSON 내려받기' }).tap();
  const report = JSON.parse(
    await fs.readFile(await (await downloaded).path(), 'utf8'),
  );
  const [trial] = report.trials;
  assert.equal(report.trials.length, 1);
  assert.equal(trial.output, '블루투스 이어폰');
  assert.equal(trial.device, 'Browser test');
  assert.equal(trial.browser, 'Chromium test');
  assert.equal(trial.feeling, 'automated export check');
  assert.equal(trial.taps.length, 15);
  assert.equal(report.targets.length, 15);
  assert.deepEqual(
    trial.timing.offsetsMs,
    trial.taps.map((tap, i) => tap.ms - report.targets[i].ms),
  );
  assert.ok(trial.timing.median < -150);
  await page.close();
}

async function main() {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    args: ['--no-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      window.sampleStarts = 0;
      const start = AudioBufferSourceNode.prototype.start;
      AudioBufferSourceNode.prototype.start = function (...args) {
        window.sampleStarts++;
        return start.apply(this, args);
      };
    });
    await verifyTimingReport(browser);
    console.log('PASS timing trial capture, reload and report download');
    await verifyPartialAudio(page);
    console.log('PASS partial sample loading, required backing and retry');
    await verifyInterruptions(page);
    console.log(
      'PASS count-in and mid-song interruption, restart and manual stop',
    );
    await verifySettings(page);
    console.log('PASS keyboard shortcuts and native settings controls');
  } finally {
    await browser.close();
  }
}
main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
