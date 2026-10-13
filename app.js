const examTitleInput = document.getElementById("examTitle");
const durationInput = document.getElementById("duration");
const questionFileInput = document.getElementById("questionFile");
const clearQuestionsBtn = document.getElementById("clearQuestionsBtn");
const startExamBtn = document.getElementById("startExamBtn");
const backToSetupBtn = document.getElementById("backToSetupBtn");
const endExamBtn = document.getElementById("endExamBtn");
const submitExamBtn = document.getElementById("submitExamBtn");
const questionCountLabel = document.getElementById("questionCount");
const examPanel = document.getElementById("examPanel");
const setupPanel = document.getElementById("setupPanel");
const resultPanel = document.getElementById("resultPanel");
const examNameLabel = document.getElementById("examName");
const timerLabel = document.getElementById("timer");
const questionsContainer = document.getElementById("questionsContainer");
const resultSummary = document.getElementById("resultSummary");
const resultDetails = document.getElementById("resultDetails");
const currentQuestionNumber = document.getElementById("currentQuestionNumber");
const totalQuestions = document.getElementById("totalQuestions");
const questionStatusText = document.getElementById("questionStatusText");
const answeredCount = document.getElementById("answeredCount");
const totalCount = document.getElementById("totalCount");
const reviewCount = document.getElementById("reviewCount");
const questionPalette = document.getElementById("questionPalette");
const uploadPlaceholder = document.getElementById("uploadPlaceholder");
const uploadMessage = document.getElementById("uploadMessage");
const prevQuestionBtn = document.getElementById("prevQuestionBtn");
const nextQuestionBtn = document.getElementById("nextQuestionBtn");
const toggleReviewBtn = document.getElementById("toggleReviewBtn");
const openQuestionBankBtn = document.getElementById("openQuestionBankBtn");
const questionBankModal = document.getElementById("questionBankModal");
const closeQuestionBankBtn = document.getElementById("closeQuestionBankBtn");
const bankFileInput = document.getElementById("bankFileInput");
const bankReplaceFileInput = document.getElementById("bankReplaceFileInput");
const bankUploadPlaceholder = document.getElementById("bankUploadPlaceholder");
const bankMessage = document.getElementById("bankMessage");
const bankCount = document.getElementById("bankCount");
const questionBankList = document.getElementById("questionBankList");
const bankSelectionHint = document.getElementById("bankSelectionHint");
const applyBankSelectionBtn = document.getElementById("applyBankSelectionBtn");
const appDialog = document.getElementById("appDialog");
const appDialogIcon = document.getElementById("appDialogIcon");
const appDialogTitle = document.getElementById("appDialogTitle");
const appDialogMessage = document.getElementById("appDialogMessage");
const appDialogInputLabel = document.getElementById("appDialogInputLabel");
const appDialogInput = document.getElementById("appDialogInput");
const appDialogCancelBtn = document.getElementById("appDialogCancelBtn");
const appDialogConfirmBtn = document.getElementById("appDialogConfirmBtn");

let questionList = [];
let answers = [];
let markedForReview = [];
let currentQuestionIndex = 0;
let timer = null;
let secondsLeft = 0;
let questionBank = [];
let activeQuestionSetId = null;
let checkedQuestionSetId = null;
let pendingReplaceQuestionSetId = null;
let activeDialogState = null;

const QUESTION_BANK_STORAGE_KEY = "examQuestionBank";
const OPTION_KEYS = ["A", "B", "C", "D", "E"];

function updateQuestionCount() {
  questionCountLabel.textContent = questionList.length;
  document.getElementById("reviewStep").classList.toggle("ready", questionList.length > 0);
  renderLoadedQuestions();
}

function showUploadMessage(message, type = "success") {
  uploadMessage.textContent = message;
  uploadMessage.classList.remove("hidden", "success", "error");
  uploadMessage.classList.add(type);
}

function clearUploadMessage() {
  uploadMessage.textContent = "";
  uploadMessage.className = "upload-message hidden";
}

function showBankMessage(message, type = "success") {
  bankMessage.textContent = message;
  bankMessage.classList.remove("hidden", "success", "error");
  bankMessage.classList.add(type);
}

function clearBankMessage() {
  bankMessage.textContent = "";
  bankMessage.className = "upload-message hidden";
}

function setDialogTone(tone) {
  appDialog.classList.remove("tone-info", "tone-warning", "tone-danger");
  appDialog.classList.add(`tone-${tone}`);
}

function getDialogIcon(mode, tone) {
  if (mode === "prompt") return "A";
  if (tone === "info") return "i";
  if (tone === "danger") return "!";
  return "?";
}

