// Run with Playwright available: node test-browser.cjs
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const fs = require('node:fs');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(pathToFileURL(path.join(__dirname, 'index.html')).href);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=';
    const image = 'data:image/png;base64,' + png;
    for (const filename of ['sample-soal.csv', 'sample-soal.json']) {
      await page.setInputFiles('#questionFile', path.join(__dirname, filename));
      await page.waitForFunction(() => document.getElementById('questionCount').textContent === '3');
    }
    await page.setInputFiles('#questionFile', path.join(__dirname, 'sample-soal-campuran.json'));
    await page.waitForFunction(() => document.getElementById('questionCount').textContent === '2');
    await page.click('.question-editor summary');
    await page.selectOption('#questionType', 'essay');
    await page.fill('#manualQuestion', 'Jelaskan gambar berikut.');
    await page.fill('#manualReference', 'Jawaban acuan rahasia');
    await page.setInputFiles('#questionImageInput', { name: 'soal.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
    await page.waitForFunction(() => !document.getElementById('questionImagePreview').classList.contains('hidden'));
    await page.click('#addManualQuestion');
    assert.equal(await page.textContent('#questionCount'), '3');
    await page.click('#saveCurrentQuestions');
    await page.fill('#appDialogInput', 'Soal campuran');
    await page.click('#appDialogConfirmBtn');
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('examQuestionBank') || '[]').length === 1);
    const downloadEvent = page.waitForEvent('download');
    await page.click('#exportQuestions');
    const download = await downloadEvent;
    const exported = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
    assert.equal(exported[2].image, image);
    await page.reload();
    await page.click('#openQuestionBankBtn');
    await page.check('#questionBankList article:nth-child(1) .bank-check');
    await page.click('#applyBankSelectionBtn');
    await page.click('#startExamBtn');
    await page.check('input[name="answer"][value="B"]');
    await page.click('#nextQuestionBtn');
    await page.fill('#essayAnswer', 'Air berubah menjadi gas.\nContoh: menjemur pakaian.');
    await page.click('#nextQuestionBtn');
    assert.equal(await page.locator('#questionsContainer img').getAttribute('src'), image);
    assert.equal(await page.locator('#questionsContainer').innerText().then(t => t.includes('Jawaban acuan rahasia')), false);
    await page.fill('#essayAnswer', 'Jawaban bergambar');
    await page.click('#prevQuestionBtn');
    assert.match(await page.inputValue('#essayAnswer'), /menjemur pakaian/);
    assert.match(await page.textContent('#answeredCount'), /3/);
    await page.click('#submitExamBtn');
    await page.click('#appDialogConfirmBtn');
    await page.waitForFunction(() => !document.getElementById('resultPanel').classList.contains('hidden'));
    assert.match(await page.textContent('#resultSummary'), /Menunggu penilaian 2/);
    await page.fill('#essayGrade1', '80');
    await page.fill('#essayGrade2', '50');
    assert.match(await page.textContent('#resultSummary'), /77 %/);
    await page.fill('#essayGrade2', '101');
    assert.match(await page.textContent('#resultSummary'), /Menunggu penilaian 1/);
    await page.fill('#essayGrade2', '0');
    assert.match(await page.textContent('#resultSummary'), /60 %/);
    const parsing = await page.evaluate(() => {
      const csv = 'question,type,answer\n"Baris 1\nBaris 2 ""kutipan""",essay,acuan';
      const parsed = parseCsvToQuestions(csv);
      let unsafeRejected = false;
      try { normalizeQuestion({ type: 'essay', question: 'x', image: 'javascript:alert(1)' }); } catch { unsafeRejected = true; }
      return { question: parsed[0].question, unsafeRejected };
    });
    assert.equal(parsing.question, 'Baris 1\nBaris 2 "kutipan"');
    assert.equal(parsing.unsafeRejected, true);
    await page.click('#backToSetupBtn');
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.evaluate(items => {
      const parsed = parseJsonToQuestions(JSON.stringify(items));
      if (parsed[2].image !== items[2].image) throw new Error('Image lost during JSON round trip');
      setLoadedQuestions([parsed[0]], 'PG only');
    }, exported);
    await page.click('#startExamBtn');
    await page.check('input[name="answer"][value="B"]');
    await page.evaluate(() => submitExam());
    assert.match(await page.textContent('#resultSummary'), /100 %/);
    await page.click('#backToSetupBtn');
    await page.evaluate(() => {
      setLoadedQuestions([{ type: 'essay', question: 'Esai tunggal' }], 'Essay only');
    });
    await page.click('#startExamBtn');
    await page.fill('#essayAnswer', '   ');
    assert.equal(await page.textContent('#answeredCount'), '0');
    await page.evaluate(() => { stopTimer(); secondsLeft = 1; startTimer(); });
    await page.waitForFunction(() => !document.getElementById('resultPanel').classList.contains('hidden'));
    assert.match(await page.textContent('#resultDetails'), /Belum dijawab/);
    await page.fill('#essayGrade0', '0');
    assert.match(await page.textContent('#resultSummary'), /0 %/);
    await page.click('#backToSetupBtn');
    await page.click('.question-editor summary');
    await page.setInputFiles('#questionImageInput', { name: 'bad.png', mimeType: 'image/png', buffer: Buffer.from('invalid image') });
    await page.waitForFunction(() => document.getElementById('editorMessage').textContent.includes('rusak'));
    assert.equal(await page.locator('#questionImagePreview').isVisible(), false);
    await page.evaluate(() => {
      Storage.prototype.setItem = () => { throw new Error('quota'); };
      if (addQuestionSet({ name: 'Fail' }, questionList) !== false) throw new Error('Save failure not reported');
      if (questionBank.length !== 1) throw new Error('Failed save was not rolled back');
    });
    assert.deepEqual(errors, []);
    console.log('PASS: legacy imports, image authoring, bank persistence, JSON round trip, essay navigation, mixed/PG/essay scoring, automatic submission, blank essays, CSV quoting, unsafe/corrupt image rejection, mobile layout, storage failure.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
