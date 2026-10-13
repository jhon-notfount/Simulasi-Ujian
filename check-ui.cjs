const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    await page.goto(pathToFileURL(path.join(__dirname, 'index.html')).href);
    assert.ok(await page.locator('.brand svg').count());
    await page.screenshot({ path: 'preview-setup.png', fullPage: true });
    await page.click('#navBank');
    assert.equal(await page.locator('.empty-art svg').count(), 1);
    await page.screenshot({ path: 'preview-bank.png' });
    await page.click('#closeQuestionBankBtn');
    await page.click('#navGuide');
    assert.equal(await page.locator('#guideDialog').isVisible(), true);
    await page.click('#closeGuideBtn');
    await page.setInputFiles('#questionFile', path.join(__dirname, 'sample-soal.json'));
    await page.waitForFunction(() => document.getElementById('questionCount').textContent === '3');
    await page.click('#startExamBtn');
    assert.equal(await page.locator('#setupLayout').isVisible(), false);
    await page.check('input[name="answer"][value="B"]');
    assert.equal(await page.textContent('#progressPercent'), '33%');
    await page.click('#toggleReviewBtn');
    assert.equal(await page.getAttribute('#toggleReviewBtn', 'aria-pressed'), 'true');
    await page.screenshot({ path: 'preview-exam.png', fullPage: true });
    for (const width of [390, 768]) {
      await page.setViewportSize({ width, height: 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    }
    console.log('PASS: icons, navigation, guide, exam layout, progress, review state, responsive exam.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