function openAppDialog({
  mode = "confirm",
  title = "Konfirmasi",
  message = "Lanjutkan tindakan ini?",
  confirmText = "Lanjutkan",
  cancelText = "Batal",
  tone = "warning",
  inputLabel = "Nama",
  inputValue = "",
} = {}) {
  return new Promise((resolve) => {
    activeDialogState = {
      mode,
      resolve,
      lastFocusedElement: document.activeElement,
    };

    appDialogTitle.textContent = title;
    appDialogMessage.textContent = message;
    appDialogConfirmBtn.textContent = confirmText;
    appDialogCancelBtn.textContent = cancelText;
    appDialogConfirmBtn.className = tone === "danger" ? "danger" : "primary";
    appDialogCancelBtn.classList.toggle("hidden", mode === "alert");
    appDialogIcon.textContent = getDialogIcon(mode, tone);
    setDialogTone(tone);

    const needsInput = mode === "prompt";
    appDialogInputLabel.textContent = inputLabel;
    appDialogInput.value = inputValue;
    appDialogInputLabel.classList.toggle("hidden", !needsInput);
    appDialogInput.classList.toggle("hidden", !needsInput);

    appDialog.classList.remove("hidden");
    requestAnimationFrame(() => {
      appDialog.classList.add("is-visible");
      if (needsInput) {
        appDialogInput.focus();
        appDialogInput.select();
        return;
      }
      if (mode === "alert") {
        appDialogConfirmBtn.focus();
        return;
      }
      appDialogCancelBtn.focus();
    });
  });
}

function closeAppDialog(value) {
  if (!activeDialogState) return;

  const { resolve, lastFocusedElement } = activeDialogState;
  activeDialogState = null;
  appDialog.classList.remove("is-visible");

  setTimeout(() => {
    appDialog.classList.add("hidden");
    appDialog.classList.remove("tone-info", "tone-warning", "tone-danger");
    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
      lastFocusedElement.focus();
    }
    resolve(value);
  }, 180);
}

function showConfirmDialog(options) {
  return openAppDialog({ mode: "confirm", ...options });
}

function showAlertDialog(options) {
  return openAppDialog({
    mode: "alert",
    title: "Perhatian",
    confirmText: "Mengerti",
    tone: "info",
    ...options,
  });
}

function showPromptDialog(options) {
  return openAppDialog({
    mode: "prompt",
    confirmText: "Simpan",
    ...options,
  });
}

function resetQuestionState() {
  answers = [];
  markedForReview = [];
  currentQuestionIndex = 0;
  questionsContainer.innerHTML = "";
  questionPalette.innerHTML = "";
  currentQuestionNumber.textContent = "0";
  totalQuestions.textContent = "0";
  totalCount.textContent = "0";
  answeredCount.textContent = "0";
  reviewCount.textContent = "0";
  questionStatusText.textContent = "Belum dijawab";
}

function showPanel(panel) {
  setupPanel.classList.add("hidden");
  examPanel.classList.add("hidden");
  resultPanel.classList.add("hidden");
  document.body.classList.toggle("exam-mode", panel === examPanel);
  document.getElementById("setupLayout").classList.toggle("hidden", panel !== setupPanel);
  panel.classList.remove("hidden");
}

function resetSetupForm() {
  // Manual question inputs have been removed; nothing to reset here.
}

