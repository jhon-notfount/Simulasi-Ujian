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

    for (const filename of ['sample-soal-variasi.json', 'sample-soal-variasi.csv']) {
      await page.setInputFiles('#questionFile', path.join(__dirname, filename));
      await page.waitForFunction(name => document.getElementById('uploadPlaceholder').textContent === name, filename);
      assert.deepEqual(await page.evaluate(() => questionList.map(q => q.options.length)), [3, 4, 5]);
      assert.deepEqual(await page.evaluate(() => questionList.map(q => q.answer)), ['C', 'D', 'E']);
    }
    const validation = await page.evaluate(() => {
      const rejects = fn => { try { fn(); return false; } catch { return true; } };
      const base = { question: 'Soal', options: ['a', 'b', 'c'], answer: 'C' };
      const invalid = [
        { ...base, options: ['a', 'b'] },
        { ...base, options: ['a', 'b', 'c', 'd', 'e', 'f'] },
        { ...base, options: ['a', '', 'c'] },
        { ...base, options: ['a', 'b', 3] },
        { ...base, answer: 'D' },
        { ...base, options: ['a', 'b', 'c', 'd'], answer: 'E' },
        { ...base, options: ['a', 'b', 'c', 'd', 'e'], answer: 'F' },
        { ...base, answer: '' },
      ];
      return {
        invalid: invalid.map(item => rejects(() => parseJsonToQuestions(JSON.stringify([item])))),
        gap: rejects(() => parseCsvToQuestions('question,A,B,C,D,E,answer\nSoal,a,b,c,,e,E')),
        key: rejects(() => parseCsvToQuestions('question,A,B,C,answer\nSoal,a,b,c,E')),
        short: parseCsvToQuestions('question,A,B,C,answer\nSoal,a,b,c,c')[0],
        alias: parseCsvToQuestions('soal,opsi1,opsi2,opsi3,opsi4,opsi5,kunci\nSoal,a,b,c,d,e,e')[0],
        wrapper: parseJsonToQuestions(JSON.stringify({ questions: [{ ...base, answer: ' c ' }] }))[0].answer,
      };
    });
    assert.ok(validation.invalid.every(Boolean));
    assert.equal(validation.gap, true);
    assert.equal(validation.key, true);
    assert.equal(validation.short.options.length, 3);
    assert.equal(validation.short.answer, 'C');
    assert.equal(validation.alias.answer, 'E');
    assert.equal(validation.wrapper, 'C');

    // A bad upload must leave the previously loaded questions intact.
    await page.setInputFiles('#questionFile', {
      name: 'invalid.json', mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify([{ question: 'Invalid', options: ['a', 'b', 'c'], answer: 'E' }])),
    });
    await page.waitForFunction(() => document.getElementById('uploadMessage').classList.contains('error'));
    assert.deepEqual(await page.evaluate(() => questionList.map(q => q.options.length)), [3, 4, 5]);

    await page.evaluate(() => setLoadedQuestions([], 'Manual'));
    await page.click('.question-editor summary');
    await page.selectOption('#choiceCount', '5');
    await page.selectOption('#manualAnswer', 'E');
    await page.fill('#manualOptionE', 'Draft E');
    await page.selectOption('#choiceCount', '3');
    assert.equal(await page.inputValue('#manualAnswer'), 'A');
    assert.equal(await page.locator('#manualOptionD').isVisible(), false);
    assert.equal(await page.locator('#manualOptionE').isDisabled(), true);
    await page.selectOption('#questionType', 'essay');
    assert.equal(await page.locator('#choiceCount').isVisible(), false);
    assert.equal(await page.locator('#manualOptionA').isDisabled(), true);
    await page.selectOption('#questionType', 'multiple-choice');

    for (const count of [3, 4, 5]) {
      await page.selectOption('#choiceCount', String(count));
      const keys = 'ABCDE'.slice(0, count).split('');
      assert.deepEqual(await page.locator('#manualAnswer option').allTextContents(), keys);
      await page.fill('#manualQuestion', `Soal ${keys.join('')}`);
      for (const key of keys) await page.fill(`#manualOption${key}`, `Pilihan ${key}`);
      await page.selectOption('#manualAnswer', keys.at(-1));
      await page.click('#addManualQuestion');
      assert.equal(await page.textContent('#questionCount'), String(count - 2));
      assert.equal(await page.inputValue('#choiceCount'), '4');
      assert.deepEqual(await page.locator('#manualAnswer option').allTextContents(), ['A', 'B', 'C', 'D']);
    }
    assert.deepEqual(await page.evaluate(() => questionList.map(q => q.options.length)), [3, 4, 5]);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.selectOption('#choiceCount', '5');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);

    await page.click('#saveCurrentQuestions');
    await page.fill('#appDialogInput', 'ABC ABCD ABCDE');
    await page.click('#appDialogConfirmBtn');
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('examQuestionBank') || '[]').length === 1);
    const downloading = page.waitForEvent('download');
    await page.click('#exportQuestions');
    const download = await downloading;
    const exported = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
    assert.deepEqual(exported.map(q => q.options.length), [3, 4, 5]);
    assert.deepEqual(exported.map(q => q.answer), ['C', 'D', 'E']);
    await page.reload();
    await page.click('#openQuestionBankBtn');
    await page.click('[data-action="select"]');
    await page.click('#startExamBtn');
    for (const [index, count] of [3, 4, 5].entries()) {
      assert.deepEqual(await page.locator('input[name="answer"]').evaluateAll(inputs => inputs.map(input => input.value)), 'ABCDE'.slice(0, count).split(''));
      await page.check(`input[name="answer"][value="${'ABCDE'[count - 1]}"]`);
      if (index < 2) await page.click('#nextQuestionBtn');
    }
    await page.click('#prevQuestionBtn');
    assert.equal(await page.locator('input[value="D"]').isChecked(), true);
    await page.click('#nextQuestionBtn');
    assert.equal(await page.locator('input[value="E"]').isChecked(), true);
    assert.equal(await page.textContent('#answeredCount'), '3');
    await page.click('#submitExamBtn');
    await page.click('#appDialogConfirmBtn');
    await page.waitForFunction(() => !document.getElementById('resultPanel').classList.contains('hidden'));
    assert.match(await page.textContent('#resultSummary'), /100 %/);
    assert.match(await page.textContent('#resultDetails'), /E\. Pilihan E/);

    await page.click('#backToSetupBtn');
    await page.click('#startExamBtn');
    await page.check('input[value="A"]');
    await page.click('#nextQuestionBtn');
    await page.click('#nextQuestionBtn');
    await page.check('input[value="E"]');
    await page.evaluate(() => submitExam());
    assert.match(await page.textContent('#resultSummary'), /33 %/);
    assert.match(await page.textContent('#resultDetails'), /Belum dijawab/);
    assert.deepEqual(errors, []);
    console.log('PASS: ABC/ABCD/ABCDE imports, invalid choices/keys, manual selection/reset, mobile layout, bank persistence, export, navigation, correct/wrong/unanswered scoring.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
