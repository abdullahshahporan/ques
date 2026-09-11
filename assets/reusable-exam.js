(() => {
  'use strict';

  const config = {
    id: 'mcq-exam',
    headerEyebrow: 'Combined MCQ Exam',
    headerTitle: 'MCQ Examination',
    brandMark: '∑',
    durationMinutes: 27,
    loaderMilliseconds: 3000,
    positiveMark: 1,
    negativeMark: 0.25,
    enablePdf: true,
    pdfFilename: 'MCQ_Exam_Result.pdf',
    pdfFooter: 'MCQ Exam Result',
    ...window.EXAM_CONFIG
  };

  const optionLetters = ['ক', 'খ', 'গ', 'ঘ'];
  Object.entries(window.EXAM_QUESTION_DATA || {}).forEach(([targetId, questions]) => {
    const target = document.getElementById(targetId);
    if (!target || !Array.isArray(questions)) return;
    target.innerHTML = questions.map(([question, options, answer], index) => `
      <article class="question-card" data-correct="${answer}">
        <div class="question-head"><span class="q-number">${(index + 1).toLocaleString('bn-BD')}</span><div class="question-text">${question}</div><span class="status-pill"></span></div>
        <div class="options">${options.map((option, optionIndex) => `<button class="option" type="button"><span class="letter">${optionLetters[optionIndex]}</span><span>${option}</span></button>`).join('')}</div>
        <p class="feedback"></p>
      </article>`).join('');
  });

  const main = document.getElementById('examContent');
  if (!main) return;

  const sections = [...main.querySelectorAll('.exam-section')];
  const cards = [...main.querySelectorAll('.question-card')];
  const totalQuestions = cards.length;
  const STORAGE_KEY = `reusable_exam_${config.id}`;
  const EXAM_DURATION = config.durationMinutes * 60 * 1000;

  const bn = value => Number(value).toLocaleString('bn-BD', {
    maximumFractionDigits: 2,
    minimumFractionDigits: Number(value) % 1 ? 2 : 0
  });
  const bnScore = value => Number(value).toLocaleString('bn-BD', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  const toBnDigits = value => String(value).replace(/\d/g, digit => '০১২৩৪৫৬৭৮৯'[digit]);

  function sectionIntro(section) {
    const paper = section.dataset.paper || 'MCQ Exam';
    const chapter = section.dataset.chapter || '';
    const count = section.querySelectorAll('.question-card').length;
    return `
      <section class="intro" aria-label="${paper}: ${chapter}">
        <div>
          <span class="chapter-tag">অধ্যায়ভিত্তিক পরীক্ষা</span>
          <h2>${paper}: ${chapter}</h2>
          <p>প্রতিটি প্রশ্নের মান ${bn(config.positiveMark)} · মোট প্রশ্ন ${bn(count)}টি</p>
        </div>
        <div class="mark-card" aria-label="মোট নম্বর ${bn(count)}">
          <strong>${bn(count)}</strong><span>মোট নম্বর</span>
        </div>
      </section>`;
  }

  function buildShell() {
    sections.forEach(section => section.insertAdjacentHTML('afterbegin', sectionIntro(section)));

    const firstIntro = sections[0]?.querySelector('.intro');
    firstIntro?.insertAdjacentHTML('afterend', `
      <ul class="rules" aria-label="পরীক্ষার নিয়ম">
        <li>সময় ${bn(config.durationMinutes)} মিনিট · মোট প্রশ্ন ${bn(totalQuestions)}টি</li>
        <li>একবার বাছাই করলে অপশন লক হবে</li>
        <li>অনুত্তরিত প্রশ্নে ০</li>
        <li class="negative">ভুল বা দ্বৈত উত্তরে −${bn(config.negativeMark)}</li>
      </ul>
      <section class="result-panel" aria-live="polite" tabindex="-1">
        <div class="result-heading">
          <div class="result-icon" aria-hidden="true">✓</div>
          <div><h2>সম্মিলিত চূড়ান্ত ফলাফল</h2><p>সব অংশের মোট ${bn(totalQuestions)}টি প্রশ্ন একসঙ্গে হিসাব করা হয়েছে</p></div>
        </div>
        <div class="scoreline"><strong data-stat="score">০.০০</strong><span>/ ${bn(totalQuestions)}</span></div>
        <div class="stats">
          <div class="stat"><b data-stat="correct">০</b><small>সঠিক</small></div>
          <div class="stat"><b data-stat="wrong">০</b><small>ভুল</small></div>
          <div class="stat"><b data-stat="double">০</b><small>দ্বৈত উত্তর</small></div>
          <div class="stat"><b data-stat="empty">০</b><small>অনুত্তরিত</small></div>
        </div>
        ${config.enablePdf ? `<div class="pdf-download" data-html2canvas-ignore="true">
          <span id="pdfStatus">PDF ফলাফল তৈরি হচ্ছে...</span>
          <button type="button" id="pdfDownloadBtn" disabled>PDF ডাউনলোড</button>
        </div>` : ''}
      </section>`);

    document.body.insertAdjacentHTML('afterbegin', `
      <div class="loader-screen" id="loaderScreen" role="dialog" aria-modal="true" aria-live="polite" aria-labelledby="loaderTitle">
        <div class="loader-content">
          <div class="panda-orbit" aria-hidden="true"><span class="panda">🐼</span></div>
          <h2 id="loaderTitle">পরীক্ষা শুরু করতে প্রস্তুত?</h2>
          <p id="loaderText">মোট ${bn(totalQuestions)}টি প্রশ্ন</p>
          <div class="start-notice" id="startNotice">সময় ${bn(config.durationMinutes)} মিনিট। একবার পরীক্ষা শুরু করার পর পেজ reload করলে আপনার বর্তমান উত্তরসহ পরীক্ষা স্বয়ংক্রিয়ভাবে submit হবে।</div>
          <button class="start-exam-btn" id="startExamBtn" type="button">হ্যাঁ, পরীক্ষা শুরু করি</button>
          <div class="loader-line is-hidden" id="loaderLine" aria-hidden="true"></div>
        </div>
      </div>
      <header class="topbar">
        <div class="topbar-inner">
          <div class="brand-mark" aria-hidden="true">${config.brandMark}</div>
          <div class="brand"><p class="eyebrow">${config.headerEyebrow}</p><h1>${config.headerTitle}</h1></div>
          <div class="timer" id="timer" aria-live="polite">${toBnDigits(String(config.durationMinutes).padStart(2, '0'))}:০০</div>
          <div class="counter" aria-live="polite"><span id="answeredCount">০</span>/<span id="totalCount">${bn(totalQuestions)}</span> উত্তর</div>
        </div>
        <div class="progress-track" aria-hidden="true"><div class="progress-bar" id="progressBar"></div></div>
      </header>`);

    main.insertAdjacentHTML('afterend', `
      <div class="submit-dock" id="submitDock">
        <div class="submit-inner">
          <div class="submit-summary"><strong><span id="dockAnswered">০</span>টি উত্তর দেওয়া হয়েছে</strong><small>সাবমিটের পর উত্তর পরিবর্তন করা যাবে না</small></div>
          <button class="submit-btn" id="submitBtn" type="button">ফলাফল দেখুন</button>
        </div>
      </div>
      <div class="toast" id="toast" role="status" aria-live="polite"></div>`);
  }

  buildShell();
  document.body.classList.add('loading');

  const answeredCount = document.getElementById('answeredCount');
  const dockAnswered = document.getElementById('dockAnswered');
  const progressBar = document.getElementById('progressBar');
  const submitBtn = document.getElementById('submitBtn');
  const submitDock = document.getElementById('submitDock');
  const timer = document.getElementById('timer');
  const toast = document.getElementById('toast');
  const loaderScreen = document.getElementById('loaderScreen');
  const loaderTitle = document.getElementById('loaderTitle');
  const loaderText = document.getElementById('loaderText');
  const loaderLine = document.getElementById('loaderLine');
  const startNotice = document.getElementById('startNotice');
  const startExamBtn = document.getElementById('startExamBtn');
  const resultPanel = document.querySelector('.result-panel');
  const pdfStatus = document.getElementById('pdfStatus');
  const pdfDownloadBtn = document.getElementById('pdfDownloadBtn');
  let examStarted = false;
  let examSubmitted = false;
  let submissionInProgress = false;
  let pdfGenerating = false;
  let pdfResult = null;
  let timerInterval;
  let deadline;
  let toastTimer;

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 1900);
  }

  function showLoader(title, message) {
    loaderTitle.textContent = title;
    loaderText.textContent = message;
    startNotice.classList.add('is-hidden');
    startExamBtn.classList.add('is-hidden');
    loaderLine.classList.remove('is-hidden');
    loaderScreen.classList.remove('hidden');
    document.body.classList.add('loading');
  }

  function hideLoader() {
    loaderScreen.classList.add('hidden');
    document.body.classList.remove('loading');
  }

  function updateProgress() {
    const answered = cards.filter(card => card.querySelector('.option.selected')).length;
    answeredCount.textContent = bn(answered);
    dockAnswered.textContent = bn(answered);
    progressBar.style.width = `${(answered / totalQuestions) * 100}%`;
  }

  function readExamState() {
    try {
      return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
    } catch (error) {
      return null;
    }
  }

  function saveExamState(status) {
    try {
      const selections = cards.map(card => [...card.querySelectorAll('.option')]
        .map((option, index) => option.classList.contains('selected') ? index : -1)
        .filter(index => index >= 0));
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ status, selections }));
    } catch (error) {
      console.warn('Exam state could not be saved.', error);
    }
  }

  function restoreAnswers(savedState) {
    if (!Array.isArray(savedState?.selections)) return;
    cards.forEach((card, cardIndex) => {
      const options = [...card.querySelectorAll('.option')];
      const selected = Array.isArray(savedState.selections[cardIndex]) ? savedState.selections[cardIndex] : [];
      selected.forEach(index => {
        if (!options[index]) return;
        options[index].classList.add('selected', 'locked');
        options[index].setAttribute('aria-pressed', 'true');
      });
    });
  }

  function prepareQuestions() {
    cards.forEach((card, cardIndex) => {
      card.querySelectorAll('.option').forEach(option => {
        option.type = 'button';
        option.setAttribute('aria-pressed', 'false');
        option.setAttribute('aria-label', `প্রশ্ন ${cardIndex + 1}, অপশন ${option.querySelector('.letter').textContent}`);
        option.addEventListener('click', () => {
          if (examSubmitted || submissionInProgress || option.classList.contains('selected')) {
            if (!examSubmitted && !submissionInProgress) showToast('এই অপশনটি লক করা আছে');
            return;
          }
          option.classList.add('selected', 'locked');
          option.setAttribute('aria-pressed', 'true');
          if (card.querySelectorAll('.option.selected').length > 1) showToast(`দ্বৈত উত্তর হিসেবে গণনা হবে (−${bn(config.negativeMark)})`);
          saveExamState('started');
          updateProgress();
        });
      });
    });
  }

  function renderTime() {
    const remaining = Math.max(0, deadline - Date.now());
    const totalSeconds = Math.ceil(remaining / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    timer.textContent = toBnDigits(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
    timer.classList.toggle('warning', totalSeconds <= 300 && totalSeconds > 60);
    timer.classList.toggle('danger', totalSeconds <= 60);
    if (remaining <= 0) beginSubmission(true, 'timer');
  }

  function startTimer() {
    deadline = Date.now() + EXAM_DURATION;
    renderTime();
    timerInterval = setInterval(renderTime, 250);
  }

  async function generateResultPdf(autoDownload = true) {
    if (!config.enablePdf) return;
    if (pdfGenerating) return;
    if (pdfResult) {
      if (autoDownload) pdfResult.download();
      return;
    }
    pdfGenerating = true;
    pdfDownloadBtn.disabled = true;
    try {
      pdfResult = await window.ReusableExamPdf.create({
        resultPanel,
        sections,
        filename: config.pdfFilename,
        footerTitle: config.pdfFooter,
        onStatus: status => { pdfStatus.textContent = status; }
      });
      pdfStatus.textContent = 'PDF ফলাফল প্রস্তুত ও ডাউনলোড হয়েছে';
      pdfDownloadBtn.textContent = 'আবার ডাউনলোড';
      pdfDownloadBtn.disabled = false;
      if (autoDownload) pdfResult.download();
    } catch (error) {
      console.error(error);
      pdfStatus.textContent = 'PDF তৈরি করা যায়নি—ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন';
      pdfDownloadBtn.textContent = 'আবার চেষ্টা করুন';
      pdfDownloadBtn.disabled = false;
    } finally {
      pdfGenerating = false;
    }
  }

  function beginSubmission(isAutomatic = false, reason = 'manual') {
    if (examSubmitted || submissionInProgress) return;
    submissionInProgress = true;
    clearInterval(timerInterval);
    submitBtn.disabled = true;
    cards.forEach(card => card.querySelectorAll('.option').forEach(option => { option.disabled = true; }));
    saveExamState('submitting');

    if (reason === 'reload') {
      timer.textContent = 'Auto submit';
      showLoader('Reload শনাক্ত হয়েছে', 'নিয়ম অনুযায়ী সংরক্ষিত উত্তরগুলো স্বয়ংক্রিয়ভাবে জমা হচ্ছে');
    } else {
      timer.textContent = isAutomatic ? 'সময় শেষ' : 'সাবমিট';
      showLoader('ফলাফল তৈরি হচ্ছে...', isAutomatic ? 'সময় শেষ—আপনার উত্তর স্বয়ংক্রিয়ভাবে জমা হচ্ছে' : 'আপনার উত্তরগুলো যাচাই করা হচ্ছে');
    }
    setTimeout(() => finishSubmission(isAutomatic, true, reason), config.loaderMilliseconds);
  }

  function finishSubmission(isAutomatic, shouldDownloadPdf = true, reason = 'manual') {
    examSubmitted = true;
    submissionInProgress = false;
    let correct = 0;
    let wrong = 0;
    let double = 0;
    let empty = 0;

    cards.forEach(card => {
      const options = [...card.querySelectorAll('.option')];
      const chosen = options.map((option, index) => option.classList.contains('selected') ? index : -1).filter(index => index >= 0);
      const answer = Number(card.dataset.correct);
      const status = card.querySelector('.status-pill');
      const feedback = card.querySelector('.feedback');
      const answerLetter = options[answer].querySelector('.letter').textContent;
      card.classList.add('submitted');
      options.forEach(option => { option.disabled = true; });
      options[answer].classList.add('answer-correct');

      if (chosen.length === 0) {
        empty++;
        card.classList.add('wrong-card');
        status.textContent = 'অনুত্তরিত';
        status.className = 'status-pill empty-status';
        feedback.textContent = `সঠিক উত্তর: ${answerLetter}`;
        feedback.style.color = 'var(--muted)';
      } else if (chosen.length > 1) {
        double++;
        card.classList.add('double-card');
        chosen.filter(index => index !== answer).forEach(index => options[index].classList.add('answer-wrong'));
        status.textContent = `দ্বৈত −${bn(config.negativeMark)}`;
        status.className = 'status-pill double-status';
        feedback.textContent = `একাধিক উত্তর দেওয়া হয়েছে · সঠিক উত্তর: ${answerLetter}`;
        feedback.style.color = 'var(--amber)';
      } else if (chosen[0] === answer) {
        correct++;
        card.classList.add('correct-card');
        status.textContent = `সঠিক +${bn(config.positiveMark)}`;
        status.className = 'status-pill correct-status';
        feedback.textContent = 'আপনার উত্তর সঠিক';
        feedback.style.color = 'var(--green)';
      } else {
        wrong++;
        card.classList.add('wrong-card');
        options[chosen[0]].classList.add('answer-wrong');
        status.textContent = `ভুল −${bn(config.negativeMark)}`;
        status.className = 'status-pill wrong-status';
        feedback.textContent = `সঠিক উত্তর: ${answerLetter}`;
        feedback.style.color = 'var(--red)';
      }
    });

    const score = (correct * config.positiveMark) - ((wrong + double) * config.negativeMark);
    resultPanel.querySelector('[data-stat="score"]').textContent = bnScore(score);
    resultPanel.querySelector('[data-stat="correct"]').textContent = bn(correct);
    resultPanel.querySelector('[data-stat="wrong"]').textContent = bn(wrong);
    resultPanel.querySelector('[data-stat="double"]').textContent = bn(double);
    resultPanel.querySelector('[data-stat="empty"]').textContent = bn(empty);
    saveExamState('submitted');
    resultPanel.classList.add('show');
    submitDock.style.display = 'none';
    hideLoader();
    resultPanel.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (reason === 'reload') setTimeout(() => showToast('Reload করার কারণে পরীক্ষা স্বয়ংক্রিয়ভাবে জমা হয়েছে'), 450);
    else if (isAutomatic) setTimeout(() => showToast('সময় শেষ—পরীক্ষা স্বয়ংক্রিয়ভাবে জমা হয়েছে'), 450);

    if (config.enablePdf && shouldDownloadPdf) setTimeout(() => generateResultPdf(true), 700);
    else if (config.enablePdf) {
      pdfStatus.textContent = 'আগের জমা দেওয়া ফলাফল পুনরুদ্ধার হয়েছে';
      pdfDownloadBtn.textContent = 'PDF ডাউনলোড';
      pdfDownloadBtn.disabled = false;
    }
  }

  submitBtn.addEventListener('click', () => beginSubmission(false, 'manual'));
  pdfDownloadBtn?.addEventListener('click', () => pdfResult ? pdfResult.download() : generateResultPdf(true));
  startExamBtn.addEventListener('click', () => {
    if (examStarted) return;
    examStarted = true;
    saveExamState('started');
    showLoader('প্রশ্নপত্র প্রস্তুত হচ্ছে...', 'একটু অপেক্ষা করুন, পরীক্ষা শুরু হচ্ছে');
    setTimeout(() => {
      hideLoader();
      startTimer();
    }, config.loaderMilliseconds);
  });

  prepareQuestions();
  const savedState = readExamState();
  restoreAnswers(savedState);
  updateProgress();

  if (savedState?.status === 'started' || savedState?.status === 'submitting') {
    examStarted = true;
    beginSubmission(true, 'reload');
  } else if (savedState?.status === 'submitted') {
    examStarted = true;
    submitBtn.disabled = true;
    timer.textContent = 'সম্পন্ন';
    finishSubmission(false, false, 'restored');
  } else {
    startExamBtn.focus({ preventScroll: true });
  }
})();