function sanitizeText(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function formatAnswerWithOption(answer, options) {
  if (!answer) return "Belum dijawab";

  const optionIndex = answer.charCodeAt(0) - 65;
  const optionText = options[optionIndex];
  if (optionText === undefined) return sanitizeText(answer);

  return `${sanitizeText(answer)}. ${sanitizeText(optionText)}`;
}

function normalizeQuestion(item) {
  if (!item || typeof item !== "object") throw new Error("Data soal tidak valid.");
  const type = String(item.type || "multiple-choice").trim().toLowerCase();
  if (!["multiple-choice", "essay"].includes(type)) throw new Error("Jenis soal harus multiple-choice atau essay.");
  const question = String(item.question || "").trim();
  if (!question) throw new Error("Pertanyaan tidak boleh kosong.");
  const image = String(item.image || "").trim();
  if (image && (!/^data:image\/(png|jpeg|webp|gif);base64,[a-z0-9+/]+={0,2}$/i.test(image) || image.length > 2800000)) {
    throw new Error("Gambar harus data URL PNG/JPEG/WebP/GIF maksimal 2 MB. Gunakan unggah gambar pada input manual.");
  }
  if (type === "essay") return { type, question, image, options: [], answer: String(item.answer || "").trim() };
  const options = item.options;
  const answer = String(item.answer || "").trim().toUpperCase();
  if (!Array.isArray(options) || options.length < 3 || options.length > 5 || options.some(v => typeof v !== "string" || !v.trim())) {
    throw new Error("Pilihan ganda memerlukan 3, 4, atau 5 pilihan terisi (ABC, ABCD, atau ABCDE).");
  }
  if (!OPTION_KEYS.slice(0, options.length).includes(answer)) {
    throw new Error(`Kunci jawaban harus salah satu dari ${OPTION_KEYS.slice(0, options.length).join(", ")}.`);
  }
  return { type, question, image, options: options.map(v => v.trim()), answer };
}

function cloneQuestions(questions) {
  return questions.map(normalizeQuestion);
}

function questionImageHtml(item) {
  return item.image ? `<img class="question-image" src="${item.image}" alt="Gambar pendukung soal" />` : "";
}

function setLoadedQuestions(questions, sourceName, sourceId = null) {
  questionList = cloneQuestions(questions);
  activeQuestionSetId = sourceId;
  resetQuestionState();
  updateQuestionCount();
  uploadPlaceholder.textContent = sourceName || "File soal terpilih";
}

function createQuestionSetId() {
  return `soal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function parseQuestionsFromFile(file, text) {
  if (file.name.toLowerCase().endsWith(".csv")) {
    return parseCsvToQuestions(text);
  }
  return parseJsonToQuestions(text);
}

function readQuestionFile(file, onSuccess, onError) {
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const questions = parseQuestionsFromFile(file, event.target.result);
      onSuccess(questions);
    } catch (error) {
      onError(error);
    }
  };
  reader.onerror = () => {
    onError(new Error("File tidak bisa dibaca."));
  };
  reader.readAsText(file, "UTF-8");
}

function loadQuestionBank() {
  try {
    const stored = JSON.parse(
      localStorage.getItem(QUESTION_BANK_STORAGE_KEY) || "[]",
    );
    questionBank = Array.isArray(stored)
      ? stored.filter(
          (item) =>
            item &&
            item.id &&
            item.name &&
            Array.isArray(item.questions),
        )
      : [];
  } catch (error) {
    questionBank = [];
    showUploadMessage("Data bank soal tidak bisa dibaca, bank soal dikosongkan.", "error");
  }
}

function saveQuestionBank() {
  try {
    localStorage.setItem(QUESTION_BANK_STORAGE_KEY, JSON.stringify(questionBank));
    return true;
  } catch (error) {
    showBankMessage("Bank soal gagal disimpan. Ruang penyimpanan browser mungkin penuh.", "error");
    return false;
  }
}

function formatQuestionSetDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderQuestionBank() {
  bankCount.textContent = `${questionBank.length} file`;
  questionBankList.innerHTML = "";

  if (!questionBank.length) {
    questionBankList.innerHTML = `
      <div class="bank-empty">
        <span class="empty-art" aria-hidden="true"><i data-icon="file"></i></span>
        <strong>Belum ada file soal.</strong>
        <p>Upload file JSON atau CSV dari panel tambah file untuk menyimpannya di bank soal.</p>
      </div>
    `;
    window.renderIcons(questionBankList);
    return;
  }

  questionBank.forEach((item) => {
    const card = document.createElement("article");
    card.className = "bank-item";
    if (item.id === activeQuestionSetId) card.classList.add("active");
    if (item.id === checkedQuestionSetId) card.classList.add("checked");
    const checkboxId = `bankCheck-${sanitizeText(item.id)}`;
    card.innerHTML = `
      <div class="bank-item-top">
        <input type="checkbox" class="bank-check" id="${checkboxId}" data-id="${sanitizeText(item.id)}" ${item.id === checkedQuestionSetId ? "checked" : ""} />
        <label class="bank-item-main" for="${checkboxId}">
          <h4>${sanitizeText(item.name)}</h4>
          <p>${item.questions.length} soal &middot; Update ${formatQuestionSetDate(item.updatedAt)}</p>
        </label>
      </div>
      <div class="bank-item-actions">
        <button type="button" class="secondary small-button" data-action="rename" data-id="${sanitizeText(item.id)}">Ubah Nama</button>
        <button type="button" class="secondary small-button" data-action="replace" data-id="${sanitizeText(item.id)}">Ganti File</button>
        <button type="button" class="danger small-button" data-action="delete" data-id="${sanitizeText(item.id)}">Hapus</button>
      </div>
    `;
    questionBankList.appendChild(card);
  });
  updateBankSelectionControls();
}

function updateBankSelectionControls() {
  const selected = questionBank.find((item) => item.id === checkedQuestionSetId);
  applyBankSelectionBtn.disabled = !selected;
  bankSelectionHint.textContent = selected
    ? `File dicentang: "${selected.name}".`
    : "Centang satu file soal untuk dipilih.";
}

function openQuestionBank() {
  clearBankMessage();
  checkedQuestionSetId = questionBank.some((item) => item.id === activeQuestionSetId)
    ? activeQuestionSetId
    : null;
  renderQuestionBank();
  questionBankModal.classList.remove("hidden");
}

function closeQuestionBank() {
  questionBankModal.classList.add("hidden");
  checkedQuestionSetId = null;
  pendingReplaceQuestionSetId = null;
}

function addQuestionSet(file, questions) {
  const now = new Date().toISOString();
  const questionSet = {
    id: createQuestionSetId(),
    name: file.name,
    questions: cloneQuestions(questions),
    createdAt: now,
    updatedAt: now,
  };

  questionBank.unshift(questionSet);
  if (!saveQuestionBank()) { questionBank.shift(); return false; }
  renderQuestionBank();
  showBankMessage(`File "${file.name}" berhasil ditambahkan ke bank soal.`);
  return true;
}

function replaceQuestionSet(id, file, questions) {
  const questionSet = questionBank.find((item) => item.id === id);
  if (!questionSet) {
    showBankMessage("File soal yang ingin diganti tidak ditemukan.", "error");
    return;
  }

  const previous = { ...questionSet };
  questionSet.name = file.name;
  questionSet.questions = cloneQuestions(questions);
  questionSet.updatedAt = new Date().toISOString();
  if (!saveQuestionBank()) { Object.assign(questionSet, previous); return; }

  if (activeQuestionSetId === id) {
    setLoadedQuestions(questionSet.questions, questionSet.name, questionSet.id);
    stopTimer();
    showPanel(setupPanel);
  }

  renderQuestionBank();
  showBankMessage(`Isi soal berhasil diganti dengan "${file.name}".`);
}

function selectQuestionSet(id) {
  const questionSet = questionBank.find((item) => item.id === id);
  if (!questionSet) {
    showBankMessage("File soal tidak ditemukan.", "error");
    return;
  }

  try { setLoadedQuestions(questionSet.questions, questionSet.name, questionSet.id); }
  catch (error) { showBankMessage(error.message, "error"); return; }
  // Memilih set soal mengakhiri sesi ujian yang berjalan dan wajib kembali ke panel setup
  stopTimer();
  showPanel(setupPanel);
  clearUploadMessage();
  showUploadMessage(`Soal "${questionSet.name}" siap dikerjakan.`, "success");
  renderQuestionBank();
  closeQuestionBank();
}

async function renameQuestionSet(id) {
  const questionSet = questionBank.find((item) => item.id === id);
  if (!questionSet) return;

  const nextName = await showPromptDialog({
    title: "Rename File Soal",
    message: "Masukkan nama baru untuk file soal di bank soal.",
    inputLabel: "Nama file soal",
    inputValue: questionSet.name,
    confirmText: "Simpan",
    tone: "info",
  });

  if (nextName === null) return;

  const trimmedName = nextName.trim();
  if (!trimmedName) {
    showBankMessage("Nama file soal tidak boleh kosong.", "error");
    return;
  }

  const previous = { ...questionSet };
  questionSet.name = trimmedName;
  questionSet.updatedAt = new Date().toISOString();
  if (!saveQuestionBank()) { Object.assign(questionSet, previous); return; }

  if (activeQuestionSetId === id) {
    uploadPlaceholder.textContent = trimmedName;
  }

  renderQuestionBank();
  showBankMessage("Nama file soal berhasil diubah.");
}

async function deleteQuestionSet(id) {
  const questionSet = questionBank.find((item) => item.id === id);
  if (!questionSet) return;

  const shouldDelete = await showConfirmDialog({
    title: "Hapus File Soal?",
    message: `File "${questionSet.name}" akan dihapus dari bank soal.`,
    confirmText: "Hapus",
    cancelText: "Batal",
    tone: "danger",
  });

  if (!shouldDelete) return;

  const previous = questionBank;
  questionBank = questionBank.filter((item) => item.id !== id);
  if (!saveQuestionBank()) { questionBank = previous; return; }
  if (activeQuestionSetId === id) activeQuestionSetId = null;
  if (checkedQuestionSetId === id) checkedQuestionSetId = null;
  renderQuestionBank();
  showBankMessage("File soal berhasil dihapus.");
}

function onQuestionBankAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const id = button.dataset.id;
  const action = button.dataset.action;

  if (action === "rename") renameQuestionSet(id);
  if (action === "delete") deleteQuestionSet(id);
  if (action === "replace") {
    pendingReplaceQuestionSetId = id;
    bankReplaceFileInput.click();
  }
}

function renderCurrentQuestion() {
  questionsContainer.innerHTML = "";

  const item = questionList[currentQuestionIndex];
  const answer = answers[currentQuestionIndex];
  const card = document.createElement("div");
  card.className = "question-card";
  card.innerHTML = `
    <h3>Soal ${currentQuestionIndex + 1}</h3>
    <p class="preserve-lines">${sanitizeText(item.question)}</p>
    ${questionImageHtml(item)}
    ${item.type === "essay" ? `<label for="essayAnswer">Jawaban esai</label><textarea id="essayAnswer" rows="8" placeholder="Tulis jawaban Anda di sini..."></textarea>` : item.options
      .map(
        (option, optionIndex) => `
      <label class="answer-option">
        <input type="radio" name="answer" value="${String.fromCharCode(65 + optionIndex)}" ${answer === String.fromCharCode(65 + optionIndex) ? "checked" : ""} />
        <span><strong>${String.fromCharCode(65 + optionIndex)}</strong><span>${sanitizeText(option)}</span></span>
      </label>`,
      )
      .join("")}
  `;

  questionsContainer.appendChild(card);
  if (item.type === "essay") {
    const input = document.getElementById("essayAnswer");
    input.value = answer || "";
    input.addEventListener("input", () => {
      answers[currentQuestionIndex] = input.value;
      updateExamMeta();
    });
    return;
  }
  const inputs = questionsContainer.querySelectorAll("input[name='answer']");
  inputs.forEach((input) => {
    input.addEventListener("change", () => {
      answers[currentQuestionIndex] = input.value;
      updateExamMeta();
    });
  });
}

function updateExamMeta() {
  currentQuestionNumber.textContent = currentQuestionIndex + 1;
  totalQuestions.textContent = questionList.length;
  totalCount.textContent = questionList.length;
  answeredCount.textContent = answers.filter(value => value && value.trim()).length;
  reviewCount.textContent = markedForReview.filter(Boolean).length;
  const percent = questionList.length ? Math.round(answers.filter(value => value && value.trim()).length / questionList.length * 100) : 0;
  document.getElementById("examProgress").value = percent;
  document.getElementById("progressPercent").textContent = `${percent}%`;
  updateQuestionStatus();
  updateNavigationButtons();
  updateQuestionPalette();
}

function updateQuestionStatus() {
  const answered = Boolean(answers[currentQuestionIndex]?.trim());
  const flagged = markedForReview[currentQuestionIndex];
  const status = answered ? "Terjawab" : "Belum dijawab";
  questionStatusText.classList.toggle("is-answered", answered);
  questionStatusText.classList.toggle("is-review", Boolean(flagged));
  toggleReviewBtn.setAttribute("aria-pressed", String(Boolean(flagged)));
  questionStatusText.textContent = flagged
    ? `${status} - Ditandai untuk review`
    : status;
  toggleReviewBtn.textContent = flagged ? "Hapus Review" : "Tandai Review";
}

function updateQuestionPalette() {
  questionPalette.innerHTML = "";
  let activeButton = null;

  questionList.forEach((_, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "question-nav-button";
    if (answers[index]?.trim()) button.classList.add("answered");
    if (markedForReview[index]) button.classList.add("review");
    if (index === currentQuestionIndex) {
      button.classList.add("active");
      activeButton = button;
    }
    button.textContent = index + 1;
    button.addEventListener("click", () => setCurrentQuestion(index));
    questionPalette.appendChild(button);
  });

  if (activeButton) {
    activeButton.scrollIntoView({ block: "nearest", inline: "nearest" });
  }
}

function setCurrentQuestion(index) {
  if (index < 0 || index >= questionList.length) return;
  currentQuestionIndex = index;
  renderCurrentQuestion();
  updateExamMeta();
}

function updateNavigationButtons() {
  prevQuestionBtn.disabled = currentQuestionIndex === 0;
  nextQuestionBtn.disabled = currentQuestionIndex === questionList.length - 1;
}

function onPrevQuestion() {
  setCurrentQuestion(currentQuestionIndex - 1);
}

function onNextQuestion() {
  setCurrentQuestion(currentQuestionIndex + 1);
}

function toggleReview() {
  markedForReview[currentQuestionIndex] =
    !markedForReview[currentQuestionIndex];
  updateExamMeta();
}

// manual addQuestion removed; use CSV/JSON upload instead

async function onClearQuestions() {
  const shouldClear = await showConfirmDialog({
    title: "Kosongkan Semua Soal?",
    message: "Semua soal yang sedang dimuat akan dihapus dari sesi ini.",
    confirmText: "Kosongkan",
    cancelText: "Batal",
    tone: "danger",
  });

  if (!shouldClear) return;

  questionList = [];
  activeQuestionSetId = null;
  uploadPlaceholder.textContent = "Tidak ada file dipilih";
  resetQuestionState();
  updateQuestionCount();
  clearUploadMessage();
  showUploadMessage("Semua soal berhasil dihapus.", "success");
}

function normalizeHeaderKey(header) {
  return String(header || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function resolveHeaderKey(header) {
  const key = normalizeHeaderKey(header);

  if (/(question|pertanyaan|soal)/.test(key)) return "question";
  if (/(optiona|^a$|opsi1|opsia)/.test(key)) return "A";
  if (/(optionb|^b$|opsi2|opsib)/.test(key)) return "B";
  if (/(optionc|^c$|opsi3|opsic)/.test(key)) return "C";
  if (/(optiond|^d$|opsi4|opsid)/.test(key)) return "D";
  if (/(optione|^e$|opsi5|opsie)/.test(key)) return "E";
  if (/(answer|jawaban|kunci)/.test(key)) return "answer";
  return null;
}

function parseCsvRows(text) {
  const rows = []; let row = []; let cell = ""; let quoted = false;
  const source = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char === '"') {
      if (quoted && source[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (char === "," && !quoted) { row.push(cell.trim()); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && source[i + 1] === "\n") i++;
      row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); row = []; cell = "";
    } else cell += char;
  }
  if (quoted) throw new Error("Tanda kutip CSV tidak ditutup.");
  row.push(cell.trim()); if (row.some(Boolean)) rows.push(row);
  return rows;
}

function parseCsvToQuestions(text) {
  const rows = parseCsvRows(text);
  if (rows.length < 2) throw new Error("CSV harus memuat header dan setidaknya satu soal.");
  const headers = rows.shift().map(header => {
    const key = normalizeHeaderKey(header);
    if (["type", "jenis", "tipe"].includes(key)) return "type";
    if (["image", "gambar"].includes(key)) return "image";
    return resolveHeaderKey(header);
  });
  if (!headers.includes("question")) throw new Error("Header pertanyaan tidak ditemukan.");
  return rows.map((cells, index) => {
    const row = {}; headers.forEach((key, i) => { if (key) row[key] = cells[i] || ""; });
    const options = OPTION_KEYS.map(key => row[key] || "");
    // Only trailing empty columns are optional; gaps must not shift answer letters.
    while (options.length && !options[options.length - 1].trim()) options.pop();
    try { return normalizeQuestion({ ...row, options }); }
    catch (error) { throw new Error(`Soal CSV ${index + 1}: ${error.message}`); }
  });
}

function parseJsonToQuestions(text) {
  const parsed = JSON.parse(text.replace(/^\uFEFF/, ""));
  const items = Array.isArray(parsed) ? parsed : parsed?.questions;
  if (!Array.isArray(items) || !items.length) throw new Error("JSON harus berisi setidaknya satu soal.");
  return cloneQuestions(items);
}

function loadQuestionsFromFile(file) {
  readQuestionFile(
    file,
    (loaded) => {
      setLoadedQuestions(loaded, file.name);
      showUploadMessage("Soal berhasil diganti dari file terbaru.", "success");
    },
    (error) => {
      showUploadMessage("Gagal memuat file: " + error.message, "error");
    },
  );
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function startTimer() {
  timerLabel.textContent = formatTime(secondsLeft);
  const deadline = Date.now() + secondsLeft * 1000;
  timer = setInterval(() => {
    secondsLeft = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    timerLabel.textContent = formatTime(secondsLeft);
    if (secondsLeft <= 0) {
      clearInterval(timer);
      submitExam();
    }
  }, 1000);
}

function stopTimer() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

function initializeExamState() {
  answers = Array(questionList.length).fill(null);
  markedForReview = Array(questionList.length).fill(false);
  currentQuestionIndex = 0;
  updateQuestionCount();
}

async function startExam() {
  if (!questionList.length) {
    await showAlertDialog({
      title: "Soal Belum Ada",
      message: "Tambahkan atau upload setidaknya satu soal untuk memulai ujian.",
      confirmText: "Oke",
      tone: "warning",
    });
    return;
  }

  const title = examTitleInput.value.trim() || "Ujian Simulasi";
  const duration = Number(durationInput.value);

  if (!Number.isFinite(duration) || duration <= 0) {
    await showAlertDialog({
      title: "Durasi Tidak Valid",
      message: "Masukkan durasi ujian dalam menit dengan nilai lebih dari 0.",
      confirmText: "Oke",
      tone: "warning",
    });
    return;
  }

  examNameLabel.textContent = title;
  secondsLeft = duration * 60;
  initializeExamState();
  renderCurrentQuestion();
  updateExamMeta();
  showPanel(examPanel);
  startTimer();
}

let essayGrades = [];
function updateResultSummary() {
  const correct = questionList.reduce((n, item, i) => n + (item.type !== "essay" && answers[i] === item.answer ? 1 : 0), 0);
  const essays = questionList.map((item, i) => item.type === "essay" ? i : -1).filter(i => i >= 0);
  const pending = essays.filter(i => essayGrades[i] === null).length;
  const points = correct + essays.reduce((n, i) => n + (essayGrades[i] || 0) / 100, 0);
  resultSummary.innerHTML = `<p>Pilihan ganda benar: ${correct} dari ${questionList.length - essays.length}.</p>` +
    (pending ? `<p role="status">Menunggu penilaian ${pending} esai. Nilai akhir belum tersedia.</p>` :
    `<span class="result-badge"><strong>Nilai akhir:</strong> ${Math.round(points / questionList.length * 100)} %</span>`) +
    (essays.length ? '<p>Setiap soal berbobot sama. Nilai esai diisi penilai dari 0 sampai 100.</p>' : "");
}

function submitExam() {
  if (activeDialogState) closeAppDialog(false);
  stopTimer();
  essayGrades = questionList.map(() => null);
  resultDetails.innerHTML = questionList.map((item, index) => {
    const selected = answers[index];
    const essay = item.type === "essay";
    const content = essay
      ? `<p><strong>Jawaban Anda:</strong></p><p class="preserve-lines">${sanitizeText(selected?.trim() || "Belum dijawab")}</p>
         <p><strong>Jawaban acuan:</strong></p><p class="preserve-lines">${sanitizeText(item.answer || "Tidak disediakan")}</p>
         <label for="essayGrade${index}">Nilai esai (0-100)</label><input id="essayGrade${index}" data-grade="${index}" type="number" min="0" max="100" step="any" placeholder="Belum dinilai" /><small class="grade-error" aria-live="polite"></small>`
      : `<p><strong>Jawaban Anda:</strong> <span class="${selected === item.answer ? "correct" : "wrong"}">${formatAnswerWithOption(selected, item.options)}</span></p><p><strong>Jawaban benar:</strong> ${formatAnswerWithOption(item.answer, item.options)}</p>`;
    return `<div class="result-row"><h3>Soal ${index + 1} - ${essay ? "Esai" : "Pilihan ganda"}</h3><p class="preserve-lines">${sanitizeText(item.question)}</p>${questionImageHtml(item)}${content}</div>`;
  }).join("");
  resultDetails.querySelectorAll("[data-grade]").forEach(input => {
    input.addEventListener("input", () => {
      const value = Number(input.value);
      const valid = input.value !== "" && Number.isFinite(value) && value >= 0 && value <= 100;
      essayGrades[Number(input.dataset.grade)] = valid ? value : null;
      input.nextElementSibling.textContent = !valid && (input.value !== "" || input.validity.badInput) ? "Masukkan nilai 0-100." : "";
      updateResultSummary();
    });
  });
  updateResultSummary();
  showPanel(resultPanel);
}

async function confirmSubmitExam() {
  const unansweredCount = questionList.length - answers.filter(value => value && value.trim()).length;
  const shouldSubmit = await showConfirmDialog({
    title: "Kirim Jawaban?",
    message: unansweredCount
      ? `Masih ada ${unansweredCount} soal belum dijawab. Kirim jawaban sekarang?`
      : "Jawaban akan dikunci dan hasil ujian langsung ditampilkan.",
    confirmText: "Kirim",
    cancelText: "Cek Lagi",
    tone: unansweredCount ? "warning" : "info",
  });

  if (shouldSubmit) submitExam();
}

questionFileInput.addEventListener("change", (event) => {
  clearUploadMessage();
  const file = event.target.files[0];
  if (!file) {
    uploadPlaceholder.textContent = "Tidak ada file dipilih";
    return;
  }
  uploadPlaceholder.textContent = file.name;
  loadQuestionsFromFile(file);
  questionFileInput.value = "";
});

bankFileInput.addEventListener("change", (event) => {
  clearBankMessage();
  const file = event.target.files[0];
  if (!file) {
    bankUploadPlaceholder.textContent = "Pilih file JSON atau CSV";
    return;
  }

  bankUploadPlaceholder.textContent = file.name;
  readQuestionFile(
    file,
    (loaded) => {
      addQuestionSet(file, loaded);
      bankFileInput.value = "";
    },
    (error) => {
      showBankMessage("Gagal menambahkan file: " + error.message, "error");
      bankFileInput.value = "";
    },
  );
});

bankReplaceFileInput.addEventListener("change", (event) => {
  clearBankMessage();
  const file = event.target.files[0];
  if (!file || !pendingReplaceQuestionSetId) {
    pendingReplaceQuestionSetId = null;
    bankReplaceFileInput.value = "";
    return;
  }

  readQuestionFile(
    file,
    (loaded) => {
      replaceQuestionSet(pendingReplaceQuestionSetId, file, loaded);
      pendingReplaceQuestionSetId = null;
      bankReplaceFileInput.value = "";
    },
    (error) => {
      showBankMessage("Gagal mengganti file: " + error.message, "error");
      pendingReplaceQuestionSetId = null;
      bankReplaceFileInput.value = "";
    },
  );
});

// manual add button removed
openQuestionBankBtn.addEventListener("click", openQuestionBank);
closeQuestionBankBtn.addEventListener("click", closeQuestionBank);
questionBankList.addEventListener("click", onQuestionBankAction);
questionBankList.addEventListener("change", (event) => {
  const checkbox = event.target.closest("input.bank-check");
  if (!checkbox) return;
  checkedQuestionSetId = checkbox.checked ? checkbox.dataset.id : null;
  questionBankList.querySelectorAll(".bank-item").forEach((card) => {
    const input = card.querySelector(".bank-check");
    if (input !== checkbox) input.checked = false;
    card.classList.toggle("checked", input.checked);
  });
  updateBankSelectionControls();
});
applyBankSelectionBtn.addEventListener("click", () => {
  if (checkedQuestionSetId) selectQuestionSet(checkedQuestionSetId);
});
clearQuestionsBtn.addEventListener("click", onClearQuestions);
startExamBtn.addEventListener("click", startExam);
submitExamBtn.addEventListener("click", confirmSubmitExam);
prevQuestionBtn.addEventListener("click", onPrevQuestion);
nextQuestionBtn.addEventListener("click", onNextQuestion);
toggleReviewBtn.addEventListener("click", toggleReview);
backToSetupBtn.addEventListener("click", () => {
  stopTimer();
  showPanel(setupPanel);
});
endExamBtn.addEventListener("click", async () => {
  const shouldEnd = await showConfirmDialog({
    title: "Akhiri Ujian?",
    message: "Progress jawaban saat ini akan ditinggalkan dan Anda kembali ke pengaturan.",
    confirmText: "Akhiri",
    cancelText: "Lanjut Ujian",
    tone: "danger",
  });

  if (!shouldEnd) return;
  stopTimer();
  showPanel(setupPanel);
});
questionBankModal.addEventListener("click", (event) => {
  if (event.target === questionBankModal) closeQuestionBank();
});
appDialogConfirmBtn.addEventListener("click", () => {
  if (!activeDialogState) return;
  closeAppDialog(
    activeDialogState.mode === "prompt" ? appDialogInput.value : true,
  );
});
appDialogCancelBtn.addEventListener("click", () => {
  if (!activeDialogState) return;
  closeAppDialog(activeDialogState.mode === "prompt" ? null : false);
});
appDialog.addEventListener("click", (event) => {
  if (event.target !== appDialog || !activeDialogState) return;
  closeAppDialog(activeDialogState.mode === "prompt" ? null : false);
});
document.addEventListener("keydown", (event) => {
  if (activeDialogState) {
    if (event.key === "Escape") {
      closeAppDialog(activeDialogState.mode === "prompt" ? null : false);
    }
    if (
      event.key === "Enter" &&
      activeDialogState.mode === "prompt" &&
      document.activeElement === appDialogInput
    ) {
      closeAppDialog(appDialogInput.value);
    }
    return;
  }

  if (event.key === "Escape" && !questionBankModal.classList.contains("hidden")) {
    closeQuestionBank();
  }
});

let manualImage = "";
let imageReadVersion = 0;
let imageLoading = false;
const editorForm = document.getElementById("questionEditorForm");
const imageInput = document.getElementById("questionImageInput");
const imagePreview = document.getElementById("questionImagePreview");
const questionType = document.getElementById("questionType");
const choiceCount = document.getElementById("choiceCount");
function editorMessage(message, error = false) {
  const element = document.getElementById("editorMessage");
  element.textContent = message;
  element.className = `upload-message ${error ? "error" : "success"}`;
}
function clearManualImage() {
  imageReadVersion++;
  imageLoading = false;
  manualImage = "";
  imageInput.value = "";
  imagePreview.removeAttribute("src");
  imagePreview.classList.add("hidden");
  document.getElementById("addManualQuestion").disabled = false;
}
function updateChoiceEditor() {
  const essay = questionType.value === "essay";
  const count = Number(choiceCount.value);
  document.getElementById("choiceCountField").classList.toggle("hidden", essay);
  choiceCount.disabled = essay;
  document.getElementById("manualChoices").classList.toggle("hidden", essay);
  document.getElementById("manualEssay").classList.toggle("hidden", !essay);
  OPTION_KEYS.forEach((key, index) => {
    const input = document.getElementById(`manualOption${key}`);
    input.closest(".field").classList.toggle("hidden", index >= count);
    input.disabled = essay || index >= count;
    input.required = !input.disabled;
  });
  const answerSelect = document.getElementById("manualAnswer");
  const previousAnswer = answerSelect.value;
  const keys = OPTION_KEYS.slice(0, count);
  answerSelect.replaceChildren(...keys.map(key => new Option(key, key)));
  answerSelect.value = keys.includes(previousAnswer) ? previousAnswer : "A";
  answerSelect.disabled = essay;
}
questionType.addEventListener("change", updateChoiceEditor);
choiceCount.addEventListener("change", updateChoiceEditor);
updateChoiceEditor();
imageInput.addEventListener("change", async () => {
  const file = imageInput.files[0];
  clearManualImage();
  if (!file) return;
  if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type) || file.size > 2 * 1024 * 1024) {
    editorMessage("Pilih PNG/JPEG/WebP/GIF maksimal 2 MB.", true); return;
  }
  const version = imageReadVersion;
  imageLoading = true;
  document.getElementById("addManualQuestion").disabled = true;
  try {
    const data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Gambar tidak bisa dibaca."));
      reader.readAsDataURL(file);
    });
    const decoded = new Image(); decoded.src = data;
    await decoded.decode();
    if (version !== imageReadVersion) return;
    manualImage = data;
    imagePreview.src = data;
    imagePreview.classList.remove("hidden");
    editorMessage(`Gambar ${file.name} siap ditambahkan.`);
  } catch (error) {
    if (version === imageReadVersion) editorMessage("Gambar gagal dibaca atau rusak.", true);
  } finally {
    if (version === imageReadVersion) {
      imageLoading = false;
      document.getElementById("addManualQuestion").disabled = false;
    }
  }
});
document.getElementById("removeQuestionImage").addEventListener("click", clearManualImage);
editorForm.addEventListener("submit", event => {
  event.preventDefault();
  if (imageLoading) return;
  try {
    const item = normalizeQuestion({
      type: questionType.value,
      question: document.getElementById("manualQuestion").value,
      options: OPTION_KEYS.slice(0, Number(choiceCount.value)).map(key => document.getElementById(`manualOption${key}`).value),
      answer: document.getElementById(questionType.value === "essay" ? "manualReference" : "manualAnswer").value,
      image: manualImage,
    });
    questionList.push(item);
    activeQuestionSetId = null;
    resetQuestionState();
    updateQuestionCount();
    uploadPlaceholder.textContent = "Kumpulan soal yang sedang disusun";
    editorForm.reset();
    questionType.dispatchEvent(new Event("change"));
    clearManualImage();
    editorMessage(`Soal ${questionList.length} berhasil ditambahkan. Simpan ke bank soal atau unduh JSON untuk menyimpannya.`);
  } catch (error) { editorMessage(error.message, true); }
});
function renderLoadedQuestions() {
  const list = document.getElementById("loadedQuestionList");
  list.innerHTML = "";
  questionList.forEach((item, index) => {
    const row = document.createElement("div"); row.className = "loaded-question-row";
    const text = document.createElement("span");
    text.textContent = `${index + 1}. [${item.type === "essay" ? "Esai" : `PG ${OPTION_KEYS.slice(0, item.options.length).join("")}`}${item.image ? " - Gambar" : ""}] ${item.question}`;
    const button = document.createElement("button");
    button.type = "button"; button.className = "danger small-button"; button.textContent = "Hapus";
    button.setAttribute("aria-label", `Hapus soal ${index + 1}`);
    button.addEventListener("click", async () => {
      if (!await showConfirmDialog({ title: "Hapus soal?", message: `Hapus soal ${index + 1} dari kumpulan saat ini?`, confirmText: "Hapus", tone: "danger" })) return;
      questionList.splice(index, 1); activeQuestionSetId = null; resetQuestionState(); updateQuestionCount();
    });
    row.append(text, button); list.appendChild(row);
  });
}
document.getElementById("saveCurrentQuestions").addEventListener("click", async () => {
  if (!questionList.length) { showUploadMessage("Tambahkan soal terlebih dahulu.", "error"); return; }
  const name = await showPromptDialog({ title: "Simpan kumpulan soal", inputValue: examTitleInput.value.trim() || "Kumpulan soal", inputLabel: "Nama kumpulan", tone: "info" });
  if (name === null) return;
  if (!name.trim()) { showUploadMessage("Nama kumpulan tidak boleh kosong.", "error"); return; }
  if (addQuestionSet({ name: name.trim() }, questionList)) {
    activeQuestionSetId = questionBank[0].id;
    showUploadMessage("Kumpulan soal berhasil disimpan ke bank soal.");
  } else showUploadMessage("Bank soal gagal disimpan. Unduh JSON sebagai salinan atau kosongkan sebagian bank soal.", "error");
});
document.getElementById("exportQuestions").addEventListener("click", () => {
  if (!questionList.length) { showUploadMessage("Tambahkan soal terlebih dahulu.", "error"); return; }
  const blob = new Blob([JSON.stringify(questionList, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a"); link.href = url; link.download = "soal-ujian.json";
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

loadQuestionBank();
renderQuestionBank();
updateQuestionCount();
