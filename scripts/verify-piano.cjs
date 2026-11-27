// Run with Playwright available, against a running local production build.
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const base = process.argv[2] || 'http://127.0.0.1:3000';

async function verifySettings(page) {
  await page.goto(base);
  await page.locator('[data-pad]:enabled').first().click();
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
