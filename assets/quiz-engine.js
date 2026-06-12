function createQuizApp(config) {
  const questions = config.questions || [];
  const totalTime = (config.timeMinutes || 25) * 60;
  let timeLeft = totalTime;
  let timer = null;

  function formatMathText(text) {
    let t = String(text || "");
    t = t.replace(/\$(.*?)\$/g, (_, expr) => `\\(${expr}\\)`);
    if (!t.includes("\\(") && /\\\\|\^|_|\{.*\}/.test(t)) {
      t = `\\(${t}\\)`;
    }
    return t;
  }

  function renderQuestionText(text) {
    return formatMathText(text).replace(/\?\s*$/, " ?");
  }

  function typesetMath(target) {
    if (window.MathJax && window.MathJax.typesetPromise) {
      MathJax.typesetClear([target]);
      MathJax.typesetPromise([target]).catch(() => {});
    }
  }

  function updateProgress() {
    const answered = questions.filter((_, i) => !!document.querySelector(`input[name=\"q${i}\"]:checked`)).length;
    const percentByAnswer = (answered / questions.length) * 100;
    const percentByTime = ((totalTime - timeLeft) / totalTime) * 100;
    const fill = document.getElementById("progress-fill");
    if (fill) {
      fill.style.width = `${Math.max(percentByAnswer, percentByTime)}%`;
    }
  }

  function drawTimer() {
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    const time = document.getElementById("time");
    if (time) {
      time.textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
    updateProgress();
  }

  function renderQuestions() {
    const box = document.getElementById("questions-container");
    let html = "";

    for (let i = 0; i < questions.length; i += 1) {
      const q = questions[i];
      html += `
        <article class="question" id="q-${i}">
          <div class="q-head">
            <div class="q-no">${i + 1}</div>
            <div class="q-text">${renderQuestionText(q.q)}</div>
          </div>
          <ul class="option-list">
            ${q.opts
              .map(
                (opt, j) => `
              <li class="option">
                <input type="radio" name="q${i}" id="q${i}-o${j}" value="${j}" onchange="window.quizApp.updateProgress()" />
                <label class="option-label" for="q${i}-o${j}">${String.fromCharCode(97 + j)}) ${formatMathText(opt)}</label>
              </li>
            `
              )
              .join("")}
          </ul>
        </article>
      `;
    }

    box.innerHTML = html;
    typesetMath(box);
    updateProgress();
  }

  function startTimer() {
    timer = setInterval(() => {
      timeLeft -= 1;
      if (timeLeft <= 0) {
        timeLeft = 0;
        submitQuiz(true);
        return;
      }
      drawTimer();
    }, 1000);
    drawTimer();
  }

  function startQuiz() {
    document.getElementById("start-screen").classList.add("hidden");
    document.getElementById("quiz-screen").classList.remove("hidden");

    const statusBar = document.getElementById("status-bar");
    statusBar.classList.remove("hidden");
    statusBar.style.display = "flex";

    renderQuestions();
    startTimer();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function submitQuiz(autoSubmit) {
    clearInterval(timer);
    timer = null;

    document.getElementById("quiz-screen").classList.add("hidden");
    document.getElementById("status-bar").classList.add("hidden");
    document.getElementById("result-screen").classList.remove("hidden");

    let score = 0;
    let review = "";

    for (let i = 0; i < questions.length; i += 1) {
      const q = questions[i];
      const checked = document.querySelector(`input[name=\"q${i}\"]:checked`);
      const selected = checked ? Number(checked.value) : -1;

      if (selected === q.ans) {
        score += 1;
      }

      review += `
        <article class="question">
          <div class="q-head">
            <div class="q-no">${i + 1}</div>
            <div class="q-text">${renderQuestionText(q.q)}</div>
          </div>
          <ul class="option-list">
            ${q.opts
              .map((opt, j) => {
                let cls = "option-label";
                if (j === q.ans) cls += " correct-answer";
                else if (j === selected) cls += " incorrect-answer";
                return `<li><div class=\"${cls}\">${String.fromCharCode(97 + j)}) ${formatMathText(opt)}</div></li>`;
              })
              .join("")}
          </ul>
          ${selected === -1 ? '<p class="muted" style="margin:8px 0 0; color:#b53d3d;">এই প্রশ্নের উত্তর দেওয়া হয়নি।</p>' : ""}
        </article>
      `;
    }

    document.getElementById("score").textContent = String(score);
    document.getElementById("result-message").textContent = autoSubmit
      ? "সময় শেষ। নিচে সঠিক উত্তরসহ ফলাফল দেখুন।"
      : "সাবমিট সম্পন্ন। নিচে সঠিক উত্তরসহ ফলাফল দেখুন।";

    const reviewBox = document.getElementById("review-container");
    reviewBox.innerHTML = review;
    typesetMath(reviewBox);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return {
    startQuiz,
    submitQuiz,
    updateProgress
  };
}
